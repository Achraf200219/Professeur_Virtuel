/**
 * Utilitaires pour la gestion des erreurs d'authentification
 * 
 * Module centralisant la traduction et la gestion des codes d'erreur
 * Firebase Authentication en messages utilisateur compréhensibles en français.
 */

// Fonction de traduction des erreurs d'authentification
/**
 * Convertit les codes d'erreur Firebase en messages utilisateur français.
 * 
 * Prend un objet d'erreur Firebase et retourne un message d'erreur
 * localisé et compréhensible pour l'utilisateur final.
 * 
 * @param error - Objet d'erreur Firebase contenant le code d'erreur
 * @returns Message d'erreur traduit en français
 */
export const getAuthErrorMessage = (error: any): string => {
  const errorCode = error.code || '';
  
  // Correspondance entre codes d'erreur Firebase et messages français
  switch (errorCode) {
    case 'auth/popup-closed-by-user':
      return 'La fenêtre de connexion a été fermée. Veuillez réessayer.';
    case 'auth/popup-blocked':
      return 'La fenêtre de connexion a été bloquée par votre navigateur. Veuillez autoriser les fenêtres contextuelles et réessayer.';
    case 'auth/cancelled-popup-request':
      return 'Un autre processus de connexion est déjà en cours.';
    case 'auth/account-exists-with-different-credential':
      return 'Un compte existe déjà avec la même adresse e-mail mais avec des identifiants de connexion différents. Veuillez essayer de vous connecter avec une méthode différente.';
    case 'auth/invalid-email':
      return 'L\'adresse e-mail n\'est pas valide.';
    case 'auth/user-disabled':
      return 'Ce compte utilisateur a été désactivé.';
    case 'auth/user-not-found':
      return 'Aucun compte utilisateur trouvé avec cette adresse e-mail.';
    case 'auth/wrong-password':
      return 'Le mot de passe est incorrect.';
    case 'auth/email-already-in-use':
      return 'Un compte avec cette adresse e-mail existe déjà.';
    case 'auth/weak-password':
      return 'Le mot de passe est trop faible. Veuillez choisir un mot de passe plus fort.';
    case 'auth/network-request-failed':
      return 'Erreur réseau. Veuillez vérifier votre connexion Internet et réessayer.';
    case 'auth/too-many-requests':
      return 'Trop de tentatives infructueuses. Veuillez réessayer plus tard.';
    case 'auth/requires-recent-login':
      return 'Cette opération nécessite une authentification récente. Veuillez vous reconnecter.';
    default:
      return error.message || 'Une erreur inattendue s\'est produite. Veuillez réessayer.';
  }
};

export const getProviderFromError = (error: any): string | null => {
  const errorCode = error.code || '';
  
  if (errorCode.includes('google')) return 'google';
  if (errorCode.includes('facebook')) return 'facebook';
  if (errorCode.includes('microsoft')) return 'microsoft';
  
  return null;
};
