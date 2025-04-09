"use client"
import { FC, useRef, useEffect } from "react";
import { StatusLogEntry } from "../types/index2";

interface StatusLogProps {
  logs: StatusLogEntry[];
}

const StatusLog: FC<StatusLogProps> = ({ logs }) => {
  const logContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to the bottom when new logs are added
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div className="bg-white rounded-lg shadow-md p-5 space-y-4">
      <h2 className="text-lg font-semibold text-dark flex items-center">
        <i className="fas fa-heartbeat text-primary mr-2"></i>
        Status Log
      </h2>
      <div 
        ref={logContainerRef}
        id="status-log" 
        className="h-64 overflow-y-auto border border-gray-200 rounded-md p-3 bg-gray-50 space-y-2 text-sm font-mono"
      >
        {logs.map((log, index) => (
          <div 
            key={index} 
            className={`status-entry px-2 py-1 rounded ${getStatusClass(log.type)}`}
          >
            <span className="text-gray-500">[{log.timestamp}]</span>{' '}
            <span className={getTextColorClass(log.type)}>{log.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

function getStatusClass(type: string): string {
  switch (type) {
    case 'info':
      return 'bg-gray-100';
    case 'success':
      return 'bg-green-50';
    case 'error':
      return 'bg-red-50';
    case 'connection':
    case 'generating':
    default:
      return 'bg-blue-50';
  }
}

function getTextColorClass(type: string): string {
  switch (type) {
    case 'success':
      return 'text-success';
    case 'error':
      return 'text-error';
    case 'connection':
    case 'generating':
      return 'text-primary';
    default:
      return '';
  }
}

export default StatusLog;
