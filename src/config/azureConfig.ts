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
    // First, try to get config from environment variables
    const speechKey = import.meta.env.VITE_AZURE_SPEECH_KEY;
    const speechRegion = import.meta.env.VITE_AZURE_SPEECH_REGION;
    const openAIApiKey = import.meta.env.VITE_AZURE_OPENAI_API_KEY;
    const openAIEndpoint = import.meta.env.VITE_AZURE_OPENAI_ENDPOINT;
    const azureOpenAIApiDeploymentName = import.meta.env
      .VITE_AZURE_OPENAI_API_DEPLOYMENT_NAME;

    // If we have environment variables, use them
    if (speechKey && speechRegion) {
      // Parse deployment name from endpoint if not provided separately
      let deploymentName = azureOpenAIApiDeploymentName;
      if (!deploymentName && openAIEndpoint) {
        const match = openAIEndpoint.match(/\/deployments\/([^\/]+)\//);
        if (match) {
          deploymentName = match[1];
        }
      }

      // Clean endpoint URL (remove deployment path if present)
      let cleanEndpoint = openAIEndpoint;
      if (cleanEndpoint && cleanEndpoint.includes('/deployments/')) {
        cleanEndpoint = cleanEndpoint.split('/openai/deployments/')[0];
      }

      resolve({
        speechKey,
        speechRegion,
        openAIApiKey,
        openAIEndpoint: cleanEndpoint,
        azureOpenAIApiDeploymentName: deploymentName,
      });
      return;
    }

    // Fallback to local storage if environment variables are not available
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

    reject(
      new Error(
        "Azure configuration not found in environment variables or local storage."
      )
    );
  });
};

export const setAzureConfig = (config: AzureConfig): Promise<void> => {
  return new Promise((resolve) => {
    localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
    resolve();
  });
};
