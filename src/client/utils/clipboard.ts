/**
 * Robust clipboard copy.
 *
 * The async Clipboard API (`navigator.clipboard.writeText`) throws
 * NotAllowedError when the document isn't focused or the transient user
 * activation was consumed — e.g. when copying after an `await` (a
 * network fetch) or from a menu that shifts focus as it closes.
 *
 * To be reliable, CALL THIS SYNCHRONOUSLY from within the click/gesture
 * handler (don't `await` other work first). It tries an off-screen,
 * self-focusing `<textarea>` + `execCommand('copy')` first — that path
 * works regardless of where focus currently sits — then falls back to
 * the modern async API. Returns true if the text was placed on the
 * clipboard.
 */
export function copyTextToClipboard(text: string): boolean {
    // Synchronous, in-gesture path. Focusing the textarea restores a
    // valid copy target even if the document had lost focus.
    try {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.setAttribute('readonly', '');
        textarea.style.position = 'fixed';
        textarea.style.top = '0';
        textarea.style.left = '0';
        textarea.style.width = '1px';
        textarea.style.height = '1px';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        textarea.setSelectionRange(0, text.length);
        const ok = document.execCommand('copy');
        document.body.removeChild(textarea);
        if (ok) return true;
    } catch {
        // fall through to the async API
    }

    // Best-effort modern API. Fire-and-forget — by the time it would
    // resolve we've already returned, so callers should treat the
    // synchronous result as authoritative and rely on this only as a
    // backstop.
    try {
        if (navigator.clipboard?.writeText && window.isSecureContext) {
            void navigator.clipboard.writeText(text).catch(() => {});
            return true;
        }
    } catch {
        // ignore
    }
    return false;
}
