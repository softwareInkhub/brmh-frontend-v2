'use client';

import React from 'react';
import { BookOpen, Star, Clock, Upload } from 'lucide-react';

interface NamespaceLibrarySidebarProps {
  onApiHubClick?: () => void;
  onPersonalTeamClick?: () => void;
}

export default function NamespaceLibrarySidebar({ onApiHubClick, onPersonalTeamClick }: NamespaceLibrarySidebarProps) {
  return (
    <aside className="w-64 bg-white border-r flex flex-col p-4 h-[calc(100vh-56px)]">
      {/* Logo */}
      <div className="flex items-center gap-2 mb-6">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-yellow-400 to-orange-300 flex items-center justify-center">
          <span className="text-white font-bold text-xl">B</span>
        </div>
        <span className="font-bold text-lg text-gray-800">brmh</span>
      </div>
      {/* Teams */}
      <div className="mb-4">
        <div className="text-xs text-gray-400 font-semibold mb-1">My Teams</div>
        <div className="flex flex-col gap-1">
          <button className="flex items-center gap-2 px-2 py-1 rounded bg-blue-50 text-blue-700 font-semibold text-sm" onClick={onPersonalTeamClick}>
            <span className="w-2 h-2 bg-blue-400 rounded-full"></span>
            Personal Team
            <span className="ml-auto text-[10px] bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded font-bold">Team Owner</span>
          </button>
          <button className="text-xs text-blue-500 hover:underline text-left pl-6 mt-1">+ New Team</button>
        </div>
      </div>
      {/* Other nav */}
      <nav className="flex flex-col gap-1 mb-4">
        <button className="flex items-center gap-2 px-2 py-1 rounded text-gray-600 hover:bg-gray-100 text-sm" onClick={onApiHubClick}><BookOpen className="w-4 h-4" />API Hub <span className="ml-auto text-[10px] text-gray-400">Explore More</span></button>
        <button className="flex items-center gap-2 px-2 py-1 rounded text-gray-600 hover:bg-gray-100 text-sm"><Star className="w-4 h-4" />My Favorites</button>
        <button className="flex items-center gap-2 px-2 py-1 rounded text-gray-600 hover:bg-gray-100 text-sm"><Clock className="w-4 h-4" />Recently Visited</button>
      </nav>
      {/* Organizations */}
      <div className="mt-auto mb-2">
        <input className="w-full border border-gray-200 rounded px-2 py-1 text-xs text-gray-500" value="Organizations" readOnly />
      </div>
      {/* Desktop App Button */}
      <button className="w-full bg-purple-100 text-purple-700 font-semibold text-sm py-2 rounded-lg flex items-center justify-center gap-2"><Upload className="w-4 h-4" />Get Desktop App</button>
    </aside>
  );
} 