/* eslint-disable restrict-api-routes/no-direct-api-routes */
import type { NextApiRequest, NextApiResponse } from 'next';
import { loginApprovals } from '@/server/database';
import { appConfig } from '@/app.config';

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderPage(title: string, message: string): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title}</title>
    <style>
      body { margin: 0; font-family: Arial, sans-serif; background: linear-gradient(180deg, #f8fafc, #e2e8f0); color: #0f172a; }
      .wrap { min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 24px; }
      .card { width: 100%; max-width: 460px; background: rgba(255,255,255,0.96); border: 1px solid rgba(148,163,184,0.35); border-radius: 24px; padding: 32px; box-shadow: 0 20px 50px rgba(15,23,42,0.12); text-align: center; }
      h1 { margin: 0 0 12px; font-size: 28px; }
      p { margin: 0; line-height: 1.6; color: #475569; }
    </style>
  </head>
  <body>
    <div class="wrap">
      <div class="card">
        <h1>${escapeHtml(title)}</h1>
        <p>${escapeHtml(message)}</p>
      </div>
    </div>
  </body>
</html>`;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.status(405).send('Method Not Allowed');
    return;
  }

  const approvalId = typeof req.query.approvalId === 'string' ? req.query.approvalId : '';
  const token = typeof req.query.token === 'string' ? req.query.token : '';

  if (!approvalId || !token) {
    res.status(400).send(renderPage('Invalid link', 'The login approval link is missing required data. Return to the app and try signing in again.'));
    return;
  }

  const approval = await loginApprovals.approveLoginApprovalByExternalToken(
    approvalId,
    token,
    'email'
  );

  if (approval) {
    res.status(200).send(renderPage('Sign-in approved', `Your ${appConfig.appName} sign-in has been approved. You can return to the app now.`));
    return;
  }

  const existingApproval = await loginApprovals.findLoginApprovalById(approvalId);

  if (!existingApproval) {
    res.status(404).send(renderPage('Request not found', 'This login request is no longer available. Return to the app and try signing in again.'));
    return;
  }

  if (existingApproval.status === 'approved') {
    res.status(200).send(renderPage('Already approved', `This ${appConfig.appName} sign-in was already approved. You can return to the app now.`));
    return;
  }

  if (existingApproval.expiresAt.getTime() <= Date.now()) {
    res.status(200).send(renderPage('Request expired', 'This login approval link expired. Return to the app and start the sign-in flow again.'));
    return;
  }

  res.status(400).send(renderPage('Unable to approve', 'This login approval link could not be completed. Return to the app and try signing in again.'));
}
