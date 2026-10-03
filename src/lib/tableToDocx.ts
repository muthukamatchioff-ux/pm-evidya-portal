import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, PageOrientation } from 'docx';

export async function downloadTableAsDocx(tableElementId: string, title: string, subtitle: string, filename: string) {
  const table = document.getElementById(tableElementId) as HTMLTableElement;
  if (!table) return alert('Table not found');

  const docRows: any[] = [];
  
  const htmlRows = Array.from(table.rows);
  
  htmlRows.forEach((row, rIdx) => {
    const cells = Array.from(row.cells);
    
    // Check if the last column is 'Actions' or 'Edit' and remove it
    const lastCellText = cells[cells.length - 1].innerText.trim();
    if (rIdx === 0 && lastCellText === 'Actions') {
      cells.pop();
    } else if (rIdx > 0 && lastCellText === 'Edit') {
      cells.pop();
    } else if (rIdx === 0 && lastCellText === '') {
        // sometimes empty header
        cells.pop();
    }

    // Also handle "No records found" colspan
    if (cells.length === 1 && cells[0].colSpan > 1) {
      docRows.push(
        new TableRow({
          children: [
            new TableCell({
              children: [new Paragraph(cells[0].innerText)],
              columnSpan: cells[0].colSpan - 1, // Subtract 1 for Actions
              margins: { top: 100, bottom: 100, left: 100, right: 100 }
            })
          ]
        })
      );
      return;
    }

    docRows.push(
      new TableRow({
        children: cells.map(cell => new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: cell.innerText, bold: rIdx === 0 })] })],
          margins: { top: 100, bottom: 100, left: 100, right: 100 }
        }))
      })
    );
  });

  const doc = new Document({
    sections: [{
      properties: {
        page: { size: { orientation: PageOrientation.LANDSCAPE }, margin: { top: 700, right: 700, bottom: 700, left: 700 } }
      },
      children: [
        new Paragraph({ children: [new TextRun({ text: title, bold: true, size: 32 })], spacing: { after: 200 } }),
        new Paragraph({ children: [new TextRun({ text: subtitle, bold: true })], spacing: { after: 100 } }),
        new Paragraph({ children: [new TextRun({ text: `Downloaded At: ${new Date().toLocaleString('en-IN')}`, bold: true })], spacing: { after: 400 } }),
        new Table({
          rows: docRows,
          width: { size: 100, type: WidthType.PERCENTAGE }
        })
      ]
    }]
  });

  const blob = await Packer.toBlob(doc);
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}
