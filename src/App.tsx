/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Trash2, 
  RotateCcw, 
  CheckCircle2, 
  ChevronLeft, 
  ChevronRight, 
  BookOpen, 
  Layers,
  X,
  PlusCircle,
  Calendar,
  Zap,
  Clock
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Flashcard, Deck, PerformanceRating } from './types';

const STORAGE_KEY = 'flashly_decks_v2';

const INITIAL_DATA: Deck[] = [
  {
    id: '1',
    title: 'React Basics',
    cards: [
      { id: 'c1', question: 'What is JSX?', answer: 'A syntax extension for JavaScript that looks like HTML.', createdAt: Date.now(), interval: 0, easeFactor: 2.5, repetitions: 0, nextReviewDate: Date.now() },
      { id: 'c2', question: 'What are Hooks?', answer: 'Functions that let you "hook into" React state and lifecycle features from function components.', createdAt: Date.now(), interval: 0, easeFactor: 2.5, repetitions: 0, nextReviewDate: Date.now() },
      { id: 'c3', question: 'What is the Virtual DOM?', answer: 'A lightweight copy of the real DOM that React uses to optimize updates.', createdAt: Date.now(), interval: 0, easeFactor: 2.5, repetitions: 0, nextReviewDate: Date.now() },
    ]
  }
];

// Simplified SM-2 Algorithm
const calculateNextReview = (card: Flashcard, rating: PerformanceRating): Flashcard => {
  let { interval, easeFactor, repetitions } = card;

  if (rating === 'again') {
    repetitions = 0;
    interval = 1;
  } else {
    if (repetitions === 0) {
      interval = 1;
    } else if (repetitions === 1) {
      interval = 6;
    } else {
      interval = Math.round(interval * easeFactor);
    }
    repetitions++;

    // Adjust ease factor based on rating
    if (rating === 'hard') easeFactor = Math.max(1.3, easeFactor - 0.2);
    if (rating === 'easy') easeFactor = easeFactor + 0.15;
  }

  // Add some randomness (fuzz) to avoid cards clustering
  const fuzz = Math.random() * 0.1 - 0.05; // +/- 5%
  const finalInterval = Math.max(1, Math.round(interval * (1 + fuzz)));
  
  const nextReviewDate = Date.now() + finalInterval * 24 * 60 * 60 * 1000;

  return {
    ...card,
    interval: finalInterval,
    easeFactor,
    repetitions,
    nextReviewDate
  };
};

