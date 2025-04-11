"use client"
import { useState, useEffect } from 'react';
import { StatusLogEntry, ApiEndpoint } from '../types/index2';
import { useQuery, useMutation } from '@tanstack/react-query';
import { API_BASE_URL } from '../lib/constants';

interface UseApiGeneratorProps {
  addLog: (type: StatusLogEntry['type'], message: string) => void;
}

export function useApiGenerator({ addLog }: UseApiGeneratorProps) {
  const [apiDescription, setApiDescription] = useState('');
  const [model, setModel] = useState('llama-3.1-sonar-small-128k-online');
  const [temperature, setTemperature] = useState(0.2);
  const [apiSpec, setApiSpec] = useState('');
  const [endpoints, setEndpoints] = useState<ApiEndpoint[]>([]);
  
  // Fetch endpoints if available
  const { data: endpointData, refetch: refetchEndpoints } = useQuery<ApiEndpoint[]>({
    queryKey: [`${API_BASE_URL}/api/endpoints`],
    enabled: true,
    staleTime: 0,
    retry: 3,
    refetchOnWindowFocus: false
  });
  
  // Fetch OpenAPI spec if available
  const { data: specData, refetch: refetchSpec } = useQuery<{ spec: string }>({
    queryKey: [`${API_BASE_URL}/api/spec`],
    enabled: true,
    staleTime: 0,
    retry: 3,
    refetchOnWindowFocus: false
  });
  
  useEffect(() => {
    if (endpointData) {
      setEndpoints(Array.isArray(endpointData) ? endpointData : []);
    }
  }, [endpointData]);
  
  useEffect(() => {
    if (specData) {
      setApiSpec(specData.spec);
    }
  }, [specData]);
  
  // Generate API spec mutation
  const { mutate, isPending } = useMutation({
    mutationFn: async (description: string) => {
      const response = await fetch(`${API_BASE_URL}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: description,
          model,
          temperature
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to generate API');
      }
      
      return response.json();
    },
    onSuccess: async () => {
      addLog('success', 'API specification generated successfully');
      // Refetch both endpoints and spec
      await refetchSpec();
      await refetchEndpoints();
    },
    onError: (error) => {
      addLog('error', `Failed to generate API: ${error.message}`);
    }
  });
  
  const handleGenerate = () => {
    if (!apiDescription.trim()) {
      return;
    }
    
    addLog('generating', 'Generating OpenAPI specification...');
    mutate(apiDescription);
  };
  
  return {
    apiDescription,
    setApiDescription,
    model,
    setModel,
    temperature,
    setTemperature,
    isGenerating: isPending,
    handleGenerate,
    apiSpec,
    endpoints: endpoints || []
  };
}
