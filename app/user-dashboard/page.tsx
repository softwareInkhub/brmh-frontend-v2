'use client';

import React, { useState } from 'react';
import { Card } from '../components/ui/card';
import { 
  Users, 
  Database, 
  Play, 
  Cloud, 
  Bell,
  ArrowUpRight,
  ArrowDownRight,
  Webhook,
  Code,
  Activity,
  CircleDot,
  UserPlus,
  Shield,
  Key,
  Settings,
  Globe,
  Link as LinkIcon,
  Clock,
  AlertCircle
} from 'lucide-react';
import Link from 'next/link';

type TabType = 'active' | 'history' | 'settings';

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<TabType>('active');

  // Example data - replace with real data from your API
  const stats = {
    activeNamespaces: 24,
    totalExecutions: 1289,
    activeWebhooks: 18,
    activeClients: 45,
    userStats: {
      totalUsers: 1250,
      activeToday: 180,
      pendingInvites: 12,
      recentLogins: 45
    },
    awsServices: {
      lambda: 12,
      dynamodb: 8,
      s3: 15,
      sns: 5
    },
    recentExecutions: [
      { id: 'exec-123', status: 'completed', timestamp: '2024-03-15T10:30:00Z' },
      { id: 'exec-124', status: 'in-progress', timestamp: '2024-03-15T10:28:00Z' },
      { id: 'exec-125', status: 'error', timestamp: '2024-03-15T10:25:00Z' }
    ],
    recentUsers: [
      { id: 'usr-1', name: 'John Doe', status: 'active', lastLogin: '2024-03-15T10:30:00Z', apps: ['App1', 'App2'] },
      { id: 'usr-2', name: 'Jane Smith', status: 'inactive', lastLogin: '2024-03-14T15:20:00Z', apps: ['App3'] },
      { id: 'usr-3', name: 'Mike Johnson', status: 'pending', lastLogin: null, apps: [] }
    ],
    webhooks: {
      active: [
        { id: 'wh-1', name: 'Order Processing', url: 'https://api.example.com/orders', status: 'active', lastTriggered: '2024-03-15T10:30:00Z', successRate: '98%' },
        { id: 'wh-2', name: 'User Signup', url: 'https://api.example.com/users', status: 'active', lastTriggered: '2024-03-15T09:45:00Z', successRate: '100%' },
        { id: 'wh-3', name: 'Payment Gateway', url: 'https://api.example.com/payments', status: 'inactive', lastTriggered: '2024-03-14T15:20:00Z', successRate: '95%' }
      ],
      history: [
        { id: 'evt-1', webhook: 'Order Processing', status: 'success', timestamp: '2024-03-15T10:30:00Z', responseTime: '245ms' },
        { id: 'evt-2', webhook: 'User Signup', status: 'failed', timestamp: '2024-03-15T09:45:00Z', responseTime: '502ms' },
        { id: 'evt-3', webhook: 'Payment Gateway', status: 'success', timestamp: '2024-03-14T15:20:00Z', responseTime: '189ms' }
      ]
    }
  };

  return (
    <div className="space-y-4 ml-20 px-8 pt-8 pb-24">
      {/* Header Section */}
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold text-gray-900">Dashboard Overview</h1>
        <p className="text-sm text-gray-500">Monitor your platform's performance and metrics</p>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 md:gap-4">
        <Card className="p-3 hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs md:text-sm font-medium text-gray-500">Active Namespaces</p>
              <h3 className="text-lg md:text-2xl font-bold text-gray-900 mt-0.5">{stats.activeNamespaces}</h3>
            </div>
            <div className="p-1.5 bg-green-50 rounded-lg">
              <Database className="w-4 h-4 md:w-5 md:h-5 text-green-500" />
            </div>
          </div>
          <div className="flex items-center mt-2 text-[10px] md:text-xs text-green-600">
            <ArrowUpRight className="w-3 h-3 md:w-4 md:h-4" />
            <span>12% increase</span>
          </div>
        </Card>

        <Card className="p-3 hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs md:text-sm font-medium text-gray-500">Total Executions</p>
              <h3 className="text-lg md:text-2xl font-bold text-gray-900 mt-0.5">{stats.totalExecutions}</h3>
            </div>
            <div className="p-1.5 bg-blue-50 rounded-lg">
              <Play className="w-4 h-4 md:w-5 md:h-5 text-blue-500" />
            </div>
          </div>
          <div className="flex items-center mt-2 text-[10px] md:text-xs text-blue-600">
            <Activity className="w-3 h-3 md:w-4 md:h-4" />
            <span className="ml-1">Active now</span>
          </div>
        </Card>

        <Card className="p-3 hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs md:text-sm font-medium text-gray-500">Active Webhooks</p>
              <h3 className="text-lg md:text-2xl font-bold text-gray-900 mt-0.5">{stats.activeWebhooks}</h3>
            </div>
            <div className="p-1.5 bg-purple-50 rounded-lg">
              <Webhook className="w-4 h-4 md:w-5 md:h-5 text-purple-500" />
            </div>
          </div>
          <div className="flex items-center mt-2 text-[10px] md:text-xs text-purple-600">
            <Bell className="w-3 h-3 md:w-4 md:h-4" />
            <span className="ml-1">All operational</span>
          </div>
        </Card>

        <Card className="p-3 hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs md:text-sm font-medium text-gray-500">Active Clients</p>
              <h3 className="text-lg md:text-2xl font-bold text-gray-900 mt-0.5">{stats.activeClients}</h3>
            </div>
            <div className="p-1.5 bg-orange-50 rounded-lg">
              <Users className="w-4 h-4 md:w-5 md:h-5 text-orange-500" />
            </div>
          </div>
          <div className="flex items-center mt-2 text-[10px] md:text-xs text-orange-600">
            <ArrowUpRight className="w-3 h-3 md:w-4 md:h-4" />
            <span>8 new this week</span>
          </div>
        </Card>
      </div>

      {/* User Management Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-6">
        {/* User Stats */}
        <Card className="p-4 md:p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-indigo-500" />
              <h2 className="text-base md:text-lg font-semibold text-gray-900">User Management</h2>
            </div>
            <Link href="/users" className="text-xs md:text-sm text-blue-600 hover:text-blue-700">Manage Users</Link>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-6">
            <div className="bg-indigo-50 rounded-lg p-3">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-indigo-500" />
                <span className="text-xs text-gray-600">Total Users</span>
              </div>
              <p className="text-lg font-semibold text-gray-900 mt-1">{stats.userStats.totalUsers}</p>
            </div>
            
            <div className="bg-green-50 rounded-lg p-3">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-green-500" />
                <span className="text-xs text-gray-600">Active Today</span>
              </div>
              <p className="text-lg font-semibold text-gray-900 mt-1">{stats.userStats.activeToday}</p>
            </div>

            <div className="bg-blue-50 rounded-lg p-3">
              <div className="flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-blue-500" />
                <span className="text-xs text-gray-600">Pending Invites</span>
              </div>
              <p className="text-lg font-semibold text-gray-900 mt-1">{stats.userStats.pendingInvites}</p>
            </div>

            <div className="bg-purple-50 rounded-lg p-3">
              <div className="flex items-center gap-2">
                <Key className="w-4 h-4 text-purple-500" />
                <span className="text-xs text-gray-600">Recent Logins</span>
              </div>
              <p className="text-lg font-semibold text-gray-900 mt-1">{stats.userStats.recentLogins}</p>
            </div>
          </div>

          <div className="space-y-2">
            {stats.recentUsers.map((user) => (
              <div key={user.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${
                    user.status === 'active' ? 'bg-green-500' :
                    user.status === 'inactive' ? 'bg-gray-400' : 'bg-yellow-500'
                  }`} />
                  <span className="text-xs font-medium text-gray-900">{user.name}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] text-gray-500">
                    {user.apps.length} apps
                  </span>
                  <span className="text-[10px] text-gray-500">
                    {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString('en-GB') : 'Never'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Authentication Controls */}
        <Card className="p-4 md:p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Globe className="w-5 h-5 text-blue-500" />
              <h2 className="text-base md:text-lg font-semibold text-gray-900">Authentication Controls</h2>
            </div>
            <Link href="/auth-settings" className="text-xs md:text-sm text-blue-600 hover:text-blue-700">Settings</Link>
          </div>

          <div className="space-y-3">
            <Link href="/users/sso" className="block">
              <div className="group flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Shield className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-900">SSO Configuration</h3>
                    <p className="text-xs text-gray-500">Manage single sign-on settings</p>
                  </div>
                </div>
                <ArrowUpRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600" />
              </div>
            </Link>

            <Link href="/users/api-keys" className="block">
              <div className="group flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <Key className="w-4 h-4 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-900">API Keys</h3>
                    <p className="text-xs text-gray-500">Manage authentication tokens</p>
                  </div>
                </div>
                <ArrowUpRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600" />
              </div>
            </Link>

            <Link href="/users/roles" className="block">
              <div className="group flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <Users className="w-4 h-4 text-green-600" />
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-900">Role Management</h3>
                    <p className="text-xs text-gray-500">Configure user roles and permissions</p>
                  </div>
                </div>
                <ArrowUpRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600" />
              </div>
            </Link>

            <Link href="/users/audit" className="block">
              <div className="group flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <Activity className="w-4 h-4 text-orange-600" />
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-900">Audit Logs</h3>
                    <p className="text-xs text-gray-500">View authentication activity</p>
                  </div>
                </div>
                <ArrowUpRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600" />
              </div>
            </Link>
          </div>
        </Card>
      </div>

      {/* Webhook Management Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Webhook className="w-5 h-5 text-purple-500" />
              <h2 className="text-lg font-semibold text-gray-900">Webhook Management</h2>
            </div>
            <Link href="/webhooks/new" className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500">
              <UserPlus className="w-4 h-4 mr-2" />
              New Webhook
            </Link>
          </div>

          {/* Tabs */}
          <div className="flex space-x-1 mt-4">
            <button
              onClick={() => setActiveTab('active')}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                activeTab === 'active'
                  ? 'bg-purple-100 text-purple-700'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
              }`}
            >
              Active Webhooks
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                activeTab === 'history'
                  ? 'bg-purple-100 text-purple-700'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
              }`}
            >
              History
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                activeTab === 'settings'
                  ? 'bg-purple-100 text-purple-700'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
              }`}
            >
              Settings
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div className="p-4">
          {activeTab === 'active' && (
            <div className="grid gap-3">
              {stats.webhooks.active.map((webhook) => (
                <div key={webhook.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className="flex items-start gap-3 mb-2 sm:mb-0">
                    <div className={`p-2 rounded-lg ${
                      webhook.status === 'active' ? 'bg-green-100' : 'bg-gray-200'
                    }`}>
                      <Webhook className={`w-4 h-4 ${
                        webhook.status === 'active' ? 'text-green-600' : 'text-gray-500'
                      }`} />
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-gray-900">{webhook.name}</h3>
                      <p className="text-xs text-gray-500 mt-0.5">{webhook.url}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-xs">
                    <span className="flex items-center text-gray-500">
                      <Clock className="w-3 h-3 mr-1" />
                      Last: {new Date(webhook.lastTriggered).toLocaleTimeString('en-GB')}
                    </span>
                    <span className="flex items-center text-green-600">
                      <Activity className="w-3 h-3 mr-1" />
                      {webhook.successRate}
                    </span>
                    <button className="p-1.5 text-gray-400 hover:text-gray-600">
                      <Settings className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'history' && (
            <div className="overflow-hidden">
              <div className="grid grid-cols-4 gap-2 px-4 py-2 text-xs font-medium text-gray-500 border-b border-gray-200">
                <div>WEBHOOK</div>
                <div>STATUS</div>
                <div>TIME</div>
                <div>RESPONSE</div>
              </div>
              <div className="divide-y divide-gray-100">
                {stats.webhooks.history.map((event) => (
                  <div key={event.id} className="grid grid-cols-4 gap-2 px-4 py-3 text-sm hover:bg-gray-50">
                    <div className="text-gray-900 font-medium text-xs">
                      {event.webhook}
                    </div>
                    <div>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs ${
                        event.status === 'success' 
                          ? 'bg-green-50 text-green-700'
                          : 'bg-red-50 text-red-700'
                      }`}>
                        {event.status}
                      </span>
                    </div>
                    <div className="text-gray-500 text-xs">
                      {new Date(event.timestamp).toLocaleString('en-GB', {
                        month: 'numeric',
                        day: 'numeric',
                        year: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                        hour12: true
                      })}
                    </div>
                    <div className="text-gray-500 text-xs">
                      {event.responseTime}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="grid gap-4">
              <Card className="p-4">
                <h3 className="text-sm font-medium text-gray-900 mb-2">Global Settings</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-600">Retry Failed Webhooks</span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                    </label>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-600">Timeout Duration</span>
                    </div>
                    <select className="text-sm border border-gray-300 rounded-lg px-3 py-1.5">
                      <option>30 seconds</option>
                      <option>1 minute</option>
                      <option>5 minutes</option>
                    </select>
                  </div>
                </div>
              </Card>
              
              <Card className="p-4">
                <h3 className="text-sm font-medium text-gray-900 mb-2">Security</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-600">HTTPS Only</span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" checked className="sr-only peer" />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                    </label>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Key className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-600">Authentication</span>
                    </div>
                    <select className="text-sm border border-gray-300 rounded-lg px-3 py-1.5">
                      <option>Basic Auth</option>
                      <option>Bearer Token</option>
                      <option>API Key</option>
                    </select>
                  </div>
                </div>
              </Card>
            </div>
          )}
        </div>
      </div>

      {/* AWS Services & Recent Activity Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-6">
        {/* AWS Services Overview */}
        <Card className="p-4 md:p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base md:text-lg font-semibold text-gray-900">AWS Services</h2>
            <Link href="/aws-services" className="text-xs md:text-sm text-blue-600 hover:text-blue-700">View all</Link>
          </div>
          <div className="space-y-2 md:space-y-4">
            <div className="flex items-center justify-between p-2 md:p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2 md:gap-3">
                <Cloud className="w-4 h-4 md:w-5 md:h-5 text-blue-500" />
                <span className="text-xs md:text-sm font-medium">Lambda Functions</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs md:text-sm font-semibold">{stats.awsServices.lambda}</span>
                <CircleDot className="w-2 h-2 md:w-3 md:h-3 text-green-500" />
              </div>
            </div>
            <div className="flex items-center justify-between p-2 md:p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2 md:gap-3">
                <Database className="w-4 h-4 md:w-5 md:h-5 text-purple-500" />
                <span className="text-xs md:text-sm font-medium">DynamoDB Tables</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs md:text-sm font-semibold">{stats.awsServices.dynamodb}</span>
                <CircleDot className="w-2 h-2 md:w-3 md:h-3 text-green-500" />
              </div>
            </div>
            <div className="flex items-center justify-between p-2 md:p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2 md:gap-3">
                <Code className="w-4 h-4 md:w-5 md:h-5 text-orange-500" />
                <span className="text-xs md:text-sm font-medium">S3 Buckets</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs md:text-sm font-semibold">{stats.awsServices.s3}</span>
                <CircleDot className="w-2 h-2 md:w-3 md:h-3 text-green-500" />
              </div>
            </div>
          </div>
        </Card>

        {/* Recent Executions */}
        <Card className="p-4 md:p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base md:text-lg font-semibold text-gray-900">Recent Executions</h2>
            <Link href="/executions" className="text-xs md:text-sm text-blue-600 hover:text-blue-700">View all</Link>
          </div>
          <div className="space-y-2 md:space-y-4">
            {stats.recentExecutions.map((execution) => (
              <div key={execution.id} className="flex items-center justify-between p-2 md:p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2 md:gap-3">
                  <div className={`w-1.5 h-1.5 md:w-2 md:h-2 rounded-full ${
                    execution.status === 'completed' ? 'bg-green-500' :
                    execution.status === 'in-progress' ? 'bg-blue-500' : 'bg-red-500'
                  }`} />
                  <span className="text-xs md:text-sm font-medium">{execution.id}</span>
                </div>
                <div className="flex items-center gap-2 md:gap-4">
                  <span className="text-[10px] md:text-xs text-gray-500">
                    {new Date(execution.timestamp).toLocaleTimeString('en-GB')}
                  </span>
                  <span className={`text-[10px] md:text-xs font-medium ${
                    execution.status === 'completed' ? 'text-green-600' :
                    execution.status === 'in-progress' ? 'text-blue-600' : 'text-red-600'
                  }`}>
                    {execution.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Quick Actions Section */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4">
        <Link href="/users" className="group">
          <Card className="p-3 md:p-4 hover:shadow-md transition-all group-hover:border-indigo-200">
            <div className="flex items-center gap-2 md:gap-3">
              <div className="p-1.5 md:p-2 bg-indigo-50 rounded-lg">
                <Users className="w-4 h-4 md:w-5 md:h-5 text-indigo-500" />
              </div>
              <div>
                <h3 className="text-xs md:text-sm font-medium text-gray-900">User Management</h3>
                <p className="text-[10px] md:text-xs text-gray-500 mt-0.5 md:mt-1">Manage users</p>
              </div>
            </div>
          </Card>
        </Link>

        <Link href="/namespace" className="group">
          <Card className="p-3 md:p-4 hover:shadow-md transition-all group-hover:border-blue-200">
            <div className="flex items-center gap-2 md:gap-3">
              <div className="p-1.5 md:p-2 bg-blue-50 rounded-lg">
                <Database className="w-4 h-4 md:w-5 md:h-5 text-blue-500" />
              </div>
              <div>
                <h3 className="text-xs md:text-sm font-medium text-gray-900">Manage Namespaces</h3>
                <p className="text-[10px] md:text-xs text-gray-500 mt-0.5 md:mt-1">Configure namespaces</p>
              </div>
            </div>
          </Card>
        </Link>

        <Link href="/executions" className="group">
          <Card className="p-3 md:p-4 hover:shadow-md transition-all group-hover:border-green-200">
            <div className="flex items-center gap-2 md:gap-3">
              <div className="p-1.5 md:p-2 bg-green-50 rounded-lg">
                <Activity className="w-4 h-4 md:w-5 md:h-5 text-green-500" />
              </div>
              <div>
                <h3 className="text-xs md:text-sm font-medium text-gray-900">View Executions</h3>
                <p className="text-[10px] md:text-xs text-gray-500 mt-0.5 md:mt-1">Monitor pipeline</p>
              </div>
            </div>
          </Card>
        </Link>

        <Link href="/aws-services" className="group col-span-2 md:col-span-1">
          <Card className="p-3 md:p-4 hover:shadow-md transition-all group-hover:border-purple-200">
            <div className="flex items-center gap-2 md:gap-3">
              <div className="p-1.5 md:p-2 bg-purple-50 rounded-lg">
                <Cloud className="w-4 h-4 md:w-5 md:h-5 text-purple-500" />
              </div>
              <div>
                <h3 className="text-xs md:text-sm font-medium text-gray-900">AWS Services</h3>
                <p className="text-[10px] md:text-xs text-gray-500 mt-0.5 md:mt-1">Manage resources</p>
              </div>
            </div>
          </Card>
        </Link>
      </div>
    </div>
  );
}
