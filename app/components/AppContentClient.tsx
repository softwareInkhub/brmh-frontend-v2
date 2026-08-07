'use client';

import { useState } from "react";
import Sidebar from "./projectSidebar";
import Navbar from "./Navbar";
import FooterWithCollapseButton from "./FooterWithCollapseButton";
import GlobalAIAgentButton from "./GlobalAIAgentButton";
import { usePathname } from 'next/navigation';

export default function AppContentClient({ children }: { children: React.ReactNode }) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isAIAgentOpen, setIsAIAgentOpen] = useState(false);
  const [currentNamespaceContext, setCurrentNamespaceContext] = useState<any>(null);
  const pathname = usePathname();
  const hideSidebar = pathname === '/Home' || pathname === '/authPage';

  return (
    <>
      <div className={`flex min-h-screen bg-gray-50 ${!hideSidebar ? 'ml-20' : ''} ${isAIAgentOpen ? 'mr-[800px]' : ''} transition-all duration-300 ease-in-out`}>
        {!hideSidebar && <Sidebar />}
        <div className="flex-1 min-h-screen overflow-auto">
          {!hideSidebar && <Navbar onMenuClick={() => setIsCollapsed(!isCollapsed)} />}
          <main className="w-full min-h-screen overflow-auto">
            {children}
          </main>
        </div>
      </div>
      {!hideSidebar && <FooterWithCollapseButton />}
      
      {/* Global AI Agent Button */}
      <GlobalAIAgentButton 
        isVisible={!hideSidebar} 
        onOpen={() => setIsAIAgentOpen(true)}
        onClose={() => setIsAIAgentOpen(false)}
      />
    </>
  );
} 