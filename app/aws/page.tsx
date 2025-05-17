'use client'
import React from 'react';

const AwsPage = () => {
  return (
    <div className="pt-8">
      <h1 className="text-2xl font-bold mb-2">Services Overview</h1>
      <p className="text-gray-500 mb-8">Monitor all your AWS services from one central dashboard</p>
      <div className="grid grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow border p-6">
          <div className="font-semibold text-lg mb-1">S3 Buckets</div>
          <div className="text-gray-500 text-sm">Manage your S3 storage buckets</div>
        </div>
        <div className="bg-white rounded-xl shadow border p-6">
          <div className="font-semibold text-lg mb-1">DynamoDB Tables</div>
          <div className="text-gray-500 text-sm">Manage your DynamoDB tables</div>
        </div>
        <div className="bg-white rounded-xl shadow border p-6">
          <div className="font-semibold text-lg mb-1">Lambda Functions</div>
          <div className="text-gray-500 text-sm">Manage your Lambda functions</div>
        </div>
        <div className="bg-white rounded-xl shadow border p-6">
          <div className="font-semibold text-lg mb-1">API Gateway</div>
          <div className="text-gray-500 text-sm">Manage your API endpoints</div>
        </div>
        <div className="bg-white rounded-xl shadow border p-6">
          <div className="font-semibold text-lg mb-1">IAM Roles</div>
          <div className="text-gray-500 text-sm">Manage your IAM roles and policies</div>
        </div>
      </div>
    </div>
  );
};

export default AwsPage; 