import { getAzureConfig } from "../config/azureConfig";

export async function streamAzureOpenAIResponse(
  prompt: string
): Promise<ReadableStream<Uint8Array>> {
  try {
    const config = await getAzureConfig();

    if (
      !config.openAIApiKey ||
      !config.openAIEndpoint ||
      !config.azureOpenAIApiDeploymentName
    ) {
      throw new Error(
        "Azure OpenAI configuration is missing. Please check your .env file."
      );
    }

    // Use fetch API for Azure OpenAI REST API
    const response = await fetch(
      `${config.openAIEndpoint}/openai/deployments/${config.azureOpenAIApiDeploymentName}/chat/completions?api-version=2024-02-15-preview`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "api-key": config.openAIApiKey,
        },
        body: JSON.stringify({
          messages: [
            {
              role: "system",
              content:
                "You are a helpful assistant that provides clear and concise explanations.",
            },
            { role: "user", content: prompt },
          ],
          stream: true,
          max_tokens: 1000,
          temperature: 0.7,
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Azure OpenAI API error response:", errorText);
      throw new Error(
        `Azure OpenAI API error: ${response.status} ${response.statusText}`
      );
    }

    if (!response.body) {
      throw new Error("No response body received");
    }

    // Transform the response stream to extract content
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        const decoder = new TextDecoder();
        const reader = response.body!.getReader();

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split("\n");

            for (const line of lines) {
              if (line.startsWith("data: ")) {
                const data = line.slice(6);
                if (data === "[DONE]") {
                  controller.close();
                  return;
                }

                try {
                  const parsed = JSON.parse(data);
                  const content = parsed.choices?.[0]?.delta?.content;
                  if (content) {
                    controller.enqueue(encoder.encode(content));
                  }
                } catch (parseError) {
                  // Skip invalid JSON lines
                  continue;
                }
              }
            }
          }
          controller.close();
        } catch (error) {
          console.error("Error streaming response:", error);
          controller.enqueue(
            encoder.encode("Sorry, there was an error generating the response.")
          );
          controller.close();
        }
      },
    });

    return stream;
  } catch (error) {
    console.error("Azure OpenAI configuration error:", error);
    // Return error stream
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        controller.enqueue(encoder.encode(`Error: ${errorMessage}`));
        controller.close();
      },
    });
    return stream;
  }
}

// Helper function for the LiveTranscription component
export async function getAIResponseStream(
  prompt: string,
  onChunk: (chunk: string) => void,
  onComplete: () => void,
  onError?: (error: Error) => void
): Promise<void> {
  try {
    // Check configuration first
    const config = await getAzureConfig();

    if (
      !config.openAIApiKey ||
      !config.openAIEndpoint ||
      !config.azureOpenAIApiDeploymentName
    ) {
      const missingFields = [];
      if (!config.openAIApiKey) missingFields.push("VITE_AZURE_OPENAI_API_KEY");
      if (!config.openAIEndpoint)
        missingFields.push("VITE_AZURE_OPENAI_ENDPOINT");
      if (!config.azureOpenAIApiDeploymentName)
        missingFields.push("VITE_AZURE_OPENAI_API_DEPLOYMENT_NAME");

      const errorMessage = `Azure OpenAI configuration is incomplete. Missing environment variables: ${missingFields.join(
        ", "
      )}. Please check your .env file.`;
      onChunk(errorMessage);
      onComplete();
      return;
    }

    const stream = await streamAzureOpenAIResponse(prompt);
    const reader = stream.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      onChunk(chunk);
    }

    onComplete();
  } catch (error) {
    console.error("Error in getAIResponseStream:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";

    if (
      errorMessage.includes("configuration") ||
      errorMessage.includes("config") ||
      errorMessage.includes(".env")
    ) {
      onChunk(
        "Please check your Azure OpenAI configuration in the .env file. Make sure all required environment variables are set correctly."
      );
    } else {
      onChunk(`Error: ${errorMessage}`);
    }

    if (onError) {
      onError(error as Error);
    }
    onComplete();
  }
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
