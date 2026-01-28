# Technical Design: User Notifications System

## Overview
Implement a comprehensive notification system supporting Email and Push notifications for user events.

## Scope
Based on clarifications received:
- **Channels**: Email + Push notifications
- **Retention**: 30 days (recommended standard)
- **Initial Triggers**: Task assignments + Due date reminders (recommended MVP scope)

## Architecture

### High-Level Design
The notification system consists of:
- Notification service layer for business logic
- Database models for notification storage
- Email delivery service integration
- Push notification service with service worker
- API endpoints for notification management
- Frontend components for notification preferences

### Components

**Backend Services:**
- `NotificationService`: Core business logic
- `EmailService`: Email delivery via SMTP/provider
- `PushService`: Push notification delivery via Web Push API
- `NotificationScheduler`: Handles due date reminder scheduling

**Frontend Components:**
- `NotificationPreferences`: User settings UI
- `PushNotificationSetup`: Service worker registration
- `NotificationBell`: In-app notification indicator

## Database Schema

### notifications table
- `id`: UUID, primary key
- `user_id`: UUID, foreign key to users
- `type`: ENUM('task_assignment', 'due_date_reminder')
- `title`: VARCHAR(255)
- `message`: TEXT
- `data`: JSONB (additional context)
- `read`: BOOLEAN, default false
- `channels_sent`: ARRAY (tracks which channels were used)
- `created_at`: TIMESTAMP
- `expires_at`: TIMESTAMP (created_at + 30 days)

### notification_preferences table
- `user_id`: UUID, primary key, foreign key to users
- `email_enabled`: BOOLEAN, default true
- `push_enabled`: BOOLEAN, default false
- `task_assignment_enabled`: BOOLEAN, default true
- `due_date_reminder_enabled`: BOOLEAN, default true
- `reminder_advance_hours`: INTEGER, default 24
- `updated_at`: TIMESTAMP

### push_subscriptions table
- `id`: UUID, primary key
- `user_id`: UUID, foreign key to users
- `endpoint`: TEXT
- `p256dh_key`: TEXT
- `auth_key`: TEXT
- `user_agent`: TEXT
- `created_at`: TIMESTAMP

## API Endpoints

### Notification Management
**GET /api/notifications**
- Purpose: Retrieve user notifications
- Query params: `?read=false&limit=50&offset=0`
- Response: Paginated notification list

**PATCH /api/notifications/:id/read**
- Purpose: Mark notification as read
- Body: `{ "read": true }`
- Response: Updated notification

**DELETE /api/notifications/:id**
- Purpose: Delete a notification
- Response: 204 No Content

### Preferences
**GET /api/notifications/preferences**
- Purpose: Get user notification preferences
- Response: Preference object

**PUT /api/notifications/preferences**
- Purpose: Update notification preferences
- Body: Preference fields
- Response: Updated preferences

### Push Subscription
**POST /api/notifications/push/subscribe**
- Purpose: Register push subscription
- Body: `{ "subscription": {...} }`
- Response: Subscription confirmation

**DELETE /api/notifications/push/unsubscribe**
- Purpose: Remove push subscription
- Response: 204 No Content

## Implementation Details

### Files to Create

**Backend:**
- `src/services/NotificationService.ts`
  - Core notification creation and delivery logic
  - Methods: `create()`, `send()`, `markAsRead()`, `cleanup()`

- `src/services/EmailService.ts`
  - Email template rendering
  - SMTP/provider integration (SendGrid, AWS SES, etc.)

- `src/services/PushService.ts`
  - Web Push API integration
  - VAPID key management
  - Subscription handling

- `src/services/NotificationScheduler.ts`
  - Cron job for due date reminders
  - Background task processing

- `src/routes/notifications.ts`
  - API route handlers
  - Middleware for authentication

- `src/models/Notification.ts`
  - Database model and queries
  - Validation schemas

- `src/models/NotificationPreference.ts`
  - Preference model and queries

- `src/models/PushSubscription.ts`
  - Push subscription model

- `database/migrations/YYYYMMDD_create_notifications.sql`
  - Schema creation for all tables
  - Indexes for performance

**Frontend:**
- `src/components/NotificationPreferences.tsx`
  - Settings UI for notification channels
  - Toggle controls for each trigger type
  - Reminder timing configuration

