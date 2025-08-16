import { streamAzureOpenAIResponse } from "./azureOpenAIService";

export const getAIResponseStream = async (
  prompt: string,
  onChunk: (chunk: string) => void,
  onEnd: () => void,
  onError: (error: Error) => void
) => {
  try {
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
