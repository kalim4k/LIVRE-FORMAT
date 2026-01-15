import React, { useState, useRef } from 'react';
import { CourseNode, ContentBlock, ContentType } from '../types';
import { Plus, Minus, FileText, Trash2, MoreVertical, Type, Image, Video, Link as LinkIcon, Smile } from 'lucide-react';
import { ContentRenderer } from './ContentRenderer';

interface AccordionNodeProps {
  node: CourseNode;
  depth?: number;
  isEditing: boolean;
  onChange: (updatedNode: CourseNode) => void;
  onDelete: () => void;
}

export const AccordionNode: React.FC<AccordionNodeProps> = ({ node, depth = 0, isEditing, onChange, onDelete }) => {
  const [isOpen, setIsOpen] = useState(false);
  const nodeRef = useRef<HTMLDivElement>(null);

  const hasChildren = node.children && node.children.length > 0;
  const hasContent = node.content && node.content.length > 0;
  const isInteractable = hasChildren || hasContent || isEditing;

  // Visual indentation logic
  const paddingLeft = `${depth * 1.5 + 1}rem`;

  const toggleOpen = (e?: React.MouseEvent) => {
    // If clicking input in edit mode, don't toggle
    if (e && (e.target as HTMLElement).tagName === 'INPUT') return;
    
    if (isInteractable) {
      const nextState = !isOpen;
      setIsOpen(nextState);

      if (nextState) {
        setTimeout(() => {
          nodeRef.current?.scrollIntoView({
            behavior: 'smooth',
            block: 'start',
            inline: 'nearest'
          });
        }, 150);
      }
    }
  };

  // --- Editing Handlers ---

  const updateTitle = (newTitle: string) => {
    onChange({ ...node, title: newTitle });
  };

  const updateIcon = (newIcon: string) => {
    onChange({ ...node, icon: newIcon });
  };

  const addChild = () => {
    const newChild: CourseNode = {
        id: Date.now().toString(),
        title: "Nouveau Sous-chapitre",
        children: [],
        content: []
    };
    const newChildren = [...(node.children || []), newChild];
    onChange({ ...node, children: newChildren });
    setIsOpen(true);
  };

  const addContentBlock = (type: ContentType) => {
      const newBlock: ContentBlock = {
          id: Date.now().toString() + Math.random(),
          type,
          value: type === 'text' ? "Nouveau texte..." : "",
          caption: ""
      };
      const newContent = [...(node.content || []), newBlock];
      onChange({ ...node, content: newContent });
  };

  const handleChildUpdate = (updatedChild: CourseNode) => {
      const newChildren = node.children?.map(c => c.id === updatedChild.id ? updatedChild : c);
      onChange({ ...node, children: newChildren });
  };

  const handleChildDelete = (childId: string) => {
      const newChildren = node.children?.filter(c => c.id !== childId);
      onChange({ ...node, children: newChildren });
  };

  const handleContentUpdate = (newBlocks: ContentBlock[]) => {
      onChange({ ...node, content: newBlocks });
  };

  return (
    <div 
      ref={nodeRef}
      className={`border-b border-gray-100 last:border-0 scroll-mt-4 ${isEditing ? 'bg-white' : ''}`}
    >
      {/* Header / Clickable Area */}
      <div
        className={`
          relative w-full text-left flex items-center justify-between py-4 pr-4 group
          transition-colors duration-200
          ${isOpen ? 'bg-gray-50/50' : ''}
          ${!isInteractable && !isEditing ? 'opacity-60' : ''}
          ${isEditing ? 'hover:bg-gray-50' : 'cursor-pointer'}
        `}
        style={{ paddingLeft }}
        onClick={!isEditing ? toggleOpen : undefined}
      >
        <div className="flex items-center gap-3 overflow-hidden flex-grow">
          
          {/* Collapse/Expand Icon */}
          <button 
            onClick={(e) => { e.stopPropagation(); toggleOpen(); }}
            className={`
                flex items-center justify-center w-5 h-5 shrink-0 rounded-full border border-gray-200 
                transition-all duration-200 z-10
                ${isOpen ? 'bg-gray-900 border-gray-900 text-white' : 'bg-white text-gray-400 hover:border-gray-400'}
            `}
          >
             {hasChildren || hasContent || isEditing ? (
                 isOpen ? <Minus size={12} strokeWidth={3} /> : <Plus size={12} strokeWidth={3} />
             ) : (
                 <div className="w-1.5 h-1.5 rounded-full bg-gray-300" /> 
             )}
          </button>

          {/* Node Icon & Title */}
          <div className="flex items-center gap-2 flex-grow overflow-hidden">
             {isEditing ? (
                 <>
                    <input 
                        className="w-8 text-center bg-transparent border-b border-gray-200 focus:border-blue-500 outline-none"
                        value={node.icon || ''}
                        onChange={(e) => updateIcon(e.target.value)}
                        placeholder="Icon"
                        maxLength={2}
                    />
                    <input 
                        className="flex-grow font-medium text-lg bg-transparent border-b border-transparent focus:border-blue-500 hover:border-gray-200 outline-none transition-colors"
                        value={node.title}
                        onChange={(e) => updateTitle(e.target.value)}
                        placeholder="Titre du chapitre"
                    />
                 </>
             ) : (
                 <>
                    {node.icon && <span className="text-xl">{node.icon}</span>}
                    <span className={`
                        font-medium truncate
                        ${depth === 0 ? 'text-lg text-gray-900 tracking-tight' : 'text-base text-gray-700'}
                        ${depth > 0 && isOpen ? 'text-gray-900' : ''}
                    `}>
                        {node.title}
                    </span>
                 </>
             )}
          </div>
        </div>

        {/* Right Side Icons (Type hint or Edit Actions) */}
        <div className="flex items-center gap-2 pl-4">
            {isEditing ? (
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                        onClick={(e) => { e.stopPropagation(); addChild(); }}
                        className="p-1.5 rounded hover:bg-blue-50 text-blue-500"
                        title="Ajouter un sous-chapitre"
                    >
                        <Plus size={16} />
                    </button>
                    <button 
                        onClick={(e) => { e.stopPropagation(); onDelete(); }}
                        className="p-1.5 rounded hover:bg-red-50 text-red-400"
                        title="Supprimer ce chapitre"
                    >
                        <Trash2 size={16} />
                    </button>
                </div>
            ) : (
               hasContent && !hasChildren && (
                   <FileText size={14} className="text-gray-300 shrink-0" />
               )
            )}
        </div>
      </div>

      {/* Expandable Section */}
      <div 
        className={`
            overflow-hidden transition-all duration-300 ease-in-out
            ${isOpen ? 'max-h-[3000px] opacity-100' : 'max-h-0 opacity-0'}
        `}
      >
        {/* Content Area */}
        <div className="pr-4 md:pr-8 border-l-2 border-transparent" style={{ paddingLeft: `calc(${paddingLeft} + 1.5rem)` }}>
            
            {/* Existing Content */}
            <ContentRenderer 
                blocks={node.content || []} 
                isEditing={isEditing} 
                onUpdate={handleContentUpdate} 
            />

            {/* Add Content Toolbar (Edit Mode) */}
            {isEditing && (
                <div className="py-4 flex gap-2 overflow-x-auto">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider py-2">Ajouter :</p>
                    <button onClick={() => addContentBlock('text')} className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-gray-50 border border-gray-200 rounded hover:bg-gray-100 text-gray-700">
                        <Type size={14} /> Texte
                    </button>
                    <button onClick={() => addContentBlock('image')} className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-gray-50 border border-gray-200 rounded hover:bg-gray-100 text-gray-700">
                        <Image size={14} /> Image
                    </button>
                    <button onClick={() => addContentBlock('video')} className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-gray-50 border border-gray-200 rounded hover:bg-gray-100 text-gray-700">
                        <Video size={14} /> Vidéo
                    </button>
                    <button onClick={() => addContentBlock('link')} className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-gray-50 border border-gray-200 rounded hover:bg-gray-100 text-gray-700">
                        <LinkIcon size={14} /> Lien
                    </button>
                </div>
            )}
        </div>

        {/* Nested Children */}
        <div>
        {node.children?.map((child) => (
            <AccordionNode 
                key={child.id} 
                node={child} 
                depth={depth + 1} 
                isEditing={isEditing}
                onChange={handleChildUpdate}
                onDelete={() => handleChildDelete(child.id)}
            />
        ))}
        </div>
      </div>
    </div>
  );
};