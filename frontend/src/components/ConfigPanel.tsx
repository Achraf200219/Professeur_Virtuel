import React, { useState, useEffect } from 'react';
import { useAppStore } from '../store/context';
import { configAPI, ollamaAPI } from '../services/api';
import { Key, Eye, EyeOff, Server, Wifi, WifiOff } from 'lucide-react';
import toast from 'react-hot-toast';

// Fonction utilitaire pour obtenir le nom d'affichage d'un modèle
/**
 * Convertit l'identifiant technique d'un modèle en nom d'affichage convivial.
 * Cette fonction mappe les identifiants complexes des modèles OpenRouter 
 * vers des noms plus lisibles pour l'interface utilisateur.
 * 
 * @param modelId - L'identifiant technique du modèle (ex: 'deepseek/deepseek-r1-0528:free')
 * @returns Le nom d'affichage simplifié (ex: 'DeepSeek') ou l'ID original si non mappé
 */
const getModelDisplayName = (modelId: string): string => {
  const modelMap: { [key: string]: string } = {
    'deepseek/deepseek-r1-0528:free': 'DeepSeek',
    'openai/gpt-oss-20b:free': 'ChatGPT',
    'qwen/qwen3-235b-a22b:free': 'Qwen',
    'google/gemma-3-27b-it:free': 'Gemma',
    'z-ai/glm-4.5-air:free': 'GLM',
    'qwen/qwen3-coder:free': 'Qwen Coder',
    'mistralai/mistral-small-3.2-24b-instruct:free': 'Mistral',
    'meta-llama/llama-3.3-70b-instruct:free': 'Llama'
  };
  return modelMap[modelId] || modelId;
};

