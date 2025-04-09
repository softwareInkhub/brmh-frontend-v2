"use client"
import Header from "../components/Header";
import InputPanel from "../components/InputPanel";
import OutputPanel from "../components/OutputPanel";
import { useWebSocket } from "../hooks/useWebSocket";
import { useApiGenerator } from "../hooks/useApiGenerator";
import { useState } from "react";
import { Tab } from "../types/index2";

export default function ApiGenerator() {
  const [selectedTab, setSelectedTab] = useState<Tab>("docs");
  
  const {
    logs,
    addLog,
    isConnected,
    swaggerUrl
  } = useWebSocket();
  
  const {
    apiDescription,
    setApiDescription,
    model,
    setModel,
    temperature,
    setTemperature,
    isGenerating,
    handleGenerate,
    apiSpec,
    endpoints
  } = useApiGenerator({ addLog });
  
  return (
    <div className="flex flex-col h-[100%] bg-gray-50">
      {/* <Header isConnected={isConnected} /> */}
      
      <main className="container mx-auto px-4 py-6 flex-grow max-w-7xl">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-4 lg:sticky lg:top-4 h-fit">
            <InputPanel 
              apiDescription={apiDescription}
              setApiDescription={setApiDescription}
              model={model}
              setModel={setModel}
              temperature={temperature}
              setTemperature={setTemperature}
              isGenerating={isGenerating}
              handleGenerate={handleGenerate}
              logs={logs}
            />
          </div>
          
          <div className="lg:col-span-8 h-full flex flex-col">
            <OutputPanel 
              selectedTab={selectedTab}
              setSelectedTab={setSelectedTab}
              apiSpec={apiSpec}
              endpoints={endpoints}
              swaggerUrl={swaggerUrl}
            />
          </div>
        </div>
      </main>
      
      {/* <footer className="bg-gray-800 text-white py-4 mt-8">
        <div className="container mx-auto px-4 text-center text-sm">
          <p>© {new Date().getFullYear()} OpenAPI Generator. All rights reserved.</p>
          <p className="mt-1 text-gray-400">Powered by Perplexity AI</p>
        </div>
      </footer> */}
    </div>
  );
}
