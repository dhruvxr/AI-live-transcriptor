import { TranscriptionSession } from "./dataStorageService";
import jsPDF from "jspdf";
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from "docx";
import { saveAs } from "file-saver";

export interface ExportOptions {
  format: "txt" | "docx" | "pdf" | "json" | "csv" | "srt";
  includeTimestamps: boolean;
  includeQuestions: boolean;
  includeAIResponses: boolean;
  includeMetadata: boolean;
}

export interface ShareOptions {
  method: "link" | "email" | "download" | "cloud";
  expiresIn?: "1h" | "24h" | "7d" | "30d" | "never";
  password?: string;
  allowEditing?: boolean;
}

// Export session in various formats
export const exportSession = (
  session: TranscriptionSession,
  options: ExportOptions
): { content: string; filename: string; mimeType: string } => {
  const {
    format,
    includeTimestamps,
    includeQuestions,
    includeAIResponses,
    includeMetadata,
  } = options;

  // Filter transcript based on options
  let filteredTranscript = session.transcript;

  if (!includeQuestions) {
    filteredTranscript = filteredTranscript.filter(
      (item) => item.type !== "question"
    );
  }

  if (!includeAIResponses) {
    filteredTranscript = filteredTranscript.filter(
      (item) => item.type !== "ai_response"
    );
  }

  const timestamp = new Date().toISOString().split("T")[0];
  const baseFilename = `${session.title.replace(
    /[^a-zA-Z0-9]/g,
    "_"
  )}_${timestamp}`;

  switch (format) {
    case "txt":
      return {
        content: exportToTxt(
          session,
          filteredTranscript,
          includeTimestamps,
          includeMetadata
        ),
        filename: `${baseFilename}.txt`,
        mimeType: "text/plain",
      };

    case "json":
      return {
        content: exportToJson(session, filteredTranscript, includeMetadata),
        filename: `${baseFilename}.json`,
        mimeType: "application/json",
      };

    case "csv":
      return {
        content: exportToCsv(
          session,
          filteredTranscript,
          includeTimestamps,
          includeMetadata
        ),
        filename: `${baseFilename}.csv`,
        mimeType: "text/csv",
      };

    case "srt":
      return {
        content: exportToSrt(filteredTranscript),
        filename: `${baseFilename}.srt`,
        mimeType: "application/x-subrip",
      };

    case "docx":
      return {
        content: exportToTxt(
          session,
          filteredTranscript,
          includeTimestamps,
          includeMetadata
        ),
        filename: `${baseFilename}.docx`,
        mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      };

    case "pdf":
      return exportToPdf(
        session,
        filteredTranscript,
        includeTimestamps,
        includeMetadata,
        baseFilename
      );

    default:
      throw new Error(`Unsupported export format: ${format}`);
  }
};

// Export to plain text
const exportToTxt = (
  session: TranscriptionSession,
  transcript: any[],
  includeTimestamps: boolean,
  includeMetadata: boolean
): string => {
  let content = "";

  if (includeMetadata) {
    content += `Title: ${session.title}\n`;
    content += `Date: ${session.date}\n`;
    content += `Duration: ${session.duration}\n`;
    content += `Type: ${session.type}\n`;
    content += `Questions: ${session.questionsCount}\n`;
    content += `Words: ${session.wordsCount}\n`;
    if (session.summary) {
      content += `Summary: ${session.summary}\n`;
    }
    content += "\n" + "=".repeat(50) + "\n\n";
  }

  transcript.forEach((item) => {
    let line = "";

    if (includeTimestamps) {
      line += `[${item.timestamp}] `;
    }

    if (item.type === "question") {
      line += "Q: ";
    } else if (item.type === "ai_response") {
      line += "AI: ";
    }

    line += item.content;

    if (item.confidence && item.confidence < 0.8) {
      line += ` (confidence: ${Math.round(item.confidence * 100)}%)`;
    }

    content += line + "\n";

    if (item.type === "question" || item.type === "ai_response") {
      content += "\n"; // Add extra line after questions and AI responses
    }
  });

  return content;
};

// Export to JSON
const exportToJson = (
  session: TranscriptionSession,
  transcript: any[],
  includeMetadata: boolean
): string => {
  const exportData = includeMetadata
    ? { ...session, transcript }
    : { transcript };

  return JSON.stringify(exportData, null, 2);
};

// Export to CSV
const exportToCsv = (
  session: TranscriptionSession,
  transcript: any[],
  includeTimestamps: boolean,
  includeMetadata: boolean
): string => {
  let csv = "";

  if (includeMetadata) {
    csv += "Session Metadata\n";
    csv += `Title,"${session.title}"\n`;
    csv += `Date,"${session.date}"\n`;
    csv += `Duration,"${session.duration}"\n`;
    csv += `Type,"${session.type}"\n`;
    csv += `Questions,${session.questionsCount}\n`;
    csv += `Words,${session.wordsCount}\n`;
    csv += "\nTranscript\n";
  }

  // CSV Header
  const headers = ["Type", "Content"];
  if (includeTimestamps) headers.unshift("Timestamp");
  headers.push("Confidence", "Speaker");

  csv += headers.join(",") + "\n";

  // CSV Rows
  transcript.forEach((item) => {
    const row = [];

    if (includeTimestamps) {
      row.push(`"${item.timestamp}"`);
    }

    row.push(`"${item.type}"`);
    row.push(`"${item.content.replace(/"/g, '""')}"`);
    row.push(`"${item.confidence || ""}"`);
    row.push(`"${item.speaker || ""}"`);

    csv += row.join(",") + "\n";
  });

  return csv;
};

