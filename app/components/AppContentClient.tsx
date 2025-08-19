'use client';

import { useState } from "react";
import Sidebar from "./projectSidebar";
import Navbar from "./Navbar";
import FooterWithCollapseButton from "./FooterWithCollapseButton";
import { usePathname } from 'next/navigation';

export default function AppContentClient({ children }: { children: React.ReactNode }) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const pathname = usePathname();
  const hideSidebar = pathname === '/Home' || pathname === '/authPage';

  return (
    <>
      <div className={`flex min-h-screen bg-gray-50 ${!hideSidebar ? 'ml-20' : ''}`}>
        {!hideSidebar && <Sidebar />}
        <div className="flex-1 min-h-screen overflow-auto">
          {!hideSidebar && <Navbar onMenuClick={() => setIsCollapsed(!isCollapsed)} />}
          <main className="w-full min-h-screen overflow-auto">
            {children}
          </main>
        </div>
      </div>
      {!hideSidebar && <FooterWithCollapseButton />}
    </>
  );
} 