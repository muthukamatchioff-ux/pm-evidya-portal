'use client';

import React, { useState } from 'react';
import { saveTemplateData } from './actions';
import styles from './templates.module.css';

export default function TemplateClient({ templates }: any) {
  const [activeTemplateId, setActiveTemplateId] = useState(templates[0]?.id || '');
  
  const [formData, setFormData] = useState<any>({});
  
  // Initialize form data
  React.useEffect(() => {
    const initData: any = {};
    templates.forEach((t: any) => {
      initData[t.id] = { subject: t.subject, body: t.body };
    });
    setFormData(initData);
  }, [templates]);

  const activeTemplate = templates.find((t: any) => t.id === activeTemplateId);
  const activeFormData = formData[activeTemplateId] || { subject: '', body: '' };

  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    const result = await saveTemplateData(activeTemplateId, activeFormData.subject, activeFormData.body);
    setSaving(false);
    if (result.success) {
      alert('Template saved successfully!');
    } else {
      alert('Failed to save template');
    }
  };

  const updateForm = (field: string, value: string) => {
    setFormData((prev: any) => ({
      ...prev,
      [activeTemplateId]: {
        ...prev[activeTemplateId],
        [field]: value
      }
    }));
  };

  if (!activeTemplate) return <div>No templates found</div>;

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1>Template Management</h1>
      </header>

      <div className={styles.layout}>
        <div className={styles.sidebar}>
          <div className="card">
            <h3>Document Templates</h3>
            <ul className={styles.templateList}>
              {templates.map((t: any) => (
                <li 
                  key={t.id} 
                  className={t.id === activeTemplateId ? styles.activeItem : styles.item}
                  onClick={() => setActiveTemplateId(t.id)}
                >
                  {t.name}
                </li>
              ))}
            </ul>
          </div>
          
          <div className="card" style={{ marginTop: '24px' }}>
            <h3>Available Variables</h3>
            <p className={styles.helpText}>Use these tags in your templates. They will be automatically replaced with real data during generation.</p>
            <ul className={styles.tagList}>
              <li><code>{`{{smeName}}`}</code> - Full name</li>
              <li><code>{`{{trade}}`}</code> - Trade name</li>
              <li><code>{`{{topic}}`}</code> - Topic name</li>
              <li><code>{`{{attendanceFrom}}`}</code> - Start Date</li>
              <li><code>{`{{attendanceTo}}`}</code> - End Date</li>
              <li><code>{`{{days}}`}</code> - Total Days</li>
              <li><code>{`{{ratePerDay}}`}</code> - Daily Rate</li>
              <li><code>{`{{totalAmount}}`}</code> - Total Amount</li>
            </ul>
          </div>
        </div>

        <div className={styles.editor}>
          <div className="card">
            <div className={styles.editorHeader}>
              <h2>Edit: {activeTemplate.name}</h2>
              <button className="btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : 'Save Template'}
              </button>
            </div>
            
            <div className={styles.formGroup}>
              <label>Subject Line</label>
              <input 
                type="text" 
                className={styles.input} 
                value={activeFormData.subject} 
                onChange={e => updateForm('subject', e.target.value)} 
              />
            </div>
            
            <div className={styles.formGroup}>
              <label>Document Body</label>
              <textarea 
                className={styles.textarea} 
                value={activeFormData.body} 
                onChange={e => updateForm('body', e.target.value)} 
                rows={15}
              />
              <p className={styles.helpText}>Use double newlines (Enter twice) to create separate paragraphs.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
