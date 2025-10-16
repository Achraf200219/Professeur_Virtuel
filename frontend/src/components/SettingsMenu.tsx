import React, { useState } from 'react';
import { User, UserProfile } from '../types';
import { Settings, X, LogOut, Key, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';

interface SettingsMenuProps {
  user: User;
  onUpdateProfile: (profile: UserProfile) => void;
  onLogout: () => void;
  onChangePassword: (currentPassword: string, newPassword: string) => Promise<void>;
}

export const SettingsMenu: React.FC<SettingsMenuProps> = ({
  user,
  onUpdateProfile,
  onLogout,
  onChangePassword
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });
  
  const [formData, setFormData] = useState({
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleSave = async () => {
    if (!formData.firstName || !formData.lastName) {
      toast.error('Le prénom et le nom de famille sont requis');
      return;
    }

    setLoading(true);
    try {
      await onUpdateProfile({
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email
      });
      setIsEditing(false);
      toast.success('Profil mis à jour avec succès');
    } catch (error) {
      toast.error('Échec de la mise à jour du profil');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (!formData.currentPassword || !formData.newPassword || !formData.confirmPassword) {
      toast.error('Tous les champs de mot de passe sont requis');
      return;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      toast.error('Les nouveaux mots de passe ne correspondent pas');
      return;
    }

    if (formData.newPassword.length < 6) {
      toast.error('Le nouveau mot de passe doit contenir au moins 6 caractères');
      return;
    }

    setLoading(true);
    try {
      await onChangePassword(formData.currentPassword, formData.newPassword);
      setFormData(prev => ({
        ...prev,
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      }));
      setIsChangingPassword(false);
      toast.success('Mot de passe modifié avec succès');
    } catch (error: any) {
      if (error.code === 'auth/wrong-password') {
        toast.error('Le mot de passe actuel est incorrect');
      } else if (error.code === 'auth/weak-password') {
        toast.error('Le nouveau mot de passe est trop faible');
      } else {
        toast.error('Échec du changement de mot de passe');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    });
    setIsEditing(false);
    setIsChangingPassword(false);
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
        title="Settings"
      >
        <Settings size={20} />
      </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Profile Settings
          </h2>
          <button
            onClick={() => setIsOpen(false)}
            className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Profile Information */}
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Prénom
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleInputChange}
                    className="w-full input-primary text-sm"
                  />
                ) : (
                  <div className="text-sm text-gray-900 dark:text-gray-100 p-2 bg-gray-50 dark:bg-gray-700 rounded">
                    {user.firstName}
                  </div>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Nom de famille
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleInputChange}
                    className="w-full input-primary text-sm"
                  />
                ) : (
                  <div className="text-sm text-gray-900 dark:text-gray-100 p-2 bg-gray-50 dark:bg-gray-700 rounded">
                    {user.lastName}
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Email
              </label>
              <div className="text-sm text-gray-900 dark:text-gray-100 p-2 bg-gray-50 dark:bg-gray-700 rounded">
                {user.email}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                L'e-mail ne peut pas être modifié
              </p>
            </div>
          </div>

          {/* Password Change Section */}
          <div className="space-y-3 border-t border-gray-200 dark:border-gray-700 pt-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Mot de passe
              </h3>
              {!isChangingPassword && (
                <button
                  onClick={() => setIsChangingPassword(true)}
                  className="flex items-center space-x-1 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 text-sm"
                >
                  <Key size={14} />
                  <span>Changer le mot de passe</span>
                </button>
              )}
            </div>

            {isChangingPassword && (
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Mot de passe actuel
                  </label>
                  <div className="relative">
                    <input
                      type={showPasswords.current ? "text" : "password"}
                      name="currentPassword"
                      value={formData.currentPassword}
                      onChange={handleInputChange}
                      className="w-full input-primary text-sm pr-10"
                      placeholder="Entrez le mot de passe actuel"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasswords(prev => ({ ...prev, current: !prev.current }))}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    >
                      {showPasswords.current ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Nouveau mot de passe
                  </label>
                  <div className="relative">
                    <input
                      type={showPasswords.new ? "text" : "password"}
                      name="newPassword"
                      value={formData.newPassword}
                      onChange={handleInputChange}
                      className="w-full input-primary text-sm pr-10"
                      placeholder="Entrez le nouveau mot de passe"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasswords(prev => ({ ...prev, new: !prev.new }))}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    >
                      {showPasswords.new ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Confirmer le nouveau mot de passe
                  </label>
                  <div className="relative">
                    <input
                      type={showPasswords.confirm ? "text" : "password"}
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleInputChange}
                      className="w-full input-primary text-sm pr-10"
                      placeholder="Confirmer le nouveau mot de passe"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasswords(prev => ({ ...prev, confirm: !prev.confirm }))}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    >
                      {showPasswords.confirm ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div className="flex space-x-2">
                  <button
                    onClick={handleChangePassword}
                    disabled={loading}
                    className="btn-primary text-sm disabled:opacity-50"
                  >
                    {loading ? 'Modification...' : 'Changer le mot de passe'}
                  </button>
                  <button
                    onClick={() => {
                      setIsChangingPassword(false);
                      setFormData(prev => ({
                        ...prev,
                        currentPassword: '',
                        newPassword: '',
                        confirmPassword: ''
                      }));
                    }}
                    className="btn-secondary text-sm"
                  >
                    Annuler
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
            {isEditing ? (
              <div className="flex space-x-2">
                <button
                  onClick={handleSave}
                  disabled={loading}
                  className="btn-primary text-sm disabled:opacity-50"
                >
                  {loading ? 'Sauvegarde...' : 'Sauvegarder les modifications'}
                </button>
                <button
                  onClick={handleCancel}
                  className="btn-secondary text-sm"
                >
                  Annuler
                </button>
              </div>
            ) : (
              <button
                onClick={() => setIsEditing(true)}
                className="btn-primary text-sm"
              >
                Modifier le profil
              </button>
            )}

            <button
              onClick={onLogout}
              className="flex items-center space-x-1 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 text-sm"
            >
              <LogOut size={16} />
              <span>Déconnexion</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