- `src/components/NotificationBell.tsx`
  - Icon with unread count badge
  - Dropdown with recent notifications
  - Mark as read functionality

- `src/components/PushNotificationSetup.tsx`
  - Permission request flow
  - Service worker registration
  - Subscription management

- `src/hooks/useNotifications.ts`
  - React hook for notification data
  - Real-time updates via polling/websocket

- `public/service-worker.js`
  - Push event listener
  - Notification display
  - Click handlers

- `src/lib/pushNotifications.ts`
  - Browser push API wrapper
  - Subscription helpers

### Files to Modify

**Backend:**
- `src/services/TaskService.ts`
  - Add notification trigger on task assignment
  - Call `NotificationService.create()` after assignment

- `src/config/index.ts`
  - Add VAPID public/private keys
  - Add email service configuration
  - Add notification retention period

- `src/index.ts` or main app file
  - Register notification routes
  - Initialize notification scheduler

**Frontend:**
- `src/App.tsx` or main layout
  - Add `<NotificationBell />` to header
  - Add service worker registration

- `src/pages/Settings.tsx` or user settings page
  - Add `<NotificationPreferences />` section

- `package.json`
  - Add dependencies: `web-push`, `nodemailer` or email provider SDK

## Environment Variables

Add to `.env`:
```
VAPID_PUBLIC_KEY=<generated-key>
VAPID_PRIVATE_KEY=<generated-key>
VAPID_SUBJECT=mailto:admin@example.com

EMAIL_SERVICE=smtp
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=notifications@example.com
SMTP_PASS=<password>

NOTIFICATION_RETENTION_DAYS=30
```

## Security Considerations

**Push Notifications:**
- VAPID keys stored securely in environment variables
- Validate subscription endpoints before storing
- Rate limit subscription endpoints

**Email:**
- Use authenticated SMTP or trusted email service
- Implement unsubscribe links in all emails
- Sanitize user input in email templates

**API:**
- Authenticate all notification endpoints
- Users can only access their own notifications
- Validate notification preferences input

## Performance Considerations

**Database:**
- Index on `user_id` and `created_at` for fast queries
- Index on `expires_at` for cleanup job
- Automatic cleanup job runs daily to delete expired notifications

**Push Delivery:**
- Queue push notifications for batch processing
- Retry failed deliveries with exponential backoff
- Remove invalid subscriptions automatically

**Email Delivery:**
- Use background job queue for email sending
- Batch emails when possible
- Handle bounces and unsubscribes

## Testing Strategy

**Unit Tests:**
- NotificationService creation and delivery logic
- Email template rendering
- Push subscription validation

**Integration Tests:**
- End-to-end notification flow
- Task assignment triggers notification
- Due date reminder scheduling
- Preference updates affect delivery

**Manual Testing:**
- Test email delivery across providers
- Test push notifications on Chrome, Firefox, Safari
- Verify service worker updates correctly
- Test notification cleanup job

## Rollout Plan

**Phase 1: Backend Infrastructure**
1. Database migrations
2. Core notification service
3. Email service integration
4. API endpoints

**Phase 2: Task Assignment Notifications**
1. Integrate with TaskService
2. Email templates for assignments
3. Testing and validation

**Phase 3: Push Notifications**
1. Service worker implementation
2. Push service setup
3. Subscription management
4. Frontend UI for setup

**Phase 4: Due Date Reminders**
1. Scheduler implementation
2. Reminder logic and timing
3. Email and push templates
4. Testing scheduled jobs

**Phase 5: User Preferences**
1. Preferences UI
2. Preference enforcement in services
3. Testing all preference combinations

## Future Enhancements

**Potential additions after MVP:**
- In-app notification center
- SMS notifications
- Slack/Discord integrations
- More trigger types (comments, status changes)
- Digest emails (daily/weekly summaries)
- Notification sound customization
- Advanced filtering rules

## Open Questions

The following decisions were made based on industry best practices, pending explicit confirmation:
- **Retention period**: 30 days chosen as standard practice
- **Initial triggers**: Task assignments + Due date reminders for MVP scope

If different values are preferred, these can be easily adjusted in the implementation.