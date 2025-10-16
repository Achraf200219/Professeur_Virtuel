"""
Professeur Virtuel - API RAG Assistant

API principale du système de Retrieval-Augmented Generation (RAG) pour l'assistant virtuel.
Fournit des endpoints pour la gestion de documents, la configuration des modèles,
et le traitement des conversations via différents fournisseurs (Ollama, OpenRouter).

Architecture:
- FastAPI comme framework web principal
- Support multi-fournisseur (Ollama local, OpenRouter cloud)
- Intégration Qdrant pour la recherche vectorielle
- Système de chat contextuel avec historique
"""

from fastapi import FastAPI, UploadFile, File, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import tempfile
import os
import asyncio
import atexit
from datetime import datetime
import uvicorn

from services.rag_service import RAGService
from models.chat_models import ChatRequest, ChatResponse, ConfigRequest, StatusResponse, DocumentResponse

# Initialisation de l'application FastAPI
app = FastAPI(title="Professeur Virtuel - RAG Assistant API", version="1.0.0")

# Configuration CORS pour permettre les requêtes depuis le frontend React
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Serveur de développement React
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Instance globale du service RAG
"""
Service principal gérant la logique métier de l'application.
Centralise les interactions avec les modèles, la base vectorielle et les APIs externes.
"""
rag_service = RAGService()

# Fonction de nettoyage lors de l'arrêt de l'application
"""
Gère la fermeture propre des connexions et ressources
lors de l'arrêt du serveur FastAPI.
"""
async def cleanup():
    await rag_service.cleanup()

# Enregistrement de la fonction de nettoyage
atexit.register(lambda: asyncio.run(cleanup()))

@app.get("/")
async def root():
    """Point d'entrée principal de l'API"""
    return {"message": "Professeur Virtuel - RAG Assistant API"}

