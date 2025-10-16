/**
 * Store global de l'application RAG Assistant
 * 
 * Gestionnaire d'état centralisé utilisant React Context pour maintenir
 * la configuration, les messages, les documents et l'état de l'interface
 * à travers toute l'application.
 */

import React, { useState, createContext, useContext } from 'react';
import { ChatMessage, AppConfig, StatusResponse } from '../types';

// Interface pour l'état du store
interface StoreState {
  /**
   * État global de l'application RAG.
   * 
   * Centralise toutes les données partagées entre composants
   * incluant la configuration, messages et état interface.
   */
  config: AppConfig;  // Configuration utilisateur
  messages: ChatMessage[];  // Messages de la conversation active
  processedDocuments: string[];  // Documents indexés
  status: StatusResponse | null;  // Statut des services externes
  isLoading: boolean;  // État de chargement global
  sidebarOpen: boolean;  // État d'ouverture de la barre latérale
  currentConversationId: string | null;  // ID de conversation active
  conversationsRefreshTrigger: number;  // Trigger pour rafraîchir les conversations
}

// Interface pour les actions du store
interface StoreActions {
  /**
   * Actions disponibles pour modifier l'état du store.
   * 
   * Méthodes pour mettre à jour les différentes parties
   * de l'état global de l'application.
   */
  updateConfig: (config: Partial<AppConfig>) => void;  // Mise à jour configuration
  addMessage: (message: ChatMessage) => void;  // Ajout message
  clearMessages: () => void;  // Effacement messages
  setMessages: (messages: ChatMessage[]) => void;  // Définition messages
  addDocument: (filename: string) => void;  // Ajout document
  clearDocuments: () => void;  // Effacement documents
  setStatus: (status: StatusResponse) => void;  // Mise à jour statut
  setLoading: (loading: boolean) => void;  // Contrôle chargement
  setSidebarOpen: (open: boolean) => void;  // Contrôle sidebar
  setCurrentConversationId: (id: string | null) => void;  // Conversation active
  refreshConversations: () => void;  // Rafraîchir conversations
}

// Interface combinée du store
interface Store extends StoreState, StoreActions {}

// État par défaut du store
const defaultState: StoreState = {
  config: {
    // Configuration par défaut avec clés API pré-configurées
    qdrant_api_key: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhY2Nlc3MiOiJtIn0.gD1elgW9H120V6C8cvy75S6DrG99JORECGuGHF3zNc4",
    qdrant_url: "https://23ab1818-07f7-4bd5-998b-ba6c9475e6dd.us-east4-0.gcp.cloud.qdrant.io:6333",
    model_version: "deepseek-r1:1.5b",
    similarity_threshold: 0.7,
    use_web_search: false,
    rag_enabled: true,
    force_web_search: false,
    dark_mode: false,
    openrouter_api_key: undefined,
    openrouter_model: undefined,
    ollama_model: undefined,
    provider: 'ollama',
  },
  messages: [],
  processedDocuments: [],
  status: null,
  isLoading: false,
  sidebarOpen: true,
  currentConversationId: null,
  conversationsRefreshTrigger: 0,
};

// Context
const StoreContext = createContext<Store | null>(null);

// Provider component
export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<StoreState>(() => {
    // Load from localStorage on initialization
    try {
      const savedConfig = localStorage.getItem('deepseek-rag-config');
      const savedDocuments = localStorage.getItem('deepseek-rag-documents');
      const savedSidebar = localStorage.getItem('deepseek-rag-sidebar');

      return {
        ...defaultState,
        config: savedConfig ? { ...defaultState.config, ...JSON.parse(savedConfig) } : defaultState.config,
        processedDocuments: savedDocuments ? JSON.parse(savedDocuments) : defaultState.processedDocuments,
        sidebarOpen: savedSidebar ? JSON.parse(savedSidebar) : defaultState.sidebarOpen,
      };
    } catch (error) {
      console.error('Failed to load from localStorage:', error);
      return defaultState;
    }
  });

  // Actions
  const updateConfig = (newConfig: Partial<AppConfig>) => {
    const updatedConfig = { ...state.config, ...newConfig };
    setState(prev => ({ ...prev, config: updatedConfig }));
    localStorage.setItem('deepseek-rag-config', JSON.stringify(updatedConfig));
  };

  const addMessage = (message: ChatMessage) => {
    setState(prev => ({ ...prev, messages: [...prev.messages, message] }));
  };

  const clearMessages = () => {
    setState(prev => ({ ...prev, messages: [] }));
  };

  const setMessages = (messages: ChatMessage[]) => {
    setState(prev => ({ ...prev, messages }));
  };

  const addDocument = (filename: string) => {
    const updatedDocs = [...state.processedDocuments, filename];
    setState(prev => ({ ...prev, processedDocuments: updatedDocs }));
    localStorage.setItem('deepseek-rag-documents', JSON.stringify(updatedDocs));
  };

  const clearDocuments = () => {
    setState(prev => ({ ...prev, processedDocuments: [] }));
    localStorage.removeItem('deepseek-rag-documents');
  };

  const setStatus = (status: StatusResponse) => {
    setState(prev => ({ ...prev, status }));
  };

  const setLoading = (loading: boolean) => {
    setState(prev => ({ ...prev, isLoading: loading }));
  };

  const setSidebarOpen = (open: boolean) => {
    setState(prev => ({ ...prev, sidebarOpen: open }));
    localStorage.setItem('deepseek-rag-sidebar', JSON.stringify(open));
  };

  const setCurrentConversationId = (id: string | null) => {
    setState(prev => ({ ...prev, currentConversationId: id }));
  };

  const refreshConversations = () => {
    setState(prev => ({ ...prev, conversationsRefreshTrigger: prev.conversationsRefreshTrigger + 1 }));
  };

  const store: Store = {
    ...state,
    updateConfig,
    addMessage,
    clearMessages,
    setMessages,
    addDocument,
    clearDocuments,
    setStatus,
    setLoading,
    setSidebarOpen,
    setCurrentConversationId,
    refreshConversations,
  };

  return React.createElement(StoreContext.Provider, { value: store }, children);
};

// Hook to use the store
export const useAppStore = (): Store => {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error('useAppStore must be used within a StoreProvider');
  }
  return context;
};
