import jsPDF from "jspdf";
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from "docx";
import { saveAs } from "file-saver";

export interface TranscriptData {
  title: string;
  content: string;
  timestamp: string;
  duration?: string;
}

// Download transcript as text file
export const downloadAsText = (data: TranscriptData) => {
  let content = `${data.title}\n`;
  content += `Date: ${data.timestamp}\n`;
  if (data.duration) content += `Duration: ${data.duration}\n`;
  content += "\n" + "=".repeat(50) + "\n\n";
  content += data.content;

  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  saveAs(blob, `${sanitizeFilename(data.title)}_${getDateString()}.txt`);
};

// Download transcript as PDF
export const downloadAsPdf = (data: TranscriptData) => {
  const doc = new jsPDF();
  let yPosition = 20;
  const pageHeight = doc.internal.pageSize.height;
  const margin = 20;
  const lineHeight = 7;

  // Add title
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(data.title, margin, yPosition);
  yPosition += lineHeight * 2;

  // Add metadata
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Date: ${data.timestamp}`, margin, yPosition);
  yPosition += lineHeight;
  
  if (data.duration) {
    doc.text(`Duration: ${data.duration}`, margin, yPosition);
    yPosition += lineHeight;
  }

  yPosition += lineHeight;
  doc.line(margin, yPosition, doc.internal.pageSize.width - margin, yPosition);
  yPosition += lineHeight * 2;

  // Add content
  doc.setFontSize(11);
  const maxWidth = doc.internal.pageSize.width - (margin * 2);
  const lines = doc.splitTextToSize(data.content, maxWidth);

  lines.forEach((line: string) => {
    if (yPosition > pageHeight - margin) {
      doc.addPage();
      yPosition = margin;
    }
    doc.text(line, margin, yPosition);
    yPosition += lineHeight;
  });

  doc.save(`${sanitizeFilename(data.title)}_${getDateString()}.pdf`);
};

// Download transcript as Word document
export const downloadAsWord = async (data: TranscriptData) => {
  const children: Paragraph[] = [];

  // Add title
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: data.title,
          bold: true,
          size: 32,
        }),
      ],
      heading: HeadingLevel.HEADING_1,
    })
  );

  // Add metadata
  children.push(
    new Paragraph({
      children: [new TextRun(`Date: ${data.timestamp}`)],
    })
  );

  if (data.duration) {
    children.push(
      new Paragraph({
        children: [new TextRun(`Duration: ${data.duration}`)],
      })
    );
  }

  children.push(
    new Paragraph({
      children: [new TextRun("")], // Empty line
    })
  );

  // Add content (split by lines)
  const contentLines = data.content.split('\n');
  contentLines.forEach(line => {
    if (line.trim()) {
      children.push(
        new Paragraph({
          children: [new TextRun(line)],
        })
      );
    } else {
      children.push(
        new Paragraph({
          children: [new TextRun("")], // Empty line
        })
      );
    }
  });

  const doc = new Document({
    sections: [
      {
        properties: {},
        children: children,
      },
    ],
  });

  try {
    const buffer = await Packer.toBlob(doc);
    saveAs(buffer, `${sanitizeFilename(data.title)}_${getDateString()}.docx`);
  } catch (error) {
    console.error("Error creating Word document:", error);
    // Fallback to text export
    downloadAsText(data);
  }
};

// Helper functions
const sanitizeFilename = (filename: string): string => {
  return filename.replace(/[^a-zA-Z0-9]/g, "_");
};

const getDateString = (): string => {
  return new Date().toISOString().split("T")[0];
};
