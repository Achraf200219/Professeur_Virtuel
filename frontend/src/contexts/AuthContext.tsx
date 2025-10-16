import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, UserProfile } from '../types';
import { auth, db, googleProvider } from '../firebase/config';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  User as FirebaseUser,
  onAuthStateChanged,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  query,
  where,
  orderBy,
  getDocs,
  addDoc,
  serverTimestamp
} from 'firebase/firestore';
import { Conversation } from '../types';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, firstName: string, lastName: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (profile: UserProfile) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  getUserConversations: () => Promise<Conversation[]>;
  saveConversation: (conversation: Omit<Conversation, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => Promise<string>;
  updateConversation: (conversationId: string, updates: Partial<Conversation>) => Promise<void>;
  deleteConversation: (conversationId: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      if (firebaseUser) {
        // Récupérer le profil utilisateur depuis Firestore
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        const userDoc = await getDoc(userDocRef);
        
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setUser({
            id: firebaseUser.uid,
            email: firebaseUser.email!,
            firstName: userData.firstName,
            lastName: userData.lastName,
            createdAt: userData.createdAt?.toDate() || new Date()
          });
        } else {
          // Gérer le cas où le profil utilisateur n'existe pas (ne devrait pas arriver avec notre nouveau flux)
          // Analyser le nom d'affichage de l'utilisateur Firebase
          const displayName = firebaseUser.displayName || '';
          const nameParts = displayName.split(' ');
          const firstName = nameParts[0] || 'User';
          const lastName = nameParts.slice(1).join(' ') || '';
          
          setUser({
            id: firebaseUser.uid,
            email: firebaseUser.email!,
            firstName,
            lastName,
            createdAt: new Date()
          });
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error: any) {
      throw new Error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const signup = async (email: string, password: string, firstName: string, lastName: string) => {
    setLoading(true);
    try {
      const { user: firebaseUser } = await createUserWithEmailAndPassword(auth, email, password);
      
      // Créer un profil utilisateur dans Firestore
      await setDoc(doc(db, 'users', firebaseUser.uid), {
        firstName,
        lastName,
        email,
        createdAt: serverTimestamp()
      });
    } catch (error: any) {
      throw new Error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const createOrUpdateUserProfile = async (firebaseUser: FirebaseUser, additionalData?: any) => {
    const userDocRef = doc(db, 'users', firebaseUser.uid);
    const userDoc = await getDoc(userDocRef);
    
    if (!userDoc.exists()) {
      // Analyser le nom d'affichage en prénom et nom de famille
      const displayName = firebaseUser.displayName || '';
      const nameParts = displayName.split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';
      
      // Créer un nouveau profil utilisateur
      await setDoc(userDocRef, {
        firstName,
        lastName,
        email: firebaseUser.email,
        createdAt: serverTimestamp(),
        ...additionalData
      });
    }
  };

  const loginWithGoogle = async () => {
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      await createOrUpdateUserProfile(result.user, { provider: 'google' });
    } catch (error: any) {
      throw new Error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    await signOut(auth);
  };

  const updateProfile = async (profile: UserProfile) => {
    if (!user) throw new Error('No user logged in');
    
    const userDocRef = doc(db, 'users', user.id);
    await updateDoc(userDocRef, {
      firstName: profile.firstName,
      lastName: profile.lastName,
      updatedAt: serverTimestamp()
    });

    setUser(prev => prev ? {
      ...prev,
      firstName: profile.firstName,
      lastName: profile.lastName
    } : null);
  };

  const changePassword = async (currentPassword: string, newPassword: string) => {
    if (!user) throw new Error('No user logged in');
    
    const firebaseUser = auth.currentUser;
    if (!firebaseUser || !firebaseUser.email) throw new Error('No authenticated user found');

    // Ré-authentifier l'utilisateur avant de changer le mot de passe
    const credential = EmailAuthProvider.credential(firebaseUser.email, currentPassword);
    await reauthenticateWithCredential(firebaseUser, credential);
    
    // Mettre à jour le mot de passe
    await updatePassword(firebaseUser, newPassword);
  };

  const getUserConversations = async (): Promise<Conversation[]> => {
    if (!user) return [];

    const conversationsRef = collection(db, 'conversations');
    const q = query(
      conversationsRef,
      where('userId', '==', user.id)
    );
    
    const querySnapshot = await getDocs(q);
    const conversations: Conversation[] = [];
    
    querySnapshot.forEach((doc: any) => {
      const data = doc.data();
      conversations.push({
        id: doc.id,
        userId: data.userId,
        title: data.title,
        messages: data.messages || [],
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
        config: data.config
      });
    });
    
    // Sort client-side if no composite index
    return conversations.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  };

  const saveConversation = async (conversation: Omit<Conversation, 'id' | 'userId' | 'createdAt' | 'updatedAt'>): Promise<string> => {
    if (!user) throw new Error('No user logged in');

    const conversationsRef = collection(db, 'conversations');
    const docRef = await addDoc(conversationsRef, {
      ...conversation,
      userId: user.id,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    return docRef.id;
  };

  const updateConversation = async (conversationId: string, updates: Partial<Conversation>) => {
    if (!user) throw new Error('No user logged in');

    const conversationRef = doc(db, 'conversations', conversationId);
    await updateDoc(conversationRef, {
      ...updates,
      updatedAt: serverTimestamp()
    });
  };

  const deleteConversation = async (conversationId: string) => {
    if (!user) throw new Error('No user logged in');

    const conversationRef = doc(db, 'conversations', conversationId);
    // Supprimer le document depuis Firestore
    await deleteDoc(conversationRef);
    
    // Supprimer également les données de conversation depuis la mémoire backend et le cache
    try {
      const response = await fetch(`http://localhost:8000/api/conversations/${conversationId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        console.warn('Failed to delete conversation data from backend:', response.statusText);
      }
    } catch (error) {
      console.warn('Error deleting conversation data from backend:', error);
      // Ne pas lancer d'erreur ici car la suppression principale (Firestore) a réussi
    }
  };

  const value = {
    user,
    loading,
    login,
    signup,
    loginWithGoogle,
    logout,
    updateProfile,
    changePassword,
    getUserConversations,
    saveConversation,
    updateConversation,
    deleteConversation
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
