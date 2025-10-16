import React, { useState } from 'react';
import { ChatMessage as ChatMessageType } from '../types';
import { ChevronDown, ChevronUp, FileText, Globe, Brain, Copy, Edit2, Check, X } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { tomorrow } from 'react-syntax-highlighter/dist/esm/styles/prism';
import toast from 'react-hot-toast';

interface ChatMessageProps {
  message: ChatMessageType;
  onEdit?: (newContent: string) => void;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ message, onEdit }) => {
  const [showThinking, setShowThinking] = useState(false);
  const [showSources, setShowSources] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);

  const isUser = message.role === 'user';

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Copied to clipboard!');
    } catch (err) {
      toast.error('Échec de la copie');
    }
  };

  const handleEditSave = () => {
    if (editContent.trim() !== message.content && onEdit) {
      onEdit(editContent.trim());
    }
    setIsEditing(false);
  };

  const handleEditCancel = () => {
    setEditContent(message.content);
    setIsEditing(false);
  };

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-3xl ${isUser ? 'ml-12' : 'mr-12'}`}>
        {/* Message bubble */}
        <div
          className={`
            p-4 rounded-lg relative group
            ${isUser
              ? 'bg-primary-600 text-white'
              : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700'
            }
          `}
        >
          {/* User message */}
          {isUser ? (
            <div className="space-y-2">
              {isEditing ? (
                <div className="space-y-2">
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className="w-full p-2 bg-white/10 border border-white/20 rounded text-white placeholder-white/70 resize-none"
                    rows={Math.max(2, editContent.split('\n').length)}
                  />
                  <div className="flex justify-end space-x-2">
                    <button
                      onClick={handleEditSave}
                      className="p-1 bg-white/20 hover:bg-white/30 rounded transition-colors"
                    >
                      <Check size={16} />
                    </button>
                    <button
                      onClick={handleEditCancel}
                      className="p-1 bg-white/20 hover:bg-white/30 rounded transition-colors"
                    >
                      <X size={16} />
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="text-sm whitespace-pre-wrap">{message.content}</div>
                  <div className="flex justify-end space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => copyToClipboard(message.content)}
                      className="p-1 bg-white/20 hover:bg-white/30 rounded transition-colors"
                      title="Copier le message"
                    >
                      <Copy size={14} />
                    </button>
                    {onEdit && (
                      <button
                        onClick={() => setIsEditing(true)}
                        className="p-1 bg-white/20 hover:bg-white/30 rounded transition-colors"
                        title="Edit message"
                      >
                        <Edit2 size={14} />
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          ) : (
            /* Assistant message */
            <div className="space-y-3">
              {/* Copy button for assistant message */}
              <div className="flex justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => copyToClipboard(message.content)}
                  className="p-1 bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 rounded transition-colors"
                  title="Copier la réponse"
                >
                  <Copy size={14} />
                </button>
              </div>

              {/* Thinking process toggle */}
              {message.thinking_process && (
                <button
                  onClick={() => setShowThinking(!showThinking)}
                  className="flex items-center space-x-1 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
                >
                  <Brain size={16} />
                  <span>Voir le processus de réflexion</span>
                  {showThinking ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
              )}

              {/* Thinking process content */}
              {showThinking && message.thinking_process && (
                <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-3 text-sm">
                  <div className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                    {message.thinking_process}
                  </div>
                </div>
              )}

              {/* Main response with Markdown */}
              <div className="text-gray-900 dark:text-gray-100 prose prose-sm dark:prose-invert max-w-none">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    code({ className, children, ...props }: any) {
                      const match = /language-(\w+)/.exec(className || '');
                      const code = String(children).replace(/\n$/, '');
                      const isInline = !match;
                      
                      return !isInline ? (
                        <div className="relative">
                          <SyntaxHighlighter
                            style={tomorrow}
                            language={match[1]}
                            PreTag="div"
                            className="rounded-lg"
                            {...props}
                          >
                            {code}
                          </SyntaxHighlighter>
                          <button
                            onClick={() => copyToClipboard(code)}
                            className="absolute top-2 right-2 p-1 bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors"
                            title="Copy code"
                          >
                            <Copy size={14} />
                          </button>
                        </div>
                      ) : (
                        <code className={className} {...props}>
                          {children}
                        </code>
                      );
                    },
                    table({ children }) {
                      return (
                        <div className="overflow-x-auto my-4">
                          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg">
                            {children}
                          </table>
                        </div>
                      );
                    },
                    thead({ children }) {
                      return (
                        <thead className="bg-gray-50 dark:bg-gray-700">
                          {children}
                        </thead>
                      );
                    },
                    tbody({ children }) {
                      return (
                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                          {children}
                        </tbody>
                      );
                    },
                    tr({ children }) {
                      return (
                        <tr className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                          {children}
                        </tr>
                      );
                    },
                    th({ children }) {
                      return (
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider border-r border-gray-300 dark:border-gray-600 last:border-r-0">
                          {children}
                        </th>
                      );
                    },
                    td({ children }) {
                      return (
                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100 border-r border-gray-200 dark:border-gray-600 last:border-r-0 break-words">
                          <div className="max-w-xs overflow-hidden">
                            {children}
                          </div>
                        </td>
                      );
                    },
                  }}
                >
                  {message.content}
                </ReactMarkdown>
              </div>

              {/* Sources toggle */}
              {message.sources && message.sources.length > 0 && (
                <button
                  onClick={() => setShowSources(!showSources)}
                  className="flex items-center space-x-1 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
                >
                  <FileText size={16} />
                  <span>See document sources ({message.sources.length})</span>
                  {showSources ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
              )}

              {/* Sources content */}
              {showSources && message.sources && (
                <div className="space-y-2">
                  {message.sources.map((source) => (
                    <div key={source.id} className="bg-gray-100 dark:bg-gray-700 rounded-lg p-3">
                      <div className="flex items-center space-x-2 mb-2">
                        {source.type === 'pdf' ? (
                          <FileText size={16} className="text-red-500" />
                        ) : (
                          <Globe size={16} className="text-blue-500" />
                        )}
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          Source {source.id} from {source.name}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {source.content}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Search type indicator */}
              {message.search_type && message.search_type !== 'none' && (
                <div className="flex items-center space-x-1 text-xs text-gray-500 dark:text-gray-400">
                  {message.search_type === 'document' ? (
                    <>
                      <FileText size={12} />
                      <span>Information from documents</span>
                    </>
                  ) : message.search_type === 'web' ? (
                    <>
                      <Globe size={12} />
                      <span>Information from web search</span>
                    </>
                  ) : null}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Timestamp */}
        <div className={`text-xs text-gray-500 dark:text-gray-400 mt-1 ${isUser ? 'text-right' : 'text-left'}`}>
          {new Date().toLocaleTimeString()}
        </div>
      </div>
    </div>
  );
};
