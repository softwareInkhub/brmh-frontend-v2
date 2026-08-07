'use client';

import React, { useState } from 'react';
import NamespaceLibrarySidebar from '../components/NamespaceLibrarySidebar';
import Navbar from '../components/Navbar';
import { LayoutGrid, List, Upload, Plus } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function HomePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTab = searchParams.get('tab') === 'apiHub' ? 'apiHub' : 'projects';
  const [activePanel, setActivePanel] = useState<'projects' | 'apiHub'>(initialTab);

  // Sync state with URL
  const setPanelAndUrl = (panel: 'projects' | 'apiHub') => {
    setActivePanel(panel);
    const url = panel === 'projects' ? '?tab=project' : '?tab=apiHub';
    router.replace(url, { scroll: false });
  };

  // Keep state in sync with URL changes (e.g. browser navigation)
  React.useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'apiHub' && activePanel !== 'apiHub') setActivePanel('apiHub');
    if ((tab === 'project' || !tab) && activePanel !== 'projects') setActivePanel('projects');
  }, [searchParams, activePanel]);

  return (
    <div className="min-h-[100vh] bg-[#f7f8fa] flex flex-col">
      {/* Navbar */}
      <Navbar onMenuClick={() => {}} />
      <div className="flex flex-1 h-[calc(100vh-56px)]">
        {/* Sidebar */}
        <NamespaceLibrarySidebar 
          onApiHubClick={() => setPanelAndUrl('apiHub')} 
          onPersonalTeamClick={() => setPanelAndUrl('projects')} 
        />
        {/* Main Content */}
        <main className="flex-1 flex flex-col bg-[#f7f8fa]  min-h-0">
          {activePanel === 'projects' && (
            <>
              {/* Team Header */}
              <div className="flex items-center gap-3 mb-2 pl-8 pr-8 pt-8">
                <span className="font-semibold text-lg text-gray-800">Personal Team</span>
                <span className="bg-orange-100 text-orange-600 text-xs font-bold px-2 py-0.5 rounded">Team Owner</span>
              </div>
              {/* Tabs */}
              <div className="flex items-center gap-6 border-b mb-6 pl-8 pr-8">
                <button className="py-2 px-1 border-b-2 border-blue-600 text-blue-700 font-semibold text-sm">Projects</button>
                <button className="py-2 px-1 text-gray-500 text-sm hover:text-blue-600">Resources</button>
                <button className="py-2 px-1 text-gray-500 text-sm hover:text-blue-600">Activities</button>
                <button className="py-2 px-1 text-gray-500 text-sm hover:text-blue-600">Members</button>
                <button className="py-2 px-1 text-gray-500 text-sm hover:text-blue-600">Plans</button>
                <button className="py-2 px-1 text-gray-500 text-sm hover:text-blue-600">Settings</button>
              </div>
              {/* Project Card Grid */}
              <div className="flex items-center justify-between mb-4 pl-8 pr-8">
                <div className="flex gap-2">
                  <button className="p-2 rounded hover:bg-gray-100"><LayoutGrid className="w-5 h-5 text-gray-400" /></button>
                  <button className="p-2 rounded hover:bg-gray-100"><List className="w-5 h-5 text-gray-400" /></button>
                </div>
                <div className="flex gap-2">
                  <button className="px-3 py-1.5 rounded border border-gray-200 text-gray-700 text-sm flex items-center gap-1 hover:bg-gray-50"><Upload className="w-4 h-4" />Import Project</button>
                  <button className="px-3 py-1.5 rounded bg-purple-500 text-white text-sm font-semibold flex items-center gap-1 hover:bg-purple-600"><Plus className="w-4 h-4" />New Project</button>
                </div>
              </div>
              {/* Project Card */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pl-8 pr-8">
                <div className="bg-white rounded-xl shadow border p-6 flex flex-col items-center gap-3 w-64">
                  <div className="w-14 h-14 rounded-xl bg-yellow-100 flex items-center justify-center mb-2">
                    <span className="text-3xl">📅</span>
                  </div>
                  <div className="font-semibold text-gray-800 text-base">My Project</div>
                  <div className="text-xs text-gray-400">HTTP</div>
                </div>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}