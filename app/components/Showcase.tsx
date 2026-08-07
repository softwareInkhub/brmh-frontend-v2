'use client'

import { motion } from 'framer-motion'
import { 
  Code, 
  Database, 
  Settings, 
  Eye, 
  Copy,
  Check,
  Play,
  Zap
} from 'lucide-react'

export default function Showcase() {
  return (
    <section id="showcase" className="section-padding bg-white pl-10 pr-10 pt-10 pb-10">
      <div className="container-custom">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-bold font-display mb-4">
            See BRMH in Action
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Explore our intuitive interface designed for developers, by developers
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left: Interface Mockup */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="relative"
          >
            <div className="bg-gray-900 rounded-xl p-6 shadow-2xl">
              {/* Browser Header */}
              <div className="flex items-center space-x-2 mb-6">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <div className="flex-1"></div>
                <div className="text-gray-400 text-sm">BRMH Dashboard</div>
              </div>

              {/* Sidebar */}
              <div className="flex space-x-4">
                <div className="w-48 bg-gray-800 rounded-lg p-4">
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2 text-gray-300">
                      <Database className="w-4 h-4" />
                      <span className="text-sm">Namespaces</span>
                    </div>
                    <div className="space-y-1">
                      <div className="bg-primary-600 text-white text-sm px-3 py-1 rounded">User API</div>
                      <div className="text-gray-400 text-sm px-3 py-1">Product API</div>
                      <div className="text-gray-400 text-sm px-3 py-1">Payment API</div>
                    </div>
                    <div className="flex items-center space-x-2 text-gray-300 mt-4">
                      <Code className="w-4 h-4" />
                      <span className="text-sm">Schemas</span>
                    </div>
                    <div className="space-y-1">
                      <div className="text-gray-400 text-sm px-3 py-1">User Schema</div>
                      <div className="text-gray-400 text-sm px-3 py-1">Product Schema</div>
                    </div>
                  </div>
                </div>

                {/* Main Content */}
                <div className="flex-1 bg-gray-800 rounded-lg p-4">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-white font-semibold">User API - Methods</h3>
                      <button className="bg-green-600 text-white px-3 py-1 rounded text-sm flex items-center space-x-1">
                        <Play className="w-3 h-3" />
                        <span>Test</span>
                      </button>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="bg-gray-700 rounded p-3">
                        <div className="flex items-center space-x-2 mb-2">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          <span className="text-green-400 text-sm font-mono">GET</span>
                          <span className="text-white text-sm">/api/users</span>
                          <span className="text-gray-400 text-xs">200 OK</span>
                        </div>
                        <div className="text-gray-300 text-xs">
                          Retrieve all users with pagination
                        </div>
                      </div>
                      
                      <div className="bg-gray-700 rounded p-3">
                        <div className="flex items-center space-x-2 mb-2">
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          <span className="text-blue-400 text-sm font-mono">POST</span>
                          <span className="text-white text-sm">/api/users</span>
                          <span className="text-gray-400 text-xs">201 Created</span>
                        </div>
                        <div className="text-gray-300 text-xs">
                          Create a new user account
                        </div>
                      </div>
                      
                      <div className="bg-gray-700 rounded p-3">
                        <div className="flex items-center space-x-2 mb-2">
                          <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                          <span className="text-yellow-400 text-sm font-mono">PUT</span>
                          <span className="text-white text-sm">/api/users/:id</span>
                          <span className="text-gray-400 text-xs">200 OK</span>
                        </div>
                        <div className="text-gray-300 text-xs">
                          Update user information
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Floating Stats */}
            <motion.div
              animate={{ y: [-5, 5, -5] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              className="absolute -top-4 -right-4 bg-white rounded-lg p-4 shadow-lg border border-gray-200"
            >
              <div className="flex items-center space-x-2">
                <Zap className="w-5 h-5 text-green-600" />
                <div>
                  <div className="text-sm font-semibold">99.9%</div>
                  <div className="text-xs text-gray-500">Uptime</div>
                </div>
              </div>
            </motion.div>
          </motion.div>

          {/* Right: Features List */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="space-y-8"
          >
            <div className="space-y-6">
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Code className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">Visual Schema Builder</h3>
                  <p className="text-gray-600">
                    Design your API schemas with our intuitive drag-and-drop interface. 
                    No more writing JSON by hand - build complex schemas visually.
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Play className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">Live API Testing</h3>
                  <p className="text-gray-600">
                    Test your APIs directly in the browser with our built-in testing tool. 
                    See responses in real-time with syntax highlighting.
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Settings className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">Advanced Configuration</h3>
                  <p className="text-gray-600">
                    Fine-tune your APIs with advanced settings, validation rules, 
                    and custom middleware. Full control over your API behavior.
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Eye className="w-6 h-6 text-orange-600" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">Real-time Monitoring</h3>
                  <p className="text-gray-600">
                    Monitor your API performance with detailed analytics, 
                    request logs, and error tracking. Stay on top of your API health.
                  </p>
                </div>
              </div>
            </div>

            {/* CTA */}
            <div className="bg-gradient-to-r from-primary-50 to-secondary-50 rounded-xl p-6">
              <h3 className="text-lg font-semibold mb-2">Ready to explore?</h3>
              <p className="text-gray-600 mb-4">
                Start building your first API with BRMH today.
              </p>
              <a href="#get-started" className="btn-primary">
                Try BRMH Free
              </a>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
} 