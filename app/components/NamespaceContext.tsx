'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';

interface NamespaceContextType {
  currentNamespace: any;
  setCurrentNamespace: (namespace: any) => void;
  getCurrentNamespaceContext: () => any;
}

const NamespaceContext = createContext<NamespaceContextType | undefined>(undefined);

export const useNamespaceContext = () => {
  const context = useContext(NamespaceContext);
  if (context === undefined) {
    throw new Error('useNamespaceContext must be used within a NamespaceProvider');
  }
  return context;
};

interface NamespaceProviderProps {
  children: ReactNode;
}

export const NamespaceProvider: React.FC<NamespaceProviderProps> = ({ children }) => {
  const [currentNamespace, setCurrentNamespace] = useState<any>(null);

  const getCurrentNamespaceContext = () => {
    console.log('Getting current namespace context:', currentNamespace);
    return currentNamespace;
  };

  const setCurrentNamespaceWithLog = (namespace: any) => {
    console.log('Setting current namespace context:', namespace);
    setCurrentNamespace(namespace);
  };

  const value = {
    currentNamespace,
    setCurrentNamespace: setCurrentNamespaceWithLog,
    getCurrentNamespaceContext,
  };

  return (
    <NamespaceContext.Provider value={value}>
      {children}
    </NamespaceContext.Provider>
  );
};
