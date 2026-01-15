import React, { useState, useEffect, useCallback } from 'react';
import { INITIAL_COURSE_DATA } from './constants';
import { AccordionNode } from './components/AccordionNode';
import { BookOpen, Edit3, Eye, Plus, Undo2, Redo2, Save, Loader2, Lock, LogIn } from 'lucide-react';
import { CourseData, CourseNode } from './types';
import { getSupabaseClient, saveCourseToCloud, loadLatestCourse, uploadFile } from './lib/supabaseClient';

// --- CONFIGURATION SUPABASE ---
// Remplacez ces valeurs par celles de votre projet Supabase
const SUPABASE_URL = "https://ohrudjgrjmtipcdygnuh.supabase.co";
const SUPABASE_KEY = "sb_publishable_F4UuWpIOYmzVrztID8nU1A_LMcwvTp6";

const App: React.FC = () => {
  // Auth State: 'none' | 'public' | 'admin'
  const [authMode, setAuthMode] = useState<'none' | 'public' | 'admin'>('none');
  const [inputCode, setInputCode] = useState('');
  const [authError, setAuthError] = useState(false);

  const [data, setData] = useState<CourseData>(INITIAL_COURSE_DATA);
  const [isEditing, setIsEditing] = useState(false);
  
  // History State
  const [history, setHistory] = useState<CourseData[]>([]);
  const [future, setFuture] = useState<CourseData[]>([]);

  // Supabase State
  const [currentCloudId, setCurrentCloudId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);

  // Load data from Supabase
  const initialLoad = async () => {
    let cloudLoaded = false;

    // 1. Try Loading from Cloud
    if (!SUPABASE_URL.includes("VOTRE_URL") && SUPABASE_KEY) {
        try {
            const client = getSupabaseClient(SUPABASE_URL, SUPABASE_KEY);
            const result = await loadLatestCourse(client);
            if (result && result.data) {
                setData(result.data);
                setCurrentCloudId(result.id);
                cloudLoaded = true;
            }
        } catch (error) {
            console.error("Erreur chargement cloud:", error);
            // Don't show error to user on load, just fallback silently
        }
    }

    // 2. If Cloud failed or empty, try Local Storage
    if (!cloudLoaded) {
        const localBackup = localStorage.getItem('course_data_backup');
        if (localBackup) {
            try {
                const parsed = JSON.parse(localBackup);
                setData(parsed);
                console.log("Loaded from local backup");
            } catch (e) {
                console.error("Local backup corrupted");
            }
        }
    }

    setIsLoading(false);
  };

  // --- Authentication Handler ---
  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    const startSession = async (mode: 'public' | 'admin') => {
        setIsLoading(true); // Active le loader AVANT de changer d'écran
        setAuthMode(mode);
        // On attend que les données soient chargées avant d'enlever le loader (via le finally de initialLoad)
        await initialLoad(); 
    };

    if (inputCode === 'MICHEL10') {
        await startSession('public');
    } else if (inputCode === 'KALIM2026') {
        await startSession('admin');
    } else {
        setAuthError(true);
        setTimeout(() => setAuthError(false), 2000);
    }
  };

  // --- Data Management ---

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

  const handleSave = async () => {
    // 1. Always save to LocalStorage as backup
    try {
        localStorage.setItem('course_data_backup', JSON.stringify(data));
    } catch (e) {
        console.warn("Local storage write failed");
    }

    if (SUPABASE_URL.includes("VOTRE_URL") || !SUPABASE_KEY) {
        setStatusMessage({ type: 'success', text: 'Sauvegardé localement (Supabase non configuré)' });
        return;
    }

    setIsLoading(true);
    try {
        const client = getSupabaseClient(SUPABASE_URL, SUPABASE_KEY);
        const result = await saveCourseToCloud(client, data, currentCloudId || undefined);
        setCurrentCloudId(result.id);
        setStatusMessage({ type: 'success', text: 'Modifications enregistrées sur le Cloud !' });
    } catch (error: any) {
        console.error(error);
        if (error.message?.includes('row-level security') || error.message?.includes('policy')) {
             setStatusMessage({ type: 'error', text: 'Sauvegardé localement (Cloud bloqué par RLS)' });
        } else {
             setStatusMessage({ type: 'error', text: 'Sauvegardé localement (Erreur Cloud: ' + error.message + ')' });
        }
    } finally {
        setIsLoading(false);
        setTimeout(() => setStatusMessage(null), 4000);
    }
  };

  const handleUpload = async (file: File): Promise<string> => {
     if (SUPABASE_URL.includes("VOTRE_URL") || !SUPABASE_KEY) {
        throw new Error("Supabase config missing");
    }
    try {
        const client = getSupabaseClient(SUPABASE_URL, SUPABASE_KEY);
        return await uploadFile(client, file);
    } catch (error: any) {
        if (error.message?.includes('row-level security') || error.message?.includes('policy')) {
             throw new Error("Upload bloqué. Vérifiez les politiques RLS du Storage Supabase.");
        }
        throw error;
    }
  };

  // --- Keyboard Shortcuts ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isEditing || authMode !== 'admin') return;

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
        if (e.shiftKey) {
            e.preventDefault();
            redo();
        } else {
            e.preventDefault();
            undo();
        }
      }
      
      // Save shortcut (Ctrl+S)
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
          e.preventDefault();
          handleSave();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isEditing, undo, redo, authMode, data]);

  // --- Handlers for Content ---

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


  // --- VIEW: LOGIN SCREEN ---
  if (authMode === 'none') {
      return (
          <div className="min-h-screen w-full flex items-center justify-center bg-gray-50 px-4">
              <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 border border-gray-100 animate-fadeIn">
                  <div className="flex justify-center mb-6">
                      <div className="w-16 h-16 bg-gray-900 rounded-xl flex items-center justify-center text-white shadow-lg">
                          <Lock size={32} />
                      </div>
                  </div>
                  <h2 className="text-2xl font-bold text-center text-gray-900 mb-2">Accès Sécurisé</h2>
                  <p className="text-center text-gray-500 mb-8">Veuillez entrer votre code d'accès.</p>
                  
                  <form onSubmit={handleLogin} className="space-y-4">
                      <input 
                          type="password"
                          value={inputCode}
                          onChange={(e) => setInputCode(e.target.value)}
                          className={`w-full p-4 text-center text-lg tracking-widest border rounded-xl focus:outline-none focus:ring-2 transition-all ${authError ? 'border-red-500 focus:ring-red-200 bg-red-50' : 'border-gray-200 focus:ring-gray-200 bg-gray-50'}`}
                          placeholder="CODE"
                          autoFocus
                      />
                      <button 
                          type="submit"
                          className="w-full py-4 bg-gray-900 text-white rounded-xl font-semibold hover:bg-black transition-colors flex items-center justify-center gap-2"
                      >
                          {isLoading ? <Loader2 size={20} className="animate-spin" /> : <LogIn size={20} />}
                          Entrer
                      </button>
                  </form>
              </div>
          </div>
      );
  }

  // --- VIEW: LOADING SCREEN (NEW) ---
  if (isLoading) {
      return (
          <div className="min-h-screen w-full flex flex-col items-center justify-center bg-white animate-fadeIn">
              <div className="flex flex-col items-center gap-4">
                  <Loader2 size={40} className="text-gray-900 animate-spin" strokeWidth={1.5} />
                  <p className="text-gray-400 text-sm font-light tracking-widest uppercase">Chargement du cours...</p>
              </div>
          </div>
      );
  }

  // --- VIEW: MAIN APP ---
  return (
    <div className="min-h-screen w-full bg-white flex flex-col items-center">
      
      {/* Toast Notification */}
      {statusMessage && (
          <div className={`fixed top-20 right-6 z-[60] px-4 py-3 rounded-lg shadow-xl text-sm font-medium animate-fadeIn ${
              statusMessage.type.includes('success') ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
          }`}>
              {statusMessage.text}
          </div>
      )}

      {/* Admin Floating Bar (Only if Admin) */}
      {authMode === 'admin' && (
        <div className="fixed top-6 right-6 z-50 flex gap-3">
            {/* Undo/Redo & Save Group */}
            {isEditing && (
                <div className="flex bg-white rounded-full shadow-lg border border-gray-200 p-1">
                    <button 
                        onClick={undo} 
                        disabled={history.length === 0}
                        className="p-2 rounded-full hover:bg-gray-100 disabled:opacity-30 text-gray-700 transition-colors"
                        title="Annuler (Ctrl+Z)"
                    >
                        <Undo2 size={18} />
                    </button>
                    <div className="w-px bg-gray-200 my-1 mx-1"></div>
                    <button 
                        onClick={redo} 
                        disabled={future.length === 0}
                        className="p-2 rounded-full hover:bg-gray-100 disabled:opacity-30 text-gray-700 transition-colors"
                        title="Rétablir (Ctrl+Shift+Z)"
                    >
                        <Redo2 size={18} />
                    </button>
                    <div className="w-px bg-gray-200 my-1 mx-1"></div>
                    <button 
                        onClick={handleSave} 
                        disabled={isLoading}
                        className="p-2 rounded-full hover:bg-blue-50 text-blue-600 transition-colors"
                        title="Enregistrer les modifications (Ctrl+S)"
                    >
                        {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                    </button>
                </div>
            )}

            {/* Edit Toggle */}
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
                onUpload={handleUpload}
            />
          ))}

          {/* Add Chapter Button (Edit Mode Only) */}
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
        {authMode === 'public' && (
            <button 
                onClick={() => setAuthMode('none')}
                className="mt-4 text-xs text-gray-300 hover:text-gray-500 underline"
            >
                Connexion Admin
            </button>
        )}
      </footer>
    </div>
  );
};

export default App;