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
  apiKey: "AIzaSyBXOTOzcDLWsRj9mPLoE_3vqVcXnxNejak",
  authDomain: "virtual-professor-ai.firebaseapp.com",
  projectId: "virtual-professor-ai",
  storageBucket: "virtual-professor-ai.firebasestorage.app",
  messagingSenderId: "683294968765",
  appId: "1:683294968765:web:0b36e30894ad9d99ec20d4",
  measurementId: "G-1H49Q9T5F8"
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
