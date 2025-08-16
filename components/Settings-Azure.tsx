import React, { useState, useEffect } from "react";
import {
  getAzureConfig,
  setAzureConfig,
  AzureConfig,
} from "../src/config/azureConfig";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "./ui/card";

const SettingsAzure: React.FC = () => {
  const [config, setConfig] = useState<Partial<AzureConfig>>({
    speechKey: "",
    speechRegion: "",
    openAIApiKey: "",
    openAIEndpoint: "",
  });
  const [status, setStatus] = useState("");

  useEffect(() => {
    getAzureConfig()
      .then((currentConfig) => setConfig(currentConfig))
      .catch(() => {
        // Ignore error if config not set yet
      });
  }, []);

  const handleSave = () => {
    // Basic validation
    if (!config.speechKey || !config.speechRegion) {
      setStatus("Speech Key and Region are required.");
      return;
    }
    setAzureConfig(config as AzureConfig)
      .then(() => setStatus("Configuration saved successfully!"))
      .catch((error) =>
        setStatus(`Error saving configuration: ${error.message}`)
      );
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setConfig((prevConfig) => ({ ...prevConfig, [name]: value }));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Azure Configuration</CardTitle>
        <CardDescription>
          Enter your Azure service credentials here. This information is stored
          locally in your browser and is required for the application to
          function.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="speechKey">Speech Service Key</Label>
          <Input
            id="speechKey"
            name="speechKey"
            type="password"
            value={config.speechKey}
            onChange={handleChange}
            placeholder="Enter your Speech Service key"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="speechRegion">Speech Service Region</Label>
          <Input
            id="speechRegion"
            name="speechRegion"
            value={config.speechRegion}
            onChange={handleChange}
            placeholder="Enter your Speech Service region (e.g., westus)"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="openAIApiKey">OpenAI Service Key (Optional)</Label>
          <Input
            id="openAIApiKey"
            name="openAIApiKey"
            type="password"
            value={config.openAIApiKey || ""}
            onChange={handleChange}
            placeholder="Enter your OpenAI Service key"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="openAIEndpoint">
            OpenAI Service Endpoint (Optional)
          </Label>
          <Input
            id="openAIEndpoint"
            name="openAIEndpoint"
            value={config.openAIEndpoint || ""}
            onChange={handleChange}
            placeholder="Enter your OpenAI Service endpoint"
          />
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        {status && <div>{status}</div>}
        <Button onClick={handleSave}>Save Configuration</Button>
      </CardFooter>
    </Card>
  );
};

export default SettingsAzure;
