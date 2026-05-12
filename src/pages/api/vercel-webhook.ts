/* eslint-disable restrict-api-routes/no-direct-api-routes */
/**
 * Vercel Deployment Webhook
 *
 * Receives `deployment.created`, `deployment.succeeded`, and `deployment.error`
 * events from Vercel and forwards them to Telegram. Configured per-project in
 * the Vercel dashboard (Settings → Webhooks).
 *
 * Catches EVERY deployment — CLI (`vercel --prod`), dashboard redeploys, and
 * git-push deploys — unlike the .github/workflows/deploy-notify.yml flow which
 * only fires for GitHub-triggered deploys.
 *
 * Setup: see `.ai/commands/setup-vercel-deploy-notifications.md`.
 *
 * Direct API route (not under /api/process/) because Vercel posts here as an
 * external service.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import crypto from 'crypto';
import { appConfig } from '@/app.config';
import { sendTelegramNotification } from '@/server/template/telegram';
import type { InlineKeyboardButton } from '@/server/template/telegram';

export const config = {
  api: {
    // We need the raw request body to verify the HMAC signature; the default
    // JSON parser consumes the stream before we can hash it.
    bodyParser: false,
  },
};

interface VercelDeploymentEvent {
  type: string;
  id?: string;
  createdAt?: number;
  payload?: {
    // `target` can appear at the top level of payload OR nested under deployment
    // depending on the Vercel event type — check both.
    target?: 'production' | 'preview' | null;
    deployment?: {
      id?: string;
      name?: string;
      url?: string;
      target?: 'production' | 'preview' | null;
      meta?: {
        githubCommitSha?: string;
        githubCommitMessage?: string;
        githubCommitAuthorName?: string;
        githubCommitRef?: string;
        githubOrg?: string;
        githubRepo?: string;
      };
      inspectorUrl?: string;
    };
    links?: {
      deployment?: string;
      project?: string;
    };
    project?: { name?: string };
    user?: { username?: string };
    errorCode?: string;
    errorMessage?: string;
  };
}

function isProductionDeployment(event: VercelDeploymentEvent): boolean {
  // 1. Explicit target field — preferred when present.
  if (event.payload?.target === 'production') return true;
  if (event.payload?.deployment?.target === 'production') return true;
  // 2. Fallback: git push to a production branch. Vercel doesn't always set
  //    `target` on intermediate build events, but the commit ref tells us.
  const ref = event.payload?.deployment?.meta?.githubCommitRef;
  if (ref === 'main' || ref === 'master') return true;
  return false;
}

async function readRawBody(req: NextApiRequest): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : (chunk as Buffer));
  }
  return Buffer.concat(chunks);
}

function verifySignature(rawBody: Buffer, signature: string, secret: string): boolean {
  const expected = crypto.createHmac('sha1', secret).update(rawBody).digest('hex');
  const expectedBuf = Buffer.from(expected);
  const actualBuf = Buffer.from(signature);
  if (expectedBuf.length !== actualBuf.length) return false;
  return crypto.timingSafeEqual(expectedBuf, actualBuf);
}

interface FormattedNotification {
  message: string;
  buttons?: InlineKeyboardButton[][];
}

function formatMessage(event: VercelDeploymentEvent): FormattedNotification | null {
  const deployment = event.payload?.deployment;
  if (!deployment) return null;

  const projectName = event.payload?.project?.name || deployment.name || 'project';
  const env = isProductionDeployment(event) ? 'Production' : 'Preview';
  const url = deployment.url ? `https://${deployment.url}` : null;
  const inspectorUrl = deployment.inspectorUrl || event.payload?.links?.deployment;
  const meta = deployment.meta;
  const commitMsg = meta?.githubCommitMessage?.split('\n')[0];
  const author = meta?.githubCommitAuthorName || event.payload?.user?.username;

  // Github commit URL — only when we have all the pieces.
  const commitUrl =
    meta?.githubOrg && meta?.githubRepo && meta?.githubCommitSha
      ? `https://github.com/${meta.githubOrg}/${meta.githubRepo}/commit/${meta.githubCommitSha}`
      : null;

  const lines: string[] = [];
  const trailer: string[] = [];

  switch (event.type) {
    case 'deployment.created':
      lines.push(`${env === 'Production' ? '🚀' : '👀'} *${env} deployment started* — \`${projectName}\``);
      break;
    case 'deployment.succeeded':
    case 'deployment.ready':
      lines.push(`✅ *${env} deployment live* — \`${projectName}\``);
      break;
    case 'deployment.error':
    case 'deployment.failed':
      lines.push(`❌ *${env} deployment failed* — \`${projectName}\``);
      if (event.payload?.errorMessage) {
        const truncated = event.payload.errorMessage.slice(0, 300);
        trailer.push(`💥 ${truncated}`);
      }
      break;
    case 'deployment.canceled':
      lines.push(`⚪ *${env} deployment canceled* — \`${projectName}\``);
      break;
    default:
      // Unhandled event type — ignore so we don't spam the chat on
      // project.created / domain events etc.
      return null;
  }

  if (commitMsg) lines.push(`📝 ${commitMsg}`);
  if (author) lines.push(`👤 ${author}`);
  if (trailer.length > 0) lines.push('', ...trailer);

  // Build inline keyboard. URL buttons keep links clickable but out of the
  // message body — much cleaner than long links in the trailer.
  const row: InlineKeyboardButton[] = [];
  if (url) row.push({ text: '🔗 Open', url });
  if (inspectorUrl) row.push({ text: '🔍 Inspector', url: inspectorUrl });
  if (commitUrl) row.push({ text: '📋 Commit', url: commitUrl });
  const buttons = row.length > 0 ? [row] : undefined;

  return { message: lines.join('\n'), buttons };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<void> {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).end('Method Not Allowed');
    return;
  }

  const secret = process.env.VERCEL_WEBHOOK_SECRET;
  if (!secret) {
    console.error('[vercel-webhook] VERCEL_WEBHOOK_SECRET not configured');
    res.status(500).json({ error: 'Webhook secret not configured' });
    return;
  }

  const signature = req.headers['x-vercel-signature'];
  const signatureStr = Array.isArray(signature) ? signature[0] : signature;
  if (!signatureStr) {
    res.status(401).json({ error: 'Missing signature' });
    return;
  }

  const rawBody = await readRawBody(req);
  if (!verifySignature(rawBody, signatureStr, secret)) {
    console.warn('[vercel-webhook] invalid signature');
    res.status(401).json({ error: 'Invalid signature' });
    return;
  }

  let event: VercelDeploymentEvent;
  try {
    event = JSON.parse(rawBody.toString('utf8')) as VercelDeploymentEvent;
  } catch (err) {
    console.warn('[vercel-webhook] invalid JSON:', err);
    res.status(400).json({ error: 'Invalid JSON' });
    return;
  }

  // Must AWAIT the Telegram send before responding — Vercel's serverless
  // runtime freezes the function instance the moment we ACK, so a
  // fire-and-forget background promise never gets to actually POST.
  const notification = formatMessage(event);
  if (notification) {
    const chatId = process.env.VERCEL_TELEGRAM_CHAT_ID || appConfig.ownerTelegramChatId;
    if (chatId) {
      try {
        const result = await sendTelegramNotification(chatId, notification.message, {
          parseMode: 'Markdown',
          inlineKeyboard: notification.buttons,
        });
        if (!result.success) {
          console.warn('[vercel-webhook] telegram send returned error:', result.error);
        }
      } catch (err) {
        console.warn('[vercel-webhook] telegram send threw:', err);
      }
    } else {
      console.warn('[vercel-webhook] no chat ID configured (VERCEL_TELEGRAM_CHAT_ID or ownerTelegramChatId)');
    }
  }

  res.status(200).json({ ok: true });
}
