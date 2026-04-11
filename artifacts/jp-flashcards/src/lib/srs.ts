export type SRSStage = 'apprentice1' | 'apprentice2' | 'apprentice3' | 'apprentice4' | 'guru1' | 'guru2' | 'master' | 'enlightened' | 'burned';

export interface Flashcard {
  id: string;
  japanese: string;
  reading: string; // hiragana reading
  english: string;
  partOfSpeech?: string;
  srsStage: SRSStage;
  nextReview: number; // unix timestamp ms
  totalReviews: number;
  correctReviews: number;
  incorrectReviews: number;
  streak: number;
  lastReviewed?: number;
  createdAt: number;
}

export interface ReviewSession {
  id: string;
  date: number;
  cardsReviewed: number;
  correct: number;
  incorrect: number;
}

const STAGE_INTERVALS: Record<SRSStage, number> = {
  apprentice1: 4 * 60 * 60 * 1000, // 4 hours
  apprentice2: 8 * 60 * 60 * 1000, // 8 hours
  apprentice3: 24 * 60 * 60 * 1000, // 1 day
  apprentice4: 2 * 24 * 60 * 60 * 1000, // 2 days
  guru1: 7 * 24 * 60 * 60 * 1000, // 1 week
  guru2: 14 * 24 * 60 * 60 * 1000, // 2 weeks
  master: 30 * 24 * 60 * 60 * 1000, // 1 month (approx)
  enlightened: 4 * 30 * 24 * 60 * 60 * 1000, // 4 months (approx)
  burned: 0, // never
};

const STAGE_ORDER: SRSStage[] = [
  'apprentice1',
  'apprentice2',
  'apprentice3',
  'apprentice4',
  'guru1',
  'guru2',
  'master',
  'enlightened',
  'burned'
];

export function getNextStage(current: SRSStage, correct: boolean): SRSStage {
  const currentIndex = STAGE_ORDER.indexOf(current);
  if (correct) {
    if (current === 'burned') return 'burned';
    return STAGE_ORDER[currentIndex + 1];
  } else {
    // Drop back 2 stages, min apprentice1
    const newIndex = Math.max(0, currentIndex - 2);
    return STAGE_ORDER[newIndex];
  }
}

export function calculateNextReview(stage: SRSStage): number {
  if (stage === 'burned') return 0;
  return Date.now() + STAGE_INTERVALS[stage];
}

export function processReview(card: Flashcard, correct: boolean): Flashcard {
  const nextStage = getNextStage(card.srsStage, correct);
  const nextReview = calculateNextReview(nextStage);
  
  return {
    ...card,
    srsStage: nextStage,
    nextReview,
    totalReviews: card.totalReviews + 1,
    correctReviews: card.correctReviews + (correct ? 1 : 0),
    incorrectReviews: card.incorrectReviews + (!correct ? 1 : 0),
    streak: correct ? card.streak + 1 : 0,
    lastReviewed: Date.now(),
  };
}

export function getStageColor(stage: SRSStage): string {
  if (stage.startsWith('apprentice')) return 'bg-srs-apprentice text-white';
  if (stage.startsWith('guru')) return 'bg-srs-guru text-white';
  if (stage === 'master') return 'bg-srs-master text-white';
  if (stage === 'enlightened') return 'bg-srs-enlightened text-white';
  return 'bg-srs-burned text-white';
}

export function getStageName(stage: SRSStage): string {
  if (stage.startsWith('apprentice')) return 'Apprentice';
  if (stage.startsWith('guru')) return 'Guru';
  if (stage === 'master') return 'Master';
  if (stage === 'enlightened') return 'Enlightened';
  return 'Burned';
}