// Export to SRT (subtitle format)
const exportToSrt = (transcript: any[]): string => {
  let srt = "";
  let index = 1;

  transcript.forEach((item, i) => {
    if (item.type === "speech") {
      const startTime = formatSrtTime(item.timestamp);
      const nextItem = transcript[i + 1];
      const endTime = nextItem
        ? formatSrtTime(nextItem.timestamp)
        : addSecondsToTime(startTime, 3); // Default 3 seconds duration

      srt += `${index}\n`;
      srt += `${startTime} --> ${endTime}\n`;
      srt += `${item.content}\n\n`;
      index++;
    }
  });

  return srt;
};

// Helper function to format time for SRT
const formatSrtTime = (timestamp: string): string => {
  // Convert HH:MM:SS to HH:MM:SS,000 format
  return timestamp.includes(".")
    ? timestamp.replace(".", ",")
    : timestamp + ",000";
};

// Helper function to add seconds to time
const addSecondsToTime = (time: string, seconds: number): string => {
  const [hours, minutes, secs] = time.split(":").map(Number);
  const totalSeconds = hours * 3600 + minutes * 60 + secs + seconds;

  const newHours = Math.floor(totalSeconds / 3600);
  const newMinutes = Math.floor((totalSeconds % 3600) / 60);
  const newSecs = totalSeconds % 60;

  return `${String(newHours).padStart(2, "0")}:${String(newMinutes).padStart(
    2,
    "0"
  )}:${String(newSecs).padStart(2, "0")},000`;
};

// Generate shareable link
export const generateShareableLink = (
  sessionId: string,
  options: ShareOptions
): { url: string; shareCode: string; expiresAt: Date | null } => {
  const shareCode = generateShareCode();
  const baseUrl = window.location.origin;
  const url = `${baseUrl}/share/${shareCode}`;

  let expiresAt: Date | null = null;
  if (options.expiresIn && options.expiresIn !== "never") {
    expiresAt = new Date();
    switch (options.expiresIn) {
      case "1h":
        expiresAt.setHours(expiresAt.getHours() + 1);
        break;
      case "24h":
        expiresAt.setDate(expiresAt.getDate() + 1);
        break;
      case "7d":
        expiresAt.setDate(expiresAt.getDate() + 7);
        break;
      case "30d":
        expiresAt.setDate(expiresAt.getDate() + 30);
        break;
    }
  }

  // Store share data (in a real app, this would be in a database)
  const shareData = {
    sessionId,
    shareCode,
    expiresAt,
    password: options.password,
    allowEditing: options.allowEditing || false,
    createdAt: new Date(),
  };

  localStorage.setItem(`share_${shareCode}`, JSON.stringify(shareData));

  return { url, shareCode, expiresAt };
};

// Generate random share code
const generateShareCode = (): string => {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

// Download file to user's computer
export const downloadFile = (
  content: string,
  filename: string,
  mimeType: string
): void => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.style.display = "none";

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
};

// Email sharing (opens default email client)
export const shareViaEmail = (
  session: TranscriptionSession,
  exportedContent: string,
  recipientEmail?: string
): void => {
  const subject = encodeURIComponent(`Transcription: ${session.title}`);
  const body = encodeURIComponent(
    `I'm sharing a transcription session with you:\n\n` +
      `Title: ${session.title}\n` +
      `Date: ${session.date}\n` +
      `Duration: ${session.duration}\n\n` +
      `Content:\n${exportedContent.substring(0, 1000)}${
        exportedContent.length > 1000 ? "..." : ""
      }`
  );

  const mailtoUrl = `mailto:${
    recipientEmail || ""
  }?subject=${subject}&body=${body}`;
  window.open(mailtoUrl, "_blank");
};

// Social media sharing
export const shareToSocialMedia = (
  session: TranscriptionSession,
  platform: "twitter" | "linkedin" | "facebook"
): void => {
  const text = `Just transcribed: "${session.title}" - ${session.duration} of content with ${session.questionsCount} questions!`;
  const url = window.location.href;

  let shareUrl = "";

  switch (platform) {
    case "twitter":
      shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
        text
      )}&url=${encodeURIComponent(url)}`;
      break;
    case "linkedin":
      shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(
        url
      )}`;
      break;
    case "facebook":
      shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
        url
      )}`;
      break;
  }

  if (shareUrl) {
    window.open(shareUrl, "_blank", "width=600,height=400");
  }
};

// Cloud storage integration (placeholder - would need actual cloud service integration)
export const saveToCloud = async (
  session: TranscriptionSession,
  exportedContent: string,
  provider: "googledrive" | "onedrive" | "dropbox"
): Promise<{ success: boolean; url?: string; error?: string }> => {
  // This would integrate with actual cloud storage APIs
  console.log(`Saving to ${provider}:`, session.title);

  // Placeholder implementation
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        success: true,
        url: `https://${provider}.com/files/${session.id}`,
      });
    }, 2000);
  });
};

