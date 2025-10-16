"""
Modèles de données pour l'API de chat RAG

Définit les structures de données Pydantic utilisées pour la communication
entre le frontend et le backend. Inclut les modèles pour les requêtes de chat,
les réponses, la configuration et les statuts des services.

Classes principales:
- ChatRequest: Paramètres des requêtes de conversation
- ChatResponse: Structure des réponses générées
- ConfigRequest: Paramètres de configuration système
- StatusResponse: État des services connectés
"""

from pydantic import BaseModel
from typing import List, Optional

class ChatMessage(BaseModel):
    """
    Représente un message dans une conversation.
    
    Structure de base pour stocker les échanges conversationnels
    avec identification du rôle (utilisateur/assistant).
    """
    role: str  # "user" ou "assistant" 
    content: str  # Contenu textuel du message

class ChatRequest(BaseModel):
    """
    Paramètres d'une requête de conversation RAG.
    
    Encapsule tous les paramètres nécessaires pour traiter une demande
    utilisateur, incluant les options de recherche, le choix du modèle
    et les configurations de fournisseur.
    """
    message: str  # Message de l'utilisateur à traiter
    rag_enabled: bool = True  # Activation du mode RAG pour recherche documentaire
    force_web_search: bool = False  # Forcer la recherche web même avec documents
    model_version: str = "deepseek-r1:1.5b"  # Version du modèle par défaut
    similarity_threshold: float = 0.7  # Seuil de similarité pour recherche vectorielle
    use_web_search: bool = False  # Autoriser recherche web de secours
    openrouter_model: Optional[str] = None  # Modèle OpenRouter spécifique
    ollama_model: Optional[str] = None  # Modèle Ollama spécifique
    provider: str = "ollama"  # Fournisseur: "openrouter" ou "ollama"

class ChatResponse(BaseModel):
    """
    Structure de réponse générée par l'assistant.
    
    Contient la réponse textuelle ainsi que les métadonnées
    sur les sources utilisées et le processus de raisonnement.
    """
    response: str  # Réponse générée par le modèle
    sources: Optional[List[dict]] = None  # Sources documentaires utilisées
    thinking_process: Optional[str] = None  # Processus de raisonnement visible
    search_type: Optional[str] = None  # Type de recherche: "document", "web", "none"

class ConfigRequest(BaseModel):
    """
    Paramètres de configuration du système RAG.
    
    Permet la mise à jour dynamique des clés API, URLs de services,
    et paramètres de fonctionnement sans redémarrage.
    """
    qdrant_api_key: Optional[str] = None  # Clé API pour base vectorielle Qdrant
    qdrant_url: Optional[str] = None  # URL du cluster Qdrant
    model_version: Optional[str] = None  # Version du modèle par défaut
    similarity_threshold: Optional[float] = None  # Seuil de similarité vectorielle
    use_web_search: Optional[bool] = None  # Activation recherche web globale
    openrouter_api_key: Optional[str] = None  # Clé API OpenRouter
    openrouter_model: Optional[str] = None  # Modèle OpenRouter sélectionné
    ollama_model: Optional[str] = None  # Modèle Ollama sélectionné
    provider: Optional[str] = None  # Fournisseur actif

class StatusResponse(BaseModel):
    """
    État de santé des services externes.
    
    Fournit un diagnostic complet de la connectivité
    avec tous les services utilisés par l'application.
    """
    ollama_status: str  # État du serveur Ollama local
    qdrant_status: str  # État de la base vectorielle Qdrant
    web_search_status: str  # État du service de recherche web
    openrouter_status: str  # État de l'API OpenRouter
    model_available: bool  # Disponibilité du modèle sélectionné

class DocumentResponse(BaseModel):
    """
    Réponse après traitement d'un document.
    
    Confirme l'indexation réussie d'un document avec métadonnées
    sur le nombre de segments créés et le fichier traité.
    """
    message: str  # Message de confirmation du traitement
    filename: str  # Nom du fichier traité
    chunks_added: int  # Nombre de segments indexés