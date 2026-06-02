# Plan: Passwordless Auth with Passkeys (WebAuthn)

Status: **Phases 0–6 done (0–2 prod-verified).** Passkey mode now retires the
password flow (guarded): passkey-only login + disabled password endpoints,
reversible via `AUTH_MODE=password`. Only EMAIL self-serve enroll (SES) deferred.
Owner: gileck
Last updated: 2026-06-02

Replace password auth with passwordless **passkeys (WebAuthn)** across the
template and (opt-in) all child projects. Authenticate with device
biometrics (Touch ID / Face ID); no passwords ever created, stored, or
leaked.

---

## Locked decisions

| Decision | Choice |
|---|---|
| Migration posture | **Hard cutover, executed per-project by a migration skill.** The template ships BOTH auth paths behind a flag; each child cuts over when it runs the skill. |
| Login UX | **Discoverable / "just tap"** — usernameless `navigator.credentials.get()`. |
| Enrollment model | **One universal flow:** `username → email link → register this device`. Signup, add-device, recovery, and migration are all the *same* flow. |
| Recovery | **Email magic link only. NO recovery codes.** Admin-assisted enroll is the backstop for lost-email. |
| Email | **Mandatory + assumed present.** Required at signup; migration must backfill it for all existing users. |
| Master switch | **Env var `AUTH_MODE` (`password` default \| `passkey`)** — never touched by template sync. |

---

## The key architectural insight

**Passkeys replace the _credential_, not the _session_.** Today:
`password → bcrypt.compare → issue JWT cookie`. After: `passkey assertion
→ verify signature → issue the same JWT cookie`. Everything downstream of
"issue JWT" is untouched:

- JWT cookie session (`shared.ts`, `getUserContext.ts`) — unchanged
- Instant-boot (`isProbablyLoggedIn` / `userPublicHint` / preflight `/me`) — unchanged
- MCP/SDK bearer auth (`ADMIN_API_TOKEN` + `X-On-Behalf-Of`) — independent, unchanged
- `LOCAL_USER_ID` dev shortcut, `ADMIN_USER_ID` — unchanged (dev never needs a passkey)
- Admin-approved signups, first-user-wins, route protection (`public`/`adminOnly`) — orthogonal, unchanged

Blast radius is contained to: **credential storage, login/enroll handlers,
the login UI + 2 mutations.**

---

## The two flows (the whole system)

1. **Daily login** — this device already has a passkey → tap "Sign in" →
   Face ID (discoverable; server sends empty `allowCredentials`) → verify
   → issue JWT. No email.
2. **Enroll a device** — no passkey on this device yet (new user, new
   device, recovery, or cutover migration):
   `username [+ email if new] → "email me a link"` (anti-enumeration:
   always "check your email") → click link → `navigator.credentials.create()`
   → Face ID → store credential → (if first credential + approved) issue JWT.

Cross-device QR and iCloud/Google passkey sync are handled by the OS for
free — we don't build them.

---

## The feature flag (why a child keeps password auth until it migrates)

- **`AUTH_MODE`** env var, default `password`. The template ships both code
  paths; everything branches on it. **Synced template code + skill-not-run-
  yet ⇒ `AUTH_MODE` unset ⇒ today's bcrypt flow runs exactly as now.**
- Env files are never synced, so the flag survives every `/sync-template`
  with zero `projectOverrides` bookkeeping. (Anchoring the switch to a
  synced file like `auth-overrides.ts` is fragile — sync is conflict-
  interactive and depends on the child remembering `projectOverrides`.)
- **Client learns the mode for free:** add `authMode` to the public
  preflight `/me` response. The login UI only renders when unauthenticated,
  so it reads the mode from preflight — no rebuild, no extra call. Instant-
  boot for authenticated users is unaffected.

---

## New backend (all template-owned → syncs to children)

- **`credentials` collection** — `{ userId, credentialId (unique lookup
  key), publicKey, counter, transports[], deviceName?, backedUp, createdAt,
  lastUsedAt }`. Unique index on `credentialId`.
