import '@/agents/shared/loadEnv';
import { resolve } from 'path';
import { existsSync } from 'fs';
import { ensureRpcIndexes, claimNextPendingJob, completeRpcJob, failRpcJob } from './collection';
import { closeDbConnection } from '@/server/database/connection';

const POLL_INTERVAL_MS = 2_000;
const verbose = process.argv.includes('--verbose');

let running = true;

function log(msg: string): void {
  console.log(`[rpc-daemon] ${msg}`);
}

function vlog(msg: string): void {
  if (verbose) console.log(`[rpc-daemon] ${msg}`);
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function processJob(): Promise<boolean> {
  const job = await claimNextPendingJob();
  if (!job) return false;

  const { handlerPath, secret } = job;
  const jobId = job._id.toHexString();
  log(`Claimed job ${jobId}`);
  vlog(`  handler: ${handlerPath}`);
  vlog(`  args: ${JSON.stringify(job.args)}`);
  vlog(`  created: ${job.createdAt.toISOString()}`);
  vlog(`  expires: ${job.expiresAt.toISOString()}`);

  const expectedSecret = process.env.RPC_SECRET;
  if (!expectedSecret || secret !== expectedSecret) {
    await failRpcJob(job._id, 'Invalid or missing RPC secret');
    console.error(`[rpc-daemon] Rejected job ${jobId}: bad secret`);
    return true;
  }
  vlog(`  secret: valid`);

  const fullPath = resolve(process.cwd(), handlerPath);
  const allowedBase = resolve(process.cwd(), 'src/server/');
  if (!fullPath.startsWith(allowedBase)) {
    await failRpcJob(job._id, `Invalid handler path: "${handlerPath}"`);
    console.error(`[rpc-daemon] Rejected invalid path: ${handlerPath}`);
    return true;
  }
  vlog(`  path check: within src/server/`);

  const fileExists =
    existsSync(fullPath + '.ts') ||
    existsSync(fullPath + '.js') ||
    existsSync(fullPath + '/index.ts') ||
    existsSync(fullPath + '/index.js');
  if (!fileExists) {
    await failRpcJob(job._id, `Handler file not found: "${handlerPath}"`);
    console.error(`[rpc-daemon] Rejected missing file: ${handlerPath}`);
    return true;
  }
  vlog(`  file check: exists on disk`);

  const start = Date.now();
  try {
    vlog(`  importing ${fullPath}...`);
    const mod = await import(fullPath);
    const handler = mod.default;

    if (typeof handler !== 'function') {
      throw new Error(`Handler at "${handlerPath}" has no default export function`);
    }

    vlog(`  executing handler...`);
    const result = await handler(job.args);
    const durationMs = Date.now() - start;

    await completeRpcJob(job._id, result);
    log(`Completed ${jobId} in ${durationMs}ms`);
  } catch (err) {
    const durationMs = Date.now() - start;
    const errorMsg = err instanceof Error ? err.message : String(err);

    await failRpcJob(job._id, errorMsg);
    console.error(`[rpc-daemon] Failed ${jobId} after ${durationMs}ms: ${errorMsg}`);
  }

  return true;
}

async function pollLoop(): Promise<void> {
  log(`Starting — polling every ${POLL_INTERVAL_MS / 1000}s${verbose ? ' (verbose)' : ''}`);
  vlog(`RPC_SECRET: ${process.env.RPC_SECRET ? 'set (' + process.env.RPC_SECRET.slice(0, 8) + '...)' : 'NOT SET'}`);
  vlog(`Working directory: ${process.cwd()}`);

  await ensureRpcIndexes();
  log('Indexes ensured');

  while (running) {
    try {
      const hadJob = await processJob();
      if (!hadJob) {
        await sleep(POLL_INTERVAL_MS);
      }
    } catch (err) {
      console.error('[rpc-daemon] Poll error:', err instanceof Error ? err.message : err);
      await sleep(POLL_INTERVAL_MS);
    }
  }

  log('Stopped');
}

function handleShutdown(signal: string): void {
  log(`Received ${signal}, shutting down...`);
  running = false;
}

process.on('SIGINT', () => handleShutdown('SIGINT'));
process.on('SIGTERM', () => handleShutdown('SIGTERM'));

pollLoop()
  .then(() => closeDbConnection())
  .catch((err) => {
    console.error('[rpc-daemon] Fatal error:', err);
    closeDbConnection().finally(() => process.exit(1));
  });
