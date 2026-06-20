function readPositiveIntEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export const RPC_CONNECTION_ENABLED =
  (process.env.RPC_CONNECTION_ENABLED ?? 'true').toLowerCase() !== 'false';

export const RPC_CONNECTION_TTL_MS = readPositiveIntEnv(
  'RPC_CONNECTION_TTL_MS',
  60 * 60 * 1000
);

export const RPC_CONNECTION_PENDING_TIMEOUT_MS = readPositiveIntEnv(
  'RPC_CONNECTION_PENDING_TIMEOUT_MS',
  10 * 60 * 1000
);

/**
 * Minimum spacing between a user's RPC connect requests. Each connect pings the
 * owner on Telegram, so this throttles approval-request spam. Default 30s.
 */
export const RPC_CONNECT_RATE_LIMIT_MS = readPositiveIntEnv(
  'RPC_CONNECT_RATE_LIMIT_MS',
  30 * 1000
);
