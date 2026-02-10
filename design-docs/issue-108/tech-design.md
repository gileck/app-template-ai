# Technical Design: Dedicated Detail Pages for Bug Reports and Feature Requests

**Size: M** | **Complexity: Medium**

## Overview

Create public, token-authenticated detail pages for feature requests and bug reports that can be accessed directly from Telegram approval messages. These pages will display full details and include inline Approve/Reject action buttons, working similar to the existing `/clarify/:issueNumber` and `/bug-fix/:issueNumber` routes.

## Files to Create

**API Types:**
- `src/apis/template/review/types.ts`
  - Type definitions for review API requests/responses
  - Includes GetFeatureReviewRequest, GetBugReviewRequest, ApproveReviewRequest, RejectReviewRequest
  - Response types with feature/bug details

**API Handlers:**
- `src/apis/template/review/handlers/getFeatureReview.ts`
  - Fetches feature request data with token validation
  - Uses existing token validation pattern from clarification API
- `src/apis/template/review/handlers/getBugReview.ts`
  - Fetches bug report data with token validation
  - Similar validation pattern
- `src/apis/template/review/handlers/approveReview.ts`
  - Unified handler for approving feature requests or bug reports
  - Calls existing approval services
- `src/apis/template/review/handlers/rejectReview.ts`
  - Unified handler for rejecting feature requests or bug reports
  - Updates status to "rejected" or "closed"

**API Utilities:**
- `src/apis/template/review/utils.ts`
  - Token validation functions (reuses approval token generation pattern)
  - Helper to determine review type (feature vs bug) from ID

**API Registration:**
- `src/apis/template/review/server.ts`
  - Server-side API exports
- `src/apis/template/review/client.ts`
  - Client-side API calls
- `src/apis/template/review/index.ts`
  - API name constants

**UI Components:**
- `src/client/routes/template/ReviewFeature/ReviewFeature.tsx`
  - Route wrapper with token/ID validation (mirrors Clarify.tsx pattern)
- `src/client/routes/template/ReviewFeature/ReviewFeaturePage.tsx`
  - Main review page for feature requests
  - Displays title, description, priority, metadata
  - Approve/Reject action buttons
  - Success/error states
- `src/client/routes/template/ReviewBug/ReviewBug.tsx`
  - Route wrapper with token/ID validation
- `src/client/routes/template/ReviewBug/ReviewBugPage.tsx`
  - Main review page for bug reports
  - Displays description, route, investigation summary if available
  - Approve/Reject action buttons
  - Success/error states

**UI Shared Components:**
- `src/client/components/template/review/ReviewActions.tsx`
  - Reusable Approve/Reject button group with confirmation
- `src/client/components/template/review/SuccessState.tsx`
  - Success screen after approval/rejection (similar to clarify SuccessState)

## Files to Modify

**Route Registration:**
- `src/client/routes/index.template.ts`
  - Add `/review/feature/:id` route (public, fullScreen)
  - Add `/review/bug/:id` route (public, fullScreen)

**API Registry:**
- `src/apis/index.template.ts`
  - Export review API handlers
- `src/apis/apis.template.ts`
  - Register review API endpoints

**Telegram Integration:**
- `src/server/telegram/index.ts`
  - Update `sendFeatureRequestNotification()` to use new review link instead of admin detail page
  - Update `sendBugReportNotification()` to use new review link instead of admin reports list
  - Change button URLs from `/admin/feature-requests/:id` to `/review/feature/:id?token=xxx`
  - Change button URLs from `/admin/reports` to `/review/bug/:id?token=xxx`

## Data Model

No schema changes required. Both collections already have the `approvalToken` field:
- `FeatureRequestDocument.approvalToken` (string, optional)
- `ReportDocument.approvalToken` (string, optional)

Tokens are already generated during creation in:
- `src/apis/template/feature-requests/handlers/createFeatureRequest.ts`
- `src/apis/template/reports/handlers/createReport.ts`

## API Endpoints

