import OpenAI from '@azure/openai';
import { AzureKeyCredential } from '@azure/core-auth';

export interface AzureOpenAIConfig {
  endpoint: string;
  apiKey: string;
  deploymentId: string;
  apiVersion?: string;
  maxTokens?: number;
  temperature?: number;
  topP?: number;
}

export interface AzureAIResponse {
  answer: string;
  confidence: number;
  model: string;
  tokensUsed: number;
  reasoning?: string;
}

export interface QuestionContext {
  question: string;
  recentTranscript: string;
  sessionTopic?: string;
  sessionType?: 'lecture' | 'meeting' | 'interview' | 'other';
  speakerContext?: string;
}

export class AzureOpenAIService {
  private client: OpenAIClient | null = null;
  private config: AzureOpenAIConfig;

  constructor(config: AzureOpenAIConfig) {
    this.config = {
      apiVersion: '2024-02-01',
      maxTokens: 300,
      temperature: 0.7,
      topP: 0.9,
      ...config
    };
    
    this.initializeClient();
  }

  private initializeClient(): void {
    try {
      this.client = new OpenAIClient(
        this.config.endpoint,
        new AzureKeyCredential(this.config.apiKey)
      );
    } catch (error) {
      console.error('Failed to initialize Azure OpenAI client:', error);
      throw new Error(`Azure OpenAI initialization failed: ${error}`);
    }
  }

  public async generateAnswer(context: QuestionContext): Promise<AzureAIResponse> {
    if (!this.client) {
      throw new Error('Azure OpenAI client not initialized');
    }

    try {
      const systemPrompt = this.buildSystemPrompt(context);
      const userPrompt = this.buildUserPrompt(context);

      const response = await this.client.getChatCompletions(
        this.config.deploymentId,
        [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: userPrompt
          }
        ],
        {
          maxTokens: this.config.maxTokens,
          temperature: this.config.temperature,
          topP: this.config.topP,
          frequencyPenalty: 0,
          presencePenalty: 0,
        }
      );

      const choice = response.choices[0];
      if (!choice?.message?.content) {
        throw new Error('No response generated from Azure OpenAI');
      }

      // Calculate confidence based on response quality
      const confidence = this.calculateConfidence(choice.message.content, context.question);

      return {
        answer: choice.message.content.trim(),
        confidence,
        model: this.config.deploymentId,
        tokensUsed: response.usage?.totalTokens || 0,
        reasoning: choice.finishReason || undefined
      };

    } catch (error) {
      console.error('Azure OpenAI API error:', error);
      
      // Return fallback response
      return this.getFallbackResponse(context);
    }
  }

  private buildSystemPrompt(context: QuestionContext): string {
    const basePrompt = `You are an intelligent AI assistant helping with live transcription sessions. You provide accurate, helpful, and contextually relevant answers to questions detected in the transcript.

Session Context:
- Type: ${context.sessionType || 'general'}
- Topic: ${context.sessionTopic || 'general discussion'}
${context.speakerContext ? `- Speaker Context: ${context.speakerContext}` : ''}

Guidelines:
1. Provide clear, concise, and accurate answers
2. Consider the context of the ongoing conversation
3. If you're uncertain about something, acknowledge the uncertainty
4. For academic questions, provide educational and informative responses
5. For meeting questions, focus on practical and actionable information
6. Keep responses conversational and appropriate for live sessions
7. Limit responses to 2-3 sentences unless more detail is specifically requested

Recent conversation context will be provided to help you understand the flow of discussion.`;

    return basePrompt;
  }

  private buildUserPrompt(context: QuestionContext): string {
    let prompt = '';
    
    if (context.recentTranscript) {
      prompt += `Recent conversation:\n"${context.recentTranscript}"\n\n`;
    }
    
    prompt += `Question to answer: "${context.question}"\n\n`;
    prompt += `Please provide a helpful and contextually appropriate answer based on the conversation flow and the specific question asked.`;

    return prompt;
  }

  private calculateConfidence(answer: string, question: string): number {
    // Basic confidence calculation based on response characteristics
    let confidence = 0.8; // Base confidence
    
    // Boost confidence for longer, more detailed responses
    if (answer.length > 100) confidence += 0.1;
    if (answer.length > 200) confidence += 0.05;
    
    // Reduce confidence for very short responses
    if (answer.length < 50) confidence -= 0.2;
    
    // Check for uncertainty indicators
    const uncertaintyWords = ['not sure', 'might be', 'possibly', 'perhaps', 'maybe', 'I think'];
    const hasUncertainty = uncertaintyWords.some(word => 
      answer.toLowerCase().includes(word.toLowerCase())
    );
    if (hasUncertainty) confidence -= 0.15;
    
    // Check for confident language
    const confidentWords = ['definitely', 'certainly', 'clearly', 'specifically'];
    const hasConfidence = confidentWords.some(word => 
      answer.toLowerCase().includes(word.toLowerCase())
    );
    if (hasConfidence) confidence += 0.1;
    
    // Ensure confidence is within bounds
    return Math.max(0.5, Math.min(1.0, confidence)) * 100;
  }

  private getFallbackResponse(context: QuestionContext): AzureAIResponse {
    const fallbackAnswers = [
      "I need more context to provide a specific answer to that question. Could you provide additional details?",
      "That's an interesting question. Based on the current discussion, let me think about the best way to address that.",
      "I want to make sure I give you an accurate answer. Could you rephrase the question or provide more context?",
      "That question touches on an important topic. Let me provide what information I can based on our conversation so far."
    ];

    const randomAnswer = fallbackAnswers[Math.floor(Math.random() * fallbackAnswers.length)];

    return {
      answer: randomAnswer,
      confidence: 60,
      model: 'fallback',
      tokensUsed: 0,
      reasoning: 'fallback_response'
    };
  }

  // Configuration methods
  public updateConfig(newConfig: Partial<AzureOpenAIConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    // Reinitialize client if endpoint or API key changed
    if (newConfig.endpoint || newConfig.apiKey || newConfig.deploymentId) {
      this.initializeClient();
    }
  }

  public getConfig(): AzureOpenAIConfig {
    return { ...this.config };
  }

  // Health check
  public async testConnection(): Promise<boolean> {
    try {
      if (!this.client) return false;

      const testResponse = await this.client.getChatCompletions(
        this.config.deploymentId,
        [
          {
            role: 'user',
            content: 'Hello, this is a connection test. Please respond with "OK".'
          }
        ],
        {
          maxTokens: 10,
          temperature: 0
        }
      );

      return testResponse.choices[0]?.message?.content?.includes('OK') || false;
    } catch (error) {
      console.error('Azure OpenAI connection test failed:', error);
      return false;
    }
  }

  // Batch processing for multiple questions
  public async generateMultipleAnswers(contexts: QuestionContext[]): Promise<AzureAIResponse[]> {
    const promises = contexts.map(context => this.generateAnswer(context));
    return Promise.all(promises);
  }

  // Specialized methods for different session types
  public async generateLectureAnswer(context: QuestionContext): Promise<AzureAIResponse> {
    const enhancedContext = {
      ...context,
      sessionType: 'lecture' as const
    };
    
    return this.generateAnswer(enhancedContext);
  }

  public async generateMeetingAnswer(context: QuestionContext): Promise<AzureAIResponse> {
    const enhancedContext = {
      ...context,
      sessionType: 'meeting' as const
    };
    
    return this.generateAnswer(enhancedContext);
  }

  // Cleanup
  public dispose(): void {
    this.client = null;
  }
}
