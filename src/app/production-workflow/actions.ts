'use server';

import { prisma } from '@/lib/prisma';
import { checkAuth, getEmail, getRole } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { queueNotification, getRecentNotificationLogs, retryNotification } from '@/lib/notifications';

function formatEpicCode(epicSeq: number | null | undefined): string {
  if (!epicSeq) return 'EPIC-NEW';
  return `EPIC-2026-PMeVidya ${String(epicSeq).padStart(2, '0')}`;
}

export interface WorkflowEpicItem {
  id: string;
  epicSequence: number;
  epicCode: string;
  trade: string;
  topic: string;
  status: string;
  createdAt: string;
  sme: {
    id: string;
    name: string;
    designation: string | null;
    institute: string | null;
  } | null;
  cameraman: {
    id: string;
    name: string | null;
    email: string;
    status: string;
  } | null;
  editor: {
    id: string;
    name: string | null;
    email: string;
    status: string;
  } | null;
  cameramanAssignedAt: string | null;
  editorAssignedAt: string | null;
  isPublished: boolean;
  publishedAt: string | null;
  publishedBy: string | null;
  workflowStage: 'UNASSIGNED' | 'SHOOTING' | 'READY_FOR_EDITOR' | 'EDITING' | 'COMPLETED' | 'PUBLISHED';
  topics: Array<{
    id: string;
    title: string;
    shootingStatus: string;
    shootStart: string | null;
    shootEnd: string | null;
    cameraman: string | null;
    editingStatus: string;
    editStart: string | null;
    editEnd: string | null;
    editor: string | null;
    finalVideoLink: string | null;
    duration: string | null;
  }>;
  totalTopics: number;
  completedShootingTopics: number;
  completedEditingTopics: number;
  notStartedEditingTopics: number;
  inProgressEditingTopics: number;
  hasPendingAction: boolean;
  pendingActionText: string | null;
}

export interface DashboardWorkflowData {
  counts: {
    unassigned: number;
    shooting: number;
    readyForEditor: number;
    editing: number;
    completed: number;
    published: number;
    total: number;
  };
  epics: WorkflowEpicItem[];
  registeredCameramen: Array<{
    id: string;
    name: string | null;
    email: string;
    role: string;
    status: string;
    department: string | null;
  }>;
  registeredEditors: Array<{
    id: string;
    name: string | null;
    email: string;
    role: string;
    status: string;
    department: string | null;
  }>;
  recentNotifications: any[];
}

