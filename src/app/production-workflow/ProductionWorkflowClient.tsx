"use client";

import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import styles from './workflow.module.css';
import {
  DashboardWorkflowData,
  WorkflowEpicItem,
  getProductionWorkflowDashboardData,
  assignCameramanToEpic,
  assignEditorToEpic,
  assignCameramanToVideo,
  assignEditorToVideo,
  publishEpicToLibrary,
  retryNotificationAction,
  reviewEditorSubmission
} from './actions';

type TopicItem = WorkflowEpicItem['topics'][0];

export default function ProductionWorkflowClient({
  initialData,
  role
}: {
  initialData: DashboardWorkflowData;
  role: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [data, setData] = useState<DashboardWorkflowData>(initialData);
  const [loading, setLoading] = useState(false);
  const [notificationToast, setNotificationToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Tabs: ALL, UNASSIGNED, SHOOTING, READY_FOR_EDITOR, EDITING, SUBMITTED, REVISION_REQUIRED, APPROVED, COMPLETED, PUBLISHED
  const tabParam = (searchParams.get('tab') || '').toUpperCase();
  const [activeTab, setActiveTab] = useState<string>(
    tabParam === 'UNASSIGNED' ? 'UNASSIGNED' :
    tabParam === 'SHOOTING' ? 'SHOOTING' :
    tabParam === 'READY_FOR_EDITOR' ? 'READY_FOR_EDITOR' :
    tabParam === 'EDITING' ? 'EDITING' :
    tabParam === 'COMPLETED' ? 'COMPLETED' :
    tabParam === 'PUBLISHED' ? 'PUBLISHED' : 'ALL'
  );

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTrade, setSelectedTrade] = useState('ALL');

  // Level 2 Expansion State (supports expanding one or multiple EPICs)
  const [expandedEpicId, setExpandedEpicId] = useState<string | null>(null);

  // Modals - EPIC Level
  const [cameramanModalOpen, setCameramanModalOpen] = useState(false);
  const [editorModalOpen, setEditorModalOpen] = useState(false);
  const [publishModalOpen, setPublishModalOpen] = useState(false);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [notificationsModalOpen, setNotificationsModalOpen] = useState(false);

  // Modals - Video Level
  const [videoCamModalOpen, setVideoCamModalOpen] = useState(false);
  const [videoEdModalOpen, setVideoEdModalOpen] = useState(false);
  const [timelineModalOpen, setTimelineModalOpen] = useState(false);
  const [targetTopicItem, setTargetTopicItem] = useState<{ epic: WorkflowEpicItem; topic: TopicItem } | null>(null);

  // Admin Review / Revision Modal
  const [revisionModalOpen, setRevisionModalOpen] = useState(false);
  const [revisionTarget, setRevisionTarget] = useState<{ workEntryId: string; videoId: string; title: string } | null>(null);
  const [revisionComments, setRevisionComments] = useState('');

  const [targetEpic, setTargetEpic] = useState<WorkflowEpicItem | null>(null);

  // User Selection States (Cameramen & Editors)
  const [cameramanSearch, setCameramanSearch] = useState('');
  const [selectedCameramanId, setSelectedCameramanId] = useState('');
  const [cameramanSendEmail, setCameramanSendEmail] = useState(true);

  const [editorSearch, setEditorSearch] = useState('');
  const [selectedEditorId, setSelectedEditorId] = useState('');
  const [editorSendEmail, setEditorSendEmail] = useState(true);

  const [actionLoading, setActionLoading] = useState(false);

  // Date Formatter Helper (DD.MM.YYYY matching executive portal style)
  const formatDate = (isoString?: string | null): string => {
    if (!isoString) return '—';
    try {
      const d = new Date(isoString);
      if (isNaN(d.getTime())) return '—';
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      return `${day}.${month}.${year}`;
    } catch {
      return '—';
    }
  };

  const formatDateTime = (isoString?: string | null): string => {
    if (!isoString) return '—';
    try {
      const d = new Date(isoString);
      if (isNaN(d.getTime())) return '—';
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      const hours = String(d.getHours()).padStart(2, '0');
      const mins = String(d.getMinutes()).padStart(2, '0');
      return `${day}.${month}.${year} ${hours}:${mins}`;
    } catch {
      return '—';
    }
  };

  // Refresh data from server
  const handleRefresh = async () => {
    setLoading(true);
    try {
      const res = await getProductionWorkflowDashboardData();
      if (res.success && res.data) {
        setData(res.data);
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Distinct trades for filter dropdown
  const tradesList = useMemo(() => {
    const set = new Set<string>();
    data.epics.forEach(e => {
      if (e.trade) set.add(e.trade);
    });
    return Array.from(set).sort();
  }, [data.epics]);

  // Dynamic counts for all filter tabs
  const tabCounts = useMemo(() => {
    const total = data.epics.length;
    const unassigned = data.epics.filter(e => e.workflowStage === 'UNASSIGNED').length;
    const shooting = data.epics.filter(e => e.workflowStage === 'SHOOTING').length;
    const readyForEditor = data.epics.filter(e => e.workflowStage === 'READY_FOR_EDITOR').length;
    const editing = data.epics.filter(e => e.workflowStage === 'EDITING').length;
    const completed = data.epics.filter(e => e.workflowStage === 'COMPLETED').length;
    const published = data.epics.filter(e => e.workflowStage === 'PUBLISHED').length;
    const submitted = data.epics.filter(e =>
      e.topics.some(t => t.submissionStatus === 'Submitted – Awaiting Admin Approval')
    ).length;
    const revisionRequired = data.epics.filter(e =>
      e.topics.some(t => t.submissionStatus === 'Revision Required')
    ).length;
    const approved = data.epics.filter(e =>
      e.topics.some(t => t.submissionStatus === 'Admin Approved')
    ).length;

    return { total, unassigned, shooting, readyForEditor, editing, completed, published, submitted, revisionRequired, approved };
  }, [data.epics]);

  // Filtered EPICs
  const filteredEpics = useMemo(() => {
    return data.epics.filter(e => {
      // Tab filter
      if (activeTab === 'UNASSIGNED' && e.workflowStage !== 'UNASSIGNED') return false;
      if (activeTab === 'SHOOTING' && e.workflowStage !== 'SHOOTING') return false;
      if (activeTab === 'READY_FOR_EDITOR' && e.workflowStage !== 'READY_FOR_EDITOR') return false;
      if (activeTab === 'EDITING' && e.workflowStage !== 'EDITING') return false;
      if (activeTab === 'COMPLETED' && e.workflowStage !== 'COMPLETED') return false;
      if (activeTab === 'PUBLISHED' && e.workflowStage !== 'PUBLISHED') return false;
      if (activeTab === 'SUBMITTED' && !e.topics.some(t => t.submissionStatus === 'Submitted – Awaiting Admin Approval')) return false;
      if (activeTab === 'REVISION_REQUIRED' && !e.topics.some(t => t.submissionStatus === 'Revision Required')) return false;
      if (activeTab === 'APPROVED' && !e.topics.some(t => t.submissionStatus === 'Admin Approved')) return false;

      // Trade filter
      if (selectedTrade !== 'ALL' && e.trade !== selectedTrade) return false;

      // Search term filter
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase().trim();
        const matchCode = e.epicCode.toLowerCase().includes(q);
        const matchTopic = (e.topic || '').toLowerCase().includes(q);
        const matchSme = (e.sme?.name || '').toLowerCase().includes(q);
        const matchTrade = (e.trade || '').toLowerCase().includes(q);
        const matchCam = (e.cameraman?.name || '').toLowerCase().includes(q) || e.topics.some(t => (t.cameraman || '').toLowerCase().includes(q));
        const matchEd = (e.editor?.name || '').toLowerCase().includes(q) || e.topics.some(t => (t.editor || '').toLowerCase().includes(q));
        const matchSubtopic = e.topics.some(t => t.title.toLowerCase().includes(q) || t.id.toLowerCase().includes(q));
        if (!matchCode && !matchTopic && !matchSme && !matchTrade && !matchCam && !matchEd && !matchSubtopic) {
          return false;
        }
      }

      return true;
    });
  }, [data.epics, activeTab, selectedTrade, searchTerm]);

  // Search-filtered registered Cameramen
  const filteredCameramen = useMemo(() => {
    if (!cameramanSearch.trim()) return data.registeredCameramen;
    const q = cameramanSearch.toLowerCase().trim();
    return data.registeredCameramen.filter(c =>
      (c.name || '').toLowerCase().includes(q) || c.email.toLowerCase().includes(q)
    );
  }, [data.registeredCameramen, cameramanSearch]);

  // Search-filtered registered Editors
  const filteredEditors = useMemo(() => {
    if (!editorSearch.trim()) return data.registeredEditors;
    const q = editorSearch.toLowerCase().trim();
    return data.registeredEditors.filter(e =>
      (e.name || '').toLowerCase().includes(q) || e.email.toLowerCase().includes(q)
    );
  }, [data.registeredEditors, editorSearch]);

  // Helpers to test topic progress
  const isTopicShootingDone = (t: TopicItem) => {
    const s = (t.shootingStatus || '').toLowerCase();
    return s.includes('completed') || s.includes('received');
  };

  const isTopicEditingDone = (t: TopicItem) => {
    const e = (t.editingStatus || '').toLowerCase();
    const s = (t.shootingStatus || '').toLowerCase();
    const hasLink = Boolean(t.finalVideoLink);
    if (hasLink && (e === 'completed' || e.startsWith('completed') || e === 'na' || e === 'received' || s.includes('received'))) {
      return true;
    }
    return e === 'completed' && hasLink;
  };

  // ==========================================
  // ACTION HANDLERS
  // ==========================================

  // 1. Admin Approve Deliverable
  const handleApproveSubmission = async (workEntryId: string, videoId: string) => {
    setActionLoading(true);
    try {
      const res = await reviewEditorSubmission({
        workEntryId,
        videoId,
        action: 'APPROVE'
      });
      if (res.success) {
        setNotificationToast({ type: 'success', message: res.message || 'Submission approved successfully!' });
        await handleRefresh();
      } else {
        setNotificationToast({ type: 'error', message: res.error || 'Failed to approve.' });
      }
    } catch (err: any) {
      setNotificationToast({ type: 'error', message: err.message });
    } finally {
      setActionLoading(false);
    }
  };

  // 2. Open Revision Modal
  const handleOpenRevisionModal = (workEntryId: string, videoId: string, title: string) => {
    setRevisionTarget({ workEntryId, videoId, title });
    setRevisionComments('');
    setRevisionModalOpen(true);
  };

  // 3. Submit Revision Request
  const handleSubmitRevision = async () => {
    if (!revisionTarget) return;
    if (!revisionComments.trim()) {
      alert('Please enter correction remarks explaining what needs revision.');
      return;
    }
    setActionLoading(true);
    try {
      const res = await reviewEditorSubmission({
        workEntryId: revisionTarget.workEntryId,
        videoId: revisionTarget.videoId,
        action: 'REQUEST_REVISION',
        adminComments: revisionComments.trim()
      });
      if (res.success) {
        setNotificationToast({ type: 'success', message: res.message || 'Revision requested from Editor.' });
        setRevisionModalOpen(false);
        await handleRefresh();
      } else {
        setNotificationToast({ type: 'error', message: res.error || 'Failed to request revision.' });
      }
    } catch (err: any) {
      setNotificationToast({ type: 'error', message: err.message });
    } finally {
      setActionLoading(false);
    }
  };

  // 4. Open Video-Wise Cameraman Assignment Modal
  const handleOpenAssignCameramanVideo = (epic: WorkflowEpicItem, topic: TopicItem) => {
    setTargetTopicItem({ epic, topic });
    setSelectedCameramanId(topic.cameramanId || epic.cameraman?.id || '');
    setCameramanSearch('');
    setCameramanSendEmail(true);
    setVideoCamModalOpen(true);
  };

  // 5. Submit Video-Wise Cameraman Assignment
  const handleSaveVideoCameraman = async () => {
    if (!targetTopicItem) return;
    if (!selectedCameramanId) {
      alert('Please select an active registered Cameraman from the list.');
      return;
    }

    setActionLoading(true);
    try {
      const res = await assignCameramanToVideo({
        workEntryId: targetTopicItem.epic.id,
        videoId: targetTopicItem.topic.id,
        cameramanUserId: selectedCameramanId,
        sendNotification: cameramanSendEmail
      });

      if (res.success) {
        setNotificationToast({
          type: 'success',
          message: `${res.message} ${res.notificationNotice ? `(${res.notificationNotice})` : ''}`
        });
        setVideoCamModalOpen(false);
        await handleRefresh();
      } else {
        setNotificationToast({ type: 'error', message: res.error || 'Failed to assign Cameraman.' });
      }
    } catch (err: any) {
      setNotificationToast({ type: 'error', message: err.message || 'Error assigning Cameraman.' });
    } finally {
      setActionLoading(false);
    }
  };

  // 6. Open Video-Wise Editor Assignment Modal
  const handleOpenAssignEditorVideo = (epic: WorkflowEpicItem, topic: TopicItem) => {
    if (!isTopicShootingDone(topic)) {
      alert(`Validation Notice: Shooting for topic "${topic.title}" is currently "${topic.shootingStatus}". Shooting must be completed before assigning an Editor.`);
      return;
    }
    setTargetTopicItem({ epic, topic });
    setSelectedEditorId(topic.editorId || epic.editor?.id || '');
    setEditorSearch('');
    setEditorSendEmail(true);
    setVideoEdModalOpen(true);
  };

  // 7. Submit Video-Wise Editor Assignment
  const handleSaveVideoEditor = async () => {
    if (!targetTopicItem) return;
    if (!selectedEditorId) {
      alert('Please select an active registered Editor from the list.');
      return;
    }

    setActionLoading(true);
    try {
      const res = await assignEditorToVideo({
        workEntryId: targetTopicItem.epic.id,
        videoId: targetTopicItem.topic.id,
        editorUserId: selectedEditorId,
        sendNotification: editorSendEmail
      });

      if (res.success) {
        setNotificationToast({
          type: 'success',
          message: `${res.message} ${res.notificationNotice ? `(${res.notificationNotice})` : ''}`
        });
        setVideoEdModalOpen(false);
        await handleRefresh();
      } else {
        setNotificationToast({ type: 'error', message: res.error || 'Failed to assign Editor.' });
      }
    } catch (err: any) {
      setNotificationToast({ type: 'error', message: err.message || 'Error assigning Editor.' });
    } finally {
      setActionLoading(false);
    }
  };

  // 8. Open Production Timeline Modal
  const handleOpenTimeline = (epic: WorkflowEpicItem, topic: TopicItem) => {
    setTargetTopicItem({ epic, topic });
    setTimelineModalOpen(true);
  };

  // 9. Open EPIC-Level Assign Cameraman
  const handleOpenAssignCameramanEpic = (epic: WorkflowEpicItem) => {
    setTargetEpic(epic);
    setSelectedCameramanId(epic.cameraman?.id || '');
    setCameramanSearch('');
    setCameramanSendEmail(true);
    setCameramanModalOpen(true);
  };

  // 10. Submit EPIC-Level Cameraman Assignment
  const handleSaveCameramanEpic = async () => {
    if (!targetEpic) return;
    if (!selectedCameramanId) {
      alert('Please select an active registered Cameraman from the list.');
      return;
    }

    setActionLoading(true);
    try {
      const res = await assignCameramanToEpic({
        epicId: targetEpic.id,
        cameramanUserId: selectedCameramanId,
        sendNotification: cameramanSendEmail
      });

      if (res.success) {
        setNotificationToast({
          type: 'success',
          message: `${res.message} ${res.notificationNotice ? `(${res.notificationNotice})` : ''}`
        });
        setCameramanModalOpen(false);
        await handleRefresh();
      } else {
        setNotificationToast({ type: 'error', message: res.error || 'Failed to assign Cameraman.' });
      }
    } catch (err: any) {
      setNotificationToast({ type: 'error', message: err.message || 'Error assigning Cameraman.' });
    } finally {
      setActionLoading(false);
    }
  };

  // 11. Open EPIC-Level Assign Editor
  const handleOpenAssignEditorEpic = (epic: WorkflowEpicItem) => {
    if (epic.completedShootingTopics < epic.totalTopics && epic.totalTopics > 0) {
      alert(`Validation Notice: Cannot assign Editor to EPIC. Only ${epic.completedShootingTopics} of ${epic.totalTopics} shooting topics are completed.`);
      return;
    }
    setTargetEpic(epic);
    setSelectedEditorId(epic.editor?.id || '');
    setEditorSearch('');
    setEditorSendEmail(true);
    setEditorModalOpen(true);
  };

  // 12. Submit EPIC-Level Editor Assignment
  const handleSaveEditorEpic = async () => {
    if (!targetEpic) return;
    if (!selectedEditorId) {
      alert('Please select an active registered Editor from the list.');
      return;
    }

    setActionLoading(true);
    try {
      const res = await assignEditorToEpic({
        epicId: targetEpic.id,
        editorUserId: selectedEditorId,
        sendNotification: editorSendEmail
      });

      if (res.success) {
        setNotificationToast({
          type: 'success',
          message: `${res.message} ${res.notificationNotice ? `(${res.notificationNotice})` : ''}`
        });
        setEditorModalOpen(false);
        await handleRefresh();
      } else {
        setNotificationToast({ type: 'error', message: res.error || 'Failed to assign Editor.' });
      }
    } catch (err: any) {
      setNotificationToast({ type: 'error', message: err.message || 'Error assigning Editor.' });
    } finally {
      setActionLoading(false);
    }
  };

  // 13. Submit Publish to Library
  const handlePublish = async () => {
    if (!targetEpic) return;
    setActionLoading(true);
    try {
      const res = await publishEpicToLibrary({ epicId: targetEpic.id });
      if (res.success) {
        setNotificationToast({ type: 'success', message: res.message || 'Published to Video Content Library successfully!' });
        setPublishModalOpen(false);
        await handleRefresh();
      } else {
        setNotificationToast({ type: 'error', message: res.error || 'Failed to publish to library.' });
      }
    } catch (err: any) {
      setNotificationToast({ type: 'error', message: err.message || 'Error publishing to library.' });
    } finally {
      setActionLoading(false);
    }
  };

  // 14. Retry Notification Action
  const handleRetryNotification = async (notifId: string) => {
    setActionLoading(true);
    try {
      const res = await retryNotificationAction(notifId);
      if (res.success) {
        setNotificationToast({ type: 'success', message: (res as any).notice || (res as any).message || 'Notification re-dispatched.' });
        await handleRefresh();
      } else {
        setNotificationToast({ type: 'error', message: (res as any).notice || (res as any).error || 'Retry failed.' });
      }
    } catch (err: any) {
      setNotificationToast({ type: 'error', message: err.message });
    } finally {
      setActionLoading(false);
    }
  };

  // Auto-clear notification toast
  useEffect(() => {
    if (notificationToast) {
      const timer = setTimeout(() => setNotificationToast(null), 6000);
      return () => clearTimeout(timer);
    }
  }, [notificationToast]);

  return (
    <div className={styles.container}>
      {/* Toast Notification */}
      {notificationToast && (
        <div 
          style={{
            position: 'fixed',
            top: '20px',
            right: '24px',
            zIndex: 9999,
            padding: '14px 20px',
            borderRadius: '8px',
            backgroundColor: notificationToast.type === 'success' ? '#065f46' : '#991b1b',
            color: '#ffffff',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.2)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            fontSize: '13.5px',
            fontWeight: 600,
            maxWidth: '480px'
          }}
        >
          <span>{notificationToast.type === 'success' ? '✅' : '⚠️'}</span>
          <span>{notificationToast.message}</span>
          <button 
            onClick={() => setNotificationToast(null)}
            style={{ background: 'transparent', border: 'none', color: '#ffffff', cursor: 'pointer', fontSize: '14px', marginLeft: 'auto' }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Header */}
      <div className={styles.header}>
        <div className={styles.titleArea}>
          <h1>🎬 Production Workflow &amp; Work Assignment</h1>
          <p>
            Executive Production Management · Two-Level Workload Monitoring: EPIC Summary &amp; Video-Wise Assignment Lifecycle
          </p>
        </div>
        <div className={styles.headerActions}>
          <button 
            className={styles.btnSecondary}
            onClick={() => setNotificationsModalOpen(true)}
            title="View Durable Notification Outbox"
          >
            <span>✉️</span>
            <span>Notification Queue</span>
          </button>
          <Link href="/video-production" className={styles.btnSecondary} title="Open 16-Column Video Production Tracker">
            <span>📊</span>
            <span>Overall Tracker</span>
          </Link>
          <button 
            className={styles.btnPrimary}
            onClick={handleRefresh}
            disabled={loading}
          >
            <span>🔄</span>
            <span>{loading ? 'Refreshing...' : 'Refresh Live Data'}</span>
          </button>
        </div>
      </div>

      {/* Single Source of Truth Notice Banner */}
      <div className={styles.noticeBanner}>
        <span>ℹ️</span>
        <div>
          <strong>Executive Production Overview:</strong> All video topics remain managed and monitored here through field shooting and post-production editing. Assignments can be managed individually per video topic or at the EPIC level. Deliverables synchronize live into the Video Content Library upon Admin publication.
        </div>
      </div>

      {/* KPI Cards (6 Live Database-Derived Metrics) */}
      <div className={styles.kpiGrid}>
        {/* 1. Unassigned */}
        <div 
          className={`${styles.kpiCard} ${styles.kpiCardUnassigned} ${activeTab === 'UNASSIGNED' ? styles.kpiCardActive : ''}`}
          onClick={() => setActiveTab(activeTab === 'UNASSIGNED' ? 'ALL' : 'UNASSIGNED')}
        >
          <div className={styles.kpiLabel}>
            <span>Unassigned EPICs</span>
            <span>⏳</span>
          </div>
          <div className={styles.kpiValue} style={{ color: '#dc2626' }}>
            {data.counts.unassigned}
          </div>
          <div className={styles.kpiSubtext}>Awaiting Cameraman Assignment</div>
        </div>

        {/* 2. Shooting in Progress */}
        <div 
          className={`${styles.kpiCard} ${styles.kpiCardShooting} ${activeTab === 'SHOOTING' ? styles.kpiCardActive : ''}`}
          onClick={() => setActiveTab(activeTab === 'SHOOTING' ? 'ALL' : 'SHOOTING')}
        >
          <div className={styles.kpiLabel}>
            <span>Shooting in Progress</span>
            <span>🎥</span>
          </div>
          <div className={styles.kpiValue} style={{ color: '#0284c7' }}>
            {data.counts.shooting}
          </div>
          <div className={styles.kpiSubtext}>Active Cameraman Field Shoots</div>
        </div>

        {/* 3. Ready for Editor */}
        <div 
          className={`${styles.kpiCard} ${styles.kpiCardReadyEditor} ${activeTab === 'READY_FOR_EDITOR' ? styles.kpiCardActive : ''}`}
          onClick={() => setActiveTab(activeTab === 'READY_FOR_EDITOR' ? 'ALL' : 'READY_FOR_EDITOR')}
        >
          <div className={styles.kpiLabel}>
            <span>Ready for Editor</span>
            <span>✂️</span>
          </div>
          <div className={styles.kpiValue} style={{ color: '#8b5cf6' }}>
            {data.counts.readyForEditor}
          </div>
          <div className={styles.kpiSubtext}>Shooting Complete — Assign Editor</div>
        </div>

        {/* 4. Editing in Progress */}
        <div 
          className={`${styles.kpiCard} ${styles.kpiCardEditing} ${activeTab === 'EDITING' ? styles.kpiCardActive : ''}`}
          onClick={() => setActiveTab(activeTab === 'EDITING' ? 'ALL' : 'EDITING')}
        >
          <div className={styles.kpiLabel}>
            <span>Editing in Progress</span>
            <span>💻</span>
          </div>
          <div className={styles.kpiValue} style={{ color: '#d97706' }}>
            {data.counts.editing}
          </div>
          <div className={styles.kpiSubtext}>Post-Production Cutting &amp; Finalizing</div>
        </div>

        {/* 5. Completed / Ready to Publish */}
        <div 
          className={`${styles.kpiCard} ${styles.kpiCardCompleted} ${activeTab === 'COMPLETED' ? styles.kpiCardActive : ''}`}
          onClick={() => setActiveTab(activeTab === 'COMPLETED' ? 'ALL' : 'COMPLETED')}
        >
          <div className={styles.kpiLabel}>
            <span>Completed EPICs</span>
            <span>🏆</span>
          </div>
          <div className={styles.kpiValue} style={{ color: '#059669' }}>
            {data.counts.completed}
          </div>
          <div className={styles.kpiSubtext}>Ready for Final Library Review</div>
        </div>

        {/* 6. Published */}
        <div 
          className={`${styles.kpiCard} ${styles.kpiCardPublished} ${activeTab === 'PUBLISHED' ? styles.kpiCardActive : ''}`}
          onClick={() => setActiveTab(activeTab === 'PUBLISHED' ? 'ALL' : 'PUBLISHED')}
        >
          <div className={styles.kpiLabel}>
            <span>Published in Library</span>
            <span>📼</span>
          </div>
          <div className={styles.kpiValue} style={{ color: '#047857' }}>
            {data.counts.published}
          </div>
          <div className={styles.kpiSubtext}>Live in Video Content Library</div>
        </div>
      </div>

      {/* Stage Navigation Tabs with Detailed Sub-Filters */}
      <div className={styles.tabNav}>
        <button 
          className={`${styles.tabBtn} ${activeTab === 'ALL' ? styles.tabBtnActive : ''}`}
          onClick={() => setActiveTab('ALL')}
        >
          <span>All EPICs</span>
          <span className={styles.tabBadge}>{tabCounts.total}</span>
        </button>
        <button 
          className={`${styles.tabBtn} ${activeTab === 'UNASSIGNED' ? styles.tabBtnActive : ''}`}
          onClick={() => setActiveTab('UNASSIGNED')}
        >
          <span>⏳ Unassigned</span>
          <span className={styles.tabBadge} style={{ backgroundColor: '#fee2e2', color: '#b91c1c' }}>
            {tabCounts.unassigned}
          </span>
        </button>
        <button 
          className={`${styles.tabBtn} ${activeTab === 'SHOOTING' ? styles.tabBtnActive : ''}`}
          onClick={() => setActiveTab('SHOOTING')}
        >
          <span>🎥 Shooting</span>
          <span className={styles.tabBadge}>{tabCounts.shooting}</span>
        </button>
        <button 
          className={`${styles.tabBtn} ${activeTab === 'READY_FOR_EDITOR' ? styles.tabBtnActive : ''}`}
          onClick={() => setActiveTab('READY_FOR_EDITOR')}
        >
          <span>✂️ Ready for Editor</span>
          <span className={styles.tabBadge} style={{ backgroundColor: '#ede9fe', color: '#6d28d9' }}>
            {tabCounts.readyForEditor}
          </span>
        </button>
        <button 
          className={`${styles.tabBtn} ${activeTab === 'EDITING' ? styles.tabBtnActive : ''}`}
          onClick={() => setActiveTab('EDITING')}
        >
          <span>💻 Editing</span>
          <span className={styles.tabBadge}>{tabCounts.editing}</span>
        </button>
        <button 
          className={`${styles.tabBtn} ${activeTab === 'SUBMITTED' ? styles.tabBtnActive : ''}`}
          onClick={() => setActiveTab('SUBMITTED')}
          title="EPICs with topics submitted awaiting Admin review"
        >
          <span>📤 Submitted for Approval</span>
          <span className={styles.tabBadge} style={{ backgroundColor: '#f3e8ff', color: '#6b21a8' }}>
            {tabCounts.submitted}
          </span>
        </button>
        <button 
          className={`${styles.tabBtn} ${activeTab === 'REVISION_REQUIRED' ? styles.tabBtnActive : ''}`}
          onClick={() => setActiveTab('REVISION_REQUIRED')}
          title="EPICs with topics requiring editor corrections"
        >
          <span>⚠️ Revision Required</span>
          <span className={styles.tabBadge} style={{ backgroundColor: '#fee2e2', color: '#991b1b' }}>
            {tabCounts.revisionRequired}
          </span>
        </button>
        <button 
          className={`${styles.tabBtn} ${activeTab === 'APPROVED' ? styles.tabBtnActive : ''}`}
          onClick={() => setActiveTab('APPROVED')}
          title="EPICs with topics approved by Admin"
        >
          <span>✓ Approved</span>
          <span className={styles.tabBadge} style={{ backgroundColor: '#dcfce7', color: '#166534' }}>
            {tabCounts.approved}
          </span>
        </button>
        <button 
          className={`${styles.tabBtn} ${activeTab === 'COMPLETED' ? styles.tabBtnActive : ''}`}
          onClick={() => setActiveTab('COMPLETED')}
        >
          <span>🏆 Completed</span>
          <span className={styles.tabBadge}>{tabCounts.completed}</span>
        </button>
        <button 
          className={`${styles.tabBtn} ${activeTab === 'PUBLISHED' ? styles.tabBtnActive : ''}`}
          onClick={() => setActiveTab('PUBLISHED')}
        >
          <span>📼 Published</span>
          <span className={styles.tabBadge}>{tabCounts.published}</span>
        </button>
      </div>

      {/* Toolbar: Search and Filter */}
      <div className={styles.toolbar}>
        <div className={styles.searchGroup}>
          <span>🔍</span>
          <input 
            type="text"
            className={styles.searchInput}
            placeholder="Search EPIC ID, video topic title, SME, trade, cameraman, editor..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button 
              onClick={() => setSearchTerm('')}
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#94a3b8' }}
            >
              ✕
            </button>
          )}
        </div>

        <div className={styles.filterGroup}>
          <select 
            className={styles.selectInput}
            value={selectedTrade}
            onChange={(e) => setSelectedTrade(e.target.value)}
          >
            <option value="ALL">All Trades ({tradesList.length})</option>
            {tradesList.map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>

          {(searchTerm || selectedTrade !== 'ALL' || activeTab !== 'ALL') && (
            <button 
              className={styles.btnSecondary}
              style={{ padding: '0 12px', height: '38px' }}
              onClick={() => {
                setSearchTerm('');
                setSelectedTrade('ALL');
                setActiveTab('ALL');
              }}
            >
              <span>↺</span>
              <span>Reset Filters</span>
            </button>
          )}
        </div>
      </div>

      {/* ========================================================
          LEVEL 1 – EPIC SUMMARY TABLE (Executive Compact Row)
         ======================================================== */}
      <div className={styles.cardContainer}>
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th style={{ width: '40px', textAlign: 'center' }}>S.No</th>
                <th style={{ width: '160px' }}>EPIC ID</th>
                <th style={{ width: '180px' }}>SME / Resource Person</th>
                <th style={{ width: '150px' }}>Trade</th>
                <th style={{ width: '110px', textAlign: 'center' }}>Total Videos</th>
                <th style={{ width: '130px', textAlign: 'center' }}>Shooting Progress</th>
                <th style={{ width: '160px' }}>Cameraman</th>
                <th style={{ width: '160px' }}>Editor</th>
                <th style={{ width: '130px', textAlign: 'center' }}>Editing Progress</th>
                <th style={{ width: '140px' }}>Current Workflow Status</th>
                <th style={{ width: '140px' }}>Start Date</th>
                <th style={{ width: '140px', textAlign: 'center' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredEpics.map((epic, idx) => {
                const isExpanded = expandedEpicId === epic.id;
                const shootPct = epic.totalTopics > 0 ? Math.round((epic.completedShootingTopics / epic.totalTopics) * 100) : 0;
                const editPct = epic.totalTopics > 0 ? Math.round((epic.completedEditingTopics / epic.totalTopics) * 100) : 0;

                // Aggregate cameramen and editors across topics
                const topicCameramen = Array.from(new Set(epic.topics.map(t => t.cameraman).filter(Boolean))) as string[];
                const topicEditors = Array.from(new Set(epic.topics.map(t => t.editor).filter(Boolean))) as string[];

                return (
                  <React.Fragment key={epic.id}>
                    <tr 
                      style={{ 
                        backgroundColor: isExpanded ? '#f0f9ff' : undefined,
                        cursor: 'pointer',
                        transition: 'background-color 0.15s ease'
                      }}
                      onClick={() => setExpandedEpicId(isExpanded ? null : epic.id)}
                    >
                      {/* 1. S.No */}
                      <td style={{ textAlign: 'center', color: '#64748b', fontWeight: 600 }}>
                        {idx + 1}
                      </td>

                      {/* 2. EPIC ID */}
                      <td>
                        <div style={{ fontWeight: 700, color: '#0f2942' }}>
                          {epic.epicCode}
                        </div>
                        <div style={{ fontSize: '11px', color: '#64748b' }}>
                          Seq #{epic.epicSequence}
                        </div>
                      </td>

                      {/* 3. SME / Resource Person */}
                      <td>
                        <div style={{ fontWeight: 600, color: '#1e293b' }}>
                          {epic.sme?.name || 'SME Not Specified'}
                        </div>
                        {epic.sme?.designation && (
                          <div style={{ fontSize: '11px', color: '#64748b' }}>
                            {epic.sme.designation}
                          </div>
                        )}
                      </td>

                      {/* 4. Trade */}
                      <td>
                        <div style={{ fontWeight: 500, color: '#334155' }}>
                          {epic.trade || '—'}
                        </div>
                      </td>

                      {/* 5. Total Videos (Interactive Expand Toggle) */}
                      <td style={{ textAlign: 'center' }}>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpandedEpicId(isExpanded ? null : epic.id);
                          }}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '4px 10px',
                            borderRadius: '12px',
                            backgroundColor: isExpanded ? '#0284c7' : '#f1f5f9',
                            color: isExpanded ? '#ffffff' : '#334155',
                            fontWeight: 700,
                            fontSize: '11.5px',
                            border: 'none',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease'
                          }}
                          title="Click to view/collapse video breakdown"
                        >
                          <span>{epic.totalTopics} {epic.totalTopics === 1 ? 'Video' : 'Videos'}</span>
                          <span style={{ fontSize: '9px' }}>{isExpanded ? '▲' : '▼'}</span>
                        </button>
                      </td>

                      {/* 6. Shooting Progress */}
                      <td style={{ textAlign: 'center' }}>
                        <div className={styles.progressWrapper}>
                          <span style={{
                            fontWeight: 700,
                            fontSize: '12px',
                            color: epic.completedShootingTopics === epic.totalTopics && epic.totalTopics > 0 ? '#16a34a' : '#0284c7'
                          }}>
                            {epic.completedShootingTopics}/{epic.totalTopics}
                          </span>
                          <div className={styles.progressBar}>
                            <div 
                              className={styles.progressFill} 
                              style={{ 
                                width: `${shootPct}%`, 
                                backgroundColor: shootPct === 100 ? '#16a34a' : '#0284c7' 
                              }} 
                            />
                          </div>
                        </div>
                      </td>

                      {/* 7. Cameraman */}
                      <td>
                        {topicCameramen.length === 1 ? (
                          <div style={{ fontWeight: 600, color: '#0284c7', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span>🎥</span>
                            <span>{topicCameramen[0]}</span>
                          </div>
                        ) : topicCameramen.length > 1 ? (
                          <div style={{ fontWeight: 600, color: '#0284c7' }}>
                            🎥 {topicCameramen.length} Cameramen
                            <div style={{ fontSize: '10.5px', color: '#64748b' }}>{topicCameramen.join(', ')}</div>
                          </div>
                        ) : epic.cameraman ? (
                          <div style={{ fontWeight: 600, color: '#0284c7' }}>
                            🎥 {epic.cameraman.name}
                          </div>
                        ) : (
                          <span style={{ color: '#dc2626', fontWeight: 600, fontSize: '11.5px' }}>
                            — Unassigned
                          </span>
                        )}
                      </td>

                      {/* 8. Editor */}
                      <td>
                        {topicEditors.length === 1 ? (
                          <div style={{ fontWeight: 600, color: '#8b5cf6', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span>✂️</span>
                            <span>{topicEditors[0]}</span>
                          </div>
                        ) : topicEditors.length > 1 ? (
                          <div style={{ fontWeight: 600, color: '#8b5cf6' }}>
                            ✂️ {topicEditors.length} Editors
                            <div style={{ fontSize: '10.5px', color: '#64748b' }}>{topicEditors.join(', ')}</div>
                          </div>
                        ) : epic.editor ? (
                          <div style={{ fontWeight: 600, color: '#8b5cf6' }}>
                            ✂️ {epic.editor.name}
                          </div>
                        ) : epic.workflowStage === 'READY_FOR_EDITOR' || epic.notStartedEditingTopics > 0 ? (
                          <span style={{ color: '#d97706', fontWeight: 600, fontSize: '11.5px' }}>
                            Awaiting Assignment
                          </span>
                        ) : (
                          <span style={{ color: '#94a3b8', fontSize: '11px' }}>
                            Awaiting Shoot
                          </span>
                        )}
                      </td>

                      {/* 9. Editing Progress */}
                      <td style={{ textAlign: 'center' }}>
                        <div className={styles.progressWrapper}>
                          <span style={{
                            fontWeight: 700,
                            fontSize: '12px',
                            color: epic.completedEditingTopics === epic.totalTopics && epic.totalTopics > 0 ? '#16a34a' : '#d97706'
                          }}>
                            {epic.completedEditingTopics}/{epic.totalTopics}
                          </span>
                          <div className={styles.progressBar}>
                            <div 
                              className={styles.progressFill} 
                              style={{ 
                                width: `${editPct}%`, 
                                backgroundColor: editPct === 100 ? '#16a34a' : '#f59e0b' 
                              }} 
                            />
                          </div>
                        </div>
                      </td>

                      {/* 10. Current Workflow Status */}
                      <td>
                        {epic.workflowStage === 'UNASSIGNED' && (
                          <span className={`${styles.badge} ${styles.badgeUnassigned}`}>
                            ⏳ Unassigned
                          </span>
                        )}
                        {epic.workflowStage === 'SHOOTING' && (
                          <span className={`${styles.badge} ${styles.badgeShooting}`}>
                            🎥 Shooting
                          </span>
                        )}
                        {epic.workflowStage === 'READY_FOR_EDITOR' && (
                          <span className={`${styles.badge} ${styles.badgeReadyEditor}`}>
                            ✂️ Ready for Editor
                          </span>
                        )}
                        {epic.workflowStage === 'EDITING' && (
                          <span className={`${styles.badge} ${styles.badgeEditing}`}>
                            💻 Editing
                          </span>
                        )}
                        {epic.workflowStage === 'COMPLETED' && (
                          <span className={`${styles.badge} ${styles.badgeCompleted}`}>
                            🏆 Ready to Publish
                          </span>
                        )}
                        {epic.workflowStage === 'PUBLISHED' && (
                          <span className={`${styles.badge} ${styles.badgePublished}`}>
                            ✓ Published
                          </span>
                        )}
                      </td>

                      {/* 11. Start Date (Stage-Aware Date Beside Current Status) */}
                      <td>
                        {epic.stageStartDate ? (
                          <div>
                            <div style={{ fontWeight: 600, color: '#0f2942' }}>
                              {formatDate(epic.stageStartDate)}
                            </div>
                            <div style={{ fontSize: '10.5px', color: '#64748b' }}>
                              {epic.stageStartDateLabel}
                            </div>
                          </div>
                        ) : (
                          <span style={{ color: '#94a3b8', fontSize: '11.5px' }}>
                            — Not Started
                          </span>
                        )}
                      </td>

                      {/* 12. Action – View Details */}
                      <td style={{ textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                        <div style={{ display: 'inline-flex', gap: '6px', alignItems: 'center' }}>
                          <button
                            type="button"
                            className={`${styles.actionBtn} ${styles.btnDetails}`}
                            onClick={() => setExpandedEpicId(isExpanded ? null : epic.id)}
                            style={{
                              backgroundColor: isExpanded ? '#0284c7' : '#f1f5f9',
                              color: isExpanded ? '#ffffff' : '#334155'
                            }}
                          >
                            <span>{isExpanded ? '▲ Hide Details' : '▼ View Details'}</span>
                          </button>

                          {epic.workflowStage === 'COMPLETED' && (
                            <button 
                              className={`${styles.actionBtn} ${styles.btnPublish}`}
                              onClick={() => {
                                setTargetEpic(epic);
                                setPublishModalOpen(true);
                              }}
                              title="Review & Publish Deliverables to Video Content Library"
                            >
                              <span>🚀</span>
                              <span>Publish</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>

                    {/* ========================================================
                        LEVEL 2 – EXPANDABLE VIDEO-WISE DETAILS SUB-TABLE
                       ======================================================== */}
                    {isExpanded && (
                      <tr style={{ backgroundColor: '#f8fafc' }}>
                        <td colSpan={12} style={{ padding: '16px 20px', borderBottom: '2px solid #cbd5e1' }}>
                          <div style={{ background: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', padding: '16px', boxShadow: '0 2px 4px rgba(0,0,0,0.04)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
                              <div>
                                <div style={{ fontWeight: 700, color: '#0f2942', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <span>📋</span>
                                  <span>{epic.epicCode} — Video-Wise Workflow &amp; Timeline Monitoring ({epic.totalTopics} Videos)</span>
                                </div>
                                <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '2px' }}>
                                  Individual Video Assignment: Cameraman and Video Editor can be assigned separately for each video below.
                                </div>
                              </div>

                              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                {epic.workflowStage === 'UNASSIGNED' && (
                                  <button
                                    className={`${styles.actionBtn} ${styles.btnAssignCam}`}
                                    onClick={() => handleOpenAssignCameramanEpic(epic)}
                                  >
                                    <span>🎥</span>
                                    <span>Assign Cameraman to All</span>
                                  </button>
                                )}
                                {epic.notStartedEditingTopics > 0 && (
                                  <button
                                    className={`${styles.actionBtn} ${styles.btnAssignEd}`}
                                    onClick={() => handleOpenAssignEditorEpic(epic)}
                                  >
                                    <span>✂️</span>
                                    <span>Assign Editor to All Pending ({epic.notStartedEditingTopics})</span>
                                  </button>
                                )}
                              </div>
                            </div>

                            {/* Video-Wise Table (All 15 Required Columns) */}
                            <div style={{ overflowX: 'auto' }}>
                              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                                <thead style={{ background: '#f1f5f9', borderBottom: '1px solid #e2e8f0' }}>
                                  <tr>
                                    <th style={{ padding: '8px 10px', textAlign: 'left', width: '30px' }}>S.No</th>
                                    <th style={{ padding: '8px 10px', textAlign: 'left', width: '80px' }}>Video ID</th>
                                    <th style={{ padding: '8px 10px', textAlign: 'left', minWidth: '200px' }}>Video Topic</th>
                                    <th style={{ padding: '8px 10px', textAlign: 'left', width: '130px' }}>Cameraman</th>
                                    <th style={{ padding: '8px 10px', textAlign: 'center', width: '110px' }}>Shooting Status</th>
                                    <th style={{ padding: '8px 10px', textAlign: 'center', width: '100px' }}>Shooting Start</th>
                                    <th style={{ padding: '8px 10px', textAlign: 'center', width: '100px' }}>Shooting End</th>
                                    <th style={{ padding: '8px 10px', textAlign: 'left', width: '130px' }}>Editor</th>
                                    <th style={{ padding: '8px 10px', textAlign: 'center', width: '110px' }}>Editing Status</th>
                                    <th style={{ padding: '8px 10px', textAlign: 'center', width: '100px' }}>Editing Start</th>
                                    <th style={{ padding: '8px 10px', textAlign: 'center', width: '100px' }}>Editing End</th>
                                    <th style={{ padding: '8px 10px', textAlign: 'center', width: '70px' }}>Duration</th>
                                    <th style={{ padding: '8px 10px', textAlign: 'center', width: '140px' }}>Submission Status</th>
                                    <th style={{ padding: '8px 10px', textAlign: 'center', width: '110px' }}>Admin Review</th>
                                    <th style={{ padding: '8px 10px', textAlign: 'center', minWidth: '160px' }}>Action</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {epic.topics.map((t, tIdx) => {
                                    const shootDone = isTopicShootingDone(t);
                                    const editDone = isTopicEditingDone(t);
                                    const inProg = (t.editingStatus || '').toLowerCase().includes('progress');
                                    const subStatus = t.submissionStatus || (editDone ? 'Completed' : inProg ? 'In Progress' : 'Pending');
                                    const isAwaitingAdmin = subStatus === 'Submitted – Awaiting Admin Approval';
                                    const isAdminApproved = subStatus === 'Admin Approved';
                                    const isRevisionRequired = subStatus === 'Revision Required';

                                    const cleanVidDisplay = t.id.startsWith('shoot-') || t.id.startsWith('ed-')
                                      ? `VID-${String(tIdx + 1).padStart(2, '0')}`
                                      : t.id.length > 8 ? `VID-${String(tIdx + 1).padStart(2, '0')}` : t.id;

                                    return (
                                      <tr key={t.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                        {/* 1. S.No */}
                                        <td style={{ padding: '8px 10px', color: '#64748b', fontWeight: 600 }}>
                                          {tIdx + 1}
                                        </td>

                                        {/* 2. Video ID */}
                                        <td style={{ padding: '8px 10px', fontWeight: 700, color: '#0f2942' }}>
                                          {cleanVidDisplay}
                                        </td>

                                        {/* 3. Video Topic */}
                                        <td style={{ padding: '8px 10px', fontWeight: 600, color: '#1e293b' }}>
                                          <div>{t.title}</div>
                                          {t.editorialComments && (
                                            <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px', fontStyle: 'italic' }}>
                                              💬 Editor: {t.editorialComments}
                                            </div>
                                          )}
                                          {t.adminReviewComments && (
                                            <div style={{ fontSize: '11px', color: isRevisionRequired ? '#b91c1c' : '#15803d', marginTop: '2px', fontWeight: 600 }}>
                                              {isRevisionRequired ? '⚠️ Revision Note: ' : '✓ Admin Note: '}
                                              {t.adminReviewComments}
                                            </div>
                                          )}
                                        </td>

                                        {/* 4. Cameraman */}
                                        <td style={{ padding: '8px 10px', color: '#334155' }}>
                                          {t.cameraman ? (
                                            <div style={{ fontWeight: 600, color: '#0284c7' }}>
                                              🎥 {t.cameraman}
                                            </div>
                                          ) : (
                                            <span style={{ color: '#dc2626', fontWeight: 600, fontSize: '11px' }}>
                                              — Unassigned
                                            </span>
                                          )}
                                        </td>

                                        {/* 5. Shooting Status */}
                                        <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                                          <span style={{ 
                                            display: 'inline-block',
                                            padding: '2px 8px',
                                            borderRadius: '10px',
                                            fontSize: '11px',
                                            fontWeight: 700,
                                            backgroundColor: shootDone ? '#dcfce7' : '#e0f2fe',
                                            color: shootDone ? '#166534' : '#0369a1'
                                          }}>
                                            {shootDone ? '✓ ' : ''}{t.shootingStatus}
                                          </span>
                                        </td>

                                        {/* 6. Shooting Start Date */}
                                        <td style={{ padding: '8px 10px', textAlign: 'center', color: '#334155' }}>
                                          {formatDate(t.shootStart)}
                                        </td>

                                        {/* 7. Shooting End Date */}
                                        <td style={{ padding: '8px 10px', textAlign: 'center', color: '#334155' }}>
                                          {formatDate(t.shootEnd)}
                                        </td>

                                        {/* 8. Editor */}
                                        <td style={{ padding: '8px 10px', color: '#334155' }}>
                                          {t.editor ? (
                                            <div style={{ fontWeight: 600, color: '#8b5cf6' }}>
                                              ✂️ {t.editor}
                                            </div>
                                          ) : (
                                            <span style={{ color: shootDone ? '#d97706' : '#94a3b8', fontWeight: 600, fontSize: '11px' }}>
                                              {shootDone ? '— Unassigned' : 'Awaiting Shoot'}
                                            </span>
                                          )}
                                        </td>

                                        {/* 9. Editing Status */}
                                        <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                                          <span style={{ 
                                            display: 'inline-block',
                                            padding: '2px 8px',
                                            borderRadius: '10px',
                                            fontSize: '11px',
                                            fontWeight: 700,
                                            backgroundColor: editDone ? '#dcfce7' : inProg ? '#fef3c7' : '#fee2e2',
                                            color: editDone ? '#166534' : inProg ? '#b45309' : '#991b1b'
                                          }}>
                                            {editDone ? '✓ Completed' : inProg ? '💻 In Progress' : '⏳ Not Started'}
                                          </span>
                                        </td>

                                        {/* 10. Editing Start Date */}
                                        <td style={{ padding: '8px 10px', textAlign: 'center', color: '#334155' }}>
                                          {formatDate(t.editStart)}
                                        </td>

                                        {/* 11. Editing End Date */}
                                        <td style={{ padding: '8px 10px', textAlign: 'center', color: '#334155' }}>
                                          {formatDate(t.editEnd)}
                                        </td>

                                        {/* 12. Duration */}
                                        <td style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 600, color: '#334155' }}>
                                          {t.duration || '—'}
                                        </td>

                                        {/* 13. Submission Status */}
                                        <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                                          <span style={{
                                            display: 'inline-block',
                                            padding: '3px 8px',
                                            borderRadius: '10px',
                                            fontSize: '11px',
                                            fontWeight: 700,
                                            backgroundColor: isAdminApproved ? '#dcfce7' : isAwaitingAdmin ? '#f3e8ff' : isRevisionRequired ? '#fee2e2' : subStatus === 'Completed' ? '#e0f2fe' : inProg ? '#fef3c7' : '#f1f5f9',
                                            color: isAdminApproved ? '#166534' : isAwaitingAdmin ? '#6b21a8' : isRevisionRequired ? '#991b1b' : subStatus === 'Completed' ? '#0369a1' : inProg ? '#b45309' : '#64748b'
                                          }}>
                                            {isAdminApproved ? '✓ Admin Approved' : isAwaitingAdmin ? '📤 Awaiting Approval' : isRevisionRequired ? '⚠️ Revision Req.' : subStatus}
                                          </span>
                                        </td>

                                        {/* 14. Admin Review */}
                                        <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                                          {isAdminApproved ? (
                                            <span style={{ color: '#16a34a', fontWeight: 700, fontSize: '11px' }}>
                                              ✓ Approved
                                            </span>
                                          ) : isAwaitingAdmin ? (
                                            <span style={{ color: '#6b21a8', fontWeight: 700, fontSize: '11px' }}>
                                              Pending Review
                                            </span>
                                          ) : isRevisionRequired ? (
                                            <span style={{ color: '#dc2626', fontWeight: 700, fontSize: '11px' }}>
                                              Revision Req.
                                            </span>
                                          ) : (
                                            <span style={{ color: '#94a3b8' }}>—</span>
                                          )}
                                        </td>

                                        {/* 15. Action (View / Assign / Review / Timeline) */}
                                        <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                                          <div style={{ display: 'inline-flex', gap: '4px', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
                                            {/* Assign / Reassign Cameraman */}
                                            <button
                                              type="button"
                                              onClick={() => handleOpenAssignCameramanVideo(epic, t)}
                                              title={t.cameraman ? `Reassign Cameraman (Current: ${t.cameraman})` : 'Assign Cameraman to this video'}
                                              style={{
                                                padding: '3px 7px',
                                                backgroundColor: t.cameraman ? '#f1f5f9' : '#0284c7',
                                                color: t.cameraman ? '#0284c7' : '#ffffff',
                                                border: '1px solid #0284c7',
                                                borderRadius: '4px',
                                                fontSize: '11px',
                                                fontWeight: 600,
                                                cursor: 'pointer'
                                              }}
                                            >
                                              🎥 {t.cameraman ? '↻' : '+ Assign'}
                                            </button>

                                            {/* Assign / Reassign Editor */}
                                            {shootDone ? (
                                              <button
                                                type="button"
                                                onClick={() => handleOpenAssignEditorVideo(epic, t)}
                                                title={t.editor ? `Reassign Editor (Current: ${t.editor})` : 'Assign Editor to this video'}
                                                style={{
                                                  padding: '3px 7px',
                                                  backgroundColor: t.editor ? '#f1f5f9' : '#8b5cf6',
                                                  color: t.editor ? '#8b5cf6' : '#ffffff',
                                                  border: '1px solid #8b5cf6',
                                                  borderRadius: '4px',
                                                  fontSize: '11px',
                                                  fontWeight: 600,
                                                  cursor: 'pointer'
                                                }}
                                              >
                                                ✂️ {t.editor ? '↻' : '+ Assign'}
                                              </button>
                                            ) : (
                                              <span style={{ fontSize: '10.5px', color: '#94a3b8' }}>—</span>
                                            )}

                                            {/* Admin Approve / Revise Actions */}
                                            {(isAwaitingAdmin || (editDone && !isAdminApproved)) && (
                                              <>
                                                <button
                                                  type="button"
                                                  onClick={() => handleApproveSubmission(epic.id, t.id)}
                                                  disabled={actionLoading}
                                                  style={{
                                                    padding: '3px 7px',
                                                    backgroundColor: '#16a34a',
                                                    color: 'white',
                                                    border: 'none',
                                                    borderRadius: '4px',
                                                    fontSize: '11px',
                                                    fontWeight: 700,
                                                    cursor: 'pointer'
                                                  }}
                                                  title="Approve deliverable"
                                                >
                                                  ✓ Approve
                                                </button>
                                                <button
                                                  type="button"
                                                  onClick={() => handleOpenRevisionModal(epic.id, t.id, t.title)}
                                                  disabled={actionLoading}
                                                  style={{
                                                    padding: '3px 7px',
                                                    backgroundColor: '#ef4444',
                                                    color: 'white',
                                                    border: 'none',
                                                    borderRadius: '4px',
                                                    fontSize: '11px',
                                                    fontWeight: 700,
                                                    cursor: 'pointer'
                                                  }}
                                                  title="Request revision with comments"
                                                >
                                                  ⚠️ Revise
                                                </button>
                                              </>
                                            )}

                                            {/* Production Timeline Button */}
                                            <button
                                              type="button"
                                              onClick={() => handleOpenTimeline(epic, t)}
                                              style={{
                                                padding: '3px 7px',
                                                backgroundColor: '#f1f5f9',
                                                color: '#334155',
                                                border: '1px solid #cbd5e1',
                                                borderRadius: '4px',
                                                fontSize: '11px',
                                                fontWeight: 600,
                                                cursor: 'pointer'
                                              }}
                                              title="View Complete Production Milestones & Timeline"
                                            >
                                              🕒 Timeline
                                            </button>

                                            {/* Deliverable Link */}
                                            {t.finalVideoLink && (
                                              <a
                                                href={t.finalVideoLink}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                style={{
                                                  padding: '3px 6px',
                                                  backgroundColor: '#e0f2fe',
                                                  color: '#0284c7',
                                                  borderRadius: '4px',
                                                  fontSize: '11px',
                                                  fontWeight: 700,
                                                  textDecoration: 'none'
                                                }}
                                                title="Open Video Link"
                                              >
                                                🔗 Video
                                              </a>
                                            )}
                                          </div>
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}

              {filteredEpics.length === 0 && (
                <tr>
                  <td colSpan={12} style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                    <div style={{ fontSize: '24px', marginBottom: '8px' }}>🔍</div>
                    <strong>No EPIC records match the active stage or search filters.</strong>
                    <p style={{ margin: '6px 0 0 0', fontSize: '12px' }}>
                      Try selecting &apos;All EPICs&apos; or resetting your search keywords.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================
          MODAL A: ASSIGN CAMERAMAN TO SPECIFIC VIDEO TOPIC
         ======================================================== */}
      {videoCamModalOpen && targetTopicItem && (
        <div className={styles.modalOverlay} onClick={() => setVideoCamModalOpen(false)}>
          <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>🎥 Assign Cameraman to Video Topic</h3>
              <button className={styles.modalClose} onClick={() => setVideoCamModalOpen(false)}>✕</button>
            </div>
            <div className={styles.modalBody}>
              <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12.5px' }}>
                <div><strong>EPIC ID:</strong> {targetTopicItem.epic.epicCode}</div>
                <div><strong>Trade:</strong> {targetTopicItem.epic.trade}</div>
                <div><strong>Video Topic:</strong> {targetTopicItem.topic.title}</div>
                <div><strong>Current Shooting Status:</strong> {targetTopicItem.topic.shootingStatus}</div>
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: 700, fontSize: '13px', marginBottom: '8px', color: '#0f2942' }}>
                  Select Registered Cameraman Account: <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <input 
                  type="text"
                  placeholder="Filter registered cameramen by name or email..."
                  value={cameramanSearch}
                  onChange={e => setCameramanSearch(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    fontSize: '13px',
                    marginBottom: '8px'
                  }}
                />

                <div style={{ maxHeight: '180px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '4px' }}>
                  {filteredCameramen.map(c => {
                    const isSelected = selectedCameramanId === c.id;
                    return (
                      <div 
                        key={c.id}
                        className={`${styles.userOption} ${isSelected ? styles.userOptionSelected : ''}`}
                        onClick={() => setSelectedCameramanId(c.id)}
                      >
                        <div>
                          <div style={{ fontWeight: 700, color: '#0f2942', fontSize: '13px' }}>
                            {c.name || 'Cameraman'}
                          </div>
                          <div style={{ fontSize: '11px', color: '#64748b' }}>
                            {c.email} (User ID: {c.id})
                          </div>
                        </div>
                        <span style={{ fontSize: '11px', fontWeight: 700, color: '#16a34a', backgroundColor: '#dcfce7', padding: '2px 6px', borderRadius: '4px' }}>
                          ACTIVE
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#334155' }}>
                <input 
                  type="checkbox"
                  id="vidCamEmailToggle"
                  checked={cameramanSendEmail}
                  onChange={e => setCameramanSendEmail(e.target.checked)}
                />
                <label htmlFor="vidCamEmailToggle" style={{ cursor: 'pointer' }}>
                  Queue shooting assignment notification email to registered Cameraman
                </label>
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button className={styles.btnSecondary} onClick={() => setVideoCamModalOpen(false)}>
                Cancel
              </button>
              <button 
                className={styles.btnPrimary}
                onClick={handleSaveVideoCameraman}
                disabled={actionLoading || !selectedCameramanId}
              >
                {actionLoading ? 'Assigning...' : 'Confirm Topic Assignment'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL B: ASSIGN EDITOR TO SPECIFIC VIDEO TOPIC
         ======================================================== */}
      {videoEdModalOpen && targetTopicItem && (
        <div className={styles.modalOverlay} onClick={() => setVideoEdModalOpen(false)}>
          <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>✂️ Assign Video Editor to Topic</h3>
              <button className={styles.modalClose} onClick={() => setVideoEdModalOpen(false)}>✕</button>
            </div>
            <div className={styles.modalBody}>
              <div style={{ background: '#ecfdf5', padding: '12px 16px', borderRadius: '8px', border: '1px solid #a7f3d0', fontSize: '12.5px', color: '#065f46' }}>
                <div><strong>EPIC ID:</strong> {targetTopicItem.epic.epicCode}</div>
                <div><strong>Video Topic:</strong> {targetTopicItem.topic.title}</div>
                <div><strong>Shooting Status:</strong> ✓ Completed ({targetTopicItem.topic.cameraman || 'Cameraman'})</div>
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: 700, fontSize: '13px', marginBottom: '8px', color: '#0f2942' }}>
                  Select Registered Editor Account: <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <input 
                  type="text"
                  placeholder="Filter registered editors by name or email..."
                  value={editorSearch}
                  onChange={e => setEditorSearch(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    fontSize: '13px',
                    marginBottom: '8px'
                  }}
                />

                <div style={{ maxHeight: '180px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '4px' }}>
                  {filteredEditors.map(ed => {
                    const isSelected = selectedEditorId === ed.id;
                    return (
                      <div 
                        key={ed.id}
                        className={`${styles.userOption} ${isSelected ? styles.userOptionSelected : ''}`}
                        onClick={() => setSelectedEditorId(ed.id)}
                      >
                        <div>
                          <div style={{ fontWeight: 700, color: '#0f2942', fontSize: '13px' }}>
                            {ed.name || 'Editor'}
                          </div>
                          <div style={{ fontSize: '11px', color: '#64748b' }}>
                            {ed.email} (User ID: {ed.id})
                          </div>
                        </div>
                        <span style={{ fontSize: '11px', fontWeight: 700, color: '#16a34a', backgroundColor: '#dcfce7', padding: '2px 6px', borderRadius: '4px' }}>
                          ACTIVE
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#334155' }}>
                <input 
                  type="checkbox"
                  id="vidEdEmailToggle"
                  checked={editorSendEmail}
                  onChange={e => setEditorSendEmail(e.target.checked)}
                />
                <label htmlFor="vidEdEmailToggle" style={{ cursor: 'pointer' }}>
                  Queue editing assignment notification email to registered Editor
                </label>
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button className={styles.btnSecondary} onClick={() => setVideoEdModalOpen(false)}>
                Cancel
              </button>
              <button 
                className={styles.btnPrimary}
                onClick={handleSaveVideoEditor}
                disabled={actionLoading || !selectedEditorId}
              >
                {actionLoading ? 'Assigning...' : 'Confirm Topic Assignment'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL C: PRODUCTION TIMELINE VIEW (9 MILESTONES)
         ======================================================== */}
      {timelineModalOpen && targetTopicItem && (
        <div className={styles.modalOverlay} onClick={() => setTimelineModalOpen(false)}>
          <div className={styles.modalContent} style={{ maxWidth: '680px' }} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>🕒 Production Timeline &amp; Milestones</h3>
              <button className={styles.modalClose} onClick={() => setTimelineModalOpen(false)}>✕</button>
            </div>
            <div className={styles.modalBody}>
              {/* Header Topic Context */}
              <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12.5px' }}>
                <div style={{ fontWeight: 700, color: '#0f2942', fontSize: '13.5px', marginBottom: '4px' }}>
                  {targetTopicItem.topic.title}
                </div>
                <div style={{ display: 'flex', gap: '16px', color: '#64748b', flexWrap: 'wrap' }}>
                  <span><strong>EPIC:</strong> {targetTopicItem.epic.epicCode}</span>
                  <span><strong>Trade:</strong> {targetTopicItem.epic.trade}</span>
                  <span><strong>SME:</strong> {targetTopicItem.epic.sme?.name || 'SME'}</span>
                </div>
              </div>

              {/* 9 Milestones Stepper Track */}
              <div className={styles.timelineContainer}>
                {/* 1. Cameraman Assigned */}
                <div className={styles.timelineStep}>
                  <div className={styles.timelineLine} />
                  <div className={`${styles.timelineNode} ${targetTopicItem.topic.cameraman ? styles.timelineNodeDone : styles.timelineNodePending}`}>
                    {targetTopicItem.topic.cameraman ? '✓' : '1'}
                  </div>
                  <div className={styles.timelineContent}>
                    <div className={styles.timelineHeader}>
                      <span className={styles.timelineTitle}>1. Cameraman Assigned</span>
                      <span className={styles.timelineDate}>{formatDate(targetTopicItem.topic.cameramanAssignedAt)}</span>
                    </div>
                    <p className={styles.timelineDesc}>
                      {targetTopicItem.topic.cameraman ? `Assigned to ${targetTopicItem.topic.cameraman}` : 'Not yet assigned'}
                    </p>
                  </div>
                </div>

                {/* 2. Shooting In Progress */}
                <div className={styles.timelineStep}>
                  <div className={styles.timelineLine} />
                  <div className={`${styles.timelineNode} ${isTopicShootingDone(targetTopicItem.topic) ? styles.timelineNodeDone : targetTopicItem.topic.shootStart ? styles.timelineNodeActive : styles.timelineNodePending}`}>
                    {isTopicShootingDone(targetTopicItem.topic) ? '✓' : '2'}
                  </div>
                  <div className={`${styles.timelineContent} ${targetTopicItem.topic.shootStart && !isTopicShootingDone(targetTopicItem.topic) ? styles.timelineContentActive : ''}`}>
                    <div className={styles.timelineHeader}>
                      <span className={styles.timelineTitle}>2. Shooting In Progress</span>
                      <span className={styles.timelineDate}>{formatDate(targetTopicItem.topic.shootStart)}</span>
                    </div>
                    <p className={styles.timelineDesc}>
                      Status: {targetTopicItem.topic.shootingStatus}
                    </p>
                  </div>
                </div>

                {/* 3. Shooting Completed */}
                <div className={styles.timelineStep}>
                  <div className={styles.timelineLine} />
                  <div className={`${styles.timelineNode} ${isTopicShootingDone(targetTopicItem.topic) ? styles.timelineNodeDone : styles.timelineNodePending}`}>
                    {isTopicShootingDone(targetTopicItem.topic) ? '✓' : '3'}
                  </div>
                  <div className={styles.timelineContent}>
                    <div className={styles.timelineHeader}>
                      <span className={styles.timelineTitle}>3. Shooting Completed</span>
                      <span className={styles.timelineDate}>{formatDate(targetTopicItem.topic.shootEnd)}</span>
                    </div>
                    <p className={styles.timelineDesc}>
                      {isTopicShootingDone(targetTopicItem.topic) ? 'Field recording finished by Cameraman' : 'Shooting pending or underway'}
                    </p>
                  </div>
                </div>

                {/* 4. Editor Assigned */}
                <div className={styles.timelineStep}>
                  <div className={styles.timelineLine} />
                  <div className={`${styles.timelineNode} ${targetTopicItem.topic.editor ? styles.timelineNodeDone : styles.timelineNodePending}`}>
                    {targetTopicItem.topic.editor ? '✓' : '4'}
                  </div>
                  <div className={styles.timelineContent}>
                    <div className={styles.timelineHeader}>
                      <span className={styles.timelineTitle}>4. Video Editor Assigned</span>
                      <span className={styles.timelineDate}>{formatDate(targetTopicItem.topic.editorAssignedAt)}</span>
                    </div>
                    <p className={styles.timelineDesc}>
                      {targetTopicItem.topic.editor ? `Assigned to ${targetTopicItem.topic.editor}` : isTopicShootingDone(targetTopicItem.topic) ? 'Ready for Editor Assignment' : 'Awaiting Shooting Completion'}
                    </p>
                  </div>
                </div>

                {/* 5. Editing In Progress */}
                <div className={styles.timelineStep}>
                  <div className={styles.timelineLine} />
                  <div className={`${styles.timelineNode} ${isTopicEditingDone(targetTopicItem.topic) ? styles.timelineNodeDone : targetTopicItem.topic.editStart ? styles.timelineNodeActive : styles.timelineNodePending}`}>
                    {isTopicEditingDone(targetTopicItem.topic) ? '✓' : '5'}
                  </div>
                  <div className={`${styles.timelineContent} ${targetTopicItem.topic.editStart && !isTopicEditingDone(targetTopicItem.topic) ? styles.timelineContentActive : ''}`}>
                    <div className={styles.timelineHeader}>
                      <span className={styles.timelineTitle}>5. Editing In Progress</span>
                      <span className={styles.timelineDate}>{formatDate(targetTopicItem.topic.editStart)}</span>
                    </div>
                    <p className={styles.timelineDesc}>
                      Status: {targetTopicItem.topic.editingStatus}
                    </p>
                  </div>
                </div>

                {/* 6. Editing Completed */}
                <div className={styles.timelineStep}>
                  <div className={styles.timelineLine} />
                  <div className={`${styles.timelineNode} ${isTopicEditingDone(targetTopicItem.topic) ? styles.timelineNodeDone : styles.timelineNodePending}`}>
                    {isTopicEditingDone(targetTopicItem.topic) ? '✓' : '6'}
                  </div>
                  <div className={styles.timelineContent}>
                    <div className={styles.timelineHeader}>
                      <span className={styles.timelineTitle}>6. Editing Completed</span>
                      <span className={styles.timelineDate}>{formatDate(targetTopicItem.topic.editEnd)}</span>
                    </div>
                    <p className={styles.timelineDesc}>
                      {isTopicEditingDone(targetTopicItem.topic)
                        ? `Deliverable produced (${targetTopicItem.topic.duration || 'duration pending'})`
                        : 'Post-production cutting pending'}
                    </p>
                  </div>
                </div>

                {/* 7. Submitted – Awaiting Admin Approval */}
                <div className={styles.timelineStep}>
                  <div className={styles.timelineLine} />
                  <div className={`${styles.timelineNode} ${targetTopicItem.topic.submittedAt || targetTopicItem.topic.submissionStatus === 'Admin Approved' ? styles.timelineNodeDone : styles.timelineNodePending}`}>
                    {targetTopicItem.topic.submittedAt || targetTopicItem.topic.submissionStatus === 'Admin Approved' ? '✓' : '7'}
                  </div>
                  <div className={styles.timelineContent}>
                    <div className={styles.timelineHeader}>
                      <span className={styles.timelineTitle}>7. Formal Submission</span>
                      <span className={styles.timelineDate}>{formatDateTime(targetTopicItem.topic.submittedAt)}</span>
                    </div>
                    <p className={styles.timelineDesc}>
                      Submission Status: {targetTopicItem.topic.submissionStatus || 'Pending'}
                      {targetTopicItem.topic.editorialComments && ` — "${targetTopicItem.topic.editorialComments}"`}
                    </p>
                  </div>
                </div>

                {/* 8. Admin Approved */}
                <div className={styles.timelineStep}>
                  <div className={styles.timelineLine} />
                  <div className={`${styles.timelineNode} ${targetTopicItem.topic.submissionStatus === 'Admin Approved' ? styles.timelineNodeDone : targetTopicItem.topic.submissionStatus === 'Revision Required' ? styles.timelineNodePending : styles.timelineNodePending}`}
                    style={targetTopicItem.topic.submissionStatus === 'Revision Required' ? { backgroundColor: '#fee2e2', color: '#dc2626', borderColor: '#fca5a5' } : undefined}
                  >
                    {targetTopicItem.topic.submissionStatus === 'Admin Approved' ? '✓' : '8'}
                  </div>
                  <div className={styles.timelineContent}>
                    <div className={styles.timelineHeader}>
                      <span className={styles.timelineTitle}>8. Admin Approval &amp; Quality Review</span>
                      <span className={styles.timelineDate}>{formatDate(targetTopicItem.topic.adminReviewedAt)}</span>
                    </div>
                    <p className={styles.timelineDesc}>
                      {targetTopicItem.topic.submissionStatus === 'Admin Approved'
                        ? `✓ Approved by Admin (${targetTopicItem.topic.adminReviewComments || 'Deliverable accepted'})`
                        : targetTopicItem.topic.submissionStatus === 'Revision Required'
                        ? `⚠️ Revision Requested: ${targetTopicItem.topic.adminReviewComments || 'Corrections requested'}`
                        : 'Awaiting Admin Quality Review'}
                    </p>
                  </div>
                </div>

                {/* 9. Published to Video Content Library */}
                <div className={styles.timelineStep}>
                  <div className={`${styles.timelineNode} ${targetTopicItem.epic.isPublished ? styles.timelineNodeDone : styles.timelineNodePending}`}>
                    {targetTopicItem.epic.isPublished ? '✓' : '9'}
                  </div>
                  <div className={styles.timelineContent}>
                    <div className={styles.timelineHeader}>
                      <span className={styles.timelineTitle}>9. Published to Video Content Library</span>
                      <span className={styles.timelineDate}>{formatDate(targetTopicItem.epic.publishedAt)}</span>
                    </div>
                    <p className={styles.timelineDesc}>
                      {targetTopicItem.epic.isPublished
                        ? 'Live in Video Content Library for Telecast & LMS Distribution'
                        : 'Will be published upon Admin Broadcast Sign-off'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button className={styles.btnPrimary} onClick={() => setTimelineModalOpen(false)}>
                Close Timeline
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL 1: ASSIGN CAMERAMAN (EPIC LEVEL)
         ======================================================== */}
      {cameramanModalOpen && targetEpic && (
        <div className={styles.modalOverlay} onClick={() => setCameramanModalOpen(false)}>
          <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>🎥 Assign Registered Cameraman — {targetEpic.epicCode}</h3>
              <button className={styles.modalClose} onClick={() => setCameramanModalOpen(false)}>✕</button>
            </div>
            <div className={styles.modalBody}>
              <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12.5px' }}>
                <div><strong>Trade:</strong> {targetEpic.trade}</div>
                <div><strong>SME:</strong> {targetEpic.sme?.name || 'SME Not Specified'}</div>
                <div><strong>Primary Topic:</strong> {targetEpic.topic}</div>
                <div><strong>Total Videos:</strong> {targetEpic.totalTopics}</div>
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: 700, fontSize: '13px', marginBottom: '8px', color: '#0f2942' }}>
                  Select Registered Cameraman Account: <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <input 
                  type="text"
                  placeholder="Filter registered cameramen by name or email..."
                  value={cameramanSearch}
                  onChange={e => setCameramanSearch(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    fontSize: '13px',
                    marginBottom: '8px'
                  }}
                />

                <div style={{ maxHeight: '180px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '4px' }}>
                  {filteredCameramen.map(c => {
                    const isSelected = selectedCameramanId === c.id;
                    return (
                      <div 
                        key={c.id}
                        className={`${styles.userOption} ${isSelected ? styles.userOptionSelected : ''}`}
                        onClick={() => setSelectedCameramanId(c.id)}
                      >
                        <div>
                          <div style={{ fontWeight: 700, color: '#0f2942', fontSize: '13px' }}>
                            {c.name || 'Cameraman'}
                          </div>
                          <div style={{ fontSize: '11px', color: '#64748b' }}>
                            {c.email} (User ID: {c.id})
                          </div>
                        </div>
                        <span style={{ fontSize: '11px', fontWeight: 700, color: '#16a34a', backgroundColor: '#dcfce7', padding: '2px 6px', borderRadius: '4px' }}>
                          ACTIVE
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#334155' }}>
                <input 
                  type="checkbox"
                  id="camEmailToggle"
                  checked={cameramanSendEmail}
                  onChange={e => setCameramanSendEmail(e.target.checked)}
                />
                <label htmlFor="camEmailToggle" style={{ cursor: 'pointer' }}>
                  Queue assignment notification email to registered Cameraman
                </label>
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button className={styles.btnSecondary} onClick={() => setCameramanModalOpen(false)}>
                Cancel
              </button>
              <button 
                className={styles.btnPrimary}
                onClick={handleSaveCameramanEpic}
                disabled={actionLoading || !selectedCameramanId}
              >
                {actionLoading ? 'Assigning...' : 'Confirm Assignment'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL 2: ASSIGN EDITOR (EPIC LEVEL)
         ======================================================== */}
      {editorModalOpen && targetEpic && (
        <div className={styles.modalOverlay} onClick={() => setEditorModalOpen(false)}>
          <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>✂️ Assign Registered Video Editor — {targetEpic.epicCode}</h3>
              <button className={styles.modalClose} onClick={() => setEditorModalOpen(false)}>✕</button>
            </div>
            <div className={styles.modalBody}>
              <div style={{ background: '#ecfdf5', padding: '12px 16px', borderRadius: '8px', border: '1px solid #a7f3d0', fontSize: '12.5px', color: '#065f46' }}>
                <strong>✓ Shooting Completed:</strong> All {targetEpic.totalTopics} topics for this shoot have been completed.
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: 700, fontSize: '13px', marginBottom: '8px', color: '#0f2942' }}>
                  Select Registered Editor Account: <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <input 
                  type="text"
                  placeholder="Filter registered editors by name or email..."
                  value={editorSearch}
                  onChange={e => setEditorSearch(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    fontSize: '13px',
                    marginBottom: '8px'
                  }}
                />

                <div style={{ maxHeight: '180px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '4px' }}>
                  {filteredEditors.map(ed => {
                    const isSelected = selectedEditorId === ed.id;
                    return (
                      <div 
                        key={ed.id}
                        className={`${styles.userOption} ${isSelected ? styles.userOptionSelected : ''}`}
                        onClick={() => setSelectedEditorId(ed.id)}
                      >
                        <div>
                          <div style={{ fontWeight: 700, color: '#0f2942', fontSize: '13px' }}>
                            {ed.name || 'Editor'}
                          </div>
                          <div style={{ fontSize: '11px', color: '#64748b' }}>
                            {ed.email} (User ID: {ed.id})
                          </div>
                        </div>
                        <span style={{ fontSize: '11px', fontWeight: 700, color: '#16a34a', backgroundColor: '#dcfce7', padding: '2px 6px', borderRadius: '4px' }}>
                          ACTIVE
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#334155' }}>
                <input 
                  type="checkbox"
                  id="edEmailToggle"
                  checked={editorSendEmail}
                  onChange={e => setEditorSendEmail(e.target.checked)}
                />
                <label htmlFor="edEmailToggle" style={{ cursor: 'pointer' }}>
                  Queue assignment notification email to registered Editor
                </label>
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button className={styles.btnSecondary} onClick={() => setEditorModalOpen(false)}>
                Cancel
              </button>
              <button 
                className={styles.btnPrimary}
                onClick={handleSaveEditorEpic}
                disabled={actionLoading || !selectedEditorId}
              >
                {actionLoading ? 'Assigning...' : 'Confirm Assignment'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL 3: PUBLISH TO VIDEO CONTENT LIBRARY
         ======================================================== */}
      {publishModalOpen && targetEpic && (
        <div className={styles.modalOverlay} onClick={() => setPublishModalOpen(false)}>
          <div className={styles.modalContent} style={{ maxWidth: '780px' }} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>🚀 Review &amp; Publish Deliverables — {targetEpic.epicCode}</h3>
              <button className={styles.modalClose} onClick={() => setPublishModalOpen(false)}>✕</button>
            </div>
            <div className={styles.modalBody}>
              <div style={{ background: '#ecfdf5', padding: '12px 16px', borderRadius: '8px', border: '1px solid #a7f3d0', fontSize: '13px', color: '#065f46' }}>
                <strong>Verification Passed:</strong> All {targetEpic.totalTopics} video topics for this EPIC have completed shooting and post-production editing with valid deliverables.
              </div>

              <div>
                <h4 style={{ margin: '0 0 10px 0', fontSize: '13.5px', color: '#0f2942' }}>
                  Deliverables for Video Content Library Publication:
                </h4>
                <div style={{ maxHeight: '220px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '6px' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                    <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                      <tr>
                        <th style={{ padding: '8px 10px', textAlign: 'left' }}>Topic Title</th>
                        <th style={{ padding: '8px 10px', textAlign: 'left' }}>Duration</th>
                        <th style={{ padding: '8px 10px', textAlign: 'left' }}>Video Deliverable Link</th>
                      </tr>
                    </thead>
                    <tbody>
                      {targetEpic.topics.map(t => (
                        <tr key={t.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '8px 10px', fontWeight: 600 }}>{t.title}</td>
                          <td style={{ padding: '8px 10px' }}>{t.duration || '—'}</td>
                          <td style={{ padding: '8px 10px' }}>
                            {t.finalVideoLink ? (
                              <a href={t.finalVideoLink} target="_blank" rel="noopener noreferrer" style={{ color: '#0284c7', textDecoration: 'underline' }}>
                                View Video
                              </a>
                            ) : (
                              <span style={{ color: '#dc2626' }}>Missing Link</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div style={{ fontSize: '12.5px', color: '#64748b' }}>
                Publishing will make these {targetEpic.totalTopics} video deliverables visible and searchable across the Video Content Library with canonical relationships to this EPIC.
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button className={styles.btnSecondary} onClick={() => setPublishModalOpen(false)}>
                Cancel
              </button>
              <button 
                className={styles.btnPrimary}
                style={{ backgroundColor: '#059669' }}
                onClick={handlePublish}
                disabled={actionLoading}
              >
                {actionLoading ? 'Publishing...' : 'Confirm & Publish to Library'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL 4: NOTIFICATION QUEUE / OUTBOX
         ======================================================== */}
      {notificationsModalOpen && (
        <div className={styles.modalOverlay} onClick={() => setNotificationsModalOpen(false)}>
          <div className={styles.modalContent} style={{ maxWidth: '820px' }} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>✉️ Durable Notification Outbox &amp; Logs</h3>
              <button className={styles.modalClose} onClick={() => setNotificationsModalOpen(false)}>✕</button>
            </div>
            <div className={styles.modalBody}>
              <div style={{ fontSize: '12.5px', color: '#64748b', marginBottom: '8px' }}>
                All notification triggers for Cameraman assignment, Ready-for-Editor alerts, Editor assignment, and Publication are durably logged here.
              </div>

              <div style={{ maxHeight: '350px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '6px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                  <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                    <tr>
                      <th style={{ padding: '8px 10px', textAlign: 'left' }}>Event Type</th>
                      <th style={{ padding: '8px 10px', textAlign: 'left' }}>Recipient</th>
                      <th style={{ padding: '8px 10px', textAlign: 'left' }}>Subject</th>
                      <th style={{ padding: '8px 10px', textAlign: 'left' }}>Status</th>
                      <th style={{ padding: '8px 10px', textAlign: 'left' }}>Timestamp</th>
                      <th style={{ padding: '8px 10px', textAlign: 'center' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recentNotifications.map((notif: any) => (
                      <tr key={notif.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '8px 10px', fontWeight: 600 }}>{notif.type}</td>
                        <td style={{ padding: '8px 10px' }}>{notif.recipientEmail}</td>
                        <td style={{ padding: '8px 10px' }}>{notif.subject}</td>
                        <td style={{ padding: '8px 10px' }}>
                          <span style={{
                            padding: '2px 6px',
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: 700,
                            backgroundColor: notif.status === 'SENT' ? '#dcfce7' : notif.status === 'PENDING' ? '#fef3c7' : '#fee2e2',
                            color: notif.status === 'SENT' ? '#16a34a' : notif.status === 'PENDING' ? '#b45309' : '#dc2626'
                          }}>
                            {notif.status}
                          </span>
                        </td>
                        <td style={{ padding: '8px 10px', color: '#64748b' }}>
                          {new Date(notif.createdAt).toLocaleString()}
                        </td>
                        <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                          <button 
                            className={styles.actionBtn}
                            style={{ backgroundColor: '#f1f5f9', color: '#334155' }}
                            onClick={() => handleRetryNotification(notif.id)}
                            disabled={actionLoading}
                          >
                            Retry
                          </button>
                        </td>
                      </tr>
                    ))}
                    {data.recentNotifications.length === 0 && (
                      <tr>
                        <td colSpan={6} style={{ textAlign: 'center', padding: '24px', color: '#64748b' }}>
                          No notification events logged yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button className={styles.btnPrimary} onClick={() => setNotificationsModalOpen(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL 5: ADMIN REVISION REQUEST
         ======================================================== */}
      {revisionModalOpen && revisionTarget && (
        <div className={styles.modalOverlay} onClick={() => setRevisionModalOpen(false)}>
          <div className={styles.modalContent} style={{ maxWidth: '520px' }} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 style={{ color: '#b91c1c' }}>⚠️ Request Post-Production Revision</h3>
              <button className={styles.modalClose} onClick={() => setRevisionModalOpen(false)}>✕</button>
            </div>
            <div className={styles.modalBody}>
              <p style={{ margin: '0 0 12px 0', fontSize: '13px', color: '#334155' }}>
                You are requesting revision for topic: <br />
                <strong style={{ color: '#0f2942' }}>{revisionTarget.title}</strong>
              </p>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                Admin Correction Remarks / Feedback for Video Editor:
              </label>
              <textarea
                value={revisionComments}
                onChange={e => setRevisionComments(e.target.value)}
                placeholder="e.g. Please re-check audio sync at 05:20, fix opening title graphic spelling, normalize loudness to -14 LUFS..."
                rows={4}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  fontSize: '13px',
                  resize: 'vertical',
                  boxSizing: 'border-box'
                }}
              />
              <p style={{ margin: '8px 0 0 0', fontSize: '11.5px', color: '#64748b' }}>
                The Video Editor will see these remarks in their portal under Revision Required, make the corrections, and resubmit the same topic record without duplicates.
              </p>
            </div>
            <div className={styles.modalFooter}>
              <button className={styles.btnSecondary} onClick={() => setRevisionModalOpen(false)}>
                Cancel
              </button>
              <button
                className={styles.btnPrimary}
                style={{ backgroundColor: '#ef4444' }}
                onClick={handleSubmitRevision}
                disabled={actionLoading}
              >
                {actionLoading ? 'Submitting...' : 'Submit Revision Request'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
