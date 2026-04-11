import { Flashcard, ReviewSession, SRSStage } from './srs';

const CARDS_KEY = 'hana_srs_cards';
const SESSIONS_KEY = 'hana_srs_sessions';

export function getCards(): Flashcard[] {
  const data = localStorage.getItem(CARDS_KEY);
  if (!data) return [];
  try {
    return JSON.parse(data);
  } catch (e) {
    console.error("Failed to parse cards from storage", e);
    return [];
  }
}

export function saveCards(cards: Flashcard[]): void {
  localStorage.setItem(CARDS_KEY, JSON.stringify(cards));
}

export function addCard(card: Omit<Flashcard, 'id' | 'srsStage' | 'nextReview' | 'totalReviews' | 'correctReviews' | 'incorrectReviews' | 'streak' | 'createdAt'>): Flashcard {
  const cards = getCards();
  const newCard: Flashcard = {
    ...card,
    id: crypto.randomUUID(),
    srsStage: 'apprentice1',
    nextReview: 0, // Ready for lesson immediately
    totalReviews: 0,
    correctReviews: 0,
    incorrectReviews: 0,
    streak: 0,
    createdAt: Date.now(),
  };
  cards.push(newCard);
  saveCards(cards);
  return newCard;
}

export function updateCard(card: Flashcard): void {
  const cards = getCards();
  const index = cards.findIndex(c => c.id === card.id);
  if (index !== -1) {
    cards[index] = card;
    saveCards(cards);
  }
}

export function deleteCard(id: string): void {
  const cards = getCards();
  saveCards(cards.filter(c => c.id !== id));
}

export function getSessions(): ReviewSession[] {
  const data = localStorage.getItem(SESSIONS_KEY);
  if (!data) return [];
  try {
    return JSON.parse(data);
  } catch (e) {
    console.error("Failed to parse sessions from storage", e);
    return [];
  }
}

export function saveSessions(sessions: ReviewSession[]): void {
  localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
}

export function addSession(session: Omit<ReviewSession, 'id'>): void {
  const sessions = getSessions();
  sessions.push({
    ...session,
    id: crypto.randomUUID()
  });
  saveSessions(sessions);
}

export function getDueCards(): Flashcard[] {
  const now = Date.now();
  return getCards().filter(c => c.nextReview > 0 && c.nextReview <= now && c.srsStage !== 'burned');
}

export function getLessonCards(): Flashcard[] {
  return getCards().filter(c => c.nextReview === 0);
}
