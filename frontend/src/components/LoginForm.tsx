import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Eye, EyeOff, Mail, Lock, User } from 'lucide-react';
import toast from 'react-hot-toast';
import { SocialSignIn } from './SocialSignIn';
import { getAuthErrorMessage } from '../utils/authErrors';

interface LoginFormProps {
  onSuccess?: () => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({ onSuccess }) => {
  const { login, signup } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: ''
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const validateForm = () => {
    if (!formData.email || !formData.password) {
      toast.error('L\'e-mail et le mot de passe sont requis');
      return false;
    }

    if (!isLogin) {
      if (!formData.firstName || !formData.lastName) {
        toast.error('Le prénom et le nom de famille sont requis');
        return false;
      }
      if (formData.password !== formData.confirmPassword) {
        toast.error('Les mots de passe ne correspondent pas');
        return false;
      }
      if (formData.password.length < 6) {
        toast.error('Le mot de passe doit contenir au moins 6 caractères');
        return false;
      }
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    try {
      if (isLogin) {
        // Login
        await login(formData.email, formData.password);
        toast.success('Welcome back!');
        onSuccess?.();
      } else {
        // Sign up
        await signup(formData.email, formData.password, formData.firstName, formData.lastName);
        toast.success('Account created successfully!');
        onSuccess?.();
      }
    } catch (error: any) {
      console.error('Auth error:', error);
      const errorMessage = getAuthErrorMessage(error);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="flex justify-center mb-4">
            <img 
              src="/logo_llm.png" 
              alt="Professeur Virtuel Logo" 
              className="h-16 w-auto"
            />
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-gray-100">
            Professeur Virtuel
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
            {isLogin ? 'Connectez-vous à votre compte' : 'Créer un nouveau compte'}
          </p>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            {!isLogin && (
              <div className="grid grid-cols-2 gap-4">
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    id="firstName"
                    name="firstName"
                    type="text"
                    required={!isLogin}
                    value={formData.firstName}
                    onChange={handleInputChange}
                    className="pl-10 w-full input-primary"
                    placeholder="Prénom"
                  />
                </div>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    id="lastName"
                    name="lastName"
                    type="text"
                    required={!isLogin}
                    value={formData.lastName}
                    onChange={handleInputChange}
                    className="pl-10 w-full input-primary"
                    placeholder="Nom de famille"
                  />
                </div>
              </div>
            )}
            
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={formData.email}
                onChange={handleInputChange}
                className="pl-10 w-full input-primary"
                placeholder="Adresse e-mail"
              />
            </div>
            
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete={isLogin ? 'current-password' : 'new-password'}
                required
                value={formData.password}
                onChange={handleInputChange}
                className="pl-10 pr-10 w-full input-primary"
                placeholder="Mot de passe"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
            
            {!isLogin && (
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required={!isLogin}
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  className="pl-10 pr-10 w-full input-primary"
                  placeholder="Confirmer le mot de passe"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            )}
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Traitement...' : (isLogin ? 'Se connecter' : 'Créer un compte')}
            </button>
          </div>

          {/* Social Sign-In Options */}
          <SocialSignIn onSuccess={onSuccess} />

          <div className="text-center">
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="text-sm text-primary-600 hover:text-primary-500 dark:text-primary-400 dark:hover:text-primary-300"
            >
              {isLogin ? "Vous n'avez pas de compte ? Inscrivez-vous" : 'Vous avez déjà un compte ? Connectez-vous'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
