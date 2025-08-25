'use client';

import { Inter } from "next/font/google";
import "./globals.css";
import Sidebar from "./components/projectSidebar";
import Navbar from "./components/Navbar";
import { useState } from "react";
import { Toaster } from 'sonner';
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { SidePanelProvider } from "./components/SidePanelContext";
import { NamespaceProvider } from "./components/NamespaceContext";
import FooterWithCollapseButton from "./components/FooterWithCollapseButton";
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { usePathname } from 'next/navigation';
import AppContentClient from "./components/AppContentClient";

const inter = Inter({ subsets: ["latin"] });

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body 
        className={inter.className}
        suppressHydrationWarning={true}
      >
        <DndProvider backend={HTML5Backend}>
          <QueryClientProvider client={queryClient}>
            <NamespaceProvider>
              <SidePanelProvider>
                <AppContentClient>
                  {children}
                </AppContentClient>
              </SidePanelProvider>
            </NamespaceProvider>
            <Toaster richColors position="top-right" />
          </QueryClientProvider>
        </DndProvider>
      </body>
    </html>
  );
}