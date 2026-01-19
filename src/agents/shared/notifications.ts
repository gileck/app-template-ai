/**
 * Telegram Notifications for Agent Scripts
 *
 * Provides notification functions for each step of the GitHub Projects workflow.
 */

import { agentConfig, getIssueUrl, getPrUrl, getProjectUrl } from './config';

// ============================================================
// TELEGRAM API
// ============================================================

const TELEGRAM_API_URL = 'https://api.telegram.org/bot';

interface SendResult {
    success: boolean;
    error?: string;
}

/**
 * Get the owner's Telegram chat ID from app.config.js
 */
async function getOwnerChatId(): Promise<string | null> {
    try {
        // Dynamic import to avoid bundling issues
        const { appConfig } = await import('@/app.config');
        return appConfig.ownerTelegramChatId || null;
    } catch {
        return null;
    }
}

/**
 * Send a Telegram message to the admin/owner
 */
async function sendToAdmin(message: string): Promise<SendResult> {
    if (!agentConfig.telegram.enabled) {
        return { success: true }; // Silently skip if disabled
    }

    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) {
        console.warn('  Telegram notification skipped: missing TELEGRAM_BOT_TOKEN');
        return { success: false, error: 'Missing bot token' };
    }

    const chatId = await getOwnerChatId();
    if (!chatId) {
        console.warn('  Telegram notification skipped: ownerTelegramChatId not configured');
        return { success: false, error: 'Owner chat ID not configured' };
    }

    try {
        const response = await fetch(`${TELEGRAM_API_URL}${botToken}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId,
                text: message,
                parse_mode: 'HTML',
                disable_web_page_preview: true,
            }),
        });

        if (!response.ok) {
            const error = await response.text();
            console.error('  Telegram API error:', error);
            return { success: false, error };
        }

        console.log('  Telegram notification sent');
        return { success: true };
    } catch (error) {
        console.error('  Failed to send Telegram notification:', error);
        return { success: false, error: String(error) };
    }
}

// ============================================================
// NOTIFICATION TEMPLATES
// ============================================================

/**
 * Notify admin that a feature request was synced to GitHub
 */
export async function notifyIssueSynced(
    title: string,
    issueNumber: number,
    status: string
): Promise<SendResult> {
    const issueUrl = getIssueUrl(issueNumber);
    const projectUrl = getProjectUrl();

    const message = `✅ <b>Feature request synced to GitHub!</b>

📋 ${escapeHtml(title)}
🔗 <a href="${issueUrl}">Issue #${issueNumber}</a>
📊 Status: ${status}
🗂 <a href="${projectUrl}">View Project</a>

Waiting for product design generation.`;

    return sendToAdmin(message);
}

/**
 * Notify admin that product design is ready for review
 */
export async function notifyProductDesignReady(
    title: string,
    issueNumber: number,
    isRevision: boolean = false
): Promise<SendResult> {
    const issueUrl = getIssueUrl(issueNumber);

    const emoji = isRevision ? '🔄' : '📝';

    const message = `${emoji} <b>Product Design ${isRevision ? 'Revised' : 'Ready for Review'}!</b>

📋 ${escapeHtml(title)}
🔗 <a href="${issueUrl}">Issue #${issueNumber}</a>
📊 Status: Product Design Review

${isRevision ? 'Design has been updated based on your feedback.\n' : ''}Review and approve to proceed to Technical Design.`;

    return sendToAdmin(message);
}

/**
 * Notify admin that technical design is ready for review
 */
export async function notifyTechDesignReady(
    title: string,
    issueNumber: number,
    isRevision: boolean = false
): Promise<SendResult> {
    const issueUrl = getIssueUrl(issueNumber);

    const emoji = isRevision ? '🔄' : '🔧';

    const message = `${emoji} <b>Technical Design ${isRevision ? 'Revised' : 'Ready for Review'}!</b>

📋 ${escapeHtml(title)}
🔗 <a href="${issueUrl}">Issue #${issueNumber}</a>
📊 Status: Technical Design Review

${isRevision ? 'Design has been updated based on your feedback.\n' : ''}Review and approve to proceed to Implementation.`;

    return sendToAdmin(message);
}

/**
 * Notify admin that PR is ready for review
 */
export async function notifyPRReady(
    title: string,
    issueNumber: number,
    prNumber: number,
    isRevision: boolean = false
): Promise<SendResult> {
    const issueUrl = getIssueUrl(issueNumber);
    const prUrl = getPrUrl(prNumber);

    const emoji = isRevision ? '🔄' : '🚀';

    const message = `${emoji} <b>${isRevision ? 'PR Updated' : 'Implementation Complete - PR Ready'}!</b>

📋 ${escapeHtml(title)}
🔗 <a href="${issueUrl}">Issue #${issueNumber}</a>
🔀 <a href="${prUrl}">Pull Request #${prNumber}</a>
📊 Status: PR Review

${isRevision ? 'Changes have been made based on your review feedback.\n' : ''}Review and merge to complete.`;

    return sendToAdmin(message);
}

/**
 * Notify admin of an agent error
 */
export async function notifyAgentError(
    phase: string,
    title: string,
    issueNumber: number | null,
    error: string
): Promise<SendResult> {
    const issueLink = issueNumber ? `\n🔗 <a href="${getIssueUrl(issueNumber)}">Issue #${issueNumber}</a>` : '';

    const message = `❌ <b>Agent Error: ${phase}</b>

📋 ${escapeHtml(title)}${issueLink}
⚠️ Error: ${escapeHtml(error.slice(0, 200))}

Please check the logs for more details.`;

    return sendToAdmin(message);
}

/**
 * Notify admin of batch processing completion
 */
export async function notifyBatchComplete(
    phase: string,
    processed: number,
    succeeded: number,
    failed: number
): Promise<SendResult> {
    const emoji = failed === 0 ? '✅' : '⚠️';

    const message = `${emoji} <b>${phase} Batch Complete</b>

📊 Processed: ${processed}
✅ Succeeded: ${succeeded}
${failed > 0 ? `❌ Failed: ${failed}` : ''}

${failed > 0 ? 'Check logs for failed items.' : 'All items processed successfully.'}`;

    return sendToAdmin(message);
}

// ============================================================
// UTILITIES
// ============================================================

/**
 * Escape HTML special characters for Telegram HTML mode
 */
function escapeHtml(text: string): string {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

/**
 * Send a custom notification message
 */
export async function notifyAdmin(message: string): Promise<SendResult> {
    return sendToAdmin(message);
}
