'use client';

import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Settings, 
  Server,
  ChevronRight,
  ChevronLeft,
  Code,
  Cloud,
  FileText,
  Activity,
  Table,
  Braces,
  User,
  Database,
  Menu,
  X
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface SidebarProps {
  onCollapse?: (collapsed: boolean) => void;
}

interface MenuItem {
  name: string;
  path: string;
}

// Define submenu items for each main menu item
const subMenuItems: Record<string, MenuItem[]> = {
  'namespace': [
    { name: 'All Namespaces', path: '/namespace' },
    { name: 'Create Namespace', path: '/namespace/create' },
    { name: 'Accounts', path: '/namespace/accounts' },
    { name: 'Methods', path: '/namespace/methods' }
  ],
  'api-service': [
    { name: 'Services', path: '/api-service' },
    { name: 'Documentation', path: '/api-service/docs' },
    { name: 'Testing', path: '/api-service/test' }
  ],
  'aws-services': [
    { name: 'Services List', path: '/aws-services' },
    { name: 'Lambda', path: '/aws-services/lambda' },
    { name: 'S3', path: '/aws-services/s3' },
    { name: 'CloudWatch', path: '/aws-services/cloudwatch' }
  ],
  'database': [
    { name: 'Overview', path: '/database' },
    { name: 'Tables', path: '/database/tables' },
    { name: 'Queries', path: '/database/queries' }
  ],
  'yaml': [
    { name: 'Editor', path: '/yaml' },
    { name: 'Templates', path: '/yaml/templates' }
  ],
  'executions': [
    { name: 'Overview', path: '/executions' },
    { name: 'History', path: '/executions/history' },
    { name: 'Logs', path: '/executions/logs' }
  ],
  'table-data': [
    { name: 'Overview', path: '/table-data' },
    { name: 'Manage', path: '/table-data/manage' },
    { name: 'Import', path: '/table-data/import' }
  ],
  'ai-api-builder': [
    { name: 'Builder', path: '/ai-api-builder' },
    { name: 'Models', path: '/ai-api-builder/models' },
    { name: 'Templates', path: '/ai-api-builder/templates' }
  ]
};