- **`webauthn_challenges`** — short-TTL, single-use challenges (clone the
  `password-reset-tokens` pattern: SHA-256, TTL, consume-once). Server-issued
  challenges for both ceremonies.
- **`enrollment_tokens`** — magic-link tokens authorizing *enroll a passkey*
  (reuse the reset-token infra + the email sender). Single-use, short TTL.
- **Endpoints** (template auth domain):
  - `passkey/login-options` → `passkey/login-verify` (discoverable → JWT)
  - `passkey/enroll/request` (username [+email if new] → send link; anti-
    enumeration; creates a pending user if new, honoring admin-approval)
  - `passkey/enroll/options` → `passkey/enroll/verify` (link token →
    registration ceremony → store credential → maybe issue JWT)
  - `passkey/list` / `passkey/rename` / `passkey/delete` (device management)
- **Library:** `@simplewebauthn/server` + `@simplewebauthn/browser`.
- **RP config:** `rpID` / `rpName` / `origin` from app config + a stable
  **`WEBAUTHN_RP_ID`** env (the prod domain). `User.password_hash` →
  optional, never read in passkey mode.

## Client changes

- `LoginForm` → "Sign in" (discoverable `startAuthentication`) + a
  username[/email] "email me a link" path. **No password / confirm fields.**
- `useLogin`/`useRegister` mutations → WebAuthn ceremonies via
  `@simplewebauthn/browser`.
- "Passkeys & devices" settings panel (list/rename/delete).
- A small enroll-landing route the email link opens (runs `create()`).
- **Unchanged:** store, preflight, `AuthWrapper`, route protection.

## Removed (passkey mode)

- `changePassword`, `requestPasswordReset` / `resetPassword` → recovery is
  the email enroll link.
- Recovery codes — **not built** (email is the sole recovery).
- Telegram/email **2FA** login-approval — redundant (passkeys are already
  possession + biometric); disabled by default in passkey mode.

---

## The migration skill — `/migrate-to-passkeys` (per-project hard cutover)

1. **Preflight (gating):** child project (not the template repo); deps
   present; **email actually sends in production**; **every existing user has
   an email on file** (backfill/collect the stragglers first); a stable
   `WEBAUTHN_RP_ID` domain set (NOT a Vercel preview URL).
2. **DB migration:** ensure `credentials` / `webauthn_challenges` /
   `enrollment_tokens` collections + the unique `credentialId` index. No user
   backfill — users enroll themselves.
3. **Enrollment window:** email every user a one-time enroll link; passwords
   still accepted *only* to bridge during this window.
4. **Flip:** set `AUTH_MODE=passkey` (`.env.local` + Vercel), disable
   password login, redeploy.
5. **Verify:** real passkey signup + "just tap" login end-to-end; `yarn checks`
   green.

Per-child the flip is one env var + a light index migration. The template
stays dual-mode until every child has migrated (passwords retired template-
wide only far later, if ever).

---

## Risks / gotchas (decided, documented)

- **rpID = stable domain.** Passkeys do NOT carry across Vercel preview URLs
  (different host). Dev = `localhost`; prod = the real domain via
  `WEBAUTHN_RP_ID`. Document loudly.
- **Email is the single hard dependency** for recovery + cutover. Verify
  deliverability before building Phase 4+.
- **Lost email access = lockout → admin-assisted enroll** (the only backstop,
  since recovery codes are dropped). Acceptable; document it.
- **Dual-mode maintenance:** the template carries both auth implementations
  behind the flag; tests must cover both modes. Accepted cost of zero-
  downtime, opt-in migration.
- **Counter = 0** from synced platform authenticators is normal — don't
  reject zero counters.
- **Secure context:** prod HTTPS ✅, localhost ✅, installed PWA on iOS
  16.4+ ✅ (same constraint as push).

---

## Build order