// Export to PDF using jsPDF
const exportToPdf = (
  session: TranscriptionSession,
  transcript: any[],
  includeTimestamps: boolean,
  includeMetadata: boolean,
  baseFilename: string
): { content: string; filename: string; mimeType: string } => {
  const doc = new jsPDF();
  let yPosition = 20;
  const pageHeight = doc.internal.pageSize.height;
  const margin = 20;
  const lineHeight = 7;

  // Add title
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(session.title, margin, yPosition);
  yPosition += lineHeight * 2;

  // Add metadata if requested
  if (includeMetadata) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    
    const metadata = [
      `Date: ${session.date}`,
      `Duration: ${session.duration}`,
      `Type: ${session.type}`,
      `Questions: ${session.questionsCount}`,
      `Words: ${session.wordsCount}`
    ];

    metadata.forEach(line => {
      if (yPosition > pageHeight - margin) {
        doc.addPage();
        yPosition = margin;
      }
      doc.text(line, margin, yPosition);
      yPosition += lineHeight;
    });

    yPosition += lineHeight;
    
    // Add separator
    doc.line(margin, yPosition, doc.internal.pageSize.width - margin, yPosition);
    yPosition += lineHeight * 2;
  }

  // Add transcript content
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');

  transcript.forEach((item) => {
    let line = "";

    if (includeTimestamps) {
      line += `[${item.timestamp}] `;
    }

    if (item.type === "question") {
      line += "Q: ";
    } else if (item.type === "ai_response") {
      line += "AI: ";
    }

    line += item.content;

    // Split long lines to fit page width
    const maxWidth = doc.internal.pageSize.width - (margin * 2);
    const lines = doc.splitTextToSize(line, maxWidth);

    lines.forEach((textLine: string) => {
      if (yPosition > pageHeight - margin) {
        doc.addPage();
        yPosition = margin;
      }
      
      // Set different styles for questions and AI responses
      if (item.type === "question") {
        doc.setFont('helvetica', 'bold');
      } else if (item.type === "ai_response") {
        doc.setFont('helvetica', 'italic');
      } else {
        doc.setFont('helvetica', 'normal');
      }
      
      doc.text(textLine, margin, yPosition);
      yPosition += lineHeight;
    });

    // Add extra space after questions and AI responses
    if (item.type === "question" || item.type === "ai_response") {
      yPosition += lineHeight / 2;
    }
  });

  return {
    content: doc.output('datauristring'),
    filename: `${baseFilename}.pdf`,
    mimeType: "application/pdf",
  };
};

// Export to DOCX using docx library
const exportToDocx = async (
  session: TranscriptionSession,
  transcript: any[],
  includeTimestamps: boolean,
  includeMetadata: boolean,
  baseFilename: string
): Promise<{ content: string; filename: string; mimeType: string }> => {
  const children: Paragraph[] = [];

  // Add title
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: session.title,
          bold: true,
          size: 32,
        }),
      ],
      heading: HeadingLevel.HEADING_1,
    })
  );

  // Add metadata if requested
  if (includeMetadata) {
    children.push(
      new Paragraph({
        children: [
          new TextRun(`Date: ${session.date}`),
        ],
      }),
      new Paragraph({
        children: [
          new TextRun(`Duration: ${session.duration}`),
        ],
      }),
      new Paragraph({
        children: [
          new TextRun(`Type: ${session.type}`),
        ],
      }),
      new Paragraph({
        children: [
          new TextRun(`Questions: ${session.questionsCount}`),
        ],
      }),
      new Paragraph({
        children: [
          new TextRun(`Words: ${session.wordsCount}`),
        ],
      }),
      new Paragraph({
        children: [new TextRun("")], // Empty line
      })
    );
  }

  // Add transcript content
  transcript.forEach((item) => {
    let text = "";

    if (includeTimestamps) {
      text += `[${item.timestamp}] `;
    }

    if (item.type === "question") {
      text += "Q: ";
    } else if (item.type === "ai_response") {
      text += "AI: ";
    }

    text += item.content;

    // Create paragraph with appropriate formatting
    const textRun = new TextRun({
      text: text,
      bold: item.type === "question",
      italics: item.type === "ai_response",
    });

    children.push(
      new Paragraph({
        children: [textRun],
      })
    );

    // Add extra space after questions and AI responses
    if (item.type === "question" || item.type === "ai_response") {
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

  const buffer = await Packer.toBuffer(doc);
  const blob = new Blob([buffer], { 
    type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" 
  });

  return {
    content: URL.createObjectURL(blob),
    filename: `${baseFilename}.docx`,
    mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  };
};
