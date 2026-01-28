# Technical Design: User Notifications System

## Overview

This design implements a user notification system for the application with the following specifications based on clarification:
- **Channel**: Email notifications only
- **Retention**: 90-day notification history
- **Triggers**: Custom trigger set (TESTING OTHER)

## Design Decisions

Based on the clarification received:

1. **Email-Only Implementation**
   - Simpler initial implementation
   - Reliable delivery mechanism
   - Most users have email configured
   - Foundation for future channel expansion

2. **90-Day Retention Policy**
   - Extended history for user reference
   - Balances storage requirements with user needs
   - Sufficient for audit and troubleshooting purposes

3. **Custom Trigger Set**
   - Per admin specification: "TESTING OTHER"
   - Flexible trigger system to accommodate custom requirements
   - Extensible architecture for future trigger types

## Architecture

### System Components

**Notification Service Layer:**
- `NotificationService`: Core service for creating and managing notifications
- `EmailService`: Handles email delivery via configured SMTP/email provider
- `NotificationScheduler`: Background job processor for async delivery
- `RetentionManager`: Automated cleanup of notifications older than 90 days

**Data Layer:**
- `Notification` model: Stores notification records
- `NotificationPreference` model: User preferences for notification settings

**API Layer:**
- RESTful endpoints for notification management
- Webhook endpoints for external trigger integration

## Data Models

### Notification Model

**Fields:**
- `id` (UUID): Primary identifier
- `userId` (UUID): Foreign key to User
- `type` (String): Notification type/category
- `subject` (String): Email subject line
- `body` (Text): Notification content (HTML supported)
- `metadata` (JSON): Additional context data
- `status` (Enum): `pending`, `sent`, `failed`, `retrying`
- `sentAt` (Timestamp): When notification was delivered
- `createdAt` (Timestamp): When notification was created
- `expiresAt` (Timestamp): Auto-calculated as createdAt + 90 days

**Indexes:**
- `userId` (for user queries)
- `expiresAt` (for retention cleanup)
- `status` (for delivery queue)
- `createdAt` (for sorting)

### NotificationPreference Model

