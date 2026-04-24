/* eslint-disable no-undef */
/**
 * Web Push handlers for the app.
 *
 * This file is imported into the generated sw.js via next-pwa's `importScripts`
 * option (see config/next/next.template.ts). It must stay valid plain JS.
 */

self.addEventListener('push', (event) => {
    let payload = {};
    if (event.data) {
        try {
            payload = event.data.json();
        } catch (_err) {
            payload = { title: 'Notification', body: event.data.text() };
        }
    }

    const title = payload.title || 'Notification';
    const options = {
        body: payload.body || '',
        icon: payload.icon || '/icons/icon-192x192.png',
        badge: payload.badge || '/icons/icon-96x96.png',
        tag: payload.tag,
        data: {
            url: payload.url || '/',
            ...(payload.data || {}),
        },
    };

    event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    const targetUrl =
        (event.notification.data && event.notification.data.url) || '/';

    event.waitUntil(
        (async () => {
            const allClients = await self.clients.matchAll({
                type: 'window',
                includeUncontrolled: true,
            });

            // Reuse an existing client if one is already open.
            for (const client of allClients) {
                try {
                    const clientUrl = new URL(client.url);
                    const sameOrigin = clientUrl.origin === self.location.origin;
                    if (sameOrigin && 'focus' in client) {
                        if ('navigate' in client && targetUrl) {
                            try {
                                await client.navigate(targetUrl);
                            } catch (_err) {
                                // Cross-origin navigation attempts throw; fall through to focus.
                            }
                        }
                        return client.focus();
                    }
                } catch (_err) {
                    // Ignore malformed client URLs.
                }
            }

            if (self.clients.openWindow) {
                return self.clients.openWindow(targetUrl);
            }
            return undefined;
        })()
    );
});
