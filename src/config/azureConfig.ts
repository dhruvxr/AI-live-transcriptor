export interface AzureConfig {
  speechKey: string;
  speechRegion: string;
  openAIApiKey?: string;
  openAIEndpoint?: string;
  azureOpenAIApiDeploymentName?: string;
}

export const getAzureConfig = (): Promise<AzureConfig> => {
  return new Promise((resolve, reject) => {
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
      reject(new Error("Azure Speech key or region not found in .env file."));
    }
  });
};
