"use client";

import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import styles from './import.module.css';

const STEPS = [
  'Upload Excel',
  'Detect Sheets',
  'Column Mapping',
  'Data Preview',
  'Validation',
  'Import',
  'Summary'
];

export default function ImportWizard() {
  const [currentStep, setCurrentStep] = useState(0);
  const [file, setFile] = useState<File | null>(null);
  const [workbook, setWorkbook] = useState<XLSX.WorkBook | null>(null);
  const [sheets, setSheets] = useState<string[]>([]);
  const [selectedSheets, setSelectedSheets] = useState<string[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [previewData, setPreviewData] = useState<any[]>([]);

  // Simulation states
  const [isValidating, setIsValidating] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importStats, setImportStats] = useState({ total: 0, success: 0, duplicates: 0, errors: 0 });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = e.target.files?.[0];
    if (!uploadedFile) return;
    setFile(uploadedFile);
    
    const data = await uploadedFile.arrayBuffer();
    const wb = XLSX.read(data);
    setWorkbook(wb);
    setSheets(wb.SheetNames);
    setCurrentStep(1); // Move to Detect Sheets
  };

  const handleSheetSelection = (sheetName: string) => {
    setSelectedSheets(prev => 
      prev.includes(sheetName) ? prev.filter(s => s !== sheetName) : [...prev, sheetName]
    );
  };

  const extractHeaders = () => {
    if (!workbook || selectedSheets.length === 0) return;
    const firstSheet = workbook.Sheets[selectedSheets[0]];
    const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
    if (jsonData.length > 0) {
      const detectedHeaders = jsonData[0] as string[];
      setHeaders(detectedHeaders);
      
      // Auto-map some common fields
      const initialMapping: Record<string, string> = {};
      detectedHeaders.forEach(h => {
        const lowerH = h.toLowerCase();
        if (lowerH.includes('sme') && lowerH.includes('name')) initialMapping[h] = 'smeName';
        else if (lowerH.includes('module') && lowerH.includes('no')) initialMapping[h] = 'moduleNumber';
        else if (lowerH.includes('topic')) initialMapping[h] = 'topicName';
        else if (lowerH.includes('project') && lowerH.includes('code')) initialMapping[h] = 'projectCode';
        else initialMapping[h] = 'ignore';
      });
      setMapping(initialMapping);
    }
    setCurrentStep(2);
  };

  const generatePreview = () => {
    if (!workbook || selectedSheets.length === 0) return;
    const firstSheet = workbook.Sheets[selectedSheets[0]];
    const jsonData = XLSX.utils.sheet_to_json(firstSheet);
    setPreviewData(jsonData.slice(0, 5)); // show first 5 rows
    setCurrentStep(3);
  };

  const runValidation = () => {
    setCurrentStep(4);
    setIsValidating(true);
    setTimeout(() => {
      setIsValidating(false);
    }, 2000);
  };

  const runImport = () => {
    setCurrentStep(5);
    setIsImporting(true);
    setTimeout(() => {
      setIsImporting(false);
      setImportStats({
        total: 850,
        success: 818,
        duplicates: 25,
        errors: 7
      });
      setCurrentStep(6);
    }, 3000);
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Legacy Data Import</h1>
        <p className={styles.subtitle}>Safely migrate historical PM e-Vidya records from Excel sheets.</p>
      </div>

      <div className={styles.stepper}>
        {STEPS.map((step, idx) => (
          <div key={step} className={`${styles.step} ${idx === currentStep ? styles.active : ''} ${idx < currentStep ? styles.completed : ''}`}>
            <div className={styles.stepIndicator}>{idx < currentStep ? '✓' : idx + 1}</div>
            <div className={styles.stepLabel}>{step}</div>
          </div>
        ))}
      </div>

      <div className={styles.card}>
        {currentStep === 0 && (
          <div>
            <h2 style={{ marginBottom: 16 }}>Step 1: Upload Excel File</h2>
            <label className={styles.dropZone}>
              <span className={styles.dropIcon}>📄</span>
              <p>Drag & drop your Excel file here, or click to browse</p>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Supports .xlsx, .xls, .csv</p>
              <input type="file" accept=".xlsx,.xls,.csv" className={styles.fileInput} onChange={handleFileUpload} />
            </label>
          </div>
        )}

        {currentStep === 1 && (
          <div>
            <h2 style={{ marginBottom: 16 }}>Step 2: Detect Sheets</h2>
            <p style={{ marginBottom: 16, color: 'var(--text-secondary)' }}>Select which worksheets to include in this import batch.</p>
            <div className={styles.sheetList}>
              {sheets.map(sheet => (
                <label key={sheet} className={styles.sheetItem}>
                  <input 
                    type="checkbox" 
                    checked={selectedSheets.includes(sheet)}
                    onChange={() => handleSheetSelection(sheet)}
                  />
                  <span>{sheet}</span>
                </label>
              ))}
            </div>
            <div className={styles.btnGroup}>
              <button className="btn-secondary" onClick={() => setCurrentStep(0)}>Back</button>
              <button className="btn-primary" onClick={extractHeaders} disabled={selectedSheets.length === 0}>Continue to Mapping</button>
            </div>
          </div>
        )}

        {currentStep === 2 && (
          <div>
            <h2 style={{ marginBottom: 16 }}>Step 3: Column Mapping</h2>
            <p style={{ marginBottom: 16, color: 'var(--text-secondary)' }}>Map your Excel columns to the database fields.</p>
            <table className={styles.mappingTable}>
              <thead>
                <tr>
                  <th>Excel Column</th>
                  <th>Database Field</th>
                </tr>
              </thead>
              <tbody>
                {headers.map(h => (
                  <tr key={h}>
                    <td><strong>{h}</strong></td>
                    <td>
                      <select 
                        value={mapping[h] || 'ignore'} 
                        onChange={e => setMapping({...mapping, [h]: e.target.value})}
                      >
                        <option value="ignore">-- Do not import --</option>
                        <option value="projectCode">Project Code</option>
                        <option value="projectTitle">Project Title</option>
                        <option value="moduleNumber">Module Number</option>
                        <option value="topicName">Topic Name</option>
                        <option value="smeName">SME Name</option>
                        <option value="language">Language</option>
                        <option value="status">Status</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className={styles.btnGroup}>
              <button className="btn-secondary" onClick={() => setCurrentStep(1)}>Back</button>
              <button className="btn-primary" onClick={generatePreview}>Preview Data</button>
            </div>
          </div>
        )}

        {currentStep === 3 && (
          <div>
            <h2 style={{ marginBottom: 16 }}>Step 4: Data Preview</h2>
            <p style={{ marginBottom: 16, color: 'var(--text-secondary)' }}>Previewing the first 5 rows to ensure data aligns correctly.</p>
            <div style={{ overflowX: 'auto', marginBottom: 24 }}>
              <table className={styles.mappingTable}>
                <thead>
                  <tr>
                    {headers.filter(h => mapping[h] !== 'ignore').map(h => (
                      <th key={h}>{mapping[h]}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {previewData.map((row, idx) => (
                    <tr key={idx}>
                      {headers.filter(h => mapping[h] !== 'ignore').map(h => (
                        <td key={h}>{row[h] || '-'}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className={styles.btnGroup}>
              <button className="btn-secondary" onClick={() => setCurrentStep(2)}>Back</button>
              <button className="btn-primary" onClick={runValidation}>Run Validation</button>
            </div>
          </div>
        )}

        {currentStep === 4 && (
          <div>
            <h2 style={{ marginBottom: 16 }}>Step 5: Validation</h2>
            {isValidating ? (
              <div style={{ padding: 48, textAlign: 'center' }}>
                <p style={{ fontSize: 18, color: 'var(--primary)', fontWeight: 600 }}>Validating records...</p>
                <p style={{ color: 'var(--text-secondary)', marginTop: 8 }}>Checking for duplicates and missing required fields against the database.</p>
              </div>
            ) : (
              <div>
                <div className={styles.summaryStats}>
                  <div className={`${styles.statBox} ${styles.success}`}>
                    <div className={styles.statNum}>850</div>
                    <div>Valid Rows</div>
                  </div>
                  <div className={`${styles.statBox} ${styles.warning}`}>
                    <div className={styles.statNum}>25</div>
                    <div>Duplicates Detected</div>
                  </div>
                  <div className={`${styles.statBox} ${styles.danger}`}>
                    <div className={styles.statNum}>7</div>
                    <div>Invalid Rows</div>
                  </div>
                </div>
                <div className={styles.btnGroup}>
                  <button className="btn-secondary" onClick={() => setCurrentStep(3)}>Back</button>
                  <button className="btn-primary" onClick={runImport}>Confirm & Import</button>
                </div>
              </div>
            )}
          </div>
        )}

        {currentStep === 5 && (
          <div>
            <h2 style={{ marginBottom: 16 }}>Step 6: Import in Progress</h2>
            <div style={{ padding: 48, textAlign: 'center' }}>
              <p style={{ fontSize: 18, color: 'var(--primary)', fontWeight: 600 }}>Importing records...</p>
              <p style={{ color: 'var(--text-secondary)', marginTop: 8 }}>Please do not close this window. Normalizing data and updating database via transactions.</p>
            </div>
          </div>
        )}

        {currentStep === 6 && (
          <div>
            <h2 style={{ marginBottom: 16, color: 'var(--success)' }}>Step 7: Import Complete!</h2>
            <p style={{ marginBottom: 24 }}>Your legacy data has been successfully processed and normalized.</p>
            
            <div className={styles.summaryStats}>
              <div className={styles.statBox}>
                <div className={styles.statNum}>{importStats.total}</div>
                <div>Total Processed</div>
              </div>
              <div className={`${styles.statBox} ${styles.success}`}>
                <div className={styles.statNum}>{importStats.success}</div>
                <div>Imported Successfully</div>
              </div>
              <div className={`${styles.statBox} ${styles.warning}`}>
                <div className={styles.statNum}>{importStats.duplicates}</div>
                <div>Duplicates Skipped/Updated</div>
              </div>
              <div className={`${styles.statBox} ${styles.danger}`}>
                <div className={styles.statNum}>{importStats.errors}</div>
                <div>Failed</div>
              </div>
            </div>

            <div className={styles.btnGroup} style={{ justifyContent: 'center', gap: 16 }}>
              <button className="btn-secondary">Download Error Report (Excel)</button>
              <button className="btn-primary" onClick={() => window.location.href='/legacy'}>View Legacy Data</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
