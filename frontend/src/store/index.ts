import { ChatMessage, AppConfig, StatusResponse } from '../types';

// Gestionnaire d'état simple sans dépendances externes pour le moment
class Store {
  private listeners: Set<() => void> = new Set();
  
  public state = {
    // Configuration
    config: {
      qdrant_api_key: "YOUR_API_HERE",
      qdrant_url: "YOUR_URL_HERE",
      model_version: "deepseek-r1:1.5b",
      similarity_threshold: 0.7,
      use_web_search: false,
      rag_enabled: true,
      force_web_search: false,
      dark_mode: false,
  openrouter_api_key: undefined,
  openrouter_model: undefined,
    } as AppConfig,
    
    // Chat
    messages: [] as ChatMessage[],
    
    // Documents
    processedDocuments: [] as string[],
    
    // Status
    status: null as StatusResponse | null,
    
    // UI State
    isLoading: false,
    sidebarOpen: true,
  };

  subscribe = (listener: () => void): () => void => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  private notify = () => {
    this.listeners.forEach(listener => listener());
  };

  updateConfig = (newConfig: Partial<AppConfig>) => {
    this.state.config = { ...this.state.config, ...newConfig };
    this.notify();
    // Save to localStorage
    localStorage.setItem('deepseek-rag-config', JSON.stringify(this.state.config));
  };

  addMessage = (message: ChatMessage) => {
    this.state.messages = [...this.state.messages, message];
    this.notify();
  };

  clearMessages = () => {
    this.state.messages = [];
    this.notify();
  };

  addDocument = (filename: string) => {
    this.state.processedDocuments = [...this.state.processedDocuments, filename];
    this.notify();
    localStorage.setItem('deepseek-rag-documents', JSON.stringify(this.state.processedDocuments));
  };

  clearDocuments = () => {
    this.state.processedDocuments = [];
    this.notify();
    localStorage.removeItem('deepseek-rag-documents');
  };

  setStatus = (status: StatusResponse) => {
    this.state.status = status;
    this.notify();
  };

  setLoading = (loading: boolean) => {
    this.state.isLoading = loading;
    this.notify();
  };

  setSidebarOpen = (open: boolean) => {
    this.state.sidebarOpen = open;
    this.notify();
    localStorage.setItem('deepseek-rag-sidebar', JSON.stringify(open));
  };

  // Load from localStorage on initialization
  init = () => {
    try {
      const savedConfig = localStorage.getItem('deepseek-rag-config');
      if (savedConfig) {
        this.state.config = { ...this.state.config, ...JSON.parse(savedConfig) };
      }

      const savedDocuments = localStorage.getItem('deepseek-rag-documents');
      if (savedDocuments) {
        this.state.processedDocuments = JSON.parse(savedDocuments);
      }

      const savedSidebar = localStorage.getItem('deepseek-rag-sidebar');
      if (savedSidebar) {
        this.state.sidebarOpen = JSON.parse(savedSidebar);
      }
    } catch (error) {
      console.error('Failed to load from localStorage:', error);
    }
  };
}

const store = new Store();
store.init();

// Custom hook to use the store
import { useState, useEffect } from 'react';

export const useAppStore = () => {
  const [, forceUpdate] = useState({});

  useEffect(() => {
    const unsubscribe = store.subscribe(() => {
      forceUpdate({});
    });
    return () => {
      unsubscribe();
    };
  }, []);

  return {
    config: store.state.config,
    updateConfig: store.updateConfig,
    messages: store.state.messages,
    addMessage: store.addMessage,
    clearMessages: store.clearMessages,
    processedDocuments: store.state.processedDocuments,
    addDocument: store.addDocument,
    clearDocuments: store.clearDocuments,
    status: store.state.status,
    setStatus: store.setStatus,
    isLoading: store.state.isLoading,
    setLoading: store.setLoading,
    sidebarOpen: store.state.sidebarOpen,
    setSidebarOpen: store.setSidebarOpen,
  };
};
