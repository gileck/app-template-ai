/**
 * Push Notifications Feature
 *
 * Client-side Web Push subscription management. Works on Chrome/Firefox/Edge
 * desktop + Android, and on iOS 16.4+ when the app is installed as a PWA
 * (Add to Home Screen).
 */

export { PushNotificationToggle } from './PushNotificationToggle';
export {
    usePushStatusQuery,
    useSubscribePush,
    useUnsubscribePush,
    useSendTestPush,
} from './hooks';
export { usePushNotificationsStore } from './store';
export {
    isPushSupported,
    isIos,
    isIosPwaEligible,
    isStandalonePwa,
    detectPlatform,
    getVapidPublicKey,
} from './utils';
