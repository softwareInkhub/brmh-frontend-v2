'use client'

import { motion } from 'framer-motion'
import { 
  FolderOpen, 
  Code2, 
  Database, 
  Settings, 
  Share2, 
  Zap,
  Shield,
  Globe,
  GitBranch,
  BarChart3
} from 'lucide-react'

const features = [
  {
    icon: FolderOpen,
    title: "Create and Manage Namespaces",
    description: "Organize your APIs into logical namespaces for better structure and management. Create unlimited namespaces with custom configurations.",
    color: "text-blue-600",
    bgColor: "bg-blue-100"
  },
  {
    icon: Code2,
    title: "Build & Control API Schemas",
    description: "Design comprehensive API schemas with validation rules, data types, and documentation. Full control over your API structure.",
    color: "text-green-600",
    bgColor: "bg-green-100"
  },
  {
    icon: Database,
    title: "Store and Fetch APIs",
    description: "Seamlessly store and retrieve APIs from different platforms. Support for multiple data sources and formats.",
    color: "text-purple-600",
    bgColor: "bg-purple-100"
  },
  {
    icon: Settings,
    title: "CRUD Operations",
    description: "Complete CRUD operations on methods and schemas. Create, read, update, and delete with powerful validation.",
    color: "text-orange-600",
    bgColor: "bg-orange-100"
  },
  {
    icon: Share2,
    title: "Live Sharing of Public APIs",
    description: "Make your namespaces public and share APIs with the developer community. Real-time updates and collaboration.",
    color: "text-pink-600",
    bgColor: "bg-pink-100"
  },
  {
    icon: Zap,
    title: "High Performance",
    description: "Lightning-fast API responses with global CDN, caching, and optimized routing for the best developer experience.",
    color: "text-yellow-600",
    bgColor: "bg-yellow-100"
  }
]

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5
    }
  }
}

export default function Features() {
  return (
    <section id="features" className="section-padding bg-white pl-20 pr-20 pt-10 pb-10">
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
            Powerful Features for Modern Developers
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Everything you need to build, manage, and scale your APIs in one unified platform
          </p>
        </motion.div>

        {/* Features Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid md:grid-cols-2 lg:grid-cols-3 gap-8"
        >
          {features.map((feature, index) => (
            <motion.div
              key={index}
              variants={itemVariants}
              className="group"
            >
              <div className="bg-white rounded-xl p-8 border border-gray-200 hover:border-primary-200 transition-all duration-300 card-hover">
                <div className={`w-12 h-12 ${feature.bgColor} rounded-lg flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}>
                  <feature.icon className={`w-6 h-6 ${feature.color}`} />
                </div>
                
                <h3 className="text-xl font-semibold mb-3 text-gray-900">
                  {feature.title}
                </h3>
                
                <p className="text-gray-600 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Additional Features */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mt-16 bg-gradient-to-r from-primary-50 to-secondary-50 rounded-2xl p-8 md:p-12"
        >
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="w-8 h-8 text-primary-600" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Enterprise Security</h3>
              <p className="text-gray-600">Bank-level security with encryption, authentication, and compliance</p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Globe className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Global Infrastructure</h3>
              <p className="text-gray-600">Deployed across multiple regions for optimal performance</p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <BarChart3 className="w-8 h-8 text-purple-600" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Analytics & Monitoring</h3>
              <p className="text-gray-600">Real-time insights into API usage and performance</p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
} 