export async function getProductionWorkflowDashboardData(): Promise<{
  success: boolean;
  data?: DashboardWorkflowData;
  error?: string;
}> {
  const auth = await checkAuth(['ADMIN']);
  if (!auth.success) {
    return { success: false, error: auth.error || 'Unauthorized.' };
  }

  try {
    // 1. Fetch all canonical SMEWorkEntries with full video production relations
    const [entries, cameramen, editors, notifications] = await Promise.all([
      prisma.sMEWorkEntry.findMany({
        where: {
          OR: [
            { videoLibraries: { some: {} } },
            { shootingSchedules: { some: {} } },
            { videoEditorRecords: { some: {} } }
          ]
        },
        include: {
          sme: true,
          cameraman: { select: { id: true, name: true, email: true, status: true } },
          editor: { select: { id: true, name: true, email: true, status: true } },
          shootingSchedules: {
            orderBy: { createdAt: 'asc' }
          },
          videoEditorRecords: {
            orderBy: { createdAt: 'asc' }
          },
          videoLibraries: {
            orderBy: { id: 'asc' }
          },
          finalVideoRecords: true
        },
        orderBy: { epicSequence: 'desc' }
      }),
      prisma.user.findMany({
        where: { role: 'CAMERAMAN', status: 'ACTIVE' },
        select: { id: true, name: true, email: true, role: true, status: true, department: true },
        orderBy: { name: 'asc' }
      }),
      prisma.user.findMany({
        where: { role: 'EDITOR', status: 'ACTIVE' },
        select: { id: true, name: true, email: true, role: true, status: true, department: true },
        orderBy: { name: 'asc' }
      }),
      getRecentNotificationLogs(25)
    ]);

    // Build unified workflow models
    const workflowEpics: WorkflowEpicItem[] = entries.map((entry: any) => {
      const epicCode = formatEpicCode(entry.epicSequence);

      // Merge and align topics from videoLibraries, shootingSchedules, and videoEditorRecords
      const topicMap = new Map<string, {
        id: string;
        title: string;
        shoot?: any;
        edit?: any;
        lib?: any;
      }>();

      // Seed from videoLibraries
      entry.videoLibraries.forEach((vl: any) => {
        topicMap.set(vl.id, { id: vl.id, title: vl.title, lib: vl });
      });

      // Attach or create from shootingSchedules
      entry.shootingSchedules.forEach((ss: any) => {
        const rawId = ss.id.replace(/^shoot-/, '');
        if (topicMap.has(rawId)) {
          topicMap.get(rawId)!.shoot = ss;
        } else {
          // Match by title
          const norm = (ss.videoTitle || '').trim().toLowerCase();
          let attached = false;
          for (const [, val] of topicMap) {
            if (val.title && val.title.trim().toLowerCase() === norm) {
              val.shoot = ss;
              attached = true;
              break;
            }
          }
          if (!attached) {
            topicMap.set(ss.id, { id: ss.id, title: ss.videoTitle || entry.topic, shoot: ss });
          }
        }
      });

      // Attach or create from videoEditorRecords
      entry.videoEditorRecords.forEach((ed: any) => {
        const rawId = ed.id.replace(/^ed-/, '');
        if (topicMap.has(rawId)) {
          topicMap.get(rawId)!.edit = ed;
        } else {
          // Match by title
          const norm = (ed.assignedVideo || '').trim().toLowerCase();
          let attached = false;
          for (const [, val] of topicMap) {
            if (val.title && val.title.trim().toLowerCase() === norm) {
              val.edit = ed;
              attached = true;
              break;
            }
          }
          if (!attached) {
            topicMap.set(ed.id, { id: ed.id, title: ed.assignedVideo || entry.topic, edit: ed });
          }
        }
      });

      // If entry had no topics at all, seed with the main entry.topic
      if (topicMap.size === 0 && entry.topic) {
        topicMap.set(`${entry.id}-default`, {
          id: `${entry.id}-default`,
          title: entry.topic
        });
      }

      const topics = Array.from(topicMap.values()).map(t => {
        const shootStatus = t.shoot?.status || 'Yet to Shoot';
        const editStatus = t.edit?.status || 'Pending';
        const finalLink = t.edit?.finalVideoFile || t.lib?.videoLink || null;
        const duration = t.edit?.duration || t.lib?.duration || null;

        return {
          id: t.id,
          title: t.title,
          shootingStatus: shootStatus,
          shootStart: t.shoot?.scheduledStart ? new Date(t.shoot.scheduledStart).toISOString() : null,
          shootEnd: t.shoot?.scheduledEnd ? new Date(t.shoot.scheduledEnd).toISOString() : null,
          cameraman: t.shoot?.cameraman || entry.cameraman?.name || null,
          editingStatus: editStatus,
          editStart: t.edit?.editingStartDate ? new Date(t.edit.editingStartDate).toISOString() : null,
          editEnd: t.edit?.editingEndDate ? new Date(t.edit.editingEndDate).toISOString() : null,
          editor: t.edit?.editorName || entry.editor?.name || null,
          finalVideoLink: finalLink,
          duration: duration
        };
      });

      const isTopicShootingDone = (t: any) => {
        const s = (t.shootingStatus || '').toLowerCase();
        return s === 'completed' || s.includes('received');
      };

      const isTopicEditingDone = (t: any) => {
        const e = (t.editingStatus || '').toLowerCase();
        const s = (t.shootingStatus || '').toLowerCase();
        const hasLink = Boolean(t.finalVideoLink);
        if (hasLink && (e === 'completed' || e.startsWith('completed') || e === 'na' || e === 'received' || s.includes('received'))) {
          return true;
        }
        return e === 'completed' && hasLink;
      };

      const totalTopics = topics.length;
      const completedShootingTopics = topics.filter(isTopicShootingDone).length;
      const completedEditingTopics = topics.filter(isTopicEditingDone).length;
      const notStartedEditingTopics = topics.filter(t => !isTopicEditingDone(t) && (t.editingStatus === 'Not Yet Started' || t.editingStatus === 'Pending' || !t.editor)).length;
      const inProgressEditingTopics = topics.filter(t => !isTopicEditingDone(t) && ((t.editingStatus || '').toLowerCase().includes('progress') || (t.editingStatus || '').toLowerCase().includes('process'))).length;

      // Determine Workflow Stage
      let workflowStage: 'UNASSIGNED' | 'SHOOTING' | 'READY_FOR_EDITOR' | 'EDITING' | 'COMPLETED' | 'PUBLISHED' = 'UNASSIGNED';
      let hasPendingAction = false;
      let pendingActionText: string | null = null;

      if (entry.isPublished) {
        workflowStage = 'PUBLISHED';
      } else if (completedEditingTopics === totalTopics && totalTopics > 0) {
        workflowStage = 'COMPLETED';
        hasPendingAction = true;
        pendingActionText = 'Ready for Final Review & Publication to Video Content Library';
      } else if (completedShootingTopics === totalTopics && totalTopics > 0 && notStartedEditingTopics > 0) {
        workflowStage = 'READY_FOR_EDITOR';
        hasPendingAction = true;
        pendingActionText = `${notStartedEditingTopics} topic${notStartedEditingTopics > 1 ? 's' : ''} awaiting Editor Assignment`;
      } else if (inProgressEditingTopics > 0 || entry.editorId) {
        workflowStage = 'EDITING';
        hasPendingAction = inProgressEditingTopics > 0;
        pendingActionText = inProgressEditingTopics > 0 ? `${inProgressEditingTopics} topic${inProgressEditingTopics > 1 ? 's' : ''} currently in post-production editing` : null;
      } else if (completedShootingTopics === totalTopics && totalTopics > 0) {
        workflowStage = 'READY_FOR_EDITOR';
        hasPendingAction = true;
        pendingActionText = 'All shooting topics completed! Action Required: Assign Registered Video Editor';
      } else if (entry.cameramanId) {
        workflowStage = 'SHOOTING';
      } else {
        workflowStage = 'UNASSIGNED';
        hasPendingAction = true;
        pendingActionText = 'Action Required: Assign Registered Cameraman';
      }

      return {
        id: entry.id,
        epicSequence: entry.epicSequence,
        epicCode,
        trade: entry.trade,
        topic: entry.topic,
        status: entry.status,
        createdAt: entry.createdAt.toISOString(),
        sme: entry.sme ? {
          id: entry.sme.id,
          name: entry.sme.name,
          designation: entry.sme.designation,
          institute: entry.sme.institute
        } : null,
        cameraman: entry.cameraman ? {
          id: entry.cameraman.id,
          name: entry.cameraman.name,
          email: entry.cameraman.email,
          status: entry.cameraman.status
        } : null,
        editor: entry.editor ? {
          id: entry.editor.id,
          name: entry.editor.name,
          email: entry.editor.email,
          status: entry.editor.status
        } : null,
        cameramanAssignedAt: entry.cameramanAssignedAt ? entry.cameramanAssignedAt.toISOString() : null,
        editorAssignedAt: entry.editorAssignedAt ? entry.editorAssignedAt.toISOString() : null,
        isPublished: Boolean(entry.isPublished),
        publishedAt: entry.publishedAt ? entry.publishedAt.toISOString() : null,
        publishedBy: entry.publishedBy || null,
        workflowStage,
        topics,
        totalTopics,
        completedShootingTopics,
        completedEditingTopics,
        notStartedEditingTopics,
        inProgressEditingTopics,
        hasPendingAction,
        pendingActionText
      };
    });

    const counts = {
      unassigned: workflowEpics.filter(e => e.workflowStage === 'UNASSIGNED').length,
      shooting: workflowEpics.filter(e => e.workflowStage === 'SHOOTING').length,
      readyForEditor: workflowEpics.filter(e => e.workflowStage === 'READY_FOR_EDITOR').length,
      editing: workflowEpics.filter(e => e.workflowStage === 'EDITING').length,
      completed: workflowEpics.filter(e => e.workflowStage === 'COMPLETED').length,
      published: workflowEpics.filter(e => e.workflowStage === 'PUBLISHED').length,
      total: workflowEpics.length
    };

    return {
      success: true,
      data: {
        counts,
        epics: workflowEpics,
        registeredCameramen: cameramen,
        registeredEditors: editors,
        recentNotifications: notifications
      }
    };
  } catch (error: any) {
    console.error('Error fetching production workflow dashboard data:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Assign Cameraman to an EPIC using registered User ID
 */
export async function assignCameramanToEpic(params: {
  epicId: string;
  cameramanUserId: string;
  sendNotification?: boolean;
}): Promise<{ success: boolean; message?: string; error?: string; notificationNotice?: string }> {
  const auth = await checkAuth(['ADMIN']);
  if (!auth.success) return auth;

  const adminEmail = await getEmail();

  try {
    const entry = await prisma.sMEWorkEntry.findUnique({
      where: { id: params.epicId },
      include: {
        sme: true,
        shootingSchedules: true,
        videoLibraries: true
      }
    });

    if (!entry) {
      return { success: false, error: 'Target EPIC record not found.' };
    }

    // Validate that selected user is an active registered CAMERAMAN
    const cameraman = await prisma.user.findUnique({
      where: { id: params.cameramanUserId }
    });

    if (!cameraman || cameraman.role !== 'CAMERAMAN' || cameraman.status !== 'ACTIVE') {
      return {
        success: false,
        error: 'Validation Error: Selected user must be an active registered Cameraman.'
      };
    }

    // Persist assignment
    await prisma.$transaction(async (tx: any) => {
      // 1. Update SMEWorkEntry with canonical cameramanId
      await tx.sMEWorkEntry.update({
        where: { id: entry.id },
        data: {
          cameramanId: cameraman.id,
          cameramanAssignedAt: new Date()
        }
      });

      // 2. Synchronize existing ShootingSchedules
      if (entry.shootingSchedules.length > 0) {
        await tx.shootingSchedule.updateMany({
          where: { workEntryId: entry.id },
          data: {
            cameramanId: cameraman.id,
            cameraman: cameraman.name || cameraman.email
          }
        });
      } else {
        // Create initial shooting schedules for each topic
        const topics = entry.videoLibraries.length > 0
          ? entry.videoLibraries.map((vl: any) => vl.title)
          : [entry.topic];

        for (let i = 0; i < topics.length; i++) {
          await tx.shootingSchedule.create({
            data: {
              workEntryId: entry.id,
              videoTitle: topics[i],
              cameramanId: cameraman.id,
              cameraman: cameraman.name || cameraman.email,
              status: 'Yet to Shoot'
            }
          });
        }
      }

      // 3. Log Audit
      await tx.auditLog.create({
        data: {
          action: 'ASSIGN_CAMERAMAN',
          entity: 'SME_WORK_ENTRY',
          entityId: entry.id,
          userId: cameraman.id,
          newData: JSON.stringify({
            epicSequence: entry.epicSequence,
            cameramanId: cameraman.id,
            cameramanName: cameraman.name,
            cameramanEmail: cameraman.email,
            assignedBy: adminEmail,
            timestamp: new Date().toISOString()
          })
        }
      });
    });

    let notifNotice = 'No notification requested.';
    if (params.sendNotification !== false && cameraman.email) {
      const notifRes = await queueNotification({
        epicId: entry.id,
        epicCode: formatEpicCode(entry.epicSequence),
        type: 'CAMERAMAN_ASSIGNMENT',
        recipientEmail: cameraman.email,
        recipientName: cameraman.name || 'Cameraman',
        subject: `[PM e-Vidya] Video Shooting Assignment — ${formatEpicCode(entry.epicSequence)} (${entry.trade})`,
        message: `Dear ${cameraman.name || 'Cameraman'},\n\nYou have been assigned to conduct video shooting for the following EPIC:\n\n• EPIC ID: ${formatEpicCode(entry.epicSequence)}\n• Trade: ${entry.trade}\n• SME / Resource Person: ${entry.sme?.name || 'SME'}\n• Primary Topic: ${entry.topic}\n\nPlease sign in to the PM e-Vidya Portal to access your shooting entry dashboard and enter shooting dates.\n\nPortal Link: https://pmevidyanimi.online/video-production?tab=SHOOTING_ENTRY`
      });
      notifNotice = notifRes.notice;
    }

    revalidatePath('/production-workflow');
    revalidatePath('/video-production');

    return {
      success: true,
      message: `EPIC-${entry.epicSequence} successfully assigned to Cameraman ${cameraman.name} (${cameraman.email}).`,
      notificationNotice: notifNotice
    };
  } catch (error: any) {
    console.error('Error assigning cameraman:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Assign Editor to an EPIC using registered User ID (Enforces all shooting completed first)
 */
export async function assignEditorToEpic(params: {
  epicId: string;
  editorUserId: string;
  sendNotification?: boolean;
}): Promise<{ success: boolean; message?: string; error?: string; notificationNotice?: string }> {
  const auth = await checkAuth(['ADMIN']);
  if (!auth.success) return auth;

  const adminEmail = await getEmail();

  try {
    const entry = await prisma.sMEWorkEntry.findUnique({
      where: { id: params.epicId },
      include: {
        sme: true,
        cameraman: true,
        shootingSchedules: true,
        videoEditorRecords: true,
        videoLibraries: true
      }
    });

    if (!entry) {
      return { success: false, error: 'Target EPIC record not found.' };
    }

    // Verify that all shooting schedules are marked Completed
    const schedules = entry.shootingSchedules;
    if (schedules.length === 0) {
      return {
        success: false,
        error: 'Validation Error: No shooting schedules found. Shooting must be completed before Editor assignment.'
      };
    }

    const uncompletedShoots = schedules.filter((s: any) =>
      (s.status || '').toLowerCase() !== 'completed'
    );

    if (uncompletedShoots.length > 0) {
      return {
        success: false,
        error: `Validation Error: Cannot assign Editor. ${uncompletedShoots.length} of ${schedules.length} shooting topics are not yet completed.`
      };
    }

    // Validate that selected user is an active registered EDITOR
    const editor = await prisma.user.findUnique({
      where: { id: params.editorUserId }
    });

    if (!editor || editor.role !== 'EDITOR' || editor.status !== 'ACTIVE') {
      return {
        success: false,
        error: 'Validation Error: Selected user must be an active registered Editor.'
      };
    }

    // Persist assignment
    await prisma.$transaction(async (tx: any) => {
      // 1. Update SMEWorkEntry with canonical editorId
      await tx.sMEWorkEntry.update({
        where: { id: entry.id },
        data: {
          editorId: editor.id,
          editorAssignedAt: new Date()
        }
      });

      // 2. Synchronize existing VideoEditorRecords
      if (entry.videoEditorRecords.length > 0) {
        await tx.videoEditorRecord.updateMany({
          where: { workEntryId: entry.id },
          data: {
            editorId: editor.id,
            editorName: editor.name || editor.email
          }
        });
      } else {
        // Create initial editor records for each topic
        const topics = entry.videoLibraries.length > 0
          ? entry.videoLibraries.map((vl: any) => vl.title)
          : schedules.map((s: any) => s.videoTitle || entry.topic);

        for (let i = 0; i < topics.length; i++) {
          await tx.videoEditorRecord.create({
            data: {
              workEntryId: entry.id,
              assignedVideo: topics[i],
              editorId: editor.id,
              editorName: editor.name || editor.email,
              status: 'Pending'
            }
          });
        }
      }

      // 3. Log Audit
      await tx.auditLog.create({
        data: {
          action: 'ASSIGN_EDITOR',
          entity: 'SME_WORK_ENTRY',
          entityId: entry.id,
          userId: editor.id,
          newData: JSON.stringify({
            epicSequence: entry.epicSequence,
            editorId: editor.id,
            editorName: editor.name,
            editorEmail: editor.email,
            assignedBy: adminEmail,
            timestamp: new Date().toISOString()
          })
        }
      });
    });

    let notifNotice = 'No notification requested.';
    if (params.sendNotification !== false && editor.email) {
      const notifRes = await queueNotification({
        epicId: entry.id,
        epicCode: formatEpicCode(entry.epicSequence),
        type: 'EDITOR_ASSIGNMENT',
        recipientEmail: editor.email,
        recipientName: editor.name || 'Editor',
        subject: `[PM e-Vidya] Post-Production Assignment — ${formatEpicCode(entry.epicSequence)} (${entry.trade})`,
        message: `Dear ${editor.name || 'Editor'},\n\nYou have been assigned to edit the recorded video footage for the following completed shoot:\n\n• EPIC ID: ${formatEpicCode(entry.epicSequence)}\n• Trade: ${entry.trade}\n• SME: ${entry.sme?.name || 'SME'}\n• Cameraman: ${entry.cameraman?.name || 'Cameraman'}\n• Primary Topic: ${entry.topic}\n\nPlease sign in to the PM e-Vidya Portal to access your Post-Production workspace and submit the final video links.\n\nPortal Link: https://pmevidyanimi.online/video-production?tab=POST_PRODUCTION_ENTRY`
      });
      notifNotice = notifRes.notice;
    }

    revalidatePath('/production-workflow');
    revalidatePath('/video-production');

    return {
      success: true,
      message: `EPIC-${entry.epicSequence} successfully assigned to Editor ${editor.name} (${editor.email}).`,
      notificationNotice: notifNotice
    };
  } catch (error: any) {
    console.error('Error assigning editor:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Publish Completed EPIC to Video Content Library
 */
export async function publishEpicToLibrary(params: {
  epicId: string;
}): Promise<{ success: boolean; message?: string; error?: string }> {
  const auth = await checkAuth(['ADMIN']);
  if (!auth.success) return auth;

  const adminEmail = await getEmail();

  try {
    const entry = await prisma.sMEWorkEntry.findUnique({
      where: { id: params.epicId },
      include: {
        sme: true,
        cameraman: true,
        editor: true,
        shootingSchedules: true,
        videoEditorRecords: true,
        videoLibraries: true,
        finalVideoRecords: true
      }
    });

    if (!entry) {
      return { success: false, error: 'Target EPIC record not found.' };
    }

    // Idempotency: If already published, confirm status
    if (entry.isPublished) {
      return {
        success: true,
        message: `EPIC-${entry.epicSequence} is already published in the Video Content Library.`
      };
    }

    // Validate that all post-production editor records are completed with final links
    const editorRecs = entry.videoEditorRecords;
    if (editorRecs.length === 0) {
      return {
        success: false,
        error: 'Validation Error: No editing records found. Video editing must be completed before publication.'
      };
    }

    const incompleteEdits = editorRecs.filter((e: any) => {
      const s = (e.status || '').toLowerCase().trim();
      const isCompleted = s.startsWith('completed') || s === 'na' || s === 'received';
      const matchingLib = entry.videoLibraries.find((vl: any) =>
        vl.id === e.id.replace(/^ed-/, '') ||
        vl.title.trim().toLowerCase() === (e.assignedVideo || entry.topic).trim().toLowerCase()
      );
      const hasLink = Boolean(e.finalVideoFile || e.finalCutLink || matchingLib?.videoLink);
      return !isCompleted || !hasLink;
    });

    if (incompleteEdits.length > 0) {
      return {
        success: false,
        error: `Validation Error: Cannot publish. ${incompleteEdits.length} of ${editorRecs.length} topics are missing completion status or final video links.`
      };
    }

    await prisma.$transaction(async (tx: any) => {
      // 1. Mark SMEWorkEntry as published
      await tx.sMEWorkEntry.update({
        where: { id: entry.id },
        data: {
          isPublished: true,
          publishedAt: new Date(),
          publishedBy: adminEmail || 'Admin',
          status: 'COMPLETED'
        }
      });

      // 2. Ensure each deliverable is synchronized into VideoLibrary
      for (const ed of editorRecs) {
        const topicTitle = ed.assignedVideo || entry.topic;
        const matchingLib = entry.videoLibraries.find((vl: any) =>
          vl.id === ed.id.replace(/^ed-/, '') ||
          vl.title.trim().toLowerCase() === topicTitle.trim().toLowerCase()
        );

        if (matchingLib) {
          await tx.videoLibrary.update({
            where: { id: matchingLib.id },
            data: {
              epicId: entry.id,
              videoLink: ed.finalVideoFile || matchingLib.videoLink,
              duration: ed.duration || matchingLib.duration,
              smeName: entry.sme?.name || matchingLib.smeName,
              trade: entry.trade || matchingLib.trade
            }
          });
        } else {
          await tx.videoLibrary.create({
            data: {
              epicId: entry.id,
              title: topicTitle,
              smeName: entry.sme?.name || 'SME',
              trade: entry.trade || 'General',
              duration: ed.duration || null,
              videoLink: ed.finalVideoFile || ''
            }
          });
        }
      }

      // 3. Mark FinalVideoRecord approved
      await tx.finalVideoRecord.upsert({
        where: { workEntryId: entry.id },
        update: {
          finalVideoStatus: 'APPROVED',
          finalApproval: 'Admin Approved',
          approvalDate: new Date(),
          telecastStatus: 'READY_TO_BROADCAST'
        },
        create: {
          workEntryId: entry.id,
          finalVideoStatus: 'APPROVED',
          finalApproval: 'Admin Approved',
          approvalDate: new Date(),
          telecastStatus: 'READY_TO_BROADCAST',
          telecastEpisode: `EP-${entry.epicSequence}`,
          telecastChannel: 'PM eVidya Channel'
        }
      });

      // 4. Log Audit
      await tx.auditLog.create({
        data: {
          action: 'PUBLISH_TO_LIBRARY',
          entity: 'SME_WORK_ENTRY',
          entityId: entry.id,
          newData: JSON.stringify({
            epicSequence: entry.epicSequence,
            publishedBy: adminEmail,
            totalVideos: editorRecs.length,
            timestamp: new Date().toISOString()
          })
        }
      });
    });

    // Queue Publication Notification
    await queueNotification({
      epicId: entry.id,
      epicCode: formatEpicCode(entry.epicSequence),
      type: 'LIBRARY_PUBLISHED',
      recipientEmail: adminEmail || 'admin@nimi.org',
      recipientName: 'Administrator',
      subject: `[PM e-Vidya] Published to Video Library — ${formatEpicCode(entry.epicSequence)} (${entry.trade})`,
      message: `EPIC ${formatEpicCode(entry.epicSequence)} has been successfully reviewed and published to the Video Content Library.\n\n• SME: ${entry.sme?.name || 'SME'}\n• Trade: ${entry.trade}\n• Cameraman: ${entry.cameraman?.name || 'Cameraman'}\n• Editor: ${entry.editor?.name || 'Editor'}\n• Published Videos: ${editorRecs.length}\n\nView Library: https://pmevidyanimi.online/content`
    });

    revalidatePath('/content');
    revalidatePath('/production-workflow');
    revalidatePath('/video-production');

    return {
      success: true,
      message: `${formatEpicCode(entry.epicSequence)} published to Video Content Library successfully!`
    };
  } catch (error: any) {
    console.error('Error publishing to library:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Retry sending an existing notification from Outbox
 */
export async function retryNotificationAction(notificationId: string) {
  const auth = await checkAuth(['ADMIN']);
  if (!auth.success) return auth;

  return await retryNotification(notificationId);
}
