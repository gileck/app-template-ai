/**
 * Vercel Preview URL — fetches the preview deployment URL for a PR.
 *
 * Queries the Vercel API for READY preview deployments matching the given PR number.
 * Returns null if VERCEL_TOKEN is not configured or no deployment is found.
 */

import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';

interface VercelDeployment {
    url: string | null;
    state: string;
    meta?: {
        githubPrId?: string;
    };
}

interface DeploymentsResponse {
    deployments: VercelDeployment[];
    error?: { code: string; message: string };
}

interface ProjectConfig {
    projectId: string;
    orgId: string;
}

function getProjectConfig(): ProjectConfig | null {
    const configPath = resolve(process.cwd(), '.vercel/project.json');
    if (!existsSync(configPath)) return null;

    try {
        const content = readFileSync(configPath, 'utf-8');
        const config = JSON.parse(content) as ProjectConfig;
        if (!config.projectId || !config.orgId) return null;
        return config;
    } catch {
        return null;
    }
}

/**
 * Get the Vercel preview deployment URL for a given PR number.
 * Returns null if not available (no token, no config, deployment not ready yet).
 */
export async function getVercelPreviewUrl(prNumber: number): Promise<string | null> {
    const token = process.env.VERCEL_TOKEN?.replace(/^["']|["']$/g, '');
    if (!token) return null;

    const config = getProjectConfig();
    if (!config) return null;

    try {
        const url = new URL('https://api.vercel.com/v6/deployments');
        url.searchParams.set('projectId', config.projectId);
        url.searchParams.set('teamId', config.orgId);
        url.searchParams.set('target', 'preview');
        url.searchParams.set('state', 'READY');
        url.searchParams.set('limit', '20');

        const res = await fetch(url.toString(), {
            headers: { 'Authorization': `Bearer ${token}` },
        });

        if (!res.ok) return null;

        const data = await res.json() as DeploymentsResponse;
        if (data.error) return null;

        const deployment = data.deployments.find(
            d => d.meta?.githubPrId === String(prNumber) && d.url
        );

        return deployment?.url ? `https://${deployment.url}` : null;
    } catch {
        return null;
    }
}