export const ConfigPanel: React.FC = () => {
  const { config, updateConfig } = useAppStore();
  // Contrôle la visibilité des clés API dans les champs de saisie
  const [showKeys, setShowKeys] = useState(false);
  // Liste des modèles disponibles via Ollama
  const [ollamaModels, setOllamaModels] = useState<string[]>([]);
  // Statut de connexion au serveur Ollama local
  const [ollamaStatus, setOllamaStatus] = useState<boolean>(false);
  // Indicateur de chargement pour les opérations Ollama
  const [loadingOllama, setLoadingOllama] = useState<boolean>(false);
  
  /**
   * Configuration temporaire maintenue localement avant sauvegarde.
   * Permet à l'utilisateur de modifier plusieurs paramètres sans 
   * impact immédiat sur l'état global de l'application.
   */
  const [tempConfig, setTempConfig] = useState({
    qdrant_api_key: config.qdrant_api_key,
    qdrant_url: config.qdrant_url,
    openrouter_api_key: config.openrouter_api_key || '',
    openrouter_model: config.openrouter_model || '',
    ollama_model: config.ollama_model || '',
    provider: config.provider || 'ollama',
  });

  // Chargement des modèles et statut Ollama au montage du composant
  /**
   * Effect hook qui initialise les informations Ollama au chargement du composant.
   * Effectue deux appels API parallèles pour optimiser les performances :
   * 1. Vérification du statut de connexion Ollama
   * 2. Récupération de la liste des modèles disponibles
   * Gère les erreurs de connexion et met à jour l'état en conséquence.
   */
  useEffect(() => {
    const loadOllamaInfo = async () => {
      setLoadingOllama(true);
      try {
        // Appels API parallèles pour optimiser les performances
        const [statusResponse, modelsResponse] = await Promise.all([
          ollamaAPI.checkStatus(),
          ollamaAPI.getModels()
        ]);
        setOllamaStatus(statusResponse.running);
        setOllamaModels(modelsResponse.models);
      } catch (error) {
        console.error('Échec du chargement des informations Ollama:', error);
        // Réinitialisation en cas d'erreur de connexion
        setOllamaStatus(false);
        setOllamaModels([]);
      } finally {
        setLoadingOllama(false);
      }
    };

    loadOllamaInfo();
  }, []);

  /**
   * Fonction de rafraîchissement manuel des informations Ollama.
   * Permet à l'utilisateur de mettre à jour le statut et la liste des modèles
   * sans recharger toute l'interface. Utile après installation de nouveaux modèles.
   */
  const refreshOllama = async () => {
    setLoadingOllama(true);
    try {
      // Nouvelle vérification du statut et des modèles
      const [statusResponse, modelsResponse] = await Promise.all([
        ollamaAPI.checkStatus(),
        ollamaAPI.getModels()
      ]);
      setOllamaStatus(statusResponse.running);
      setOllamaModels(modelsResponse.models);
      toast.success('Statut Ollama mis à jour');
    } catch (error) {
      console.error('Échec du rafraîchissement des informations Ollama:', error);
      setOllamaStatus(false);
      setOllamaModels([]);
      toast.error('Impossible de se connecter à Ollama');
    } finally {
      setLoadingOllama(false);
    }
  };

  /**
   * Sauvegarde la configuration temporaire dans l'état global de l'application.
   * Met à jour à la fois le store local et le backend via l'API.
   */
  const handleSave = async () => {
    try {
      await configAPI.updateConfig(tempConfig);
      updateConfig(tempConfig);
      toast.success('Configuration sauvegardée avec succès');
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Échec de la sauvegarde de la configuration');
    }
  };

  /**
   * Sauvegarde la configuration et affiche un message de confirmation détaillé.
   * Inclut des informations spécifiques selon le fournisseur et modèle sélectionnés.
   */
  const handleSaveAndStart = async () => {
    try {
      await configAPI.updateConfig(tempConfig);
      updateConfig(tempConfig);
      
      // Message de confirmation adapté selon le fournisseur sélectionné
      if (tempConfig.provider === 'openrouter' && tempConfig.openrouter_model) {
        toast.success(`Configuration sauvegardée ! Utilisation du modèle OpenRouter: ${getModelDisplayName(tempConfig.openrouter_model)}`);
      } else if (tempConfig.provider === 'ollama' && tempConfig.ollama_model) {
        toast.success(`Configuration sauvegardée ! Utilisation du modèle Ollama: ${tempConfig.ollama_model}`);
      } else {
        toast.success('Configuration sauvegardée ! Utilisation du mode par défaut');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Échec de la sauvegarde de la configuration');
    }
  };

  /**
   * Détecte si des modifications ont été apportées à la configuration.
   * Compare la configuration temporaire avec la configuration active
   * pour déterminer si des changements nécessitent une sauvegarde.
   */
  const hasChanges = () => {
    return (
      tempConfig.qdrant_api_key !== config.qdrant_api_key ||
      tempConfig.qdrant_url !== config.qdrant_url ||
      tempConfig.openrouter_api_key !== (config.openrouter_api_key || '') ||
      tempConfig.openrouter_model !== (config.openrouter_model || '') ||
      tempConfig.ollama_model !== (config.ollama_model || '') ||
      tempConfig.provider !== (config.provider || 'ollama')
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center">
          <Key size={16} className="mr-2" />
          Configuration API
        </h3>
        <button
          onClick={() => setShowKeys(!showKeys)}
          className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
        >
          {showKeys ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>

      <div className="space-y-3">
        {/* Qdrant API Key */}
        <div>
          <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
            Qdrant API Key
          </label>
          <input
            type={showKeys ? 'text' : 'password'}
            value={tempConfig.qdrant_api_key}
            onChange={(e) => setTempConfig({ ...tempConfig, qdrant_api_key: e.target.value })}
            className="w-full input-primary text-sm"
            placeholder="Entrez la clé API Qdrant..."
          />
        </div>

        {/* Qdrant URL */}
        <div>
          <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
            Qdrant URL
          </label>
          <input
            type="text"
            value={tempConfig.qdrant_url}
            onChange={(e) => setTempConfig({ ...tempConfig, qdrant_url: e.target.value })}
            className="w-full input-primary text-sm"
            placeholder="https://your-cluster.cloud.qdrant.io:6333"
          />
        </div>

        {/* Configuration de Recherche Web */}
        <div className="space-y-3 pt-2 border-t border-gray-200 dark:border-gray-700">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Configuration de Recherche Web
          </h4>
          
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={config.use_web_search}
              onChange={(e) => updateConfig({ use_web_search: e.target.checked })}
              className="mr-2"
            />
            <span className="text-sm text-gray-600 dark:text-gray-400">Activer la recherche web de secours</span>
          </label>
        </div>

        {/* Sélection du Fournisseur */}
        <div className="space-y-3 pt-2 border-t border-gray-200 dark:border-gray-700">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Fournisseur de Modèles
          </h4>
          
          <div className="space-y-2">
            <label className="flex items-center">
              <input
                type="radio"
                name="provider"
                value="ollama"
                checked={tempConfig.provider === 'ollama'}
                onChange={(e) => setTempConfig({ ...tempConfig, provider: e.target.value as 'ollama' | 'openrouter' })}
                className="mr-2"
              />
              <Server size={16} className="mr-1" />
              <span className="text-sm text-gray-700 dark:text-gray-300">Ollama (Local)</span>
              {ollamaStatus ? (
                <Wifi size={14} className="ml-2 text-green-500" />
              ) : (
                <WifiOff size={14} className="ml-2 text-red-500" />
              )}
            </label>
            
            <label className="flex items-center">
              <input
                type="radio"
                name="provider"
                value="openrouter"
                checked={tempConfig.provider === 'openrouter'}
                onChange={(e) => setTempConfig({ ...tempConfig, provider: e.target.value as 'ollama' | 'openrouter' })}
                className="mr-2"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">OpenRouter (Cloud)</span>
            </label>
          </div>
        </div>

        {/* Configuration Ollama */}
        {tempConfig.provider === 'ollama' && (
          <div className="space-y-3 pt-2 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Configuration Ollama
              </h4>
              <button
                onClick={refreshOllama}
                disabled={loadingOllama}
                className="text-xs text-blue-600 hover:text-blue-800 disabled:opacity-50"
              >
                {loadingOllama ? 'Actualisation...' : 'Actualiser'}
              </button>
            </div>
            
            <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3">
              <div className="flex items-center space-x-2 mb-2">
                <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                  Statut Ollama:
                </span>
                {ollamaStatus ? (
                  <span className="text-xs text-green-600 dark:text-green-400 flex items-center">
                    <Wifi size={12} className="mr-1" />
                    Connecté
                  </span>
                ) : (
                  <span className="text-xs text-red-600 dark:text-red-400 flex items-center">
                    <WifiOff size={12} className="mr-1" />
                    Déconnecté
                  </span>
                )}
              </div>
              
              {!ollamaStatus && (
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Assurez-vous qu'Ollama est installé et en cours d'exécution sur localhost:11434
                </p>
              )}
            </div>
            
            <div>
              <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                Modèle Ollama
              </label>
              <select
                value={tempConfig.ollama_model}
                onChange={(e) => setTempConfig({ ...tempConfig, ollama_model: e.target.value })}
                className="w-full input-primary text-sm"
                disabled={!ollamaStatus || loadingOllama}
              >
                <option value="">Modèle par défaut (deepseek-r1:1.5b)</option>
                {ollamaModels.map((model) => (
                  <option key={model} value={model}>
                    {model}
                  </option>
                ))}
              </select>
              {ollamaModels.length === 0 && ollamaStatus && (
                <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
                  Aucun modèle trouvé. Installez des modèles avec `ollama pull [model-name]`
                </p>
              )}
            </div>
          </div>
        )}

        {/* Configuration OpenRouter */}
        {tempConfig.provider === 'openrouter' && (
          <div className="space-y-3 pt-2 border-t border-gray-200 dark:border-gray-700">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Configuration OpenRouter
            </h4>
            <div>
              <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                OpenRouter API Key
              </label>
              <input
                type={showKeys ? 'text' : 'password'}
                value={tempConfig.openrouter_api_key}
                onChange={(e) => setTempConfig({ ...tempConfig, openrouter_api_key: e.target.value })}
                className="w-full input-primary text-sm"
                placeholder="sk-or-..."
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                Modèle OpenRouter
              </label>
              <select
                value={tempConfig.openrouter_model}
                onChange={(e) => setTempConfig({ ...tempConfig, openrouter_model: e.target.value })}
                className="w-full input-primary text-sm"
              >
                <option value="">Sélectionner un modèle</option>
                <option value="deepseek/deepseek-r1-0528:free">DeepSeek</option>
                <option value="openai/gpt-oss-20b:free">ChatGPT</option>
                <option value="qwen/qwen3-235b-a22b:free">Qwen</option>
                <option value="google/gemma-3-27b-it:free">Gemma</option>
                <option value="z-ai/glm-4.5-air:free">GLM</option>
                <option value="qwen/qwen3-coder:free">Qwen Coder</option>
                <option value="mistralai/mistral-small-3.2-24b-instruct:free">Mistral</option>
                <option value="meta-llama/llama-3.3-70b-instruct:free">Llama</option>
              </select>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Sélectionner un modèle pour utiliser OpenRouter au lieu d'Ollama.
              </p>
            </div>
          </div>
        )}

        {/* Statut de Configuration Actuelle */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
          <h5 className="text-xs font-medium text-blue-800 dark:text-blue-200 mb-1">
            Configuration Actuelle:
          </h5>
          <p className="text-xs text-blue-600 dark:text-blue-300">
            {config.provider === 'openrouter' && config.openrouter_model 
              ? `OpenRouter: ${getModelDisplayName(config.openrouter_model)}`
              : config.provider === 'ollama' && config.ollama_model
              ? `Ollama: ${config.ollama_model}`
              : 'Mode par défaut (Ollama deepseek-r1:1.5b)'
            }
          </p>
          {config.qdrant_api_key && (
            <p className="text-xs text-blue-600 dark:text-blue-300 mt-1">
              Qdrant configuré
            </p>
          )}
        </div>

        {/* Configuration de Recherche */}
        <div className="space-y-3 pt-2 border-t border-gray-200 dark:border-gray-700">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Configuration de Recherche
          </h4>
          
          <div>
            <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
              Seuil de similarité des documents : {config.similarity_threshold}
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={config.similarity_threshold}
              onChange={(e) => updateConfig({ similarity_threshold: parseFloat(e.target.value) })}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
              <span>Moins strict</span>
              <span>Plus strict</span>
            </div>
          </div>
        </div>

        {/* Boutons de Sauvegarde */}
        <div className="space-y-2">
          {/* Bouton de sauvegarde principal toujours visible */}
          <button
            onClick={handleSaveAndStart}
            className="w-full btn-primary text-sm"
          >
            Sauvegarder la Configuration & Démarrer
          </button>
          
          {/* Bouton de sauvegarde supplémentaire lors de modifications */}
          {hasChanges() && (
            <button
              onClick={handleSave}
              className="w-full btn-secondary text-sm"
            >
              Appliquer les Modifications
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
