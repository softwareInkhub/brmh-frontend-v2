'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Plus } from '@/app/components/ui/icons';
import { Alert, AlertDescription } from '@/app/components/ui/alert';
import { listFunctions, type LambdaFunction } from '@/app/services/lambda';
import { logger } from '@/app/utils/logger';

export default function LambdaPage() {
  const [functions, setFunctions] = useState<LambdaFunction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadFunctions() {
    logger.info('LambdaPage: Starting to load functions', {
      component: 'LambdaPage'
    });
    setLoading(true);
    setError(null);

    try {
      logger.debug('LambdaPage: Calling listFunctions service', {
        component: 'LambdaPage'
      });
      const startTime = Date.now();
      
      const response = await listFunctions();
      
      const duration = Date.now() - startTime;
      logger.debug(`LambdaPage: listFunctions completed in ${duration}ms`, {
        component: 'LambdaPage'
      });
      
      setFunctions(response.functions);
      logger.info('LambdaPage: Successfully loaded functions', {
        component: 'LambdaPage',
        data: {
          count: response.functions.length,
          requestId: response.requestId
        }
      });
    } catch (error) {
      logger.error('LambdaPage: Error loading functions', {
        component: 'LambdaPage',
        data: {
          error: error instanceof Error ? {
            name: error.name,
            message: error.message,
            stack: error.stack
          } : 'Unknown error'
        }
      });
      setError(error instanceof Error ? error.message : 'An unknown error occurred');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    logger.info('LambdaPage: Component mounted', {
      component: 'LambdaPage'
    });
    loadFunctions();
  }, []);

  const handleCreateFunction = () => {
    logger.info('Create function button clicked', { 
      component: 'LambdaPage'
    });
    // Implementation for create function modal/form
  };

  if (loading) {
    return (
      <div className="p-4">
        <Card>
          <CardContent className="p-4">
            <p>Loading Lambda functions...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Lambda Functions</h1>
        <Button onClick={handleCreateFunction}>
          <Plus className="mr-2 h-4 w-4" />
          Create Function
        </Button>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Function List</CardTitle>
          </CardHeader>
          <CardContent>
            {functions.length === 0 ? (
              <p className="text-sm text-gray-500">No functions found</p>
            ) : (
              <ul className="space-y-2">
                {functions.map((func) => (
                  <li key={func.FunctionName} className="text-sm">
                    <span className="font-medium">{func.FunctionName}</span>
                    <div className="text-gray-500 ml-2">
                      <div>Runtime: {func.Runtime}</div>
                      <div>Handler: {func.Handler}</div>
                      <div>Memory: {func.MemorySize}MB</div>
                      <div>Timeout: {func.Timeout}s</div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Function Metrics</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500">Monitor invocations and errors</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Permissions</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500">Manage function roles and policies</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 