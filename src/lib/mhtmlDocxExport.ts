/**
 * MHTML Document Export Utility for Microsoft Word (.doc)
 * Generates Word-compatible documents with embedded MIME base64 images (NIMI logo),
 * table-based column layouts (matching flexbox previews), and A4 1-page formatting.
 */

export async function getLogoBase64(): Promise<string> {
  try {
    const res = await fetch('/nimi-logo.png');
    if (!res.ok) return '';
    const blob = await res.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        // strip data:image/png;base64, prefix
        const pureBase64 = result.replace(/^data:image\/[^;]+;base64,/, '');
        resolve(pureBase64);
      };
      reader.onerror = () => resolve('');
      reader.readAsDataURL(blob);
    });
  } catch (e) {
    console.warn('Failed to load logo for Word document', e);
    return '';
  }
}

export function exportMhtmlWordDocument(
  htmlBody: string,
  filename: string,
  logoBase64?: string
) {
  const boundary = '----=_Part_PM_EVIDYA_NIMI';
  const cleanFilename = filename.endsWith('.doc') ? filename : `${filename}.doc`;

  const mhtml: string[] = [
    'MIME-Version: 1.0',
    `Content-Type: multipart/related; type="text/html"; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    'Content-Type: text/html; charset="utf-8"',
    'Content-Transfer-Encoding: 8bit',
    '',
    '<!DOCTYPE html>',
    '<html xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">',
    '<head>',
    '<meta charset="utf-8">',
    `<title>${cleanFilename.replace(/\.doc$/, '')}</title>`,
    '<!--[if gte mso 9]>',
    '<xml>',
    '  <w:WordDocument>',
    '    <w:View>Print</w:View>',
    '    <w:Zoom>100</w:Zoom>',
    '    <w:DoNotOptimizeForBrowser/>',
    '  </w:WordDocument>',
    '</xml>',
    '<![endif]-->',
    '<style>',
    '  @page WordSection1 {',
    '    size: 210mm 297mm;',
    '    margin: 12mm 15mm 12mm 15mm;',
    '    mso-header-margin: 8mm;',
    '    mso-footer-margin: 8mm;',
    '    mso-paper-source: 0;',
    '  }',
    '  div.WordSection1 {',
    '    page: WordSection1;',
    '    font-family: "Times New Roman", Times, serif;',
    '    font-size: 10pt;',
    '    color: #000000;',
    '    line-height: 1.35;',
    '  }',
    '  body {',
    '    font-family: "Times New Roman", Times, serif;',
    '    font-size: 10pt;',
    '    color: #000000;',
    '    line-height: 1.35;',
    '    margin: 0;',
    '    padding: 0;',
    '  }',
    '  p {',
    '    margin: 0 0 6pt 0;',
    '    text-align: justify;',
    '  }',
    '  table {',
    '    border-collapse: collapse;',
    '    width: 100%;',
    '    mso-table-lspace: 0pt;',
    '    mso-table-rspace: 0pt;',
    '  }',
    '  th, td {',
    '    vertical-align: top;',
    '    font-family: "Times New Roman", Times, serif;',
    '  }',
    '  .official-header-tbl {',
    '    width: 100%;',
    '    border: none;',
    '    border-bottom: 2pt solid #000080;',
    '    margin-bottom: 10pt;',
    '    padding-bottom: 6pt;',
    '  }',
    '  .official-footer {',
    '    border-top: 1pt dashed #000000;',
    '    padding-top: 6pt;',
    '    margin-top: 12pt;',
    '    text-align: center;',
    '    font-size: 7.5pt;',
    '    line-height: 1.25;',
    '    color: #333333;',
    '  }',
    '</style>',
    '</head>',
    '<body>',
    '<div class="WordSection1">',
    htmlBody,
    '</div>',
    '</body>',
    '</html>',
    ''
  ];

  if (logoBase64) {
    mhtml.push(
      `--${boundary}`,
      'Content-Type: image/png',
      'Content-Transfer-Encoding: base64',
      'Content-Location: nimi-logo.png',
      '',
      logoBase64,
      ''
    );
  }

  mhtml.push(`--${boundary}--`);

  const fullMhtmlText = mhtml.join('\r\n');
  const blob = new Blob([fullMhtmlText], { type: 'application/msword;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = cleanFilename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Builds the official NIMI header HTML for Word documents.
 */
export function buildWordOfficialHeader(): string {
  return `
    <table class="official-header-tbl" style="width: 100%; border-collapse: collapse; border-bottom: 2pt solid #000080; margin-bottom: 10pt; padding-bottom: 6pt;">
      <tr>
        <td style="width: 82%; text-align: center; vertical-align: middle; border: none;">
          <div style="font-family: 'Times New Roman', serif; font-size: 15pt; font-weight: bold; color: #000080; margin: 0; letter-spacing: 0.5pt;">NATIONAL INSTRUCTIONAL MEDIA INSTITUTE</div>
          <div style="font-family: 'Times New Roman', serif; font-size: 10.5pt; font-weight: bold; color: #000080; margin: 2pt 0;">(AN AUTONOMOUS INSTITUTION)</div>
          <div style="font-family: 'Times New Roman', serif; font-size: 9.5pt; color: #000080; margin: 1pt 0;">Ministry of Skill Development &amp; Entrepreneurship, Government of India</div>
          <div style="font-family: 'Times New Roman', serif; font-size: 8pt; color: #000080; margin: 1pt 0;">Post Box No.3142, CTI Campus, Guindy Industrial Estate, Guindy, Chennai - 600 032.</div>
          <div style="font-family: 'Times New Roman', serif; font-size: 8pt; color: #000080; font-weight: bold; margin: 1pt 0;">Office: 044-2250 0657, 044-2250 0248 | Director: 044-2250 0256 | E-mail: chennai-nimi@nic.in</div>
        </td>
        <td style="width: 18%; text-align: right; vertical-align: middle; border: none;">
          <img src="nimi-logo.png" width="115" height="48" style="width: 115px; height: auto;" alt="NIMI Logo" />
        </td>
      </tr>
    </table>
  `;
}

/**
 * Builds the official NIMI bilingual footer HTML for Word documents.
 */
export function buildWordOfficialFooter(): string {
  return `
    <div class="official-footer">
      <div>पो. बा. संख्या 3142, सीटीआई कैम्पस, गिंडी इंडस्ट्रियल एस्टेट, गिंडी, चेन्नई-600032./Post Box No. 3142, CTI Campus,</div>
      <div>Guindy Industrial Estate, Guindy, Chennai – 600032. <strong>कार्यालय/Office:</strong> 044-2250 0657, 044-22500248,</div>
      <div><strong>निदेशक /Director-</strong> 044-2250 0256. <strong>ई-मेल/E-mail :</strong> <u>chennai-nimi@nic.in</u></div>
    </div>
  `;
}

/**
 * Builds Word HTML for Stage A: Approval Letter
 */
export function buildApprovalLetterWordHtml(params: any, sme: any, entry: any): string {
  const formatDateDot = (dateStr: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return `${d.getDate().toString().padStart(2, '0')}.${(d.getMonth() + 1).toString().padStart(2, '0')}.${d.getFullYear()}`;
  };

  const extensionSnippet = params.isExtension
    ? ` due to ${params.reasonForExtension || 'administrative reasons'} the deputation period was requested to be extended till ${params.extensionDate || 'the completion date'} based on the confirmation of the SME.`
    : '.';

  return `
    ${buildWordOfficialHeader()}

    <table style="width: 100%; border: none; margin-bottom: 10pt; font-family: 'Times New Roman', serif; font-size: 9.5pt; font-weight: bold;">
      <tr>
        <td align="left" style="border: none;">${params.refNoPrefix || 'NIMI/MS/T-11022/MM/'}${params.year || '2026'}</td>
        <td align="right" style="border: none;">Date: ${formatDateDot(params.letterDate)}</td>
      </tr>
    </table>

    <p style="margin-bottom: 8pt; line-height: 1.35; font-size: 9.5pt;">
      To,<br>
      ${params.recipientDesignation || 'The Principal'},<br>
      ${params.recipientInst || sme?.institute || 'Institution'},<br>
      ${params.recipientLoc || sme?.location || 'Location'}
    </p>

    <p style="margin-bottom: 8pt; line-height: 1.35; font-size: 9.5pt;">
      <strong>Sub: Invitation &mdash; as Subject Matter Expert (SME) to take Classroom shooting for the PM e-Vidya channel for the trade &ldquo;${entry?.trade || 'General'}&rdquo; &mdash; Reg.</strong>
    </p>

    <p style="text-indent: 20pt; margin-bottom: 6pt; line-height: 1.3; font-size: 9pt;">
      The National Instructional Media Institute (NIMI), functioning under the Ministry of Skill Development &amp; Entrepreneurship, Government of India, is the nodal agency engaged in the development of e-Learning content for various trades offered through Industrial Training Institutes (ITIs) and other skill development programmes.
    </p>

    <p style="text-indent: 20pt; margin-bottom: 6pt; line-height: 1.3; font-size: 9pt;">
      In this connection, approval is hereby accorded for the Visit of <strong>${sme?.name || 'Subject Matter Expert'}, ${sme?.designation || 'Designation'}, ${sme?.institute || 'Institute'}, ${sme?.location || 'Location'}</strong> to participate as a <strong>Subject Matter Expert (SME)</strong> for the <strong>PM e-Vidya Classroom Teaching Shoot</strong> for the trade <strong>&ldquo;${entry?.trade || 'General'}&rdquo;</strong> for ${params.duration || 'the duration'} from <strong>${formatDateDot(params.startDate)}</strong>${extensionSnippet}
    </p>

    <p style="text-indent: 20pt; margin-bottom: 6pt; line-height: 1.3; font-size: 9pt;">
      The Subject Matter Expert shall extend academic and technical support for the classroom teaching session, including content delivery, validation of instructional materials, and other activities required for the successful production of the <strong>PM e-Vidya programme</strong>. He/She is requested to coordinate closely with the concerned PM e-Vidya and NIMI officials regarding the content, presentation methodology, reporting schedule, and other technical requirements for the classroom teaching shoot.
    </p>

    <p style="text-indent: 20pt; margin-bottom: 6pt; line-height: 1.3; font-size: 9pt;">
      The <strong>remuneration / honorarium</strong> for the assignment, along with reimbursement of <strong>Travelling Allowance (TA)</strong>, shall be paid by NIMI as per the prevailing NCERT norms based on the SME designation and eligibility, subject to submission of original travel tickets, boarding passes, and other supporting documents, wherever applicable <strong>(Balmer Lawrie &amp; Company Limited, Ashok Travels &amp; Tours, Indian Railway Catering and Tourism Corporation Ltd - IRCTC)</strong>.
    </p>

    <p style="text-indent: 20pt; margin-bottom: 10pt; line-height: 1.3; font-size: 9pt;">
      Your kind cooperation and valuable support towards the development of quality e-content for the Skill Development ecosystem will be highly solicited.
    </p>

    <table style="width: 100%; border: none; margin-top: 10pt; margin-bottom: 6pt;">
      <tr>
        <td style="width: 50%; border: none;"></td>
        <td style="width: 50%; text-align: right; border: none; font-size: 9.5pt; line-height: 1.35;">
          Regards,<br><br><br>
          <strong>${params.signatory || 'Joint Director / HOO'}</strong>
        </td>
      </tr>
    </table>

    ${buildWordOfficialFooter()}
  `;
}

/**
 * Builds Word HTML for Stage B: Work Completion Certificate
 */
export function buildWorkCompletionWordHtml(params: any, sme: any, entry: any): string {
  const formatDateDot = (dateStr: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return `${d.getDate().toString().padStart(2, '0')}.${(d.getMonth() + 1).toString().padStart(2, '0')}.${d.getFullYear()}`;
  };

  const bTrade = (params.trade || entry?.trade || 'General').trim();
  const isMultiple = /[,/&;]|\band\b/i.test(bTrade);

  const rawTopics = (params.topicsCovered || entry?.topic || 'E-Content Video Production Topics').trim();
  const topicLines = rawTopics.split(/\r?\n/).map((l: string) => l.trim()).filter(Boolean);

  let topicsHtml = '';
  if (topicLines.length > 3) {
    // 2-column table for topics
    const half = Math.ceil(topicLines.length / 2);
    const col1 = topicLines.slice(0, half);
    const col2 = topicLines.slice(half);

    topicsHtml = `
      <table style="width: 100%; border: 1pt solid #cbd5e1; background-color: #f8fafc; margin: 4pt 0 6pt 0; padding: 4pt 8pt; font-size: 8.5pt;">
        <tr>
          <td style="width: 50%; border: none; vertical-align: top; padding: 2pt 6pt;">
            ${col1.map((t: string) => `<div style="margin: 1pt 0;">&bull; ${t}</div>`).join('')}
          </td>
          <td style="width: 50%; border: none; vertical-align: top; padding: 2pt 6pt;">
            ${col2.map((t: string) => `<div style="margin: 1pt 0;">&bull; ${t}</div>`).join('')}
          </td>
        </tr>
      </table>
    `;
  } else {
    topicsHtml = `
      <div style="background-color: #f8fafc; border: 1pt solid #cbd5e1; padding: 4pt 8pt; margin: 4pt 0 6pt 0; font-size: 8.5pt;">
        ${topicLines.map((t: string) => `<div style="margin: 1pt 0;">&bull; ${t}</div>`).join('')}
      </div>
    `;
  }

  return `
    ${buildWordOfficialHeader()}

    <h2 style="text-align: center; text-decoration: underline; font-size: 12pt; margin: 8pt 0 6pt 0; text-transform: uppercase; letter-spacing: 0.5pt;">
      Work Completion Certificate
    </h2>

    <p style="line-height: 1.3; font-size: 9pt; margin-bottom: 5pt;">
      This is to certify that <strong>${sme?.name || 'Subject Matter Expert'}</strong>, <strong>Guest Expert / Subject Matter Expert (SME)</strong>, has successfully completed the <strong>${params.programmeName || 'PM e-Vidya Classroom Teaching Video Production'}</strong> for the <strong>${bTrade}</strong> ${isMultiple ? 'trades' : 'trade'} at the <strong>${params.location || 'NIMI, Chennai'}</strong>, during the period from <strong>${formatDateDot(params.startDate)}</strong> to <strong>${formatDateDot(params.endDate)}</strong>.
    </p>

    <p style="line-height: 1.3; font-size: 9pt; margin-bottom: 5pt;">
      As the <strong>Guest Expert / Subject Matter Expert (SME)</strong>, <strong>${sme?.name || 'the SME'}</strong> effectively delivered the assigned classroom sessions in accordance with the approved curriculum, ensuring technical accuracy, instructional quality, and compliance with the applicable standards for PM e-Vidya digital learning content.
    </p>

    <p style="line-height: 1.3; font-size: 9pt; margin-bottom: 3pt;">
      The following topics were successfully delivered and recorded for integration into the PM e-Vidya Digital Learning Platform:
    </p>

    ${topicsHtml}

    <p style="line-height: 1.3; font-size: 9pt; margin-top: 5pt; margin-bottom: 6pt;">
      The recorded classroom sessions have been completed satisfactorily and are certified for further processing as per the applicable NIMI norms.
    </p>

    <table style="width: 100%; border-collapse: collapse; margin: 5pt 0 8pt 0; font-size: 8.5pt;">
      <thead>
        <tr style="background-color: #f1f5f9;">
          <th style="border: 1pt solid #000; padding: 4pt 6pt; text-align: left;">Trade(s)</th>
          <th style="border: 1pt solid #000; padding: 4pt 6pt; text-align: left;">Guest Expert (SME)</th>
          <th style="border: 1pt solid #000; padding: 4pt 6pt; text-align: left;">Work Completed</th>
          <th style="border: 1pt solid #000; padding: 4pt 6pt; text-align: left;">Date</th>
          <th style="border: 1pt solid #000; padding: 4pt 6pt; text-align: left;">Amount (Rs.)</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td style="border: 1pt solid #000; padding: 4pt 6pt;"><strong>${bTrade}</strong></td>
          <td style="border: 1pt solid #000; padding: 4pt 6pt;">
            <strong>${sme?.name || 'Subject Matter Expert'}</strong><br>
            ${sme?.designation || 'Designation'}, ${sme?.institute || 'Institute'}, ${sme?.location || 'Location'}
          </td>
          <td style="border: 1pt solid #000; padding: 4pt 6pt;">${params.workTitle || 'Classroom Teaching Video Production'}</td>
          <td style="border: 1pt solid #000; padding: 4pt 6pt;">${formatDateDot(params.startDate)} &ndash; ${formatDateDot(params.endDate)}</td>
          <td style="border: 1pt solid #000; padding: 4pt 6pt;">₹${entry?.ratePerDay || 1500}/- (per Day)</td>
        </tr>
      </tbody>
    </table>

    <!-- Dual Declaration in 2-column table for Word -->
    <table style="width: 100%; border: none; margin-top: 8pt; font-size: 8pt; line-height: 1.25;">
      <tr>
        <td style="width: 50%; vertical-align: top; padding-right: 10pt; border: none;">
          <div style="font-weight: bold; text-decoration: underline; margin-bottom: 3pt;">SME DECLARATION</div>
          <div>I, <strong>${sme?.name || 'Subject Matter Expert'}</strong>, hereby declare that I have successfully completed the <strong>${params.programmeName || 'PM e-Vidya Programme'}</strong> for the <strong>${bTrade}</strong> ${isMultiple ? 'trades' : 'trade'} during the period from <strong>${formatDateDot(params.startDate)}</strong> to <strong>${formatDateDot(params.endDate)}</strong>.</div>
          <div style="margin-top: 3pt;">I certify that the assigned topics were delivered as per the approved curriculum and that the work has been completed satisfactorily for processing of honorarium as per applicable NIMI norms.</div>
          <br><br><br>
          Signature of Guest Expert:<br>
          Designation: ${sme?.designation || 'Designation'}, ${sme?.institute || 'Institute'}<br>
          Date: ${formatDateDot(params.submissionDate)}
        </td>
        <td style="width: 50%; vertical-align: top; padding-left: 10pt; border: none; border-left: 1pt dashed #94a3b8;">
          <div style="font-weight: bold; text-decoration: underline; margin-bottom: 3pt;">NIMI VERIFICATION</div>
          <div>Certified that the above work has been completed satisfactorily and verified as per the requirements of the National Instructional Media Institute (NIMI).</div>
          <br><br><br><br>
          Signature<br>
          Name: <strong>${params.verifierName || 'Shri. Ashfaq Ahmed'}</strong><br>
          Designation: ${params.verifierDesignation || 'Assistant Manager'}<br>
          Organisation: ${params.verifierOrganisation || 'National Instructional Media Institute (NIMI), Chennai'}<br>
          Date: ${formatDateDot(params.verificationDate)}
        </td>
      </tr>
    </table>

    ${buildWordOfficialFooter()}
  `;
}

/**
 * Builds Word HTML for Stage C: SME Remuneration / Sanction Note
 */
export function buildRemunerationWordHtml(params: any, sme: any, entry: any): string {
  const formatDateDot = (dateStr: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return `${d.getDate().toString().padStart(2, '0')}.${(d.getMonth() + 1).toString().padStart(2, '0')}.${d.getFullYear()}`;
  };

  const calculateSlotDays = (start: string, end: string): number => {
    if (!start || !end) return 0;
    const d1 = new Date(start);
    const d2 = new Date(end);
    if (isNaN(d1.getTime()) || isNaN(d2.getTime())) return 0;
    const diffTime = d2.getTime() - d1.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays > 0 ? diffDays : 0;
  };

  const currentTrade = (params.trade || entry?.trade || 'General').trim();
  const slots = params.attendanceSlots && params.attendanceSlots.length > 0
    ? params.attendanceSlots
    : [{ id: 'slot-default', startDate: entry?.attendanceFrom ? new Date(entry.attendanceFrom).toISOString().split('T')[0] : new Date().toISOString().split('T')[0], endDate: entry?.attendanceTo ? new Date(entry.attendanceTo).toISOString().split('T')[0] : new Date().toISOString().split('T')[0], trade: currentTrade }];

  const distinctTrades = Array.from(new Set(
    slots.map((s: any) => (s.trade || currentTrade || 'General').trim()).filter(Boolean)
  ));
  const displayedTrades = distinctTrades.length > 0 ? distinctTrades.join(', ') : currentTrade;
  const isMultiple = distinctTrades.length > 1;

  const slotRowsHtml = slots.map((slot: any, idx: number) => {
    const slotDays = calculateSlotDays(slot.startDate, slot.endDate);
    const daysVal = slotDays > 0 ? slotDays : 1;
    const slotTrade = (slot.trade || currentTrade || 'General').trim();
    const slotAmount = daysVal * (params.ratePerDay || 1500);

    return `
      <tr>
        <td style="border: 1pt solid #000; padding: 4pt 6pt; text-align: center;">${idx + 1}</td>
        <td style="border: 1pt solid #000; padding: 4pt 6pt;">
          <strong>${sme?.name || 'Subject Matter Expert'}</strong><br>
          <span>${sme?.designation || 'Designation'}</span>
          ${(sme?.institute || sme?.location) ? `<div style="font-size: 8pt; color: #475569; margin-top: 1pt;">${sme?.institute || ''}${sme?.location ? `, ${sme.location}` : ''}</div>` : ''}
        </td>
        <td style="border: 1pt solid #000; padding: 4pt 6pt;"><strong>${slotTrade}</strong></td>
        <td style="border: 1pt solid #000; padding: 4pt 6pt; text-align: center; white-space: nowrap;">${formatDateDot(slot.startDate)} to ${formatDateDot(slot.endDate)}</td>
        <td style="border: 1pt solid #000; padding: 4pt 6pt; text-align: center; font-weight: bold;">${daysVal} ${daysVal === 1 ? 'Day' : 'Days'}</td>
        <td style="border: 1pt solid #000; padding: 4pt 6pt; text-align: right; white-space: nowrap;">Rs. ${params.ratePerDay || 1500}/-</td>
        <td style="border: 1pt solid #000; padding: 4pt 6pt; text-align: right; font-weight: bold; white-space: nowrap;">Rs. ${slotAmount.toLocaleString('en-IN')}/-</td>
      </tr>
    `;
  }).join('');

  return `
    <h2 style="text-align: center; text-decoration: underline; font-size: 12pt; margin: 8pt 0 6pt 0;">
      SME REMUNERATION / SANCTION NOTE
    </h2>

    <table style="width: 100%; border: none; margin-bottom: 6pt; font-family: 'Times New Roman', serif; font-size: 9.5pt; font-weight: bold;">
      <tr>
        <td align="left" style="border: none;">Submitted</td>
        <td align="right" style="border: none;">${formatDateDot(params.submissionDate)}</td>
      </tr>
    </table>

    <p style="line-height: 1.35; font-size: 9pt; margin-bottom: 6pt;">
      Sanction may kindly be accorded for a sum of <strong>Rs. ${(params.totalAmount || 0).toLocaleString('en-IN')}/- (Rupees ${params.amountInWords || ''})</strong> towards the remuneration of <strong>${sme?.name || 'Subject Matter Expert'}</strong>, <strong>${sme?.designation || 'Designation'}</strong>, <strong>${sme?.institute || 'Institution'}, ${sme?.location || 'Location'}</strong>, who served as the <strong>Guest Expert / Subject Matter Expert (SME)</strong> for the <strong>${params.programmeName || 'PM e-Vidya Classroom Teaching Video Production'}</strong> for the <strong>${displayedTrades}</strong> ${isMultiple ? 'trades' : 'trade'}. The <strong>${params.workTitle || 'Classroom Teaching Video Production for PM e-Vidya'}</strong> was successfully conducted and completed at the <strong>${params.location || 'National Instructional Media Institute (NIMI), Chennai'}</strong>.
    </p>

    <table style="width: 100%; border-collapse: collapse; margin: 6pt 0; font-size: 8.5pt;">
      <thead>
        <tr style="background-color: #f1f5f9;">
          <th style="border: 1pt solid #000; padding: 4pt 5pt; text-align: center; width: 6%;">S. No.</th>
          <th style="border: 1pt solid #000; padding: 4pt 5pt; text-align: left; width: 24%;">Name &amp; Designation</th>
          <th style="border: 1pt solid #000; padding: 4pt 5pt; text-align: left; width: 20%;">Trade</th>
          <th style="border: 1pt solid #000; padding: 4pt 5pt; text-align: center; width: 21%;">Attendance Date</th>
          <th style="border: 1pt solid #000; padding: 4pt 5pt; text-align: center; width: 11%;">Total No. of Days</th>
          <th style="border: 1pt solid #000; padding: 4pt 5pt; text-align: right; width: 9%;">Remuneration per Day</th>
          <th style="border: 1pt solid #000; padding: 4pt 5pt; text-align: right; width: 9%;">Total Amount</th>
        </tr>
      </thead>
      <tbody>
        ${slotRowsHtml}
      </tbody>
      <tfoot>
        <tr>
          <td colspan="4" style="border: 1pt solid #000; padding: 4pt 5pt; text-align: right; font-weight: bold;">Subtotal (Remuneration):</td>
          <td style="border: 1pt solid #000; padding: 4pt 5pt; text-align: center; font-weight: bold;">${params.totalDays || 0} Days</td>
          <td style="border: 1pt solid #000; padding: 4pt 5pt;"></td>
          <td style="border: 1pt solid #000; padding: 4pt 5pt; text-align: right; font-weight: bold; white-space: nowrap;">Rs. ${(params.grossAmount || 0).toLocaleString('en-IN')}/-</td>
        </tr>
        <tr>
          <td colspan="6" style="border: 1pt solid #000; padding: 4pt 5pt; text-align: right; font-weight: bold;">Grand Total:</td>
          <td style="border: 1pt solid #000; padding: 4pt 5pt; text-align: right; font-weight: bold; white-space: nowrap;">Rs. ${(params.totalAmount || 0).toLocaleString('en-IN')}/-</td>
        </tr>
      </tfoot>
    </table>

    <p style="line-height: 1.35; font-size: 9pt; margin-top: 6pt; margin-bottom: 5pt;">
      If approved, payment of <strong>Rs. ${(params.totalAmount || 0).toLocaleString('en-IN')}/- (Rupees ${params.amountInWords || ''})</strong> may be released to the above Subject Matter Expert from the PM e-Vidya Funds as per the prevailing NCERT norms. The SME engagement approval letter, Work Completion Certificate, and other supporting documents are enclosed separately for kind perusal.
    </p>

    <p style="line-height: 1.35; font-size: 9pt; margin-bottom: 12pt;">
      Submitted for kind approval, please.
    </p>
  `;
}
