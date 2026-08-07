'use client';

import React from 'react';
import { Bell, User } from 'react-feather';
import Link from 'next/link';

interface NavbarProps {
  onMenuClick: () => void;
}

const Navbar = ({ onMenuClick }: NavbarProps) => {
  const handleLogout = async () => {
    const api = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5001';
    const refreshToken = typeof window !== 'undefined' ? localStorage.getItem('refresh_token') : null;
    try {
      await fetch(`${api}/auth/logout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken })
      });
    } catch {}
    try {
      localStorage.removeItem('access_token');
      localStorage.removeItem('id_token');
      localStorage.removeItem('refresh_token');
      sessionStorage.removeItem('oauth_state');
      sessionStorage.removeItem('phone_signup_username');
    } catch {}
    window.location.href = `${api}/auth/logout-redirect`;
  };

  return (
    <nav className="sticky top-0 z-30 w-full bg-white border-b border-gray-100">
      <div className="px-4 md:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Center section - Logo */}
          <div className="flex-1"></div>
          <div className="flex items-center justify-center md:hidden">
            <Link href="/" className="flex items-center gap-2">
              <div className="relative w-10 h-10">
                <div className="absolute inset-0 bg-gradient-to-tr from-blue-600 to-blue-400 rounded-xl shadow-lg transform -rotate-6 opacity-75"></div>
                <div className="absolute inset-0 bg-gradient-to-tr from-blue-600 to-blue-400 rounded-xl shadow-lg"></div>
                <div className="relative w-full h-full flex items-center justify-center ">
                  <span className="text-white font-bold text-xl">B</span>
                </div>
              </div>
              <span className="text-lg font-semibold bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent">
                BRHM
              </span>
            </Link>
          </div>

          {/* Right section */}
          <div className="flex-1 flex items-center justify-end space-x-4">
            <button className="p-2 text-gray-500 hover:text-gray-700 relative">
              <Bell size={20} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white"></span>
            </button>
            <div className="relative group">
              <button className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 to-blue-400 flex items-center justify-center shadow-sm group-hover:shadow-md transition-all">
                  <User size={16} className="text-white" />
                </div>
              </button>
              {/* Dropdown menu */}
              <div className="absolute right-0 mt-2 w-48 py-2 bg-white rounded-xl shadow-lg border border-gray-100 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                <Link 
                  href="/profile" 
                  className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  <User size={14} />
                  Profile
                </Link>
                <Link 
                  href="/settings" 
                  className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1Z" />
                  </svg>
                  Settings
                </Link>
                <div className="h-px bg-gray-200 my-2"></div>
                <button 
                  className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                  onClick={handleLogout}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                    <polyline points="16 17 21 12 16 7" />
                    <line x1="21" y1="12" x2="9" y2="12" />
                  </svg>
                  Sign out
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar; 