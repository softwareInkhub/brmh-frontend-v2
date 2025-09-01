'use client'
import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  Save, 
  RefreshCw, 
  Database, 
  Globe, 
  Shield, 
  Bell, 
  Palette, 
  Code, 
  Key, 
  User, 
  Server, 
  Zap, 
  Trash2,
  Eye,
  EyeOff,
  CheckCircle,
  AlertCircle,
  Info,
  ExternalLink,
  Download,
  Upload,
  Lock,
  Unlock
} from 'lucide-react';

const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5001';

interface SettingsData {
  general: {
    appName: string;
    version: string;
    autoSave: boolean;
    language: string;
    timezone: string;
  };
  api: {
    baseUrl: string;
    timeout: number;
    retryAttempts: number;
    enableCaching: boolean;
    cacheTimeout: number;
  };
  security: {
    enableTwoFactor: boolean;
    sessionTimeout: number;
    passwordPolicy: {
      minLength: number;
      requireUppercase: boolean;
      requireLowercase: boolean;
      requireNumbers: boolean;
      requireSpecialChars: boolean;
    };
  };
  appearance: {
    theme: 'light' | 'dark' | 'auto';
    primaryColor: string;
    fontSize: 'small' | 'medium' | 'large';
    compactMode: boolean;
    showAnimations: boolean;
  };
  notifications: {
    emailNotifications: boolean;
    pushNotifications: boolean;
    soundAlerts: boolean;
    notificationTypes: {
      errors: boolean;
      warnings: boolean;
      info: boolean;
      success: boolean;
    };
  };
  advanced: {
    debugMode: boolean;
    enableLogging: boolean;
    logLevel: 'error' | 'warn' | 'info' | 'debug';
    enableTelemetry: boolean;
    autoUpdate: boolean;
  };
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<SettingsData>({
    general: {
      appName: 'BRMH',
      version: '1.0.0',
      autoSave: true,
      language: 'en',
      timezone: 'UTC'
    },
    api: {
      baseUrl: API_BASE_URL,
      timeout: 30000,
      retryAttempts: 3,
      enableCaching: true,
      cacheTimeout: 300000
    },
    security: {
      enableTwoFactor: false,
      sessionTimeout: 3600,
      passwordPolicy: {
        minLength: 8,
        requireUppercase: true,
        requireLowercase: true,
        requireNumbers: true,
        requireSpecialChars: true
      }
    },
    appearance: {
      theme: 'auto',
      primaryColor: '#3B82F6',
      fontSize: 'medium',
      compactMode: false,
      showAnimations: true
    },
    notifications: {
      emailNotifications: true,
      pushNotifications: true,
      soundAlerts: false,
      notificationTypes: {
        errors: true,
        warnings: true,
        info: false,
        success: false
      }
    },
    advanced: {
      debugMode: false,
      enableLogging: true,
      logLevel: 'info',
      enableTelemetry: false,
      autoUpdate: true
    }
  });

  const [activeTab, setActiveTab] = useState('general');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');

