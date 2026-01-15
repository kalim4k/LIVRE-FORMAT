import React, { useState, useEffect, useCallback } from 'react';
import { INITIAL_COURSE_DATA } from './constants';
import { AccordionNode } from './components/AccordionNode';
import { BookOpen, Edit3, Eye, Plus, Undo2, Redo2, Cloud, Settings, X, Save, Download, Loader2 } from 'lucide-react';
import { CourseData, CourseNode } from './types';
import { getSupabaseClient, saveCourseToCloud, loadLatestCourse } from './lib/supabaseClient';

const App: React.FC = () => {
  const [data, setData] = useState<CourseData>(INITIAL_COURSE_DATA);
  const [isEditing, setIsEditing] = useState(false);
  
  // History State
  const [history, setHistory] = useState<CourseData[]>([]);
  const [future, setFuture] = useState<CourseData[]>([]);

  // Supabase & Settings State
  const [showSettings, setShowSettings] = useState(false);
  const [supabaseUrl, setSupabaseUrl] = useState(() => localStorage.getItem('sb_url') || '');
  const [supabaseKey, setSupabaseKey] = useState(() => localStorage.getItem('sb_key') || '');
  const [currentCloudId, setCurrentCloudId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);

  // Centralized update function to manage history
  const updateData = useCallback((newData: CourseData) => {
    setHistory(prev => [...prev, data]);
    setFuture([]);
    setData(newData);
  }, [data]);

  const undo = useCallback(() => {
    if (history.length === 0) return;
    const previous = history[history.length - 1];
    const newHistory = history.slice(0, -1);
    
    setFuture(prev => [data, ...prev]);
    setData(previous);
    setHistory(newHistory);
  }, [history, data]);

  const redo = useCallback(() => {
    if (future.length === 0) return;
    const next = future[0];
    const newFuture = future.slice(1);
    
    setHistory(prev => [...prev, data]);
    setData(next);
    setFuture(newFuture);
  }, [future, data]);

  // Keyboard Shortcuts (Ctrl+Z / Ctrl+Shift+Z)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isEditing) return;

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
        if (e.shiftKey) {
            e.preventDefault();
            redo();
        } else {
            e.preventDefault();
            undo();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isEditing, undo, redo]);

  // --- Supabase Handlers ---

  const handleSaveSettings = () => {
      localStorage.setItem('sb_url', supabaseUrl);
      localStorage.setItem('sb_key', supabaseKey);
      setStatusMessage({ type: 'success', text: 'Configuration sauvegardée !' });
      setTimeout(() => setStatusMessage(null), 2000);
  };

  const handleCloudSave = async () => {
    if (!supabaseUrl || !supabaseKey) {
        setShowSettings(true);
        return;
    }
    
    setIsLoading(true);
    setStatusMessage(null);
    try {
        const client = getSupabaseClient(supabaseUrl, supabaseKey);
        const result = await saveCourseToCloud(client, data, currentCloudId || undefined);
        setCurrentCloudId(result.id);
        setStatusMessage({ type: 'success', text: 'Cours sauvegardé dans le cloud !' });
    } catch (error: any) {
        console.error(error);
        setStatusMessage({ type: 'error', text: 'Erreur: ' + (error.message || 'Impossible de sauvegarder') });
    } finally {
        setIsLoading(false);
        setTimeout(() => setStatusMessage(null), 3000);
    }
  };

  const handleCloudLoad = async () => {
    if (!supabaseUrl || !supabaseKey) {
        setShowSettings(true);
        return;
    }

    if (!window.confirm("Attention : Charger depuis le cloud écrasera les modifications non sauvegardées. Continuer ?")) {
        return;
    }

    setIsLoading(true);
    setStatusMessage(null);
    try {
        const client = getSupabaseClient(supabaseUrl, supabaseKey);
        const result = await loadLatestCourse(client);
        if (result && result.data) {
            updateData(result.data); // Use updateData to push current to history before overwrite
            setCurrentCloudId(result.id);
            setStatusMessage({ type: 'success', text: 'Cours chargé avec succès !' });
            setShowSettings(false); // Close settings if open
        } else {
             setStatusMessage({ type: 'error', text: 'Aucun cours trouvé.' });
        }
    } catch (error: any) {
        console.error(error);
        setStatusMessage({ type: 'error', text: 'Erreur: ' + (error.message || 'Impossible de charger') });
    } finally {
        setIsLoading(false);
        setTimeout(() => setStatusMessage(null), 3000);
    }
  };

  // --- Handlers for Root Level Updates ---

  const handleUpdateNode = (updatedNode: CourseNode) => {
    const newOutline = data.outline.map(node => node.id === updatedNode.id ? updatedNode : node);
    updateData({ ...data, outline: newOutline });
  };

  const handleDeleteNode = (id: string) => {
    const newOutline = data.outline.filter(node => node.id !== id);
    updateData({ ...data, outline: newOutline });
  };

  const addRootChapter = () => {
      const newChapter: CourseNode = {
          id: Date.now().toString(),
          title: "Nouveau Chapitre",
          children: [],
          content: []
      };
      updateData({ ...data, outline: [...data.outline, newChapter] });
  };

  const updateHeader = (field: keyof CourseData, value: string) => {
      updateData({ ...data, [field]: value });
  };

  return (
    <div className="min-h-screen w-full bg-white flex flex-col items-center">
      
      {/* Control Bar (Floating or Fixed Top) */}
      <div className="fixed top-6 right-6 z-50 flex gap-3">
        {/* Undo/Redo Controls */}
        {isEditing && (
            <div className="flex bg-white rounded-full shadow-lg border border-gray-200 p-1">
                <button 
                    onClick={undo} 
                    disabled={history.length === 0}
                    className="p-2 rounded-full hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-transparent text-gray-700 transition-colors"
                    title="Annuler (Ctrl+Z)"
                >
                    <Undo2 size={18} />
                </button>
                <div className="w-px bg-gray-200 my-1 mx-1"></div>
                <button 
                    onClick={redo} 
                    disabled={future.length === 0}
                    className="p-2 rounded-full hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-transparent text-gray-700 transition-colors"
                    title="Rétablir (Ctrl+Shift+Z)"
                >
                    <Redo2 size={18} />
                </button>
            </div>
        )}

        {/* Cloud / Settings Control */}
        <div className="flex bg-white rounded-full shadow-lg border border-gray-200 p-1">
            <button 
                onClick={handleCloudSave}
                disabled={isLoading}
                className="p-2 rounded-full hover:bg-gray-100 text-blue-600 transition-colors relative"
                title="Sauvegarder dans le cloud"
            >
                {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Cloud size={18} />}
            </button>
            <div className="w-px bg-gray-200 my-1 mx-1"></div>
            <button 
                onClick={() => setShowSettings(true)}
                className="p-2 rounded-full hover:bg-gray-100 text-gray-700 transition-colors"
                title="Paramètres Cloud"
            >
                <Settings size={18} />
            </button>
        </div>

        <button
          onClick={() => setIsEditing(!isEditing)}
          className={`
            flex items-center gap-2 px-4 py-2 rounded-full shadow-lg transition-all duration-300
            ${isEditing ? 'bg-gray-900 text-white' : 'bg-white text-gray-900 border border-gray-200'}
          `}
        >
          {isEditing ? <Eye size={18} /> : <Edit3 size={18} />}
          <span className="text-sm font-medium">{isEditing ? 'Aperçu' : 'Éditer'}</span>
        </button>
      </div>

      {/* Status Toast */}
      {statusMessage && (
          <div className={`fixed top-20 right-6 z-50 px-4 py-3 rounded-lg shadow-xl text-sm font-medium animate-fadeIn ${
              statusMessage.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
          }`}>
              {statusMessage.text}
          </div>
      )}

      {/* Settings Modal */}
      {showSettings && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/20 backdrop-blur-sm p-4 animate-fadeIn">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 border border-gray-100">
                  <div className="flex justify-between items-center mb-6">
                      <h2 className="text-xl font-semibold text-gray-900">Connexion Supabase</h2>
                      <button onClick={() => setShowSettings(false)} className="text-gray-400 hover:text-gray-900">
                          <X size={24} />
                      </button>
                  </div>
                  
                  <div className="space-y-4 mb-6">
                      <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Project URL</label>
                          <input 
                            value={supabaseUrl}
                            onChange={(e) => setSupabaseUrl(e.target.value)}
                            className="w-full p-2 bg-gray-50 border border-gray-200 rounded focus:border-blue-500 outline-none text-sm"
                            placeholder="https://xyz.supabase.co"
                          />
                      </div>
                      <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Anon Public Key</label>
                          <input 
                            value={supabaseKey}
                            onChange={(e) => setSupabaseKey(e.target.value)}
                            type="password"
                            className="w-full p-2 bg-gray-50 border border-gray-200 rounded focus:border-blue-500 outline-none text-sm"
                            placeholder="eyJbh..."
                          />
                      </div>
                      <button 
                        onClick={handleSaveSettings}
                        className="w-full py-2 bg-gray-900 text-white rounded hover:bg-black transition-colors text-sm font-medium"
                      >
                          Sauvegarder la configuration
                      </button>
                  </div>

                  <div className="border-t border-gray-100 pt-6">
                      <h3 className="text-sm font-semibold text-gray-900 mb-3">Actions</h3>
                      <div className="grid grid-cols-2 gap-3">
                          <button 
                            onClick={handleCloudSave}
                            disabled={isLoading}
                            className="flex items-center justify-center gap-2 py-3 px-4 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg transition-colors font-medium text-sm"
                          >
                              {isLoading ? <Loader2 size={16} className="animate-spin"/> : <Save size={16} />}
                              Sauvegarder
                          </button>
                          <button 
                            onClick={handleCloudLoad}
                            disabled={isLoading}
                            className="flex items-center justify-center gap-2 py-3 px-4 bg-gray-50 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors font-medium text-sm"
                          >
                              {isLoading ? <Loader2 size={16} className="animate-spin"/> : <Download size={16} />}
                              Charger
                          </button>
                      </div>
                      <p className="mt-4 text-xs text-gray-400 text-center leading-relaxed">
                          Nécessite une table SQL <code>courses</code> avec une colonne <code>data (jsonb)</code>.
                      </p>
                  </div>
              </div>
          </div>
      )}

      {/* Top Navigation / Header */}
      <header className={`w-full max-w-3xl px-6 py-12 md:py-20 flex flex-col gap-4 animate-fadeIn ${isEditing ? 'border-2 border-dashed border-gray-100 rounded-xl m-4' : ''}`}>
        <div className="w-12 h-12 bg-gray-900 rounded-lg flex items-center justify-center text-white mb-4 shadow-lg shadow-gray-200">
            <BookOpen size={24} />
        </div>
        
        {isEditing ? (
            <input 
                value={data.title}
                onChange={(e) => updateHeader('title', e.target.value)}
                className="text-3xl md:text-4xl font-semibold tracking-tight text-gray-900 bg-transparent border-b border-gray-200 focus:border-blue-500 outline-none w-full placeholder-gray-300"
                placeholder="Titre du cours"
            />
        ) : (
            <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-gray-900">
                {data.title}
            </h1>
        )}

        {isEditing ? (
            <textarea 
                value={data.description}
                onChange={(e) => updateHeader('description', e.target.value)}
                className="text-lg md:text-xl text-gray-500 font-light max-w-xl leading-relaxed bg-transparent resize-none border-b border-gray-200 focus:border-blue-500 outline-none w-full placeholder-gray-300"
                placeholder="Description courte de la formation..."
                rows={2}
            />
        ) : (
            <p className="text-lg md:text-xl text-gray-500 font-light max-w-xl leading-relaxed">
                {data.description}
            </p>
        )}

        <div className="flex items-center gap-2 mt-2 text-xs font-medium uppercase tracking-widest text-gray-400">
            <span>By</span>
            {isEditing ? (
                <input 
                    value={data.author}
                    onChange={(e) => updateHeader('author', e.target.value)}
                    className="bg-transparent border-b border-gray-200 focus:border-blue-500 outline-none w-24 placeholder-gray-300"
                    placeholder="Auteur"
                />
            ) : (
                <span>{data.author}</span>
            )}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="w-full max-w-3xl px-4 md:px-0 pb-32">
        {/* Table of Contents / Course Structure */}
        <div className="border-t border-gray-100">
          {data.outline.length === 0 && !isEditing && (
              <div className="py-20 text-center text-gray-400 font-light">
                  Ce cours est vide pour le moment.
              </div>
          )}

          {data.outline.map((node) => (
            <AccordionNode 
                key={node.id} 
                node={node} 
                isEditing={isEditing}
                onChange={handleUpdateNode}
                onDelete={() => handleDeleteNode(node.id)}
            />
          ))}

          {/* Add Chapter Button (Edit Mode) */}
          {isEditing && (
             <button 
                onClick={addRootChapter}
                className="w-full py-6 flex items-center justify-center gap-2 text-gray-400 hover:text-gray-900 hover:bg-gray-50 border-b border-gray-100 transition-all duration-200 group"
             >
                 <div className="p-2 rounded-full border border-gray-200 group-hover:border-gray-900 transition-colors">
                     <Plus size={20} />
                 </div>
                 <span className="font-medium">Ajouter un grand chapitre</span>
             </button>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full py-12 text-center text-gray-400 text-sm border-t border-gray-50 mt-auto">
        <p>&copy; {new Date().getFullYear()} {data.author}. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default App;