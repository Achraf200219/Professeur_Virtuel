/**
 * Composant principal de l'application RAG Assistant
 * 
 * Point d'entrée de l'interface utilisateur gérant l'authentification,
 * la configuration globale et l'affichage conditionnel des composants
 * principaux selon l'état de connexion.
 */

import React, { useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import { StoreProvider, useAppStore } from './store/context';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Sidebar } from './components/Sidebar';
import { ChatArea } from './components/ChatArea';
import { LoginForm } from './components/LoginForm';

function AppContent() {
  const { config } = useAppStore();
  const { user, loading } = useAuth();

  // Application du mode sombre au montage et lors des changements de configuration
  /**
   * Gestion du thème de l'interface utilisateur.
   * 
   * Applique ou retire la classe 'dark' sur le document HTML
   * selon la préférence utilisateur stockée dans la configuration.
   */
  useEffect(() => {
    if (config.dark_mode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [config.dark_mode]);

  // Écran de chargement pendant l'authentification
  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Chargement...</p>
        </div>
      </div>
    );
  }

  // Affichage du formulaire de connexion si utilisateur non authentifié
  if (!user) {
    return <LoginForm />;
  }

  // Interface principale pour utilisateur authentifié
  return (
    <div className="h-screen flex bg-gray-50 dark:bg-gray-900">
      <Sidebar />
      <ChatArea />
      {/* Configuration des notifications toast avec support du mode sombre */}
      <Toaster 
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: 'var(--toast-bg)',
            color: 'var(--toast-color)',
          },
          className: 'dark:bg-gray-800 dark:text-gray-100',
        }}
      />
    </div>
  );
}

/**
 * Composant racine de l'application.
 * 
 * Configure les providers Context pour l'authentification et le store global,
 * permettant le partage d'état à travers toute l'arborescence des composants.
 */
function App() {
  return (
    <AuthProvider>
      <StoreProvider>
        <AppContent />
      </StoreProvider>
    </AuthProvider>
  );
}

export default App;
