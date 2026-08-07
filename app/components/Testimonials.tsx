'use client'

import { motion } from 'framer-motion'
import { Star, Quote } from 'lucide-react'

const testimonials = [
  {
    name: "Sarah Chen",
    role: "Senior Backend Developer",
    company: "TechCorp",
    avatar: "SC",
    content: "BRMH has completely transformed how we manage our APIs. The visual schema builder is a game-changer, and the real-time testing saves us hours of development time.",
    rating: 5
  },
  {
    name: "Marcus Rodriguez",
    role: "API Architect",
    company: "StartupXYZ",
    avatar: "MR",
    content: "The namespace organization feature is brilliant. We can now manage multiple client APIs in one place with perfect separation. Highly recommended for any development team.",
    rating: 5
  },
  {
    name: "Emily Watson",
    role: "Full Stack Developer",
    company: "DevStudio",
    avatar: "EW",
    content: "I love how easy it is to share APIs with the community. The public namespace feature has helped us collaborate with other developers seamlessly.",
    rating: 5
  }
]

const companies = [
  "TechCorp", "StartupXYZ", "DevStudio", "InnovateLab", "CodeCraft", "DataFlow"
]

export default function Testimonials() {
  return (
    <section className="section-padding bg-white pl-10 pr-10 pt-10 pb-10">
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
            Loved by Developers Worldwide
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Join thousands of developers who trust BRMH for their API management needs
          </p>
        </motion.div>

        {/* Testimonials Grid */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="grid md:grid-cols-3 gap-8 mb-16"
        >
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              className="bg-gray-50 rounded-xl p-6 hover:shadow-lg transition-all duration-300"
            >
              {/* Rating */}
              <div className="flex items-center space-x-1 mb-4">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                ))}
              </div>

              {/* Quote */}
              <div className="mb-6">
                <Quote className="w-8 h-8 text-primary-200 mb-2" />
                <p className="text-gray-700 leading-relaxed">
                  "{testimonial.content}"
                </p>
              </div>

              {/* Author */}
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                  <span className="text-primary-600 font-semibold text-sm">
                    {testimonial.avatar}
                  </span>
                </div>
                <div>
                  <div className="font-semibold text-gray-900">
                    {testimonial.name}
                  </div>
                  <div className="text-sm text-gray-600">
                    {testimonial.role} at {testimonial.company}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Trusted By Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="text-center"
        >
          <h3 className="text-lg font-semibold text-gray-600 mb-8">
            Trusted by leading companies
          </h3>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8 items-center">
            {companies.map((company, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="flex items-center justify-center"
              >
                <div className="text-gray-400 font-semibold text-lg hover:text-primary-600 transition-colors">
                  {company}
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Stats Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="mt-16 bg-gradient-to-r from-primary-50 to-secondary-50 rounded-2xl p-8 md:p-12"
        >
          <div className="grid md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-3xl md:text-4xl font-bold text-primary-600 mb-2">
                10K+
              </div>
              <div className="text-gray-600">Active Developers</div>
            </div>
            
            <div>
              <div className="text-3xl md:text-4xl font-bold text-primary-600 mb-2">
                50K+
              </div>
              <div className="text-gray-600">APIs Created</div>
            </div>
            
            <div>
              <div className="text-3xl md:text-4xl font-bold text-primary-600 mb-2">
                99.9%
              </div>
              <div className="text-gray-600">Uptime</div>
            </div>
            
            <div>
              <div className="text-3xl md:text-4xl font-bold text-primary-600 mb-2">
                24/7
              </div>
              <div className="text-gray-600">Support</div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
} 