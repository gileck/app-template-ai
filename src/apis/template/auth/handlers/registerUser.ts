import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { register } from '../index';
import {
    ApiHandlerContext,
    RegisterRequest,
    RegisterResponse,
} from '../types';
import * as users from '@/server/database/collections/template/users/users';
import { UserCreate } from '@/server/database/collections/template/users/types';
import {
    COOKIE_NAME,
    COOKIE_OPTIONS,
    JWT_EXPIRES_IN,
    getJwtSecret,
    SALT_ROUNDS,
    sanitizeUser,
} from "../shared";
import { toStringId } from '@/server/template/utils';
import { authOverrides } from '@/apis/auth-overrides';
import { sendNotificationToOwner } from '@/server/template/telegram';
import { appConfig } from '@/app.config';

// Register endpoint
export const registerUser = async (
    request: RegisterRequest,
    context: ApiHandlerContext
): Promise<RegisterResponse> => {
    try {
        // Validate input
        if (!request.username || !request.password) {
            return { error: "Username and password are required" };
        }

        // Run project-specific registration validation
        if (authOverrides.validateRegistration) {
            const overrideError = await authOverrides.validateRegistration({ request, context });
            if (overrideError) {
                return { error: overrideError };
            }
        }

        // Check for existing username. If the row belongs to a previously
        // rejected user, surface a clear message rather than the generic
        // "already taken" exception from insertUser. This is the re-apply
        // path for admin-approved signups.
        const existingByUsername = await users.findUserByUsername(request.username);
        if (existingByUsername) {
            if (existingByUsername.approvalStatus === 'rejected') {
                return { error: "This account has been rejected. Please contact the administrator." };
            }
            return { error: "Username already exists" };
        }

        // Check for existing email if provided. Same treatment for rejected
        // users so they are not told "email already taken" which leaks that
        // the address is registered.
        if (request.email) {
            const existingByEmail = await users.findUserByEmail(request.email);
            if (existingByEmail) {
                if (existingByEmail.approvalStatus === 'rejected') {
                    return { error: "This account has been rejected. Please contact the administrator." };
                }
                return { error: "Email already exists" };
            }
        }

        // Admin-approved signups: create the user with 'pending' status,
        // do NOT issue a JWT, and notify the owner via Telegram.
        // The admin user (ADMIN_USER_ID) is exempt and is always approved
        // on signup so the bootstrap case works.
        const requireApproval = authOverrides.requireAdminApproval === true;

        // Hash password and create user
        const passwordHash = await bcrypt.hash(request.password, SALT_ROUNDS);
        const userData: UserCreate = {
            username: request.username,
            password_hash: passwordHash,
            createdAt: new Date(),
            updatedAt: new Date(),
            ...(request.email && { email: request.email }),
            ...(requireApproval && { approvalStatus: 'pending' }),
        };

        const newUser = await users.insertUser(userData);
        const userId = toStringId(newUser._id);
        const isAdmin = !!process.env.ADMIN_USER_ID && userId === process.env.ADMIN_USER_ID;

        // Pending approval branch: no cookie, no user in response.
        // The admin bypasses this gate even if they register after the flag
        // was turned on (edge case — normally the admin registers first).
        if (requireApproval && !isAdmin) {
            // Await the Telegram notification so it actually completes in
            // serverless environments (Vercel can suspend the function as
            // soon as the response is written). Signup is rare, so the
            // extra latency is acceptable; and the internal try/catch in
            // notifyOwnerOfPendingSignup ensures a Telegram outage does not
            // break registration.
            await notifyOwnerOfPendingSignup(newUser.username, request.email);
            return { pendingApproval: true };
        }

        // Admin user registering under requireApproval: auto-approve them
        // so their account is marked 'approved' rather than 'pending'.
        // Capture the returned updated doc instead of mutating newUser in
        // place — the returned doc is authoritative.
        const finalUser =
            requireApproval && isAdmin
                ? (await users.setUserApprovalStatus(newUser._id, 'approved')) ?? newUser
                : newUser;

        // Normal signup: issue JWT and return the user.
        const token = jwt.sign(
            { userId },
            getJwtSecret(),
            { expiresIn: JWT_EXPIRES_IN }
        );

        // Set auth cookie
        context.setCookie(COOKIE_NAME, token, COOKIE_OPTIONS);

        return { user: { ...sanitizeUser(finalUser), isAdmin } };
    } catch (error: unknown) {
        console.error("Registration error:", error);
        return { error: error instanceof Error ? error.message : "Registration failed" };
    }
};

/**
 * Send a Telegram notification to the owner about a new pending signup.
 * Renders an inline keyboard button that opens the admin approvals page.
 *
 * Uses the canonical `appConfig.appUrl` so the URL resolution matches
 * the rest of the app's Telegram links (NEXT_PUBLIC_APP_URL override →
 * VERCEL_PROJECT_PRODUCTION_URL → VERCEL_URL → production fallback).
 */
async function notifyOwnerOfPendingSignup(
    username: string,
    email: string | undefined
): Promise<void> {
    try {
        const approvalsLink = `${appConfig.appUrl.replace(/\/$/, '')}/admin/approvals`;

        const message = [
            '🆕 New signup pending approval',
            '',
            `Username: ${username}`,
            email ? `Email: ${email}` : 'Email: (not provided)',
        ].join('\n');

        await sendNotificationToOwner(message, {
            inlineKeyboard: [
                [{ text: '🔍 Review & Approve', url: approvalsLink }],
            ],
        });
    } catch (error) {
        console.error('[registerUser] Failed to notify owner of pending signup:', error);
    }
}

// Export API endpoint name
export { register }; 