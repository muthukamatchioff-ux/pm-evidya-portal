import { prisma } from './prisma';

export interface LogAuditParams {
  action: string;
  entity: string;
  entityId: string;
  userEmail?: string | null;
  previousData?: string | null;
  newData?: string | null;
}

/**
 * Safely creates an AuditLog entry without violating foreign key constraints.
 * If userEmail is provided, it looks up the User by email to find the matching cuid ID.
 * If no matching user is found, userId is set to null (which is valid since userId is nullable),
 * while preserving the userEmail in the newData audit text.
 * Also catches any unexpected errors to prevent non-critical audit log failures
 * from breaking core application operations.
 */
export async function logAudit({
  action,
  entity,
  entityId,
  userEmail,
  previousData,
  newData
}: LogAuditParams) {
  try {
    let resolvedUserId: string | null = null;

    if (userEmail && typeof userEmail === 'string' && userEmail.trim().length > 0) {
      try {
        const normalized = userEmail.toLowerCase().trim();
        const user = await prisma.user.findUnique({
          where: { email: normalized },
          select: { id: true }
        });
        if (user) {
          resolvedUserId = user.id;
        }
      } catch (err) {
        console.warn('Could not resolve user ID for audit log:', err);
      }
    }

    let formattedNewData = newData || '';
    if (userEmail && !formattedNewData.includes(userEmail)) {
      formattedNewData = formattedNewData 
        ? `${formattedNewData} [Actor: ${userEmail}]` 
        : `[Actor: ${userEmail}]`;
    }

    return await prisma.auditLog.create({
      data: {
        action,
        entity,
        entityId,
        previousData: previousData || null,
        newData: formattedNewData || null,
        userId: resolvedUserId
      }
    });
  } catch (error) {
    console.error('AuditLog creation caught error safely (non-blocking):', error);
    return null;
  }
}
