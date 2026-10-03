import { Document, Packer, Paragraph, TextRun, AlignmentType, HeadingLevel, Header, Footer, ImageRun, TextDirection, BorderStyle } from 'docx';
import { saveAs } from 'file-saver';

export async function generateDocx(data: any, type: string, templateBody: string, templateSubject: string, signatory: string = 'Joint Director / HOO') {
  
  const replaceTags = (text: string) => {
    return text
      .replace(/{{smeName}}/g, data.smeName || '')
      .replace(/{{trade}}/g, data.trade || '')
      .replace(/{{topic}}/g, data.topic || '')
      .replace(/{{attendanceFrom}}/g, data.attendanceFrom || '')
      .replace(/{{attendanceTo}}/g, data.attendanceTo || '')
      .replace(/{{days}}/g, data.days?.toString() || '0')
      .replace(/{{ratePerDay}}/g, data.ratePerDay?.toString() || '0')
      .replace(/{{totalAmount}}/g, data.totalAmount?.toString() || '0');
  };

  const subject = replaceTags(templateSubject);

  const doc = new Document({
    sections: [
      {
        properties: {},
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                children: [
                  new TextRun({ text: "NATIONAL INSTRUCTIONAL MEDIA INSTITUTE", bold: true, size: 28, color: "000080" }),
                ],
                alignment: AlignmentType.CENTER,
              }),
              new Paragraph({
                children: [
                  new TextRun({ text: "(AN AUTONOMOUS INSTITUTION)", size: 20, color: "000080" }),
                ],
                alignment: AlignmentType.CENTER,
              }),
              new Paragraph({
                children: [
                  new TextRun({ text: "Ministry of Skill Development & Entrepreneurship", size: 20, color: "000080" }),
                ],
                alignment: AlignmentType.CENTER,
              }),
              new Paragraph({
                children: [
                  new TextRun({ text: "Government of India", size: 20, color: "000080" }),
                ],
                alignment: AlignmentType.CENTER,
              }),
              new Paragraph({
                children: [
                  new TextRun({ text: "Post Box No.3142, CTI Campus, Guindy Industrial Estate, Guindy, Chennai - 600 032.", size: 20, color: "000080" }),
                ],
                alignment: AlignmentType.CENTER,
              }),
              new Paragraph({
                children: [
                  new TextRun({ text: "Office : 044-2250 0657, 044-2250 0248 Director 044-2250 0256 E-mail :chennai-nimi@nic.in", size: 20, color: "000080" }),
                ],
                alignment: AlignmentType.CENTER,
                border: { bottom: { color: "000080", space: 1, style: BorderStyle.SINGLE, size: 6 } },
                spacing: { after: 200 }
              }),
            ]
          })
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                children: [
                  new TextRun({ text: "पो. बा. संख्या 3142, सीटीआई कैम्पस, गिंडी इंडस्ट्रियल एस्टेट, गिंडी, चेन्नई-600032./Post Box No. 3142, CTI Campus,", size: 16 }),
                ],
                alignment: AlignmentType.CENTER,
                border: { top: { color: "auto", space: 1, style: BorderStyle.DASHED, size: 6 } }
              }),
              new Paragraph({
                children: [
                  new TextRun({ text: "Guindy Industrial Estate, Guindy, Chennai - 600032. कार्यालय/Office: 044-2250 0657, 044-22500248,", size: 16 }),
                ],
                alignment: AlignmentType.CENTER,
              }),
              new Paragraph({
                children: [
                  new TextRun({ text: "निदेशक /Director- 044-2250 0256. ई-मेल/E-mail : chennai-nmi@nic.in.", size: 16 }),
                ],
                alignment: AlignmentType.CENTER,
              }),
            ]
          })
        },
        children: [
          new Paragraph({
            children: [
              new TextRun({ text: `NIMI/MS/T-11022/MM/2026`, bold: true }),
              new TextRun({ text: `Date: ${new Date().toLocaleDateString('en-IN')}`, bold: true }),
            ],
            // A simple hack to space them apart is multiple tabs, but let's just make it right aligned for Date
            alignment: AlignmentType.LEFT,
            spacing: { after: 400 },
          }),
          // In docx we can use TabStops, but this is fine. Let's separate it properly:
          
          new Paragraph({ children: [new TextRun(`To,`)] }),
          new Paragraph({ children: [new TextRun(`The Principal,`)] }),
          new Paragraph({ children: [new TextRun(`${data.institute || 'Institution Name'},`)] }),
          new Paragraph({ children: [new TextRun(`City, State - PIN`)] }),
          
          new Paragraph({
            children: [
              new TextRun({ text: `Sub: `, bold: true }),
              new TextRun(subject),
            ],
            spacing: { before: 200, after: 200 },
          }),
          
          new Paragraph({
            children: [
              new TextRun(`The National Instructional Media Institute (NIMI), functioning under the Ministry of Skill Development & Entrepreneurship, Government of India, is the nodal agency engaged in the development of e-Learning content for various trades offered through Industrial Training Institutes (ITIs) and other skill development programmes.`),
            ],
            alignment: AlignmentType.JUSTIFIED,
            spacing: { after: 200 },
          }),
          
          new Paragraph({
            children: [
              new TextRun(`In this connection, approval is hereby accorded for the Visit of `),
              new TextRun({ text: `${data.smeName}`, bold: true }),
              new TextRun(`, `),
              new TextRun({ text: `${data.designation}`, bold: true }),
              new TextRun(`, `),
              new TextRun({ text: `${data.institute}`, bold: true }),
              new TextRun(`, to participate as a `),
              new TextRun({ text: `Subject Matter Expert (SME)`, bold: true }),
              new TextRun(` for the `),
              new TextRun({ text: `PM e-Vidya Classroom Teaching Shoot`, bold: true }),
              new TextRun(` for the trade `),
              new TextRun({ text: `"${data.trade || 'Trade'}"`, bold: true }),
              new TextRun(` for `),
              new TextRun({ text: `${data.days || 14} days`, bold: true }),
              new TextRun(` from `),
              new TextRun({ text: `${data.attendanceFrom ? new Date(data.attendanceFrom).toLocaleDateString('en-IN') : 'Date'}`, bold: true }),
              new TextRun(data.extensionReason ? ` ${data.extensionReason}.` : '.'),
            ],
            alignment: AlignmentType.JUSTIFIED,
            spacing: { after: 200 },
          }),
          
          new Paragraph({
            children: [
              new TextRun(`The Subject Matter Expert shall extend academic and technical support for the classroom teaching session, including content delivery, validation of instructional materials, and other activities required for the successful production of the `),
              new TextRun({ text: `PM e-Vidya programme`, bold: true }),
              new TextRun(`. He is requested to coordinate closely with the concerned PM e-Vidya and NIMI officials regarding the content, presentation methodology, reporting schedule, and other technical requirements for the classroom teaching shoot.`),
            ],
            alignment: AlignmentType.JUSTIFIED,
            spacing: { after: 200 },
          }),
          
          new Paragraph({
            children: [
              new TextRun(`The `),
              new TextRun({ text: `remuneration / honorarium`, bold: true }),
              new TextRun(` for the assignment, along with reimbursement of `),
              new TextRun({ text: `Travelling Allowance (TA)`, bold: true }),
              new TextRun(`, shall be paid by NIMI as per the prevailing NIMI norms based on the SME designation and eligibility, subject to submission of original travel tickets, boarding passes, and other supporting documents, wherever applicable `),
              new TextRun({ text: `(Balmer Lawrie & Company Limited, Ashok Travels & Tours, Indian Railway Catering and Tourism Corporation Ltd - IRCTC)`, bold: true }),
              new TextRun(`.`),
            ],
            alignment: AlignmentType.JUSTIFIED,
            spacing: { after: 200 },
          }),

          new Paragraph({
            children: [
              new TextRun(`Your kind cooperation and valuable support towards the development of quality e-content for the Skill Development ecosystem will be highly solicited.`),
            ],
            alignment: AlignmentType.JUSTIFIED,
            spacing: { after: 600 },
          }),

          new Paragraph({
            children: [
              new TextRun(`Regards`),
            ],
            alignment: AlignmentType.RIGHT,
            spacing: { after: 800 }, // Space for signature
          }),

          new Paragraph({
            children: [
              new TextRun(signatory),
            ],
            alignment: AlignmentType.RIGHT,
          }),
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `${data.smeName.replace(/\s+/g, '_')}_${type}.docx`);
}
