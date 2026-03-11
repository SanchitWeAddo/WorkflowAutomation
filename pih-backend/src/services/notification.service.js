const sgMail = require('@sendgrid/mail');
const prisma = require('../config/prisma');
const { SENDGRID_API_KEY, FROM_EMAIL } = require('../config/env');
const logger = require('../utils/logger');

// Initialize SendGrid if API key is available
if (SENDGRID_API_KEY) {
  sgMail.setApiKey(SENDGRID_API_KEY);
}

/**
 * Create a notification record in the database.
 *
 * @param {string|null} taskId
 * @param {string}      recipientId
 * @param {string}      type       - e.g. 'task_assigned', 'status_change', 'comment', 'sla_warning'
 * @param {string}      channel    - 'in_app', 'email', 'sms', 'whatsapp'
 * @param {object}      content    - Notification content payload (title, message, etc.)
 * @returns {object} Created notification
 */
async function createNotification(taskId, recipientId, type, channel, content) {
  const notification = await prisma.notification.create({
    data: {
      taskId,
      recipientId,
      type,
      channel,
      subject: content.subject || null,
      content,
    },
  });

  logger.debug('Notification created', { id: notification.id, type, channel, recipientId });
  return notification;
}

/**
 * Send an email via SendGrid. Gracefully handles missing API key.
 *
 * @param {string} to          - Recipient email address.
 * @param {string} subject     - Email subject line.
 * @param {string} htmlContent - HTML body.
 * @returns {{ success: boolean, messageId?: string }}
 */
async function sendEmail(to, subject, htmlContent) {
  if (!SENDGRID_API_KEY) {
    logger.warn('SendGrid API key not configured – email not sent', { to, subject });
    return { success: false, reason: 'SendGrid not configured' };
  }

  try {
    const [response] = await sgMail.send({
      to,
      from: FROM_EMAIL,
      subject,
      html: htmlContent,
    });

    logger.info('Email sent', { to, subject, statusCode: response.statusCode });
    return { success: true, messageId: response.headers?.['x-message-id'] };
  } catch (error) {
    logger.error('Failed to send email', { to, subject, error: error.message });
    return { success: false, reason: error.message };
  }
}

/**
 * Notify relevant parties about a task update.
 * Determines recipients based on the event type and sends in-app + email notifications.
 *
 * @param {object} task      - The task object (with assignee, createdBy, lead relations).
 * @param {string} eventType - e.g. 'status_change', 'assignment', 'comment', 'sla_warning'
 */
async function notifyTaskUpdate(task, eventType) {
  try {
    // Determine recipients based on event type
    const recipientIds = new Set();

    // Task creator always gets notified (except for their own actions)
    if (task.createdById) recipientIds.add(task.createdById);

    // Assignee gets notified
    if (task.assigneeId) recipientIds.add(task.assigneeId);

    // Lead gets notified
    if (task.leadId) recipientIds.add(task.leadId);

    if (recipientIds.size === 0) return;

    // Build notification content
    const content = buildNotificationContent(task, eventType);

    // Fetch recipients' details
    const recipients = await prisma.user.findMany({
      where: { id: { in: Array.from(recipientIds) } },
      select: { id: true, email: true, name: true },
    });

    // Create in-app notifications and send emails in parallel
    const promises = recipients.map(async (recipient) => {
      // In-app notification
      const notification = await createNotification(
        task.id,
        recipient.id,
        eventType,
        'in_app',
        content,
      );

      // Email notification (non-blocking)
      const emailResult = await sendEmail(
        recipient.email,
        content.subject,
        buildEmailHtml(content, recipient.name, task),
      );

      // Mark as sent if email succeeded
      if (emailResult.success) {
        await prisma.notification.update({
          where: { id: notification.id },
          data: { sentAt: new Date() },
        });
      }

      return notification;
    });

    await Promise.allSettled(promises);

    logger.info('Task notifications sent', {
      taskId: task.id,
      eventType,
      recipientCount: recipients.length,
    });
  } catch (error) {
    // Notification failures should not break the main flow
    logger.error('Failed to send task notifications', {
      taskId: task.id,
      eventType,
      error: error.message,
    });
  }
}

/**
 * Get the count of unread notifications for a user.
 *
 * @param {string} userId
 * @returns {number}
 */
async function getUnreadCount(userId) {
  return prisma.notification.count({
    where: {
      recipientId: userId,
      readAt: null,
    },
  });
}

/**
 * Mark a notification as read.
 *
 * @param {string} notificationId
 * @param {string} userId - Ensure the user owns the notification.
 * @returns {object} Updated notification
 */
async function markAsRead(notificationId, userId) {
  const notification = await prisma.notification.findUnique({
    where: { id: notificationId },
  });

  if (!notification) {
    const err = new Error('Notification not found');
    err.statusCode = 404;
    throw err;
  }

  if (notification.recipientId !== userId) {
    const err = new Error('Unauthorized');
    err.statusCode = 403;
    throw err;
  }

  return prisma.notification.update({
    where: { id: notificationId },
    data: { readAt: new Date() },
  });
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function buildNotificationContent(task, eventType) {
  const ticketRef = task.ticketNumber || task.id;
  const templates = {
    status_change: {
      subject: `[${ticketRef}] Status updated to ${task.status}`,
      title: 'Task Status Updated',
      message: `Task "${task.title}" has been moved to ${task.status}.`,
    },
    assignment: {
      subject: `[${ticketRef}] Task assigned`,
      title: 'Task Assigned',
      message: `Task "${task.title}" has been assigned.`,
    },
    comment: {
      subject: `[${ticketRef}] New comment`,
      title: 'New Comment',
      message: `A new comment was added to "${task.title}".`,
    },
    sla_warning: {
      subject: `[${ticketRef}] SLA deadline approaching`,
      title: 'SLA Warning',
      message: `Task "${task.title}" is approaching its SLA deadline.`,
    },
    sla_breached: {
      subject: `[${ticketRef}] SLA breached`,
      title: 'SLA Breached',
      message: `Task "${task.title}" has breached its SLA deadline.`,
    },
    client_accepted: {
      subject: `[${ticketRef}] Client accepted delivery`,
      title: 'Delivery Accepted',
      message: `Client accepted the delivery for "${task.title}".`,
    },
    client_rejected: {
      subject: `[${ticketRef}] Client rejected delivery`,
      title: 'Delivery Rejected',
      message: `Client rejected the delivery for "${task.title}".`,
    },
  };

  return templates[eventType] || {
    subject: `[${ticketRef}] Task update`,
    title: 'Task Update',
    message: `Task "${task.title}" has been updated.`,
  };
}

function buildEmailHtml(content, recipientName, task) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #1a1a2e;">${content.title}</h2>
      <p>Hi ${recipientName},</p>
      <p>${content.message}</p>
      <div style="background: #f5f5f5; padding: 16px; border-radius: 8px; margin: 16px 0;">
        <p style="margin: 4px 0;"><strong>Task:</strong> ${task.title}</p>
        <p style="margin: 4px 0;"><strong>Ticket:</strong> ${task.ticketNumber || 'N/A'}</p>
        <p style="margin: 4px 0;"><strong>Priority:</strong> ${task.priority || 'N/A'}</p>
        <p style="margin: 4px 0;"><strong>Status:</strong> ${task.status || 'N/A'}</p>
      </div>
      <p style="color: #666; font-size: 12px;">This is an automated notification from Project Intelligence Hub.</p>
    </div>
  `;
}

module.exports = {
  createNotification,
  sendEmail,
  notifyTaskUpdate,
  getUnreadCount,
  markAsRead,
};
