'use client';

import React from 'react';

interface EpicWorkflowReportProps {
  entry: any;
  auditLogs?: any[];
  onClose?: () => void;
  onPrint?: () => void;
  isPrintOnly?: boolean;
}

export default function EpicWorkflowReport({
  entry,
  auditLogs = [],
  onClose,
  onPrint,
  isPrintOnly = false
}: EpicWorkflowReportProps) {
  if (!entry) return null;

  const getEpicId = (epicSeq: number) => `EPIC-2026-PMeVidya ${String(epicSeq).padStart(2, '0')}`;
  const friendlyEpicId = getEpicId(entry.epicSequence || 1);
  const generatedDate = new Date().toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short'
  });

  const sme = entry.sme || {};
  const documents: any[] = entry.documents || [];
  const shootingSchedules: any[] = entry.shootingSchedules || [];
  const videoEditorRecords: any[] = entry.videoEditorRecords || [];
  const animationRecords: any[] = entry.animationRecords || [];
  const finalVideoRecords: any[] = entry.finalVideoRecords || [];
  const primaryFinalVideo = finalVideoRecords[0] || null;

  // Timeline stage computations (Strictly matching actual record data)
  // Stage 1: Shooting
  const shootingRecord = shootingSchedules[0] || null;
  const shootingStageStatus = shootingRecord
    ? (shootingRecord.status === 'COMPLETED' ? 'Completed' : (shootingRecord.status || 'Planned'))
    : 'No Record';

  // Stage 2: Video Editing
  const editingRecord = videoEditorRecords[0] || null;
  const editingStageStatus = editingRecord
    ? (editingRecord.status === 'COMPLETED' ? 'Completed' : (editingRecord.finalCutLink ? 'Final Cut Ready' : (editingRecord.status || 'In Progress')))
    : 'No Record';

  // Stage 3: Animation
  const animationRecord = animationRecords[0] || null;
  const animationStageStatus = animationRecord
    ? (animationRecord.status === 'COMPLETED' ? 'Completed' : (animationRecord.status || 'Not Started'))
    : 'No Record';

  // Stage 4: Final Video / Telecast
  const finalStageStatus = primaryFinalVideo
    ? (primaryFinalVideo.telecastStatus === 'TELECASTED'
        ? 'Telecasted'
        : (primaryFinalVideo.finalVideoStatus === 'APPROVED' ? 'Approved' : (primaryFinalVideo.finalVideoStatus || 'Pending')))
    : 'No Record';

  const getStatusBadgeStyle = (status: string) => {
    const s = (status || '').toUpperCase();
    if (s.includes('COMPLETE') || s.includes('APPROV') || s.includes('TELECAST')) {
      return { background: '#ecfdf5', color: '#065f46', border: '1px solid #a7f3d0' };
    }
    if (s.includes('PROGRESS') || s.includes('EDIT') || s.includes('READY')) {
      return { background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe' };
    }
    if (s.includes('PLAN') || s.includes('PEND')) {
      return { background: '#fefce8', color: '#854d0e', border: '1px solid #fef08a' };
    }
    return { background: '#f1f5f9', color: '#64748b', border: '1px solid #e2e8f0' };
  };

  const reportCardStyle = {
    background: '#ffffff',
    borderRadius: '16px',
    border: '1px solid #cbd5e1',
    boxShadow: isPrintOnly ? 'none' : '0 10px 25px -5px rgba(15, 23, 42, 0.08)',
    fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    color: '#0f172a',
    overflow: 'hidden'
  };

  return (
    <div style={reportCardStyle}>
      {/* SECTION 10: REPORT HEADER */}
      <div style={{
        background: 'linear-gradient(135deg, #f0f9ff 0%, #ffffff 50%, #f0fdf4 100%)',
        borderTop: '5px solid #0284c7',
        borderBottom: '2px solid #bae6fd',
        padding: '24px 32px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '20px',
        flexWrap: 'wrap'
      }}>
        {/* Left Branding: NIMI Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', minWidth: '280px' }}>
          <img
            src="/nimi-logo.png"
            alt="NIMI Logo"
            style={{ height: '78px', width: 'auto', objectFit: 'contain', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.06))' }}
          />
          <div>
            <div style={{ fontSize: '13px', fontWeight: 800, color: '#0369a1', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
              National Instructional Media Institute
            </div>
            <div style={{ fontSize: '11px', color: '#475569', marginTop: '2px', fontWeight: 500 }}>
              Ministry of Skill Development & Entrepreneurship, Govt. of India
            </div>
          </div>
        </div>

        {/* Center Title & Metadata */}
        <div style={{ textAlign: 'center', flex: '1 1 320px' }}>
          <h1 style={{
            fontSize: '26px',
            fontWeight: 800,
            color: '#0f2942',
            margin: '0 0 4px 0',
            letterSpacing: '-0.3px',
            lineHeight: 1.2
          }}>
            PM e-Vidya — SME Epic Workflow Report
          </h1>
          <p style={{
            fontSize: '14px',
            fontWeight: 600,
            color: '#334155',
            margin: '0 0 8px 0'
          }}>
            Complete History & Details for Selected Epic ID
          </p>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
            <span style={{
              background: '#0284c7',
              color: '#ffffff',
              padding: '4px 12px',
              borderRadius: '20px',
              fontSize: '12px',
              fontWeight: 800,
              letterSpacing: '0.5px'
            }}>
              {friendlyEpicId}
            </span>
            <span style={{
              background: '#e0f2fe',
              color: '#0369a1',
              padding: '4px 12px',
              borderRadius: '20px',
              fontSize: '12px',
              fontWeight: 600,
              border: '1px solid #bae6fd'
            }}>
              📅 Generated on: {generatedDate}
            </span>
          </div>
        </div>

        {/* Right Branding: PM e-Vidya Logo */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', minWidth: '200px' }}>
          <img
            src="/evidya-logo-exact.png"
            alt="PM e-Vidya Logo"
            style={{ height: '78px', width: 'auto', objectFit: 'contain', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.06))' }}
          />
        </div>
      </div>

      {/* SME OVERVIEW BANNER */}
      <div style={{
        background: '#f8fafc',
        borderBottom: '1px solid #e2e8f0',
        padding: '16px 32px',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '16px'
      }}>
        <div>
          <span style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>Subject Matter Expert</span>
          <div style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>{sme.name || 'Unassigned'}</div>
          <div style={{ fontSize: '12px', color: '#475569' }}>{sme.designation || 'Expert'} • {sme.institute || 'N/A'}</div>
        </div>
        <div>
          <span style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>Trade & Module Topic</span>
          <div style={{ fontSize: '14px', fontWeight: 700, color: '#0369a1', marginTop: '2px' }}>{entry.trade || 'General'}</div>
          <div style={{ fontSize: '12px', color: '#334155' }}>{entry.topic || 'Untitled Topic'}</div>
        </div>
        <div>
          <span style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>Workflow Status</span>
          <div style={{ marginTop: '4px' }}>
            <span style={{
              display: 'inline-block',
              padding: '3px 10px',
              borderRadius: '12px',
              fontSize: '12px',
              fontWeight: 800,
              ...getStatusBadgeStyle(entry.status)
            }}>
              {entry.status || 'PENDING'}
            </span>
          </div>
        </div>
        <div>
          <span style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>Attendance Window</span>
          <div style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b', marginTop: '2px' }}>
            {entry.attendanceFrom ? new Date(entry.attendanceFrom).toLocaleDateString('en-IN') : 'TBD'} to{' '}
            {entry.attendanceTo ? new Date(entry.attendanceTo).toLocaleDateString('en-IN') : 'TBD'}
          </div>
          <div style={{ fontSize: '11px', color: '#64748b' }}>Working Days: {entry.days || '-'}</div>
        </div>
      </div>

      {/* SECTION 2: EXECUTIVE SUMMARY (6 KPI CARDS) */}
      <div style={{ padding: '24px 32px 16px 32px' }}>
        <div style={{ fontSize: '14px', fontWeight: 800, color: '#0f2942', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '12px' }}>
          Executive Summary Metrics
        </div>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '14px'
        }}>
          {/* Card 1: Epic ID */}
          <div style={{ padding: '16px', borderRadius: '12px', background: 'linear-gradient(135deg, #ffffff 0%, #eff6ff 100%)', border: '1.5px solid #bfdbfe', borderLeft: '4px solid #2563eb' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#1e40af', textTransform: 'uppercase' }}>Selected Epic ID</div>
            <div style={{ fontSize: '18px', fontWeight: 800, color: '#1e3a8a', marginTop: '6px' }}>{friendlyEpicId}</div>
            <div style={{ fontSize: '11px', color: '#2563eb', marginTop: '4px' }}>Sequence #{entry.epicSequence}</div>
          </div>

          {/* Card 2: Documents */}
          <div style={{ padding: '16px', borderRadius: '12px', background: 'linear-gradient(135deg, #ffffff 0%, #ecfeff 100%)', border: '1.5px solid #a5f3fc', borderLeft: '4px solid #0891b2' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#0e7490', textTransform: 'uppercase' }}>Linked Documents</div>
            <div style={{ fontSize: '24px', fontWeight: 800, color: '#155e75', marginTop: '6px' }}>{documents.length}</div>
            <div style={{ fontSize: '11px', color: '#0891b2', marginTop: '4px' }}>Verified Files Uploaded</div>
          </div>

          {/* Card 3: Shooting */}
          <div style={{ padding: '16px', borderRadius: '12px', background: 'linear-gradient(135deg, #ffffff 0%, #faf5ff 100%)', border: '1.5px solid #e9d5ff', borderLeft: '4px solid #7c3aed' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#6b21a8', textTransform: 'uppercase' }}>Shooting Schedules</div>
            <div style={{ fontSize: '24px', fontWeight: 800, color: '#581c87', marginTop: '6px' }}>{shootingSchedules.length}</div>
            <div style={{ fontSize: '11px', color: '#7c3aed', marginTop: '4px' }}>Status: {shootingStageStatus}</div>
          </div>

          {/* Card 4: Editing */}
          <div style={{ padding: '16px', borderRadius: '12px', background: 'linear-gradient(135deg, #ffffff 0%, #eef2ff 100%)', border: '1.5px solid #c7d2fe', borderLeft: '4px solid #4f46e5' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#3730a3', textTransform: 'uppercase' }}>Editing Records</div>
            <div style={{ fontSize: '24px', fontWeight: 800, color: '#312e81', marginTop: '6px' }}>{videoEditorRecords.length}</div>
            <div style={{ fontSize: '11px', color: '#4f46e5', marginTop: '4px' }}>Status: {editingStageStatus}</div>
          </div>

          {/* Card 5: Animation */}
          <div style={{ padding: '16px', borderRadius: '12px', background: 'linear-gradient(135deg, #ffffff 0%, #fffbeb 100%)', border: '1.5px solid #fde68a', borderLeft: '4px solid #d97706' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#92400e', textTransform: 'uppercase' }}>Animation Records</div>
            <div style={{ fontSize: '24px', fontWeight: 800, color: '#78350f', marginTop: '6px' }}>{animationRecords.length}</div>
            <div style={{ fontSize: '11px', color: '#d97706', marginTop: '4px' }}>Status: {animationStageStatus}</div>
          </div>

          {/* Card 6: Final Video */}
          <div style={{ padding: '16px', borderRadius: '12px', background: 'linear-gradient(135deg, #ffffff 0%, #ecfdf5 100%)', border: '1.5px solid #a7f3d0', borderLeft: '4px solid #059669' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#065f46', textTransform: 'uppercase' }}>Final Video & Duration</div>
            <div style={{ fontSize: '18px', fontWeight: 800, color: '#064e3b', marginTop: '6px' }}>
              {primaryFinalVideo?.finalDuration || (entry.videoLibraries?.[0]?.duration) || 'Not Recorded'}
            </div>
            <div style={{ fontSize: '11px', color: '#059669', marginTop: '4px' }}>
              Status: {finalStageStatus}
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 3: WORKFLOW TIMELINE */}
      <div style={{ padding: '8px 32px 24px 32px' }}>
        <div style={{ fontSize: '14px', fontWeight: 800, color: '#0f2942', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '12px' }}>
          Workflow Lifecycle Timeline
        </div>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '12px'
        }}>
          {/* Stage 1 */}
          <div style={{ padding: '14px 16px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
              <span style={{ fontSize: '12px', fontWeight: 800, color: '#0f2942' }}>1. Shooting Schedule</span>
              <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '8px', fontWeight: 700, ...getStatusBadgeStyle(shootingStageStatus) }}>
                {shootingStageStatus}
              </span>
            </div>
            <div style={{ fontSize: '12px', color: '#334155' }}>
              <strong>Date:</strong> {shootingRecord?.shootDate ? new Date(shootingRecord.shootDate).toLocaleDateString('en-IN') : 'Not Scheduled'}
            </div>
            <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
              Cameraman: {shootingRecord?.cameraman || 'Unassigned'}
            </div>
          </div>

          {/* Stage 2 */}
          <div style={{ padding: '14px 16px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
              <span style={{ fontSize: '12px', fontWeight: 800, color: '#0f2942' }}>2. Video Editing</span>
              <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '8px', fontWeight: 700, ...getStatusBadgeStyle(editingStageStatus) }}>
                {editingStageStatus}
              </span>
            </div>
            <div style={{ fontSize: '12px', color: '#334155' }}>
              <strong>Editor:</strong> {editingRecord?.editorName || 'Not Assigned'}
            </div>
            <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
              Rough: {editingRecord?.roughCutLink ? '✓ Uploaded' : 'Pending'} • Final: {editingRecord?.finalCutLink ? '✓ Ready' : 'Pending'}
            </div>
          </div>

          {/* Stage 3 */}
          <div style={{ padding: '14px 16px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
              <span style={{ fontSize: '12px', fontWeight: 800, color: '#0f2942' }}>3. 2D Animation</span>
              <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '8px', fontWeight: 700, ...getStatusBadgeStyle(animationStageStatus) }}>
                {animationStageStatus}
              </span>
            </div>
            <div style={{ fontSize: '12px', color: '#334155' }}>
              <strong>Animator:</strong> {animationRecord?.animatorName || 'Not Assigned'}
            </div>
            <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
              File: {animationRecord?.finalAnimationFile ? '✓ Attached' : 'None'}
            </div>
          </div>

          {/* Stage 4 */}
          <div style={{ padding: '14px 16px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
              <span style={{ fontSize: '12px', fontWeight: 800, color: '#0f2942' }}>4. Final Video & Telecast</span>
              <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '8px', fontWeight: 700, ...getStatusBadgeStyle(finalStageStatus) }}>
                {finalStageStatus}
              </span>
            </div>
            <div style={{ fontSize: '12px', color: '#334155' }}>
              <strong>Approval:</strong> {primaryFinalVideo?.finalApproval || 'Pending Approval'}
            </div>
            <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
              Channel: {primaryFinalVideo?.telecastChannel || 'TBD'} • Ep: {primaryFinalVideo?.telecastEpisode || '-'}
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 4: SHOOTING SCHEDULE DETAILS TABLE */}
      <div style={{ padding: '0 32px 24px 32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
          <span style={{ fontSize: '16px' }}>🎬</span>
          <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#0f2942', margin: 0 }}>
            Shooting Schedule Details ({shootingSchedules.length})
          </h3>
        </div>
        {shootingSchedules.length === 0 ? (
          <div style={{ padding: '16px', background: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: '8px', color: '#64748b', fontSize: '13px' }}>
            No shooting schedule records created for this Epic ID yet.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, fontSize: '12px', border: '1px solid #cbd5e1', borderRadius: '8px', overflow: 'hidden' }}>
              <thead>
                <tr style={{ background: '#0f2942', color: '#ffffff' }}>
                  <th style={{ padding: '10px 12px', textAlign: 'left' }}>Sl.</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left' }}>Video Title</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left' }}>Shoot Date</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left' }}>Location</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left' }}>Type</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left' }}>Cameraman</th>
                  <th style={{ padding: '10px 12px', textAlign: 'center' }}>Status</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left' }}>Production Notes</th>
                </tr>
              </thead>
              <tbody>
                {shootingSchedules.map((s, idx) => (
                  <tr key={s.id} style={{ background: idx % 2 === 0 ? '#ffffff' : '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '10px 12px', borderBottom: '1px solid #e2e8f0' }}>{idx + 1}</td>
                    <td style={{ padding: '10px 12px', fontWeight: 600, borderBottom: '1px solid #e2e8f0' }}>{s.videoTitle}</td>
                    <td style={{ padding: '10px 12px', borderBottom: '1px solid #e2e8f0' }}>{s.shootDate ? new Date(s.shootDate).toLocaleDateString('en-IN') : '-'}</td>
                    <td style={{ padding: '10px 12px', borderBottom: '1px solid #e2e8f0' }}>{s.location || '-'}</td>
                    <td style={{ padding: '10px 12px', borderBottom: '1px solid #e2e8f0' }}>{s.shootingType || '-'}</td>
                    <td style={{ padding: '10px 12px', borderBottom: '1px solid #e2e8f0' }}>{s.cameraman || '-'}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'center', borderBottom: '1px solid #e2e8f0' }}>
                      <span style={{ padding: '2px 8px', borderRadius: '8px', fontWeight: 700, fontSize: '11px', ...getStatusBadgeStyle(s.status) }}>
                        {s.status || 'PLANNED'}
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px', color: '#475569', borderBottom: '1px solid #e2e8f0' }}>{s.productionNotes || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* SECTION 5: VIDEO EDITOR DETAILS TABLE */}
      <div style={{ padding: '0 32px 24px 32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
          <span style={{ fontSize: '16px' }}>✂️</span>
          <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#0f2942', margin: 0 }}>
            Video Editing Records ({videoEditorRecords.length})
          </h3>
        </div>
        {videoEditorRecords.length === 0 ? (
          <div style={{ padding: '16px', background: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: '8px', color: '#64748b', fontSize: '13px' }}>
            No video editing records created for this Epic ID yet.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, fontSize: '12px', border: '1px solid #cbd5e1', borderRadius: '8px', overflow: 'hidden' }}>
              <thead>
                <tr style={{ background: '#0f2942', color: '#ffffff' }}>
                  <th style={{ padding: '10px 12px', textAlign: 'left' }}>Sl.</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left' }}>Editor Name</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left' }}>Assigned Video</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left' }}>Start Date</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left' }}>Duration</th>
                  <th style={{ padding: '10px 12px', textAlign: 'center' }}>Status</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left' }}>Rough Cut</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left' }}>Final Cut</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left' }}>Review Comments</th>
                </tr>
              </thead>
              <tbody>
                {videoEditorRecords.map((e, idx) => (
                  <tr key={e.id} style={{ background: idx % 2 === 0 ? '#ffffff' : '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '10px 12px', borderBottom: '1px solid #e2e8f0' }}>{idx + 1}</td>
                    <td style={{ padding: '10px 12px', fontWeight: 600, borderBottom: '1px solid #e2e8f0' }}>{e.editorName || '-'}</td>
                    <td style={{ padding: '10px 12px', borderBottom: '1px solid #e2e8f0' }}>{e.assignedVideo || '-'}</td>
                    <td style={{ padding: '10px 12px', borderBottom: '1px solid #e2e8f0' }}>{e.editingStartDate ? new Date(e.editingStartDate).toLocaleDateString('en-IN') : '-'}</td>
                    <td style={{ padding: '10px 12px', fontWeight: 700, borderBottom: '1px solid #e2e8f0' }}>{e.duration || '-'}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'center', borderBottom: '1px solid #e2e8f0' }}>
                      <span style={{ padding: '2px 8px', borderRadius: '8px', fontWeight: 700, fontSize: '11px', ...getStatusBadgeStyle(e.status) }}>
                        {e.status || 'NOT_STARTED'}
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px', borderBottom: '1px solid #e2e8f0' }}>
                      {e.roughCutLink ? <a href={e.roughCutLink} target="_blank" rel="noreferrer" style={{ color: '#2563eb', textDecoration: 'underline' }}>View Link</a> : '-'}
                    </td>
                    <td style={{ padding: '10px 12px', borderBottom: '1px solid #e2e8f0' }}>
                      {e.finalCutLink ? <a href={e.finalCutLink} target="_blank" rel="noreferrer" style={{ color: '#059669', textDecoration: 'underline' }}>View Link</a> : '-'}
                    </td>
                    <td style={{ padding: '10px 12px', color: '#475569', borderBottom: '1px solid #e2e8f0' }}>{e.reviewComments || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* SECTION 6: ANIMATION DETAILS TABLE */}
      <div style={{ padding: '0 32px 24px 32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
          <span style={{ fontSize: '16px' }}>🎨</span>
          <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#0f2942', margin: 0 }}>
            2D Animation Records ({animationRecords.length})
          </h3>
        </div>
        {animationRecords.length === 0 ? (
          <div style={{ padding: '16px', background: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: '8px', color: '#64748b', fontSize: '13px' }}>
            No animation records created for this Epic ID yet.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, fontSize: '12px', border: '1px solid #cbd5e1', borderRadius: '8px', overflow: 'hidden' }}>
              <thead>
                <tr style={{ background: '#0f2942', color: '#ffffff' }}>
                  <th style={{ padding: '10px 12px', textAlign: 'left' }}>Sl.</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left' }}>Animator Name</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left' }}>Assigned Video</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left' }}>Start Date</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left' }}>End Date</th>
                  <th style={{ padding: '10px 12px', textAlign: 'center' }}>Status</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left' }}>Final Animation File</th>
                </tr>
              </thead>
              <tbody>
                {animationRecords.map((a, idx) => (
                  <tr key={a.id} style={{ background: idx % 2 === 0 ? '#ffffff' : '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '10px 12px', borderBottom: '1px solid #e2e8f0' }}>{idx + 1}</td>
                    <td style={{ padding: '10px 12px', fontWeight: 600, borderBottom: '1px solid #e2e8f0' }}>{a.animatorName || '-'}</td>
                    <td style={{ padding: '10px 12px', borderBottom: '1px solid #e2e8f0' }}>{a.assignedVideo || '-'}</td>
                    <td style={{ padding: '10px 12px', borderBottom: '1px solid #e2e8f0' }}>{a.animationStartDate ? new Date(a.animationStartDate).toLocaleDateString('en-IN') : '-'}</td>
                    <td style={{ padding: '10px 12px', borderBottom: '1px solid #e2e8f0' }}>{a.animationEndDate ? new Date(a.animationEndDate).toLocaleDateString('en-IN') : '-'}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'center', borderBottom: '1px solid #e2e8f0' }}>
                      <span style={{ padding: '2px 8px', borderRadius: '8px', fontWeight: 700, fontSize: '11px', ...getStatusBadgeStyle(a.status) }}>
                        {a.status || 'NOT_STARTED'}
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px', borderBottom: '1px solid #e2e8f0' }}>{a.finalAnimationFile || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* SECTION 7: FINAL VIDEO & TELECAST DETAILS */}
      <div style={{ padding: '0 32px 24px 32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
          <span style={{ fontSize: '16px' }}>📺</span>
          <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#0f2942', margin: 0 }}>
            Final Video & Telecast Details
          </h3>
        </div>
        {!primaryFinalVideo ? (
          <div style={{ padding: '16px', background: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: '8px', color: '#64748b', fontSize: '13px' }}>
            No final video or telecast records created for this Epic ID yet.
          </div>
        ) : (
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '18px 20px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
              <div>
                <span style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>Final Video File</span>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a', marginTop: '2px' }}>{primaryFinalVideo.finalVideoFile || 'Pending Render'}</div>
              </div>
              <div>
                <span style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>Duration</span>
                <div style={{ fontSize: '14px', fontWeight: 800, color: '#0284c7', marginTop: '2px' }}>{primaryFinalVideo.finalDuration || '-'}</div>
              </div>
              <div>
                <span style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>Final Approval</span>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#059669', marginTop: '2px' }}>{primaryFinalVideo.finalApproval || 'Pending Approval'}</div>
                <div style={{ fontSize: '11px', color: '#64748b' }}>
                  {primaryFinalVideo.approvalDate ? new Date(primaryFinalVideo.approvalDate).toLocaleDateString('en-IN') : ''}
                </div>
              </div>
              <div>
                <span style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>Telecast Status</span>
                <div style={{ marginTop: '3px' }}>
                  <span style={{ padding: '2px 8px', borderRadius: '8px', fontWeight: 700, fontSize: '11px', ...getStatusBadgeStyle(primaryFinalVideo.telecastStatus) }}>
                    {primaryFinalVideo.telecastStatus || 'PENDING'}
                  </span>
                </div>
              </div>
              <div>
                <span style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>Telecast Channel & Episode</span>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b', marginTop: '2px' }}>
                  {primaryFinalVideo.telecastChannel || 'Not Broadcast Yet'} {primaryFinalVideo.telecastEpisode ? `(Ep: ${primaryFinalVideo.telecastEpisode})` : ''}
                </div>
                <div style={{ fontSize: '11px', color: '#64748b' }}>
                  {primaryFinalVideo.telecastDate ? new Date(primaryFinalVideo.telecastDate).toLocaleDateString('en-IN') : ''}
                </div>
              </div>
              <div>
                <span style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>Review Remarks</span>
                <div style={{ fontSize: '12px', color: '#475569', marginTop: '2px' }}>{primaryFinalVideo.remarks || primaryFinalVideo.telecastRemarks || '-'}</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* SECTION 8: DOCUMENTS & SUPPORTING FILES TABLE */}
      <div style={{ padding: '0 32px 24px 32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
          <span style={{ fontSize: '16px' }}>📄</span>
          <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#0f2942', margin: 0 }}>
            Documents & Supporting Files ({documents.length})
          </h3>
        </div>
        {documents.length === 0 ? (
          <div style={{ padding: '16px', background: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: '8px', color: '#64748b', fontSize: '13px' }}>
            No documents uploaded for this Epic ID yet.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, fontSize: '12px', border: '1px solid #cbd5e1', borderRadius: '8px', overflow: 'hidden' }}>
              <thead>
                <tr style={{ background: '#0f2942', color: '#ffffff' }}>
                  <th style={{ padding: '10px 12px', textAlign: 'left' }}>Sl.</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left' }}>Document Name</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left' }}>Document Type</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left' }}>Upload Date</th>
                  <th style={{ padding: '10px 12px', textAlign: 'center' }}>Status</th>
                  <th style={{ padding: '10px 12px', textAlign: 'center' }}>File Action</th>
                </tr>
              </thead>
              <tbody>
                {documents.map((d, idx) => (
                  <tr key={d.id} style={{ background: idx % 2 === 0 ? '#ffffff' : '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '10px 12px', borderBottom: '1px solid #e2e8f0' }}>{idx + 1}</td>
                    <td style={{ padding: '10px 12px', fontWeight: 600, borderBottom: '1px solid #e2e8f0' }}>{d.name}</td>
                    <td style={{ padding: '10px 12px', borderBottom: '1px solid #e2e8f0' }}>
                      <span style={{ background: '#f1f5f9', padding: '2px 8px', borderRadius: '4px', border: '1px solid #e2e8f0', fontSize: '11px', fontWeight: 600 }}>
                        {d.type.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px', borderBottom: '1px solid #e2e8f0' }}>{d.createdAt ? new Date(d.createdAt).toLocaleDateString('en-IN') : '-'}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'center', borderBottom: '1px solid #e2e8f0' }}>
                      <span style={{ padding: '2px 8px', borderRadius: '8px', fontWeight: 700, fontSize: '11px', ...getStatusBadgeStyle(d.status) }}>
                        {d.status || 'UPLOADED'}
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'center', borderBottom: '1px solid #e2e8f0' }}>
                      {d.filePath ? (
                        <a href={d.filePath} target="_blank" rel="noreferrer" style={{ color: '#0284c7', textDecoration: 'underline', fontWeight: 700 }}>
                          View / Download
                        </a>
                      ) : (
                        <span style={{ color: '#94a3b8' }}>Archived</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* SECTION 9: COMPLETE EPIC HISTORY LOG */}
      <div style={{ padding: '0 32px 32px 32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
          <span style={{ fontSize: '16px' }}>🛡️</span>
          <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#0f2942', margin: 0 }}>
            Complete Epic History & System Audit Log
          </h3>
        </div>
        {auditLogs.length === 0 ? (
          <div style={{ padding: '16px', background: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: '8px', color: '#64748b', fontSize: '13px' }}>
            ℹ️ No direct database audit traces logged for this specific Epic ID yet. All workflow stages and current state records displayed above are verified directly from active system entities.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, fontSize: '12px', border: '1px solid #cbd5e1', borderRadius: '8px', overflow: 'hidden' }}>
              <thead>
                <tr style={{ background: '#0f2942', color: '#ffffff' }}>
                  <th style={{ padding: '10px 12px', textAlign: 'left' }}>Timestamp</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left' }}>Action / Event</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left' }}>Entity</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left' }}>Details</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left' }}>Updated By</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.map((log: any, idx: number) => (
                  <tr key={log.id || idx} style={{ background: idx % 2 === 0 ? '#ffffff' : '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '10px 12px', borderBottom: '1px solid #e2e8f0' }}>
                      {log.createdAt ? new Date(log.createdAt).toLocaleString('en-IN') : '-'}
                    </td>
                    <td style={{ padding: '10px 12px', fontWeight: 700, color: '#0369a1', borderBottom: '1px solid #e2e8f0' }}>
                      {log.action}
                    </td>
                    <td style={{ padding: '10px 12px', borderBottom: '1px solid #e2e8f0' }}>
                      {log.entity}
                    </td>
                    <td style={{ padding: '10px 12px', color: '#334155', borderBottom: '1px solid #e2e8f0' }}>
                      {log.newData || log.previousData || `Record ID: ${log.entityId}`}
                    </td>
                    <td style={{ padding: '10px 12px', color: '#64748b', borderBottom: '1px solid #e2e8f0' }}>
                      {log.userId || 'System Administrator'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Audit Disclosure Note */}
        <div style={{ marginTop: '12px', fontSize: '11px', color: '#64748b', fontStyle: 'italic' }}>
          * Audit trail is compiled from system registration, document uploads, and production tracking records genuinely linked to {friendlyEpicId}.
        </div>

        {/* Official Sign-off Footer Bar */}
        <div style={{
          marginTop: '24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '11px',
          color: '#64748b',
          borderTop: '1px solid #e2e8f0',
          paddingTop: '14px',
          flexWrap: 'wrap',
          gap: '8px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>🛡️</span>
            <span>Official PM e-Vidya Workflow Record • National Instructional Media Institute (NIMI) • MSDE, Govt. of India</span>
          </div>
          <div style={{ fontWeight: 700, color: '#0369a1' }}>
            Verified Consolidated Report • Identity: {friendlyEpicId}
          </div>
        </div>
      </div>
    </div>
  );
}
