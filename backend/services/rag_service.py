"""
Service RAG (Retrieval-Augmented Generation) Principal

Service central gérant la logique métier de l'assistant virtuel RAG.
Intègre la recherche vectorielle, le traitement de documents, la gestion
des conversations et le routage entre différents fournisseurs de modèles.

Fonctionnalités principales:
- Traitement et indexation de documents (PDF, URLs)
- Recherche vectorielle dans la base Qdrant
- Intégration multi-fournisseur (Ollama local, OpenRouter cloud)
- Gestion d'historique conversationnel
- Cache optimisé pour les URLs web
- Recherche web de secours via DuckDuckGo
"""

import tempfile
import os
import re
import asyncio
import hashlib
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any
import bs4
from fastapi import UploadFile, BackgroundTasks
import httpx
import subprocess

from agno.agent import Agent
from agno.models.ollama import Ollama
from langchain_community.document_loaders import PyPDFLoader, WebBaseLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_qdrant import QdrantVectorStore
from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams
from langchain_core.embeddings import Embeddings
from agno.embedder.ollama import OllamaEmbedder
from duckduckgo_search import DDGS
import requests
import trafilatura

from models.chat_models import ChatRequest, ChatResponse, ConfigRequest, StatusResponse, DocumentResponse

# Classe d'embeddings Ollama personnalisée
class OllamaEmbedderr(Embeddings):
    """
    Implémentation d'embeddings utilisant Ollama local.
    
    Fournit une interface compatible LangChain pour générer
    des représentations vectorielles via des modèles Ollama.
    """
    def __init__(self, model_name="snowflake-arctic-embed"):
        """
        Initialize the OllamaEmbedderr with a specific model.

        Args:
            model_name (str): The name of the model to use for embedding.
        """
        self.embedder = OllamaEmbedder(id=model_name, dimensions=1024)

    def embed_documents(self, texts: List[str]) -> List[List[float]]:
        return [self.embed_query(text) for text in texts]

    def embed_query(self, text: str) -> List[float]:
        return self.embedder.get_embedding(text)


