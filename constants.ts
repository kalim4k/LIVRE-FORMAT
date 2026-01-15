import { CourseData } from './types';

export const INITIAL_COURSE_DATA: CourseData = {
  title: "Mon Nouveau Cours",
  author: "Auteur",
  description: "Ceci est la description de votre formation. Cliquez sur le bouton 'Éditer' en haut à droite pour commencer à personnaliser le contenu.",
  outline: [
    {
      id: "1",
      title: "Introduction",
      icon: "👋",
      content: [
        {
          id: "c1",
          type: "text",
          value: "Bienvenue dans votre nouvel espace de formation. Cliquez sur 'Éditer' pour modifier ce texte ou ajouter du contenu."
        }
      ],
      children: []
    }
  ]
};