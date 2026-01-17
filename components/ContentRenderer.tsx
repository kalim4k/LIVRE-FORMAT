
import React, { useState, useRef, useEffect } from 'react';
import { ContentBlock, QuizData } from '../types';
import { ExternalLink, Image as ImageIcon, PlayCircle, Trash2, Upload, CheckCircle2, XCircle, HelpCircle, Plus, X, EyeOff, Bold, Italic } from 'lucide-react';

interface ContentRendererProps {
  blocks: ContentBlock[];
  isEditing: boolean;
  onUpdate: (newBlocks: ContentBlock[]) => void;
  onUpload?: (file: File) => Promise<string>;
}

export const ContentRenderer: React.FC<ContentRendererProps> = ({ blocks, isEditing, onUpdate, onUpload }) => {
  if (!blocks || blocks.length === 0) return null;

  // State for the floating toolbar
  const [toolbarVisible, setToolbarVisible] = useState(false);
  const [toolbarPosition, setToolbarPosition] = useState({ top: 0, left: 0 });
  const [currentSelectionRange, setCurrentSelectionRange] = useState<Range | null>(null);
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);

  const handleChange = (id: string, field: keyof ContentBlock, newValue: string) => {
    const updated = blocks.map(b => b.id === id ? { ...b, [field]: newValue } : b);
    onUpdate(updated);
  };

  const handleDelete = (id: string) => {
    const updated = blocks.filter(b => b.id !== id);
    onUpdate(updated);
  };

  const handleFileUpload = async (id: string, e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0] && onUpload) {
          try {
            const url = await onUpload(e.target.files[0]);
            handleChange(id, 'value', url);
          } catch (error) {
              alert("Erreur lors de l'upload. Vérifiez que le bucket 'media' existe dans Supabase.");
              console.error(error);
          }
      }
  };

  // --- Logic for Text Selection & Floating Toolbar ---

  const handleTextSelection = (e: React.MouseEvent | React.KeyUpEvent, blockId: string) => {
    if (!isEditing) return;

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
        setToolbarVisible(false);
        return;
    }

    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();

    // Only show if selection is non-empty and inside our editor
    if (rect.width > 0) {
        // Calculate position relative to viewport, we will use fixed positioning for the toolbar
        setToolbarPosition({
            top: rect.top - 40, // 40px above the text
            left: rect.left + (rect.width / 2) // Centered
        });
        setCurrentSelectionRange(range);
        setActiveBlockId(blockId);
        setToolbarVisible(true);
    } else {
        setToolbarVisible(false);
    }
  };

  const applyFormat = (formatType: 'spoiler' | 'bold' | 'italic') => {
      if (!currentSelectionRange || !activeBlockId) return;

      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(currentSelectionRange);

      if (formatType === 'spoiler') {
          // Custom handling for spoiler span
          const span = document.createElement('span');
          span.className = 'spoiler';
          span.title = 'Cliquez pour révéler';
          try {
            currentSelectionRange.surroundContents(span);
          } catch (e) {
             // Fallback if selection crosses nodes: simple execCommand (won't do class)
             // Or complex parsing. For MVP, we stick to safe ranges.
             console.warn("Cannot apply spoiler across complex nodes. Try selecting text within a single paragraph.");
             alert("Veuillez sélectionner du texte continu (sans traverser d'autres styles) pour appliquer le flou.");
             return;
          }
      } else {
          // Standard browser commands for bold/italic
          document.execCommand(formatType);
      }
      
      // Update the state with new HTML
      // Find the editable element to get its new HTML
      // We rely on the fact that 'surroundContents' modifies the DOM directly.
      // We need to trigger the 'onChange' of the parent block.
      // A trick is to find the element by ID or context, but here we can just hide toolbar
      // and let the user click away (blur) or type to trigger the existing onBlur/Input listeners.
      // Better: force a manual update if possible, but the onBlur of the contentEditable will handle it.
      
      // To ensure React state is updated immediately:
      const activeEl = document.activeElement;
      if (activeEl && activeEl.innerHTML) {
          handleChange(activeBlockId, 'value', activeEl.innerHTML);
      }

      setToolbarVisible(false);
      window.getSelection()?.removeAllRanges();
  };

  // Handle revealing spoilers in View Mode (Event Delegation)
  const handleContainerClick = (e: React.MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.classList.contains('spoiler')) {
          target.classList.toggle('revealed');
      }
  };

  return (
    <div className="space-y-6 py-4 animate-fadeIn" onClick={handleContainerClick}>
      
      {/* Floating Toolbar */}
      {toolbarVisible && isEditing && (
          <div 
            className="fixed z-50 flex items-center gap-1 p-1 bg-gray-900 text-white rounded-lg shadow-xl animate-fadeIn transform -translate-x-1/2"
            style={{ top: toolbarPosition.top, left: toolbarPosition.left }}
            onMouseDown={(e) => e.preventDefault()} // Prevent losing focus on text
          >
              <button onClick={() => applyFormat('bold')} className="p-1.5 hover:bg-gray-700 rounded transition-colors" title="Gras">
                  <Bold size={14} />
              </button>
              <button onClick={() => applyFormat('italic')} className="p-1.5 hover:bg-gray-700 rounded transition-colors" title="Italique">
                  <Italic size={14} />
              </button>
              <div className="w-px h-4 bg-gray-700 mx-1"></div>
              <button onClick={() => applyFormat('spoiler')} className="p-1.5 hover:bg-gray-700 rounded transition-colors flex items-center gap-1" title="Flouter / Cacher">
                  <EyeOff size={14} />
                  <span className="text-xs font-medium">Flou</span>
              </button>
          </div>
      )}

      {blocks.map((block) => (
        <div key={block.id} className={`relative group ${isEditing ? 'pl-8 border-l-2 border-dashed border-gray-200 hover:border-blue-300 transition-colors' : ''}`}>
          
          {/* Delete Action (Edit Mode) */}
          {isEditing && (
            <button 
              onClick={() => handleDelete(block.id)}
              className="absolute -left-10 top-2 p-1.5 text-gray-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
              title="Supprimer ce bloc"
            >
              <Trash2 size={16} />
            </button>
          )}

          {/* Render based on type */}
          {(() => {
            switch (block.type) {
              case 'text':
                return (
                  <div className="w-full">
                     {isEditing ? (
                        <div
                            className="w-full min-h-[3rem] p-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none transition-all rich-text-content cursor-text bg-gray-50/50"
                            contentEditable
                            suppressContentEditableWarning={true}
                            onBlur={(e) => handleChange(block.id, 'value', e.currentTarget.innerHTML)}
                            onMouseUp={(e) => handleTextSelection(e, block.id)}
                            onKeyUp={(e) => handleTextSelection(e, block.id)}
                            dangerouslySetInnerHTML={{ __html: block.value }}
                            style={{ whiteSpace: 'pre-wrap' }}
                        />
                     ) : (
                        <div 
                            className="text-base md:text-lg leading-relaxed text-gray-700 font-light rich-text-content"
                            dangerouslySetInnerHTML={{ __html: block.value }}
                        />
                     )}
                  </div>
                );

              case 'image':
                return (
                  <figure className="w-full my-4">
                    {isEditing ? (
                      <div className="flex flex-col gap-2 mb-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
                         <div className="flex items-center gap-2">
                             <input 
                                type="text" 
                                value={block.value}
                                onChange={(e) => handleChange(block.id, 'value', e.target.value)}
                                placeholder="URL de l'image (https://...)"
                                className="text-sm p-2 border border-gray-200 rounded focus:border-blue-500 outline-none w-full"
                             />
                             {onUpload && (
                                 <label className="cursor-pointer p-2 bg-white border border-gray-200 rounded hover:bg-gray-100 text-gray-600" title="Uploader une image">
                                     <Upload size={18} />
                                     <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(block.id, e)} />
                                 </label>
                             )}
                         </div>
                         <input 
                            type="text" 
                            value={block.caption || ''}
                            onChange={(e) => handleChange(block.id, 'caption', e.target.value)}
                            placeholder="Légende de l'image (optionnel)"
                            className="text-xs p-2 border border-gray-200 rounded focus:border-blue-500 outline-none w-full"
                         />
                      </div>
                    ) : null}
                    
                    {block.value && (
                      <div className="overflow-hidden rounded-md border border-gray-100 bg-gray-50">
                        <img
                          src={block.value}
                          alt={block.caption || 'Course image'}
                          className="w-full h-auto object-cover"
                          onError={(e) => (e.currentTarget.style.display = 'none')} 
                        />
                      </div>
                    )}
                    
                    {!isEditing && block.caption && (
                      <figcaption className="mt-2 text-xs md:text-sm text-gray-500 flex items-center gap-1.5">
                        <ImageIcon size={14} />
                        {block.caption}
                      </figcaption>
                    )}
                  </figure>
                );

              case 'video':
                 return (
                  <div className="my-6">
                    {isEditing ? (
                      <div className="flex flex-col gap-2 mb-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
                         <div className="flex items-center gap-2">
                             <input 
                                type="text" 
                                value={block.value}
                                onChange={(e) => handleChange(block.id, 'value', e.target.value)}
                                placeholder="URL Vidéo (YouTube, .mp4...)"
                                className="text-sm p-2 border border-gray-200 rounded focus:border-blue-500 outline-none w-full"
                             />
                             {onUpload && (
                                 <label className="cursor-pointer p-2 bg-white border border-gray-200 rounded hover:bg-gray-100 text-gray-600" title="Uploader une vidéo">
                                     <Upload size={18} />
                                     <input type="file" className="hidden" accept="video/*" onChange={(e) => handleFileUpload(block.id, e)} />
                                 </label>
                             )}
                         </div>
                         <input 
                            type="text" 
                            value={block.caption || ''}
                            onChange={(e) => handleChange(block.id, 'caption', e.target.value)}
                            placeholder="Titre de la vidéo (optionnel)"
                            className="text-xs p-2 border border-gray-200 rounded focus:border-blue-500 outline-none w-full"
                         />
                      </div>
                    ) : null}

                    {block.value && (
                      <div className="relative w-full aspect-video rounded-md overflow-hidden bg-black shadow-sm">
                        {block.value.includes('.mp4') || block.value.includes('supabase') ? (
                            <video 
                                src={block.value} 
                                controls 
                                className="absolute top-0 left-0 w-full h-full"
                            />
                        ) : (
                            <iframe
                            src={block.value}
                            title="Video content"
                            className="absolute top-0 left-0 w-full h-full"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                            />
                        )}
                      </div>
                    )}
                    {!isEditing && block.caption && (
                      <div className="mt-2 text-xs md:text-sm text-gray-500 flex items-center gap-1.5">
                        <PlayCircle size={14} />
                        {block.caption}
                      </div>
                    )}
                  </div>
                );

              case 'link':
                return (
                   <div className="my-2">
                      {isEditing ? (
                        <div className="flex flex-col gap-2 mb-2 p-3 border border-gray-200 rounded-lg bg-gray-50">
                           <span className="text-xs font-bold uppercase text-gray-400">Ressource Lien</span>
                           <input 
                              type="text" 
                              value={block.caption || ''}
                              onChange={(e) => handleChange(block.id, 'caption', e.target.value)}
                              placeholder="Titre du lien"
                              className="text-sm p-2 bg-white border border-gray-200 rounded focus:border-blue-500 outline-none w-full"
                           />
                           <input 
                              type="text" 
                              value={block.value}
                              onChange={(e) => handleChange(block.id, 'value', e.target.value)}
                              placeholder="URL (https://...)"
                              className="text-sm p-2 bg-white border border-gray-200 rounded focus:border-blue-500 outline-none w-full"
                           />
                        </div>
                      ) : (
                        <a
                          href={block.value}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="group flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:border-gray-400 hover:bg-gray-50 transition-all duration-200 no-underline"
                        >
                          <div className="p-2 bg-gray-100 rounded-full group-hover:bg-gray-200 transition-colors">
                            <ExternalLink size={18} className="text-gray-600" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900 group-hover:text-black transition-colors">
                              {block.caption || 'Lien externe'}
                            </p>
                            <p className="text-xs text-gray-400 truncate max-w-[200px] sm:max-w-xs">
                              {block.value}
                            </p>
                          </div>
                        </a>
                      )}
                   </div>
                );

              case 'quiz':
                return (
                    <QuizBlock 
                        block={block} 
                        isEditing={isEditing} 
                        onUpdate={(newVal) => handleChange(block.id, 'value', newVal)} 
                    />
                );

              default:
                return null;
            }
          })()}
        </div>
      ))}
    </div>
  );
};