0. **Phase 0 — verify + foundation:** confirm email deliverability; pick
   `WEBAUTHN_RP_ID`; add `@simplewebauthn/*`; create the `credentials` /
   `webauthn_challenges` / `enrollment_tokens` collections; add `AUTH_MODE`
   plumbing + expose `authMode` in `/me`. (Passwords still fully working;
   flag default = `password`.)
1. **Phase 1 — enroll for logged-in users:** "Add a passkey" in settings
   (registration ceremony only). Testable in isolation on localhost + a
   stable prod domain.
2. **Phase 2 — discoverable login:** `login-options`/`verify` + the "Sign in"
   button (still behind `AUTH_MODE=passkey`; password mode default).
3. **Phase 3 — universal email-link enroll:** `enroll/request` →
   email link → `enroll/options`/`verify`; covers signup + new device +
   recovery + migration. Admin-approval gate honored. Mandatory email at
   signup.
4. **Phase 4 — admin-assisted enroll + device management UI** (the backstop).
5. **Phase 5 — the `/migrate-to-passkeys` skill** + child-project migration
   docs; flip the template's own deployment as the first real cutover.
6. **Phase 6 — retire password handlers** in passkey mode (guarded), once
   the cutover is proven.

---

## Phase 0 — what shipped (foundation, dormant behind the flag)

Everything below is additive and inert until `AUTH_MODE=passkey`. Passwords
remain the only live flow; `yarn checks` green.

- **Deps:** `@simplewebauthn/server` + `@simplewebauthn/browser` (13.3.0).
- **`AUTH_MODE` flag:** `src/apis/template/auth/authMode.ts` — `getAuthMode()`
  / `isPasskeyMode()`, default `'password'` (anything but the exact string
  `'passkey'` → password mode).
- **RP config:** `src/server/template/webauthn/config.ts` — `getRpID()` /
  `getWebAuthnConfig()`. Dev → `localhost`; prod → `WEBAUTHN_RP_ID` env (or
  `appConfig.appUrl` host). `expectedOrigin` allows localhost ports in dev.
- **Collections** (template-owned, lazy-index + single-use/TTL patterns,
  registered in `index.template.ts`):
  - `credentials` — unique index on `credentialId`; CRUD incl. counter update,
    rename, delete.
  - `webauthn_challenges` — 5-min TTL, single-use, `_id` = `challengeId` for
    discoverable-login correlation.
  - `enrollment_tokens` — clone of password-reset-tokens (SHA-256, single-use,
    1-hour TTL).
- **`/me` exposes `authMode`:** added to `CurrentUserResponse`, set in
  `getCurrentUser` on every branch; client auth store gained `authMode`
  (default `'password'`) + `useAuthMode()`, populated from the preflight.
- **Env docs:** `.env.example` gained an `AUTH_MODE` / `WEBAUTHN_RP_ID` /
  `WEBAUTHN_ORIGIN` section.

## Phase 1 — what shipped (enroll a passkey for logged-in users)

Registration ceremony only — no email link, no passkey *login* yet. Works in
both auth modes (a user can set up passkeys before a deployment cuts over).
`yarn checks` green. Server crypto stays server-side; the client bundle only
pulls `@simplewebauthn/browser`.

- **Ceremony wrapper:** `src/server/template/webauthn/ceremonies.ts` —
  `buildRegistrationOptions()` (residentKey `required` ⇒ discoverable, the
  prerequisite for Phase 2 "just tap") + `verifyRegistration()` (returns the
  stored-credential shape; base64url public key via `isoBase64URL`).
- **Endpoints** (auth domain, per-handler `context.userId` auth — not under
  `admin/`): `auth/passkey/register-options`, `auth/passkey/register-verify`,
  `auth/passkey/list`, `auth/passkey/delete`. Challenge is single-use +
  user-bound; `register-verify` rejects mismatched/duplicate credentials.
