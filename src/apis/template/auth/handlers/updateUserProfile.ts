import { updateProfile } from '../index';
import {
    ApiHandlerContext,
    UpdateProfileRequest,
    UpdateProfileResponse,
} from '../types';
import * as users from '@/server/database/collections/template/users/users';
import { sanitizeUser } from '../shared';

// Update profile endpoint
export const updateUserProfile = async (
    request: UpdateProfileRequest,
    context: ApiHandlerContext
): Promise<UpdateProfileResponse> => {
    try {
        if (!context.userId) {
            return { success: false, error: "Not authenticated" };
        }

        // Validate update data
        if (!request.username && !request.email && !request.profilePicture && request.notificationsEnabled === undefined && request.telegramChatId === undefined && request.telegramTwoFactorEnabled === undefined) {
            return { success: false, error: "No update data provided" };
        }

        // Prepare update object
        const updateData: {
            updatedAt: Date;
            username?: string;
            email?: string;
            profilePicture?: string;
            notificationsEnabled?: boolean;
            telegramChatId?: string;
            telegramTwoFactorEnabled?: boolean;
        } = {
            updatedAt: new Date()
        };

        if (request.username) {
            updateData.username = request.username;
        }

        if (request.email !== undefined) {
            updateData.email = request.email;
        }

        if (request.profilePicture) {
            updateData.profilePicture = request.profilePicture;
        }

        if (request.notificationsEnabled !== undefined) {
            updateData.notificationsEnabled = request.notificationsEnabled;
        }

        if (request.telegramChatId !== undefined) {
            updateData.telegramChatId = request.telegramChatId;
        }

        if (request.telegramTwoFactorEnabled !== undefined) {
            const effectiveChatId =
                request.telegramChatId !== undefined
                    ? request.telegramChatId.trim()
                    : (await users.findUserById(context.userId))?.telegramChatId?.trim();

            if (request.telegramTwoFactorEnabled && !effectiveChatId) {
                return { success: false, error: "Add your Telegram chat ID before enabling Telegram 2-factor authentication" };
            }

            updateData.telegramTwoFactorEnabled = request.telegramTwoFactorEnabled;
        }

        // Update user in database
        const updatedUser = await users.updateUser(context.userId, updateData);
        if (!updatedUser) {
            return { success: false, error: "User not found" };
        }

        return {
            success: true,
            user: { ...sanitizeUser(updatedUser), isAdmin: context.isAdmin }
        };
    } catch (error: unknown) {
        console.error("Update profile error:", error);
        return {
            success: false,
            error: error instanceof Error ? error.message : "Failed to update profile"
        };
    }
};

// Export API endpoint name
export { updateProfile }; 
