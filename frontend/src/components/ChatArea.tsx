/**
 * Zone de chat principale de l'application RAG
 * 
 * Composant central gérant l'affichage des messages, l'interaction utilisateur
 * et la sauvegarde automatique des conversations. Inclut la logique de défilement
 * automatique et l'extraction intelligente de sujets pour les titres.
 */

import React, { useEffect, useRef, useCallback } from 'react';
import { useAppStore } from '../store/context';
import { useAuth } from '../contexts/AuthContext';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import toast from 'react-hot-toast';

export const ChatArea: React.FC = () => {
  const { messages, config, setMessages, currentConversationId, setCurrentConversationId, refreshConversations } = useAppStore();
  const { saveConversation, updateConversation } = useAuth();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Défilement automatique vers le bas
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Effet pour déclencher le défilement à chaque nouveau message
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Extraction intelligente de sujets pour générer des titres de conversation
  /**
   * Extrait les termes significatifs d'un texte pour générer un titre.
   * 
   * Analyse le contenu textuel en filtrant les mots courants (français/anglais)
   * et en gardant les termes les plus pertinents pour créer un titre représentatif.
   */
  const extractTopics = useCallback((text: string): string[] => {
    // Suppression des mots courants et extraction des termes significatifs
    const commonWords = new Set([
      'le', 'la', 'les', 'un', 'une', 'des', 'du', 'de', 'da', 'et', 'ou', 'mais', 'donc', 'car',
      'je', 'tu', 'il', 'elle', 'nous', 'vous', 'ils', 'elles', 'mon', 'ma', 'mes', 'ton', 'ta', 'tes',
      'son', 'sa', 'ses', 'notre', 'votre', 'leur', 'leurs', 'ce', 'cet', 'cette', 'ces', 'sur', 'dans',
      'qui', 'que', 'quoi', 'dont', 'où', 'quand', 'comment', 'pourquoi', 'combien', 'avec', 'pour',
      'the', 'a', 'an', 'and', 'or', 'but', 'so', 'because', 'if', 'when', 'where', 'how', 'why', 'what',
      'i', 'you', 'he', 'she', 'it', 'we', 'they', 'my', 'your', 'his', 'her', 'its', 'our', 'their',
      'this', 'that', 'these', 'those', 'which', 'who', 'whom', 'whose', 'can', 'could', 'will', 'would',
      'should', 'shall', 'may', 'might', 'must', 'do', 'does', 'did', 'have', 'has', 'had', 'get', 'got',
      'is', 'are', 'was', 'were', 'be', 'been', 'being', 'please', 'merci', 'svp', 'very', 'really',
      'just', 'only', 'also', 'like', 'need', 'want', 'know', 'think', 'see', 'use', 'make', 'work',
      'good', 'bad', 'best', 'better', 'more', 'most', 'some', 'any', 'all', 'each', 'every', 'other',
      'many', 'much', 'few', 'little', 'long', 'short', 'high', 'low', 'big', 'small', 'new', 'old'
    ]);

    // Division du texte et nettoyage
    const words = text
      .replace(/[^\w\s]/g, ' ')
      .replace(/\d+/g, '') // Supprimer les nombres
      .split(/\s+/)
      .map(word => word.toLowerCase().trim())
      .filter(word => 
        word.length > 2 && 
        !commonWords.has(word) &&
        /^[a-zA-Zàâäéèêëïîôöùûüÿç]+$/.test(word) // Seulement les lettres (accents français inclus)
      );

    // Compter la fréquence des mots et retourner les plus pertinents
    const wordCount = new Map();
    words.forEach(word => {
      wordCount.set(word, (wordCount.get(word) || 0) + 1);
    });

    return Array.from(wordCount.entries())
      .sort((a, b) => b[1] - a[1]) // Trier par fréquence
      .slice(0, 8) // Prendre les 8 premiers
      .map(entry => entry[0]);
  }, []);

  const createTitleFromTopics = useCallback((topics: string[], fullText: string): string => {
    // Modèles prédéfinis pour les cas d'usage courants
    const patterns = [
      { keywords: ['analyse', 'analyze', 'analysis', 'étude', 'analyser'], title: 'Analyse' },
      { keywords: ['code', 'programming', 'développement', 'development', 'programmer'], title: 'Développement' },
      { keywords: ['recherche', 'research', 'étude', 'study', 'chercher'], title: 'Recherche' },
      { keywords: ['document', 'pdf', 'fichier', 'file', 'paper', 'rapport'], title: 'Document' },
      { keywords: ['machine learning', 'ai', 'intelligence artificielle', 'deep learning', 'neural'], title: 'IA' },
      { keywords: ['données', 'data', 'database', 'base de données', 'dataset'], title: 'Données' },
      { keywords: ['web', 'site', 'internet', 'url', 'html', 'css'], title: 'Web' },
      { keywords: ['python', 'javascript', 'java', 'cpp', 'c++', 'rust', 'go'], title: 'Code' },
      { keywords: ['bibliothèque', 'library', 'framework', 'outil', 'tool', 'api'], title: 'Outils' },
      { keywords: ['méthodologie', 'methodology', 'méthode', 'method', 'approche'], title: 'Méthode' },
      { keywords: ['explication', 'explain', 'expliquer', 'comment', 'pourquoi'], title: 'Explication' },
      { keywords: ['problème', 'problem', 'erreur', 'error', 'bug', 'issue'], title: 'Problème' },
      { keywords: ['optimisation', 'optimization', 'amélioration', 'improvement', 'performance'], title: 'Optimisation' },
      { keywords: ['configuration', 'config', 'setup', 'installation', 'install'], title: 'Configuration' },
      { keywords: ['test', 'testing', 'debug', 'debugging', 'validation'], title: 'Test' },
      { keywords: ['sécurité', 'security', 'authentification', 'auth', 'encryption'], title: 'Sécurité' },
      { keywords: ['guide', 'tutorial', 'tutoriel', 'exemple', 'example'], title: 'Guide' }
    ];

    // Vérifier les correspondances de motifs et extraire le contexte spécifique
    for (const pattern of patterns) {
      if (pattern.keywords.some(keyword => fullText.includes(keyword))) {
        // Trouver des mots de contexte spécifiques qui ne sont pas des mots-clés de motif
        const contextWords = topics.filter(topic => 
          !pattern.keywords.includes(topic) && 
          topic.length > 3 &&
          !['pour', 'avec', 'dans', 'from', 'with', 'using'].includes(topic)
        ).slice(0, 2);
        
        if (contextWords.length > 0) {
          const contextStr = contextWords.map(word => 
            word.charAt(0).toUpperCase() + word.slice(1)
          ).join(' ');
          return `${pattern.title} ${contextStr}`.slice(0, 25);
        }
        return pattern.title;
      }
    }

    // Solution de secours : utiliser les sujets les plus pertinents
    if (topics.length >= 2) {
      const cleanedTopics = topics
        .filter(topic => topic.length > 2)
        .slice(0, 3)
        .map(word => word.charAt(0).toUpperCase() + word.slice(1));
      
      if (cleanedTopics.length > 0) {
        return cleanedTopics.join(' ').slice(0, 25);
      }
    } else if (topics.length === 1 && topics[0].length > 3) {
      return `Discussion ${topics[0].charAt(0).toUpperCase() + topics[0].slice(1)}`;
    }

    return 'Nouvelle Conversation';
  }, []);

  const generateConversationTitle = useCallback((messages: any[]): string => {
    // Obtenir les messages utilisateur pour analyser le contenu
    const userMessages = messages.filter(msg => msg.role === 'user');
    if (userMessages.length === 0) return 'Nouvelle Conversation';

    // Combiner les messages utilisateur pour l'analyse
    const allUserText = userMessages.map(msg => msg.content).join(' ').toLowerCase();
    
    // Extraire les sujets clés et générer un titre significatif
    const topics = extractTopics(allUserText);
    const title = createTitleFromTopics(topics, allUserText);
    
    return title;
  }, [extractTopics, createTitleFromTopics]);

  // Sauvegarde automatique de la conversation quand les messages changent
  useEffect(() => {
    const saveCurrentConversation = async () => {
      if (messages.length === 0) {
        setCurrentConversationId(null);
        return;
      }

      try {
        if (currentConversationId) {
          // Mettre à jour la conversation existante - ne pas changer le titre
          await updateConversation(currentConversationId, {
            messages,
            config
          });
        } else {
          // Créer une nouvelle conversation avec un titre généré
          const conversationTitle = generateConversationTitle(messages);
          const conversationId = await saveConversation({
            title: conversationTitle,
            messages,
            config
          });
          setCurrentConversationId(conversationId);
          refreshConversations(); // Déclencher le rafraîchissement de la liste des conversations
        }
      } catch (error) {
        console.error('Failed to save conversation:', error);
      }
    };

    // Debounce the save operation
    const timeoutId = setTimeout(saveCurrentConversation, 1000);
    return () => clearTimeout(timeoutId);
  }, [messages, config, currentConversationId, saveConversation, updateConversation, setCurrentConversationId, refreshConversations, generateConversationTitle]);

  const handleEditMessage = async (index: number, newContent: string) => {
    const updatedMessages = [...messages];
    updatedMessages[index] = { ...updatedMessages[index], content: newContent };
    setMessages(updatedMessages);
    toast.success('Message updated');
  };

  return (
    <div className="flex-1 flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="flex justify-center mb-4">
                <img 
                  src="/logo_llm.png" 
                  alt="Professeur Virtuel Logo" 
                  className="h-24 w-auto"
                />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                Professeur Virtuel
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                {config.rag_enabled 
                  ? "Posez des questions sur vos documents ou sur tout autre sujet !" 
                  : "Vous pouvez parler directement à r1 localement ! Activez le mode RAG pour télécharger des documents !"
                }
              </p>
              {config.rag_enabled && (
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  Téléchargez des PDF ou ajoutez des URL dans la barre pour commencer
                </div>
              )}
            </div>
          </div>
        ) : (
          <>
            {messages.map((message, index) => (
              <ChatMessage 
                key={`${message.id || index}-${message.timestamp || ''}`}
                message={message} 
                onEdit={message.role === 'user' ? (newContent) => handleEditMessage(index, newContent) : undefined}
              />
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Chat Input */}
      <ChatInput />
    </div>
  );
};
