# Technical Design: User Notifications System

## Overview

This design document outlines the implementation of a user notification system that supports email notifications with a 7-day retention period. The system will be built to handle the custom trigger "Testing THIS!!" as specified in the clarification.

## Architecture

### High-Level Design

The notification system consists of three main components:

1. **Notification Service** - Core business logic for creating and managing notifications
2. **Email Delivery System** - Handles email composition and sending
3. **Retention Management** - Automatic cleanup of notifications older than 7 days

### Data Flow

1. Event occurs that triggers notification → Notification Service creates notification record
2. Notification Service → Email Delivery System sends email
3. Background job runs daily → Retention Management deletes notifications older than 7 days

## Database Schema

### Notifications Table

**Table Name:** `notifications`

**Columns:**
- `id` (UUID, Primary Key) - Unique notification identifier
- `user_id` (UUID, Foreign Key) - References users table
- `trigger_type` (VARCHAR(100)) - Type of trigger (e.g., "Testing THIS!!")
- `subject` (VARCHAR(255)) - Email subject line
- `body` (TEXT) - Notification message content
- `status` (ENUM) - Values: 'pending', 'sent', 'failed'
- `email_sent_at` (TIMESTAMP) - When email was successfully sent
- `error_message` (TEXT, nullable) - Error details if sending failed
- `metadata` (JSONB) - Additional context about the notification
- `created_at` (TIMESTAMP) - Creation timestamp
- `updated_at` (TIMESTAMP) - Last update timestamp

**Indexes:**
- Primary key on `id`
- Index on `user_id` for user lookups
- Index on `created_at` for retention cleanup
- Index on `status` for monitoring failed sends

### Migration File

Create migration: `migrations/YYYYMMDD_create_notifications_table.sql`

## Application Structure

### Files to Create

**Backend:**

1. **`src/models/Notification.ts`**
   - Notification model class
   - Database schema definition
   - Model methods: create, findByUser, findById, delete

2. **`src/services/NotificationService.ts`**
   - Core notification business logic
   - Methods:
     - `createNotification(userId, triggerType, subject, body, metadata)`
     - `getNotificationsByUser(userId)`
     - `markAsSent(notificationId)`
     - `markAsFailed(notificationId, errorMessage)`

3. **`src/services/EmailService.ts`**
   - Email composition and delivery
   - Integration with email provider (e.g., SendGrid, AWS SES, NodeMailer)
   - Methods:
     - `sendNotificationEmail(notification)`
     - `composeEmailTemplate(notification)`
     - `validateEmailConfiguration()`

4. **`src/jobs/NotificationRetentionJob.ts`**
   - Background job for cleanup
   - Runs daily via cron
   - Deletes notifications older than 7 days
   - Logs deletion statistics

5. **`src/triggers/TestingThisTrigger.ts`**
   - Implementation of "Testing THIS!!" trigger
   - Event listener/handler
   - Notification creation logic

6. **`src/routes/notifications.ts`**
   - API endpoints for notification management
   - User-facing notification history

7. **`src/config/notifications.ts`**
   - Configuration constants
   - Retention period (7 days)
   - Email provider settings
   - Supported trigger types

**Tests:**

8. **`tests/unit/services/NotificationService.test.ts`**
   - Unit tests for NotificationService
   - Mock database interactions

9. **`tests/unit/services/EmailService.test.ts`**
   - Unit tests for EmailService
   - Mock email provider

10. **`tests/integration/notifications.test.ts`**
    - End-to-end notification flow tests
    - Test trigger → notification → email

11. **`tests/jobs/NotificationRetentionJob.test.ts`**
    - Test retention cleanup logic
    - Verify 7-day threshold

### Files to Modify

1. **`src/app.ts` or `src/index.ts`**
   - Register notification routes
   - Initialize notification services

2. **`src/config/database.ts`**
   - Add notifications table configuration if needed

3. **`src/jobs/index.ts`**
   - Register NotificationRetentionJob with cron scheduler

4. **`package.json`**
   - Add email provider dependencies (e.g., `nodemailer`, `@sendgrid/mail`)
   - Add job scheduler dependency (e.g., `node-cron`, `bull`)

5. **`.env.example`**
   - Add email configuration variables
   - SMTP or API key settings

## API Endpoints

### GET `/api/notifications`

**Purpose:** Retrieve notification history for the authenticated user

**Authentication:** Required

**Query Parameters:**
- `page` (number, optional) - Pagination page number
- `limit` (number, optional) - Results per page (default: 20)
- `status` (string, optional) - Filter by status

**Response:**
```json
{
  "notifications": [
    {
      "id": "uuid",
      "trigger_type": "Testing THIS!!",
      "subject": "Test Notification",
      "body": "This is a test notification",
      "status": "sent",
      "created_at": "2026-01-28T17:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45
  }
}
```

### POST `/api/notifications/test`

**Purpose:** Trigger a test notification (admin/testing only)

**Authentication:** Required (admin role)

**Request Body:**
```json
{
  "user_id": "uuid",
  "subject": "Test Subject",
  "body": "Test Body"
}
```

**Response:**
```json
{
  "success": true,
  "notification_id": "uuid"
}
```

### GET `/api/notifications/:id`

**Purpose:** Get details of a specific notification

**Authentication:** Required

**Response:**
```json
{
  "id": "uuid",
  "trigger_type": "Testing THIS!!",
  "subject": "Test Notification",
  "body": "Notification content",
  "status": "sent",
  "email_sent_at": "2026-01-28T17:00:00Z",
  "created_at": "2026-01-28T17:00:00Z"
}
```

## Implementation Details

### Email Service Integration

**Recommended Provider:** NodeMailer (for flexibility) or SendGrid (for managed service)

