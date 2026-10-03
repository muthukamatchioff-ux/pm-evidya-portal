import { Document, Paragraph, TextRun, Packer, Table, TableRow, TableCell, BorderStyle, WidthType } from 'docx';
import { saveAs } from 'file-saver';

// Helper to convert numbers to Indian Rupee Words (basic implementation)
function numberToWords(num: number): string {
  const a = ['','One ','Two ','Three ','Four ', 'Five ','Six ','Seven ','Eight ','Nine ','Ten ','Eleven ','Twelve ','Thirteen ','Fourteen ','Fifteen ','Sixteen ','Seventeen ','Eighteen ','Nineteen '];
  const b = ['', '', 'Twenty','Thirty','Forty','Fifty', 'Sixty','Seventy','Eighty','Ninety'];

  let numStr = num.toString();
  if (numStr.length > 9) return 'overflow';
  const n = ('000000000' + numStr).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
  if (!n) return '';
  
  let str = '';
  str += (n[1] != '00') ? (a[Number(n[1])] || b[Number(n[1][0])] + ' ' + a[Number(n[1][1])]) + 'Crore ' : '';
  str += (n[2] != '00') ? (a[Number(n[2])] || b[Number(n[2][0])] + ' ' + a[Number(n[2][1])]) + 'Lakh ' : '';
  str += (n[3] != '00') ? (a[Number(n[3])] || b[Number(n[3][0])] + ' ' + a[Number(n[3][1])]) + 'Thousand ' : '';
  str += (n[4] != '0') ? (a[Number(n[4])] || b[Number(n[4][0])] + ' ' + a[Number(n[4][1])]) + 'Hundred ' : '';
  str += (n[5] != '00') ? ((str != '') ? 'and ' : '') + (a[Number(n[5])] || b[Number(n[5][0])] + ' ' + a[Number(n[5][1])]) : '';
  return str.trim();
}

function formatDate(dateString: string | Date | null) {
  if (!dateString) return '';
  const d = new Date(dateString);
  const day = d.getDate().toString().padStart(2, '0');
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const year = d.getFullYear();
  return `${day}.${month}.${year}`;
}

export const generateSanctionDoc = async (entry: any, payment: any) => {
  const today = formatDate(new Date());
  
  const smeName = entry.sme.name || '';
  const designation = entry.sme.designation || '';
  const institution = entry.sme.institute || '';
  // Assuming place isn't explicitly in schema, using dummy or empty
  const place = 'Place'; // Fallback
  
  const fullSmeString = `${smeName}, ${designation}, ${institution}, ${place}`.replace(/, , /g, ', ').replace(/, $/g, '');
  
  const totalAmount = payment.totalAmount || 0;
  const amountInWords = numberToWords(totalAmount);
  
  const trade = entry.trade || '';
  const attendanceDate = `${formatDate(entry.attendanceFrom)} to ${formatDate(entry.attendanceTo)}`;
  const totalDays = entry.days || 0;
  const ratePerDay = entry.ratePerDay || 1500;

  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [
          new Paragraph({
            children: [
              new TextRun({ text: "Submitted, ", bold: true }),
              new TextRun({ text: today })
            ],
            spacing: { after: 400 }
          }),
          
          new Paragraph({
            children: [
              new TextRun({ text: "Sanction may kindly be accorded for a sum of " }),
              new TextRun({ text: `Rs. ${totalAmount.toLocaleString('en-IN')}/- `, bold: true }),
              new TextRun({ text: `(Rupees ${amountInWords} Only) `, bold: true }),
              new TextRun({ text: `towards the remuneration of ` }),
              new TextRun({ text: fullSmeString, bold: true }),
              new TextRun({ text: `, who served as the Subject Matter Expert (SME) for the PM e-Vidya Classroom Teaching Videos for the ` }),
              new TextRun({ text: trade, bold: true }),
              new TextRun({ text: ` trades.` })
            ],
            spacing: { after: 400 },
            alignment: "both"
          }),
          
          new Paragraph({
            children: [
              new TextRun({ 
                text: "The Classroom Teaching Video Shoot for the PM e-Vidya Programme was successfully conducted and completed at the NIMI Chennai Studio."
              })
            ],
            spacing: { after: 400 },
            alignment: "both"
          }),
          
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: {
              top: { style: BorderStyle.SINGLE, size: 1 },
              bottom: { style: BorderStyle.SINGLE, size: 1 },
              left: { style: BorderStyle.SINGLE, size: 1 },
              right: { style: BorderStyle.SINGLE, size: 1 },
              insideHorizontal: { style: BorderStyle.SINGLE, size: 1 },
              insideVertical: { style: BorderStyle.SINGLE, size: 1 },
            },
            rows: [
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "S. No.", bold: true })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Name & Designation", bold: true })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Trade", bold: true })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Attendance Date", bold: true })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Total No. of Days", bold: true })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Remuneration per Day", bold: true })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Total Amount", bold: true })] })] }),
                ]
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph("1")] }),
                  new TableCell({ children: [new Paragraph(fullSmeString)] }),
                  new TableCell({ children: [new Paragraph(trade)] }),
                  new TableCell({ children: [new Paragraph(attendanceDate)] }),
                  new TableCell({ children: [new Paragraph(`${totalDays} Days`)] }),
                  new TableCell({ children: [new Paragraph(`Rs. ${ratePerDay.toLocaleString('en-IN')}/-`)] }),
                  new TableCell({ children: [new Paragraph(`Rs. ${totalAmount.toLocaleString('en-IN')}/-`)] }),
                ]
              })
            ]
          })
        ],
      }
    ]
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `Payment_Approval_${smeName.replace(/\s+/g, '_')}_${today}.docx`);
};
