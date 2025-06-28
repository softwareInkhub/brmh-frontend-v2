'use client';

import { Inter } from "next/font/google";
import "./globals.css";
import Sidebar from "./components/Sidebar";
import Navbar from "./components/Navbar";
import { useState } from "react";
import { Toaster } from 'sonner';
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { SidePanelProvider } from "./components/SidePanelContext";
import FooterWithCollapseButton from "./components/FooterWithCollapseButton";
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';

const inter = Inter({ subsets: ["latin"] });

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <html lang="en" className="overflow-hidden">
      <body 
        className={inter.className + ' overflow-hidden'}
        suppressHydrationWarning={true}
      >
        <DndProvider backend={HTML5Backend}>
          <QueryClientProvider client={queryClient}>
            <SidePanelProvider>
              <div className="flex min-h-screen bg-gray-50 overflow-hidden ml-20">
                <Sidebar />
                <div className="flex-1 min-h-screen overflow-hidden">
                  <Navbar onMenuClick={() => setIsCollapsed(!isCollapsed)} />
                  <main className="w-full min-h-screen overflow-hidden">
                    {children}
                  </main>
                </div>
              </div>
              <FooterWithCollapseButton />
            </SidePanelProvider>
            <Toaster richColors position="top-right" />
          </QueryClientProvider>
        </DndProvider>
      </body>
    </html>
  );
}