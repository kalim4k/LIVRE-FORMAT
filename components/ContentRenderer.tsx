import React from 'react';
import { ContentBlock, ContentType } from '../types';
import { ExternalLink, Image as ImageIcon, PlayCircle, Trash2, GripVertical } from 'lucide-react';

interface ContentRendererProps {
  blocks: ContentBlock[];
  isEditing: boolean;
  onUpdate: (newBlocks: ContentBlock[]) => void;
}

export const ContentRenderer: React.FC<ContentRendererProps> = ({ blocks, isEditing, onUpdate }) => {
  if (!blocks || blocks.length === 0) return null;

  const handleChange = (id: string, field: keyof ContentBlock, newValue: string) => {
    const updated = blocks.map(b => b.id === id ? { ...b, [field]: newValue } : b);
    onUpdate(updated);
  };

  const handleDelete = (id: string) => {
    const updated = blocks.filter(b => b.id !== id);
    onUpdate(updated);
  };

  return (
    <div className="space-y-6 py-4 animate-fadeIn">
      {blocks.map((block, index) => (
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
                return isEditing ? (
                  <textarea
                    value={block.value}
                    onChange={(e) => handleChange(block.id, 'value', e.target.value)}
                    className="w-full bg-transparent text-base md:text-lg text-gray-700 font-light resize-none focus:outline-none focus:bg-gray-50 p-2 rounded"
                    rows={Math.max(2, block.value.split('\n').length)}
                    placeholder="Écrivez votre texte ici..."
                  />
                ) : (
                  <p className="text-base md:text-lg leading-relaxed text-gray-700 font-light whitespace-pre-wrap">
                    {block.value}
                  </p>
                );

              case 'image':
                return (
                  <figure className="w-full my-4">
                    {isEditing ? (
                      <div className="flex flex-col gap-2 mb-2">
                         <input 
                            type="text" 
                            value={block.value}
                            onChange={(e) => handleChange(block.id, 'value', e.target.value)}
                            placeholder="URL de l'image (https://...)"
                            className="text-sm p-2 border border-gray-200 rounded bg-gray-50 focus:border-blue-500 outline-none w-full"
                         />
                         <input 
                            type="text" 
                            value={block.caption || ''}
                            onChange={(e) => handleChange(block.id, 'caption', e.target.value)}
                            placeholder="Légende de l'image (optionnel)"
                            className="text-xs p-2 border border-gray-200 rounded bg-gray-50 focus:border-blue-500 outline-none w-full"
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
                      <div className="flex flex-col gap-2 mb-2">
                         <input 
                            type="text" 
                            value={block.value}
                            onChange={(e) => handleChange(block.id, 'value', e.target.value)}
                            placeholder="URL Embed Vidéo (YouTube Embed, Vimeo...)"
                            className="text-sm p-2 border border-gray-200 rounded bg-gray-50 focus:border-blue-500 outline-none w-full"
                         />
                         <input 
                            type="text" 
                            value={block.caption || ''}
                            onChange={(e) => handleChange(block.id, 'caption', e.target.value)}
                            placeholder="Titre de la vidéo (optionnel)"
                            className="text-xs p-2 border border-gray-200 rounded bg-gray-50 focus:border-blue-500 outline-none w-full"
                         />
                      </div>
                    ) : null}

                    {block.value && (
                      <div className="relative w-full aspect-video rounded-md overflow-hidden bg-black shadow-sm">
                        <iframe
                          src={block.value}
                          title="Video content"
                          className="absolute top-0 left-0 w-full h-full"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        />
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
              default:
                return null;
            }
          })()}
        </div>
      ))}
    </div>
  );
};