class RAGService:
    def __init__(self):
        self.collection_name = "test-deepseek-r1"
        self.config = {
            'qdrant_api_key': "YOUR_API_HERE",
            'qdrant_url': "qdrant_URL",
            'model_version': "deepseek-r1:1.5b",
            'similarity_threshold': 0.7,
            'use_web_search': False,
            'openrouter_api_key': None,
            'openrouter_model': None,
            'ollama_model': None,
            'provider': 'ollama',
        }
        self.vector_store = None
        self.processed_documents = []
        self.chat_history = []
        self.qdrant_client = None
        
        # URL caching and processing optimization
        self.url_cache: Dict[str, Dict[str, Any]] = {}
        self.cache_expiry_hours = 24  # Cache for 24 hours
        self.max_cache_size = 100  # Maximum cached URLs
        self.processing_queue: Dict[str, asyncio.Future] = {}  # Track ongoing processing
        
        # HTTP client for async requests
        self.http_client = None

    def update_config(self, config: ConfigRequest):
        """Update service configuration"""
        if config.qdrant_api_key:
            self.config['qdrant_api_key'] = config.qdrant_api_key
        if config.qdrant_url:
            self.config['qdrant_url'] = config.qdrant_url
        if config.model_version:
            self.config['model_version'] = config.model_version
        if config.similarity_threshold is not None:
            self.config['similarity_threshold'] = config.similarity_threshold
        if config.use_web_search is not None:
            self.config['use_web_search'] = config.use_web_search
        if hasattr(config, 'openrouter_api_key') and config.openrouter_api_key:
            self.config['openrouter_api_key'] = config.openrouter_api_key
        if hasattr(config, 'openrouter_model'):
            self.config['openrouter_model'] = config.openrouter_model
        if hasattr(config, 'ollama_model'):
            self.config['ollama_model'] = config.ollama_model
        if hasattr(config, 'provider'):
            self.config['provider'] = config.provider or 'ollama'
        
        # Reinitialize Qdrant client if credentials changed
        if config.qdrant_api_key or config.qdrant_url:
            self.qdrant_client = None

    async def _get_http_client(self) -> httpx.AsyncClient:
        """Get or create async HTTP client."""
        if self.http_client is None:
            self.http_client = httpx.AsyncClient(
                timeout=httpx.Timeout(30.0),
                limits=httpx.Limits(max_keepalive_connections=5, max_connections=10),
                headers={
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                }
            )
        return self.http_client

    def _get_url_cache_key(self, url: str) -> str:
        """Generate cache key for URL."""
        return hashlib.md5(url.encode()).hexdigest()

    def _is_cache_valid(self, cache_entry: Dict[str, Any]) -> bool:
        """Check if cache entry is still valid."""
        if 'timestamp' not in cache_entry:
            return False
        
        cache_time = datetime.fromisoformat(cache_entry['timestamp'])
        expiry_time = cache_time + timedelta(hours=self.cache_expiry_hours)
        return datetime.now() < expiry_time

    def _cleanup_cache(self):
        """Remove expired and excess cache entries."""
        # Remove expired entries
        expired_keys = []
        for key, entry in self.url_cache.items():
            if not self._is_cache_valid(entry):
                expired_keys.append(key)
        
        for key in expired_keys:
            del self.url_cache[key]
        
        # Remove oldest entries if cache is too large
        if len(self.url_cache) > self.max_cache_size:
            # Sort by timestamp and keep only the newest entries
            sorted_entries = sorted(
                self.url_cache.items(),
                key=lambda x: x[1].get('timestamp', ''),
                reverse=True
            )
            self.url_cache = dict(sorted_entries[:self.max_cache_size])

    async def _fetch_url_content_async(self, url: str) -> str:
        """Fetch URL content asynchronously with multiple fallback methods."""
        client = await self._get_http_client()
        content = None
        
        try:
            # Method 1: Direct fetch with trafilatura extraction
            response = await client.get(url, follow_redirects=True)
            response.raise_for_status()
            
            # Use trafilatura for fast, clean text extraction
            content = trafilatura.extract(
                response.text,
                include_comments=False,
                include_tables=True,  # Keep tables for better content
                favor_precision=True,
                include_formatting=False,
                deduplicate=True,
                config=trafilatura.settings.use_config()
            )
            
            if content and len(content.strip()) > 10:
                return content
                
        except Exception as e:
            print(f"Trafilatura extraction failed for {url}: {e}")
        
        try:
            # Method 2: BeautifulSoup fallback
            if not content:
                response = await client.get(url, follow_redirects=True)
                response.raise_for_status()
                
                soup = bs4.BeautifulSoup(response.text, 'html.parser')
                
                # Remove unwanted elements
                for element in soup(["script", "style", "noscript", "header", "footer", "nav", "aside"]):
                    element.decompose()
                
                # Extract text with better formatting
                text = soup.get_text(separator="\n", strip=True)
                lines = [line.strip() for line in text.splitlines() if line.strip()]
                content = "\n".join(lines)
                
        except Exception as e:
            print(f"BeautifulSoup extraction failed for {url}: {e}")
            
        if not content or len(content.strip()) < 10:
            raise Exception("No meaningful text content found")
            
        return content

    def _init_qdrant(self) -> Optional[QdrantClient]:
        """Initialize Qdrant client with configured settings."""
        if not self.qdrant_client and all([self.config['qdrant_api_key'], self.config['qdrant_url']]):
            try:
                self.qdrant_client = QdrantClient(
                    url=self.config['qdrant_url'],
                    api_key=self.config['qdrant_api_key'],
                    timeout=60
                )
            except Exception as e:
                raise Exception(f"Qdrant connection failed: {str(e)}")
        return self.qdrant_client

    async def get_ollama_models(self) -> List[str]:
        """Get available Ollama models from the local Ollama instance."""
        try:
            import subprocess
            import json
            
            # Use ollama list command to get available models
            result = subprocess.run(['ollama', 'list'], capture_output=True, text=True, timeout=10)
            
            if result.returncode != 0:
                print(f"Ollama command failed: {result.stderr}")
                return []
            
            # Parse the output
            lines = result.stdout.strip().split('\n')
            models = []
            
            # Skip header line
            for line in lines[1:]:
                if line.strip():
                    # Extract model name (first column)
                    parts = line.split()
                    if parts:
                        model_name = parts[0]
                        # Clean up model name (remove tags like :latest)
                        if ':' in model_name:
                            model_name = model_name.split(':')[0]
                        models.append(model_name)
            
            return list(set(models))  # Remove duplicates
        except FileNotFoundError:
            print("Ollama not found. Please ensure Ollama is installed and in PATH.")
            return []
        except subprocess.TimeoutExpired:
            print("Ollama command timed out")
            return []
        except Exception as e:
            print(f"Error getting Ollama models: {e}")
            return []

    async def check_ollama_connection(self) -> bool:
        """Check if Ollama is running and accessible."""
        try:
            import subprocess
            result = subprocess.run(['ollama', 'list'], capture_output=True, text=True, timeout=5)
            return result.returncode == 0
        except Exception:
            return False

    def _create_vector_store(self, texts):
        """Create and initialize vector store with documents."""
        client = self._init_qdrant()
        if not client:
            raise Exception("Qdrant client not initialized")

        try:
            # Create collection if needed
            try:
                client.create_collection(
                    collection_name=self.collection_name,
                    vectors_config=VectorParams(
                        size=1024,
                        distance=Distance.COSINE
                    )
                )
            except Exception as e:
                if "already exists" not in str(e).lower():
                    raise e

            # Initialize vector store
            vector_store = QdrantVectorStore(
                client=client,
                collection_name=self.collection_name,
                embedding=OllamaEmbedderr()
            )

            # Add documents
            vector_store.add_documents(texts)
            return vector_store

        except Exception as e:
            raise Exception(f"Vector store error: {str(e)}")

    def _process_pdf_content(self, file: UploadFile) -> List:
        """Process PDF file and add source metadata."""
        try:
            with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as tmp_file:
                content = file.file.read()
                tmp_file.write(content)
                tmp_file.flush()
                temp_path = tmp_file.name
            # At this point, tmp_file is closed
            loader = PyPDFLoader(temp_path)
            documents = loader.load()
            # Add source metadata
            for doc in documents:
                doc.metadata.update({
                    "source_type": "pdf",
                    "file_name": file.filename,
                    "timestamp": datetime.now().isoformat()
                })
            text_splitter = RecursiveCharacterTextSplitter(
                chunk_size=1000,
                chunk_overlap=200
            )
            # Clean up temp file
            os.unlink(temp_path)
            return text_splitter.split_documents(documents)
        except Exception as e:
            raise Exception(f"PDF processing error: {str(e)}")

    async def _process_web_content_async(self, url: str) -> List:
        """Process web URL asynchronously with caching and optimization."""
        try:
            # Check cache first
            cache_key = self._get_url_cache_key(url)
            
            if cache_key in self.url_cache and self._is_cache_valid(self.url_cache[cache_key]):
                print(f"Using cached content for {url}")
                cached_entry = self.url_cache[cache_key]
                
                # Recreate documents from cached data
                from langchain.schema import Document
                docs = []
                for chunk_data in cached_entry['chunks']:
                    doc = Document(
                        page_content=chunk_data['content'],
                        metadata=chunk_data['metadata']
                    )
                    docs.append(doc)
                return docs
            
            # Check if URL is currently being processed
            if url in self.processing_queue:
                print(f"URL {url} is already being processed, waiting...")
                return await self.processing_queue[url]
            
            # Create future for this processing task
            future = asyncio.Future()
            self.processing_queue[url] = future
            
            try:
                # Fetch content asynchronously
                content = await self._fetch_url_content_async(url)
                
                # Create document with metadata
                from langchain.schema import Document
                doc = Document(
                    page_content=content,
                    metadata={
                        "source_type": "url",
                        "url": url,
                        "timestamp": datetime.now().isoformat(),
                        "content_length": len(content)
                    }
                )
                
                # Split into chunks (this is CPU-intensive, could be background task)
                text_splitter = RecursiveCharacterTextSplitter(
                    chunk_size=1200,
                    chunk_overlap=200,
                    separators=["\n\n", "\n", ". ", " ", ""]
                )
                
                chunks = text_splitter.split_documents([doc])
                
                # Cache the results
                self._cleanup_cache()
                self.url_cache[cache_key] = {
                    'url': url,
                    'timestamp': datetime.now().isoformat(),
                    'chunks': [
                        {
                            'content': chunk.page_content,
                            'metadata': chunk.metadata
                        }
                        for chunk in chunks
                    ]
                }
                
                # Complete the future
                future.set_result(chunks)
                return chunks
                
            except Exception as e:
                future.set_exception(e)
                raise
            finally:
                # Remove from processing queue
                if url in self.processing_queue:
                    del self.processing_queue[url]
                    
        except Exception as e:
            raise Exception(f"Async web processing error: {str(e)}")

    def _process_web_content(self, url: str) -> List:
        """Legacy synchronous method - now calls async version."""
        try:
            # Run the async method in the current event loop
            loop = asyncio.get_event_loop()
            if loop.is_running():
                # If we're in an async context, we need to use create_task
                # This is a fallback for legacy compatibility
                return asyncio.create_task(self._process_web_content_async(url))
            else:
                return loop.run_until_complete(self._process_web_content_async(url))
        except Exception as e:
            # Fallback to original synchronous method if async fails
            return self._process_web_content_sync(url)

    def _process_web_content_sync(self, url: str) -> List:
        """Process web URL and add source metadata with robust, fast extraction (synchronous fallback)."""
        try:
            content = None

            # 1) Quick try with WebBaseLoader (can be fast when allowed)
            try:
                loader = WebBaseLoader(web_paths=(url,))
                documents = loader.load()
                if documents and documents[0].page_content and documents[0].page_content.strip():
                    content = documents[0].page_content
            except Exception:
                pass

            # 2) Trafilatura extraction (fast and robust)
            if not content:
                downloaded = trafilatura.fetch_url(url, no_ssl=True, timeout=20)
                if downloaded:
                    content = trafilatura.extract(
                        downloaded,
                        include_comments=False,
                        include_tables=False,
                        favor_precision=True,
                        include_formatting=False,
                        deduplicate=True,
                    )

            # 3) Simple requests + BeautifulSoup fallback
            if not content:
                headers = {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                }
                resp = requests.get(url, headers=headers, timeout=20)
                resp.raise_for_status()
                soup = bs4.BeautifulSoup(resp.content, 'html.parser')
                for script in soup(["script", "style", "noscript"]):
                    script.decompose()
                text = soup.get_text("\n")
                lines = [ln.strip() for ln in text.splitlines()]
                content = "\n".join([ln for ln in lines if ln])

            if not content or len(content.strip()) < 10:
                raise Exception("No meaningful text content found")

            from langchain.schema import Document
            doc = Document(
                page_content=content,
                metadata={
                    "source_type": "url",
                    "url": url,
                    "timestamp": datetime.now().isoformat()
                }
            )

            text_splitter = RecursiveCharacterTextSplitter(
                chunk_size=1200,
                chunk_overlap=200
            )
            return text_splitter.split_documents([doc])

        except Exception as e:
            raise Exception(f"Web processing error: {str(e)}")

    def _get_web_search_agent(self) -> Agent:
        """Deprecated: Exa-based agent removed."""
        raise NotImplementedError("Web search agent via Exa is removed. Use _duckduckgo_search instead.")

    def _duckduckgo_search(self, query: str, max_results: int = 5):
        """Search DuckDuckGo and return normalized results without API."""
        with DDGS() as ddgs:
            results = list(ddgs.text(query, region="wt-wt", safesearch="moderate", max_results=max_results))
        normalized = []
        for r in results:
            normalized.append({
                "title": r.get("title") or "",
                "href": r.get("href") or r.get("url") or "",
                "body": r.get("body") or r.get("snippet") or ""
            })
        return normalized

    def _get_rag_agent(self) -> Agent:
        """Initialize the main RAG agent."""
        return Agent(
            name="Professeur Virtuel",
            model=Ollama(id=self.config['model_version']),
            instructions="""You are "Professeur Virtuel" - an AI assistant for researchers, PhD students, engineers, R&D teams, and enterprise management services.

            ABSOLUTE CRITICAL RULE: Your response must contain ONLY the final answer to the user's question. You must NEVER include:
            - Any analysis, reasoning, or thinking process
            - Phrases like "Let me analyze", "Based on my analysis", "I need to", "Let's", "I'll"
            - Meta-commentary about your approach or process
            - Planning steps or internal thoughts
            - System-level explanations or reasoning
            - Words like "analysis", "reasoning", "thinking", "planning" followed by your thought process

            WRONG EXAMPLES (NEVER do this):
            - "analysisWe need to give a structured answer... Ok proceed."
            - "Let me analyze this question first..."
            - "Based on my analysis of the context..."
            - "I need to examine the documents..."

            RIGHT APPROACH: Start immediately with your substantive answer to the user's question.

            Your mission is to provide **structured**, **clear**, and **rigorous** answers while adapting your tone to your audience:
            - **Academic tone** for researchers and PhD students
            - **Technical tone** for engineers and R&D teams  
            - **Strategic tone** for enterprise management

            ## Core Principles:
            1. **Structure & Clarity**: Use formatting effectively
               - **Bold** for key terms and concepts
               - Bullet points for lists and options
               - Numbered lists for step-by-step processes
               - Tables when comparing data or options
            
            2. **Source Attribution**: When using provided context
               - **Cite the source document or filename** when available
               - Reference specific sections when possible
               - Distinguish between document-based and general knowledge
            
            3. **Clean Output**: 
               - Provide direct, user-facing answers
               - No meta-commentary about your process
               - No analysis explanations unless explicitly requested
               - Professional and polished responses only
            
            ## Response Guidelines:
            - When given **context from documents**: Focus on the provided information, cite sources
            - When given **web search results**: Synthesize information and list sources at the end
            - When using **general knowledge**: Be clear about the knowledge source
            - Always maintain **professional clarity** and **directness**
            """,
            show_tool_calls=True,
            markdown=True,
        )

    def _openrouter_chat(self, prompt: str) -> str:
        """Call OpenRouter API for chat completion with selected model."""
        api_key = self.config.get('openrouter_api_key')
        model = self.config.get('openrouter_model')
        if not api_key or not model:
            raise Exception("OpenRouter is not configured")
        url = "https://openrouter.ai/api/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": "http://localhost:3000",
            "X-Title": "DeepSeek RAG App"
        }
        
        # Define the Professeur Virtuel system prompt
        system_prompt = """You are "Professeur Virtuel" - an AI assistant for researchers, PhD students, engineers, R&D teams, and enterprise management services.

ABSOLUTE CRITICAL RULE: Your response must contain ONLY the final answer to the user's question. You must NEVER include:
- Any analysis, reasoning, or thinking process
- Phrases like "Let me analyze", "Based on my analysis", "I need to", "Let's", "I'll"
- Meta-commentary about your approach or process
- Planning steps or internal thoughts
- System-level explanations or reasoning
- Words like "analysis", "reasoning", "thinking", "planning" followed by your thought process

WRONG EXAMPLES (NEVER do this):
- "analysisWe need to give a structured answer... Ok proceed."
- "Let me analyze this question first..."
- "Based on my analysis of the context..."
- "I need to examine the documents..."

RIGHT APPROACH: Start immediately with your substantive answer to the user's question.

Your mission is to provide **structured**, **clear**, and **rigorous** answers while adapting your tone to your audience:
- **Academic tone** for researchers and PhD students
- **Technical tone** for engineers and R&D teams  
- **Strategic tone** for enterprise management

## Core Principles:
1. **Structure & Clarity**: Use formatting effectively
   - **Bold** for key terms and concepts
   - Bullet points for lists and options
   - Numbered lists for step-by-step processes
   - Tables when comparing data or options

2. **Source Attribution**: When using provided context
   - **Cite the source document or filename** when available
   - Reference specific sections when possible
   - Distinguish between document-based and general knowledge

3. **Clean Output**: 
   - Provide direct, user-facing answers
   - No meta-commentary about your process
   - No analysis explanations unless explicitly requested
   - Professional and polished responses only

## Response Guidelines:
- When given **context from documents**: Focus on the provided information, cite sources
- When given **web search results**: Synthesize information and list sources at the end
- When using **general knowledge**: Be clear about the knowledge source
- Always maintain **professional clarity** and **directness**"""

        payload = {
            "model": model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": prompt}
            ]
        }
        resp = requests.post(url, json=payload, headers=headers, timeout=60)
        if resp.status_code != 200:
            raise Exception(f"OpenRouter error: {resp.status_code} {resp.text}")
        data = resp.json()
        try:
            return data["choices"][0]["message"]["content"]
        except Exception:
            raise Exception("Invalid response from OpenRouter")

    def _ollama_chat(self, prompt: str, model: str) -> str:
        """Call Ollama API for chat completion with selected model."""
        try:
            import requests
            
            # Ollama API endpoint (default local installation)
            url = "http://localhost:11434/api/generate"
            
            # Define the Professeur Virtuel system prompt
            system_prompt = """You are "Professeur Virtuel" - an AI assistant for researchers, PhD students, engineers, R&D teams, and enterprise management services.

ABSOLUTE CRITICAL RULE: Your response must contain ONLY the final answer to the user's question. You must NEVER include:
- Any analysis, reasoning, or thinking process
- Phrases like "Let me analyze", "Based on my analysis", "I need to", "Let's", "I'll"
- Meta-commentary about your approach or process
- Planning steps or internal thoughts
- System-level explanations or reasoning
- Words like "analysis", "reasoning", "thinking", "planning" followed by your thought process

WRONG EXAMPLES (NEVER do this):
- "analysisWe need to give a structured answer... Ok proceed."
- "Let me analyze this question first..."
- "Based on my analysis of the context..."
- "I need to examine the documents..."

RIGHT APPROACH: Start immediately with your substantive answer to the user's question.

Your mission is to provide **structured**, **clear**, and **rigorous** answers while adapting your tone to your audience:
- **Academic tone** for researchers and PhD students
- **Technical tone** for engineers and R&D teams  
- **Strategic tone** for enterprise management

## Core Principles:
1. **Structure & Clarity**: Use formatting effectively
   - **Bold** for key terms and concepts
   - Bullet points for lists and options
   - Numbered lists for step-by-step processes
   - Tables when comparing data or options

2. **Source Attribution**: When using provided context
   - **Cite the source document or filename** when available
   - Reference specific sections when possible
   - Distinguish between document-based and general knowledge

3. **Clean Output**: 
   - Provide direct, user-facing answers
   - No meta-commentary about your process
   - No analysis explanations unless explicitly requested
   - Professional and polished responses only

## Response Guidelines:
- When given **context from documents**: Focus on the provided information, cite sources
- When given **web search results**: Synthesize information and list sources at the end
- When using **general knowledge**: Be clear about the knowledge source
- Always maintain **professional clarity** and **directness**"""

            # Combine system prompt with user prompt
            full_prompt = f"{system_prompt}\n\nUser: {prompt}\n\nAssistant:"
            
            payload = {
                "model": model,
                "prompt": full_prompt,
                "stream": False
            }
            
            response = requests.post(url, json=payload, timeout=60)
            
            if response.status_code != 200:
                raise Exception(f"Ollama error: {response.status_code} {response.text}")
            
            data = response.json()
            return data.get("response", "")
            
        except requests.exceptions.ConnectionError:
            raise Exception("Could not connect to Ollama. Please ensure Ollama is running on localhost:11434")
        except requests.exceptions.Timeout:
            raise Exception("Ollama request timed out")
        except Exception as e:
            raise Exception(f"Ollama error: {str(e)}")

    async def process_chat(self, request: ChatRequest) -> ChatResponse:
        """Process chat request with RAG or simple mode"""
        try:
            # Update config from request
            self.config['similarity_threshold'] = request.similarity_threshold
            self.config['use_web_search'] = request.use_web_search
            self.config['model_version'] = request.model_version
            if hasattr(request, 'openrouter_model') and request.openrouter_model is not None:
                self.config['openrouter_model'] = request.openrouter_model or None
            if hasattr(request, 'ollama_model') and request.ollama_model is not None:
                self.config['ollama_model'] = request.ollama_model or None
            if hasattr(request, 'provider') and request.provider is not None:
                self.config['provider'] = request.provider

            context = ""
            docs = []
            sources = []
            search_type = "none"
            thinking_process = None

            if request.rag_enabled and not request.force_web_search and self.vector_store:
                # Try document search first
                retriever = self.vector_store.as_retriever(
                    search_type="similarity_score_threshold",
                    search_kwargs={
                        "k": 5,
                        "score_threshold": request.similarity_threshold
                    }
                )
                docs = retriever.invoke(request.message)
                if docs:
                    context = "\n\n".join([d.page_content for d in docs])
                    search_type = "document"
                    # Format sources with deduplication
                    unique_sources = {}  # Use dict to deduplicate by source name
                    for doc in docs:
                        source_type = doc.metadata.get("source_type", "unknown")
                        source_name = doc.metadata.get("file_name" if source_type == "pdf" else "url", "unknown")
                        
                        # Only add unique sources
                        if source_name not in unique_sources:
                            unique_sources[source_name] = {
                                "type": source_type,
                                "name": source_name,
                                "content": doc.page_content[:200] + "..."
                            }
                    
                    # Convert to list with sequential IDs
                    sources = [
                        {"id": i+1, **source_data} 
                        for i, source_data in enumerate(unique_sources.values())
                    ]

            # Use DuckDuckGo web search if forced or no relevant documents found
            if (request.force_web_search or not context) and request.use_web_search:
                try:
                    web_results = self._duckduckgo_search(request.message, max_results=5)
                    if web_results:
                        search_type = "web"
                        # Build context from results
                        context_lines = []
                        unique_web_sources = {}  # Deduplicate web sources too
                        
                        for i, r in enumerate(web_results, 1):
                            title = r["title"] or "Untitled"
                            url = r["href"]
                            snippet = r["body"] or ""
                            context_lines.append(f"[{i}] {title} - {url}\n{snippet}")
                            
                            # Add to unique sources
                            if url not in unique_web_sources:
                                unique_web_sources[url] = {
                                    "type": "web_search",
                                    "name": url,
                                    "title": title,
                                    "content": (title + " - " + snippet)[:200] + "..."
                                }
                        
                        context = "Web Search Results:\n" + "\n\n".join(context_lines)
                        
                        # Build deduplicated sources for UI
                        sources = [
                            {"id": i+1, **source_data} 
                            for i, source_data in enumerate(unique_web_sources.values())
                        ]
                except Exception as e:
                    raise Exception(f"Web search error: {str(e)}")

            # Build final prompt
            if context:
                # Build source information for better citation
                source_info = ""
                if sources:
                    source_list = []
                    for source in sources:
                        if source["type"] == "pdf":
                            source_list.append(f"- Document: **{source['name']}** (PDF)")
                        elif source["type"] in ["url", "web_search"]:
                            title = source.get('title', source['name'])
                            source_list.append(f"- Web source: **{title}** ({source['name']})")
                        else:
                            source_list.append(f"- Source: **{source['name']}** ({source['type']})")
                    source_info = f"\n\n**Available Sources:**\n" + "\n".join(source_list)
                
                if search_type == "web":
                    prompt_instruction = "Based on the web search results above, provide a comprehensive answer and include a 'Sources:' section at the end listing the websites used."
                else:
                    prompt_instruction = "Based on the provided documents, answer the question and cite the source document names when referencing specific information."
                
                full_prompt = f"""Context: {context}{source_info}

Original Question: {request.message}

{prompt_instruction}"""
            else:
                full_prompt = request.message

            # Route based on provider configuration
            provider = self.config.get('provider', 'ollama')
            
            if provider == 'openrouter' and self.config.get('openrouter_model') and self.config.get('openrouter_api_key'):
                response_content = self._openrouter_chat(full_prompt)
            elif provider == 'ollama':
                # Use Ollama with specific model if configured, otherwise use default agent
                ollama_model = self.config.get('ollama_model')
                if ollama_model:
                    response_content = self._ollama_chat(full_prompt, ollama_model)
                else:
                    rag_agent = self._get_rag_agent()
                    response = rag_agent.run(full_prompt)
                    response_content = response.content
            else:
                # Fallback to default agent
                rag_agent = self._get_rag_agent()
                response = rag_agent.run(full_prompt)
                response_content = response.content

            # Clean up any system prompts or unwanted content that might leak through
            final_response = self._clean_response(response_content)

            # Add to chat history
            self.chat_history.append({"role": "user", "content": request.message})
            self.chat_history.append({"role": "assistant", "content": final_response})

            return ChatResponse(
                response=final_response,
                sources=sources if sources else None,
                thinking_process=None,  # No longer expose thinking process
                search_type=search_type
            )

        except Exception as e:
            raise Exception(f"Error processing chat: {str(e)}")

    async def process_pdf(self, file: UploadFile) -> DocumentResponse:
        """Process uploaded PDF file"""
        try:
            filename = file.filename
            if filename in self.processed_documents:
                raise Exception(f"Document {filename} already processed")

            texts = self._process_pdf_content(file)
            if not texts:
                raise Exception("No text content found in PDF")

            client = self._init_qdrant()
            if not client:
                raise Exception("Qdrant client not initialized")

            if self.vector_store:
                self.vector_store.add_documents(texts)
            else:
                self.vector_store = self._create_vector_store(texts)

            self.processed_documents.append(filename)

            return DocumentResponse(
                message=f"Successfully processed PDF: {filename}",
                filename=filename,
                chunks_added=len(texts)
            )

        except Exception as e:
            raise Exception(f"Error processing PDF: {str(e)}")

    async def process_url(self, url: str, background_tasks: Optional[BackgroundTasks] = None) -> DocumentResponse:
        """Process web URL with optimization and optional background processing."""
        try:
            if url in self.processed_documents:
                raise Exception(f"URL {url} already processed")

            # Use async processing for better performance
            texts = await self._process_web_content_async(url)
            
            if not texts:
                raise Exception("No text content found at URL")

            client = self._init_qdrant()
            if not client:
                raise Exception("Qdrant client not initialized")

            # For large documents, use background task to add to vector store
            if len(texts) > 50 and background_tasks:  # Large document threshold
                background_tasks.add_task(self._add_documents_to_vector_store, texts)
                # Add to processed list immediately for user feedback
                self.processed_documents.append(url)
                
                return DocumentResponse(
                    message=f"Successfully queued URL for processing: {url} ({len(texts)} chunks)",
                    filename=url,
                    chunks_added=len(texts)
                )
            else:
                # Process immediately for smaller documents
                if self.vector_store:
                    self.vector_store.add_documents(texts)
                else:
                    self.vector_store = self._create_vector_store(texts)

                self.processed_documents.append(url)

                return DocumentResponse(
                    message=f"Successfully processed URL: {url}",
                    filename=url,
                    chunks_added=len(texts)
                )

        except Exception as e:
            raise Exception(f"Error processing URL: {str(e)}")

    def _add_documents_to_vector_store(self, texts: List):
        """Background task to add documents to vector store."""
        try:
            if self.vector_store:
                self.vector_store.add_documents(texts)
            else:
                self.vector_store = self._create_vector_store(texts)
            print(f"Background task completed: Added {len(texts)} chunks to vector store")
        except Exception as e:
            print(f"Background task failed: {str(e)}")

    async def process_url_batch(self, urls: List[str], background_tasks: Optional[BackgroundTasks] = None) -> List[DocumentResponse]:
        """Process multiple URLs concurrently."""
        try:
            # Process URLs concurrently with limited concurrency
            semaphore = asyncio.Semaphore(3)  # Limit to 3 concurrent downloads
            
            async def process_single_url(url: str) -> DocumentResponse:
                async with semaphore:
                    return await self.process_url(url, background_tasks)
            
            tasks = [process_single_url(url) for url in urls]
            results = await asyncio.gather(*tasks, return_exceptions=True)
            
            # Convert exceptions to error responses
            responses = []
            for i, result in enumerate(results):
                if isinstance(result, Exception):
                    responses.append(DocumentResponse(
                        message=f"Failed to process URL {urls[i]}: {str(result)}",
                        filename=urls[i],
                        chunks_added=0
                    ))
                else:
                    responses.append(result)
            
            return responses
            
        except Exception as e:
            raise Exception(f"Error in batch URL processing: {str(e)}")

    async def clear_url_cache(self) -> dict:
        """Clear the URL cache."""
        cache_size = len(self.url_cache)
        self.url_cache.clear()
        return {"message": f"Cleared {cache_size} cached URLs"}

    async def get_cache_stats(self) -> dict:
        """Get cache statistics."""
        valid_entries = sum(1 for entry in self.url_cache.values() if self._is_cache_valid(entry))
        return {
            "total_cached_urls": len(self.url_cache),
            "valid_cached_urls": valid_entries,
            "cache_hit_rate": "Available after first requests",
            "max_cache_size": self.max_cache_size,
            "cache_expiry_hours": self.cache_expiry_hours
        }

    async def get_status(self) -> StatusResponse:
        """Get service status"""
        # Check Ollama
        ollama_status = "unknown"
        model_available = False
        try:
            agent = Agent(model=Ollama(id="llama3.2"))
            # Try a simple test
            ollama_status = "connected"
            model_available = True
        except Exception:
            ollama_status = "disconnected"

        # Check Qdrant
        qdrant_status = "unknown"
        try:
            client = self._init_qdrant()
            if client:
                client.get_collections()
                qdrant_status = "connected"
            else:
                qdrant_status = "not_configured"
        except Exception:
            qdrant_status = "disconnected"

        # Web search (DuckDuckGo) is available without API
        web_search_status = "connected"

        # OpenRouter status
        openrouter_status = "configured" if self.config.get('openrouter_api_key') else "not_configured"

        return StatusResponse(
            ollama_status=ollama_status,
            qdrant_status=qdrant_status,
            web_search_status=web_search_status,
            openrouter_status=openrouter_status,
            model_available=model_available
        )

    def get_processed_documents(self) -> List[str]:
        """Get list of processed documents"""
        return self.processed_documents.copy()

    def clear_documents(self):
        """Clear all processed documents"""
        self.processed_documents = []
        self.vector_store = None

    def _clean_response(self, response_content: str) -> str:
        """Clean response content to remove unwanted system text or analysis."""
        # Remove any thinking tags that might leak through
        response_content = re.sub(r'<think>.*?</think>', '', response_content, flags=re.DOTALL)
        
        # CRITICAL: Remove concatenated reasoning patterns that appear in models like gpt-oss-20b
        # These patterns appear as "wordWORD" without spaces between reasoning and content
        concatenated_patterns = [
            r'analysis[A-Z][^.]*?(?:proceed|continue|final|answer|respond)',  # analysisWe need...proceed/final
            r'reasoning[A-Z][^.]*?(?:proceed|continue|final|answer|respond)', # reasoningLet me...proceed/final
            r'planning[A-Z][^.]*?(?:proceed|continue|final|answer|respond)',  # planningFirst I...proceed/final
            r'thinking[A-Z][^.]*?(?:proceed|continue|final|answer|respond)',  # thinkingI should...proceed/final
            r'assistant[A-Z][^.]*?(?:proceed|continue|final|answer|respond)', # assistantLet me...proceed/final
            r'system[A-Z][^.]*?(?:proceed|continue|final|answer|respond)',    # systemNow I...proceed/final
            r'let\'s[A-Z][^.]*?(?:proceed|continue|final|answer|respond)',    # let'sCraft...proceed/final
        ]
        
        for pattern in concatenated_patterns:
            response_content = re.sub(pattern, '', response_content, flags=re.IGNORECASE | re.DOTALL)
        
        # Remove reasoning that starts at the beginning of response (no capital letter)
        reasoning_start_patterns = [
            r'^analysis[a-z][^.]*?(?:proceed|continue|final|answer|respond)',
            r'^reasoning[a-z][^.]*?(?:proceed|continue|final|answer|respond)',
            r'^planning[a-z][^.]*?(?:proceed|continue|final|answer|respond)',
            r'^thinking[a-z][^.]*?(?:proceed|continue|final|answer|respond)',
            r'^assistant[a-z][^.]*?(?:proceed|continue|final|answer|respond)',
            r'^let\'s[a-z][^.]*?(?:proceed|continue|final|answer|respond)',
        ]
        
        for pattern in reasoning_start_patterns:
            response_content = re.sub(pattern, '', response_content, flags=re.IGNORECASE | re.DOTALL)
        
        # Remove any standalone reasoning words at the start
        response_content = re.sub(r'^(analysis|reasoning|planning|thinking|assistant|system|let\'s)\s*', '', response_content, flags=re.IGNORECASE)
        
        # Remove meta-commentary patterns
        meta_patterns = [
            r'I need to.*?\.(?=\s|$)',
            r'Let me.*?\.(?=\s|$)',
            r'Let\'s.*?\.(?=\s|$)',
            r'I\'ll.*?\.(?=\s|$)',
            r'I will.*?\.(?=\s|$)',
            r'I should.*?\.(?=\s|$)',
            r'Based on my analysis.*?\.(?=\s|$)',
            r'Upon reviewing.*?\.(?=\s|$)',
            r'According to my analysis.*?\.(?=\s|$)',
            r'After analyzing.*?\.(?=\s|$)',
            r'From my analysis.*?\.(?=\s|$)',
            r'My analysis shows.*?\.(?=\s|$)',
            r'The analysis indicates.*?\.(?=\s|$)',
            r'Now I.*?\.(?=\s|$)',
            r'First, I.*?\.(?=\s|$)',
            r'To answer this.*?\.(?=\s|$)',
            r'Looking at.*?\.(?=\s|$)',
            r'Examining.*?\.(?=\s|$)',
        ]
        
        for pattern in meta_patterns:
            response_content = re.sub(pattern, '', response_content, flags=re.IGNORECASE)
        
        # Remove system role indicators
        system_indicators = [
            r'assistant:?\s*',
            r'system:?\s*',
            r'ai:?\s*',
            r'bot:?\s*',
            r'model:?\s*',
        ]
        
        for pattern in system_indicators:
            response_content = re.sub(pattern, '', response_content, flags=re.IGNORECASE)
        
        # Remove any text that looks like internal commands or thinking
        internal_commands = [
            r'ok proceed\.*',
            r'proceed\.*',
            r'continue\.*',
            r'final\.*$',
            r'answer\.*$',
            r'respond\.*$',
        ]
        
        for pattern in internal_commands:
            response_content = re.sub(pattern, '', response_content, flags=re.IGNORECASE)
        
        # Handle edge case: if response starts with lowercase after cleaning, capitalize first letter
        response_content = response_content.strip()
        if response_content and response_content[0].islower():
            response_content = response_content[0].upper() + response_content[1:]
        
        # Clean up extra whitespace and formatting
        response_content = re.sub(r'\n\s*\n\s*\n+', '\n\n', response_content)  # Multiple newlines to double
        response_content = re.sub(r'^\s+', '', response_content, flags=re.MULTILINE)  # Remove leading spaces
        response_content = re.sub(r'\s+$', '', response_content, flags=re.MULTILINE)  # Remove trailing spaces
        response_content = response_content.strip()
        
        # Final check: if response is empty or too short after cleaning, return a default message
        if not response_content or len(response_content.strip()) < 10:
            return "I apologize, but I couldn't generate a proper response. Please try rephrasing your question."
        
        return response_content

    async def cleanup(self):
        """Clean up resources."""
        if self.http_client:
            await self.http_client.aclose()
            self.http_client = None

    def clear_chat_history(self):
        """Clear chat history"""
        self.chat_history = []

    async def delete_conversation_data(self, conversation_id: str):
        """Delete conversation data from memory, cache, and vector store."""
        try:
            # Clear from chat history (if conversation_id matches current session)
            self.chat_history = []
            
            # Clear from URL cache if any URLs were processed for this conversation
            # (This would require tracking which URLs belong to which conversation)
            # For now, we can clear expired cache entries
            self._cleanup_cache()
            
            # Note: For full conversation deletion from vector store, we would need
            # to track which documents/chunks belong to which conversation.
            # This could be implemented by adding conversation_id to metadata
            # when processing documents during a conversation.
            
            return {"message": f"Conversation {conversation_id} data cleared from memory and cache"}
            
        except Exception as e:
            raise Exception(f"Error deleting conversation data: {str(e)}")

    def clear_documents(self):
        """Clear all processed documents and reset vector store"""
        try:
            self.processed_documents = []
            self.vector_store = None
            self.url_cache.clear()
            
            # If we have a Qdrant client, we could also delete the collection
            if self.qdrant_client:
                try:
                    self.qdrant_client.delete_collection(self.collection_name)
                except Exception:
                    pass  # Collection might not exist
                    
        except Exception as e:
            print(f"Error clearing documents: {str(e)}")