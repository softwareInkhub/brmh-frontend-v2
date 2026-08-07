'use client'

import { motion } from 'framer-motion'
import { Play, ArrowRight, Code, Database, Globe, Shield } from 'lucide-react'
import { useState, useEffect } from 'react'

const codeString = `{
  "users": [
    {
      "id": 1,
      "name": "John Doe",
      "email": "john@example.com"
    }
  ],
  "total": 1
}`

export default function Hero() {
  const [typedCode, setTypedCode] = useState('')
  useEffect(() => {
    let i = 0;
    let typing = true;
    let timeout: NodeJS.Timeout;
    function type() {
      if (typing && i <= codeString.length) {
        setTypedCode(codeString.slice(0, i));
        i++;
        timeout = setTimeout(type, 80);
      } else if (!typing && i >= 0) {
        setTypedCode(codeString.slice(0, i));
        i--;
        timeout = setTimeout(type, 40);
      } else {
        typing = !typing;
        if (typing) i = 0; else i = codeString.length;
        timeout = setTimeout(type, 80);
      }
    }
    type();
    return () => clearTimeout(timeout);
  }, []);

  return (
    <section className="relative pt-24 pb-16 md:pt-32 md:pb-24 overflow-hidden pl-20 pr-20">
      {/* Gradient background */}
      <div className="absolute inset-0 z-0">
        <div className="w-full h-full bg-gradient-to-br from-[#e0f2fe] via-white to-[#ede9fe]" />
        {/* Subtle grid effect */}
        <svg className="absolute inset-0 w-full h-full opacity-20" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#c7d2fe" strokeWidth="1" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>
      {/* Subtle animated circuit background */}
      <svg className="absolute inset-0 w-full h-full z-0 opacity-40 pointer-events-none" viewBox="0 0 1440 600" fill="none" xmlns="http://www.w3.org/2000/svg">
        <g>
          <motion.path
            d="M 0 500 Q 200 400 400 500 T 800 500 T 1200 500 T 1440 500"
            stroke="#2563eb"
            strokeWidth="2"
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 2, repeat: Infinity, repeatType: 'reverse', ease: 'easeInOut' }}
            filter="url(#glow)"
          />
          <motion.path
            d="M 0 550 Q 300 450 600 550 T 1200 550 T 1440 550"
            stroke="#38bdf8"
            strokeWidth="1.5"
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 2.5, repeat: Infinity, repeatType: 'reverse', ease: 'easeInOut', delay: 0.5 }}
            filter="url(#glow)"
          />
          <motion.path
            d="M 0 580 Q 400 520 800 580 T 1440 580"
            stroke="#818cf8"
            strokeWidth="1"
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 3, repeat: Infinity, repeatType: 'reverse', ease: 'easeInOut', delay: 1 }}
            filter="url(#glow)"
          />
          <defs>
            <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>
        </g>
      </svg>
      <div className="container-custom relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="space-y-8 max-w-xl lg:max-w-2xl mx-auto lg:mx-0"
          >
            <div className="space-y-4">
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.8 }}
                className="text-5xl md:text-6xl lg:text-7xl font-bold font-display leading-tight tracking-tight text-gray-900 drop-shadow-sm"
              >
                <span className="bg-gradient-to-r from-blue-500 via-blue-400 to-purple-500 bg-clip-text text-transparent">BRMH</span>
                <br />
                <span className="text-gray-900">Your Unified API & Namespace Manager</span>
              </motion.h1>
              
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.8 }}
                className="text-2xl md:text-3xl text-gray-700 dark:text-gray-200 leading-relaxed max-w-2xl font-normal"
              >
                Easily create, manage, and expose your APIs and namespaces with powerful schema and method control.
              </motion.p>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.8 }}
              className="flex flex-col sm:flex-row gap-4"
            >
              <a href="#get-started" className="btn-primary flex items-center justify-center group">
                Get Started
                <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </a>
              <a href="#demo" className="btn-secondary flex items-center justify-center group">
                <Play className="mr-2 w-5 h-5" />
                Watch Demo
              </a>
            </motion.div>

            {/* Trust Indicators */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8, duration: 0.8 }}
              className="flex items-center space-x-6 text-sm text-gray-500"
            >
              <div className="flex items-center space-x-2">
                <Shield className="w-4 h-4 text-green-500" />
                <span>Enterprise Security</span>
              </div>
              <div className="flex items-center space-x-2">
                <Globe className="w-4 h-4 text-blue-500" />
                <span>Global CDN</span>
              </div>
              <div className="flex items-center space-x-2">
                <Database className="w-4 h-4 text-purple-500" />
                <span>99.9% Uptime</span>
              </div>
            </motion.div>
          </motion.div>

          {/* Right Content - Visual */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3, duration: 0.8 }}
            className="relative"
          >
            <div className="relative bg-white rounded-2xl shadow-2xl p-8 border border-gray-200">
              {/* Mock API Interface */}
              <div className="space-y-6">
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <div className="flex-1"></div>
                  <Code className="w-5 h-5 text-gray-400" />
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm font-mono text-gray-600">GET</span>
                    <span className="text-sm font-mono text-primary-600">/api/users</span>
                    <span className="text-xs text-gray-400">200 OK</span>
                  </div>
                  
                  <div className="bg-gray-50 rounded-lg p-4">
                    <pre className="text-xs text-gray-700 font-mono min-h-[120px] whitespace-pre-wrap transition-all duration-300">
                      {typedCode}
                      <span className="animate-pulse text-gray-400">|</span>
                    </pre>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span className="text-sm font-mono text-gray-600">POST</span>
                    <span className="text-sm font-mono text-primary-600">/api/users</span>
                    <span className="text-xs text-gray-400">201 Created</span>
                  </div>
                </div>
              </div>
              
              {/* Floating Elements */}
              <motion.div
                animate={{ y: [-10, 10, -10] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                className="absolute -top-4 -right-4 bg-primary-100 rounded-lg p-3"
              >
                <Database className="w-6 h-6 text-primary-600" />
              </motion.div>
              
              <motion.div
                animate={{ y: [10, -10, 10] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="absolute -bottom-4 -left-4 bg-green-100 rounded-lg p-3"
              >
                <Globe className="w-6 h-6 text-green-600" />
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
} 