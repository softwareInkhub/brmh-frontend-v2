'use client';

import React, { useEffect, useState } from 'react';
import { CheckCircle, XCircle, Loader2, AlertCircle } from 'lucide-react';

export default function PinterestCallbackPage() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Processing OAuth callback...');
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log('🔄 Pinterest OAuth callback page loaded');
    console.log('📍 Current URL:', window.location.href);
    
    const handleCallback = async () => {
      try {
        // Parse URL parameters
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        const error = urlParams.get('error');
        const errorDescription = urlParams.get('error_description');

        console.log('📋 URL Parameters:', {
          hasCode: !!code,
          hasError: !!error,
          error: error,
          errorDescription: errorDescription
        });

        if (error) {
          console.error('❌ OAuth error received:', { error, errorDescription });
          setStatus('error');
          setError(`OAuth Error: ${error}${errorDescription ? ` - ${errorDescription}` : ''}`);
          setMessage('OAuth authorization failed');
          return;
        }

        if (!code) {
          console.error('❌ No authorization code received');
          setStatus('error');
          setError('No authorization code received from Pinterest');
          setMessage('Missing authorization code');
          return;
        }

        console.log('✅ Authorization code received:', code.substring(0, 10) + '...');

        // Retrieve stored account details
        const storedDetails = sessionStorage.getItem('pinterestAccountDetails');
        if (!storedDetails) {
          console.error('❌ No stored account details found');
          setStatus('error');
          setError('No stored account details found. Please try the OAuth flow again.');
          setMessage('Missing account details');
          return;
        }

        const accountDetails = JSON.parse(storedDetails);
        console.log('💾 Retrieved stored account details:', {
          accountId: accountDetails.accountId,
          redirectUrl: accountDetails.redirectUrl,
          hasClientId: !!accountDetails.clientId,
          hasClientSecret: !!accountDetails.clientSecret
        });

        setMessage('Exchanging authorization code for access token...');
        console.log('🔄 Starting token exchange process...');

        // Call the token exchange endpoint
        const tokenResponse = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/pinterest/token`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            code,
            clientId: accountDetails.clientId,
            clientSecret: accountDetails.clientSecret,
            redirectUrl: accountDetails.redirectUrl
          })
        });

        console.log('📡 Token exchange response status:', tokenResponse.status);
        console.log('📡 Token exchange response headers:', Object.fromEntries(tokenResponse.headers.entries()));

        const responseText = await tokenResponse.text();
        console.log('📡 Token exchange response body:', responseText);

        if (!tokenResponse.ok) {
          console.error('❌ Token exchange failed:', {
            status: tokenResponse.status,
            statusText: tokenResponse.statusText,
            responseText
          });
          
          let errorMessage = 'Failed to exchange authorization code for token';
          try {
            const errorData = JSON.parse(responseText);
            errorMessage = errorData.error || errorData.message || errorMessage;
          } catch (e) {
            // If response is not JSON, use the raw text
            errorMessage = responseText || errorMessage;
          }

          setStatus('error');
          setError(errorMessage);
          setMessage('Token exchange failed');
          return;
        }

        // Parse the token response
        let accessToken;
        try {
          accessToken = JSON.parse(responseText);
        } catch (e) {
          // If response is not JSON, treat it as the token directly
          accessToken = responseText;
        }

        console.log('✅ Access token received successfully:', {
          tokenLength: accessToken ? accessToken.length : 0,
          tokenPreview: accessToken ? accessToken.substring(0, 20) + '...' : 'null'
        });

        setToken(accessToken);
        setStatus('success');
        setMessage('OAuth authorization completed successfully!');

        // Debug log before storing
        console.log('[DEBUG] Token to store:', accessToken, 'Type:', typeof accessToken);
        try {
          sessionStorage.setItem('pinterestAccessToken', accessToken);
          localStorage.setItem('pinterestAccessToken', accessToken);
          console.log('[DEBUG] Token stored in sessionStorage:', sessionStorage.getItem('pinterestAccessToken'));
          console.log('[DEBUG] Token stored in localStorage:', localStorage.getItem('pinterestAccessToken'));
        } catch (storageError) {
          console.error('[DEBUG] Error storing token:', storageError);
        }

        // Clean up the account details from sessionStorage
        sessionStorage.removeItem('pinterestAccountDetails');
        console.log('🧹 Cleaned up account details from sessionStorage');

        // Redirect back to the namespace page after a short delay
        setTimeout(() => {
          console.log('🔄 Redirecting back to namespace page...');
          window.location.href = '/namespace';
        }, 3000);

      } catch (err) {
        console.error('❌ Unexpected error during callback handling:', err);
        setStatus('error');
        setError(err instanceof Error ? err.message : 'An unexpected error occurred');
        setMessage('Callback processing failed');
      }
    };

    handleCallback();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full">
        <div className="text-center">
          {status === 'loading' && (
            <>
              <Loader2 className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Processing OAuth Callback</h2>
              <p className="text-gray-600">{message}</p>
            </>
          )}

          {status === 'success' && (
            <>
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Authorization Successful!</h2>
              <p className="text-gray-600 mb-4">{message}</p>
              {token && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
                  <p className="text-sm text-green-800">
                    <strong>Access Token:</strong> {token.substring(0, 20)}...
                  </p>
                </div>
              )}
              <p className="text-sm text-gray-500">Redirecting back to namespace page...</p>
            </>
          )}

          {status === 'error' && (
            <>
              <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Authorization Failed</h2>
              <p className="text-gray-600 mb-4">{message}</p>
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                  <p className="text-sm text-red-800">
                    <strong>Error:</strong> {error}
                  </p>
                </div>
              )}
              <button
                onClick={() => window.location.href = '/namespace'}
                className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
              >
                Return to Namespace
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
} 