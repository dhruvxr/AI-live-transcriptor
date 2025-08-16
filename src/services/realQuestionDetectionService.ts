import { config } from "../config/environment";

interface Question {
  text: string;
  timestamp: string;
  confidence: number;
  context: string;
  suggestedAnswer?: string;
}

interface AIResponse {
  answer: string;
  confidence: number;
  sources?: string[];
}

class QuestionDetectionService {
  private apiKey: string | null = null;
  private endpoint: string | null = null;

  constructor() {
    this.loadConfig();
  }

  private loadConfig(): void {
    // Load from environment variables first, then localStorage as fallback
    if (config.azure.openai.apiKey && config.azure.openai.endpoint) {
      this.apiKey = config.azure.openai.apiKey;
      this.endpoint = config.azure.openai.endpoint;
    } else {
      // Fallback to localStorage
      this.apiKey = localStorage.getItem("openai_api_key");
      this.endpoint =
        localStorage.getItem("openai_endpoint") || "https://api.openai.com/v1";
    }
  }

  public updateConfig(apiKey: string, endpoint?: string): void {
    this.apiKey = apiKey;
    this.endpoint = endpoint || "https://api.openai.com/v1";
    localStorage.setItem("openai_api_key", apiKey);
    localStorage.setItem("openai_endpoint", this.endpoint);
  }

  /**
   * Detect questions in the given text using pattern matching and NLP
   */
  public detectQuestions(text: string, context: string = ""): Question[] {
    const questions: Question[] = [];
    const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0);

    for (const sentence of sentences) {
      const trimmed = sentence.trim();
      if (this.isQuestion(trimmed)) {
        questions.push({
          text: trimmed + "?",
          timestamp: new Date().toISOString(),
          confidence: this.calculateQuestionConfidence(trimmed),
          context: context,
        });
      }
    }

    return questions;
  }

  private isQuestion(text: string): boolean {
    const questionPatterns = [
      /^(what|when|where|who|whom|whose|why|how|which|can|could|would|should|will|is|are|am|was|were|do|does|did|have|has|had)\s/i,
      /\?$/,
      /^(tell me|explain|describe|show me|help me understand)/i,
    ];

    return questionPatterns.some((pattern) => pattern.test(text));
  }

  private calculateQuestionConfidence(text: string): number {
    let confidence = 0.5;

    // Increase confidence for explicit question words
    if (/^(what|when|where|who|why|how)/i.test(text)) {
      confidence += 0.3;
    }

    // Increase confidence for question marks
    if (text.includes("?")) {
      confidence += 0.2;
    }

    // Decrease confidence for very short or very long sentences
    if (text.length < 10 || text.length > 200) {
      confidence -= 0.1;
    }

    return Math.min(Math.max(confidence, 0), 1);
  }

  /**
   * Generate AI response to a question using Azure OpenAI API
   */
  public async generateAnswer(
    question: string,
    context: string = ""
  ): Promise<AIResponse> {
    if (!this.apiKey) {
      throw new Error("Azure OpenAI API key not configured");
    }

    try {
      const prompt = this.buildPrompt(question, context);

      // Check if using Azure OpenAI endpoint
      const isAzureEndpoint = this.endpoint?.includes(
        "cognitiveservices.azure.com"
      );
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      if (isAzureEndpoint) {
        headers["api-key"] = this.apiKey;
      } else {
        headers["Authorization"] = `Bearer ${this.apiKey}`;
      }

      const response = await fetch(this.endpoint!, {
        method: "POST",
        headers,
        body: JSON.stringify({
          messages: [
            {
              role: "system",
              content:
                "You are a helpful AI assistant that provides accurate, concise answers to questions. Base your responses on the provided context when available.",
            },
            {
              role: "user",
              content: prompt,
            },
          ],
          max_tokens: 150,
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.statusText}`);
      }

      const data = await response.json();

      return {
        answer: data.choices[0]?.message?.content || "No response generated",
        confidence: 0.8,
        sources: ["Azure OpenAI GPT-4"],
      };
    } catch (error) {
      console.error("Failed to generate AI response:", error);
      return this.getFallbackResponse(question);
    }
  }

  private buildPrompt(question: string, context: string): string {
    let prompt = `Question: ${question}\n\n`;

    if (context.trim()) {
      prompt += `Context: ${context}\n\n`;
      prompt +=
        "Please answer the question based on the provided context. If the context doesn't contain enough information, provide a general answer but mention that more context would be helpful.";
    } else {
      prompt +=
        "Please provide a helpful and accurate answer to this question.";
    }

    return prompt;
  }

  private getFallbackResponse(question: string): AIResponse {
    // Simple fallback responses for common question types
    const fallbacks: { [key: string]: string } = {
      what: "This appears to be asking for a definition or explanation. More context would help provide a specific answer.",
      how: "This seems to be asking about a process or method. The answer would depend on the specific context.",
      why: "This is asking for reasoning or cause. The explanation would depend on the specific topic being discussed.",
      when: "This is asking about timing. More context about the specific event or situation would be needed.",
      where:
        "This is asking about location. Additional context would help provide a specific answer.",
      who: "This is asking about a person or people. More context would help identify the specific individual(s).",
    };

    const questionWord = question.toLowerCase().split(" ")[0];
    const fallbackAnswer =
      fallbacks[questionWord] ||
      "I would need more context to provide a specific answer to this question.";

    return {
      answer: fallbackAnswer,
      confidence: 0.3,
      sources: ["Fallback response"],
    };
  }

  /**
   * Process transcript in real-time to detect and answer questions
   */
  public async processTranscript(
    newText: string,
    fullTranscript: string,
    onQuestionDetected: (question: Question) => void,
    onAnswerGenerated: (question: Question, answer: AIResponse) => void
  ): Promise<void> {
    // Detect questions in the new text
    const questions = this.detectQuestions(newText, fullTranscript);

    for (const question of questions) {
      onQuestionDetected(question);

      // Generate answer if AI is configured
      if (this.apiKey) {
        try {
          const answer = await this.generateAnswer(
            question.text,
            question.context
          );
          onAnswerGenerated(question, answer);
        } catch (error) {
          console.error("Failed to generate answer:", error);
        }
      }
    }
  }

  public isConfigured(): boolean {
    return !!this.apiKey;
  }

  public getConfig(): { apiKey: string | null; endpoint: string | null } {
    return {
      apiKey: this.apiKey,
      endpoint: this.endpoint,
    };
  }
}

export const questionDetectionService = new QuestionDetectionService();
