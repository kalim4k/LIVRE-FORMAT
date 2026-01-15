export type ContentType = 'text' | 'video' | 'image' | 'link';

export interface ContentBlock {
  id: string;
  type: ContentType;
  value: string; // Text content, image URL, video URL, or link URL
  caption?: string; // For images or link descriptions
}

export interface CourseNode {
  id: string;
  title: string;
  icon?: string; // Custom emoji or icon character
  // A node can either have children (sub-chapters) OR content, rarely both in this strict hierarchy, 
  // but we allow both for flexibility.
  children?: CourseNode[];
  content?: ContentBlock[];
}

export interface CourseData {
  title: string;
  author: string;
  description: string;
  outline: CourseNode[];
}