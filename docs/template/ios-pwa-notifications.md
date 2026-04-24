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

```ts
import { sendPushToUser } from '@/server/template/push';

await sendPushToUser(userId, {
    title: 'New message',
    body: 'You have a new message from Alice.',
    url: '/messages/abc',
    tag: 'message-abc',
});
```

`sendPushToUser` returns per-endpoint results. Failures with HTTP 404/410 are
permanent — those subscriptions are deleted automatically.

Payloads should stay under ~4KB (iOS limit). Keep to `{ title, body, url, tag }`
and put large data behind the URL.

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
