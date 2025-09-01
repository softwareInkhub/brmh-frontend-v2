'use client';

import { useState } from 'react';

export default function TestScrapingPage() {
  const [scrapedData, setScrapedData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const testScraping = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('Testing scraping...');
      const response = await fetch('http://localhost:5001/web-scraping/scrape-preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serviceName: 'shopify',
          options: { apis: true, schemas: true, documentation: true, followLinks: false }
        })
      });

      console.log('Response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Scraped data:', data);
        setScrapedData(data.data);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Request failed');
      }
    } catch (err) {
      console.error('Error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Web Scraping Test</h1>
      
      <button 
        onClick={testScraping}
        disabled={loading}
        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
      >
        {loading ? 'Testing...' : 'Test Shopify Scraping'}
      </button>

      {error && (
        <div className="mt-4 p-4 bg-red-100 text-red-700 rounded">
          Error: {error}
        </div>
      )}

      {scrapedData && (
        <div className="mt-4">
          <h2 className="text-xl font-semibold mb-2">Results:</h2>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="bg-blue-50 p-4 rounded">
              <h3 className="font-medium text-blue-800">APIs</h3>
              <p className="text-2xl font-bold text-blue-600">{scrapedData.apis?.length || 0}</p>
            </div>
            <div className="bg-green-50 p-4 rounded">
              <h3 className="font-medium text-green-800">Schemas</h3>
              <p className="text-2xl font-bold text-green-600">{scrapedData.schemas?.length || 0}</p>
            </div>
            <div className="bg-purple-50 p-4 rounded">
              <h3 className="font-medium text-purple-800">Documentation</h3>
              <p className="text-2xl font-bold text-purple-600">{scrapedData.documentation?.length || 0}</p>
            </div>
          </div>

          {scrapedData.apis && scrapedData.apis.length > 0 && (
            <div className="bg-white border rounded p-4">
              <h3 className="font-medium mb-2">Sample APIs:</h3>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {scrapedData.apis.slice(0, 5).map((api: any, index: number) => (
                  <div key={index} className="bg-gray-50 p-2 rounded text-sm">
                    <strong>{api.name || api.endpoint}</strong>
                    <p className="text-gray-600">{api.description}</p>
                    <p className="text-xs text-gray-500">{api.url}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
