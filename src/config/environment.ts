// Configuration utility to handle environment variables
export const config = {
  azure: {
    speech: {
      key: import.meta.env.VITE_AZURE_SPEECH_KEY || "",
      region: import.meta.env.VITE_AZURE_SPEECH_REGION || "eastus",
    },
    openai: {
      apiKey: import.meta.env.VITE_AZURE_OPENAI_API_KEY || "",
      endpoint: import.meta.env.VITE_AZURE_OPENAI_ENDPOINT || "",
    },
  },
};

// Helper functions
export const isAzureSpeechConfigured = () => {
  return !!(config.azure.speech.key && config.azure.speech.region);
};

export const isAzureOpenAIConfigured = () => {
  return !!(config.azure.openai.apiKey && config.azure.openai.endpoint);
};
