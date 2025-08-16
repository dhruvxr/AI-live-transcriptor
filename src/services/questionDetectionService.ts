import { streamAzureOpenAIResponse } from './azureOpenAIService';

const QUESTION_KEYWORDS = [
  "what",
  "who",
  "when",
  "where",
  "why",
  "how",
  "is",
  "are",
  "do",
  "does",
  "did",
  "can",
  "could",
  "will",
  "would",
  "should",
  "which",
  "tell me about",
  "explain",
  "describe",
  "define",
  "show me",
  "help me",
];

export const isQuestion = (text: string): boolean => {
  const normalizedText = text.toLowerCase().trim();

  // Check for question mark
  if (normalizedText.endsWith("?")) {
    return true;
  }

  // Check for question keywords at the beginning
  return QUESTION_KEYWORDS.some((keyword) =>
    normalizedText.startsWith(keyword + " ")
  );
};

// Enhanced question detection with confidence scoring
export const detectQuestionWithConfidence = (text: string): { isQuestion: boolean; confidence: number; type: string } => {
  const normalizedText = text.toLowerCase().trim();
  let confidence = 0;
  let type = 'unknown';

  // High confidence indicators
  if (normalizedText.endsWith("?")) {
    confidence += 0.8;
    type = 'explicit';
  }

  // Check for question words at the beginning
  const questionWords = {
    'what': 0.7,
    'who': 0.7,
    'when': 0.7,
    'where': 0.7,
    'why': 0.7,
    'how': 0.7,
    'which': 0.6,
    'is': 0.4,
    'are': 0.4,
    'do': 0.5,
    'does': 0.5,
    'did': 0.5,
    'can': 0.4,
    'could': 0.4,
    'will': 0.4,
    'would': 0.4,
    'should': 0.4,
  };

  for (const [word, weight] of Object.entries(questionWords)) {
    if (normalizedText.startsWith(word + " ")) {
      confidence += weight;
      type = 'interrogative';
      break;
    }
  }

  // Check for imperative phrases that request information
  const imperativePhrases = [
    'tell me about',
    'explain',
    'describe',
    'define',
    'show me',
    'help me understand'
  ];

  for (const phrase of imperativePhrases) {
    if (normalizedText.includes(phrase)) {
      confidence += 0.6;
      type = 'imperative';
      break;
    }
  }

  // Adjust confidence based on sentence structure
  if (normalizedText.includes(' or ')) {
    confidence += 0.2; // Choice questions
  }

  // Cap confidence at 1.0
  confidence = Math.min(confidence, 1.0);

  return {
    isQuestion: confidence > 0.3,
    confidence,
    type
  };
};

// Generate AI response to detected questions
export const generateQuestionResponse = async (
  question: string,
  context?: string
): Promise<{
  response: string;
  confidence: number;
  processingTime: number;
}> => {
  const startTime = Date.now();

  try {
    // Construct prompt with context
    let prompt = `Question: ${question}`;
    
    if (context) {
      prompt = `Context: ${context}\n\nBased on the above context, please answer the following question:\n${question}`;
    }

    prompt += `\n\nPlease provide a clear, concise, and helpful answer. If you're not certain about something, please indicate that in your response.`;

    const stream = await streamAzureOpenAIResponse(prompt);
    const reader = stream.getReader();
    const decoder = new TextDecoder();
    let response = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      response += decoder.decode(value, { stream: true });
    }

    const processingTime = Date.now() - startTime;

    return {
      response: response.trim(),
      confidence: 0.9, // High confidence for AI responses
      processingTime
    };
  } catch (error) {
    console.error('Error generating AI response:', error);
    
    const processingTime = Date.now() - startTime;
    
    return {
      response: "I apologize, but I'm unable to generate a response at the moment. Please try again later or rephrase your question.",
      confidence: 0.1,
      processingTime
    };
  }
};

// Extract key topics from questions for better context management
export const extractQuestionTopics = (question: string): string[] => {
  const normalizedText = question.toLowerCase();
  
  // Common academic/professional topics
  const topicKeywords = {
    'biology': ['cell', 'organism', 'dna', 'protein', 'evolution', 'biology', 'cellular'],
    'technology': ['computer', 'software', 'programming', 'code', 'algorithm', 'tech'],
    'business': ['project', 'meeting', 'deadline', 'budget', 'revenue', 'strategy'],
    'science': ['experiment', 'hypothesis', 'research', 'study', 'analysis', 'data'],
    'education': ['learn', 'teach', 'study', 'course', 'lesson', 'assignment'],
    'health': ['medicine', 'treatment', 'diagnosis', 'patient', 'medical', 'health']
  };

  const detectedTopics: string[] = [];

  for (const [topic, keywords] of Object.entries(topicKeywords)) {
    if (keywords.some(keyword => normalizedText.includes(keyword))) {
      detectedTopics.push(topic);
    }
  }

  return detectedTopics;
};

// Question analytics
export const analyzeQuestionPatterns = (questions: string[]): {
  totalQuestions: number;
  averageLength: number;
  topTopics: string[];
  questionTypes: { [key: string]: number };
} => {
  const totalQuestions = questions.length;
  const averageLength = questions.reduce((sum, q) => sum + q.length, 0) / totalQuestions;
  
  const allTopics: string[] = [];
  const questionTypes: { [key: string]: number } = {};

  questions.forEach(question => {
    const topics = extractQuestionTopics(question);
    allTopics.push(...topics);

    const detection = detectQuestionWithConfidence(question);
    questionTypes[detection.type] = (questionTypes[detection.type] || 0) + 1;
  });

  // Count topic frequencies
  const topicCounts: { [key: string]: number } = {};
  allTopics.forEach(topic => {
    topicCounts[topic] = (topicCounts[topic] || 0) + 1;
  });

  const topTopics = Object.entries(topicCounts)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5)
    .map(([topic]) => topic);

  return {
    totalQuestions,
    averageLength: Math.round(averageLength),
    topTopics,
    questionTypes
  };
};