**Get Feature Review:**
- Endpoint: `review/get-feature-review`
- Method: POST (via API processor)
- Auth: Public (token-validated)
- Request: `{ featureRequestId: string, token: string }`
- Response: `{ featureRequest?: FeatureRequestClient, error?: string }`
- Validates token matches stored approvalToken
- Returns full feature request details

**Get Bug Review:**
- Endpoint: `review/get-bug-review`
- Method: POST (via API processor)
- Auth: Public (token-validated)
- Request: `{ reportId: string, token: string }`
- Response: `{ report?: ReportClient, error?: string }`
- Validates token matches stored approvalToken
- Returns full bug report details

**Approve Review:**
- Endpoint: `review/approve`
- Method: POST (via API processor)
- Auth: Public (token-validated)
- Request: `{ id: string, token: string, type: 'feature' | 'bug' }`
- Response: `{ success?: boolean, githubIssueUrl?: string, error?: string }`
- Calls existing `approveFeatureRequest()` or `approveBugReport()` service
- Clears approval token after use (one-time)

**Reject Review:**
- Endpoint: `review/reject`
- Method: POST (via API processor)
- Auth: Public (token-validated)
- Request: `{ id: string, token: string, type: 'feature' | 'bug', reason?: string }`
- Response: `{ success?: boolean, error?: string }`
- Updates status to "rejected" (feature) or "closed" (bug)
- Clears approval token after use (one-time)

## Implementation Notes

**Token Validation Pattern:**

Uses the same approach as clarification and bug-fix routes:
- Token is the `approvalToken` stored in the document
- Generated during creation using `crypto.randomBytes(32).toString('hex')`
- Validated by fetching document and comparing tokens
- Cleared after successful approval/rejection (one-time use)

**Mobile-First Design:**

Following the pattern from `/clarify/:issueNumber`:
- Full-screen layout (no navbar/header)
- Responsive card-based design
- Large tap targets for buttons
- Optimized for Telegram in-app browser
- Clean success/error states

**Action Flow:**

1. User clicks Telegram button → opens `/review/feature/:id?token=xxx` or `/review/bug/:id?token=xxx`
2. Page fetches data via API with token validation
3. Displays full details with Approve/Reject buttons
4. User clicks action → confirmation dialog
5. Submits action → API validates token + performs action
6. Success state with "View on GitHub" link (if approved) or "Done" message (if rejected)

**Rejection Handling:**

- Feature requests: Update status to "rejected"
- Bug reports: Update status to "closed"
- Both: Clear approval token to prevent reuse
- Optional rejection reason field (not required for MVP)

**Error Handling:**

- Invalid token → "Invalid or expired link"
- Already processed → "This item has already been approved/rejected"
- Not found → "Item not found"
- Network errors → Retry mechanism with React Query

## Implementation Plan

1. Create review API types at `src/apis/template/review/types.ts`
2. Create token validation utilities at `src/apis/template/review/utils.ts`
3. Create API handlers at `src/apis/template/review/handlers/`
   - getFeatureReview.ts
   - getBugReview.ts
   - approveReview.ts
   - rejectReview.ts
4. Create API registration files (server.ts, client.ts, index.ts)
5. Register APIs in `src/apis/index.template.ts` and `src/apis/apis.template.ts`
6. Create shared UI components at `src/client/components/template/review/`
   - ReviewActions.tsx
   - SuccessState.tsx
7. Create ReviewFeature route components at `src/client/routes/template/ReviewFeature/`
   - ReviewFeature.tsx (route wrapper)
   - ReviewFeaturePage.tsx (main page)
8. Create ReviewBug route components at `src/client/routes/template/ReviewBug/`
   - ReviewBug.tsx (route wrapper)
   - ReviewBugPage.tsx (main page)
9. Register routes in `src/client/routes/index.template.ts`
10. Update Telegram notification functions in `src/server/telegram/index.ts`
    - Change feature request button URL to `/review/feature/:id?token=xxx`
    - Change bug report button URL to `/review/bug/:id?token=xxx`
11. Test flow end-to-end with local Telegram notifications
12. Run yarn checks to verify