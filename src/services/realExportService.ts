interface SessionData {
  id: string;
  title: string;
  startTime: Date;
  endTime?: Date;
  duration: number;
  transcript: string;
  questions: Array<{
    text: string;
    timestamp: string;
    confidence: number;
    answer?: string;
  }>;
  wordCount: number;
  language: string;
  metadata?: {
    [key: string]: any;
  };
}

interface ExportOptions {
  format: "json" | "txt" | "pdf" | "docx" | "csv";
  includeTimestamps: boolean;
  includeQuestions: boolean;
  includeMetadata: boolean;
  filename?: string;
}

class ExportService {
  /**
   * Export session data in the specified format
   */
  public async exportSession(
    sessionData: SessionData,
    options: ExportOptions
  ): Promise<void> {
    const filename =
      options.filename || this.generateFilename(sessionData, options.format);

    switch (options.format) {
      case "json":
        this.exportAsJSON(sessionData, filename, options);
        break;
      case "txt":
        this.exportAsText(sessionData, filename, options);
        break;
      case "csv":
        this.exportAsCSV(sessionData, filename, options);
        break;
      case "pdf":
        await this.exportAsPDF(sessionData, filename, options);
        break;
      case "docx":
        await this.exportAsDocx(sessionData, filename, options);
        break;
      default:
        throw new Error(`Unsupported export format: ${options.format}`);
    }
  }

  private generateFilename(sessionData: SessionData, format: string): string {
    const date = sessionData.startTime.toISOString().split("T")[0];
    const safeTitle = sessionData.title.replace(/[^a-zA-Z0-9]/g, "_");
    return `${safeTitle}_${date}_${sessionData.id}.${format}`;
  }

  private exportAsJSON(
    sessionData: SessionData,
    filename: string,
    options: ExportOptions
  ): void {
    const exportData: any = {
      id: sessionData.id,
      title: sessionData.title,
      startTime: sessionData.startTime.toISOString(),
      endTime: sessionData.endTime?.toISOString(),
      duration: sessionData.duration,
      transcript: sessionData.transcript,
      wordCount: sessionData.wordCount,
      language: sessionData.language,
    };

    if (options.includeQuestions) {
      exportData.questions = sessionData.questions;
    }

    if (options.includeMetadata && sessionData.metadata) {
      exportData.metadata = sessionData.metadata;
    }

    this.downloadFile(
      JSON.stringify(exportData, null, 2),
      filename,
      "application/json"
    );
  }

  private exportAsText(
    sessionData: SessionData,
    filename: string,
    options: ExportOptions
  ): void {
    let content = `${sessionData.title}\n`;
    content += `${"=".repeat(sessionData.title.length)}\n\n`;

    if (options.includeMetadata) {
      content += `Session ID: ${sessionData.id}\n`;
      content += `Start Time: ${sessionData.startTime.toLocaleString()}\n`;
      if (sessionData.endTime) {
        content += `End Time: ${sessionData.endTime.toLocaleString()}\n`;
      }
      content += `Duration: ${Math.floor(sessionData.duration / 60)}:${(
        sessionData.duration % 60
      )
        .toString()
        .padStart(2, "0")}\n`;
      content += `Word Count: ${sessionData.wordCount}\n`;
      content += `Language: ${sessionData.language}\n\n`;
    }

    content += "TRANSCRIPT\n";
    content += "---------\n";
    content += sessionData.transcript + "\n\n";

    if (options.includeQuestions && sessionData.questions.length > 0) {
      content += "DETECTED QUESTIONS\n";
      content += "------------------\n";
      sessionData.questions.forEach((q, index) => {
        content += `${index + 1}. ${q.text}`;
        if (options.includeTimestamps) {
          content += ` (${q.timestamp})`;
        }
        if (q.answer) {
          content += `\n   Answer: ${q.answer}`;
        }
        content += "\n\n";
      });
    }

    this.downloadFile(content, filename, "text/plain");
  }