@app.post("/api/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """
    Traite les requêtes de chat avec support RAG ou mode simple.
    
    Gère le routage entre différents fournisseurs de modèles (Ollama/OpenRouter)
    et applique la logique RAG pour enrichir les réponses avec du contexte documentaire.
    
    Args:
        request: Objet ChatRequest contenant le message utilisateur et les paramètres
        
    Returns:
        ChatResponse: Réponse générée par le modèle avec contexte éventuel
        
    Raises:
        HTTPException: En cas d'erreur de traitement ou de configuration invalide
    """
    try:
        response = await rag_service.process_chat(request)
        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/upload-pdf", response_model=DocumentResponse)
async def upload_pdf(file: UploadFile = File(...)):
    """
    Télécharge et traite un document PDF pour l'indexation RAG.
    
    Extrait le contenu textuel du PDF, le segmente en chunks,
    génère les embeddings vectoriels et l'indexe dans Qdrant.
    
    Args:
        file: Fichier PDF uploadé via multipart/form-data
        
    Returns:
        DocumentResponse: Confirmation du traitement avec métadonnées
        
    Raises:
        HTTPException: Si le fichier n'est pas un PDF ou en cas d'erreur de traitement
    """
    try:
        if not file.filename.endswith('.pdf'):
            raise HTTPException(status_code=400, detail="Seuls les fichiers PDF sont autorisés")
        
        response = await rag_service.process_pdf(file)
        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/add-url", response_model=DocumentResponse)
async def add_url(url: str, background_tasks: BackgroundTasks):
    """
    Ajoute et traite une URL web pour l'indexation RAG.
    
    Extrait le contenu textuel de la page web, le nettoie et l'optimise,
    puis l'indexe dans la base vectorielle pour les recherches futures.
    
    Args:
        url: URL de la page web à traiter
        background_tasks: Gestionnaire de tâches asynchrones pour l'optimisation
        
    Returns:
        DocumentResponse: Confirmation du traitement avec métadonnées
        
    Raises:
        HTTPException: En cas d'erreur d'accès à l'URL ou de traitement
    """
    try:
        response = await rag_service.process_url(url, background_tasks)
        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/add-urls-batch", response_model=List[DocumentResponse])
async def add_urls_batch(urls: List[str], background_tasks: BackgroundTasks):
    """
    Traite plusieurs URLs en parallèle pour un indexation optimisée.
    
    Permet l'ajout simultané de multiples sources web avec gestion
    de la concurrence et agrégation des résultats.
    
    Args:
        urls: Liste des URLs à traiter
        background_tasks: Gestionnaire de tâches pour le traitement parallèle
        
    Returns:
        List[DocumentResponse]: Liste des résultats de traitement pour chaque URL
        
    Raises:
        HTTPException: En cas d'erreur lors du traitement batch
    """
    try:
        responses = await rag_service.process_url_batch(urls, background_tasks)
        return responses
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/cache/stats")
async def get_cache_stats():
    """
    Récupère les statistiques du cache des URLs.
    
    Fournit des métriques sur l'utilisation du cache pour le monitoring
    et l'optimisation des performances du système.
    
    Returns:
        dict: Statistiques détaillées du cache (taille, hits, misses, etc.)
        
    Raises:
        HTTPException: En cas d'erreur d'accès aux statistiques
    """
    try:
        stats = await rag_service.get_cache_stats()
        return stats
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/cache/clear")
async def clear_cache():
    """Clear URL cache"""
    try:
        result = await rag_service.clear_url_cache()
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/config")
async def update_config(config: ConfigRequest):
    """
    Met à jour les clés API et la configuration du système.
    
    Permet la modification dynamique des paramètres de configuration
    sans redémarrage du serveur (clés API, URLs, modèles, etc.).
    
    Args:
        config: Objet ConfigRequest contenant les nouveaux paramètres
        
    Returns:
        dict: Message de confirmation de la mise à jour
        
    Raises:
        HTTPException: En cas d'erreur de validation ou de mise à jour
    """
    try:
        rag_service.update_config(config)
        return {"message": "Configuration mise à jour avec succès"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/status", response_model=StatusResponse)
async def get_status():
    """
    Récupère le statut des services (Ollama, Qdrant, Web Search, OpenRouter).
    
    Vérifie la connectivité et la disponibilité de tous les services externes
    utilisés par l'application pour fournir un diagnostic complet.
    
    Returns:
        StatusResponse: Statut détaillé de chaque service avec indicateurs de santé
        
    Raises:
        HTTPException: En cas d'erreur lors de la vérification des statuts
    """
    try:
        status = await rag_service.get_status()
        return status
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/ollama/models")
async def get_ollama_models():
    """
    Récupère la liste des modèles Ollama disponibles localement.
    
    Interroge le serveur Ollama local pour obtenir la liste des modèles
    installés et disponibles pour l'utilisation.
    
    Returns:
        dict: Dictionnaire contenant la liste des modèles disponibles
        
    Raises:
        HTTPException: En cas d'erreur de connexion à Ollama ou de récupération
    """
    try:
        models = await rag_service.get_ollama_models()
        return {"models": models}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/ollama/status")
async def check_ollama_status():
    """
    Vérifie si le serveur Ollama est en cours d'exécution.
    
    Teste la connectivité avec le serveur Ollama local pour déterminer
    sa disponibilité pour le traitement des requêtes.
    
    Returns:
        dict: Statut de fonctionnement d'Ollama (running: boolean)
        
    Raises:
        HTTPException: En cas d'erreur lors de la vérification du statut
    """
    try:
        is_running = await rag_service.check_ollama_connection()
        return {"running": is_running}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/documents", response_model=List[str])
async def get_processed_documents():
    """
    Récupère la liste des documents traités et indexés.
    
    Returns:
        List[str]: Liste des identifiants ou noms des documents indexés
    """
    return rag_service.get_processed_documents()

@app.delete("/api/documents")
async def clear_documents():
    """
    Supprime tous les documents traités et indexés.
    
    Vide la base vectorielle et réinitialise l'index des documents
    pour un nouveau démarrage du système RAG.
    
    Returns:
        dict: Message de confirmation de la suppression
        
    Raises:
        HTTPException: En cas d'erreur lors de la suppression
    """
    try:
        rag_service.clear_documents()
        return {"message": "Tous les documents ont été supprimés avec succès"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/chat/history")
async def clear_chat_history():
    """
    Supprime l'historique des conversations.
    
    Vide la mémoire conversationnelle pour démarrer une nouvelle session
    sans contexte des échanges précédents.
    
    Returns:
        dict: Message de confirmation de la suppression
        
    Raises:
        HTTPException: En cas d'erreur lors de la suppression
    """
    try:
        rag_service.clear_chat_history()
        return {"message": "Historique des conversations supprimé avec succès"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/conversations/{conversation_id}")
async def delete_conversation_data(conversation_id: str):
    """
    Supprime les données d'une conversation spécifique.
    
    Efface de la mémoire backend et du cache toutes les données
    relatives à une conversation particulière identifiée par son ID.
    
    Args:
        conversation_id: Identifiant unique de la conversation à supprimer
        
    Returns:
        dict: Résultat de la suppression avec confirmation
        
    Raises:
        HTTPException: En cas d'erreur lors de la suppression
    """
    try:
        result = await rag_service.delete_conversation_data(conversation_id)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    # Lancement du serveur FastAPI avec configuration de production
    uvicorn.run(app, host="0.0.0.0", port=8000)