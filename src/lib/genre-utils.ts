// Shared genre utilities - centralized genre labels and helpers

export interface GenreInfo {
  fr: string
  ar: string
  en: string
  icon: string
  color: string // gradient class
}

export const genreLabels: Record<string, GenreInfo> = {
  roman: { fr: 'Roman', ar: 'رواية', en: 'Fiction', icon: '📚', color: 'from-purple-500 to-indigo-600' },
  histoire: { fr: 'Histoire', ar: 'تاريخ', en: 'History', icon: '🏛️', color: 'from-amber-500 to-orange-600' },
  sciences: { fr: 'Sciences', ar: 'علوم', en: 'Science', icon: '🔬', color: 'from-cyan-500 to-blue-600' },
  philosophie: { fr: 'Philosophie', ar: 'فلسفة', en: 'Philosophy', icon: '💭', color: 'from-violet-500 to-purple-600' },
  religion: { fr: 'Religion', ar: 'دين', en: 'Religion', icon: '🕌', color: 'from-emerald-500 to-teal-600' },
  poesie: { fr: 'Poésie', ar: 'شعر', en: 'Poetry', icon: '✍️', color: 'from-pink-500 to-rose-600' },
  enfants: { fr: 'Enfants', ar: 'أطفال', en: 'Children', icon: '🧒', color: 'from-sky-400 to-blue-500' },
  biographie: { fr: 'Biographie', ar: 'سيرة', en: 'Biography', icon: '👤', color: 'from-slate-500 to-gray-600' },
  education: { fr: 'Éducation', ar: 'تعليم', en: 'Education', icon: '🎓', color: 'from-blue-500 to-indigo-500' },
  politique: { fr: 'Politique', ar: 'سياسة', en: 'Politics', icon: '⚖️', color: 'from-red-500 to-rose-600' },
  art: { fr: 'Art', ar: 'فن', en: 'Art', icon: '🎨', color: 'from-fuchsia-500 to-pink-600' },
  economie: { fr: 'Économie', ar: 'اقتصاد', en: 'Economics', icon: '📊', color: 'from-green-500 to-emerald-600' },
  droit: { fr: 'Droit', ar: 'قانون', en: 'Law', icon: '📜', color: 'from-yellow-600 to-amber-700' },
  medecine: { fr: 'Médecine', ar: 'طب', en: 'Medicine', icon: '🏥', color: 'from-red-400 to-red-600' },
  psychologie: { fr: 'Psychologie', ar: 'علم نفس', en: 'Psychology', icon: '🧠', color: 'from-purple-400 to-violet-600' },
  informatique: { fr: 'Informatique', ar: 'حاسوب', en: 'Computers', icon: '💻', color: 'from-gray-600 to-slate-700' },
  sociologie: { fr: 'Sociologie', ar: 'علم اجتماع', en: 'Sociology', icon: '👥', color: 'from-teal-500 to-cyan-600' },
  lettres: { fr: 'Lettres', ar: 'أدب', en: 'Literature', icon: '📖', color: 'from-indigo-400 to-blue-600' },
}

export function getGenreLabel(slug: string, language: string): string {
  return genreLabels[slug]?.[language as keyof GenreInfo] || genreLabels[slug]?.fr || slug
}

export function getGenreIcon(slug: string): string {
  return genreLabels[slug]?.icon || '📖'
}

export function getGenreColor(slug: string): string {
  return genreLabels[slug]?.color || 'from-gray-400 to-gray-500'
}
