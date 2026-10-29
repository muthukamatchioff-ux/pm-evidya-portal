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
  publishEpicToLibrary,
  retryNotificationAction
} from './actions';

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

  // Tabs: ALL, UNASSIGNED, SHOOTING, READY_FOR_EDITOR, EDITING, COMPLETED, PUBLISHED, NOTIFICATIONS
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

  // Modals
  const [cameramanModalOpen, setCameramanModalOpen] = useState(false);
  const [editorModalOpen, setEditorModalOpen] = useState(false);
  const [publishModalOpen, setPublishModalOpen] = useState(false);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [notificationsModalOpen, setNotificationsModalOpen] = useState(false);

  const [targetEpic, setTargetEpic] = useState<WorkflowEpicItem | null>(null);

  // Dropdown Search & Selection
  const [cameramanSearch, setCameramanSearch] = useState('');
  const [selectedCameramanId, setSelectedCameramanId] = useState('');
  const [cameramanSendEmail, setCameramanSendEmail] = useState(true);

  const [editorSearch, setEditorSearch] = useState('');
  const [selectedEditorId, setSelectedEditorId] = useState('');
  const [editorSendEmail, setEditorSendEmail] = useState(true);

  const [actionLoading, setActionLoading] = useState(false);

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

      // Trade filter
      if (selectedTrade !== 'ALL' && e.trade !== selectedTrade) return false;

      // Search term filter
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase().trim();
        const matchCode = e.epicCode.toLowerCase().includes(q);
        const matchTopic = (e.topic || '').toLowerCase().includes(q);
        const matchSme = (e.sme?.name || '').toLowerCase().includes(q);
        const matchTrade = (e.trade || '').toLowerCase().includes(q);
        const matchSubtopic = e.topics.some(t => t.title.toLowerCase().includes(q));
        if (!matchCode && !matchTopic && !matchSme && !matchTrade && !matchSubtopic) {
          return false;
        }
      }

      return true;
    });
  }, [data.epics, activeTab, selectedTrade, searchTerm]);

  // Search-filtered Cameramen
  const filteredCameramen = useMemo(() => {
    if (!cameramanSearch.trim()) return data.registeredCameramen;
    const q = cameramanSearch.toLowerCase().trim();
    return data.registeredCameramen.filter(c =>
      (c.name || '').toLowerCase().includes(q) || c.email.toLowerCase().includes(q)
    );
  }, [data.registeredCameramen, cameramanSearch]);

  // Search-filtered Editors
  const filteredEditors = useMemo(() => {
    if (!editorSearch.trim()) return data.registeredEditors;
    const q = editorSearch.toLowerCase().trim();
    return data.registeredEditors.filter(e =>
      (e.name || '').toLowerCase().includes(q) || e.email.toLowerCase().includes(q)
    );
  }, [data.registeredEditors, editorSearch]);

  // Open Cameraman Modal
  const handleOpenAssignCameraman = (epic: WorkflowEpicItem) => {
    setTargetEpic(epic);
    setSelectedCameramanId(epic.cameraman?.id || '');
    setCameramanSearch('');
    setCameramanSendEmail(true);
    setCameramanModalOpen(true);
  };

  // Submit Cameraman Assignment
  const handleSaveCameraman = async () => {
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

  // Open Editor Modal
  const handleOpenAssignEditor = (epic: WorkflowEpicItem) => {
    if (epic.completedShootingTopics < epic.totalTopics && epic.totalTopics > 0) {
      alert(`Validation Notice: Cannot assign Editor. Only ${epic.completedShootingTopics} of ${epic.totalTopics} shooting topics are completed.`);
      return;
    }
    setTargetEpic(epic);
    setSelectedEditorId(epic.editor?.id || '');
    setEditorSearch('');
    setEditorSendEmail(true);
    setEditorModalOpen(true);
  };

  // Submit Editor Assignment
  const handleSaveEditor = async () => {
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

  // Open Publish Modal
  const handleOpenPublish = (epic: WorkflowEpicItem) => {
    setTargetEpic(epic);
    setPublishModalOpen(true);
  };

  // Submit Publish
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

  // Retry Notification
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
            maxWidth: '450px'
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
            End-to-End EPIC Video Production Lifecycle: SME Entry → Cameraman Assignment → Shooting Entry → Admin Monitoring → Editor Assignment → Post-Production → Review &amp; Publication
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

      {/* Notice Banner */}
      <div className={styles.noticeBanner}>
        <span>ℹ️</span>
        <div>
          <strong>Active Registered Personnel Integration:</strong> All Cameraman and Editor assignment dropdowns are populated directly from the existing active user accounts in the database using canonical user IDs.
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

      {/* Stage Navigation Tabs */}
      <div className={styles.tabNav}>
        <button 
          className={`${styles.tabBtn} ${activeTab === 'ALL' ? styles.tabBtnActive : ''}`}
          onClick={() => setActiveTab('ALL')}
        >
          <span>All EPICs</span>
          <span className={styles.tabBadge}>{data.counts.total}</span>
        </button>
        <button 
          className={`${styles.tabBtn} ${activeTab === 'UNASSIGNED' ? styles.tabBtnActive : ''}`}
          onClick={() => setActiveTab('UNASSIGNED')}
        >
          <span>⏳ Unassigned Work</span>
          <span className={styles.tabBadge} style={{ backgroundColor: '#fee2e2', color: '#b91c1c' }}>
            {data.counts.unassigned}
          </span>
        </button>
        <button 
          className={`${styles.tabBtn} ${activeTab === 'SHOOTING' ? styles.tabBtnActive : ''}`}
          onClick={() => setActiveTab('SHOOTING')}
        >
          <span>🎥 Shooting in Progress</span>
          <span className={styles.tabBadge}>{data.counts.shooting}</span>
        </button>
        <button 
          className={`${styles.tabBtn} ${activeTab === 'READY_FOR_EDITOR' ? styles.tabBtnActive : ''}`}
          onClick={() => setActiveTab('READY_FOR_EDITOR')}
        >
          <span>✂️ Ready for Editor</span>
          <span className={styles.tabBadge} style={{ backgroundColor: '#ede9fe', color: '#6d28d9' }}>
            {data.counts.readyForEditor}
          </span>
        </button>
        <button 
          className={`${styles.tabBtn} ${activeTab === 'EDITING' ? styles.tabBtnActive : ''}`}
          onClick={() => setActiveTab('EDITING')}
        >
          <span>💻 Editing in Progress</span>
          <span className={styles.tabBadge}>{data.counts.editing}</span>
        </button>
        <button 
          className={`${styles.tabBtn} ${activeTab === 'COMPLETED' ? styles.tabBtnActive : ''}`}
          onClick={() => setActiveTab('COMPLETED')}
        >
          <span>🏆 Completed / Review</span>
          <span className={styles.tabBadge}>{data.counts.completed}</span>
        </button>
        <button 
          className={`${styles.tabBtn} ${activeTab === 'PUBLISHED' ? styles.tabBtnActive : ''}`}
          onClick={() => setActiveTab('PUBLISHED')}
        >
          <span>📼 Published</span>
          <span className={styles.tabBadge}>{data.counts.published}</span>
        </button>
      </div>

      {/* Toolbar */}
      <div className={styles.toolbar}>
        <div className={styles.searchGroup}>
          <span>🔍</span>
          <input 
            type="text"
            className={styles.searchInput}
            placeholder="Search EPIC ID, topic title, SME name, trade..."
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

      {/* Table Container */}
      <div className={styles.cardContainer}>
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th style={{ width: '40px', textAlign: 'center' }}>#</th>
                <th style={{ width: '170px' }}>EPIC ID</th>
                <th style={{ width: '180px' }}>SME / Resource Person</th>
                <th style={{ width: '160px' }}>Trade</th>
                <th style={{ minWidth: '240px' }}>Topic &amp; Production Details</th>
                <th style={{ width: '120px', textAlign: 'center' }}>Topics</th>
                <th style={{ width: '180px' }}>Cameraman Assignment</th>
                <th style={{ width: '130px', textAlign: 'center' }}>Shooting</th>
                <th style={{ width: '180px' }}>Editor Assignment</th>
                <th style={{ width: '130px', textAlign: 'center' }}>Editing</th>
                <th style={{ width: '150px' }}>Workflow Status</th>
                <th style={{ width: '180px', textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredEpics.map((epic, idx) => {
                const shootingProgress = epic.totalTopics > 0 
                  ? `${epic.completedShootingTopics}/${epic.totalTopics}`
                  : '—';
                const editingProgress = epic.totalTopics > 0 
                  ? `${epic.completedEditingTopics}/${epic.totalTopics}`
                  : '—';

                return (
                  <tr key={epic.id}>
                    {/* Index */}
                    <td style={{ textAlign: 'center', color: '#64748b', fontWeight: 600 }}>
                      {idx + 1}
                    </td>

                    {/* EPIC ID */}
                    <td>
                      <div style={{ fontWeight: 700, color: '#0f2942' }}>
                        {epic.epicCode}
                      </div>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>
                        Seq #{epic.epicSequence}
                      </div>
                    </td>

                    {/* SME Name */}
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

                    {/* Trade */}
                    <td>
                      <div style={{ fontWeight: 500, color: '#334155' }}>
                        {epic.trade || '—'}
                      </div>
                    </td>

                    {/* Topic */}
                    <td>
                      <div 
                        style={{ 
                          fontWeight: 500, 
                          color: '#0f172a',
                          maxHeight: '44px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical'
                        }}
                        title={epic.topic}
                      >
                        {epic.topic}
                      </div>
                    </td>

                    {/* Topics Count */}
                    <td style={{ textAlign: 'center' }}>
                      <span 
                        style={{ 
                          display: 'inline-block',
                          padding: '2px 8px',
                          borderRadius: '12px',
                          backgroundColor: '#f1f5f9',
                          color: '#334155',
                          fontWeight: 700,
                          fontSize: '11.5px'
                        }}
                      >
                        {epic.totalTopics} {epic.totalTopics === 1 ? 'Video' : 'Videos'}
                      </span>
                    </td>

                    {/* Cameraman Assignment */}
                    <td>
                      {epic.cameraman ? (
                        <div>
                          <div style={{ fontWeight: 600, color: '#0284c7', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span>🎥</span>
                            <span>{epic.cameraman.name}</span>
                          </div>
                          <div style={{ fontSize: '11px', color: '#64748b' }}>
                            {epic.cameraman.email}
                          </div>
                        </div>
                      ) : (
                        <button 
                          className={`${styles.actionBtn} ${styles.btnAssignCam}`}
                          onClick={() => handleOpenAssignCameraman(epic)}
                        >
                          <span>+</span>
                          <span>Assign Cameraman</span>
                        </button>
                      )}
                    </td>

                    {/* Shooting Progress */}
                    <td style={{ textAlign: 'center' }}>
                      <span 
                        style={{
                          fontWeight: 700,
                          fontSize: '12px',
                          color: epic.completedShootingTopics === epic.totalTopics && epic.totalTopics > 0 ? '#16a34a' : '#0284c7'
                        }}
                      >
                        {shootingProgress}
                      </span>
                    </td>

                    {/* Editor Assignment */}
                    <td>
                      {epic.editor ? (
                        <div>
                          <div style={{ fontWeight: 600, color: '#8b5cf6', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span>✂️</span>
                            <span>{epic.editor.name}</span>
                          </div>
                          <div style={{ fontSize: '11px', color: '#64748b' }}>
                            {epic.editor.email}
                          </div>
                        </div>
                      ) : epic.workflowStage === 'READY_FOR_EDITOR' ? (
                        <button 
                          className={`${styles.actionBtn} ${styles.btnAssignEd}`}
                          onClick={() => handleOpenAssignEditor(epic)}
                        >
                          <span>+</span>
                          <span>Assign Editor</span>
                        </button>
                      ) : (
                        <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                          Awaiting Shoot
                        </span>
                      )}
                    </td>

                    {/* Editing Progress */}
                    <td style={{ textAlign: 'center' }}>
                      <span 
                        style={{
                          fontWeight: 700,
                          fontSize: '12px',
                          color: epic.completedEditingTopics === epic.totalTopics && epic.totalTopics > 0 ? '#16a34a' : '#d97706'
                        }}
                      >
                        {editingProgress}
                      </span>
                    </td>

                    {/* Workflow Status Badge */}
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

                    {/* Actions Column */}
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'inline-flex', gap: '6px', alignItems: 'center' }}>
                        {epic.workflowStage === 'COMPLETED' && (
                          <button 
                            className={`${styles.actionBtn} ${styles.btnPublish}`}
                            onClick={() => handleOpenPublish(epic)}
                            title="Review & Publish Deliverables to Video Content Library"
                          >
                            <span>🚀</span>
                            <span>Publish</span>
                          </button>
                        )}

                        {epic.workflowStage === 'READY_FOR_EDITOR' && !epic.editor && (
                          <button 
                            className={`${styles.actionBtn} ${styles.btnAssignEd}`}
                            onClick={() => handleOpenAssignEditor(epic)}
                            title="Assign Registered Video Editor"
                          >
                            <span>✂️</span>
                            <span>Assign</span>
                          </button>
                        )}

                        {epic.workflowStage === 'UNASSIGNED' && (
                          <button 
                            className={`${styles.actionBtn} ${styles.btnAssignCam}`}
                            onClick={() => handleOpenAssignCameraman(epic)}
                            title="Assign Registered Cameraman"
                          >
                            <span>🎥</span>
                            <span>Assign</span>
                          </button>
                        )}

                        {epic.cameraman && epic.workflowStage !== 'PUBLISHED' && (
                          <button 
                            className={`${styles.actionBtn} ${styles.btnDetails}`}
                            onClick={() => handleOpenAssignCameraman(epic)}
                            title="Reassign Cameraman"
                          >
                            <span>↻</span>
                          </button>
                        )}

                        <button 
                          className={`${styles.actionBtn} ${styles.btnDetails}`}
                          onClick={() => {
                            setTargetEpic(epic);
                            setDetailsModalOpen(true);
                          }}
                          title="View Topic Breakdown"
                        >
                          <span>👁️</span>
                        </button>
                      </div>
                    </td>
                  </tr>
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
          MODAL 1: ASSIGN CAMERAMAN (Registered Users Only)
         ======================================================== */}
      {cameramanModalOpen && targetEpic && (
        <div className={styles.modalOverlay} onClick={() => setCameramanModalOpen(false)}>
          <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>🎥 Assign Registered Cameraman — {targetEpic.epicCode}</h3>
              <button className={styles.modalClose} onClick={() => setCameramanModalOpen(false)}>✕</button>
            </div>
            <div className={styles.modalBody}>
              {/* EPIC Summary */}
              <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12.5px' }}>
                <div><strong>Trade:</strong> {targetEpic.trade}</div>
                <div><strong>SME:</strong> {targetEpic.sme?.name || 'SME Not Specified'}</div>
                <div><strong>Primary Topic:</strong> {targetEpic.topic}</div>
                <div><strong>Total Videos:</strong> {targetEpic.totalTopics}</div>
              </div>

              {/* Registered Cameramen Searchable Dropdown */}
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
                            {c.name || 'Cameraman'} — Cameraman
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
                  {filteredCameramen.length === 0 && (
                    <div style={{ padding: '16px', textAlign: 'center', color: '#64748b', fontSize: '12.5px' }}>
                      No active registered Cameraman accounts match your search.
                    </div>
                  )}
                </div>
              </div>

              {/* Email Notification Option */}
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
                onClick={handleSaveCameraman}
                disabled={actionLoading || !selectedCameramanId}
              >
                {actionLoading ? 'Assigning...' : 'Confirm Assignment'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL 2: ASSIGN EDITOR (Registered Users Only)
         ======================================================== */}
      {editorModalOpen && targetEpic && (
        <div className={styles.modalOverlay} onClick={() => setEditorModalOpen(false)}>
          <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>✂️ Assign Registered Video Editor — {targetEpic.epicCode}</h3>
              <button className={styles.modalClose} onClick={() => setEditorModalOpen(false)}>✕</button>
            </div>
            <div className={styles.modalBody}>
              {/* Shooting Completion Notice */}
              <div style={{ background: '#ecfdf5', padding: '12px 16px', borderRadius: '8px', border: '1px solid #a7f3d0', fontSize: '12.5px', color: '#065f46' }}>
                <strong>✓ Shooting Completed:</strong> All {targetEpic.totalTopics} topics for this shoot have been verified as completed by Cameraman {targetEpic.cameraman?.name || 'Cameraman'}.
              </div>

              {/* Registered Editors Searchable Dropdown */}
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
                            {ed.name || 'Editor'} — Editor
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
                  {filteredEditors.length === 0 && (
                    <div style={{ padding: '16px', textAlign: 'center', color: '#64748b', fontSize: '12.5px' }}>
                      No active registered Editor accounts match your search.
                    </div>
                  )}
                </div>
              </div>

              {/* Email Notification Option */}
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
                onClick={handleSaveEditor}
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

              {/* Deliverables Checklist */}
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
          MODAL 4: EPIC TOPIC BREAKDOWN DETAILS
         ======================================================== */}
      {detailsModalOpen && targetEpic && (
        <div className={styles.modalOverlay} onClick={() => setDetailsModalOpen(false)}>
          <div className={styles.modalContent} style={{ maxWidth: '820px' }} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>📋 Topic Breakdown &amp; Production Details — {targetEpic.epicCode}</h3>
              <button className={styles.modalClose} onClick={() => setDetailsModalOpen(false)}>✕</button>
            </div>
            <div className={styles.modalBody}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', background: '#f8fafc', padding: '14px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12.5px' }}>
                <div><strong>SME:</strong> {targetEpic.sme?.name || 'SME Not Specified'}</div>
                <div><strong>Trade:</strong> {targetEpic.trade}</div>
                <div><strong>Cameraman:</strong> {targetEpic.cameraman?.name || 'Unassigned'} ({targetEpic.cameraman?.email || '—'})</div>
                <div><strong>Editor:</strong> {targetEpic.editor?.name || 'Unassigned'} ({targetEpic.editor?.email || '—'})</div>
                <div><strong>Workflow Stage:</strong> {targetEpic.workflowStage}</div>
                <div><strong>Published:</strong> {targetEpic.isPublished ? `Yes (${new Date(targetEpic.publishedAt!).toLocaleDateString()})` : 'No'}</div>
              </div>

              <div>
                <h4 style={{ margin: '14px 0 8px 0', fontSize: '13.5px', color: '#0f2942' }}>
                  Linked Topics ({targetEpic.totalTopics}):
                </h4>
                <div style={{ maxHeight: '280px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '6px' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                    <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                      <tr>
                        <th style={{ padding: '8px 10px', textAlign: 'left' }}>#</th>
                        <th style={{ padding: '8px 10px', textAlign: 'left' }}>Topic Title</th>
                        <th style={{ padding: '8px 10px', textAlign: 'left' }}>Shooting</th>
                        <th style={{ padding: '8px 10px', textAlign: 'left' }}>Editing</th>
                        <th style={{ padding: '8px 10px', textAlign: 'left' }}>Video Link</th>
                      </tr>
                    </thead>
                    <tbody>
                      {targetEpic.topics.map((t, idx) => (
                        <tr key={t.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '8px 10px', fontWeight: 600, color: '#64748b' }}>{idx + 1}</td>
                          <td style={{ padding: '8px 10px', fontWeight: 600 }}>{t.title}</td>
                          <td style={{ padding: '8px 10px' }}>
                            <span style={{ color: t.shootingStatus.toLowerCase() === 'completed' ? '#16a34a' : '#0284c7', fontWeight: 600 }}>
                              {t.shootingStatus}
                            </span>
                          </td>
                          <td style={{ padding: '8px 10px' }}>
                            <span style={{ color: t.editingStatus.toLowerCase() === 'completed' ? '#16a34a' : '#d97706', fontWeight: 600 }}>
                              {t.editingStatus}
                            </span>
                          </td>
                          <td style={{ padding: '8px 10px' }}>
                            {t.finalVideoLink ? (
                              <a href={t.finalVideoLink} target="_blank" rel="noopener noreferrer" style={{ color: '#0284c7', textDecoration: 'underline' }}>
                                View
                              </a>
                            ) : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button className={styles.btnPrimary} onClick={() => setDetailsModalOpen(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL 5: NOTIFICATION QUEUE / OUTBOX
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
    </div>
  );
}
