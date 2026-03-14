export interface Flashcard {
  id: string;
  question: string;
  answer: string;
  createdAt: number;
  // Spaced Repetition Data
  interval: number; // in days
  easeFactor: number;
  repetitions: number;
  nextReviewDate: number; // timestamp
}

export interface Deck {
  id: string;
  title: string;
  cards: Flashcard[];
}

export type PerformanceRating = 'easy' | 'good' | 'hard' | 'again';
