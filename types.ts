
export type ContentType = 'text' | 'video' | 'image' | 'link' | 'quiz';

export interface ContentBlock {
  id: string;
  type: ContentType;
  value: string; // Text content, image URL, video URL, link URL, or JSON string for Quiz
  caption?: string; // For images or link descriptions
}

export interface CourseNode {
  id: string;
  title: string;
  icon?: string; // Custom emoji or icon character
  children?: CourseNode[];
  content?: ContentBlock[];
}

export interface CourseData {
  title: string;
  author: string;
  description: string;
  outline: CourseNode[];
}

// Helper interface for Quiz data stored in 'value'
export interface QuizData {
  question: string;
  options: string[];
  correctAnswer: number; // Index of the correct option
}
