"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import UploadButton from './UploadButton';
import { updateSMERecord, deleteSMEWorkEntry } from './actions';

export default function UnifiedSmeGeneratorClient({ sme, role }: { sme: any; role?: string }) {
  const entry = sme.workEntries?.[0] || {};
  const getEpicId = (epicSequence: number) =>
    `EPIC-2026-PMeVidya ${String(epicSequence || 1).padStart(2, '0')}`;

  const currentEpicId = getEpicId(entry.epicSequence || 1);
  const isViewer = role === 'VIEWER';

  // Form State for SME Master Identity
  const [smeName, setSmeName] = useState(sme.name || '');
  const [smeDesignation, setSmeDesignation] = useState(sme.designation || '');
  const [smeInst, setSmeInst] = useState(sme.institute || '');
  const [smePlace, setSmePlace] = useState(sme.location || '');
  const [smeAddress, setSmeAddress] = useState(sme.address || '');
  const [trade, setTrade] = useState(entry.trade || '');
  const [topic, setTopic] = useState(entry.topic || '');

  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const existingAttendanceDoc = (entry.documents || []).find(
    (d: any) => d.type === 'SME_ATTENDANCE' || d.type === 'ATTENDANCE_COPY'
  );

  const showToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 3500);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isViewer) return;

    setIsSaving(true);
    try {
      const res = await updateSMERecord(sme.id, entry.id, {
        smeName,
        smeDesignation,
        smeInst,
        smePlace,
        smeAddress,
        trade,
        topic,
        startDate: entry.attendanceFrom ? new Date(entry.attendanceFrom).toISOString().split('T')[0] : null,
        endDate: entry.attendanceTo ? new Date(entry.attendanceTo).toISOString().split('T')[0] : null,
        totalDays: entry.days || 0,
        ratePerDay: entry.ratePerDay || 0,
        taAmount: entry.taAmount || 0,
        otherAmount: entry.otherAmount || 0,
      });

      if (res.success) {
        showToast('✓ SME Master Record saved successfully!');
      } else {
        alert('Error saving SME record: ' + (res.error || 'Failed to save'));
      }
    } catch (err: any) {
      console.error(err);
      alert('Error saving SME record');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!entry.id) return;
    if (
      !window.confirm(
        `Are you sure you want to delete this SME Work Entry for "${smeName}"?\n\nThis will permanently remove this record.`
      )
    ) {
      return;
    }

    setIsDeleting(true);
    try {
      const res = await deleteSMEWorkEntry(entry.id);
      if (res.success) {
        alert('SME Entry deleted successfully.');
        window.location.href = '/smes';
      } else {
        alert('Error deleting entry: ' + (res.error || 'Failed to delete'));
      }
    } catch (err) {
      console.error(err);
      alert('Error deleting SME entry');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Toast */}
      {successToast && (
        <div
          style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
            zIndex: 9999,
            background: '#166534',
            color: 'white',
            padding: '12px 20px',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            fontWeight: 700,
            fontSize: '13.5px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <span>✅</span>
          <span>{successToast}</span>
        </div>
      )}

      {/* Prominent Link Banner to SME Document Workflow */}
      <div
        style={{
          background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
          border: '1.5px solid #93c5fd',
          borderRadius: '12px',
          padding: '18px 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
          boxShadow: '0 2px 6px rgba(37,99,235,0.08)'
        }}
      >
        <div style={{ flex: 1, minWidth: '280px' }}>
          <div
            style={{
              fontWeight: 800,
              fontSize: '16px',
              color: '#1e40af',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <span>✉️</span> SME Document Workflow & Official Letters
          </div>
          <div style={{ fontSize: '13px', color: '#1e3a8a', marginTop: '4px', lineHeight: '1.5' }}>
            Approval Letters, Work Completion Certificates, and Remuneration Notes for <strong>{currentEpicId}</strong> are now managed centrally in the dedicated Communications workflow.
          </div>
        </div>

        <Link
          href={`/generator/deputation?epicId=${currentEpicId}`}
          style={{
            background: '#2563eb',
            color: 'white',
            padding: '11px 22px',
            borderRadius: '8px',
            fontWeight: 700,
            fontSize: '14px',
            textDecoration: 'none',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 3px 6px rgba(37,99,235,0.25)',
            transition: 'all 0.2s'
          }}
        >
          <span>✉️ Open SME Document Workflow ({currentEpicId}) &rarr;</span>
        </Link>
      </div>

      {/* SME Master Details Card */}
      <div
        style={{
          background: 'white',
          borderRadius: '12px',
          border: '1.5px solid #e2e8f0',
          padding: '24px',
          boxShadow: '0 2px 6px rgba(0,0,0,0.04)'
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingBottom: '16px',
            borderBottom: '1.5px solid #f1f5f9',
            marginBottom: '20px',
            flexWrap: 'wrap',
            gap: '12px'
          }}
        >
          <div>
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>
              SME Master Information
            </h2>
            <div style={{ fontSize: '13px', color: '#64748b', marginTop: '3px' }}>
              Single Source of Truth for {currentEpicId} identity and institutional records
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <Link
              href="/smes"
              style={{
                background: '#ffffff',
                color: '#475569',
                border: '1.5px solid #cbd5e1',
                padding: '8px 16px',
                borderRadius: '6px',
                textDecoration: 'none',
                fontSize: '13px',
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              &larr; Back to SME Records
            </Link>

            {role === 'ADMIN' && entry.id && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting || isSaving}
                style={{
                  background: '#dc2626',
                  color: 'white',
                  padding: '8px 16px',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: isDeleting || isSaving ? 'not-allowed' : 'pointer',
                  fontWeight: 700,
                  fontSize: '13px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                {isDeleting ? 'Deleting...' : '🗑️ Delete Entry'}
              </button>
            )}

            {!isViewer ? (
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving || isDeleting}
                style={{
                  background: '#16a34a',
                  color: 'white',
                  padding: '8px 20px',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: isSaving || isDeleting ? 'not-allowed' : 'pointer',
                  fontWeight: 700,
                  fontSize: '13px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 2px 4px rgba(22, 163, 74, 0.2)'
                }}
              >
                {isSaving ? 'Saving...' : '💾 Save Changes'}
              </button>
            ) : (
              <span
                style={{
                  fontSize: '12px',
                  background: '#f1f5f9',
                  border: '1px solid #cbd5e1',
                  padding: '6px 12px',
                  borderRadius: '4px',
                  color: '#64748b',
                  fontWeight: 600
                }}
              >
                🔒 Read-Only
              </span>
            )}
          </div>
        </div>

        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                SME Full Name
              </label>
              <input
                type="text"
                value={smeName}
                onChange={e => !isViewer && setSmeName(e.target.value)}
                readOnly={isViewer}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1.5px solid #cbd5e1',
                  borderRadius: '6px',
                  fontSize: '13.5px',
                  boxSizing: 'border-box',
                  background: isViewer ? '#f8fafc' : 'white'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                Designation
              </label>
              <input
                type="text"
                value={smeDesignation}
                onChange={e => !isViewer && setSmeDesignation(e.target.value)}
                readOnly={isViewer}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1.5px solid #cbd5e1',
                  borderRadius: '6px',
                  fontSize: '13.5px',
                  boxSizing: 'border-box',
                  background: isViewer ? '#f8fafc' : 'white'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                Institute / Organization
              </label>
              <input
                type="text"
                value={smeInst}
                onChange={e => !isViewer && setSmeInst(e.target.value)}
                readOnly={isViewer}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1.5px solid #cbd5e1',
                  borderRadius: '6px',
                  fontSize: '13.5px',
                  boxSizing: 'border-box',
                  background: isViewer ? '#f8fafc' : 'white'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                Location (City, State)
              </label>
              <input
                type="text"
                value={smePlace}
                onChange={e => !isViewer && setSmePlace(e.target.value)}
                readOnly={isViewer}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1.5px solid #cbd5e1',
                  borderRadius: '6px',
                  fontSize: '13.5px',
                  boxSizing: 'border-box',
                  background: isViewer ? '#f8fafc' : 'white'
                }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
              Full Address
            </label>
            <input
              type="text"
              value={smeAddress}
              onChange={e => !isViewer && setSmeAddress(e.target.value)}
              readOnly={isViewer}
              placeholder="Door No., Street, Landmark, District, State, Pincode"
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1.5px solid #cbd5e1',
                borderRadius: '6px',
                fontSize: '13.5px',
                boxSizing: 'border-box',
                background: isViewer ? '#f8fafc' : 'white'
              }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                Assigned Trade
              </label>
              <input
                type="text"
                value={trade}
                onChange={e => !isViewer && setTrade(e.target.value)}
                readOnly={isViewer}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1.5px solid #cbd5e1',
                  borderRadius: '6px',
                  fontSize: '13.5px',
                  boxSizing: 'border-box',
                  background: isViewer ? '#f8fafc' : 'white'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                Main Topic / Domain
              </label>
              <input
                type="text"
                value={topic}
                onChange={e => !isViewer && setTopic(e.target.value)}
                readOnly={isViewer}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1.5px solid #cbd5e1',
                  borderRadius: '6px',
                  fontSize: '13.5px',
                  boxSizing: 'border-box',
                  background: isViewer ? '#f8fafc' : 'white'
                }}
              />
            </div>
          </div>
        </form>
      </div>

      {/* Attendance Copy Card */}
      <div
        style={{
          background: '#f8fafc',
          border: '1.5px solid #e2e8f0',
          borderRadius: '10px',
          padding: '16px 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '24px' }}>📋</span>
          <div>
            <div style={{ fontWeight: 700, fontSize: '14px', color: '#1e293b' }}>
              Daily Studio / Classroom Shooting Attendance
            </div>
            <div style={{ fontSize: '12px', color: '#64748b' }}>
              Physical signed attendance sheet uploaded from the studio shoot
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <span
            style={{
              fontSize: '11.5px',
              fontWeight: 700,
              padding: '4px 10px',
              borderRadius: '6px',
              background: existingAttendanceDoc ? '#dcfce7' : '#fff7ed',
              color: existingAttendanceDoc ? '#166534' : '#c2410c',
              border: existingAttendanceDoc ? '1px solid #bbf7d0' : '1px solid #fed7aa'
            }}
          >
            {existingAttendanceDoc ? '✓ Attendance Uploaded' : '⚠️ No Attendance File'}
          </span>

          {existingAttendanceDoc?.filePath && (
            <a
              href={existingAttendanceDoc.filePath}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                background: '#ffffff',
                color: '#0369a1',
                border: '1px solid #cbd5e1',
                padding: '6px 14px',
                borderRadius: '6px',
                textDecoration: 'none',
                fontWeight: 600,
                fontSize: '12.5px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              🔗 View File
            </a>
          )}

          {!isViewer && (
            <UploadButton
              smeId={sme.id}
              workEntryId={entry.id}
              type="SME_ATTENDANCE"
              label="📤 Upload Attendance"
              style={{
                background: '#ffffff',
                color: '#334155',
                border: '1px solid #cbd5e1',
                padding: '6px 14px',
                borderRadius: '6px',
                fontSize: '12.5px',
                fontWeight: 600
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
