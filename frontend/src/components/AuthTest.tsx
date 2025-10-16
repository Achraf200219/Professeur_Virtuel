import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

export const AuthTest: React.FC = () => {
  const { user, loginWithGoogle, logout } = useAuth();
  const [testing, setTesting] = useState(false);

  const testGoogleProvider = async () => {
    setTesting(true);
    try {
      await loginWithGoogle();
      toast.success('Google authentication successful!');
    } catch (error: any) {
      toast.error(`Google authentication failed: ${error.message}`);
    } finally {
      setTesting(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      toast.success('Logged out successfully');
    } catch (error: any) {
      toast.error('Logout failed: ' + error.message);
    }
  };

  if (user) {
    return (
      <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-gray-100">
          Authentication Test - Logged In
        </h2>
        <div className="space-y-2 mb-4">
          <p className="text-gray-700 dark:text-gray-300">
            <strong>User ID:</strong> {user.id}
          </p>
          <p className="text-gray-700 dark:text-gray-300">
            <strong>Name:</strong> {user.firstName} {user.lastName}
          </p>
          <p className="text-gray-700 dark:text-gray-300">
            <strong>Email:</strong> {user.email}
          </p>
          <p className="text-gray-700 dark:text-gray-300">
            <strong>Member Since:</strong> {user.createdAt.toLocaleDateString()}
          </p>
        </div>
        <button
          onClick={handleLogout}
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
        >
          Logout
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
      <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-gray-100">
        Authentication Test - Not Logged In
      </h2>
      <div className="space-y-3">
        <button
          onClick={testGoogleProvider}
          disabled={testing}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {testing ? 'Test Google en cours...' : 'Tester la connexion Google'}
        </button>
      </div>
      
      <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
        <p className="text-sm text-yellow-800 dark:text-yellow-200">
          <strong>Note :</strong> Pour que la connexion Google fonctionne, vous devez l'activer dans la Firebase Console. 
          Voir le README.md pour les instructions détaillées.
        </p>
      </div>
    </div>
  );
};