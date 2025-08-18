// Simple export service for LiveTranscription component
export interface TranscriptData {
  title: string;
  content: string;
  timestamp: string;
  duration: string;
}

// Simple file download helper
function downloadFile(
  content: string,
  filename: string,
  mimeType: string
): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  URL.revokeObjectURL(url);
}

// Export as plain text
export function downloadAsText(data: TranscriptData): void {
  const content = `${data.title}
${"=".repeat(data.title.length)}

Timestamp: ${data.timestamp}
Duration: ${data.duration}

TRANSCRIPT:
${data.content}`;

  downloadFile(content, `${data.title}.txt`, "text/plain");
}

// Export as PDF (using jsPDF)
export function downloadAsPdf(data: TranscriptData): void {
  try {
    // Dynamic import to avoid loading jsPDF if not needed
    import("jspdf")
      .then(({ jsPDF }) => {
        const doc = new jsPDF();

        // Title
        doc.setFontSize(20);
        doc.text(data.title, 20, 20);

        // Metadata
        doc.setFontSize(12);
        doc.text(`Timestamp: ${data.timestamp}`, 20, 40);
        doc.text(`Duration: ${data.duration}`, 20, 50);

        // Transcript content
        doc.setFontSize(10);
        const lines = doc.splitTextToSize(data.content, 170);
        doc.text(lines, 20, 70);

        doc.save(`${data.title}.pdf`);
      })
      .catch((error) => {
        console.error("Error loading jsPDF:", error);
        alert("PDF export failed. Downloading as text instead.");
        downloadAsText(data);
      });
  } catch (error) {
    console.error("Error exporting PDF:", error);
    alert("PDF export failed. Downloading as text instead.");
    downloadAsText(data);
  }
}

// Export as Word document (using docx)
export async function downloadAsWord(data: TranscriptData): Promise<void> {
  try {
    // Import the modules directly
    const docx = await import("docx");
    const fileSaver = await import("file-saver");

    const { Document, Packer, Paragraph, TextRun, HeadingLevel } = docx;
    const { saveAs } = fileSaver;

    const doc = new Document({
      sections: [
        {
          properties: {},
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: data.title,
                  bold: true,
                  size: 28,
                }),
              ],
              heading: HeadingLevel.TITLE,
            }),
            new Paragraph({
              children: [
                new TextRun({
                  text: `Timestamp: ${data.timestamp}`,
                }),
              ],
            }),
            new Paragraph({
              children: [
                new TextRun({
                  text: `Duration: ${data.duration}`,
                }),
              ],
            }),
            new Paragraph({
              children: [
                new TextRun({
                  text: "TRANSCRIPT:",
                  bold: true,
                }),
              ],
            }),
            new Paragraph({
              children: [
                new TextRun({
                  text: data.content,
                }),
              ],
            }),
          ],
        },
      ],
    });

    const buffer = await Packer.toBuffer(doc);

    // Convert buffer to Uint8Array for blob creation
    const uint8Array = new Uint8Array(buffer);

    const blob = new Blob([uint8Array], {
      type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });

    saveAs(blob, `${data.title}.docx`);
  } catch (error) {
    console.error("Error exporting Word document:", error);
    console.error("Error details:", JSON.stringify(error, null, 2));

    // Fallback: create a simple RTF document that can be opened in Word
    try {
      const rtfContent = `{\\rtf1\\ansi\\deff0 {\\fonttbl {\\f0 Times New Roman;}}
\\f0\\fs24 
\\b ${data.title}\\b0\\par
\\par
Timestamp: ${data.timestamp}\\par
Duration: ${data.duration}\\par
\\par
\\b TRANSCRIPT:\\b0\\par
${data.content.replace(/\n/g, "\\par ")}
}`;

      const blob = new Blob([rtfContent], { type: "application/rtf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${data.title}.rtf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      alert(
        "Word export completed as RTF format (compatible with Microsoft Word)."
      );
    } catch (rtfError) {
      console.error("RTF fallback failed:", rtfError);
      alert("Word export failed. Downloading as text instead.");
      downloadAsText(data);
    }
  }
}