  private exportAsCSV(
    sessionData: SessionData,
    filename: string,
    options: ExportOptions
  ): void {
    const rows: string[][] = [];

    // Header row
    const headers = ["Type", "Content"];
    if (options.includeTimestamps) {
      headers.push("Timestamp");
    }
    headers.push("Additional Info");
    rows.push(headers);

    // Session metadata
    if (options.includeMetadata) {
      rows.push([
        "Session Info",
        sessionData.title,
        sessionData.startTime.toISOString(),
        `ID: ${sessionData.id}`,
      ]);
      rows.push([
        "Duration",
        sessionData.duration.toString(),
        "",
        `${Math.floor(sessionData.duration / 60)}:${(sessionData.duration % 60)
          .toString()
          .padStart(2, "0")}`,
      ]);
      rows.push(["Word Count", sessionData.wordCount.toString(), "", ""]);
    }

    // Transcript
    rows.push([
      "Transcript",
      sessionData.transcript,
      sessionData.startTime.toISOString(),
      "",
    ]);

    // Questions
    if (options.includeQuestions) {
      sessionData.questions.forEach((q) => {
        const row = ["Question", q.text];
        if (options.includeTimestamps) {
          row.push(q.timestamp);
        }
        row.push(`Confidence: ${q.confidence}`);
        if (q.answer) {
          rows.push([...row]);
          const answerRow = ["Answer", q.answer];
          if (options.includeTimestamps) {
            answerRow.push(q.timestamp);
          }
          answerRow.push("");
          rows.push(answerRow);
        } else {
          rows.push(row);
        }
      });
    }

    const csvContent = rows
      .map((row) =>
        row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(",")
      )
      .join("\n");

    this.downloadFile(csvContent, filename, "text/csv");
  }

