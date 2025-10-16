/**
 * Définitions TypeScript pour l'application RAG Assistant
 * 
 * Ce fichier centralise toutes les interfaces et types utilisés
 * dans l'application frontend pour garantir la cohérence des données
 * échangées avec le backend et la sécurité de type.
 */

// Interface pour un message de conversation
export interface ChatMessage {
  /**
   * Représente un message dans une conversation RAG.
   * 
   * Contient le contenu du message, les métadonnées sur les sources
   * utilisées et les informations de contexte pour l'affichage.
   */
  role: 'user' | 'assistant';  // Rôle du message dans la conversation
  content: string;  // Contenu textuel du message
  sources?: Source[];  // Sources documentaires référencées
  thinking_process?: string;  // Processus de raisonnement visible
  search_type?: 'document' | 'web' | 'none';  // Type de recherche effectuée
  timestamp?: string;  // Horodatage du message
  id?: string;  // Identifiant unique du message
}

// Interface pour les requêtes de chat
export interface ChatRequest {
  /**
   * Paramètres d'une requête de conversation vers l'API.
   * 
   * Définit tous les paramètres nécessaires pour traiter
   * une demande utilisateur avec les options RAG appropriées.
   */
  message: string;  // Message de l'utilisateur
  rag_enabled: boolean;  // Activation du mode RAG
  force_web_search: boolean;  // Forcer la recherche web
  model_version: string;  // Version du modèle à utiliser
  similarity_threshold: number;  // Seuil de similarité vectorielle
  use_web_search: boolean;  // Autoriser recherche web de secours
  openrouter_model?: string;  // Modèle OpenRouter spécifique
  ollama_model?: string;  // Modèle Ollama spécifique
  provider: 'openrouter' | 'ollama';  // Fournisseur de modèle
}

// Interface pour les réponses de chat
export interface ChatResponse {
  /**
   * Structure de réponse reçue de l'API de chat.
   * 
   * Contient la réponse générée et les métadonnées
   * sur le processus de génération et les sources.
   */
  response: string;  // Réponse générée par le modèle
  sources?: Source[];  // Sources documentaires utilisées
  thinking_process?: string;  // Processus de raisonnement
  search_type?: 'document' | 'web' | 'none';  // Type de recherche
}

// Interface pour les sources documentaires
export interface Source {
  /**
   * Représente une source documentaire référencée.
   * 
   * Contient les métadonnées d'identification et le contenu
   * d'une source utilisée pour enrichir la réponse.
   */
  id: number;  // Identifiant unique de la source
  type: string;  // Type de source (PDF, web, etc.)
  name: string;  // Nom ou titre de la source
  content: string;  // Extrait de contenu pertinent
}

// Interface pour les requêtes de configuration
export interface ConfigRequest {
  /**
   * Paramètres de configuration du système RAG.
   * 
   * Permet la mise à jour des clés API, paramètres de recherche
   * et configuration des fournisseurs de modèles.
   */
  qdrant_api_key?: string;  // Clé API Qdrant
  qdrant_url?: string;  // URL du cluster Qdrant
  model_version?: string;  // Version du modèle par défaut
  similarity_threshold?: number;  // Seuil de similarité vectorielle
  use_web_search?: boolean;  // Activation recherche web globale
  openrouter_api_key?: string;  // Clé API OpenRouter
  openrouter_model?: string;  // Modèle OpenRouter sélectionné
  ollama_model?: string;  // Modèle Ollama sélectionné
  provider?: 'openrouter' | 'ollama';  // Fournisseur actif
}

// Interface pour les réponses de statut
export interface StatusResponse {
  /**
   * État de santé des services externes.
   * 
   * Fournit le statut de connectivité de tous les services
   * utilisés par l'application RAG.
   */
  ollama_status: string;  // État du serveur Ollama
  qdrant_status: string;  // État de la base Qdrant
  web_search_status: string;  // État recherche web
  openrouter_status: string;  // État API OpenRouter
  model_available: boolean;  // Disponibilité du modèle
}

// Interface pour les réponses de traitement de documents
export interface DocumentResponse {
  /**
   * Confirmation de traitement d'un document.
   * 
   * Retourne les informations sur l'indexation réussie
   * d'un document dans la base vectorielle.
   */
  message: string;  // Message de confirmation
  filename: string;  // Nom du fichier traité
  chunks_added: number;  // Nombre de segments indexés
}

// Interface pour la configuration de l'application
export interface AppConfig {
  /**
   * Configuration globale de l'application RAG.
   * 
   * Centralise tous les paramètres de configuration utilisateur
   * incluant les clés API, préférences et paramètres de recherche.
   */
  qdrant_api_key: string;  // Clé API base vectorielle
  qdrant_url: string;  // URL du cluster Qdrant
  model_version: string;  // Version du modèle par défaut
  similarity_threshold: number;  // Seuil de recherche vectorielle
  use_web_search: boolean;  // Recherche web de secours
  rag_enabled: boolean;  // Mode RAG global activé
  force_web_search: boolean;  // Forcer recherche web
  dark_mode: boolean;  // Mode sombre interface
  openrouter_api_key?: string;  // Clé API OpenRouter
  openrouter_model?: string;  // Modèle OpenRouter actif
  ollama_model?: string;  // Modèle Ollama actif
  provider: 'openrouter' | 'ollama';  // Fournisseur sélectionné
}

// Interface pour les utilisateurs
export interface User {
  /**
   * Données utilisateur depuis Firebase Auth.
   * 
   * Contient les informations d'identification et profil
   * de l'utilisateur connecté.
   */
  id: string;  // Identifiant unique utilisateur
  email: string;  // Adresse email
  firstName: string;  // Prénom
  lastName: string;  // Nom de famille
  displayName?: string;  // Nom d'affichage
  createdAt: Date;  // Date de création du compte
}

// Interface pour le profil utilisateur
export interface UserProfile {
  /**
   * Profil utilisateur modifiable.
   * 
   * Données du profil que l'utilisateur peut
   * modifier dans les paramètres.
   */
  firstName: string;  // Prénom modifiable
  lastName: string;  // Nom de famille modifiable
  email: string;  // Adresse email
}

// Interface pour les conversations
export interface Conversation {
  /**
   * Structure d'une conversation complète.
   * 
   * Contient l'historique des messages, métadonnées
   * et configuration spécifique à la conversation.
   */
  id: string;  // Identifiant unique de la conversation
  userId: string;  // ID de l'utilisateur propriétaire
  title: string;  // Titre de la conversation
  messages: ChatMessage[];  // Historique des messages
  createdAt: Date;  // Date de création
  updatedAt: Date;  // Dernière modification
  config?: AppConfig;  // Configuration spécifique
}
