'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Menu, X, Code, Github, Twitter, Linkedin } from 'lucide-react'

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center space-x-2"
          >
            <div className="w-8 h-8 bg-gradient-to-br from-primary-600 to-primary-800 rounded-lg flex items-center justify-center">
              <Code className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold font-display gradient-text">BRMH</span>
          </motion.div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            <a href="#features" className="text-gray-600 hover:text-primary-600 transition-colors">
              Features
            </a>
            <a href="#how-it-works" className="text-gray-600 hover:text-primary-600 transition-colors">
              How It Works
            </a>
            <a href="#showcase" className="text-gray-600 hover:text-primary-600 transition-colors">
              Showcase
            </a>
            <a href="#pricing" className="text-gray-600 hover:text-primary-600 transition-colors">
              Pricing
            </a>
            <a href="#contact" className="text-gray-600 hover:text-primary-600 transition-colors">
              Contact
            </a>
          </nav>

          {/* CTA Buttons */}
          <div className="hidden md:flex items-center space-x-4">
            <a href="#demo" className="btn-secondary">
              Watch Demo
            </a>
            <a href="#get-started" className="btn-primary">
              Get Started
            </a>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden py-4 border-t border-gray-200"
          >
            <nav className="flex flex-col space-y-4">
              <a href="#features" className="text-gray-600 hover:text-primary-600 transition-colors">
                Features
              </a>
              <a href="#how-it-works" className="text-gray-600 hover:text-primary-600 transition-colors">
                How It Works
              </a>
              <a href="#showcase" className="text-gray-600 hover:text-primary-600 transition-colors">
                Showcase
              </a>
              <a href="#pricing" className="text-gray-600 hover:text-primary-600 transition-colors">
                Pricing
              </a>
              <a href="#contact" className="text-gray-600 hover:text-primary-600 transition-colors">
                Contact
              </a>
              <div className="flex flex-col space-y-2 pt-4">
                <a href="#demo" className="btn-secondary text-center">
                  Watch Demo
                </a>
                <a href="#get-started" className="btn-primary text-center">
                  Get Started
                </a>
              </div>
            </nav>
          </motion.div>
        )}
      </div>
    </header>
  )
} 