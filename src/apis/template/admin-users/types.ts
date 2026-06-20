export interface AdminUserSummary {
  id: string;
  username: string;
  email?: string;
  /** ISO-8601 */
  createdAt: string;
  /** True iff this user's _id equals ADMIN_USER_ID */
  isAdmin: boolean;
  /** Missing = 'approved' (legacy users) */
  approvalStatus?: 'pending' | 'approved' | 'rejected';
  /** Number of passkeys this user has registered. */
  passkeyCount?: number;
}

export interface AdminUsersListResponse {
  users?: AdminUserSummary[];
  error?: string;
}

/** `admin/users/detail` — full per-user drill-in (the "User 360" view). */
export interface AdminUserDetailRequest {
  userId: string;
}

export interface AdminUserDetail {
  id: string;
  username: string;
  email?: string;
  isAdmin: boolean;
  approvalStatus: 'pending' | 'approved' | 'rejected';
  /** ISO-8601 */
  createdAt: string;
  /** ISO-8601 */
  updatedAt: string;
  /** ISO-8601, when the user was approved. */
  approvedAt?: string;
  /** ISO-8601, last activity. */
  lastSeenAt?: string;
  twoFactorEnabled: boolean;
  twoFactorMethod?: 'telegram' | 'email';
  telegramLinked: boolean;
  passkeyCount: number;
  sessionsTotal: number;
  /** ISO-8601 of the most recent session. */
  lastSessionAt?: string;
  /** Total agent spend attributed to this user. */
  agentSpend: { cost: number; turns: number };
}

export interface AdminUserDetailResponse {
  user?: AdminUserDetail;
  error?: string;
}

/** `admin/users/generate-passkey-link` — mint a one-time passkey-enroll URL. */
export interface GeneratePasskeyLinkRequest {
  userId: string;
}

export interface GeneratePasskeyLinkResponse {
  /** Absolute enrollment URL to hand to the user (same link email would send). */
  url?: string;
  /** ISO-8601 expiry of the link. */
  expiresAt?: string;
  error?: string;
}
