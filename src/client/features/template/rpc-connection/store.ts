import { createStore } from '@/client/stores';

interface RpcConnectionTokenState {
  token: string | null;
  setToken: (token: string) => void;
  clearToken: () => void;
}

/**
 * Per-connection RPC bearer token, returned by the server on Connect and
 * sent as `X-RPC-Connection-Token` on every subsequent API call. Persisted
 * in localStorage so it survives reloads but is bound to the specific
 * device/browser that received the approval.
 *
 * Threat-model note (why localStorage, not an HttpOnly cookie): the token is
 * deliberately a custom request header, not a cookie. A custom header can't be
 * set cross-origin without a CORS preflight, so a stolen JWT cookie alone can't
 * drive gated RPC calls — the device-local token is a required second factor
 * (CSRF / cookie-theft defense). Moving the token into an auto-attached cookie
 * would REMOVE that property. An HttpOnly cookie also would NOT mitigate the
 * same-origin XSS threat: a payload running on the origin can invoke the gated
 * APIs in place (the cookie auto-attaches), so HttpOnly only blocks
 * exfiltration, not abuse. The actual XSS mitigations are CSP/output-encoding
 * plus the short connection TTL + admin re-approval. Hence localStorage + a
 * custom header is the stronger choice and is kept intentionally.
 */
export const useRpcConnectionTokenStore = createStore<RpcConnectionTokenState>({
  key: 'rpc-connection-token',
  label: 'RPC Connection Token',
  creator: (set) => ({
    token: null,
    setToken: (token) => set({ token }),
    clearToken: () => set({ token: null }),
  }),
  persistOptions: {
    partialize: (state) => ({ token: state.token }),
  },
});

/** Sync accessor for code outside React (e.g., apiClient). */
export function getRpcConnectionToken(): string | null {
  return useRpcConnectionTokenStore.getState().token;
}