**Fields:**
- `id` (UUID): Primary identifier
- `userId` (UUID): Foreign key to User (unique)
- `emailEnabled` (Boolean): Master email toggle (default: true)
- `triggerPreferences` (JSON): Per-trigger enable/disable settings
- `emailAddress` (String): Override email (defaults to user's primary email)
- `updatedAt` (Timestamp): Last preference update

## API Endpoints

### Notification Management

**GET `/api/notifications`**
- Purpose: List user's notifications with pagination
- Query params:
  - `page` (number, default: 1)
  - `limit` (number, default: 20, max: 100)
  - `status` (optional filter)
- Returns: Paginated notification list
- Auth: Required

**GET `/api/notifications/:id`**
- Purpose: Get single notification details
- Returns: Notification object
- Auth: Required (user must own notification)

**POST `/api/notifications`**
- Purpose: Create notification (internal/admin use)
- Body:
  - `userId` (required)
  - `type` (required)
  - `subject` (required)
  - `body` (required)
  - `metadata` (optional)
- Returns: Created notification
- Auth: Required (admin/service token)

**DELETE `/api/notifications/:id`**
- Purpose: Delete specific notification
- Returns: Success status
- Auth: Required (user must own notification)

### Notification Preferences

**GET `/api/notifications/preferences`**
- Purpose: Get user's notification preferences
- Returns: NotificationPreference object
- Auth: Required

**PUT `/api/notifications/preferences`**
- Purpose: Update notification preferences
- Body:
  - `emailEnabled` (optional)
  - `triggerPreferences` (optional)
  - `emailAddress` (optional)
- Returns: Updated preferences
- Auth: Required

### Webhook Endpoints

**POST `/api/webhooks/notifications/trigger`**
- Purpose: External systems can trigger notifications
- Body:
  - `userId` (required)
  - `triggerType` (required)
  - `data` (required)
- Returns: Notification creation status
- Auth: Required (webhook secret token)

## Implementation Files

### Backend Files

**New Files:**
- `src/services/NotificationService.ts`
  - Core notification creation and management logic
  - Business rules for notification triggering
  - Integration with email service

- `src/services/EmailService.ts`
  - Email delivery implementation
  - Template rendering
  - SMTP/email provider integration (e.g., SendGrid, AWS SES)

- `src/services/NotificationScheduler.ts`
  - Background job processing using queue (e.g., Bull, BullMQ)
  - Retry logic for failed deliveries
  - Rate limiting and throttling

- `src/services/RetentionManager.ts`
  - Daily cron job to delete notifications older than 90 days
  - Batch processing for efficient cleanup
  - Logging and metrics

- `src/models/Notification.ts`
  - Database model definition
  - Relationships to User model
  - Query helpers and scopes

- `src/models/NotificationPreference.ts`
  - User preference model
  - Default values
  - Validation logic

- `src/controllers/NotificationController.ts`
  - HTTP request handlers
  - Input validation
  - Response formatting

- `src/controllers/NotificationPreferenceController.ts`
  - Preference management endpoints
  - User-specific preference updates

- `src/routes/notifications.ts`
  - Route definitions
  - Middleware application (auth, validation)

- `src/templates/emails/notification-base.html`
  - Base email template with styling
  - Responsive design
  - Unsubscribe footer

- `src/templates/emails/notification-{type}.html`
  - Type-specific email templates
  - Variable interpolation

- `src/jobs/notificationDelivery.ts`
  - Queue job definition for async email sending
  - Error handling and retry logic

- `src/jobs/retentionCleanup.ts`
  - Scheduled job for 90-day cleanup
  - Batch deletion logic

**Modified Files:**
- `src/config/database.ts`
  - Add migration imports for new tables

- `src/config/queue.ts` (or create if doesn't exist)
  - Configure job queue (Redis connection)
  - Queue options and settings

- `src/config/email.ts` (or create if doesn't exist)
  - Email provider credentials
  - SMTP settings
  - Template paths

- `src/routes/index.ts`
  - Import and mount notification routes

- `src/app.ts` or `src/server.ts`
  - Initialize notification scheduler
  - Start retention cleanup cron job

**Database Migrations:**
- `migrations/{timestamp}_create_notifications_table.ts`
  - Create notifications table with indexes
  - Set up foreign key to users table

- `migrations/{timestamp}_create_notification_preferences_table.ts`
  - Create preferences table
  - Set up unique constraint on userId

### Frontend Files (if applicable)

**New Files:**
- `src/components/NotificationCenter.tsx`
  - UI component to display notifications
  - Mark as read functionality
  - Pagination controls

- `src/components/NotificationPreferences.tsx`
  - User settings page for notification preferences
  - Toggle switches for email and trigger types
  - Email override input

- `src/hooks/useNotifications.ts`
  - React hook for fetching notifications
  - Real-time updates (optional polling)
  - Cache management

- `src/services/api/notifications.ts`
  - API client methods for notification endpoints
  - Type definitions

**Modified Files:**
- `src/components/Header.tsx` or `src/components/Navigation.tsx`
  - Add notification bell icon with unread count
  - Link to NotificationCenter

- `src/pages/Settings.tsx`
  - Add NotificationPreferences component to settings page

## Implementation Phases

### Phase 1: Core Infrastructure (Backend)
1. Database models and migrations
2. NotificationService basic implementation
3. EmailService with simple SMTP
4. Basic API endpoints (create, list, get)

### Phase 2: Delivery & Processing
1. Queue setup and NotificationScheduler
2. Retry logic and error handling
3. Email templates
4. Webhook endpoint for triggers

### Phase 3: Retention & Preferences
1. NotificationPreference model and API
2. RetentionManager implementation
3. Daily cleanup cron job
4. User preference enforcement

### Phase 4: Frontend (Optional)
1. NotificationCenter component
2. NotificationPreferences settings page
3. API integration and hooks
4. Real-time updates (polling/websocket)

## Configuration

### Environment Variables

Required environment variables:
- `EMAIL_PROVIDER`: Provider name (`smtp`, `sendgrid`, `ses`)
- `EMAIL_FROM_ADDRESS`: Sender email address
- `EMAIL_FROM_NAME`: Sender display name
- `SMTP_HOST`: SMTP server host (if using SMTP)
- `SMTP_PORT`: SMTP server port
- `SMTP_USER`: SMTP username
- `SMTP_PASSWORD`: SMTP password
- `REDIS_URL`: Redis connection string for queue
- `NOTIFICATION_RETENTION_DAYS`: Set to `90`
- `WEBHOOK_SECRET_TOKEN`: Secret for webhook authentication

## Testing Strategy

### Unit Tests
- NotificationService: Creation, validation, business logic
- EmailService: Template rendering, email sending (mocked)
- RetentionManager: Date calculations, batch deletion
- Models: Validation, relationships

### Integration Tests
- API endpoints: Full request/response cycle
- Queue processing: Job creation and execution
- Database operations: CRUD operations, cascading deletes

### End-to-End Tests
- Complete notification flow: trigger → create → send → receive
- Preference enforcement: disabled notifications should not send
- Retention cleanup: verify old notifications are deleted

## Monitoring & Observability

### Metrics to Track
- Notification creation rate
- Email delivery success/failure rate
- Queue depth and processing time
- Retention cleanup execution time
- API endpoint response times

### Logging
- Notification created (with type and userId)
- Email sent successfully / failed (with reason)
- Retention cleanup executed (count of deleted records)
- Preference updates

### Alerts
- High email failure rate (> 5%)
- Queue backlog exceeding threshold
- Retention job failures

## Security Considerations

1. **Authentication**: All API endpoints require valid user authentication
2. **Authorization**: Users can only access their own notifications
3. **Webhook Security**: Validate webhook secret token
4. **Email Injection Prevention**: Sanitize subject and body content
5. **Rate Limiting**: Prevent notification spam (per-user limits)
6. **Data Privacy**: Encrypt sensitive notification content at rest
7. **Unsubscribe**: Include unsubscribe link in all emails (legal requirement)

## Future Enhancements

Potential future additions (not in scope):
- Push notifications (requires service worker)
- In-app notification center with real-time updates
- SMS notifications
- Notification grouping and digests
- Advanced filtering and search
- Notification templates with visual editor
- A/B testing for notification content

## Rollout Plan

1. **Development**: Implement phases 1-3 in development environment
2. **Testing**: Comprehensive testing with test email accounts
3. **Beta**: Roll out to small subset of users (5-10%)
4. **Monitoring**: Watch metrics for issues
5. **Full Rollout**: Deploy to all users if beta successful
6. **Documentation**: Update user docs and admin guides

## Success Criteria

- [ ] Users receive email notifications for configured triggers
- [ ] Notifications are stored and queryable for 90 days
- [ ] Old notifications are automatically deleted after 90 days
- [ ] Users can manage their notification preferences
- [ ] Email delivery rate > 95%
- [ ] API response times < 200ms (p95)
- [ ] Zero data loss in notification system