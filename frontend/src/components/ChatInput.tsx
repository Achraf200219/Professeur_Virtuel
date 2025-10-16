import React, { useState } from 'react';
import { useAppStore } from '../store/context';
import { chatAPI } from '../services/api';
import { Send, Globe, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

// Helper function to process error messages
const processErrorMessage = (errorDetail: string): string => {
  // Check for OpenRouter rate limit or model unavailable errors
  if (errorDetail.includes('OpenRouter error: 404') && errorDetail.includes('No endpoints found')) {
    return "Vous avez atteint la limite d'utilisation du modèle actuel. Veuillez passer à un autre modèle.";
  }
  
  if (errorDetail.includes('OpenRouter error: 429') && errorDetail.includes('temporarily rate-limited upstream')) {
    return "Vous avez atteint la limite d'utilisation du modèle actuel. Veuillez passer à un autre modèle.";
  }
  
  // Return original message if no specific patterns match
  return errorDetail;
};

export const ChatInput: React.FC = () => {
  const { 
    config, 
    updateConfig, 
    addMessage, 
    isLoading, 
    setLoading 
  } = useAppStore();
  
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || isLoading) return;

    const userMessage = message.trim();
    setMessage('');
    
    // Add user message immediately
    addMessage({ role: 'user', content: userMessage });
    setLoading(true);

    try {
      const response = await chatAPI.sendMessage({
        message: userMessage,
        rag_enabled: config.rag_enabled,
        force_web_search: config.force_web_search,
        model_version: config.model_version,
        similarity_threshold: config.similarity_threshold,
        use_web_search: config.use_web_search,
        openrouter_model: config.openrouter_model,
        ollama_model: config.ollama_model,
        provider: config.provider,
      });

      // Add assistant response
      addMessage({
        role: 'assistant',
        content: response.response,
        sources: response.sources,
        thinking_process: response.thinking_process,
        search_type: response.search_type,
      });

    } catch (error: any) {
      const errorDetail = error.response?.data?.detail || 'Échec de l\'envoi du message';
      const userFriendlyMessage = processErrorMessage(errorDetail);
      
      toast.error(userFriendlyMessage);
      addMessage({
        role: 'assistant',
        content: 'Désolé, j\'ai rencontré une erreur lors du traitement de votre demande. Veuillez réessayer.',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as any);
    }
  };

  const placeholder = config.rag_enabled 
    ? "Posez des questions sur vos documents..." 
    : "Demandez-moi n'importe quoi...";

  return (
    <div className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
      <form onSubmit={handleSubmit} className="flex items-end space-x-4">
        {/* Force web search toggle */}
        <div className="flex flex-col items-center space-y-1">
          <button
            type="button"
            onClick={() => updateConfig({ force_web_search: !config.force_web_search })}
            className={`
              p-2 rounded-lg transition-colors
              ${config.force_web_search
                ? 'bg-primary-600 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-300 dark:hover:bg-gray-600'
              }
            `}
            title="Forcer la recherche web"
          >
            <Globe size={20} />
          </button>
          <span className="text-xs text-gray-500 dark:text-gray-400">Web</span>
        </div>

        {/* Message input */}
        <div className="flex-1">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={placeholder}
            disabled={isLoading}
            rows={1}
            className="w-full input-primary resize-none max-h-32 min-h-[2.5rem]"
            style={{ 
              height: 'auto',
              minHeight: '2.5rem',
              maxHeight: '8rem'
            }}
            onInput={(e) => {
              const target = e.target as HTMLTextAreaElement;
              target.style.height = 'auto';
              target.style.height = target.scrollHeight + 'px';
            }}
          />
        </div>

        {/* Send button */}
        <button
          type="submit"
          disabled={!message.trim() || isLoading}
          className="btn-primary p-3 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <Loader2 size={20} className="animate-spin" />
          ) : (
            <Send size={20} />
          )}
        </button>
      </form>

      {/* Status indicators */}
      {config.force_web_search && (
        <div className="mt-2 text-xs text-blue-600 dark:text-blue-400">
          ℹ️ Mode de recherche web activé
        </div>
      )}
      
      {!config.rag_enabled && (
        <div className="mt-2 text-xs text-gray-600 dark:text-gray-400">
          💬 Mode chat direct - Activez RAG dans la barre latérale pour utiliser les documents
        </div>
      )}
    </div>
  );
};
