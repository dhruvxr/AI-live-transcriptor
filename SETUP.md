# 🚀 AI Live Transcriptor - Setup Guide

A comprehensive guide to get the AI Live Transcriptor app running in VS Code from scratch.

## 📋 Prerequisites

### Required Software

1. **Node.js** (v18 or higher)

   - Download from: https://nodejs.org/
   - Verify installation: `node --version`

2. **npm** (comes with Node.js)

   - Verify installation: `npm --version`

3. **Git**

   - Download from: https://git-scm.com/
   - Verify installation: `git --version`

4. **VS Code**
   - Download from: https://code.visualstudio.com/

### Azure Services (Required for Full Functionality)

1. **Azure Subscription** - Create free account at https://azure.microsoft.com/
2. **Azure Speech Services** - For real-time transcription
3. **Azure OpenAI** - For AI-powered question responses

## 🛠️ Installation Steps

### 1. Clone the Repository

```bash
git clone https://github.com/dhruvxr/AI-live-transcriptor.git
cd AI-live-transcriptor
```

### 2. Open in VS Code

```bash
code .
```

Or open VS Code and use `File > Open Folder` to select the project directory.

### 3. Install Dependencies

```bash
npm install
```

### 4. Environment Configuration

#### Create Environment File

Create a `.env` file in the root directory:

```bash
# Copy the example environment file
cp .env.example .env
```

#### Configure Azure Services

Edit `.env` with your Azure credentials:

```env
# Azure Speech Services
VITE_AZURE_SPEECH_KEY=your_speech_service_key_here
VITE_AZURE_SPEECH_REGION=your_region_here

# Azure OpenAI
VITE_AZURE_OPENAI_API_KEY=your_openai_key_here
VITE_AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com/
```

#### Get Azure Credentials:

**Azure Speech Services:**

1. Go to [Azure Portal](https://portal.azure.com)
2. Create a new "Speech Services" resource
3. Copy the **Key** and **Region** from the resource overview

**Azure OpenAI:**

1. Request access to Azure OpenAI (if not already approved)
2. Create an "Azure OpenAI" resource
3. Copy the **API Key** and **Endpoint** from the resource

### 5. Start Development Server

```bash
npm run dev
```

The app will open at `http://localhost:5173` (or another port if 5173 is busy).

## 🎯 Quick Start Usage

### 1. First Launch

- App will automatically clear any dummy data
- You'll see empty dashboards (this is correct!)
- No sessions will be displayed initially

### 2. Start Recording

1. Click "Start Live Transcription"
2. Allow microphone permissions when prompted
3. Start speaking - you'll see real-time transcription
4. Ask questions to trigger AI responses
5. Click "Stop" to end the session

### 3. View Sessions

- Navigate to "Past Sessions" to see your recordings
- Use "Session History" for detailed views
- Export sessions in multiple formats

## 🔧 VS Code Recommended Extensions

Install these extensions for the best development experience:

1. **TypeScript and JavaScript Language Features** (built-in)
2. **Tailwind CSS IntelliSense** - `bradlc.vscode-tailwindcss`
3. **ES7+ React/Redux/React-Native snippets** - `dsznajder.es7-react-js-snippets`
4. **Auto Rename Tag** - `formulahendry.auto-rename-tag`
5. **Prettier - Code formatter** - `esbenp.prettier-vscode`
6. **GitLens** - `eamodio.gitlens`

## 🐛 Troubleshooting

### Common Issues

#### 1. "Module not found" errors

```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

#### 2. Port already in use

```bash
# Check what's using the port
netstat -ano | findstr :5173

# Kill the process or use different port
npm run dev -- --port 3000
```

#### 3. Microphone permissions denied

- Ensure HTTPS (required for microphone access)
- Check browser permissions settings
- Try different browsers (Chrome recommended)

#### 4. Azure services not working

- Verify environment variables are set correctly
- Check Azure resource status in Azure Portal
- Ensure API keys haven't expired

#### 5. TypeScript errors

```bash
# Check TypeScript configuration
npx tsc --noEmit
```

### Build Issues

```bash
# Clear Vite cache
rm -rf .vite
npm run dev
```

## 📁 Project Structure

```
AI-live-transcriptor/
├── src/
│   ├── components/          # React components
│   ├── services/           # Azure & API services
│   ├── config/             # Configuration files
│   ├── types/              # TypeScript definitions
│   └── utils/              # Utility functions
├── components/             # UI components
│   └── ui/                 # Reusable UI components
├── extension/              # Browser extension files
├── styles/                 # CSS files
├── public/                 # Static assets
└── package.json           # Dependencies & scripts
```

## 🌐 Browser Extension Setup

### 1. Load Extension in Chrome/Firefox

1. Open `chrome://extensions/` (or `about:debugging` in Firefox)
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select the `extension/` folder

### 2. Extension Usage

- Click extension icon in browser toolbar
- Start/stop recording from any webpage
- Recordings sync with main application

## 🚀 Deployment

### Build for Production

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

## 📞 Support

### Documentation

- Check the main README.md for detailed feature documentation
- Review component comments for implementation details

### Common Solutions

1. **Empty sessions**: This is normal on first run - start recording to create sessions
2. **No AI responses**: Ensure Azure OpenAI is configured correctly
3. **Poor transcription**: Check microphone quality and background noise

## ✅ Verification Checklist

- [ ] Node.js and npm installed
- [ ] Repository cloned and opened in VS Code
- [ ] Dependencies installed successfully (`npm install`)
- [ ] Environment variables configured
- [ ] Development server starts (`npm run dev`)
- [ ] App opens in browser without errors
- [ ] Microphone permissions granted
- [ ] Azure services configured (optional but recommended)
- [ ] Can start and stop transcription
- [ ] Sessions are saved and visible

## 🎉 You're Ready!

Once you've completed these steps, you'll have a fully functional AI Live Transcriptor app running in your VS Code environment. The app will automatically handle session management, provide real-time transcription, and offer AI-powered features when properly configured with Azure services.

Happy transcribing! 🎤✨