export default function App() {
  const [decks, setDecks] = useState<Deck[]>([]);
  const [activeDeckId, setActiveDeckId] = useState<string | null>(null);
  const [isStudyMode, setIsStudyMode] = useState(false);
  const [isAddingCard, setIsAddingCard] = useState(false);
  const [isAddingDeck, setIsAddingDeck] = useState(false);
  
  // Study state
  const [studyCards, setStudyCards] = useState<Flashcard[]>([]);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  // Load data
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setDecks(JSON.parse(saved));
      } catch (e) {
        setDecks(INITIAL_DATA);
      }
    } else {
      setDecks(INITIAL_DATA);
    }
  }, []);

  // Save data
  useEffect(() => {
    if (decks.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(decks));
    }
  }, [decks]);

  const activeDeck = decks.find(d => d.id === activeDeckId);

  const addDeck = (title: string) => {
    const newDeck: Deck = {
      id: Date.now().toString(),
      title,
      cards: []
    };
    setDecks([...decks, newDeck]);
    setIsAddingDeck(false);
  };

  const deleteDeck = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDecks(decks.filter(d => d.id !== id));
    if (activeDeckId === id) setActiveDeckId(null);
  };

  const addCard = (question: string, answer: string) => {
    if (!activeDeckId) return;
    const newCard: Flashcard = {
      id: Date.now().toString(),
      question,
      answer,
      createdAt: Date.now(),
      interval: 0,
      easeFactor: 2.5,
      repetitions: 0,
      nextReviewDate: Date.now()
    };
    setDecks(decks.map(d => 
      d.id === activeDeckId ? { ...d, cards: [...d.cards, newCard] } : d
    ));
    setIsAddingCard(false);
  };

  const deleteCard = (cardId: string) => {
    setDecks(decks.map(d => 
      d.id === activeDeckId ? { ...d, cards: d.cards.filter(c => c.id !== cardId) } : d
    ));
  };

  const handleRating = (rating: PerformanceRating) => {
    if (!activeDeckId || studyCards.length === 0) return;
    
    const currentCard = studyCards[currentCardIndex];
    const updatedCard = calculateNextReview(currentCard, rating);

    // Update decks state
    setDecks(decks.map(d => 
      d.id === activeDeckId ? { 
        ...d, 
        cards: d.cards.map(c => c.id === updatedCard.id ? updatedCard : c) 
      } : d
    ));

    // Move to next card or finish
    if (currentCardIndex < studyCards.length - 1) {
      setCurrentCardIndex(currentCardIndex + 1);
      setIsFlipped(false);
    } else {
      setIsStudyMode(false);
    }
  };

  const startStudy = (mode: 'due' | 'all' = 'due') => {
    if (activeDeck && activeDeck.cards.length > 0) {
      const now = Date.now();
      const cardsToStudy = mode === 'due' 
        ? activeDeck.cards.filter(c => c.nextReviewDate <= now)
        : [...activeDeck.cards];
      
      if (cardsToStudy.length > 0) {
        setStudyCards(cardsToStudy.sort(() => Math.random() - 0.5)); // Shuffle
        setCurrentCardIndex(0);
        setIsFlipped(false);
        setIsStudyMode(true);
      } else if (mode === 'due') {
        alert("No cards due for review! Try 'Study All' instead.");
      }
    }
  };

  const getDueCount = (deck: Deck) => {
    const now = Date.now();
    return deck.cards.filter(c => c.nextReviewDate <= now).length;
  };

  return (
    <div className="min-h-screen bg-[#f5f5f5] text-[#1a1a1a] font-sans selection:bg-emerald-100">
      {/* Header */}
      <header className="bg-white border-b border-black/5 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
          <div 
            className="flex items-center gap-2 cursor-pointer" 
            onClick={() => { setActiveDeckId(null); setIsStudyMode(false); }}
          >
            <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center text-white shadow-sm">
              <Layers size={18} />
            </div>
            <h1 className="text-xl font-bold tracking-tight">Flashly</h1>
          </div>
          
          {activeDeckId && !isStudyMode && (
            <div className="flex gap-2">
              <button 
                onClick={() => startStudy('due')}
                disabled={getDueCount(activeDeck) === 0}
                className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-xl text-sm font-medium transition-all shadow-sm active:scale-95"
              >
                <Zap size={16} />
                Study Due ({getDueCount(activeDeck)})
              </button>
              <button 
                onClick={() => startStudy('all')}
                disabled={activeDeck.cards.length === 0}
                className="flex items-center gap-2 bg-white border border-black/5 hover:bg-black/5 disabled:opacity-50 text-black px-4 py-2 rounded-xl text-sm font-medium transition-all shadow-sm active:scale-95"
              >
                <BookOpen size={16} />
                Study All
              </button>
            </div>
          )}
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        <AnimatePresence mode="wait">
          {!activeDeckId ? (
            /* Deck List View */
            <motion.div 
              key="deck-list"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">Your Decks</h2>
                <button 
                  onClick={() => setIsAddingDeck(true)}
                  className="p-2 hover:bg-black/5 rounded-full transition-colors"
                >
                  <PlusCircle size={24} className="text-emerald-600" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {decks.map(deck => {
                  const dueCount = getDueCount(deck);
                  return (
                    <motion.div
                      key={deck.id}
                      layoutId={deck.id}
                      onClick={() => setActiveDeckId(deck.id)}
                      className="group bg-white p-6 rounded-2xl shadow-sm border border-black/5 cursor-pointer hover:shadow-md hover:border-emerald-200 transition-all relative"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="text-lg font-semibold group-hover:text-emerald-600 transition-colors">{deck.title}</h3>
                        {dueCount > 0 && (
                          <span className="bg-emerald-100 text-emerald-700 text-[10px] font-bold px-2 py-1 rounded-full flex items-center gap-1">
                            <Zap size={10} />
                            {dueCount} DUE
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-black/40">{deck.cards.length} cards</p>
                      <button 
                        onClick={(e) => deleteDeck(deck.id, e)}
                        className="absolute bottom-6 right-6 p-2 opacity-0 group-hover:opacity-100 hover:bg-red-50 hover:text-red-600 rounded-lg transition-all"
                      >
                        <Trash2 size={16} />
                      </button>
                    </motion.div>
                  );
                })}
              </div>

              {isAddingDeck && (
                <Modal onClose={() => setIsAddingDeck(false)} title="Create New Deck">
                  <DeckForm onSubmit={addDeck} onCancel={() => setIsAddingDeck(false)} />
                </Modal>
              )}
            </motion.div>
          ) : isStudyMode ? (
            /* Study Mode View */
            <motion.div
              key="study-mode"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              className="flex flex-col items-center gap-8"
            >
              <div className="w-full flex items-center justify-between">
                <button 
                  onClick={() => setIsStudyMode(false)}
                  className="flex items-center gap-2 text-sm font-medium text-black/60 hover:text-black transition-colors"
                >
                  <ChevronLeft size={16} />
                  Back to Deck
                </button>
                <div className="text-sm font-mono text-black/40">
                  {currentCardIndex + 1} / {studyCards.length}
                </div>
              </div>

              <div className="w-full max-w-lg aspect-[4/3] relative perspective-1000">
                <motion.div
                  animate={{ rotateY: isFlipped ? 180 : 0 }}
                  transition={{ type: 'spring', stiffness: 260, damping: 20 }}
                  className="w-full h-full relative preserve-3d cursor-pointer"
                  onClick={() => setIsFlipped(!isFlipped)}
                >
                  {/* Front */}
                  <div className="absolute inset-0 backface-hidden bg-white rounded-3xl shadow-xl border border-black/5 flex flex-col items-center justify-center p-12 text-center">
                    <span className="text-xs uppercase tracking-widest text-black/30 font-bold mb-4">Question</span>
                    <h3 className="text-2xl font-medium leading-tight">
                      {studyCards[currentCardIndex].question}
                    </h3>
                    <p className="mt-8 text-sm text-emerald-500 font-medium animate-pulse">Click to flip</p>
                  </div>

                  {/* Back */}
                  <div 
                    className="absolute inset-0 backface-hidden bg-emerald-50 rounded-3xl shadow-xl border border-emerald-100 flex flex-col items-center justify-center p-12 text-center"
                    style={{ transform: 'rotateY(180deg)' }}
                  >
                    <span className="text-xs uppercase tracking-widest text-emerald-600/40 font-bold mb-4">Answer</span>
                    <p className="text-xl text-emerald-900 leading-relaxed">
                      {studyCards[currentCardIndex].answer}
                    </p>
                  </div>
                </motion.div>
              </div>

              <div className="w-full max-w-lg">
                <AnimatePresence>
                  {isFlipped && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="grid grid-cols-4 gap-2"
                    >
                      <button 
                        onClick={() => handleRating('again')}
                        className="flex flex-col items-center gap-1 p-3 bg-white border border-black/5 rounded-2xl hover:bg-red-50 hover:border-red-200 transition-all group"
                      >
                        <RotateCcw size={18} className="text-red-400 group-hover:scale-110 transition-transform" />
                        <span className="text-[10px] font-bold uppercase text-black/40">Again</span>
                        <span className="text-[9px] text-red-600 font-medium">1d</span>
                      </button>
                      <button 
                        onClick={() => handleRating('hard')}
                        className="flex flex-col items-center gap-1 p-3 bg-white border border-black/5 rounded-2xl hover:bg-amber-50 hover:border-amber-200 transition-all group"
                      >
                        <Clock size={18} className="text-amber-400 group-hover:scale-110 transition-transform" />
                        <span className="text-[10px] font-bold uppercase text-black/40">Hard</span>
                        <span className="text-[9px] text-amber-600 font-medium">
                          {Math.round(studyCards[currentCardIndex].interval * 1.2) || 2}d
                        </span>
                      </button>
                      <button 
                        onClick={() => handleRating('good')}
                        className="flex flex-col items-center gap-1 p-3 bg-white border border-black/5 rounded-2xl hover:bg-emerald-50 hover:border-emerald-200 transition-all group"
                      >
                        <CheckCircle2 size={18} className="text-emerald-500 group-hover:scale-110 transition-transform" />
                        <span className="text-[10px] font-bold uppercase text-black/40">Good</span>
                        <span className="text-[9px] text-emerald-600 font-medium">
                          {Math.round(studyCards[currentCardIndex].interval * studyCards[currentCardIndex].easeFactor) || 4}d
                        </span>
                      </button>
                      <button 
                        onClick={() => handleRating('easy')}
                        className="flex flex-col items-center gap-1 p-3 bg-white border border-black/5 rounded-2xl hover:bg-blue-50 hover:border-blue-200 transition-all group"
                      >
                        <Zap size={18} className="text-blue-500 group-hover:scale-110 transition-transform" />
                        <span className="text-[10px] font-bold uppercase text-black/40">Easy</span>
                        <span className="text-[9px] text-blue-600 font-medium">
                          {Math.round(studyCards[currentCardIndex].interval * studyCards[currentCardIndex].easeFactor * 1.3) || 7}d
                        </span>
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          ) : (
            /* Deck Detail View */
            <motion.div
              key="deck-detail"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <button 
                    onClick={() => setActiveDeckId(null)}
                    className="p-2 hover:bg-black/5 rounded-full transition-colors"
                  >
                    <ChevronLeft size={20} />
                  </button>
                  <h2 className="text-2xl font-bold">{activeDeck.title}</h2>
                </div>
                <button 
                  onClick={() => setIsAddingCard(true)}
                  className="flex items-center gap-2 bg-black text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-black/80 transition-all active:scale-95"
                >
                  <Plus size={16} />
                  Add Card
                </button>
              </div>

              <div className="space-y-4">
                {activeDeck.cards.length === 0 ? (
                  <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-black/10">
                    <Layers size={48} className="mx-auto text-black/10 mb-4" />
                    <p className="text-black/40">No cards in this deck yet.</p>
                    <button 
                      onClick={() => setIsAddingCard(true)}
                      className="mt-4 text-emerald-600 font-medium hover:underline"
                    >
                      Create your first card
                    </button>
                  </div>
                ) : (
                  activeDeck.cards.map(card => {
                    const isDue = card.nextReviewDate <= Date.now();
                    return (
                      <div 
                        key={card.id}
                        className="bg-white p-6 rounded-2xl shadow-sm border border-black/5 flex items-start justify-between group"
                      >
                        <div className="space-y-2 flex-1 pr-8">
                          <div className="flex items-center gap-3">
                            {isDue ? (
                              <span className="bg-emerald-100 text-emerald-700 text-[9px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                                <Zap size={8} />
                                DUE
                              </span>
                            ) : (
                              <span className="bg-black/5 text-black/40 text-[9px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                                <Calendar size={8} />
                                {new Date(card.nextReviewDate).toLocaleDateString()}
                              </span>
                            )}
                            <span className="text-[9px] uppercase tracking-wider font-bold text-black/20">
                              Interval: {card.interval}d
                            </span>
                          </div>
                          <h4 className="font-semibold text-lg">{card.question}</h4>
                          <p className="text-black/60 text-sm">{card.answer}</p>
                        </div>
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => deleteCard(card.id)}
                            className="p-2 text-black/40 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {isAddingCard && (
                <Modal onClose={() => setIsAddingCard(false)} title="Add New Card">
                  <CardForm onSubmit={addCard} onCancel={() => setIsAddingCard(false)} />
                </Modal>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

function Modal({ children, onClose, title }: { children: React.ReactNode, onClose: () => void, title: string }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/20 backdrop-blur-sm" 
      />
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="relative bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden"
      >
        <div className="px-6 py-4 border-b border-black/5 flex items-center justify-between">
          <h3 className="font-bold text-lg">{title}</h3>
          <button onClick={onClose} className="p-2 hover:bg-black/5 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>
        <div className="p-6">
          {children}
        </div>
      </motion.div>
    </div>
  );
}

function DeckForm({ onSubmit, onCancel }: { onSubmit: (title: string) => void, onCancel: () => void }) {
  const [title, setTitle] = useState('');

  return (
    <form onSubmit={(e) => { e.preventDefault(); if (title.trim()) onSubmit(title); }} className="space-y-4">
      <div>
        <label className="block text-xs font-bold uppercase tracking-wider text-black/40 mb-1.5">Deck Title</label>
        <input 
          autoFocus
          type="text" 
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Spanish Vocabulary"
          className="w-full px-4 py-3 rounded-xl border border-black/10 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
        />
      </div>
      <div className="flex gap-3 pt-2">
        <button 
          type="button"
          onClick={onCancel}
          className="flex-1 px-4 py-3 rounded-xl font-medium text-sm hover:bg-black/5 transition-colors"
        >
          Cancel
        </button>
        <button 
          type="submit"
          className="flex-1 bg-emerald-500 text-white px-4 py-3 rounded-xl font-medium text-sm hover:bg-emerald-600 transition-all shadow-sm active:scale-95"
        >
          Create Deck
        </button>
      </div>
    </form>
  );
}

function CardForm({ onSubmit, onCancel }: { onSubmit: (q: string, a: string) => void, onCancel: () => void }) {
  const [q, setQ] = useState('');
  const [a, setA] = useState('');

  return (
    <form onSubmit={(e) => { e.preventDefault(); if (q.trim() && a.trim()) onSubmit(q, a); }} className="space-y-4">
      <div>
        <label className="block text-xs font-bold uppercase tracking-wider text-black/40 mb-1.5">Question</label>
        <textarea 
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="What is the capital of France?"
          className="w-full px-4 py-3 rounded-xl border border-black/10 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all min-h-[100px] resize-none"
        />
      </div>
      <div>
        <label className="block text-xs font-bold uppercase tracking-wider text-black/40 mb-1.5">Answer</label>
        <textarea 
          value={a}
          onChange={(e) => setA(e.target.value)}
          placeholder="Paris"
          className="w-full px-4 py-3 rounded-xl border border-black/10 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all min-h-[100px] resize-none"
        />
      </div>
      <div className="flex gap-3 pt-2">
        <button 
          type="button"
          onClick={onCancel}
          className="flex-1 px-4 py-3 rounded-xl font-medium text-sm hover:bg-black/5 transition-colors"
        >
          Cancel
        </button>
        <button 
          type="submit"
          className="flex-1 bg-emerald-500 text-white px-4 py-3 rounded-xl font-medium text-sm hover:bg-emerald-600 transition-all shadow-sm active:scale-95"
        >
          Add Card
        </button>
      </div>
    </form>
  );
}
