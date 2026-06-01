/**
 * Thin server-side wrappers around SimpleWebAuthn's registration ceremony,
 * with this deployment's RP config (rpID / rpName / origin) applied centrally
 * so handlers never repeat it.
 *
 * Phase 1 covers registration only (enroll a passkey for a logged-in user).
 * The authentication ceremony (discoverable login) lands in Phase 2.
 */

import {
    generateRegistrationOptions,
    verifyRegistrationResponse,
} from '@simplewebauthn/server';
import { isoBase64URL } from '@simplewebauthn/server/helpers';
import type {
    PublicKeyCredentialCreationOptionsJSON,
    RegistrationResponseJSON,
    AuthenticatorTransportFuture,
} from '@simplewebauthn/server';
import { getWebAuthnConfig } from './config';

export interface RegistrationOptionsResult {
    options: PublicKeyCredentialCreationOptionsJSON;
    /** The challenge embedded in the options — persist it to verify later. */
    challenge: string;
}

/**
 * Build registration options for a known (logged-in) user.
 *
 * `residentKey: 'required'` makes the credential **discoverable**, which is
 * what enables the later "just tap" usernameless login — the credential
 * stores the user handle on the device so the browser can offer it without
 * us first naming a user.
 */
export async function buildRegistrationOptions(input: {
    userId: string;
    userName: string;
    userDisplayName?: string;
    /** Already-registered credentials, so the user can't double-register one. */
    excludeCredentials?: { id: string; transports?: AuthenticatorTransportFuture[] }[];
}): Promise<RegistrationOptionsResult> {
    const { rpID, rpName } = getWebAuthnConfig();
    const options = await generateRegistrationOptions({
        rpName,
        rpID,
        userName: input.userName,
        // userID must be a byte array (<=64 bytes); the Mongo id hex string fits.
        userID: new TextEncoder().encode(input.userId),
        userDisplayName: input.userDisplayName ?? input.userName,
        attestationType: 'none',
        excludeCredentials: input.excludeCredentials ?? [],
        authenticatorSelection: {
            residentKey: 'required',
            userVerification: 'preferred',
        },
    });
    return { options, challenge: options.challenge };
}

export interface VerifiedRegistration {
    verified: boolean;
    credential?: {
        credentialId: string;
        /** Base64URL-encoded COSE public key, ready to store. */
        publicKey: string;
        counter: number;
        transports?: string[];
        backedUp: boolean;
    };
}

export async function verifyRegistration(input: {
    response: RegistrationResponseJSON;
    expectedChallenge: string;
}): Promise<VerifiedRegistration> {
    const { rpID, expectedOrigin } = getWebAuthnConfig();
    const verification = await verifyRegistrationResponse({
        response: input.response,
        expectedChallenge: input.expectedChallenge,
        expectedOrigin,
        expectedRPID: rpID,
        // Platform authenticators may report UV as preferred, not required —
        // don't hard-fail registration on it.
        requireUserVerification: false,
    });

    if (!verification.verified || !verification.registrationInfo) {
        return { verified: false };
    }

    const { credential, credentialBackedUp } = verification.registrationInfo;
    return {
        verified: true,
        credential: {
            credentialId: credential.id,
            publicKey: isoBase64URL.fromBuffer(credential.publicKey),
            counter: credential.counter,
            transports: credential.transports,
            backedUp: credentialBackedUp,
        },
    };
}
