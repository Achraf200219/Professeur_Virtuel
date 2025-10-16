# Professeur Virtuel - Application Full Stack RAG

Une application web intelligente de génération augmentée par récupération (RAG) combinant modèles de langage locaux (Ollama) et cloud (OpenRouter) avec recherche vectorielle Qdrant. Architecture moderne React + TypeScript + FastAPI avec authentification Firebase complète, persistance des conversations dans Firestore, et recherche web DuckDuckGo.

**Tech Stack:** React, TypeScript, TailwindCSS, FastAPI, Python, Firebase Auth, Firestore, Qdrant, Ollama, OpenRouter

**Fonctionnalités:** Authentification complète (email/password + Google OAuth), dual provider system (local/cloud), mode chat et RAG, upload PDF, extraction contenu web, recherche vectorielle avec fallback web, interface responsive avec mode sombre/clair, gestion d'historique des conversations.

**Quick Start:** Installez Ollama avec les modèles requis. Backend: `cd backend && python -m venv venv && pip install -r requirements.txt && python main.py` (port 8000). Frontend: `cd frontend && npm install && npm start` (port 3000). Configurez Firebase et Qdrant via l'interface web.