import type { AuthOverrides } from './template/auth/auth-overrides-types';

/**
 * Auth Overrides
 *
 * Configure custom login/signup logic for your project.
 * This file is project-owned and will not be overwritten by template sync.
 *
 * Return an error string from any hook to reject the action.
 * Return undefined (or don't return) to allow it.
 */
export const authOverrides: AuthOverrides = {
  // Admin-approved signups (enabled by default).
  //
  // New users are created with `approvalStatus: 'pending'` and cannot log
  // in until an admin approves them via /admin/approvals. The admin user
  // (ADMIN_USER_ID env var) bypasses the gate and is auto-approved on
  // signup to handle the bootstrap case.
  //
  // Set this to `false` to allow open signups without admin review.
  //
  // Bootstrap note: on a fresh deployment you must set ADMIN_USER_ID to
  // the admin's _id BEFORE they register (or flip this flag off, register
  // the admin, then flip it back on and set ADMIN_USER_ID). Otherwise the
  // first signup will land in 'pending' with no one to approve it.
  // See docs/template/authentication.md for the full setup flow.
  requireAdminApproval: true,

  // Example: Disable new signups
  // validateRegistration: async () => {
  //   return 'Registration is currently disabled';
  // },

  // Example: Admin-only login
  // validateLogin: async ({ user }) => {
  //   const adminUserId = process.env.ADMIN_USER_ID;
  //   if (adminUserId && user._id.toString() !== adminUserId) {
  //     return 'Login is restricted to administrators only';
  //   }
  // },

  // Example: Restrict signups to specific email domains
  // validateRegistration: async ({ request }) => {
  //   if (!request.email?.endsWith('@mycompany.com')) {
  //     return 'Only @mycompany.com email addresses are allowed';
  //   }
  // },
};
