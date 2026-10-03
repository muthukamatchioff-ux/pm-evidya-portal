import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, PageOrientation } from 'docx';

export const generateDocxReport = async (components: any[]) => {
  const allSections: any[] = [];

  components.forEach(component => {
    const roman = ['I', 'II', 'III', 'IV', 'V', 'VI'][component.componentNo - 1];
    const items = component[`annexure${roman}`] || [];

    allSections.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `PM e-Vidya - ${component.name}`,
            bold: true,
            size: 32,
          }),
        ],
        spacing: { before: 400, after: 200 },
      }),
      new Paragraph({
        children: [
          new TextRun({ text: `Annexure: Annexure-${roman}`, bold: true }),
        ],
        spacing: { after: 100 },
      }),
      new Paragraph({
        children: [
          new TextRun(`Approved Budget: ₹ ${component.approvedBudget.toLocaleString('en-IN')}`),
        ],
      }),
      new Paragraph({
        children: [
          new TextRun(`Total Expenditure: ₹ ${component.expenditureIncurred.toLocaleString('en-IN')}`),
        ],
      }),
      new Paragraph({
        children: [
          new TextRun(`Utilization: ${component.utilizationPercent}%`),
        ],
        spacing: { after: 400 },
      })
    );

    if (items.length > 0) {
      // Determine columns dynamically from the first item
      const keys = ['Sl. No.', ...Object.keys(items[0]).filter(k => !['id', 'budgetComponentId', 'createdAt', 'updatedAt'].includes(k))];
      
      const tableRows = [];
      
      // Header Row
      tableRows.push(
        new TableRow({
          children: keys.map(k => new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: k, bold: true })] })],
            margins: { top: 100, bottom: 100, left: 100, right: 100 }
          }))
        })
      );
      
      // Data Rows
      items.forEach((item: any, idx: number) => {
        tableRows.push(
          new TableRow({
            children: keys.map(k => {
              const cellValue = k === 'Sl. No.' ? (idx + 1).toString() : (item[k] !== null && item[k] !== undefined ? item[k].toString() : '');
              return new TableCell({
                children: [new Paragraph(cellValue)],
                margins: { top: 100, bottom: 100, left: 100, right: 100 }
              });
            })
          })
        );
      });
      
      allSections.push(
        new Table({
          rows: tableRows,
          width: { size: 100, type: WidthType.PERCENTAGE },
        })
      );
    } else {
      allSections.push(new Paragraph("No records found."));
    }
    
    // Add page break after each annexure
    allSections.push(new Paragraph({ pageBreakBefore: true }));
  });

  const doc = new Document({
    sections: [{
      properties: {
        page: {
          size: {
            orientation: PageOrientation.LANDSCAPE
          },
          margin: {
            top: 700,
            right: 700,
            bottom: 700,
            left: 700,
          },
        }
      },
      children: allSections,
    }],
  });

  const blob = await Packer.toBlob(doc);
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `PM_eVidya_Selected_Reports.docx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
};
