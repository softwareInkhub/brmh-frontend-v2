"use client"
import { FC, useEffect } from "react";
import DocumentationPanel from "./DocumentationPanel";
import SpecPanel from "../components/SpecPanel";
import MockServerPanel from "../components/MockServerPanel";
import TestSuitePanel from "../components/TestSuitePanel";
import { Tab, ApiEndpoint } from "../types/index2";
import { FileText, Code, Server, TestTube } from "lucide-react";

interface OutputPanelProps {
  selectedTab: Tab;
  setSelectedTab: (tab: Tab) => void;
  apiSpec: string;
  endpoints: ApiEndpoint[];
  swaggerUrl: string;
}

const OutputPanel: FC<OutputPanelProps> = ({
  selectedTab,
  setSelectedTab,
  apiSpec,
  endpoints,
  swaggerUrl
}) => {
  // Listen for tab changes from data-tab attributes
  useEffect(() => {
    const handleTabClick = (event: Event) => {
      const element = event.target as HTMLElement;
      const tabButton = element.closest('[data-tab]');
      
      if (tabButton) {
        const tabValue = tabButton.getAttribute('data-tab') as Tab;
        if (tabValue) {
          setSelectedTab(tabValue);
        }
      }
    };
    
    document.addEventListener('click', handleTabClick);
    
    return () => {
      document.removeEventListener('click', handleTabClick);
    };
  }, [setSelectedTab]);
  
  return (
    <div className="h-full flex flex-col bg-white rounded-lg shadow-md overflow-hidden">
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-3 border-b flex justify-between overflow-x-auto scrollbar-hide">
        <div className="flex gap-2">
          <button
            onClick={() => setSelectedTab('docs')}
            className={`px-4 py-2 text-sm font-medium rounded-md flex items-center gap-2 transition-all ${
              selectedTab === 'docs'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-gray-700 hover:bg-blue-100'
            }`}
          >
            <FileText size={16} />
            <span>Documentation</span>
          </button>
          <button
            onClick={() => setSelectedTab('spec')}
            className={`px-4 py-2 text-sm font-medium rounded-md flex items-center gap-2 transition-all ${
              selectedTab === 'spec'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-gray-700 hover:bg-blue-100'
            }`}
          >
            <Code size={16} />
            <span>OpenAPI Spec</span>
          </button>
          <button
            onClick={() => setSelectedTab('mock')}
            className={`px-4 py-2 text-sm font-medium rounded-md flex items-center gap-2 transition-all ${
              selectedTab === 'mock'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-gray-700 hover:bg-blue-100'
            }`}
          >
            <Server size={16} />
            <span>Mock Server</span>
          </button>
          <button
            onClick={() => setSelectedTab('test-suite')}
            className={`px-4 py-2 text-sm font-medium rounded-md flex items-center gap-2 transition-all ${
              selectedTab === 'test-suite'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-gray-700 hover:bg-blue-100'
            }`}
          >
            <TestTube size={16} />
            <span>Test Suite</span>
          </button>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto bg-white p-4">
        {selectedTab === 'docs' && <DocumentationPanel endpoints={endpoints || []} swaggerUrl={swaggerUrl} />}
        {selectedTab === 'spec' && <SpecPanel apiSpec={apiSpec} />}
        {selectedTab === 'mock' && <MockServerPanel apiSpec={apiSpec} endpoints={endpoints || []} />}
        {selectedTab === 'test-suite' && <TestSuitePanel apiSpec={apiSpec} endpoints={endpoints || []} />}
      </div>
    </div>
  );
};

export default OutputPanel;