- **Collection ergonomics:** `insertCredential` now takes a string userId.
- **Shared API types:** `PasskeyInfo`, register-options/verify, list, delete.
- **Client hooks:** `usePasskeys` (query), `useAddPasskey` (full ceremony:
  options → `startRegistration` → verify, friendly WebAuthnError mapping),
  `useDeletePasskey`, `browserSupportsPasskeys` — exported from the auth
  feature + `@/client/features`.
- **UI:** `PasskeysSection` on the Profile page (under "Security") — add,
  list (name/synced/last-used), remove-with-confirm; gated on browser support.

**Test it (localhost):** sign in → Profile → Passkeys → Add → Touch ID/Face ID
→ the passkey appears in the list; remove it via the trash icon. (rpID is
`localhost` in dev; on a real domain it uses `WEBAUTHN_RP_ID`/appUrl host.)

## Phase 2 — what shipped (discoverable "just tap" login)

Tapping a passkey now logs you in — and crucially issues the **same JWT
cookie** as password login, so session / instant-boot / MCP-SDK /
LOCAL_USER_ID are all untouched. The login button is gated behind
`AUTH_MODE=passkey`; password mode is unchanged. `yarn checks` green.

- **Ceremony:** `buildAuthenticationOptions()` (empty `allowCredentials` ⇒
  discoverable) + `verifyAuthentication()` (decodes the stored base64url
  public key, returns the advanced counter) in `ceremonies.ts`.
- **Endpoints** (public — this IS the login):
  - `auth/passkey/login-options` → issues + stores a single-use auth challenge.
  - `auth/passkey/login-verify` → looks up the credential by the assertion's
    id → its user → **same admin-approval gate as password login** → verifies
    the assertion → persists the new counter → issues the JWT cookie +
    `recordSession`. Generic error on any failure (no passkey enumeration).
    2FA is intentionally skipped (passkeys are already possession+biometric).
- **Client:** `usePasskeyLogin()` runs `startAuthentication` (discoverable) →
  verify → `setValidatedUser`/`setUserHint` exactly like password login.
- **UI:** a "Sign in with a passkey" button on `LoginForm`, shown only when
  `authMode === 'passkey'` + browser supports WebAuthn + on the sign-in tab.

**Test it (localhost):** set `AUTH_MODE=passkey` in `.env.local`, restart
`yarn dev`, enroll a passkey (Phase 1) while logged in, log out → the login
screen shows "Sign in with a passkey" → tap → Touch ID → you're in.

## Phase 3/4 — what shipped (token-enroll backbone + admin-assisted delivery)

SES is deferred, so we built the **universal token-authenticated enrollment
flow** and delivered the link via the **admin** instead of email. When SES
lands, email just sends the *same* `/enroll-passkey?token=` URL — no flow
change. `yarn checks` green.

- **Token-enroll endpoints** (public — authorized by the one-time enrollment
  token, NOT a session): `auth/passkey/enroll/options` (validate token →
  registration options + username; token NOT consumed, so retries work) and
  `auth/passkey/enroll/verify` (verify → store credential → **consume token** →
  issue JWT session if the user is approved; honors the admin-approval gate).
  Both reuse the existing `enrollment_tokens` collection + ceremony wrappers.
- **Admin generation:** `admin/users/generate-passkey-link` (admin-gated by
  the `admin/` prefix) → invalidates any prior link → mints a fresh 1-hour
  single-use token → returns `${appUrl}/enroll-passkey?token=…`.
- **Admin Users page** (`/admin/users`, new nav item): lists all users with
  approval status + passkey count (single aggregate, no N+1), and a "Generate
  passkey link" button → dialog with copy-to-clipboard + expiry + regenerate.
  Added `countCredentialsByUser()` aggregate + `approvalStatus`/`passkeyCount`
  on `AdminUserSummary`.
