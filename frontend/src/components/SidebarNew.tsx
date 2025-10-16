import React, { useState } from 'react';
import { useAppStore } from '../store/context';
import { useAuth } from '../contexts/AuthContext';
import { StatusIndicator } from './StatusIndicator';
import { DocumentUpload } from './DocumentUpload';
import { ConfigPanel } from './ConfigPanel';
import { ConversationsList } from './ConversationsList';
import { SettingsMenu } from './SettingsMenu';
import { Moon, Sun, Menu, X, Settings, FileText, Globe, MessageSquare, User } from 'lucide-react';
import { Conversation } from '../types';

export const Sidebar: React.FC = () => {
  const { user, logout, updateProfile, changePassword } = useAuth();
  const [activeTab, setActiveTab] = useState<'config' | 'conversations'>('conversations');
  const { 
    config, 
    updateConfig, 
    sidebarOpen, 
    setSidebarOpen,
    processedDocuments,
    clearDocuments,
    clearMessages,
    setMessages
  } = useAppStore();

  const toggleDarkMode = () => {
    const newDarkMode = !config.dark_mode;
    updateConfig({ dark_mode: newDarkMode });
    
    if (newDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const handleClearChat = () => {
    if (window.confirm('Are you sure you want to clear the chat history?')) {
      clearMessages();
    }
  };

  const handleClearDocuments = () => {
    if (window.confirm('Are you sure you want to clear all documents?')) {
      clearDocuments();
    }
  };

  const handleSelectConversation = (conversation: Conversation) => {
    setMessages(conversation.messages);
    // Also update config if the conversation has saved config
    if (conversation.config) {
      updateConfig(conversation.config);
    }
    setSidebarOpen(false); // Close sidebar on mobile after selection
  };

  const handleNewConversation = () => {
    clearMessages();
    setSidebarOpen(false); // Close sidebar on mobile
  };

  const handleLogout = async () => {
    if (window.confirm('Are you sure you want to logout?')) {
      await logout();
    }
  };

  return (
    <>
      {/* Mobile menu button */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-white dark:bg-gray-800 shadow-lg border border-gray-200 dark:border-gray-700"
      >
        {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Sidebar */}
      <div className={`
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        fixed lg:static inset-y-0 left-0 z-40 w-80 sidebar transition-transform duration-300 ease-in-out
        flex flex-col
      `}>
        {/* Header with User Info */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-3">
              <img 
                src="/logo_llm.png" 
                alt="Professeur Virtuel Logo" 
                className="h-8 w-auto"
              />
              <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                Professeur Virtuel
              </h1>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={toggleDarkMode}
                className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                title="Toggle dark mode"
              >
                {config.dark_mode ? <Sun size={20} /> : <Moon size={20} />}
              </button>
              {user && (
                <SettingsMenu 
                  user={user}
                  onUpdateProfile={updateProfile}
                  onLogout={handleLogout}
                  onChangePassword={changePassword}
                />
              )}
              <button
                onClick={() => setSidebarOpen(false)}
                className="lg:hidden p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
          </div>
          
          {/* User Info */}
          {user && (
            <div className="flex items-center space-x-3 p-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
                {user.firstName?.charAt(0)}{user.lastName?.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                  {user.firstName} {user.lastName}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  {user.email}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-gray-200 dark:border-gray-700">
          <div className="flex">
            <button
              onClick={() => setActiveTab('config')}
              className={`flex-1 py-3 px-4 text-sm font-medium flex items-center justify-center space-x-2 transition-colors ${
                activeTab === 'config'
                  ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
            >
              <Settings size={18} />
              <span>Configuration</span>
            </button>
            <button
              onClick={() => setActiveTab('conversations')}
              className={`flex-1 py-3 px-4 text-sm font-medium flex items-center justify-center space-x-2 transition-colors ${
                activeTab === 'conversations'
                  ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
            >
              <MessageSquare size={18} />
              <span>Conversations</span>
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-hidden">
          {activeTab === 'config' ? (
            <div className="h-full overflow-y-auto">
              <StatusIndicator />
              <ConfigPanel />
              <DocumentUpload />
              
              {/* Processed Documents */}
              {processedDocuments.length > 0 && (
                <div className="p-4 space-y-3 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                      Processed Sources
                    </h3>
                    <button
                      onClick={handleClearDocuments}
                      className="text-xs text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                    >
                      Clear All
                    </button>
                  </div>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {processedDocuments.map((doc, index) => (
                      <div key={index} className="flex items-center text-xs text-gray-600 dark:text-gray-400">
                        {doc.endsWith('.pdf') ? <FileText size={14} className="mr-2" /> : <Globe size={14} className="mr-2" />}
                        <span className="truncate">{doc}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Action Buttons */}
              <div className="p-4 space-y-3 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={handleClearChat}
                  className="w-full btn-secondary text-sm"
                >
                  Clear Chat History
                </button>
              </div>
            </div>
          ) : (
            <ConversationsList
              onSelectConversation={handleSelectConversation}
              onNewConversation={handleNewConversation}
            />
          )}
        </div>
      </div>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-30"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </>
  );
};
