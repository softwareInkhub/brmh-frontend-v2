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
        <QueryClientProvider client={queryClient}>
          <SidePanelProvider>
            <div className="flex min-h-screen bg-gray-50 overflow-hidden">
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
      </body>
    </html>
  );
}