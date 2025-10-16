/**
 * Services API pour l'application RAG Assistant
 * 
 * Module centralisé gérant toutes les communications avec le backend.
 * Organise les appels API par domaine fonctionnel (chat, configuration,
 * documents, Ollama) avec gestion d'erreurs et types TypeScript.
 */

import axios from 'axios';
import { ChatRequest, ChatResponse, ConfigRequest, StatusResponse, DocumentResponse } from '../types';

// URL de base de l'API backend
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

// Instance Axios configurée pour l'API
/**
 * Client HTTP configuré pour communiquer avec le backend RAG.
 * 
 * Utilise Axios avec configuration par défaut incluant les headers
 * JSON et l'URL de base du serveur backend.
 */
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// API pour les fonctionnalités de chat
export const chatAPI = {
  /**
   * Envoie un message à l'assistant RAG.
   * 
   * Transmet une requête de chat au backend avec tous les paramètres
   * de configuration pour obtenir une réponse enrichie.
   */
  sendMessage: async (request: ChatRequest): Promise<ChatResponse> => {
    const response = await api.post('/api/chat', request);
    return response.data;
  },
};

// API pour la configuration du système
export const configAPI = {
  /**
   * Met à jour la configuration du système RAG.
   * 
   * Envoie les nouveaux paramètres de configuration au backend
   * pour modification à chaud sans redémarrage.
   */
  updateConfig: async (config: ConfigRequest): Promise<void> => {
    await api.post('/api/config', config);
  },
  
  /**
   * Récupère le statut de tous les services connectés.
   * 
   * Interroge le backend pour obtenir l'état de santé
   * des services externes (Ollama, Qdrant, etc.).
   */
  getStatus: async (): Promise<StatusResponse> => {
    const response = await api.get('/api/status');
    return response.data;
  },
};

// API pour la gestion des documents
export const documentsAPI = {
  /**
   * Télécharge et indexe un fichier PDF.
   * 
   * Envoie un fichier PDF au backend pour extraction de contenu,
   * segmentation et indexation dans la base vectorielle.
   */
  uploadPDF: async (file: File): Promise<DocumentResponse> => {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await api.post('/api/upload-pdf', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
  
  /**
   * Ajoute et indexe une URL web.
   * 
   * Demande au backend d'extraire le contenu d'une page web
   * et de l'indexer dans la base vectorielle RAG.
   */
  addURL: async (url: string): Promise<DocumentResponse> => {
    const response = await api.post(`/api/add-url?url=${encodeURIComponent(url)}`);
    return response.data;
  },
  
  /**
   * Récupère la liste des documents indexés.
   * 
   * Obtient la liste de tous les documents actuellement
   * disponibles dans la base vectorielle.
   */
  getDocuments: async (): Promise<string[]> => {
    const response = await api.get('/api/documents');
    return response.data;
  },
  
  /**
   * Supprime tous les documents indexés.
   * 
   * Vide complètement la base vectorielle en supprimant
   * tous les documents précédemment indexés.
   */
  clearDocuments: async (): Promise<void> => {
    await api.delete('/api/documents');
  },
  
  /**
   * Supprime l'historique des conversations.
   * 
   * Efface la mémoire conversationnelle du système
   * pour repartir sur une session vierge.
   */
  clearChatHistory: async (): Promise<void> => {
    await api.delete('/api/chat/history');
  },
};

// API pour l'intégration Ollama
export const ollamaAPI = {
  /**
   * Récupère la liste des modèles Ollama disponibles.
   * 
   * Interroge le serveur Ollama local pour obtenir
   * tous les modèles installés et utilisables.
   */
  getModels: async (): Promise<{ models: string[] }> => {
    const response = await api.get('/api/ollama/models');
    return response.data;
  },
  
  /**
   * Vérifie le statut du serveur Ollama.
   * 
   * Teste la connectivité avec le serveur Ollama local
   * pour déterminer sa disponibilité.
   */
  checkStatus: async (): Promise<{ running: boolean }> => {
    const response = await api.get('/api/ollama/status');
    return response.data;
  },
};
