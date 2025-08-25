'use client'

import { motion } from 'framer-motion'
import { Code2, BookText, FlaskConical, MonitorPlay } from 'lucide-react'

const features = [
  {
    icon: Code2,
    title: 'Developing & Debugging',
    subtitle: 'Backend Developer',
    color: 'from-blue-400 to-blue-600',
    pos: 'left-top',
  },
  {
    icon: MonitorPlay,
    title: 'Mocking & Calling',
    subtitle: 'Frontend Developer',
    color: 'from-blue-400 to-blue-600',
    pos: 'right-top',
  },
  {
    icon: BookText,
    title: 'Documentation',
    subtitle: 'API Designer',
    color: 'from-yellow-400 to-yellow-500',
    pos: 'left-bottom',
  },
  {
    icon: FlaskConical,
    title: 'Automated Testing',
    subtitle: 'QA Engineer',
    color: 'from-purple-400 to-purple-600',
    pos: 'right-bottom',
  },
]

const nodePositions = {
  'left-top': 'top-0 left-0 md:-translate-x-1/2 md:-translate-y-1/2',
  'right-top': 'top-0 right-0 md:translate-x-1/2 md:-translate-y-1/2',
  'left-bottom': 'bottom-0 left-0 md:-translate-x-1/2 md:translate-y-1/2',
  'right-bottom': 'bottom-0 right-0 md:translate-x-1/2 md:translate-y-1/2',
}

export default function HowItWorks() {
  return (
    <section className="section-padding bg-transparent">
      <div className="container-custom flex flex-col items-center">
        <h2 className="text-3xl md:text-4xl font-bold font-display mb-2 text-center">All-in-one API Development Platform</h2>
        <p className="text-lg text-gray-500 mb-10 text-center">API Design Specification and Connected Features</p>
        <div className="relative w-full max-w-3xl h-[480px] md:h-[540px] flex items-center justify-center">
          {/* SVG animated lines and central circle */}
          <svg className="absolute inset-0 w-full h-full z-0" viewBox="0 0 600 600" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* Central circle */}
            <motion.circle 
              cx="300" cy="300" r="120" stroke="#e0e7ff" strokeWidth="2" 
              initial={{ filter: 'drop-shadow(0 0 0 #38bdf8)' }}
              animate={{ filter: [
                'drop-shadow(0 0 0 #38bdf8)',
                'drop-shadow(0 0 16px #38bdf8)',
                'drop-shadow(0 0 0 #38bdf8)'
              ] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            />
            {/* Lines to nodes - symmetrical arrangement */}
            <motion.line x1="300" y1="180" x2="120" y2="80" stroke="#bae6fd" strokeWidth="2" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1, delay: 0.5 }} />
            <motion.line x1="300" y1="180" x2="480" y2="80" stroke="#bae6fd" strokeWidth="2" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1, delay: 0.7 }} />
            <motion.line x1="300" y1="420" x2="120" y2="520" stroke="#ddd6fe" strokeWidth="2" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1, delay: 0.9 }} />
                        <motion.line x1="300" y1="420" x2="480" y2="520" stroke="#ddd6fe" strokeWidth="2" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1, delay: 1.1 }} />
          </svg>
          
          {/* Central circle text - positioned under the empty circle */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.5 }}
            className="absolute left-1/2 top-1/2 transform -translate-x-1/2 translate-y-48 z-10 text-center w-full max-w-xs"
          >
            <span className="text-base md:text-lg font-bold bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent">
              API Design Specification
            </span>
          </motion.div>
 
          {/* Feature nodes - symmetrical absolute positions */}
          <motion.div initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 1.2, duration: 0.7 }}
            whileHover={{ scale: 1.08, boxShadow: '0 0 16px #38bdf8' }}
            className="absolute left-[6%] top-[6%] w-40 h-28 flex flex-col items-center justify-center bg-white rounded-2xl shadow-lg border border-gray-100 transition-all">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center mb-2">
              <Code2 className="w-7 h-7 text-white drop-shadow" />
            </div>
            <div className="text-center">
              <div className="text-base md:text-lg font-semibold text-blue-600 mb-1">Developing & Debugging</div>
              <div className="text-xs text-gray-400">👤 Backend Developer</div>
            </div>
          </motion.div>
          <motion.div initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 1.4, duration: 0.7 }}
            whileHover={{ scale: 1.08, boxShadow: '0 0 16px #38bdf8' }}
            className="absolute right-[6%] top-[6%] w-40 h-28 flex flex-col items-center justify-center bg-white rounded-2xl shadow-lg border border-gray-100 transition-all">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center mb-2">
              <MonitorPlay className="w-7 h-7 text-white drop-shadow" />
            </div>
            <div className="text-center">
              <div className="text-base md:text-lg font-semibold text-blue-600 mb-1">Mocking & Calling</div>
              <div className="text-xs text-gray-400">👤 Frontend Developer</div>
            </div>
          </motion.div>
          <motion.div initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 1.6, duration: 0.7 }}
            whileHover={{ scale: 1.08, boxShadow: '0 0 16px #facc15' }}
            className="absolute left-[6%] bottom-[6%] w-40 h-28 flex flex-col items-center justify-center bg-white rounded-2xl shadow-lg border border-gray-100 transition-all">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-500 flex items-center justify-center mb-2">
              <BookText className="w-7 h-7 text-white drop-shadow" />
            </div>
            <div className="text-center">
              <div className="text-base md:text-lg font-semibold text-yellow-600 mb-1">Documentation</div>
              <div className="text-xs text-gray-400">👤 API Designer</div>
            </div>
          </motion.div>
          <motion.div initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 1.8, duration: 0.7 }}
            whileHover={{ scale: 1.08, boxShadow: '0 0 16px #a78bfa' }}
            className="absolute right-[6%] bottom-[6%] w-40 h-28 flex flex-col items-center justify-center bg-white rounded-2xl shadow-lg border border-gray-100 transition-all">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center mb-2">
              <FlaskConical className="w-7 h-7 text-white drop-shadow" />
            </div>
            <div className="text-center">
              <div className="text-base md:text-lg font-semibold text-purple-600 mb-1">Automated Testing</div>
              <div className="text-xs text-gray-400">👤 QA Engineer</div>
            </div>
          </motion.div>
        </div>
        <div className="mt-10 text-center text-blue-500 text-lg font-medium">When the API Spec</div>
      </div>
    </section>
  )
} 