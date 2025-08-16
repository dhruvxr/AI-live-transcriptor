# Azure Setup Guide for AI Live Transcriptor

Follow these steps to configure the necessary Azure resources for the AI Live Transcriptor application.

## 1. Create a Cognitive Services Resource

This resource will provide the Speech-to-Text capabilities.

1.  **Go to the Azure Portal**: [portal.azure.com](https://portal.azure.com)
2.  **Create a new resource**: Click on "Create a resource" and search for "Cognitive Services".
3.  **Configure the resource**:
    - **Subscription**: Choose your Azure subscription.
    - **Resource group**: Create a new one (e.g., `AI-Transcriptor-RG`) or select an existing one.
    - **Region**: Choose a region close to you (e.g., `East US`).
    - **Name**: Give it a unique name (e.g., `YourName-AI-Transcriptor-Cognitive`).
    - **Pricing tier**: Select `Standard S0`.
4.  **Review and create**: Click "Review + create", then "Create".

## 2. Create an Azure OpenAI Resource

This resource will power the AI question-answering feature.

1.  **Create a new resource**: In the Azure Portal, search for "Azure OpenAI".
2.  **Configure the resource**:
    - **Subscription**: Choose your Azure subscription.
    - **Resource group**: Use the same resource group as before.
    - **Region**: Choose a region that supports the model you want to use (e.g., `East US`).
    - **Name**: Give it a unique name (e.g., `YourName-AI-Transcriptor-OpenAI`).
    - **Pricing tier**: Select `Standard S0`.
3.  **Review and create**: Click "Review + create", then "Create".

## 3. Deploy a Model

You need to deploy a model within your Azure OpenAI resource.

1.  **Go to Azure OpenAI Studio**: Navigate to your newly created Azure OpenAI resource in the portal and click on "Go to Azure OpenAI Studio".
2.  **Go to Deployments**: In the left-hand menu, click on "Deployments".
3.  **Create a new deployment**:
    - **Model**: Choose a model like `gpt-35-turbo` or `gpt-4`.
    - **Deployment name**: Give your deployment a name. **It's important to copy this name**, as you'll need it for your configuration. A simple name like `gpt35turbo` is a good choice.
4.  **Create the deployment**.

## 4. Get Your API Keys and Credentials

You'll need to collect a few pieces of information to configure the application.

1.  **Cognitive Services Keys**:

    - Go to your Cognitive Services resource in the Azure Portal.
    - Under "Resource Management", click on "Keys and Endpoint".
    - Copy one of the **Keys** and the **Region**.

2.  **Azure OpenAI Keys**:
    - Go to your Azure OpenAI resource in the Azure Portal.
    - Under "Resource Management", click on "Keys and Endpoint".
    - Copy one of the **Keys** and the **Endpoint** URL.

## 5. Configure Your Local Application

Create a `.env` file in the root of the project directory and add the credentials you just copied.

1.  **Create the file**: In your code editor, create a new file named `.env` in the root of the `AI-live-transcriptor` folder.
2.  **Add the following content** to the `.env` file, replacing the placeholder values with your actual credentials:

```env
# Azure Speech Service (Cognitive Services)
VITE_AZURE_SPEECH_KEY=YOUR_COGNITIVE_SERVICES_KEY
VITE_AZURE_SPEECH_REGION=YOUR_COGNITIVE_SERVICES_REGION

# Azure OpenAI Service
VITE_AZURE_OPENAI_KEY=YOUR_AZURE_OPENAI_KEY
VITE_AZURE_OPENAI_ENDPOINT=YOUR_AZURE_OPENAI_ENDPOINT
VITE_AZURE_OPENAI_DEPLOYMENT_NAME=YOUR_MODEL_DEPLOYMENT_NAME
```

After completing these steps, your application should be fully configured to use the Azure services. You can now run the application locally.
