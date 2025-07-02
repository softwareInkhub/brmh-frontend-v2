'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Database,
  Play,
  Cloud,
  FileCode,
  HelpCircle,
  Settings,
  Rocket,
  BookOpen,
} from 'lucide-react';

const sidebarItems = [
  {
    name: 'Dashboard ',
    path: '/',
    icon: <Rocket size={24} />, // Use your logo or API icon
  },
  {
    name: 'Namespace',
    path: '/namespace',
    icon: <Database size={24} />,
  },
  {
    name: 'AWS',
    path: '/aws-services',
    icon: <Cloud size={24} />, // AWS icon
  },
  {
    name: 'Tests',
    path: '/tests',
    icon: <Play size={24} />, // Tests icon
  },
  {
    name: 'AI',
    path: '/ai',
    icon: <FileCode size={24} />, // You can use any icon you like
  },
  {
    name: 'Share Docs',
    path: '/docs',
    icon: <BookOpen size={24} />, // Docs icon
  },
 
  {
    name: 'Settings',
    path: '/settings',
    icon: <Settings size={24} />, // Settings icon
  }

];

const Sidebar: React.FC = () => {
  const pathname = usePathname();

  return (
    <aside className="fixed top-0 left-0 z-40 h-screen w-20 bg-[#f7f8fa] border-r border-gray-200 flex flex-col items-center py-4">
      {/* Logo */}
      <div className="mb-6 flex flex-col items-center">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-yellow-400 to-orange-300 flex items-center justify-center mb-1">
          {/* Replace with your logo if needed */}
          <span className="text-white font-bold text-2xl">B</span>
        </div>
      </div>
      {/* Icons */}
      <nav className="flex flex-col gap-2 flex-1 items-center w-full">
        {sidebarItems.map((item) => (
          <Link
            key={item.name}
            href={item.path}
            className={`flex flex-col items-center gap-1 py-2 w-full group transition-colors
              ${pathname === item.path ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-blue-500 hover:bg-gray-100'}`}
      >
            <span className="flex items-center justify-center w-full">{item.icon}</span>
            <span className="text-[11px] font-medium mt-0.5 group-hover:text-blue-500" style={{fontSize:'11px'}}>{item.name}</span>
            </Link>
        ))}
          </nav>
      {/* Footer (optional) */}
      <div className="mt-auto mb-2 flex flex-col items-center">
        <HelpCircle size={20} className="text-gray-300 mb-2" />
        <span className="text-[10px] text-gray-300">Apidog</span>
        </div>
      </aside>
  );
};

export default Sidebar;