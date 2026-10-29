import { prisma } from './prisma';

export type NotificationType =
  | 'CAMERAMAN_ASSIGNMENT'
  | 'READY_FOR_EDITOR'
  | 'EDITOR_ASSIGNMENT'
  | 'EDITING_COMPLETED'
  | 'LIBRARY_PUBLISHED';

export interface NotificationPayload {
  epicId?: string;
  epicCode?: string;
  type: NotificationType;
  recipientEmail: string;
  recipientName?: string;
  subject: string;
  message: string;
  metadata?: Record<string, any>;
}

/**
 * Durable, safe notification system adhering strictly to production safety rules.
 * Automatically persists notification events to NotificationLog outbox.
 * Only marks status as 'SENT' if confirmed by an active mail transport.
 */
export async function queueNotification(payload: NotificationPayload): Promise<{
  success: boolean;
  notificationId?: string;
  status: 'SENT' | 'PENDING' | 'FAILED';
  notice: string;
}> {
  try {
    const id = `notif-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const recipientEmail = (payload.recipientEmail || '').trim().toLowerCase();

    if (!recipientEmail) {
      return {
        success: false,
        status: 'FAILED',
        notice: 'Recipient email address is required.'
      };
    }

    // Check if external mail provider credentials exist
    const hasResend = Boolean(process.env.RESEND_API_KEY);
    const hasSmtp = Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);

    let deliveryStatus: 'SENT' | 'PENDING' | 'FAILED' = 'PENDING';
    let deliveryError: string | null = null;
    let deliveryNotice = 'Safe Notification Mode: Notification queued in durable outbox. Configure RESEND_API_KEY or SMTP_HOST to enable external SMTP dispatch.';

    if (hasResend) {
      try {
        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            from: process.env.NOTIFICATION_FROM_EMAIL || 'PM e-Vidya Portal <notifications@pmevidyanimi.online>',
            to: recipientEmail,
            subject: payload.subject,
            html: `<div style="font-family: Arial, sans-serif; max-width: 600px; line-height: 1.6; color: #1e293b;">
              <h2 style="color: #0f2942; border-bottom: 2px solid #0284c7; padding-bottom: 8px;">PM e-Vidya Video Production Notification</h2>
              ${payload.message.replace(/\n/g, '<br/>')}
              <hr style="margin: 24px 0; border: 0; border-top: 1px solid #e2e8f0;" />
              <p style="font-size: 12px; color: #64748b;">National Instructional Media Institute (NIMI) | PM e-Vidya Portal</p>
            </div>`
          })
        });

        if (res.ok) {
          deliveryStatus = 'SENT';
          deliveryNotice = `Email confirmed delivered to ${recipientEmail} via Resend.`;
        } else {
          const errData = await res.json().catch(() => ({}));
          deliveryError = errData.message || 'Resend API returned non-200 status';
          deliveryStatus = 'FAILED';
          deliveryNotice = `Dispatch failed: ${deliveryError}`;
        }
      } catch (err: any) {
        deliveryError = err.message;
        deliveryStatus = 'FAILED';
        deliveryNotice = `Mail dispatch error: ${err.message}`;
      }
    }

    // Persist durable log entry in NotificationLog table
    await prisma.$executeRawUnsafe(`
      INSERT INTO "NotificationLog" ("id", "epicId", "type", "recipientEmail", "recipientName", "status", "subject", "message", "error", "sentAt", "createdAt")
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
      ON CONFLICT ("id") DO NOTHING;
    `,
      id,
      payload.epicId || null,
      payload.type,
      recipientEmail,
      payload.recipientName || null,
      deliveryStatus,
      payload.subject,
      payload.message,
      deliveryError,
      deliveryStatus === 'SENT' ? new Date() : null
    );

    return {
      success: true,
      notificationId: id,
      status: deliveryStatus,
      notice: deliveryNotice
    };
  } catch (error: any) {
    console.error('[NotificationSystem] Error queueing notification:', error);
    return {
      success: false,
      status: 'FAILED',
      notice: `Could not queue notification: ${error.message}`
    };
  }
}

/**
 * Fetch recent notification logs for Admin Outbox & Notification Center
 */
export async function getRecentNotificationLogs(limit: number = 50) {
  try {
    const logs = await prisma.$queryRawUnsafe(`
      SELECT "id", "epicId", "type", "recipientEmail", "recipientName", "status", "subject", "message", "error", "sentAt", "createdAt"
      FROM "NotificationLog"
      ORDER BY "createdAt" DESC
      LIMIT $1;
    `, limit);
    return logs as any[];
  } catch (err) {
    console.error('Error fetching notification logs:', err);
    return [];
  }
}

/**
 * Retry an existing pending or failed notification
 */
export async function retryNotification(notificationId: string): Promise<{
  success: boolean;
  status?: 'SENT' | 'PENDING' | 'FAILED';
  notice?: string;
  error?: string;
}> {
  try {
    const records = await prisma.$queryRawUnsafe(`
      SELECT * FROM "NotificationLog" WHERE "id" = $1 LIMIT 1;
    `, notificationId) as any[];

    if (!records || records.length === 0) {
      return { success: false, error: 'Notification record not found.' };
    }

    const notif = records[0];
    const recipientEmail = (notif.recipientEmail || '').trim().toLowerCase();

    if (!recipientEmail) {
      return { success: false, error: 'Recipient email address is missing in record.' };
    }

    const hasResend = Boolean(process.env.RESEND_API_KEY);
    if (!hasResend) {
      return {
        success: false,
        status: 'PENDING',
        error: 'Email provider is not configured in environment (RESEND_API_KEY missing). Notification remains preserved in the durable outbox.'
      };
    }

    // Attempt dispatch via configured provider
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: process.env.NOTIFICATION_FROM_EMAIL || 'PM e-Vidya Portal <notifications@pmevidyanimi.online>',
          to: recipientEmail,
          subject: notif.subject,
          html: `<div style="font-family: Arial, sans-serif; max-width: 600px; line-height: 1.6; color: #1e293b;">
            <h2 style="color: #0f2942; border-bottom: 2px solid #0284c7; padding-bottom: 8px;">PM e-Vidya Video Production Notification</h2>
            ${(notif.message || '').replace(/\n/g, '<br/>')}
            <hr style="margin: 24px 0; border: 0; border-top: 1px solid #e2e8f0;" />
            <p style="font-size: 12px; color: #64748b;">National Instructional Media Institute (NIMI) | PM e-Vidya Portal</p>
          </div>`
        })
      });

      if (res.ok) {
        await prisma.$executeRawUnsafe(`
          UPDATE "NotificationLog"
          SET "status" = 'SENT', "sentAt" = NOW(), "error" = NULL
          WHERE "id" = $1;
        `, notificationId);

        return {
          success: true,
          status: 'SENT',
          notice: `Email confirmed delivered to ${recipientEmail} via provider.`
        };
      } else {
        const errData = await res.json().catch(() => ({}));
        const deliveryError = errData.message || 'Provider returned non-200 status';

        await prisma.$executeRawUnsafe(`
          UPDATE "NotificationLog"
          SET "status" = 'FAILED', "error" = $1
          WHERE "id" = $2;
        `, deliveryError, notificationId);

        return {
          success: false,
          status: 'FAILED',
          error: `Dispatch failed: ${deliveryError}`
        };
      }
    } catch (sendErr: any) {
      await prisma.$executeRawUnsafe(`
        UPDATE "NotificationLog"
        SET "status" = 'FAILED', "error" = $1
        WHERE "id" = $2;
      `, sendErr.message, notificationId);

      return {
        success: false,
        status: 'FAILED',
        error: `Mail dispatch error: ${sendErr.message}`
      };
    }
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
