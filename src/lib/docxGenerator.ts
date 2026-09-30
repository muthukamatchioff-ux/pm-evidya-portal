import { Document, Packer, Paragraph, TextRun, AlignmentType, HeadingLevel } from 'docx';
import { saveAs } from 'file-saver';

export async function generateDocx(data: any, type: string, templateBody: string, templateSubject: string) {
  
  // Basic templating replacement
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
  const bodyText = replaceTags(templateBody);

  // Split body by double newlines into paragraphs
  const bodyParagraphs = bodyText.split('\n\n').map(pText => {
    return new Paragraph({
      children: [new TextRun(pText)],
      spacing: { after: 200 }
    });
  });

  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [
          new Paragraph({
            text: type === 'APPROVAL_LETTER' ? 'APPROVAL LETTER' : 'PAYMENT APPROVAL',
            heading: HeadingLevel.HEADING_1,
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 },
          }),
          new Paragraph({
            children: [
              new TextRun({ text: `Date: ${new Date().toLocaleDateString('en-IN')}`, bold: true }),
            ],
            alignment: AlignmentType.RIGHT,
            spacing: { after: 400 },
          }),
          new Paragraph({
            children: [
              new TextRun(`To,`),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: `${data.smeName}`, bold: true }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun(`${data.designation}, ${data.institute}`),
            ],
            spacing: { after: 400 },
          }),
          new Paragraph({
            children: [
              new TextRun({ text: 'Subject: ', bold: true }),
              new TextRun(subject),
            ],
            spacing: { after: 400 },
          }),
          new Paragraph({
            children: [
              new TextRun(`Dear ${data.smeName},`),
            ],
            spacing: { after: 200 },
          }),
          ...bodyParagraphs,
          new Paragraph({
            children: [
              new TextRun('Sincerely,'),
            ],
            spacing: { after: 600, before: 400 },
          }),
          new Paragraph({
            children: [
              new TextRun({ text: 'Authorized Signatory', bold: true }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun('Accounts Department, PM e-Vidya'),
            ],
          }),
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `${data.smeName.replace(/\s+/g, '_')}_${type}.docx`);
}
