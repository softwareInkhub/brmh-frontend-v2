'use client'
import React from 'react'
import ApiGenerator from '../components/ApiGenerator'

const AIApiBuilderPage = () => {
  return (
    <div className="container mx-auto px-4 h-[100vh] ">
      <h1 className="text-3xl font-bold mb-2">AI API Builder</h1>
      <ApiGenerator />
    </div>
  )
}

export default AIApiBuilderPage