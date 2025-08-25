'use client'

import { motion } from 'framer-motion'
import Header from '../components/Header'
import Hero from '../components/Hero'
import Features from '../components/Features'
import HowItWorks from '../components/HowItWorks'
import Showcase from '../components/Showcase'
import Pricing from '../components/Pricing'
import Testimonials from '../components/Testimonials'
import Footer from '../components/Footer'
import Header2 from '../components/Header2'

export default function Home() {
  return (
    <main className="min-h-screen bg-white ">
      <Header2 />
     
        <Hero />
        <Features />
        <HowItWorks />
        <Showcase />
        <Pricing />
        <Testimonials />
      <Footer />
    </main>
  )
} 