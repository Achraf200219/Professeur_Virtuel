/**
 * Configuration Firebase pour l'application RAG Assistant
 * 
 * Initialise les services Firebase nécessaires à l'application :
 * authentification, base de données Firestore et fournisseur Google.
 * Centralise la configuration pour un accès global aux services.
 */

// Configuration Firebase
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Paramètres de configuration du projet Firebase
const firebaseConfig = {
  apiKey: "",
  authDomain: "",
  projectId: "",
  storageBucket: "",
  messagingSenderId: "",
  appId: "",
  measurementId: ""
};

// Initialisation de l'application Firebase
const app = initializeApp(firebaseConfig);

// Initialisation de l'authentification Firebase et récupération de la référence du service
export const auth = getAuth(app);

// Initialisation de Cloud Firestore et récupération de la référence du service
export const db = getFirestore(app);

// Initialisation du fournisseur d'authentification Google
export const googleProvider = new GoogleAuthProvider();

// Configuration du fournisseur Google avec les scopes nécessaires
googleProvider.addScope('email');  // Accès à l'adresse email
googleProvider.addScope('profile');  // Accès aux informations de profil

export default app;