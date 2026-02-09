# Technical Design: User Notifications System

## Overview
Implement a user notification system with email delivery, 7-day retention, and comprehensive trigger support for task assignments, due dates, comments, and status changes.

## Design Decisions

Based on the clarification provided:
- **Notification Channels**: Email only (simplest implementation, reliable delivery)
- **Retention Period**: 7 days (minimal storage, good for MVP)
- **Notification Triggers**: All triggers including assignments, due dates, comments, and status changes (comprehensive coverage)

## Architecture

### Components
- **Notification Service**: Core service to create, store, and dispatch notifications
- **Email Provider**: Integration with email delivery service (e.g., SendGrid, AWS SES)
- **Notification Workers**: Background job processors for async email delivery
- **Storage Layer**: Database tables for notification records and user preferences

### Data Flow
1. Event occurs (task assignment, due date approaching, comment added, status change)
2. Event handler creates notification record in database
3. Background worker picks up notification and sends email
4. Notification marked as sent with timestamp
5. Cleanup job runs daily to delete notifications older than 7 days

## Database Schema

### notifications table
- `id` (UUID, primary key)
- `user_id` (UUID, foreign key to users table)
- `type` (enum: 'task_assigned', 'due_date_reminder', 'comment_added', 'status_changed')
- `title` (string, max 255 chars)
- `body` (text)
- `related_task_id` (UUID, nullable, foreign key to tasks table)
- `related_comment_id` (UUID, nullable, foreign key to comments table)
- `metadata` (JSONB, flexible data for different notification types)
- `sent_at` (timestamp, nullable)
- `created_at` (timestamp)
- Indexes: `user_id`, `created_at`, `type`, `sent_at`

### notification_preferences table
- `id` (UUID, primary key)
- `user_id` (UUID, foreign key to users table, unique)
- `email_enabled` (boolean, default true)
- `task_assigned_enabled` (boolean, default true)
- `due_date_reminder_enabled` (boolean, default true)
- `comment_added_enabled` (boolean, default true)
- `status_changed_enabled` (boolean, default true)
- `created_at` (timestamp)
- `updated_at` (timestamp)

## API Endpoints

### Notification Endpoints
- **GET /api/notifications**
  - Purpose: List user's notifications (last 7 days)
  - Auth: Required
  - Query params: `page`, `limit`, `type` (filter by notification type)
  - Response: Paginated list of notifications

- **PATCH /api/notifications/:id/mark-read**
  - Purpose: Mark notification as read (optional feature for tracking)
  - Auth: Required
  - Response: Updated notification object

- **GET /api/notifications/preferences**
  - Purpose: Get user's notification preferences
  - Auth: Required
  - Response: User preferences object

- **PATCH /api/notifications/preferences**
  - Purpose: Update notification preferences
  - Auth: Required
  - Body: Preference settings (which triggers are enabled)
  - Response: Updated preferences object

## Implementation Details

### Notification Triggers

**1. Task Assignment**
- Trigger: When a task is assigned to a user
- Email Subject: "You've been assigned to: {task_title}"
- Email Body: Include task details, due date, assignor name, link to task

**2. Due Date Reminder**
- Trigger: Scheduled job runs hourly, checks tasks due in next 24 hours
- Email Subject: "Reminder: {task_title} is due tomorrow"
- Email Body: Include task details, current status, link to task
- Logic: Only send once per task, 24 hours before due date

**3. Comment Added**
- Trigger: When a comment is added to a task the user is assigned to or watching
- Email Subject: "New comment on: {task_title}"
- Email Body: Include commenter name, comment text, link to task

**4. Status Changed**
- Trigger: When a task's status changes for tasks the user is assigned to or watching
- Email Subject: "{task_title} status changed to {new_status}"
- Email Body: Include old status, new status, who made the change, link to task

### Email Template System
- Create base HTML email template with consistent branding
- Individual templates for each notification type
- Plain text fallback for all emails
- Include unsubscribe link in footer

### Background Jobs

**1. Email Sender Worker**
- Frequency: Processes queue continuously
- Function: Send pending notifications via email provider
- Error handling: Retry failed sends with exponential backoff (3 attempts)

**2. Due Date Reminder Job**
- Frequency: Every hour
- Function: Find tasks due in 24 hours, create notifications
- Logic: Check if notification already sent for this task

**3. Cleanup Job**
- Frequency: Daily at 2 AM
- Function: Delete notifications older than 7 days
- Query: `DELETE FROM notifications WHERE created_at < NOW() - INTERVAL '7 days'`

## Files to Create/Modify

### Backend Files

**New Files:**
- `src/services/NotificationService.ts`
  - Core notification creation and management logic
  - Methods: createNotification, sendEmail, getUserNotifications

- `src/models/Notification.ts`
  - Notification database model
  - Relationships to User, Task, Comment