const Sidebar: React.FC<SidebarProps> = ({ onCollapse }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeSubmenu, setActiveSubmenu] = useState<string | null>(null);
  const [isSubmenuCollapsed, setIsSubmenuCollapsed] = useState(false);
  const pathname = usePathname();

  // Extract the base route for checking which menu item is active
  const baseRoute = pathname.split('/')[1];

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

  // Add event listener to close submenu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      const sidebar = document.getElementById('main-sidebar');
      const submenu = document.getElementById('submenu-panel');
      
      // If clicking outside both sidebar and submenu, close the submenu
      if (
        activeSubmenu && 
        sidebar && 
        submenu && 
        !sidebar.contains(target) && 
        !submenu.contains(target)
      ) {
        setActiveSubmenu(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [activeSubmenu]);

  // Function to toggle submenu
  const toggleSubmenu = (menu: string) => {
    if (activeSubmenu === menu) {
      setActiveSubmenu(null);
    } else {
      setActiveSubmenu(menu);
      setIsSubmenuCollapsed(false); // Always expand submenu when opening
    }
  };

  const NavLinks = () => (
    <>
      <div 
        className={`flex items-center gap-3 px-6 py-3 text-gray-300 hover:bg-gray-800 hover:text-white transition-colors duration-200 cursor-pointer ${
          baseRoute === 'namespace' ? 'bg-gray-800 text-white' : ''
        }`}
        onClick={() => toggleSubmenu('namespace')}
        title="Namespaces"
      >
        <div className="w-5 h-5 flex items-center justify-center flex-shrink-0">
          <LayoutDashboard size={18} className="text-blue-400" />
        </div>
        <span className={`whitespace-nowrap transition-all duration-300 overflow-hidden ${
          isCollapsed && !isMobileMenuOpen ? 'w-0 opacity-0' : 'w-auto opacity-100'
        }`}>Namespaces</span>
        {!isCollapsed && !isMobileMenuOpen && (
          <ChevronRight 
            size={16} 
            className={`ml-auto transition-transform duration-200 ${activeSubmenu === 'namespace' ? 'rotate-90' : ''}`} 
          />
        )}
      </div>

      <div 
        className={`flex items-center gap-3 px-6 py-3 text-gray-300 hover:bg-gray-800 hover:text-white transition-colors duration-200 cursor-pointer ${
          baseRoute === 'api-service' ? 'bg-gray-800 text-white' : ''
        }`}
        onClick={() => toggleSubmenu('api-service')}
        title="API Services"
      >
        <div className="w-5 h-5 flex items-center justify-center flex-shrink-0">
          <Code size={18} className="text-green-400" />
        </div>
        <span className={`whitespace-nowrap transition-all duration-300 overflow-hidden ${
          isCollapsed && !isMobileMenuOpen ? 'w-0 opacity-0' : 'w-auto opacity-100'
        }`}>API Services</span>
        {!isCollapsed && !isMobileMenuOpen && (
          <ChevronRight 
            size={16} 
            className={`ml-auto transition-transform duration-200 ${activeSubmenu === 'api-service' ? 'rotate-90' : ''}`} 
          />
        )}
      </div>

      <div 
        className={`flex items-center gap-3 px-6 py-3 text-gray-300 hover:bg-gray-800 hover:text-white transition-colors duration-200 cursor-pointer ${
          baseRoute === 'aws-services' ? 'bg-gray-800 text-white' : ''
        }`}
        onClick={() => toggleSubmenu('aws-services')}
        title="AWS Services"
      >
        <div className="w-5 h-5 flex items-center justify-center flex-shrink-0">
          <Cloud size={18} className="text-orange-400" />
        </div>
        <span className={`whitespace-nowrap transition-all duration-300 overflow-hidden ${
          isCollapsed && !isMobileMenuOpen ? 'w-0 opacity-0' : 'w-auto opacity-100'
        }`}>AWS Services</span>
        {!isCollapsed && !isMobileMenuOpen && (
          <ChevronRight 
            size={16} 
            className={`ml-auto transition-transform duration-200 ${activeSubmenu === 'aws-services' ? 'rotate-90' : ''}`} 
          />
        )}
      </div>
      
      <div 
        className={`flex items-center gap-3 px-6 py-3 text-gray-300 hover:bg-gray-800 hover:text-white transition-colors duration-200 cursor-pointer ${
          baseRoute === 'yaml' ? 'bg-gray-800 text-white' : ''
        }`}
        onClick={() => toggleSubmenu('yaml')}
        title="YAML"
      >
        <div className="w-5 h-5 flex items-center justify-center flex-shrink-0">
          <FileText size={18} className="text-yellow-400" />
        </div>
        <span className={`whitespace-nowrap transition-all duration-300 overflow-hidden ${
          isCollapsed && !isMobileMenuOpen ? 'w-0 opacity-0' : 'w-auto opacity-100'
        }`}>YAML</span>
        {!isCollapsed && !isMobileMenuOpen && (
          <ChevronRight 
            size={16} 
            className={`ml-auto transition-transform duration-200 ${activeSubmenu === 'yaml' ? 'rotate-90' : ''}`} 
          />
        )}
      </div>
      
      <div 
        className={`flex items-center gap-3 px-6 py-3 text-gray-300 hover:bg-gray-800 hover:text-white transition-colors duration-200 cursor-pointer ${
          baseRoute === 'executions' ? 'bg-gray-800 text-white' : ''
        }`}
        onClick={() => toggleSubmenu('executions')}
        title="Executions"
      >
        <div className="w-5 h-5 flex items-center justify-center flex-shrink-0">
          <Activity size={18} className="text-red-400" />
        </div>
        <span className={`whitespace-nowrap transition-all duration-300 overflow-hidden ${
          isCollapsed && !isMobileMenuOpen ? 'w-0 opacity-0' : 'w-auto opacity-100'
        }`}>Executions</span>
        {!isCollapsed && !isMobileMenuOpen && (
          <ChevronRight 
            size={16} 
            className={`ml-auto transition-transform duration-200 ${activeSubmenu === 'executions' ? 'rotate-90' : ''}`} 
          />
        )}
      </div>
      
      <div 
        className={`flex items-center gap-3 px-6 py-3 text-gray-300 hover:bg-gray-800 hover:text-white transition-colors duration-200 cursor-pointer ${
          baseRoute === 'table-data' ? 'bg-gray-800 text-white' : ''
        }`}
        onClick={() => toggleSubmenu('table-data')}
        title="Table Data"
      >
        <div className="w-5 h-5 flex items-center justify-center flex-shrink-0">
          <Table size={18} className="text-purple-400" />
        </div>
        <span className={`whitespace-nowrap transition-all duration-300 overflow-hidden ${
          isCollapsed && !isMobileMenuOpen ? 'w-0 opacity-0' : 'w-auto opacity-100'
        }`}>Table Data</span>
        {!isCollapsed && !isMobileMenuOpen && (
          <ChevronRight 
            size={16} 
            className={`ml-auto transition-transform duration-200 ${activeSubmenu === 'table-data' ? 'rotate-90' : ''}`} 
          />
        )}
      </div>

      <div 
        className={`flex items-center gap-3 px-6 py-3 text-gray-300 hover:bg-gray-800 hover:text-white transition-colors duration-200 cursor-pointer ${
          baseRoute === 'ai-api-builder' ? 'bg-gray-800 text-white' : ''
        }`}
        onClick={() => toggleSubmenu('ai-api-builder')}
        title="AI API Builder"
      >
        <div className="w-5 h-5 flex items-center justify-center flex-shrink-0">
          <Braces size={18} className="text-cyan-400" />
        </div>
        <span className={`whitespace-nowrap transition-all duration-300 overflow-hidden ${
          isCollapsed && !isMobileMenuOpen ? 'w-0 opacity-0' : 'w-auto opacity-100'
        }`}>AI API Builder</span>
        {!isCollapsed && !isMobileMenuOpen && (
          <ChevronRight 
            size={16} 
            className={`ml-auto transition-transform duration-200 ${activeSubmenu === 'ai-api-builder' ? 'rotate-90' : ''}`} 
          />
        )}
      </div>
    </>
  );

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        className="md:hidden fixed top-4 right-4 z-50 flex items-center justify-center w-9 h-9 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full shadow-md hover:shadow-lg transition-all duration-200 text-white"
        aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
      >
        {isMobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
      </button>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-black bg-opacity-50 z-30"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div 
        id="main-sidebar"
        className={`
          ${isCollapsed && !isMobileMenuOpen ? 'w-20' : 'w-64'}
          ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
          h-screen bg-gray-900 text-white fixed left-0 top-0 z-40 flex flex-col
          transition-all duration-300 ease-in-out
        `}
      >
        {/* Logo/Brand Section */}
        <div className="px-4 py-5 border-b border-gray-800 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-blue-400 to-purple-500 rounded-md p-1.5 shadow-md w-8 h-8 flex items-center justify-center flex-shrink-0">
              <LayoutDashboard size={18} className="text-white" />
            </div>
            <span className={`text-xl font-semibold whitespace-nowrap transition-all duration-300 text-white overflow-hidden ${
              isCollapsed && !isMobileMenuOpen ? 'w-0 opacity-0' : 'w-auto opacity-100'
            }`}>BRMH</span>
          </div>
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="flex items-center justify-center w-6 h-6  from-blue-400/30 to-purple-500/30 rounded-full shadow-md hover:from-blue-400/50 hover:to-purple-500/50 transition-all duration-200 text-white flex-shrink-0"
            title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          >
            {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </button>
        </div>

        {/* Main Navigation */}
        <nav className="flex-1 py-4 overflow-y-auto no-scrollbar">
          <NavLinks />
        </nav>

        {/* Bottom Section */}
        <div className="p-4 border-t border-gray-800">
          <Link 
            href="/settings"
            className={`flex items-center gap-3 px-4 py-3 text-gray-300 hover:bg-gray-800 hover:text-white rounded-lg transition-colors duration-200 ${
              pathname === '/settings' ? 'bg-gray-800 text-white' : ''
            }`}
            title="Settings"
          >
            <div className="w-5 h-5 flex items-center justify-center flex-shrink-0">
              <Settings size={18} className="text-pink-400" />
            </div>
            <span className={`whitespace-nowrap transition-all duration-300 overflow-hidden ${
              isCollapsed && !isMobileMenuOpen ? 'w-0 opacity-0' : 'w-auto opacity-100'
            }`}>Settings</span>
          </Link>
        </div>
      </div>

      {/* Submenu Panel */}
      {activeSubmenu && (
        <div 
          id="submenu-panel"
          className={`
            fixed top-0 z-30 h-screen bg-gradient-to-b from-gray-800 to-gray-900 text-white overflow-y-auto shadow-xl
            transition-all duration-300 ease-in-out
            ${isCollapsed ? 'left-20' : 'left-64'}
            w-56 backdrop-blur-sm border-l border-gray-700
          `}
        >
          {/* Submenu Header */}
          <div className="p-4 border-b border-gray-700 flex justify-between items-center bg-gray-800/50 backdrop-blur-sm">
            <h3 className="text-lg font-medium capitalize flex items-center gap-2">
              {activeSubmenu === 'namespace' && <LayoutDashboard size={18} className="text-blue-400" />}
              {activeSubmenu === 'api-service' && <Code size={18} className="text-green-400" />}
              {activeSubmenu === 'aws-services' && <Cloud size={18} className="text-orange-400" />}
              {activeSubmenu === 'yaml' && <FileText size={18} className="text-yellow-400" />}
              {activeSubmenu === 'executions' && <Activity size={18} className="text-red-400" />}
              {activeSubmenu === 'table-data' && <Table size={18} className="text-purple-400" />}
              {activeSubmenu === 'ai-api-builder' && <Braces size={18} className="text-cyan-400" />}
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-300">
                {activeSubmenu.replace('-', ' ')}
              </span>
            </h3>
            <button
              onClick={() => setActiveSubmenu(null)}
              className="flex items-center justify-center w-7 h-7 bg-gradient-to-br from-gray-700 to-gray-600 rounded-full hover:from-gray-600 hover:to-gray-500 transition-all duration-200 text-white shadow-sm"
              title="Close"
              aria-label="Close submenu"
            >
              <X size={14} />
            </button>
          </div>

          {/* Submenu Items */}
          <div className="py-4">
            {subMenuItems[activeSubmenu as keyof typeof subMenuItems]?.map((item, index) => {
              // Determine which color to use based on the active submenu
              const getMenuColor = () => {
                switch(activeSubmenu) {
                  case 'namespace': return 'from-blue-500/10 to-blue-500/5 hover:from-blue-500/20 hover:to-blue-500/10';
                  case 'api-service': return 'from-green-500/10 to-green-500/5 hover:from-green-500/20 hover:to-green-500/10';
                  case 'aws-services': return 'from-orange-500/10 to-orange-500/5 hover:from-orange-500/20 hover:to-orange-500/10';
                  case 'yaml': return 'from-yellow-500/10 to-yellow-500/5 hover:from-yellow-500/20 hover:to-yellow-500/10';
                  case 'executions': return 'from-red-500/10 to-red-500/5 hover:from-red-500/20 hover:to-red-500/10';
                  case 'table-data': return 'from-purple-500/10 to-purple-500/5 hover:from-purple-500/20 hover:to-purple-500/10';
                  case 'ai-api-builder': return 'from-cyan-500/10 to-cyan-500/5 hover:from-cyan-500/20 hover:to-cyan-500/10';
                  default: return 'from-gray-500/10 to-gray-500/5 hover:from-gray-500/20 hover:to-gray-500/10';
                }
              };

              const getActiveGlow = () => {
                switch(activeSubmenu) {
                  case 'namespace': return 'shadow-blue-500/20';
                  case 'api-service': return 'shadow-green-500/20';
                  case 'aws-services': return 'shadow-orange-500/20';
                  case 'yaml': return 'shadow-yellow-500/20';
                  case 'executions': return 'shadow-red-500/20';
                  case 'table-data': return 'shadow-purple-500/20';
                  case 'ai-api-builder': return 'shadow-cyan-500/20';
                  default: return 'shadow-gray-500/20';
                }
              };

              const getAccentColor = () => {
                switch(activeSubmenu) {
                  case 'namespace': return 'blue-400';
                  case 'api-service': return 'green-400';
                  case 'aws-services': return 'orange-400';
                  case 'yaml': return 'yellow-400';
                  case 'executions': return 'red-400';
                  case 'table-data': return 'purple-400';
                  case 'ai-api-builder': return 'cyan-400';
                  default: return 'gray-400';
                }
              };
              
              const isActive = pathname === item.path;
              const accentColor = getAccentColor();
              const activeGlow = getActiveGlow();
              
              return (
                <Link 
                  key={index}
                  href={item.path}
                  className={`
                    flex items-center gap-3 mx-3 my-1 px-4 py-2.5 rounded-lg text-gray-300 
                    hover:text-white transition-all duration-200
                    ${isActive && item.name !== "Overview"
                      ? `bg-gradient-to-r ${getMenuColor().replace('hover:', '')} text-white shadow-md ${activeGlow}` 
                      : `hover:bg-gradient-to-r ${getMenuColor()}`}
                    transform transition-transform duration-200 hover:translate-x-1
                  `}
                >
                  <div className={`w-1.5 h-1.5 rounded-full ${isActive && item.name !== "Overview" ? `bg-${accentColor}` : 'bg-gray-500'}`}></div>
                  <span className={isActive && item.name !== "Overview" ? `font-medium text-${accentColor}` : ''}>{item.name}</span>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
};

export default Sidebar;