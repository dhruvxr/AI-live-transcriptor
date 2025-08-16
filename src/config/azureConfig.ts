export interface AzureConfig {
  speechKey: string;
  speechRegion: string;
  openAIApiKey?: string;
  openAIEndpoint?: string;
  azureOpenAIApiDeploymentName?: string;
}

const CONFIG_KEY = "azureConfig";

export const getAzureConfig = (): Promise<AzureConfig> => {
  return new Promise((resolve, reject) => {
    // First, try to get config from local storage
    const storedConfig = localStorage.getItem(CONFIG_KEY);
    if (storedConfig) {
      try {
        const config = JSON.parse(storedConfig);
        if (config.speechKey && config.speechRegion) {
          resolve(config);
          return;
        }
      } catch (e) {
        console.error("Failed to parse stored Azure config", e);
      }
    }

    // Fallback to environment variables if not in local storage
    const speechKey = import.meta.env.VITE_AZURE_SPEECH_KEY;
    const speechRegion = import.meta.env.VITE_AZURE_SPEECH_REGION;
    const openAIApiKey = import.meta.env.VITE_AZURE_OPENAI_API_KEY;
    const openAIEndpoint = import.meta.env.VITE_AZURE_OPENAI_ENDPOINT;
    const azureOpenAIApiDeploymentName = import.meta.env
      .VITE_AZURE_OPENAI_API_DEPLOYMENT_NAME;

    if (speechKey && speechRegion) {
      resolve({
        speechKey,
        speechRegion,
        openAIApiKey,
        openAIEndpoint,
        azureOpenAIApiDeploymentName,
      });
    } else {
      reject(
        new Error(
          "Azure configuration not found in local storage or .env file."
        )
      );
    }
  });
};

export const setAzureConfig = (config: AzureConfig): Promise<void> => {
  return new Promise((resolve) => {
    localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
    resolve();
  });
};
