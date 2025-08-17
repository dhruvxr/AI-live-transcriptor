// Temporarily disabled due to import issues
// import { AzureOpenAI } from "@azure/openai";
// import { AzureKeyCredential } from "@azure/core-auth";
// import { getAzureConfig } from "../config/azureConfig";

export async function streamAzureOpenAIResponse(
  prompt: string
): Promise<ReadableStream<Uint8Array>> {
  console.log("Azure OpenAI service called with prompt:", prompt);

  // Return a mock stream for now
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode("This is a mock AI response. "));
      controller.enqueue(
        encoder.encode("Azure OpenAI service is temporarily disabled. ")
      );
      controller.enqueue(
        encoder.encode("Please configure the service properly.")
      );
      controller.close();
    },
  });

  return stream;
}

/* Original implementation - commented out due to import issues

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
          const delta = choice.delta?.content;
          if (delta !== undefined) {
            controller.enqueue(encoder.encode(delta));
          }
        }
      }
      controller.close();
    },
  });

  return stream;
}

*/
