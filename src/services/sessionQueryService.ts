import { getSessionById, getAllSessions } from "./dataStorageService";
import { streamAzureOpenAIResponse } from "./azureOpenAIService-fixed";

export interface SessionQuery {
  id: string;
  sessionId: string;
  query: string;
  response: string;
  timestamp: string;
}

// Ask a question about a specific session
export const querySession = async (
  sessionId: string,
  question: string,
  onChunk: (chunk: string) => void,
  onEnd: () => void,
  onError: (error: Error) => void
) => {
  try {
    const session = await getSessionById(sessionId);
    if (!session) {
      throw new Error("Session not found");
    }

    // Create context from the session transcript
    const transcriptContext = session.transcript
      .map((item) => {
        const timeStr = new Date(item.timestamp).toLocaleTimeString();
        const prefix =
          item.type === "question"
            ? "QUESTION"
            : item.type === "ai_response"
            ? "AI RESPONSE"
            : "SPEECH";
        return `[${timeStr}] ${prefix}: ${item.content}`;
      })
      .join("\n");

    const prompt = `You are an AI assistant helping analyze a transcription session. 

Session Information:
- Title: ${session.title}
- Date: ${session.date}
- Duration: ${session.duration}
- Type: ${session.type}

Session Transcript:
${transcriptContext}

User Question: ${question}

Please answer the user's question based on the transcript content above. Be specific and reference relevant parts of the conversation. If the information isn't available in the transcript, say so clearly.`;

    const stream = await streamAzureOpenAIResponse(prompt);
    const reader = stream.getReader();
    const decoder = new TextDecoder();

    reader.read().then(function processText({ done, value }): any {
      if (done) {
        onEnd();
        return;
      }

      const chunk = decoder.decode(value, { stream: true });
      onChunk(chunk);

      return reader.read().then(processText);
    });
  } catch (error) {
    onError(error as Error);
  }
};

// Search across all sessions for content
export const searchAllSessions = async (
  searchQuery: string,
  onChunk: (chunk: string) => void,
  onEnd: () => void,
  onError: (error: Error) => void
) => {
  try {

    const allSessions = await getAllSessions();

    // Find sessions that contain the search query
    const relevantSessions = allSessions.filter((session) => {
      const searchText = searchQuery.toLowerCase();
      return (
        session.title.toLowerCase().includes(searchText) ||
        session.summary?.toLowerCase().includes(searchText) ||
        session.transcript.some((item) =>
          item.content.toLowerCase().includes(searchText)
        )
      );
    });

    if (relevantSessions.length === 0) {
      onChunk("No sessions found containing that information.");
      onEnd();
      return;
    }

    // Create context from relevant sessions
    const sessionsContext = relevantSessions
      .slice(0, 5) // Limit to top 5 relevant sessions
      .map((session) => {
        const relevantTranscripts = session.transcript
          .filter((item) =>
            item.content.toLowerCase().includes(searchQuery.toLowerCase())
          )
          .slice(0, 3) // Limit to 3 most relevant items per session
          .map((item) => {
            const timeStr = new Date(item.timestamp).toLocaleTimeString();
            return `  [${timeStr}] ${item.content}`;
          })
          .join("\n");

        return `Session: ${session.title} (${session.date})
${relevantTranscripts}`;
      })
      .join("\n\n");

    const prompt = `You are an AI assistant helping search through transcription sessions.

Search Query: "${searchQuery}"

Relevant Sessions Found:
${sessionsContext}

Please provide a helpful summary of what was found related to "${searchQuery}" across these sessions. Include specific quotes and mention which session each piece of information came from.`;

    const stream = await streamAzureOpenAIResponse(prompt);
    const reader = stream.getReader();
    const decoder = new TextDecoder();

    reader.read().then(function processText({ done, value }): any {
      if (done) {
        onEnd();
        return;
      }

      const chunk = decoder.decode(value, { stream: true });
      onChunk(chunk);

      return reader.read().then(processText);
    });
  } catch (error) {
    onError(error as Error);
  }
};

// Get conversation history for a session (questions and AI responses)
export const getSessionConversation = (sessionId: string) => {
  // Support both sync and async getSessionById
  const getConversation = async () => {
    const session = await getSessionById(sessionId);
    if (!session) return [];
    return session.transcript
      .filter((item) => item.type === "question" || item.type === "ai_response")
      .map((item) => ({
        id: item.id,
        type: item.type,
        content: item.content,
        timestamp: item.timestamp,
      }));
  };
  return getConversation();
};

// Generate a smart summary of a session
export const generateSessionSummary = async (
  sessionId: string,
  onChunk: (chunk: string) => void,
  onEnd: () => void,
  onError: (error: Error) => void
) => {
  try {
    const session = await getSessionById(sessionId);
    if (!session) {
      throw new Error("Session not found");
    }

    const transcriptText = session.transcript
      .map((item) => item.content)
      .join(" ");

    const prompt = `Please analyze this transcription session and provide a comprehensive summary:

Session: ${session.title}
Date: ${session.date}
Duration: ${session.duration}
Type: ${session.type}

Transcript:
${transcriptText}

Please provide:
1. Main topics discussed
2. Key points and insights
3. Important questions asked
4. Action items or conclusions (if any)
5. Overall theme or purpose of the session

Keep the summary concise but informative.`;

    const stream = await streamAzureOpenAIResponse(prompt);
    const reader = stream.getReader();
    const decoder = new TextDecoder();

    reader.read().then(function processText({ done, value }): any {
      if (done) {
        onEnd();
        return;
      }

      const chunk = decoder.decode(value, { stream: true });
      onChunk(chunk);

      return reader.read().then(processText);
    });
  } catch (error) {
    onError(error as Error);
  }
};