**Configuration Required:**
- SMTP host/port or API keys
- From email address
- Email templates
- Rate limiting settings

**Email Template Structure:**
```html
<!DOCTYPE html>
<html>
<head>
  <style>/* Basic styling */</style>
</head>
<body>
  <div class="notification-container">
    <h2>{{subject}}</h2>
    <p>{{body}}</p>
    <footer>
      <p>This notification was triggered by: {{trigger_type}}</p>
      <p><small>Notifications are retained for 7 days</small></p>
    </footer>
  </div>
</body>
</html>
```

### Retention Job Implementation

**Cron Schedule:** Daily at 2:00 AM
**Expression:** `0 2 * * *`

**Job Logic:**
1. Calculate cutoff date (now - 7 days)
2. Query notifications where `created_at < cutoff_date`
3. Batch delete notifications (1000 at a time)
4. Log deletion count and any errors
5. Send alert if deletion fails

### "Testing THIS!!" Trigger Implementation

Since "Testing THIS!!" is a custom trigger type, implementation options:

**Option 1: Manual Trigger API**
- Expose POST endpoint `/api/notifications/test`
- Admin can manually trigger test notifications
- Useful for testing and debugging

**Option 2: Event-Based Trigger**
- Hook into existing event system
- Trigger when specific test event occurs
- Automatically creates notification

**Recommended:** Option 1 for flexibility during testing phase

### Error Handling

**Email Sending Failures:**
- Mark notification status as 'failed'
- Store error message in `error_message` column
- Implement retry logic (3 attempts with exponential backoff)
- Alert admin after final failure

**Database Failures:**
- Log errors with full context
- Return appropriate HTTP status codes
- Don't send email if database write fails

**Retention Job Failures:**
- Log errors and continue with next batch
- Send alert to monitoring system
- Retry on next scheduled run

## Configuration

### Environment Variables

Add to `.env` file:

```bash
# Email Configuration
EMAIL_PROVIDER=nodemailer  # or 'sendgrid'
EMAIL_HOST=smtp.example.com
EMAIL_PORT=587
EMAIL_USER=notifications@example.com
EMAIL_PASSWORD=your_secure_password
EMAIL_FROM=notifications@example.com

# Notification Settings
NOTIFICATION_RETENTION_DAYS=7
NOTIFICATION_BATCH_SIZE=1000

# Job Scheduler
RETENTION_JOB_CRON=0 2 * * *
```

### Constants File

In `src/config/notifications.ts`:

```typescript
export const NOTIFICATION_CONFIG = {
  RETENTION_DAYS: 7,
  BATCH_DELETE_SIZE: 1000,
  EMAIL_RETRY_ATTEMPTS: 3,
  EMAIL_RETRY_DELAY_MS: 5000,
  SUPPORTED_TRIGGERS: ['Testing THIS!!'],
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100
};
```

## Testing Strategy

### Unit Tests

**Coverage Requirements:**
- NotificationService: 90%+
- EmailService: 90%+
- Retention Job: 85%+

**Key Test Cases:**
- Create notification successfully
- Handle duplicate notifications
- Email sending success/failure scenarios
- Retention cleanup at exactly 7 days boundary
- Retention cleanup with no old notifications

### Integration Tests

**Test Scenarios:**
1. End-to-end: Trigger → Create → Send → Verify email
2. Retention: Create old notifications → Run job → Verify deletion
3. API: Test all endpoints with authentication
4. Error recovery: Simulate failures and verify retry logic

### Manual Testing Checklist

- [ ] Trigger test notification via API
- [ ] Verify email received in inbox
- [ ] Check notification appears in history API
- [ ] Wait 8 days, verify notification deleted
- [ ] Test with invalid email address
- [ ] Test with email service down
- [ ] Verify error logging

## Deployment Considerations

### Prerequisites

1. Email service provider account configured
2. Database migration executed
3. Environment variables set
4. Cron scheduler enabled

### Deployment Steps

1. Run database migration
2. Deploy backend code
3. Verify email configuration with test send
4. Enable retention cron job
5. Monitor logs for first 24 hours

### Monitoring

**Metrics to Track:**
- Email delivery success rate
- Email delivery latency
- Failed notification count
- Retention job execution time
- Notifications created per day

**Alerts:**
- Email delivery failure rate > 5%
- Retention job fails 2 consecutive times
- Notification queue backlog > 1000

## Security Considerations

**Email Security:**
- Use TLS for SMTP connections
- Store credentials in secure environment variables
- Validate email addresses before sending
- Implement rate limiting to prevent abuse

**Data Privacy:**
- Only allow users to view their own notifications
- Sanitize notification body to prevent XSS
- Don't log sensitive user data
- Comply with 7-day retention requirement

**API Security:**
- Require authentication for all endpoints
- Implement rate limiting (e.g., 100 requests/minute)
- Validate all input parameters
- Use HTTPS only

## Future Enhancements

Possible future additions (not in this implementation):

- Additional notification channels (push, in-app)
- Longer retention periods
- User preference settings
- Notification templates
- Bulk notification sending
- Read/unread status tracking
- Notification categories/filtering

## Estimated Size

**Size: M (Medium)**

**Reasoning:**
- 11 new files to create
- 5 existing files to modify
- Database migration required
- External service integration (email)
- Cron job implementation
- Comprehensive testing needed

**Estimated Effort:** 3-5 days for a mid-level engineer

## Dependencies

**Required Packages:**
- `nodemailer` (^6.9.0) - Email sending
- `node-cron` (^3.0.0) - Job scheduling
- Email provider SDK if using managed service

**Optional Packages:**
- `handlebars` (^4.7.0) - Email template rendering
- `bull` (^4.10.0) - More robust job queue (alternative to node-cron)