- `src/models/NotificationPreference.ts`
  - User notification preferences model
  - Default values and validation

- `src/controllers/NotificationController.ts`
  - API endpoints for notifications
  - Routes: GET /notifications, PATCH /notifications/:id/mark-read

- `src/controllers/NotificationPreferenceController.ts`
  - API endpoints for preferences
  - Routes: GET /preferences, PATCH /preferences

- `src/workers/EmailWorker.ts`
  - Background worker for sending emails
  - Queue processing logic

- `src/workers/DueDateReminderWorker.ts`
  - Scheduled job for due date reminders
  - Query tasks due in 24 hours

- `src/workers/CleanupWorker.ts`
  - Daily cleanup of old notifications
  - Delete records older than 7 days

- `src/emails/templates/BaseTemplate.html`
  - Base HTML email template
  - Header, footer, styling

- `src/emails/templates/TaskAssigned.html`
  - Template for task assignment notifications

- `src/emails/templates/DueDateReminder.html`
  - Template for due date reminders

- `src/emails/templates/CommentAdded.html`
  - Template for new comment notifications

- `src/emails/templates/StatusChanged.html`
  - Template for status change notifications

- `src/config/email.ts`
  - Email provider configuration
  - SMTP/API settings

- `database/migrations/YYYYMMDDHHMMSS_create_notifications_table.sql`
  - Create notifications table

- `database/migrations/YYYYMMDDHHMMSS_create_notification_preferences_table.sql`
  - Create notification_preferences table

**Modified Files:**
- `src/controllers/TaskController.ts`
  - Add notification triggers on task assignment
  - Add notification triggers on status change

- `src/controllers/CommentController.ts`
  - Add notification trigger when comment is created

- `src/routes/api.ts`
  - Register notification and preference routes

- `package.json`
  - Add email provider dependency (e.g., nodemailer, @sendgrid/mail)
  - Add job scheduler dependency (e.g., node-cron, bull)

- `.env.example`
  - Add email configuration variables
  - SMTP_HOST, SMTP_PORT, EMAIL_FROM, etc.

### Frontend Files (if applicable)

**New Files:**
- `src/components/NotificationPreferences.tsx`
  - UI for managing notification settings
  - Toggle switches for each trigger type

**Modified Files:**
- `src/pages/Settings.tsx` or `src/pages/UserProfile.tsx`
  - Add notification preferences section

## Configuration

### Environment Variables
- `EMAIL_PROVIDER`: Email service provider (sendgrid, ses, smtp)
- `EMAIL_FROM`: Sender email address
- `SMTP_HOST`: SMTP server host (if using SMTP)
- `SMTP_PORT`: SMTP server port
- `SMTP_USER`: SMTP username
- `SMTP_PASS`: SMTP password
- `SENDGRID_API_KEY`: SendGrid API key (if using SendGrid)
- `NOTIFICATION_RETENTION_DAYS`: Set to 7

## Testing Strategy

### Unit Tests
- NotificationService methods (createNotification, sendEmail)
- Email template rendering
- Preference validation logic

### Integration Tests
- End-to-end notification flow for each trigger type
- Email delivery verification
- Cleanup job execution
- Preference updates

### Test Cases
1. Task assignment creates notification and sends email
2. Due date reminder fires 24 hours before deadline
3. Comment on assigned task triggers notification
4. Status change triggers notification
5. User can update preferences and notifications respect settings
6. Notifications older than 7 days are deleted
7. Failed email sends are retried

## Rollout Plan

### Phase 1: Core Infrastructure
1. Create database tables
2. Implement NotificationService
3. Set up email provider integration

### Phase 2: Trigger Implementation
1. Implement task assignment trigger
2. Implement due date reminder job
3. Implement comment trigger
4. Implement status change trigger

### Phase 3: User Preferences
1. Create preference management API
2. Build preference UI
3. Update notification logic to respect preferences

### Phase 4: Testing & Launch
1. Complete test coverage
2. Test with small user group
3. Monitor email delivery rates
4. Full rollout

## Monitoring & Metrics

### Key Metrics
- Notification creation rate by type
- Email delivery success rate
- Email open rates (if tracking pixels used)
- Failed delivery count
- Average notification processing time
- Cleanup job execution time

### Alerts
- Email delivery failure rate > 5%
- Notification queue depth > 1000
- Worker job failures
- Database storage growth (7-day retention should keep this manageable)

## Security Considerations

- Validate user can only access their own notifications
- Sanitize notification content to prevent XSS
- Rate limit notification creation to prevent spam
- Secure email provider credentials
- Include unsubscribe mechanism (required for compliance)
- Don't include sensitive data in email content (link to app instead)

## Future Enhancements (Out of Scope)
- Push notifications (requires service worker setup)
- In-app notification center
- Notification grouping/batching
- Longer retention periods with archival
- SMS notifications
- Webhook notifications for integrations