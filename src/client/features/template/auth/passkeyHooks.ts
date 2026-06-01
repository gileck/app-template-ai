/**
 * Passkey (WebAuthn) Feature Hooks
 *
 * React Query hooks for enrolling and managing passkeys for the logged-in
 * user. These are genuine server+device interactions (the OS authenticator
 * prompt happens mid-flight), so they are NOT optimistic — the credential
 * list is the server's source of truth and is refetched after each change.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    startRegistration,
    browserSupportsWebAuthn,
    WebAuthnError,
} from '@simplewebauthn/browser';
import {
    apiPasskeyRegisterOptions,
    apiPasskeyRegisterVerify,
    apiPasskeyList,
    apiPasskeyDelete,
} from '@/apis/template/auth/client';
import type { PasskeyInfo } from '@/apis/template/auth/types';
import { useQueryDefaults } from '@/client/query';

export const passkeysQueryKey = ['passkeys'] as const;

export function usePasskeys(options?: { enabled?: boolean }) {
    const defaults = useQueryDefaults();
    return useQuery<PasskeyInfo[]>({
        ...defaults,
        queryKey: passkeysQueryKey,
        enabled: options?.enabled ?? true,
        queryFn: async (): Promise<PasskeyInfo[]> => {
            const response = await apiPasskeyList();
            if (response.data?.error) {
                throw new Error(response.data.error);
            }
            return response.data?.passkeys ?? [];
        },
    });
}

/** True if this browser can do WebAuthn at all (gate the "Add" button). */
export function browserSupportsPasskeys(): boolean {
    return typeof window !== 'undefined' && browserSupportsWebAuthn();
}

/**
 * Run the full registration ceremony: fetch options → invoke the OS
 * authenticator → verify + store. Resolves with the newly stored passkey.
 */
export function useAddPasskey() {
    const queryClient = useQueryClient();
    return useMutation<PasskeyInfo, Error, { deviceName?: string } | void>({
        mutationFn: async (vars): Promise<PasskeyInfo> => {
            if (!browserSupportsPasskeys()) {
                throw new Error('This browser does not support passkeys');
            }

            const optionsResponse = await apiPasskeyRegisterOptions();
            if (!optionsResponse.data || Object.keys(optionsResponse.data).length === 0) {
                throw new Error('You must be online to add a passkey');
            }
            if (optionsResponse.data.error) {
                throw new Error(optionsResponse.data.error);
            }
            const { options, challengeId } = optionsResponse.data;
            if (!options || !challengeId) {
                throw new Error('Failed to start passkey registration');
            }

            let attestation;
            try {
                attestation = await startRegistration({ optionsJSON: options });
            } catch (err) {
                // Map the common ceremony failures to friendlier messages.
                if (err instanceof WebAuthnError) {
                    if (err.code === 'ERROR_AUTHENTICATOR_PREVIOUSLY_REGISTERED') {
                        throw new Error('A passkey for this device is already registered');
                    }
                    if (err.code === 'ERROR_CEREMONY_ABORTED') {
                        throw new Error('Passkey setup was cancelled');
                    }
                }
                throw err instanceof Error ? err : new Error('Passkey setup failed');
            }

            const verifyResponse = await apiPasskeyRegisterVerify({
                challengeId,
                response: attestation,
                deviceName: vars?.deviceName,
            });
            if (verifyResponse.data?.error) {
                throw new Error(verifyResponse.data.error);
            }
            if (!verifyResponse.data?.verified || !verifyResponse.data.passkey) {
                throw new Error('Could not verify this passkey');
            }
            return verifyResponse.data.passkey;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: passkeysQueryKey });
        },
    });
}

export function useDeletePasskey() {
    const queryClient = useQueryClient();
    return useMutation<void, Error, { credentialId: string }>({
        mutationFn: async ({ credentialId }): Promise<void> => {
            const response = await apiPasskeyDelete({ credentialId });
            if (!response.data || Object.keys(response.data).length === 0) {
                throw new Error('You must be online to remove a passkey');
            }
            if (response.data.error) {
                throw new Error(response.data.error);
            }
            if (!response.data.success) {
                throw new Error('Failed to remove passkey');
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: passkeysQueryKey });
        },
    });
}