  private async exportAsPDF(
    sessionData: SessionData,
    filename: string,
    options: ExportOptions
  ): Promise<void> {
    // For PDF export, we'll create an HTML version and suggest print-to-PDF
    const htmlContent = this.generateHTMLContent(sessionData, options);

    // Create a temporary HTML file for printing
    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(htmlContent);
      printWindow.document.close();

      // Add print styles
      const style = printWindow.document.createElement("style");
      style.textContent = `
        @media print {
          body { font-family: Arial, sans-serif; margin: 1in; }
          .page-break { page-break-before: always; }
          .no-print { display: none; }
        }
      `;
      printWindow.document.head.appendChild(style);

      // Automatically open print dialog
      printWindow.onload = () => {
        printWindow.print();
      };
    } else {
      // Fallback: download as HTML
      this.downloadFile(
        htmlContent,
        filename.replace(".pdf", ".html"),
        "text/html"
      );
      alert(
        "PDF export requires popup permissions. An HTML file has been downloaded instead. You can open it in your browser and print to PDF."
      );
    }
  }

  private async exportAsDocx(
    sessionData: SessionData,
    filename: string,
    options: ExportOptions
  ): Promise<void> {
    // For DOCX export, we'll create a structured HTML that can be opened in Word
    const htmlContent = this.generateWordCompatibleHTML(sessionData, options);

    // Create with .doc extension for better Word compatibility
    const docFilename = filename.replace(".docx", ".doc");
    this.downloadFile(htmlContent, docFilename, "application/msword");
  }

  private generateHTMLContent(
    sessionData: SessionData,
    options: ExportOptions
  ): string {
    let html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>${sessionData.title}</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; margin: 40px; }
          h1 { color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 10px; }
          h2 { color: #34495e; margin-top: 30px; }
          .metadata { background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0; }
          .question { background: #e3f2fd; padding: 10px; margin: 10px 0; border-radius: 5px; }
          .answer { background: #f3e5f5; padding: 10px; margin: 5px 0 15px 20px; border-radius: 5px; }
          .timestamp { color: #666; font-size: 0.9em; }
        </style>
      </head>
      <body>
        <h1>${sessionData.title}</h1>
    `;

    if (options.includeMetadata) {
      html += `
        <div class="metadata">
          <h2>Session Information</h2>
          <p><strong>Session ID:</strong> ${sessionData.id}</p>
          <p><strong>Start Time:</strong> ${sessionData.startTime.toLocaleString()}</p>
          ${
            sessionData.endTime
              ? `<p><strong>End Time:</strong> ${sessionData.endTime.toLocaleString()}</p>`
              : ""
          }
          <p><strong>Duration:</strong> ${Math.floor(
            sessionData.duration / 60
          )}:${(sessionData.duration % 60).toString().padStart(2, "0")}</p>
          <p><strong>Word Count:</strong> ${sessionData.wordCount}</p>
          <p><strong>Language:</strong> ${sessionData.language}</p>
        </div>
      `;
    }

    html += `
      <h2>Transcript</h2>
      <p>${sessionData.transcript.replace(/\n/g, "<br>")}</p>
    `;

    if (options.includeQuestions && sessionData.questions.length > 0) {
      html += "<h2>Detected Questions</h2>";
      sessionData.questions.forEach((q, index) => {
        html += `
          <div class="question">
            <strong>Question ${index + 1}:</strong> ${q.text}
            ${
              options.includeTimestamps
                ? `<span class="timestamp"> (${q.timestamp})</span>`
                : ""
            }
            ${
              q.answer
                ? `<div class="answer"><strong>Answer:</strong> ${q.answer}</div>`
                : ""
            }
          </div>
        `;
      });
    }

    html += "</body></html>";
    return html;
  }

  private generateWordCompatibleHTML(
    sessionData: SessionData,
    options: ExportOptions
  ): string {
    // Simplified HTML that Word can import well
    let content = `<html><body>`;
    content += `<h1>${sessionData.title}</h1>`;

    if (options.includeMetadata) {
      content += `<h2>Session Information</h2>`;
      content += `<p>Session ID: ${sessionData.id}</p>`;
      content += `<p>Start Time: ${sessionData.startTime.toLocaleString()}</p>`;
      content += `<p>Duration: ${Math.floor(sessionData.duration / 60)}:${(
        sessionData.duration % 60
      )
        .toString()
        .padStart(2, "0")}</p>`;
      content += `<p>Word Count: ${sessionData.wordCount}</p>`;
    }

    content += `<h2>Transcript</h2>`;
    content += `<p>${sessionData.transcript.replace(/\n/g, "<br>")}</p>`;

    if (options.includeQuestions && sessionData.questions.length > 0) {
      content += `<h2>Questions</h2>`;
      sessionData.questions.forEach((q, index) => {
        content += `<p><strong>Q${index + 1}:</strong> ${q.text}</p>`;
        if (q.answer) {
          content += `<p><strong>A${index + 1}:</strong> ${q.answer}</p>`;
        }
      });
    }

    content += `</body></html>`;
    return content;
  }

  private downloadFile(
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

  /**
   * Share session data via Web Share API or fallback methods
   */
  public async shareSession(
    sessionData: SessionData,
    options: Partial<ExportOptions> = {}
  ): Promise<void> {
    const defaultOptions: ExportOptions = {
      format: "txt",
      includeTimestamps: true,
      includeQuestions: true,
      includeMetadata: true,
    };

    const shareOptions = { ...defaultOptions, ...options };

    if (navigator.share) {
      try {
        await navigator.share({
          title: sessionData.title,
          text: this.generateShareText(sessionData, shareOptions),
        });
      } catch (error) {
        console.log(
          "Web Share API not available, falling back to copy to clipboard"
        );
        this.copyToClipboard(sessionData, shareOptions);
      }
    } else {
      this.copyToClipboard(sessionData, shareOptions);
    }
  }

  private generateShareText(
    sessionData: SessionData,
    options: ExportOptions
  ): string {
    let text = `${sessionData.title}\n\n`;
    text += `Transcript: ${sessionData.transcript.substring(0, 200)}...`;

    if (options.includeQuestions && sessionData.questions.length > 0) {
      text += `\n\nQuestions detected: ${sessionData.questions.length}`;
    }

    return text;
  }

  private async copyToClipboard(
    sessionData: SessionData,
    options: ExportOptions
  ): Promise<void> {
    const content = this.generateTextContent(sessionData, options);

    try {
      await navigator.clipboard.writeText(content);
      alert("Session content copied to clipboard!");
    } catch (error) {
      console.error("Failed to copy to clipboard:", error);
      // Fallback: show in a modal or download as file
      this.exportAsText(sessionData, "shared_session.txt", options);
    }
  }

  private generateTextContent(
    sessionData: SessionData,
    options: ExportOptions
  ): string {
    let content = `${sessionData.title}\n`;
    content += `${"=".repeat(sessionData.title.length)}\n\n`;
    content += `Duration: ${Math.floor(sessionData.duration / 60)}:${(
      sessionData.duration % 60
    )
      .toString()
      .padStart(2, "0")}\n`;
    content += `Words: ${sessionData.wordCount}\n\n`;
    content += `TRANSCRIPT:\n${sessionData.transcript}\n\n`;

    if (options.includeQuestions && sessionData.questions.length > 0) {
      content += "QUESTIONS:\n";
      sessionData.questions.forEach((q, i) => {
        content += `${i + 1}. ${q.text}\n`;
        if (q.answer) content += `   → ${q.answer}\n`;
      });
    }

    return content;
  }
}

export const exportService = new ExportService();
