import crypto from 'crypto';
import { API_CREATE_FEATURE_REQUEST } from '../index';
import { CreateFeatureRequestRequest, CreateFeatureRequestResponse } from '../types';
import { featureRequests } from '@/server/database';
import { ApiHandlerContext } from '@/apis/types';
import { toFeatureRequestClientForUser } from './utils';
import { toDocumentId } from '@/server/utils';
import { sendNotificationToOwner } from '@/server/telegram';
import type { ObjectId } from 'mongodb';

/**
 * Generate a secure approval token
 */
function generateApprovalToken(): string {
    return crypto.randomBytes(32).toString('hex');
}

/**
 * Get the base URL for the app
 */
function getBaseUrl(): string {
    // Use VERCEL_URL in production, fallback to localhost
    if (process.env.VERCEL_URL) {
        return `https://${process.env.VERCEL_URL}`;
    }
    if (process.env.NEXT_PUBLIC_APP_URL) {
        return process.env.NEXT_PUBLIC_APP_URL;
    }
    return 'http://localhost:3000';
}

export const createFeatureRequest = async (
    request: CreateFeatureRequestRequest,
    context: ApiHandlerContext
): Promise<CreateFeatureRequestResponse> => {
    try {
        if (!context.userId) {
            return { error: 'Authentication required' };
        }

        if (!request.title?.trim()) {
            return { error: 'Title is required' };
        }

        if (!request.description?.trim()) {
            return { error: 'Description is required' };
        }

        const now = new Date();
        const approvalToken = generateApprovalToken();

        const requestData = {
            title: request.title.trim(),
            description: request.description.trim(),
            page: request.page?.trim() || undefined,
            status: 'new' as const,
            needsUserInput: false,
            requestedBy: toDocumentId(context.userId) as ObjectId,
            comments: [],
            approvalToken,
            createdAt: now,
            updatedAt: now,
        };

        const newRequest = await featureRequests.createFeatureRequest(requestData);

        // Send Telegram notification to admin with approval button
        try {
            const baseUrl = getBaseUrl();
            const approveUrl = `${baseUrl}/api/feature-requests/approve/${newRequest._id}?token=${approvalToken}`;
            const isHttps = approveUrl.startsWith('https://');

            const message = [
                `📝 New Feature Request!`,
                ``,
                `📋 ${newRequest.title}`,
                ``,
                `${newRequest.description.slice(0, 300)}${newRequest.description.length > 300 ? '...' : ''}`,
                newRequest.page ? `\n📍 Page: ${newRequest.page}` : '',
                // For localhost (HTTP), include link in message since buttons require HTTPS
                !isHttps ? `\n\n🔗 Approve: ${approveUrl}` : '',
            ].filter(Boolean).join('\n');

            // Telegram inline buttons require HTTPS URLs
            await sendNotificationToOwner(message, isHttps ? {
                inlineKeyboard: [[
                    { text: '✅ Approve & Create GitHub Issue', url: approveUrl }
                ]]
            } : undefined);
        } catch (notifyError) {
            // Don't fail the request if notification fails
            console.error('Failed to send Telegram notification:', notifyError);
        }

        return { featureRequest: toFeatureRequestClientForUser(newRequest) };
    } catch (error: unknown) {
        console.error('Create feature request error:', error);
        return { error: error instanceof Error ? error.message : 'Failed to create feature request' };
    }
};

export { API_CREATE_FEATURE_REQUEST };