- **Enrollment landing page** (`/enroll-passkey`, public + full-screen): reads
  `?token=`, validates, runs the WebAuthn ceremony, and drops approved users
  straight into the app signed-in (unapproved: "set up — sign in once
  approved"). Friendly states for missing/expired token + unsupported browser.

**Security:** the token is bearer (like a password-reset link) — single-use,
1-hour TTL, one active per user, sent over a channel the admin trusts.

**Test it:** /admin/users → Generate link for a user → open the URL → Register
→ passkey stored + (if approved) logged in. Works in dev too (admin =
LOCAL_USER_ID; the enroll URL needs no session).

## Phase 4 — device management (done)

- `auth/passkey/rename` endpoint + `useRenamePasskey` + a pencil/rename dialog
  in the Profile Passkeys section. Add/list/delete/admin-enroll already shipped.

## Phase 5 — migration skill + docs (done)

- **`/migrate-to-passkeys`** skill (`.ai/commands/migrate-to-passkeys.md`,
  mirrored to `.claude/commands/`): per-project cutover — preflight gating →
  set `WEBAUTHN_RP_ID` → enrollment window (admin links) → flip
  `AUTH_MODE=passkey` → verify end-to-end. Conversational, verify-gated,
  passwords stay as a bridge. Agent never enters secrets.
- **New doc** `docs/template/passwordless-passkeys.md` (full system + cutover);
  **updated** `docs/template/authentication.md` (AUTH_MODE / two-mode section)
  and `docs/template/admin.md` (`/admin/users` + generate-link). CLAUDE.md
  regenerated.

## Phase 6 — password retirement in passkey mode (done, guarded)

- Server: `loginUser` / `registerUser` / `changePassword` /
  `requestPasswordReset` / `resetPassword` all refuse when `isPasskeyMode()`
  (shared `PASSWORD_AUTH_DISABLED_MESSAGE`; reset stays no-op success for
  anti-enumeration). Guarded — `AUTH_MODE=password` restores everything.
- Client: `LoginForm` renders a passkey-only screen in passkey mode (no
  password/username fields, no sign-up toggle, no forgot-password); the Profile
  "Password → Change" row is hidden. Docs updated to reflect that the flip is
  the cutover point (no password bridge after flipping).

**Next — Phase 3 (email, deferred):** add `enroll/request` (username/email →
send the SAME link by email; anti-enumeration) once SES deliverability is
verified. This is the only remaining piece.

## Open items (carried — developer action / later phases)

- [ ] **Verify production email actually sends** (AWS SES via
      `TWO_FACTOR_EMAIL_FROM` + AWS creds in `src/server/template/email`). The
      agent can't test this without secrets — **developer must confirm
      deliverability before Phase 4+ / before flipping `AUTH_MODE=passkey`.**
      This is the single hard dependency for recovery + cutover.
- [ ] Confirm the `WEBAUTHN_RP_ID` domain for the template's own deploy
      (current `appConfig.appUrl` host = `app-template-ai.vercel.app`).
- [ ] Decide the device-management UX surface (settings panel scope) — Phase 4.

---

## Reference: current auth surface (what we're changing)

- Server auth: `src/apis/template/auth/` (handlers: loginUser, registerUser,
  changePassword, requestPasswordReset, resetPassword, getCurrentUser,
  logout, updateUserProfile), `shared.ts` (SALT_ROUNDS, JWT, cookie,
  `isAdminUser`), `auth-overrides.ts` (project-owned).
- Session: JWT (`JWT_SECRET`, 10y) in HttpOnly cookie `auth_token`;
  validated in `src/apis/getUserContext.ts` (bearer → LOCAL_USER_ID → cookie).
- Users collection: `src/server/database/collections/template/users/`
  (`password_hash`, `approvalStatus`, `email?`, 2FA fields).
- Reusable infra: `password-reset-tokens` collection (hashed, single-use,
  TTL) + `src/server/template/email` + telegram — base for enrollment links.
- Client: `src/client/features/template/auth/` (store, hooks, preflight,
  LoginForm, AuthWrapper), `src/client/auth-config.ts`.
