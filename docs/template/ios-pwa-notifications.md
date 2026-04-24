---
title: iOS PWA Push Notifications
description: Web Push notifications for installed PWAs on iOS, Android, and desktop. Use this when adding user-facing push notifications.
summary: Web Push (VAPID) subscriptions. iOS works only from a home-screen-installed PWA on iOS 16.4+. Server uses `sendPushToUser(userId, payload)`; dead endpoints are auto-pruned on 404/410. Run `yarn generate-vapid` once to create keys.
priority: 3
---

# iOS PWA Push Notifications

The app supports standards-compliant **Web Push** notifications via VAPID. This
works on Chrome / Firefox / Edge on desktop + Android, and on **iOS 16.4+ when
the app is installed as a PWA** ("Add to Home Screen").

## Architecture

```
client (Settings toggle)
  │  user gesture → Notification.requestPermission()
  │  PushManager.subscribe({ applicationServerKey: VAPID_PUBLIC })
  ▼
POST /api/process/push-notifications/subscribe
  └─▶ MongoDB: push_subscriptions { userId, endpoint, keys, platform }

server feature code
  └─▶ sendPushToUser(userId, { title, body, url })
        └─▶ web-push → Apple / FCM / Mozilla push service
              └─▶ device receives push → sw-push.js `push` event
                    └─▶ showNotification() + `notificationclick` → openWindow
```

## Setup

1. **Generate VAPID keys** (once per deployment):

   ```bash
   yarn generate-vapid
   ```

   Paste the output into `.env` (and your hosting provider's env vars):

   ```
   NEXT_PUBLIC_VAPID_PUBLIC_KEY=...     # client-safe
   VAPID_PRIVATE_KEY=...                # secret
   VAPID_SUBJECT=mailto:you@example.com # mailto: or https://
   ```

2. **Deploy.** No extra build step — `next-pwa` picks up `/sw-push.js` via the
   `importScripts` option in `config/next/next.template.ts`.

3. **Try it.**
   - Desktop Chrome / Android: open the app, go to Settings → Notifications,
     flip the toggle, accept the prompt, click **Send test**.
   - iOS: tap Safari's share button → **Add to Home Screen**. Open the app
     from the home-screen icon. Then go to Settings → Notifications.

## Sending notifications from server code

`sendPushToUser(userId, payload)` is the single entry point. Import it from any
server file — API handler, cron job, agent, workflow hook, anywhere.

```ts
import { sendPushToUser } from '@/server/template/push';

await sendPushToUser(userId, {
    title: 'New message',
    body: 'You have a new message from Alice.',
    url: '/messages/abc',    // where tapping the notification should navigate
    tag: 'message-abc',      // optional: replaces prior notifications w/ same tag
});
```

### Return shape

```ts
type PushSendResult = {
    endpoint: string;        // the push service URL
    success: boolean;        // true if delivery accepted
    removed: boolean;        // true if the subscription was deleted (404/410)
    statusCode?: number;     // HTTP status from the push service
    error?: string;          // delivery error message (if any)
};
```

The function never throws for delivery failures. It only throws once, up-front,
if VAPID env vars are missing. If the user has no subscriptions the call is a
no-op and returns `[]`.

### Fire-and-forget from API handlers

Don't block the API response on push delivery. Use `void` so unhandled errors
don't crash the process:

```ts
// src/apis/.../handlers/createComment.ts
import { sendPushToUser } from '@/server/template/push';

export const createCommentHandler = async (req, context) => {
    const comment = await comments.insert(/* … */);

    void sendPushToUser(post.authorId, {
        title: 'New comment',
        body: `${author.username}: ${preview(comment.text)}`,
        url: `/posts/${post._id}#c-${comment._id}`,
        tag: `comment-${post._id}`,
    }).catch((err) => console.error('[push] delivery failed:', err));

    return { comment };
};
```

### Pre-checking configuration

If push is optional for your feature, guard the call so you don't throw when
VAPID keys aren't set in a given environment:

```ts
import { isPushConfigured, sendPushToUser } from '@/server/template/push';

if (isPushConfigured()) {
    void sendPushToUser(userId, payload);
}
```

### Broadcasting to many users

There is no built-in `sendPushToAll`. For bulk sends, loop with a concurrency
cap so you don't flood the push service or Mongo:

```ts
import pLimit from 'p-limit'; // or any small limiter
const limit = pLimit(10);
await Promise.all(
    userIds.map((id) => limit(() => sendPushToUser(id, payload))),
);
```

### Admin test endpoint (no code required)

For ad-hoc testing without writing a handler, call
`admin/push-notifications/sendTest` with `{ userId, title?, body?, url? }`.
It pushes to every device that user has registered and returns
`{ sent, removed }`. Admin-only — `context.isAdmin` must be true.

### Payload tips

- Keep under ~4KB (iOS APNs limit). Put large data behind the `url`.
- `tag` coalesces notifications — a new "unread messages" push with the same
  tag replaces the previous one instead of stacking.
- `url` is what `notificationclick` in `public/sw-push.js` focuses or opens.
- `icon` / `badge` default to your PWA icons — only override for per-notification art.

## iOS constraints — important

- **Only works in the installed PWA.** Safari tabs cannot subscribe on iOS.
- **Requires iOS / iPadOS 16.4 or newer.**
- **Permission must come from a user gesture.** The toggle calls
  `Notification.requestPermission()` synchronously at the top of its click
  handler — do not insert awaits before that call.
- **`navigator.standalone`** detection is used to decide whether to show the
  "Add to Home Screen" hint vs. the live toggle.

## Files

- `public/sw-push.js` — service worker `push` + `notificationclick` handlers
  (imported into the next-pwa-generated `sw.js`).
- `src/server/template/push/sendPush.ts` — server sender, VAPID setup,
  automatic pruning of dead endpoints.
- `src/server/database/collections/template/push-subscriptions/` —
  MongoDB collection (`push_subscriptions`, unique index on `endpoint`).
- `src/apis/template/push-notifications/` — `subscribe`, `unsubscribe`,
  `status`, `sendTest` (self) + `admin/sendTest`.
- `src/client/features/template/push-notifications/` — client feature with
  `PushNotificationToggle` + `useSubscribePush` / `useUnsubscribePush` /
  `useSendTestPush` hooks.

## Troubleshooting

- **Toggle is disabled on iOS:** user is in Safari, not the installed PWA.
  The inline hint explains this.
- **`status` returns `configured: false`:** VAPID env vars are missing on the
  server.
- **Test sent but nothing received:** check the browser's notification
  permission — it may be blocked at the OS level (System Settings → Notifications).
- **Subscription disappears after a few days:** expected; devices rotate keys.
  Subscribing again is idempotent (the `endpoint` unique index upserts).
