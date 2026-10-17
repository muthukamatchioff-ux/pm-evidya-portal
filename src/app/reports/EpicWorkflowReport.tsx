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
  const libraryVideos: any[] = entry.videoLibraries || [];
  const primaryFinalVideo = finalVideoRecords[0] || null;
  const primaryLibraryVideo = libraryVideos[0] || null;

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

  // Stage 4: Final Video / Telecast / Deliverable
  const finalStageStatus = primaryLibraryVideo
    ? 'Delivered (Catalogued)'
    : (primaryFinalVideo
        ? (primaryFinalVideo.telecastStatus === 'TELECASTED'
            ? 'Telecasted'
            : (primaryFinalVideo.finalVideoStatus === 'APPROVED' ? 'Approved' : (primaryFinalVideo.finalVideoStatus || 'Pending Delivery')))
        : 'Pending Delivery');

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
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          .print-avoid-break {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
          .print-no-break-after {
            break-after: avoid !important;
            page-break-after: avoid !important;
          }
          table {
            page-break-inside: auto;
          }
          tr {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
        }
      `}} />

      {/* SECTION 1: REPORT HEADER */}
      <div style={{
        background: 'linear-gradient(135deg, #f0f9ff 0%, #ffffff 50%, #f0fdf4 100%)',
        borderTop: '4px solid #0284c7',
        borderBottom: '2px solid #bae6fd',
        padding: '16px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '16px',
        flexWrap: 'nowrap'
      }}>
        {/* Left Branding: NIMI Logo with text below */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          width: '210px',
          flexShrink: 0
        }}>
          <img
            src="/nimi-logo.png"
            alt="NIMI Logo"
            style={{
              height: '52px',
              width: 'auto',
              objectFit: 'contain',
              marginBottom: '6px',
              filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.06))'
            }}
          />
          <div style={{
            fontSize: '11px',
            fontWeight: 800,
            color: '#0369a1',
            textTransform: 'uppercase',
            letterSpacing: '0.4px',
            lineHeight: 1.25
          }}>
            National Instructional Media Institute
          </div>
          <div style={{
            fontSize: '9.5px',
            color: '#475569',
            marginTop: '2px',
            fontWeight: 500,
            lineHeight: 1.2
          }}>
            Ministry of Skill Development & Entrepreneurship, Govt. of India
          </div>
        </div>

        {/* Center Title & Metadata */}
        <div style={{
          textAlign: 'center',
          flex: '1 1 auto',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '0 12px'
        }}>
          <h1 style={{
            fontSize: '22px',
            fontWeight: 800,
            color: '#0f2942',
            margin: '0 0 4px 0',
            letterSpacing: '-0.3px',
            lineHeight: 1.2,
            whiteSpace: 'nowrap'
          }}>
            PM e-Vidya — SME Epic Workflow Report
          </h1>
          <p style={{
            fontSize: '12.5px',
            fontWeight: 600,
            color: '#334155',
            margin: '0 0 8px 0',
            lineHeight: 1.2
          }}>
            Complete History & Details for Selected Epic ID
          </p>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            flexWrap: 'wrap',
            justifyContent: 'center'
          }}>
            <span style={{
              background: '#0284c7',
              color: '#ffffff',
              padding: '4px 12px',
              borderRadius: '20px',
              fontSize: '11.5px',
              fontWeight: 800,
              letterSpacing: '0.5px',
              boxShadow: '0 1px 3px rgba(2, 132, 199, 0.25)'
            }}>
              {friendlyEpicId}
            </span>
            <span style={{
              background: '#e0f2fe',
              color: '#0369a1',
              padding: '4px 12px',
              borderRadius: '20px',
              fontSize: '11.5px',
              fontWeight: 600,
              border: '1px solid #bae6fd'
            }}>
              📅 Generated on: {generatedDate}
            </span>
          </div>
        </div>

        {/* Right Branding: PM e-Vidya Logo (Scaled & Transparent) */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '210px',
          flexShrink: 0
        }}>
          <img
            src="/pm-evidya-logo.png"
            alt="PM e-Vidya Logo"
            style={{ 
              height: '62px', 
              width: 'auto', 
              objectFit: 'contain', 
              filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.06))' 
            }}
          />
        </div>
      </div>

      {/* SME OVERVIEW BANNER */}
      <div style={{
        background: '#f8fafc',
        borderBottom: '1px solid #e2e8f0',
        padding: '10px 28px',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '12px'
      }}>
        <div>
          <span style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>Subject Matter Expert</span>
          <div style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a', marginTop: '1px' }}>{sme.name || 'Unassigned'}</div>
          <div style={{ fontSize: '11px', color: '#475569' }}>{sme.designation || 'Expert'} • {sme.institute || 'N/A'}</div>
        </div>
        <div>
          <span style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>Trade & Module Topic</span>
          <div style={{ fontSize: '13px', fontWeight: 700, color: '#0369a1', marginTop: '1px' }}>{entry.trade || 'General'}</div>
          <div style={{ fontSize: '11px', color: '#334155' }}>{entry.topic || 'Untitled Topic'}</div>
        </div>
        <div>
          <span style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>Workflow Status</span>
          <div style={{ marginTop: '2px' }}>
            <span style={{
              display: 'inline-block',
              padding: '2px 8px',
              borderRadius: '10px',
              fontSize: '11px',
              fontWeight: 800,
              ...getStatusBadgeStyle(entry.status)
            }}>
              {entry.status || 'PENDING'}
            </span>
          </div>
        </div>
        <div>
          <span style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>Attendance Window</span>
          <div style={{ fontSize: '12px', fontWeight: 600, color: '#1e293b', marginTop: '1px' }}>
            {entry.attendanceFrom ? new Date(entry.attendanceFrom).toLocaleDateString('en-IN') : 'TBD'} to{' '}
            {entry.attendanceTo ? new Date(entry.attendanceTo).toLocaleDateString('en-IN') : 'TBD'}
          </div>
          <div style={{ fontSize: '10px', color: '#64748b' }}>Working Days: {entry.days || '-'}</div>
        </div>
      </div>

      {/* MERGED: EXECUTIVE SUMMARY METRICS & WORKFLOW LIFECYCLE TIMELINE (IN 1 TITLE & UNIFIED CONTAINER) */}
      <div className="print-avoid-break" style={{ 
        padding: '12px 28px 12px 28px',
        breakInside: 'avoid',
        pageBreakInside: 'avoid'
      }}>
        <div className="print-no-break-after" style={{ 
          fontSize: '13px', 
          fontWeight: 800, 
          color: '#0f2942', 
          textTransform: 'uppercase', 
          letterSpacing: '0.6px', 
          marginBottom: '8px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          breakAfter: 'avoid',
          pageBreakAfter: 'avoid'
        }}>
          <span>📊</span>
          <span>Executive Summary Metrics & Workflow Lifecycle Timeline</span>
        </div>

        {/* 6 KPI Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: '8px',
          marginBottom: '8px'
        }}>
          {/* Card 1: Epic ID */}
          <div style={{ padding: '8px 10px', borderRadius: '8px', background: 'linear-gradient(135deg, #ffffff 0%, #eff6ff 100%)', border: '1.5px solid #bfdbfe', borderLeft: '4px solid #2563eb' }}>
            <div style={{ fontSize: '9px', fontWeight: 700, color: '#1e40af', textTransform: 'uppercase' }}>Selected Epic ID</div>
            <div style={{ fontSize: '14px', fontWeight: 800, color: '#1e3a8a', marginTop: '2px' }}>{friendlyEpicId}</div>
            <div style={{ fontSize: '9px', color: '#2563eb', marginTop: '1px' }}>Sequence #{entry.epicSequence}</div>
          </div>

          {/* Card 2: Documents */}
          <div style={{ padding: '8px 10px', borderRadius: '8px', background: 'linear-gradient(135deg, #ffffff 0%, #ecfeff 100%)', border: '1.5px solid #a5f3fc', borderLeft: '4px solid #0891b2' }}>
            <div style={{ fontSize: '9px', fontWeight: 700, color: '#0e7490', textTransform: 'uppercase' }}>Linked Documents</div>
            <div style={{ fontSize: '18px', fontWeight: 800, color: '#155e75', marginTop: '2px' }}>{documents.length}</div>
            <div style={{ fontSize: '9px', color: '#0891b2', marginTop: '1px' }}>Verified Files Uploaded</div>
          </div>

          {/* Card 3: Shooting */}
          <div style={{ padding: '8px 10px', borderRadius: '8px', background: 'linear-gradient(135deg, #ffffff 0%, #faf5ff 100%)', border: '1.5px solid #e9d5ff', borderLeft: '4px solid #7c3aed' }}>
            <div style={{ fontSize: '9px', fontWeight: 700, color: '#6b21a8', textTransform: 'uppercase' }}>Shooting Schedules</div>
            <div style={{ fontSize: '18px', fontWeight: 800, color: '#581c87', marginTop: '2px' }}>{shootingSchedules.length}</div>
            <div style={{ fontSize: '9px', color: '#7c3aed', marginTop: '1px' }}>Status: {shootingStageStatus}</div>
          </div>

          {/* Card 4: Editing */}
          <div style={{ padding: '8px 10px', borderRadius: '8px', background: 'linear-gradient(135deg, #ffffff 0%, #eef2ff 100%)', border: '1.5px solid #c7d2fe', borderLeft: '4px solid #4f46e5' }}>
            <div style={{ fontSize: '9px', fontWeight: 700, color: '#3730a3', textTransform: 'uppercase' }}>Editing Records</div>
            <div style={{ fontSize: '18px', fontWeight: 800, color: '#312e81', marginTop: '2px' }}>{videoEditorRecords.length}</div>
            <div style={{ fontSize: '9px', color: '#4f46e5', marginTop: '1px' }}>Status: {editingStageStatus}</div>
          </div>

          {/* Card 5: Animation */}
          <div style={{ padding: '8px 10px', borderRadius: '8px', background: 'linear-gradient(135deg, #ffffff 0%, #fffbeb 100%)', border: '1.5px solid #fde68a', borderLeft: '4px solid #d97706' }}>
            <div style={{ fontSize: '9px', fontWeight: 700, color: '#92400e', textTransform: 'uppercase' }}>Animation Records</div>
            <div style={{ fontSize: '18px', fontWeight: 800, color: '#78350f', marginTop: '2px' }}>{animationRecords.length}</div>
            <div style={{ fontSize: '9px', color: '#d97706', marginTop: '1px' }}>Status: {animationStageStatus}</div>
          </div>

          {/* Card 6: Final Video */}
          <div style={{ padding: '8px 10px', borderRadius: '8px', background: 'linear-gradient(135deg, #ffffff 0%, #ecfdf5 100%)', border: '1.5px solid #a7f3d0', borderLeft: '4px solid #059669' }}>
            <div style={{ fontSize: '9px', fontWeight: 700, color: '#065f46', textTransform: 'uppercase' }}>Final Video & Duration</div>
            <div style={{ fontSize: '14px', fontWeight: 800, color: '#064e3b', marginTop: '2px' }}>
              {primaryFinalVideo?.finalDuration || (entry.videoLibraries?.[0]?.duration) || 'Not Recorded'}
            </div>
            <div style={{ fontSize: '9px', color: '#059669', marginTop: '1px' }}>
              Status: {finalStageStatus}
            </div>
          </div>
        </div>

        {/* 4 Workflow Timeline Stages */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '8px'
        }}>
          {/* Stage 1 */}
          <div style={{ padding: '8px 12px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2px' }}>
              <span style={{ fontSize: '11px', fontWeight: 800, color: '#0f2942' }}>1. Shooting Schedule</span>
              <span style={{ fontSize: '10px', padding: '1px 6px', borderRadius: '6px', fontWeight: 700, ...getStatusBadgeStyle(shootingStageStatus) }}>
                {shootingStageStatus}
              </span>
            </div>
            <div style={{ fontSize: '11px', color: '#334155' }}>
              <strong>Date:</strong> {shootingRecord?.shootDate ? new Date(shootingRecord.shootDate).toLocaleDateString('en-IN') : 'Not Scheduled'}
            </div>
            <div style={{ fontSize: '10px', color: '#64748b', marginTop: '1px' }}>
              Cameraman: {shootingRecord?.cameraman || 'Unassigned'}
            </div>
          </div>

          {/* Stage 2 */}
          <div style={{ padding: '8px 12px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2px' }}>
              <span style={{ fontSize: '11px', fontWeight: 800, color: '#0f2942' }}>2. Video Editing</span>
              <span style={{ fontSize: '10px', padding: '1px 6px', borderRadius: '6px', fontWeight: 700, ...getStatusBadgeStyle(editingStageStatus) }}>
                {editingStageStatus}
              </span>
            </div>
            <div style={{ fontSize: '11px', color: '#334155' }}>
              <strong>Editor:</strong> {editingRecord?.editorName || 'Not Assigned'}
            </div>
          </div>

          {/* Stage 3 */}
          <div style={{ padding: '8px 12px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2px' }}>
              <span style={{ fontSize: '11px', fontWeight: 800, color: '#0f2942' }}>3. Final Video & Telecast</span>
              <span style={{ fontSize: '10px', padding: '1px 6px', borderRadius: '6px', fontWeight: 700, ...getStatusBadgeStyle(finalStageStatus) }}>
                {finalStageStatus}
              </span>
            </div>
            <div style={{ fontSize: '11px', color: '#334155' }}>
              <strong>Approval:</strong> {primaryFinalVideo?.finalApproval || 'Pending Approval'}
            </div>
            <div style={{ fontSize: '10px', color: '#64748b', marginTop: '1px' }}>
              Channel: {primaryFinalVideo?.telecastChannel || 'TBD'} • Ep: {primaryFinalVideo?.telecastEpisode || '-'}
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 4: SHOOTING SCHEDULE DETAILS TABLE */}
      <div className="print-avoid-break" style={{ padding: '0 28px 12px 28px', breakInside: 'avoid', pageBreakInside: 'avoid' }}>
        <div className="print-no-break-after" style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px', breakAfter: 'avoid', pageBreakAfter: 'avoid' }}>
          <span style={{ fontSize: '14px' }}>🎬</span>
          <h3 style={{ fontSize: '13px', fontWeight: 800, color: '#0f2942', margin: 0 }}>
            Shooting Schedule Details ({shootingSchedules.length})
          </h3>
        </div>
        {shootingSchedules.length === 0 ? (
          <div style={{ padding: '10px 14px', background: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: '6px', color: '#64748b', fontSize: '11px' }}>
            No shooting schedule records created for this Epic ID yet.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, fontSize: '11px', border: '1px solid #cbd5e1', borderRadius: '6px', overflow: 'hidden' }}>
              <thead>
                <tr style={{ background: '#0f2942', color: '#ffffff' }}>
                  <th style={{ padding: '6px 10px', textAlign: 'left' }}>Sl.</th>
                  <th style={{ padding: '6px 10px', textAlign: 'left' }}>Video Title</th>
                  <th style={{ padding: '6px 10px', textAlign: 'left' }}>Prod Start Date</th>
                  <th style={{ padding: '6px 10px', textAlign: 'left' }}>Prod End Date</th>
                  <th style={{ padding: '6px 10px', textAlign: 'left' }}>Location</th>
                  <th style={{ padding: '6px 10px', textAlign: 'left' }}>Cameraman</th>
                  <th style={{ padding: '6px 10px', textAlign: 'center' }}>Status</th>
                  <th style={{ padding: '6px 10px', textAlign: 'left' }}>Production Notes</th>
                </tr>
              </thead>
              <tbody>
                {shootingSchedules.map((s, idx) => (
                  <tr key={s.id} style={{ background: idx % 2 === 0 ? '#ffffff' : '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '6px 10px', borderBottom: '1px solid #e2e8f0' }}>{idx + 1}</td>
                    <td style={{ padding: '6px 10px', fontWeight: 600, borderBottom: '1px solid #e2e8f0' }}>{s.videoTitle}</td>
                    <td style={{ padding: '6px 10px', borderBottom: '1px solid #e2e8f0' }}>{s.scheduledStart ? new Date(s.scheduledStart).toLocaleDateString('en-IN') : (s.shootDate ? new Date(s.shootDate).toLocaleDateString('en-IN') : '-')}</td>
                    <td style={{ padding: '6px 10px', borderBottom: '1px solid #e2e8f0' }}>{s.scheduledEnd ? new Date(s.scheduledEnd).toLocaleDateString('en-IN') : '-'}</td>
                    <td style={{ padding: '6px 10px', borderBottom: '1px solid #e2e8f0' }}>{s.location || '-'}</td>
                    <td style={{ padding: '6px 10px', borderBottom: '1px solid #e2e8f0' }}>{s.cameraman || '-'}</td>
                    <td style={{ padding: '6px 10px', textAlign: 'center', borderBottom: '1px solid #e2e8f0' }}>
                      <span style={{ padding: '1px 6px', borderRadius: '6px', fontWeight: 700, fontSize: '10px', ...getStatusBadgeStyle(s.status) }}>
                        {s.status || 'PLANNED'}
                      </span>
                    </td>
                    <td style={{ padding: '6px 10px', color: '#475569', borderBottom: '1px solid #e2e8f0' }}>{s.productionNotes || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* SECTION 5: VIDEO EDITOR DETAILS TABLE */}
      <div className="print-avoid-break" style={{ padding: '0 28px 12px 28px', breakInside: 'avoid', pageBreakInside: 'avoid' }}>
        <div className="print-no-break-after" style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px', breakAfter: 'avoid', pageBreakAfter: 'avoid' }}>
          <span style={{ fontSize: '14px' }}>✂️</span>
          <h3 style={{ fontSize: '13px', fontWeight: 800, color: '#0f2942', margin: 0 }}>
            Video Editing Records ({videoEditorRecords.length})
          </h3>
        </div>
        {videoEditorRecords.length === 0 ? (
          <div style={{ padding: '10px 14px', background: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: '6px', color: '#64748b', fontSize: '11px' }}>
            No video editing records created for this Epic ID yet.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, fontSize: '11px', border: '1px solid #cbd5e1', borderRadius: '6px', overflow: 'hidden' }}>
              <thead>
                <tr style={{ background: '#0f2942', color: '#ffffff' }}>
                  <th style={{ padding: '6px 10px', textAlign: 'left' }}>Sl.</th>
                  <th style={{ padding: '6px 10px', textAlign: 'left' }}>Editor Name</th>
                  <th style={{ padding: '6px 10px', textAlign: 'left' }}>Assigned Video</th>
                  <th style={{ padding: '6px 10px', textAlign: 'left' }}>Post-Prod Start Date</th>
                  <th style={{ padding: '6px 10px', textAlign: 'left' }}>Post-Prod End Date</th>
                  <th style={{ padding: '6px 10px', textAlign: 'left' }}>Duration</th>
                  <th style={{ padding: '6px 10px', textAlign: 'center' }}>Status</th>
                  <th style={{ padding: '6px 10px', textAlign: 'left' }}>Rough Cut</th>
                  <th style={{ padding: '6px 10px', textAlign: 'left' }}>Final Cut</th>
                  <th style={{ padding: '6px 10px', textAlign: 'left' }}>Review Comments</th>
                </tr>
              </thead>
              <tbody>
                {videoEditorRecords.map((e, idx) => {
                  const endDate = e.editingEndDate || (e.reviewComments && e.reviewComments.startsWith('[END:') ? e.reviewComments.match(/^\[END:([^\]]+)\]/)?.[1] : null);
                  const cleanComments = e.reviewComments ? e.reviewComments.replace(/^\[END:[^\]]+\]\s*/, '') : '-';

                  return (
                    <tr key={e.id} style={{ background: idx % 2 === 0 ? '#ffffff' : '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '6px 10px', borderBottom: '1px solid #e2e8f0' }}>{idx + 1}</td>
                      <td style={{ padding: '6px 10px', fontWeight: 600, borderBottom: '1px solid #e2e8f0' }}>{e.editorName || '-'}</td>
                      <td style={{ padding: '6px 10px', borderBottom: '1px solid #e2e8f0' }}>{e.assignedVideo || '-'}</td>
                      <td style={{ padding: '6px 10px', borderBottom: '1px solid #e2e8f0' }}>{e.editingStartDate ? new Date(e.editingStartDate).toLocaleDateString('en-IN') : '-'}</td>
                      <td style={{ padding: '6px 10px', borderBottom: '1px solid #e2e8f0' }}>{endDate ? new Date(endDate).toLocaleDateString('en-IN') : '-'}</td>
                      <td style={{ padding: '6px 10px', fontWeight: 700, borderBottom: '1px solid #e2e8f0' }}>{e.duration || '-'}</td>
                      <td style={{ padding: '6px 10px', textAlign: 'center', borderBottom: '1px solid #e2e8f0' }}>
                        <span style={{ padding: '1px 6px', borderRadius: '6px', fontWeight: 700, fontSize: '10px', ...getStatusBadgeStyle(e.status) }}>
                          {e.status || 'NOT_STARTED'}
                        </span>
                      </td>
                      <td style={{ padding: '6px 10px', borderBottom: '1px solid #e2e8f0' }}>
                        {e.roughCutLink ? <a href={e.roughCutLink} target="_blank" rel="noreferrer" style={{ color: '#2563eb', textDecoration: 'underline' }}>View Link</a> : '-'}
                      </td>
                      <td style={{ padding: '6px 10px', borderBottom: '1px solid #e2e8f0' }}>
                        {e.finalCutLink ? <a href={e.finalCutLink} target="_blank" rel="noreferrer" style={{ color: '#059669', textDecoration: 'underline' }}>View Link</a> : '-'}
                      </td>
                      <td style={{ padding: '6px 10px', color: '#475569', borderBottom: '1px solid #e2e8f0' }}>{cleanComments}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* SECTION 6: ANIMATION DETAILS TABLE */}
      <div className="print-avoid-break" style={{ padding: '0 28px 12px 28px', breakInside: 'avoid', pageBreakInside: 'avoid' }}>
        <div className="print-no-break-after" style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px', breakAfter: 'avoid', pageBreakAfter: 'avoid' }}>
          <span style={{ fontSize: '14px' }}>🎨</span>
          <h3 style={{ fontSize: '13px', fontWeight: 800, color: '#0f2942', margin: 0 }}>
            2D Animation Records ({animationRecords.length})
          </h3>
        </div>
        {animationRecords.length === 0 ? (
          <div style={{ padding: '10px 14px', background: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: '6px', color: '#64748b', fontSize: '11px' }}>
            No animation records created for this Epic ID yet.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, fontSize: '11px', border: '1px solid #cbd5e1', borderRadius: '6px', overflow: 'hidden' }}>
              <thead>
                <tr style={{ background: '#0f2942', color: '#ffffff' }}>
                  <th style={{ padding: '6px 10px', textAlign: 'left' }}>Sl.</th>
                  <th style={{ padding: '6px 10px', textAlign: 'left' }}>Animator Name</th>
                  <th style={{ padding: '6px 10px', textAlign: 'left' }}>Assigned Video</th>
                  <th style={{ padding: '6px 10px', textAlign: 'left' }}>Start Date</th>
                  <th style={{ padding: '6px 10px', textAlign: 'left' }}>End Date</th>
                  <th style={{ padding: '6px 10px', textAlign: 'center' }}>Status</th>
                  <th style={{ padding: '6px 10px', textAlign: 'left' }}>Final Animation File</th>
                </tr>
              </thead>
              <tbody>
                {animationRecords.map((a, idx) => (
                  <tr key={a.id} style={{ background: idx % 2 === 0 ? '#ffffff' : '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '6px 10px', borderBottom: '1px solid #e2e8f0' }}>{idx + 1}</td>
                    <td style={{ padding: '6px 10px', fontWeight: 600, borderBottom: '1px solid #e2e8f0' }}>{a.animatorName || '-'}</td>
                    <td style={{ padding: '6px 10px', borderBottom: '1px solid #e2e8f0' }}>{a.assignedVideo || '-'}</td>
                    <td style={{ padding: '6px 10px', borderBottom: '1px solid #e2e8f0' }}>{a.animationStartDate ? new Date(a.animationStartDate).toLocaleDateString('en-IN') : '-'}</td>
                    <td style={{ padding: '6px 10px', borderBottom: '1px solid #e2e8f0' }}>{a.animationEndDate ? new Date(a.animationEndDate).toLocaleDateString('en-IN') : '-'}</td>
                    <td style={{ padding: '6px 10px', textAlign: 'center', borderBottom: '1px solid #e2e8f0' }}>
                      <span style={{ padding: '1px 6px', borderRadius: '6px', fontWeight: 700, fontSize: '10px', ...getStatusBadgeStyle(a.status) }}>
                        {a.status || 'NOT_STARTED'}
                      </span>
                    </td>
                    <td style={{ padding: '6px 10px', borderBottom: '1px solid #e2e8f0' }}>{a.finalAnimationFile || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* SECTION 7: FINAL VIDEO DELIVERABLE & TELECAST DETAILS */}
      <div className="print-avoid-break" style={{ padding: '0 28px 12px 28px', breakInside: 'avoid', pageBreakInside: 'avoid' }}>
        <div className="print-no-break-after" style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px', breakAfter: 'avoid', pageBreakAfter: 'avoid' }}>
          <span style={{ fontSize: '14px' }}>📺</span>
          <h3 style={{ fontSize: '13px', fontWeight: 800, color: '#0f2942', margin: 0 }}>
            Final Video Deliverable & Video Content Library Link
          </h3>
        </div>

        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px 16px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
            {/* Library Link(s) */}
            <div>
              <span style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>
                Authoritative Library Video{libraryVideos.length > 1 ? `s (${libraryVideos.length})` : ''}
              </span>
              <div style={{ marginTop: '2px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {libraryVideos.length > 0 ? (
                  libraryVideos.map((v: any, vIdx: number) => (
                    <div key={v.id || vIdx}>
                      {v.videoLink ? (
                        <a 
                          href={v.videoLink} 
                          target="_blank" 
                          rel="noreferrer"
                          style={{ fontSize: '12px', fontWeight: 700, color: '#0284c7', textDecoration: 'underline', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                        >
                          <span>🔗</span> Watch Final Video {libraryVideos.length > 1 ? `#${vIdx + 1}` : ''}
                        </a>
                      ) : (
                        <span style={{ fontSize: '12px', color: '#94a3b8', fontStyle: 'italic' }}>Pending Delivery</span>
                      )}
                      <div style={{ fontSize: '10px', color: '#475569', marginTop: '1px' }}>
                        {v.title || entry.topic || 'PM e-Vidya Video'}
                      </div>
                    </div>
                  ))
                ) : primaryFinalVideo?.finalVideoFile ? (
                  <div>
                    <a 
                      href={primaryFinalVideo.finalVideoFile} 
                      target="_blank" 
                      rel="noreferrer"
                      style={{ fontSize: '12px', fontWeight: 700, color: '#0284c7', textDecoration: 'underline', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                    >
                      <span>🔗</span> Watch Final Video
                    </a>
                    <div style={{ fontSize: '10px', color: '#475569', marginTop: '1px' }}>
                      {entry.topic || 'PM e-Vidya Video'}
                    </div>
                  </div>
                ) : (
                  <span style={{ fontSize: '12px', color: '#94a3b8', fontStyle: 'italic' }}>Pending Delivery in Library</span>
                )}
              </div>
            </div>

            {/* Duration */}
            <div>
              <span style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>Final Duration</span>
              <div style={{ fontSize: '14px', fontWeight: 800, color: '#0284c7', marginTop: '2px' }}>
                {primaryLibraryVideo?.duration || primaryFinalVideo?.finalDuration || '-'}
              </div>
            </div>

            {/* Delivery Date */}
            <div>
              <span style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>Delivery Date</span>
              <div style={{ fontSize: '12px', fontWeight: 600, color: '#0f172a', marginTop: '2px' }}>
                {primaryLibraryVideo?.createdAt 
                  ? new Date(primaryLibraryVideo.createdAt).toLocaleDateString('en-IN')
                  : (primaryFinalVideo?.approvalDate ? new Date(primaryFinalVideo.approvalDate).toLocaleDateString('en-IN') : 'Pending')}
              </div>
            </div>

            {/* Delivery Status */}
            <div>
              <span style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>Delivery Status</span>
              <div style={{ marginTop: '2px' }}>
                <span style={{
                  padding: '2px 8px',
                  borderRadius: '8px',
                  fontWeight: 700,
                  fontSize: '10px',
                  ...getStatusBadgeStyle(primaryLibraryVideo ? 'COMPLETED' : (primaryFinalVideo?.finalVideoStatus || 'PENDING'))
                }}>
                  {primaryLibraryVideo ? 'DELIVERED & CATALOGUED' : (primaryFinalVideo?.finalVideoStatus || 'PENDING DELIVERY')}
                </span>
              </div>
            </div>

            {/* Telecast Details */}
            <div>
              <span style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>Telecast Channel & Episode</span>
              <div style={{ fontSize: '12px', fontWeight: 600, color: '#1e293b', marginTop: '2px' }}>
                {primaryFinalVideo?.telecastChannel || 'Not Broadcast Yet'} {primaryFinalVideo?.telecastEpisode ? `(Ep: ${primaryFinalVideo.telecastEpisode})` : ''}
              </div>
              <div style={{ fontSize: '10px', color: '#64748b' }}>
                {primaryFinalVideo?.telecastDate ? new Date(primaryFinalVideo.telecastDate).toLocaleDateString('en-IN') : ''}
              </div>
            </div>

            {/* Remarks */}
            <div>
              <span style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>Remarks</span>
              <div style={{ fontSize: '11px', color: '#475569', marginTop: '2px' }}>
                {primaryFinalVideo?.remarks || primaryFinalVideo?.telecastRemarks || '-'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 8: DOCUMENTS & SUPPORTING FILES TABLE */}
      <div className="print-avoid-break" style={{ padding: '0 28px 12px 28px', breakInside: 'avoid', pageBreakInside: 'avoid' }}>
        <div className="print-no-break-after" style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px', breakAfter: 'avoid', pageBreakAfter: 'avoid' }}>
          <span style={{ fontSize: '14px' }}>📄</span>
          <h3 style={{ fontSize: '13px', fontWeight: 800, color: '#0f2942', margin: 0 }}>
            Documents & Supporting Files ({documents.length})
          </h3>
        </div>
        {documents.length === 0 ? (
          <div style={{ padding: '10px 14px', background: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: '6px', color: '#64748b', fontSize: '11px' }}>
            No documents uploaded for this Epic ID yet.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, fontSize: '11px', border: '1px solid #cbd5e1', borderRadius: '6px', overflow: 'hidden' }}>
              <thead>
                <tr style={{ background: '#0f2942', color: '#ffffff' }}>
                  <th style={{ padding: '6px 10px', textAlign: 'left' }}>Sl.</th>
                  <th style={{ padding: '6px 10px', textAlign: 'left' }}>Document Name</th>
                  <th style={{ padding: '6px 10px', textAlign: 'left' }}>Document Type</th>
                  <th style={{ padding: '6px 10px', textAlign: 'left' }}>Upload Date</th>
                  <th style={{ padding: '6px 10px', textAlign: 'center' }}>Status</th>
                  <th style={{ padding: '6px 10px', textAlign: 'center' }}>File Action</th>
                </tr>
              </thead>
              <tbody>
                {documents.map((d, idx) => (
                  <tr key={d.id} style={{ background: idx % 2 === 0 ? '#ffffff' : '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '6px 10px', borderBottom: '1px solid #e2e8f0' }}>{idx + 1}</td>
                    <td style={{ padding: '6px 10px', fontWeight: 600, borderBottom: '1px solid #e2e8f0' }}>{d.name}</td>
                    <td style={{ padding: '6px 10px', borderBottom: '1px solid #e2e8f0' }}>
                      <span style={{ background: '#f1f5f9', padding: '1px 6px', borderRadius: '4px', border: '1px solid #e2e8f0', fontSize: '10px', fontWeight: 600 }}>
                        {d.type.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td style={{ padding: '6px 10px', borderBottom: '1px solid #e2e8f0' }}>{d.createdAt ? new Date(d.createdAt).toLocaleDateString('en-IN') : '-'}</td>
                    <td style={{ padding: '6px 10px', textAlign: 'center', borderBottom: '1px solid #e2e8f0' }}>
                      <span style={{ padding: '1px 6px', borderRadius: '6px', fontWeight: 700, fontSize: '10px', ...getStatusBadgeStyle(d.status) }}>
                        {d.status || 'UPLOADED'}
                      </span>
                    </td>
                    <td style={{ padding: '6px 10px', textAlign: 'center', borderBottom: '1px solid #e2e8f0' }}>
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
      <div className="print-avoid-break" style={{ padding: '0 28px 18px 28px', breakInside: 'avoid', pageBreakInside: 'avoid' }}>
        <div className="print-no-break-after" style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px', breakAfter: 'avoid', pageBreakAfter: 'avoid' }}>
          <span style={{ fontSize: '14px' }}>🛡️</span>
          <h3 style={{ fontSize: '13px', fontWeight: 800, color: '#0f2942', margin: 0 }}>
            Complete Epic History & System Audit Log
          </h3>
        </div>
        {auditLogs.length === 0 ? (
          <div style={{ padding: '10px 14px', background: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: '6px', color: '#64748b', fontSize: '11px' }}>
            ℹ️ No direct database audit traces logged for this specific Epic ID yet. All workflow stages and current state records displayed above are verified directly from active system entities.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, fontSize: '11px', border: '1px solid #cbd5e1', borderRadius: '6px', overflow: 'hidden' }}>
              <thead>
                <tr style={{ background: '#0f2942', color: '#ffffff' }}>
                  <th style={{ padding: '6px 10px', textAlign: 'left' }}>Timestamp</th>
                  <th style={{ padding: '6px 10px', textAlign: 'left' }}>Action / Event</th>
                  <th style={{ padding: '6px 10px', textAlign: 'left' }}>Entity</th>
                  <th style={{ padding: '6px 10px', textAlign: 'left' }}>Details</th>
                  <th style={{ padding: '6px 10px', textAlign: 'left' }}>Updated By</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.map((log: any, idx: number) => (
                  <tr key={log.id || idx} style={{ background: idx % 2 === 0 ? '#ffffff' : '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '6px 10px', borderBottom: '1px solid #e2e8f0' }}>
                      {log.createdAt ? new Date(log.createdAt).toLocaleString('en-IN') : '-'}
                    </td>
                    <td style={{ padding: '6px 10px', fontWeight: 700, color: '#0369a1', borderBottom: '1px solid #e2e8f0' }}>
                      {log.action}
                    </td>
                    <td style={{ padding: '6px 10px', borderBottom: '1px solid #e2e8f0' }}>
                      {log.entity}
                    </td>
                    <td style={{ padding: '6px 10px', color: '#334155', borderBottom: '1px solid #e2e8f0' }}>
                      {log.newData || log.previousData || `Record ID: ${log.entityId}`}
                    </td>
                    <td style={{ padding: '6px 10px', color: '#64748b', borderBottom: '1px solid #e2e8f0' }}>
                      {log.userId || 'System Administrator'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Audit Disclosure Note */}
        <div style={{ marginTop: '8px', fontSize: '10px', color: '#64748b', fontStyle: 'italic' }}>
          * Audit trail is compiled from system registration, document uploads, and production tracking records genuinely linked to {friendlyEpicId}.
        </div>

        {/* Official Sign-off Footer Bar */}
        <div style={{
          marginTop: '14px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '10px',
          color: '#64748b',
          borderTop: '1px solid #e2e8f0',
          paddingTop: '8px',
          flexWrap: 'wrap',
          gap: '6px'
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
