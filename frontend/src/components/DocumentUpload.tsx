import React, { useState } from 'react';
import { useAppStore } from '../store/context';
import { documentsAPI } from '../services/api';
import { Upload, Link, FileText, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

export const DocumentUpload: React.FC = () => {
  const { addDocument } = useAppStore();
  const [isUploading, setIsUploading] = useState(false);
  const [url, setUrl] = useState('');

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.pdf')) {
      toast.error('Seuls les fichiers PDF sont pris en charge');
      return;
    }

    setIsUploading(true);
    try {
      const response = await documentsAPI.uploadPDF(file);
      addDocument(file.name);
      toast.success(response.message);
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Échec du téléchargement du PDF');
    } finally {
      setIsUploading(false);
      // Reset input
      event.target.value = '';
    }
  };

  const handleUrlSubmit = async () => {
    if (!url.trim()) return;

    setIsUploading(true);
    try {
      const response = await documentsAPI.addURL(url.trim());
      addDocument(url.trim());
      toast.success(response.message);
      setUrl('');
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Échec du traitement de l\'URL');
    } finally {
      setIsUploading(false);
    }
  };

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      handleUrlSubmit();
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
        📁 Téléchargement de Données
      </h3>
      
      {/* PDF Upload */}
      <div className="space-y-2">
        <label className="block">
          <div className="card p-4 border-dashed border-2 border-gray-300 dark:border-gray-600 hover:border-primary-500 dark:hover:border-primary-400 transition-colors cursor-pointer">
            <div className="flex items-center justify-center space-x-2">
              {isUploading ? (
                <Loader2 size={20} className="animate-spin text-primary-500" />
              ) : (
                <Upload size={20} className="text-gray-500 dark:text-gray-400" />
              )}
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {isUploading ? 'Téléchargement...' : 'Télécharger PDF'}
              </span>
              <FileText size={16} className="text-gray-400" />
            </div>
          </div>
          <input
            type="file"
            accept=".pdf"
            onChange={handleFileUpload}
            disabled={isUploading}
            className="hidden"
          />
        </label>
      </div>

      {/* URL Input */}
      <div className="space-y-2">
        <div className="flex space-x-2">
          <div className="flex-1">
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Entrez une URL à traiter..."
              disabled={isUploading}
              className="w-full input-primary text-sm"
            />
          </div>
          <button
            onClick={handleUrlSubmit}
            disabled={isUploading || !url.trim()}
            className="btn-primary text-sm px-3 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isUploading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Link size={16} />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
