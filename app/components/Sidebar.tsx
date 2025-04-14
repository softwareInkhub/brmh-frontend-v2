'use client';

import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  HelpCircle,
  Database,
  Cloud,
  Play,
  FileCode,
  Server,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface SidebarProps {
  onCollapse?: (collapsed: boolean) => void;
}

interface SubMenuItem {
  name: string;
  path: string;
  icon?: React.ReactNode;
}

interface MenuItem {
  name: string;
  path: string;
  icon: React.ReactNode;
  submenu?: SubMenuItem[];
}

//hellooooooooooo
const menuItems: MenuItem[] = [
  {
    name: 'Dashboard',
    path: '/namespace',
    icon: <LayoutDashboard size={18} className="text-blue-400" />,
  },
  {
    name: 'Namespace',
    path: '/namespace',
    icon: <Database size={18} className="text-green-400" />,
    submenu: [
      { name: 'Namespace', path: '/namespace' },
    ]
  },
  {
    name: 'Api Service',
    path: '/api-service',
    icon: <Server size={18} className="text-purple-400" />,
    submenu: [
      { name: 'Api Service', path: '/api-service' },
    ]
  },
  {
    name: 'Executions',
    path: '/executions',
    icon: <Play size={18} className="text-yellow-400" />,
    submenu: [
      { name: 'Executions', path: '/executions' },
    ]
  },
  {
    name: 'AWS Services',
    path: '/aws-services',
    icon: <Cloud size={18} className="text-orange-400" />,
    submenu: [
      { name: 'Lambda', path: '/aws/lambda' },
      { name: 'S3', path: '/aws/s3' },
      { name: 'DynamoDB', path: '/aws/dynamodb' },
      { name: 'IAM', path: '/aws/iam' },
      { name: 'SNS', path: '/aws/sns' },
      { name: 'SQS', path: '/aws/sqs' },
    ]
  },
  {
    name: 'Ai Api Builder',
    path: '/yaml',
    icon: <FileCode size={18} className="text-pink-400" />,
    submenu: [
      { name: 'YAML generator', path: '/ai-api-builder' }
    ]
  },
];

const Sidebar: React.FC<SidebarProps> = ({ onCollapse }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [submenuPosition, setSubmenuPosition] = useState<{ top: number } | null>(null);
  const pathname = usePathname();

  // Handle screen resize
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setIsCollapsed(true);
        onCollapse?.(true);
      }
    };

    // Initial check
    handleResize();

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [onCollapse]);

  // Notify parent when collapse state changes
  useEffect(() => {
    onCollapse?.(isCollapsed);
  }, [isCollapsed, onCollapse]);

  // Close mobile menu when route changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  const toggleSubmenu = (path: string, event: React.MouseEvent) => {
    if (isCollapsed) {
      const target = event.currentTarget as HTMLElement;
      const rect = target.getBoundingClientRect();
      setSubmenuPosition({ top: rect.top });
    }
    setActiveMenu(activeMenu === path ? null : path);
  };

  const NavLinks = () => (
    <>
      {menuItems.map((item, index) => (
        <div key={index} className="relative">
          <div
            onClick={(e) => item.submenu && toggleSubmenu(item.path, e)}
            className={`flex items-center gap-3 px-6 py-3 text-gray-300 hover:bg-gray-800 hover:text-white transition-colors duration-200 cursor-pointer ${
              pathname.startsWith(item.path) ? 'bg-gray-800 text-white' : ''
            }`}
          >
            <div className="w-5 h-5 flex items-center justify-center flex-shrink-0">
              {item.icon}
            </div>
            <span className={`whitespace-nowrap transition-all duration-300 overflow-hidden flex-1 ${
              isCollapsed && !isMobileMenuOpen ? 'w-0 opacity-0' : 'w-auto opacity-100'
            }`}>
              {item.name}
            </span>
            {item.submenu && !isCollapsed && (
              <ChevronRight
                size={16}
                className={`transition-transform duration-200 ${
                  activeMenu === item.path ? 'rotate-90' : ''
                }`}
              />
            )}
          </div>
          
          {/* Submenu - Floating when collapsed, inline when expanded */}
          {item.submenu && activeMenu === item.path && (
            <div 
              className={`
                ${isCollapsed 
                  ? 'fixed left-16 bg-gray-900 rounded-lg shadow-lg border border-gray-700 min-w-[200px] z-50' 
                  : 'ml-4 pl-4 border-l border-gray-700'
                }
              `}
              style={isCollapsed && submenuPosition ? { top: submenuPosition.top } : undefined}
            >
              {/* {!isCollapsed && (
                <div className="py-2 text-sm font-medium text-gray-400 px-6">
                  {item.name}
                </div>
              )} */}
              {item.submenu.map((subItem, subIndex) => (
                <Link
                  key={subIndex}
                  href={subItem.path}
                  className={`flex items-center gap-3 px-6 py-2 text-sm text-gray-400 hover:text-white transition-colors duration-200 ${
                    isCollapsed ? 'hover:bg-gray-800' : ''
                  } ${
                    pathname === subItem.path ? 'text-white' : ''
                  }`}
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-gray-600"></div>
                  {subItem.name}
                </Link>
              ))}
            </div>
          )}
        </div>
      ))}

      {/* Help Section */}
      <div className="mt-auto pt-4 border-t border-gray-700 mx-4">
        <div className="flex items-center gap-3 px-4 py-3 text-gray-300 rounded-lg bg-gray-800/50">
          <HelpCircle size={18} className="text-blue-400" />
          <span className={`whitespace-nowrap transition-all duration-300 overflow-hidden ${
            isCollapsed && !isMobileMenuOpen ? 'w-0 opacity-0' : 'w-auto opacity-100'
          }`}>
            Need help?
          </span>
        </div>
      </div>
    </>
  );

  // Add click outside handler to close submenu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      const sidebar = document.getElementById('main-sidebar');
      const isClickInside = sidebar?.contains(target) || target.closest('.submenu-floating');
      
      if (!isClickInside && activeMenu) {
        setActiveMenu(null);
        setSubmenuPosition(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [activeMenu]);

  return (
    <>
      {/* Mobile menu button */}
      <button
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        className="md:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-gray-800 text-white hover:bg-gray-700 transition-colors"
      >
        {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Sidebar */}
      <aside
        id="main-sidebar"
        className={`fixed top-0 left-0 z-40 h-screen transition-transform ${
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        } md:translate-x-0 ${
          isCollapsed ? 'w-16' : 'w-64'
        } bg-gray-900 border-r border-gray-800`}
      >
        <div className="flex flex-col h-full">
          {/* Logo and collapse button */}
          <div className="flex items-center justify-between p-4 border-b border-gray-800">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">B</span>
              </div>
              <span className={`text-white font-semibold text-lg transition-all duration-300 ${
                isCollapsed ? 'opacity-0 w-0' : 'opacity-100'
              }`}>
                BRMH
              </span>
            </Link>
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-800 hover:text-white transition-colors"
            >
              <ChevronLeft
                size={20}
                className={`transition-transform duration-300 ${
                  isCollapsed ? 'rotate-180' : ''
                }`}
              />
            </button>
          </div>

          {/* Navigation links */}
          <nav className="flex-1 overflow-y-auto py-4 flex flex-col">
            <NavLinks />
          </nav>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;