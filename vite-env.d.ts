/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_AZURE_SPEECH_KEY: string;
  readonly VITE_AZURE_SPEECH_REGION: string;
  readonly VITE_AZURE_OPENAI_API_KEY: string;
  readonly VITE_AZURE_OPENAI_ENDPOINT: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare module "*.svg" {
  const content: string;
  export default content;
}