  // Load settings from localStorage on component mount
  useEffect(() => {
    const savedSettings = localStorage.getItem('brmh-settings');
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        setSettings(prev => ({ ...prev, ...parsed }));
      } catch (error) {
        console.error('Failed to parse saved settings:', error);
      }
    }
  }, []);

  // Track changes
  useEffect(() => {
    setHasChanges(true);
  }, [settings]);

  const handleSave = async () => {
    setIsLoading(true);
    setSaveStatus('saving');
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Save to localStorage
      localStorage.setItem('brmh-settings', JSON.stringify(settings));
      
      setSaveStatus('success');
      setHasChanges(false);
      
      // Reset success status after 3 seconds
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (error) {
      setSaveStatus('error');
      console.error('Failed to save settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    if (window.confirm('Are you sure you want to reset all settings to default values?')) {
      const defaultSettings: SettingsData = {
        general: {
          appName: 'BRMH',
          version: '1.0.0',
          autoSave: true,
          language: 'en',
          timezone: 'UTC'
        },
        api: {
          baseUrl: API_BASE_URL,
          timeout: 30000,
          retryAttempts: 3,
          enableCaching: true,
          cacheTimeout: 300000
        },
        security: {
          enableTwoFactor: false,
          sessionTimeout: 3600,
          passwordPolicy: {
            minLength: 8,
            requireUppercase: true,
            requireLowercase: true,
            requireNumbers: true,
            requireSpecialChars: true
          }
        },
        appearance: {
          theme: 'auto',
          primaryColor: '#3B82F6',
          fontSize: 'medium',
          compactMode: false,
          showAnimations: true
        },
        notifications: {
          emailNotifications: true,
          pushNotifications: true,
          soundAlerts: false,
          notificationTypes: {
            errors: true,
            warnings: true,
            info: false,
            success: false
          }
        },
        advanced: {
          debugMode: false,
          enableLogging: true,
          logLevel: 'info',
          enableTelemetry: false,
          autoUpdate: true
        }
      };
      
      setSettings(defaultSettings);
      setHasChanges(true);
    }
  };

  const exportSettings = () => {
    const dataStr = JSON.stringify(settings, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'brmh-settings.json';
    link.click();
    URL.revokeObjectURL(url);
  };

  const importSettings = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const importedSettings = JSON.parse(e.target?.result as string);
          setSettings(importedSettings);
          setHasChanges(true);
        } catch (error) {
          alert('Invalid settings file format');
        }
      };
      reader.readAsText(file);
    }
  };

  const tabs = [
    { id: 'general', label: 'General', icon: Settings },
    { id: 'api', label: 'API', icon: Globe },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'appearance', label: 'Appearance', icon: Palette },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'advanced', label: 'Advanced', icon: Code }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Settings className="w-6 h-6 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          </div>
          
          <div className="flex items-center gap-3">
            {saveStatus === 'success' && (
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle className="w-4 h-4" />
                <span className="text-sm">Saved successfully</span>
              </div>
            )}
            
            {saveStatus === 'error' && (
              <div className="flex items-center gap-2 text-red-600">
                <AlertCircle className="w-4 h-4" />
                <span className="text-sm">Save failed</span>
              </div>
            )}
            
            <button
              onClick={handleReset}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <RefreshCw className="w-4 h-4 inline mr-2" />
              Reset
            </button>
            
            <button
              onClick={handleSave}
              disabled={isLoading || !hasChanges}
              className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                isLoading || !hasChanges
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {isLoading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {isLoading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>

      <div className="flex">
        {/* Sidebar */}
        <div className="w-64 bg-white border-r border-gray-200 min-h-screen">
          <nav className="p-4">
            <ul className="space-y-1">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <li key={tab.id}>
                    <button
                      onClick={() => setActiveTab(tab.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                        activeTab === tab.id
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {tab.label}
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-6">
          <div className="max-w-4xl">
            {/* General Settings */}
            {activeTab === 'general' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">General Settings</h2>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Application Name
                        </label>
                        <input
                          type="text"
                          value={settings.general.appName}
                          onChange={(e) => setSettings(prev => ({
                            ...prev,
                            general: { ...prev.general, appName: e.target.value }
                          }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Language
                        </label>
                        <select
                          value={settings.general.language}
                          onChange={(e) => setSettings(prev => ({
                            ...prev,
                            general: { ...prev.general, language: e.target.value }
                          }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="en">English</option>
                          <option value="es">Spanish</option>
                          <option value="fr">French</option>
                          <option value="de">German</option>
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Timezone
                        </label>
                        <select
                          value={settings.general.timezone}
                          onChange={(e) => setSettings(prev => ({
                            ...prev,
                            general: { ...prev.general, timezone: e.target.value }
                          }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="UTC">UTC</option>
                          <option value="America/New_York">Eastern Time</option>
                          <option value="America/Chicago">Central Time</option>
                          <option value="America/Denver">Mountain Time</option>
                          <option value="America/Los_Angeles">Pacific Time</option>
                        </select>
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <label className="text-sm font-medium text-gray-700">Auto Save</label>
                          <p className="text-xs text-gray-500">Automatically save changes</p>
                        </div>
                        <button
                          onClick={() => setSettings(prev => ({
                            ...prev,
                            general: { ...prev.general, autoSave: !prev.general.autoSave }
                          }))}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                            settings.general.autoSave ? 'bg-blue-600' : 'bg-gray-200'
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              settings.general.autoSave ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </div>
                      
                      <div className="bg-gray-50 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Info className="w-4 h-4 text-blue-600" />
                          <span className="text-sm font-medium text-gray-700">Version Information</span>
                        </div>
                        <p className="text-xs text-gray-600">Current Version: {settings.general.version}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* API Settings */}
            {activeTab === 'api' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">API Configuration</h2>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Base URL
                        </label>
                        <input
                          type="url"
                          value={settings.api.baseUrl}
                          onChange={(e) => setSettings(prev => ({
                            ...prev,
                            api: { ...prev.api, baseUrl: e.target.value }
                          }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="https://api.example.com"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Request Timeout (ms)
                        </label>
                        <input
                          type="number"
                          value={settings.api.timeout}
                          onChange={(e) => setSettings(prev => ({
                            ...prev,
                            api: { ...prev.api, timeout: parseInt(e.target.value) || 30000 }
                          }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          min="1000"
                          max="60000"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Retry Attempts
                        </label>
                        <input
                          type="number"
                          value={settings.api.retryAttempts}
                          onChange={(e) => setSettings(prev => ({
                            ...prev,
                            api: { ...prev.api, retryAttempts: parseInt(e.target.value) || 3 }
                          }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          min="0"
                          max="10"
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <label className="text-sm font-medium text-gray-700">Enable Caching</label>
                          <p className="text-xs text-gray-500">Cache API responses for better performance</p>
                        </div>
                        <button
                          onClick={() => setSettings(prev => ({
                            ...prev,
                            api: { ...prev.api, enableCaching: !prev.api.enableCaching }
                          }))}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                            settings.api.enableCaching ? 'bg-blue-600' : 'bg-gray-200'
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              settings.api.enableCaching ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </div>
                      
                      {settings.api.enableCaching && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Cache Timeout (ms)
                          </label>
                          <input
                            type="number"
                            value={settings.api.cacheTimeout}
                            onChange={(e) => setSettings(prev => ({
                              ...prev,
                              api: { ...prev.api, cacheTimeout: parseInt(e.target.value) || 300000 }
                            }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            min="60000"
                            max="3600000"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Security Settings */}
            {activeTab === 'security' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">Security Settings</h2>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <label className="text-sm font-medium text-gray-700">Two-Factor Authentication</label>
                          <p className="text-xs text-gray-500">Add an extra layer of security</p>
                        </div>
                        <button
                          onClick={() => setSettings(prev => ({
                            ...prev,
                            security: { ...prev.security, enableTwoFactor: !prev.security.enableTwoFactor }
                          }))}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                            settings.security.enableTwoFactor ? 'bg-blue-600' : 'bg-gray-200'
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              settings.security.enableTwoFactor ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Session Timeout (seconds)
                        </label>
                        <input
                          type="number"
                          value={settings.security.sessionTimeout}
                          onChange={(e) => setSettings(prev => ({
                            ...prev,
                            security: { ...prev.security, sessionTimeout: parseInt(e.target.value) || 3600 }
                          }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          min="300"
                          max="86400"
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-3">Password Policy</label>
                        <div className="space-y-3">
                          <div>
                            <label className="block text-sm text-gray-600 mb-1">Minimum Length</label>
                            <input
                              type="number"
                              value={settings.security.passwordPolicy.minLength}
                              onChange={(e) => setSettings(prev => ({
                                ...prev,
                                security: {
                                  ...prev.security,
                                  passwordPolicy: {
                                    ...prev.security.passwordPolicy,
                                    minLength: parseInt(e.target.value) || 8
                                  }
                                }
                              }))}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              min="6"
                              max="50"
                            />
                          </div>
                          
                          <div className="space-y-2">
                            {[
                              { key: 'requireUppercase', label: 'Require uppercase letters' },
                              { key: 'requireLowercase', label: 'Require lowercase letters' },
                              { key: 'requireNumbers', label: 'Require numbers' },
                              { key: 'requireSpecialChars', label: 'Require special characters' }
                            ].map(({ key, label }) => (
                              <div key={key} className="flex items-center">
                                <input
                                  type="checkbox"
                                  id={key}
                                  checked={settings.security.passwordPolicy[key as keyof typeof settings.security.passwordPolicy] as boolean}
                                  onChange={(e) => setSettings(prev => ({
                                    ...prev,
                                    security: {
                                      ...prev.security,
                                      passwordPolicy: {
                                        ...prev.security.passwordPolicy,
                                        [key]: e.target.checked
                                      }
                                    }
                                  }))}
                                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                />
                                <label htmlFor={key} className="ml-2 text-sm text-gray-700">{label}</label>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Appearance Settings */}
            {activeTab === 'appearance' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">Appearance Settings</h2>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Theme
                        </label>
                        <select
                          value={settings.appearance.theme}
                          onChange={(e) => setSettings(prev => ({
                            ...prev,
                            appearance: { ...prev.appearance, theme: e.target.value as 'light' | 'dark' | 'auto' }
                          }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="light">Light</option>
                          <option value="dark">Dark</option>
                          <option value="auto">Auto (System)</option>
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Primary Color
                        </label>
                        <div className="flex items-center gap-3">
                          <input
                            type="color"
                            value={settings.appearance.primaryColor}
                            onChange={(e) => setSettings(prev => ({
                              ...prev,
                              appearance: { ...prev.appearance, primaryColor: e.target.value }
                            }))}
                            className="w-12 h-10 border border-gray-300 rounded-lg cursor-pointer"
                          />
                          <input
                            type="text"
                            value={settings.appearance.primaryColor}
                            onChange={(e) => setSettings(prev => ({
                              ...prev,
                              appearance: { ...prev.appearance, primaryColor: e.target.value }
                            }))}
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="#3B82F6"
                          />
                        </div>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Font Size
                        </label>
                        <select
                          value={settings.appearance.fontSize}
                          onChange={(e) => setSettings(prev => ({
                            ...prev,
                            appearance: { ...prev.appearance, fontSize: e.target.value as 'small' | 'medium' | 'large' }
                          }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="small">Small</option>
                          <option value="medium">Medium</option>
                          <option value="large">Large</option>
                        </select>
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <label className="text-sm font-medium text-gray-700">Compact Mode</label>
                          <p className="text-xs text-gray-500">Reduce spacing for more content</p>
                        </div>
                        <button
                          onClick={() => setSettings(prev => ({
                            ...prev,
                            appearance: { ...prev.appearance, compactMode: !prev.appearance.compactMode }
                          }))}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                            settings.appearance.compactMode ? 'bg-blue-600' : 'bg-gray-200'
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              settings.appearance.compactMode ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div>
                          <label className="text-sm font-medium text-gray-700">Show Animations</label>
                          <p className="text-xs text-gray-500">Enable smooth transitions and animations</p>
                        </div>
                        <button
                          onClick={() => setSettings(prev => ({
                            ...prev,
                            appearance: { ...prev.appearance, showAnimations: !prev.appearance.showAnimations }
                          }))}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                            settings.appearance.showAnimations ? 'bg-blue-600' : 'bg-gray-200'
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              settings.appearance.showAnimations ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Notifications Settings */}
            {activeTab === 'notifications' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">Notification Settings</h2>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <label className="text-sm font-medium text-gray-700">Email Notifications</label>
                          <p className="text-xs text-gray-500">Receive notifications via email</p>
                        </div>
                        <button
                          onClick={() => setSettings(prev => ({
                            ...prev,
                            notifications: { ...prev.notifications, emailNotifications: !prev.notifications.emailNotifications }
                          }))}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                            settings.notifications.emailNotifications ? 'bg-blue-600' : 'bg-gray-200'
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              settings.notifications.emailNotifications ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div>
                          <label className="text-sm font-medium text-gray-700">Push Notifications</label>
                          <p className="text-xs text-gray-500">Receive browser push notifications</p>
                        </div>
                        <button
                          onClick={() => setSettings(prev => ({
                            ...prev,
                            notifications: { ...prev.notifications, pushNotifications: !prev.notifications.pushNotifications }
                          }))}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                            settings.notifications.pushNotifications ? 'bg-blue-600' : 'bg-gray-200'
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              settings.notifications.pushNotifications ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div>
                          <label className="text-sm font-medium text-gray-700">Sound Alerts</label>
                          <p className="text-xs text-gray-500">Play sound for notifications</p>
                        </div>
                        <button
                          onClick={() => setSettings(prev => ({
                            ...prev,
                            notifications: { ...prev.notifications, soundAlerts: !prev.notifications.soundAlerts }
                          }))}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                            settings.notifications.soundAlerts ? 'bg-blue-600' : 'bg-gray-200'
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              settings.notifications.soundAlerts ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-3">Notification Types</label>
                        <div className="space-y-3">
                          {[
                            { key: 'errors', label: 'Error notifications' },
                            { key: 'warnings', label: 'Warning notifications' },
                            { key: 'info', label: 'Info notifications' },
                            { key: 'success', label: 'Success notifications' }
                          ].map(({ key, label }) => (
                            <div key={key} className="flex items-center">
                              <input
                                type="checkbox"
                                id={key}
                                checked={settings.notifications.notificationTypes[key as keyof typeof settings.notifications.notificationTypes]}
                                onChange={(e) => setSettings(prev => ({
                                  ...prev,
                                  notifications: {
                                    ...prev.notifications,
                                    notificationTypes: {
                                      ...prev.notifications.notificationTypes,
                                      [key]: e.target.checked
                                    }
                                  }
                                }))}
                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                              />
                              <label htmlFor={key} className="ml-2 text-sm text-gray-700">{label}</label>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Advanced Settings */}
            {activeTab === 'advanced' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">Advanced Settings</h2>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <label className="text-sm font-medium text-gray-700">Debug Mode</label>
                          <p className="text-xs text-gray-500">Enable detailed logging and debugging</p>
                        </div>
                        <button
                          onClick={() => setSettings(prev => ({
                            ...prev,
                            advanced: { ...prev.advanced, debugMode: !prev.advanced.debugMode }
                          }))}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                            settings.advanced.debugMode ? 'bg-blue-600' : 'bg-gray-200'
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              settings.advanced.debugMode ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div>
                          <label className="text-sm font-medium text-gray-700">Enable Logging</label>
                          <p className="text-xs text-gray-500">Log application events and errors</p>
                        </div>
                        <button
                          onClick={() => setSettings(prev => ({
                            ...prev,
                            advanced: { ...prev.advanced, enableLogging: !prev.advanced.enableLogging }
                          }))}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                            settings.advanced.enableLogging ? 'bg-blue-600' : 'bg-gray-200'
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              settings.advanced.enableLogging ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </div>
                      
                      {settings.advanced.enableLogging && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Log Level
                          </label>
                          <select
                            value={settings.advanced.logLevel}
                            onChange={(e) => setSettings(prev => ({
                              ...prev,
                              advanced: { ...prev.advanced, logLevel: e.target.value as 'error' | 'warn' | 'info' | 'debug' }
                            }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          >
                            <option value="error">Error</option>
                            <option value="warn">Warning</option>
                            <option value="info">Info</option>
                            <option value="debug">Debug</option>
                          </select>
                        </div>
                      )}
                    </div>
                    
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <label className="text-sm font-medium text-gray-700">Enable Telemetry</label>
                          <p className="text-xs text-gray-500">Send usage data to improve the application</p>
                        </div>
                        <button
                          onClick={() => setSettings(prev => ({
                            ...prev,
                            advanced: { ...prev.advanced, enableTelemetry: !prev.advanced.enableTelemetry }
                          }))}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                            settings.advanced.enableTelemetry ? 'bg-blue-600' : 'bg-gray-200'
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              settings.advanced.enableTelemetry ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div>
                          <label className="text-sm font-medium text-gray-700">Auto Update</label>
                          <p className="text-xs text-gray-500">Automatically check for updates</p>
                        </div>
                        <button
                          onClick={() => setSettings(prev => ({
                            ...prev,
                            advanced: { ...prev.advanced, autoUpdate: !prev.advanced.autoUpdate }
                          }))}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                            settings.advanced.autoUpdate ? 'bg-blue-600' : 'bg-gray-200'
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              settings.advanced.autoUpdate ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </div>
                      
                      <div className="bg-gray-50 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Info className="w-4 h-4 text-blue-600" />
                          <span className="text-sm font-medium text-gray-700">Import/Export Settings</span>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={exportSettings}
                            className="flex items-center gap-2 px-3 py-1.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                          >
                            <Download className="w-3 h-3" />
                            Export
                          </button>
                          <label className="flex items-center gap-2 px-3 py-1.5 text-xs bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors cursor-pointer">
                            <Upload className="w-3 h-3" />
                            Import
                            <input
                              type="file"
                              accept=".json"
                              onChange={importSettings}
                              className="hidden"
                            />
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
