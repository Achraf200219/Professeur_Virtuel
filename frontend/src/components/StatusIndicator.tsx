import React, { useEffect } from 'react';
import { useAppStore } from '../store/context';
import { configAPI } from '../services/api';
import { CheckCircle, XCircle, AlertCircle } from 'lucide-react';

export const StatusIndicator: React.FC = () => {
  const { status, setStatus } = useAppStore();

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const statusData = await configAPI.getStatus();
        setStatus(statusData);
      } catch (error) {
        console.error('Failed to check status:', error);
      }
    };

    checkStatus();
    const interval = setInterval(checkStatus, 30000); // Vérifier toutes les 30 secondes
    
    return () => clearInterval(interval);
  }, [setStatus]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected':
        return <CheckCircle size={16} className="text-green-500" />;
      case 'disconnected':
        return <XCircle size={16} className="text-red-500" />;
      case 'not_configured':
        return <AlertCircle size={16} className="text-yellow-500" />;
      default:
        return <AlertCircle size={16} className="text-gray-500" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'connected':
        return 'Connecté';
      case 'disconnected':
        return 'Déconnecté';
      case 'not_configured':
        return 'Not Configured';
      case 'configured':
        return 'Configured';
      default:
        return 'Unknown';
    }
  };

  if (!status) {
    return (
      <div className="card p-3">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
          🔌 Service Status
        </h3>
        <div className="text-sm text-gray-500 dark:text-gray-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="card p-3">
      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
        🔌 Service Status
      </h3>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600 dark:text-gray-400">Ollama</span>
          <div className="flex items-center space-x-1">
            {getStatusIcon(status.ollama_status)}
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {getStatusText(status.ollama_status)}
            </span>
          </div>
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600 dark:text-gray-400">Qdrant</span>
          <div className="flex items-center space-x-1">
            {getStatusIcon(status.qdrant_status)}
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {getStatusText(status.qdrant_status)}
            </span>
          </div>
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600 dark:text-gray-400">Web Search</span>
          <div className="flex items-center space-x-1">
            {getStatusIcon(status.web_search_status)}
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {getStatusText(status.web_search_status)}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600 dark:text-gray-400">OpenRouter</span>
          <div className="flex items-center space-x-1">
            {getStatusIcon(status.openrouter_status)}
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {getStatusText(status.openrouter_status)}
            </span>
          </div>
        </div>
        
        {status.model_available && (
          <div className="mt-2 text-xs text-green-600 dark:text-green-400">
            ✅ Model ready
          </div>
        )}
      </div>
    </div>
  );
};
