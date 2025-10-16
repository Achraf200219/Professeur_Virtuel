import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useAppStore } from '../store/context';
import { Conversation } from '../types';
import { MessageSquare, Plus, Trash2, Calendar, Clock, MoreVertical, Edit2, Check, X } from 'lucide-react';
import toast from 'react-hot-toast';

interface ConversationsListProps {
  onSelectConversation: (conversation: Conversation) => void;
  onNewConversation: () => void;
  selectedConversationId?: string;
  refreshTrigger?: number; // Add refresh trigger
}

export const ConversationsList: React.FC<ConversationsListProps> = ({
  onSelectConversation,
  onNewConversation,
  selectedConversationId,
  refreshTrigger
}) => {
  const { getUserConversations, deleteConversation, updateConversation } = useAuth();
  const { clearMessages, setCurrentConversationId, currentConversationId } = useAppStore();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadConversations();
  }, [refreshTrigger]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpenId(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const loadConversations = async () => {
    try {
      const userConversations = await getUserConversations();
      setConversations(userConversations);
    } catch (error) {
      toast.error('Échec du chargement des conversations');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteConversation = async (conversationId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cette conversation ?')) {
      return;
    }

    setDeletingId(conversationId);
    try {
      await deleteConversation(conversationId);
      setConversations(prev => prev.filter(conv => conv.id !== conversationId));
      
      // If the deleted conversation is currently active, clear the chat view
      if (currentConversationId === conversationId) {
        clearMessages();
        setCurrentConversationId(null);
      }
      
      toast.success('Conversation supprimée');
    } catch (error) {
      toast.error('Échec de la suppression de la conversation');
    } finally {
      setDeletingId(null);
      setMenuOpenId(null);
    }
  };

  const handleRenameStart = (conversationId: string, currentTitle: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(conversationId);
    setEditingTitle(currentTitle);
    setMenuOpenId(null);
  };

  const handleRenameCancel = () => {
    setEditingId(null);
    setEditingTitle('');
  };

  const handleRenameSave = async (conversationId: string) => {
    if (!editingTitle.trim()) {
      toast.error('Le titre ne peut pas être vide');
      return;
    }

    try {
      await updateConversation(conversationId, { title: editingTitle.trim() });
      setConversations(prev => 
        prev.map(conv => 
          conv.id === conversationId 
            ? { ...conv, title: editingTitle.trim() }
            : conv
        )
      );
      toast.success('Conversation renommée');
    } catch (error) {
      toast.error('Échec du renommage de la conversation');
    } finally {
      setEditingId(null);
      setEditingTitle('');
    }
  };

  const formatDate = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) {
      return "Aujourd'hui";
    } else if (days === 1) {
      return 'Hier';
    } else if (days < 7) {
      return `Il y a ${days} jours`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (loading) {
    return (
      <div className="p-4">
        <div className="animate-pulse space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Conversations
          </h2>
          <button
            onClick={onNewConversation}
            className="btn-primary flex items-center space-x-1 text-sm"
          >
            <Plus size={16} />
            <span>Nouveau Chat</span>
          </button>
        </div>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {conversations.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <MessageSquare size={48} className="mx-auto mb-3 opacity-50" />
            <p className="text-sm">Aucune conversation pour le moment</p>
            <p className="text-xs mt-1">Démarrez un nouveau chat pour le voir ici</p>
          </div>
        ) : (
          conversations.map((conversation) => (
            <div
              key={conversation.id}
              onClick={() => editingId !== conversation.id && onSelectConversation(conversation)}
              className={`
                relative group p-3 rounded-lg cursor-pointer transition-all duration-200
                ${selectedConversationId === conversation.id
                  ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800'
                  : 'hover:bg-gray-50 dark:hover:bg-gray-700 border border-transparent'
                }
              `}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  {editingId === conversation.id ? (
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={editingTitle}
                        onChange={(e) => setEditingTitle(e.target.value)}
                        className="w-full text-sm font-medium bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded px-2 py-1"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleRenameSave(conversation.id);
                          } else if (e.key === 'Escape') {
                            handleRenameCancel();
                          }
                        }}
                      />
                      <div className="flex justify-end space-x-1">
                        <button
                          onClick={() => handleRenameSave(conversation.id)}
                          className="p-1 bg-green-100 hover:bg-green-200 dark:bg-green-900/20 dark:hover:bg-green-900/40 text-green-600 dark:text-green-400 rounded transition-colors"
                        >
                          <Check size={12} />
                        </button>
                        <button
                          onClick={handleRenameCancel}
                          className="p-1 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-400 rounded transition-colors"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <h3 className="font-medium text-sm text-gray-900 dark:text-gray-100 truncate">
                        {conversation.title}
                      </h3>
                      
                      <div className="flex items-center space-x-2 mt-1 text-xs text-gray-500 dark:text-gray-400">
                        <div className="flex items-center space-x-1">
                          <Calendar size={12} />
                          <span>{formatDate(conversation.updatedAt)}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Clock size={12} />
                          <span>{formatTime(conversation.updatedAt)}</span>
                        </div>
                      </div>
                      
                      <div className="mt-2 text-xs text-gray-600 dark:text-gray-300">
                        {conversation.messages.length} message{conversation.messages.length !== 1 ? 's' : ''}
                      </div>
                    </>
                  )}
                </div>
                
                {editingId !== conversation.id && (
                  <div className="relative">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setMenuOpenId(menuOpenId === conversation.id ? null : conversation.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-400 transition-opacity"
                      title="Plus d'options"
                    >
                      <MoreVertical size={14} />
                    </button>
                    
                    {menuOpenId === conversation.id && (
                      <div
                        ref={menuRef}
                        className="absolute right-0 top-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-10 py-1 min-w-32"
                      >
                        <button
                          onClick={(e) => handleRenameStart(conversation.id, conversation.title, e)}
                          className="w-full px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-2"
                        >
                          <Edit2 size={14} />
                          <span>Renommer</span>
                        </button>
                        <button
                          onClick={(e) => handleDeleteConversation(conversation.id, e)}
                          disabled={deletingId === conversation.id}
                          className="w-full px-3 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center space-x-2 disabled:opacity-50"
                        >
                          <Trash2 size={14} />
                          <span>Supprimer</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