// --- Sub-component for Quiz Logic ---

const QuizBlock: React.FC<{
    block: ContentBlock, 
    isEditing: boolean, 
    onUpdate: (jsonVal: string) => void 
}> = ({ block, isEditing, onUpdate }) => {
    
    // Parse JSON safely
    let quizData: QuizData;
    try {
        quizData = JSON.parse(block.value);
    } catch (e) {
        quizData = { question: "Nouvelle question ?", options: ["Choix 1", "Choix 2"], correctAnswer: 0 };
    }

    const [selectedOption, setSelectedOption] = useState<number | null>(null);
    const [isSubmitted, setIsSubmitted] = useState(false);

    // Editing Logic
    const updateQuizField = (field: keyof QuizData, value: any) => {
        const newData = { ...quizData, [field]: value };
        onUpdate(JSON.stringify(newData));
    };

    const updateOption = (index: number, text: string) => {
        const newOptions = [...quizData.options];
        newOptions[index] = text;
        updateQuizField('options', newOptions);
    };

    const addOption = () => {
        updateQuizField('options', [...quizData.options, `Option ${quizData.options.length + 1}`]);
    };

    const removeOption = (index: number) => {
        if (quizData.options.length <= 2) return;
        const newOptions = quizData.options.filter((_, i) => i !== index);
        let newCorrect = quizData.correctAnswer;
        if (index === quizData.correctAnswer) newCorrect = 0;
        if (index < quizData.correctAnswer) newCorrect--;
        
        onUpdate(JSON.stringify({ ...quizData, options: newOptions, correctAnswer: newCorrect }));
    };

    if (isEditing) {
        return (
            <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl space-y-4">
                <div className="flex items-center gap-2 text-purple-600 font-medium text-sm uppercase tracking-wide">
                    <HelpCircle size={16} />
                    <span>Éditeur de Quiz</span>
                </div>
                
                <input 
                    className="w-full p-2 bg-white border border-gray-200 rounded focus:border-purple-500 outline-none font-medium"
                    value={quizData.question}
                    onChange={(e) => updateQuizField('question', e.target.value)}
                    placeholder="Posez votre question ici..."
                />

                <div className="space-y-2">
                    {quizData.options.map((opt, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                            <input 
                                type="radio" 
                                name={`correct-${block.id}`}
                                checked={quizData.correctAnswer === idx}
                                onChange={() => updateQuizField('correctAnswer', idx)}
                                className="accent-purple-600 cursor-pointer"
                                title="Marquer comme bonne réponse"
                            />
                            <input 
                                className={`flex-grow p-2 text-sm border rounded outline-none ${quizData.correctAnswer === idx ? 'border-purple-300 bg-purple-50' : 'border-gray-200 bg-white'}`}
                                value={opt}
                                onChange={(e) => updateOption(idx, e.target.value)}
                                placeholder={`Option ${idx + 1}`}
                            />
                            <button 
                                onClick={() => removeOption(idx)}
                                className="p-2 text-gray-400 hover:text-red-500 disabled:opacity-30"
                                disabled={quizData.options.length <= 2}
                            >
                                <X size={16} />
                            </button>
                        </div>
                    ))}
                </div>

                <button 
                    onClick={addOption}
                    className="text-xs font-medium text-purple-600 flex items-center gap-1 hover:underline"
                >
                    <Plus size={14} /> Ajouter une option
                </button>
            </div>
        );
    }

    // View Logic (Player)
    return (
        <div className="my-6 p-6 rounded-2xl bg-gray-50 border border-gray-100">
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex gap-2">
                <span className="text-purple-600">Q.</span> 
                {quizData.question}
            </h3>

            <div className="space-y-2">
                {quizData.options.map((opt, idx) => {
                    let stateClass = "border-gray-200 hover:border-gray-300 bg-white";
                    let icon = null;

                    if (isSubmitted) {
                        if (idx === quizData.correctAnswer) {
                            stateClass = "border-green-500 bg-green-50 text-green-900";
                            icon = <CheckCircle2 size={18} className="text-green-600" />;
                        } else if (idx === selectedOption) {
                            stateClass = "border-red-500 bg-red-50 text-red-900";
                            icon = <XCircle size={18} className="text-red-500" />;
                        } else {
                            stateClass = "border-gray-100 opacity-50";
                        }
                    } else if (selectedOption === idx) {
                        stateClass = "border-purple-500 bg-purple-50 text-purple-900 shadow-sm";
                    }

                    return (
                        <button
                            key={idx}
                            onClick={() => !isSubmitted && setSelectedOption(idx)}
                            disabled={isSubmitted}
                            className={`w-full text-left p-4 rounded-xl border-2 transition-all duration-200 flex items-center justify-between group ${stateClass}`}
                        >
                            <span className="font-light">{opt}</span>
                            {icon}
                        </button>
                    );
                })}
            </div>

            {!isSubmitted && selectedOption !== null && (
                <div className="mt-4 flex justify-end">
                    <button 
                        onClick={() => setIsSubmitted(true)}
                        className="px-6 py-2 bg-gray-900 text-white rounded-lg font-medium hover:bg-black transition-colors"
                    >
                        Valider
                    </button>
                </div>
            )}
        </div>
    );
};
