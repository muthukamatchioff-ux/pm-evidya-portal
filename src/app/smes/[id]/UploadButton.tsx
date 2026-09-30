'use client';

import React, { useRef, useState } from 'react';
import { uploadDocument } from './actions';
import styles from './smeProfile.module.css';

export default function UploadButton({ smeId, workEntryId, type }: { smeId: string, workEntryId: string, type: string }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    const formData = new FormData();
    formData.append('file', file);
    
    const result = await uploadDocument(smeId, workEntryId, type, formData);
    setLoading(false);
    
    if (!result.success) {
      alert(`Upload failed: ${result.error}`);
    }
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <>
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleUpload} 
        style={{ display: 'none' }} 
        accept=".pdf,.doc,.docx,image/jpeg,image/png"
      />
      <button 
        className={styles.btnAction} 
        onClick={() => fileInputRef.current?.click()}
        disabled={loading}
      >
        {loading ? 'Uploading...' : 'Upload'}
      </button>
    </>
  );
}
