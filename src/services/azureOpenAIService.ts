import { OpenAIClient } from "@azure/openai";
import { AzureKeyCredential } from "@azure/core-auth";
import { getAzureConfig } from "../config/azureConfig";

export async function streamAzureOpenAIResponse(
  prompt: string
): Promise<ReadableStream<Uint8Array>> {
  const config = await getAzureConfig();

  if (
    !config.openAIApiKey ||
    !config.openAIEndpoint ||
    !config.azureOpenAIApiDeploymentName
  ) {
    throw new Error("Azure OpenAI configuration is missing.");
  }

  const client = new OpenAIClient(
    config.openAIEndpoint,
    new AzureKeyCredential(config.openAIApiKey)
  );

  const events = await client.streamChatCompletions(
    config.azureOpenAIApiDeploymentName,
    [
      { role: "system", content: "You are a helpful assistant." },
      { role: "user", content: prompt },
    ]
  );

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      for await (const event of events) {
        for (const choice of event.choices) {
          if (choice.delta?.content) {
            controller.enqueue(encoder.encode(choice.delta.content));
          }
        }
      }
      controller.close();
    },
  });

  return stream;
}
