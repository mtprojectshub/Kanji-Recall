import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { LessonDirection, getLessonPrompt } from "@/lib/srs";
import {
  useGetLessonCards,
  useUpdateCard,
  getGetLessonCardsQueryKey,
  getGetDashboardQueryKey,
} from "@workspace/api-client-react";

const BATCH_SIZE = 15;

type ApiCard = {
  id: string;
  japanese: string;
  reading: string;
  english: string;
  partOfSpeech?: string | null;
  srsStage: string;
  lessonDirectionsCompleted: string[];
  lessonComplete: boolean;
  nextReview: number;
};

// ---------------------------------------------------------------------------
// TTS hook — wraps Web Speech API for Japanese pronunciation
// ---------------------------------------------------------------------------
function useSpeech() {
  const [speaking, setSpeaking] = useState(false);

  const speak = useCallback((text: string) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "ja-JP";
    utterance.rate = 0.85;

    // Prefer a local Japanese voice if available
    const voices = window.speechSynthesis.getVoices();
    const jpVoice =
      voices.find((v) => v.lang.startsWith("ja") && v.localService) ??
      voices.find((v) => v.lang.startsWith("ja"));
    if (jpVoice) utterance.voice = jpVoice;

    utterance.onstart = () => setSpeaking(true);
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);

    window.speechSynthesis.speak(utterance);
  }, []);

  const cancel = useCallback(() => {
    window.speechSynthesis?.cancel();
    setSpeaking(false);
  }, []);

  return { speak, cancel, speaking };
}

// ---------------------------------------------------------------------------
// Speak button
// ---------------------------------------------------------------------------
function SpeakButton({
  text,
  speak,
  speaking,
}: {
  text: string;
  speak: (t: string) => void;
  speaking: boolean;
}) {
  return (
    <button
      type="button"
      aria-label="Play pronunciation"
      onClick={(e) => {
        e.stopPropagation();
        speak(text);
      }}
      className={`
        inline-flex items-center justify-center w-10 h-10
        rounded-full border transition-all
        ${
          speaking
            ? "border-primary bg-primary/10 text-primary animate-pulse"
            : "border-border bg-background text-muted-foreground hover:border-primary hover:text-primary hover:bg-primary/5"
        }
      `}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="currentColor"
        className="w-5 h-5"
      >
        <path d="M13.5 4.06c0-1.336-1.616-2.005-2.56-1.06l-4.5 4.5H4.508c-1.141 0-2.318.664-2.66 1.905A9.76 9.76 0 0 0 1.5 12c0 .898.121 1.768.35 2.595.341 1.24 1.518 1.905 2.659 1.905h1.93l4.5 4.5c.945.945 2.561.276 2.561-1.06V4.06ZM18.584 5.106a.75.75 0 0 1 1.06 0c3.808 3.807 3.808 9.98 0 13.788a.75.75 0 0 1-1.06-1.06 8.25 8.25 0 0 0 0-11.668.75.75 0 0 1 0-1.06Z" />
        <path d="M15.932 7.757a.75.75 0 0 1 1.061 0 6 6 0 0 1 0 8.486.75.75 0 0 1-1.06-1.061 4.5 4.5 0 0 0 0-6.364.75.75 0 0 1 0-1.06Z" />
      </svg>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export default function Lessons() {
  const queryClient = useQueryClient();
  const { data: fetchedCards = [], isLoading } = useGetLessonCards();
  const updateCard = useUpdateCard();
  const { speak, cancel, speaking } = useSpeech();

  const [queue, setQueue] = useState<ApiCard[]>([]);
  const seeded = useRef(false);
  const batchSizeRef = useRef(0);
  useEffect(() => {
    if (!seeded.current && !isLoading && fetchedCards.length > 0) {
      const batch = (fetchedCards as ApiCard[]).slice(0, BATCH_SIZE);
      setQueue(batch);
      batchSizeRef.current = batch.length;
      seeded.current = true;
    }
  }, [fetchedCards, isLoading]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [direction, setDirection] = useState<LessonDirection>("jp-en");

  const [completedDirs, setCompletedDirs] = useState<Map<string, Set<string>>>(
    () => new Map()
  );

  // Stop any speech when the card or direction changes
  useEffect(() => {
    cancel();
  }, [currentIndex, direction, cancel]);

  const currentCard = queue[currentIndex];
  const lesson = currentCard ? getLessonPrompt(currentCard as any, direction) : null;

  const getCardDirs = (id: string) => completedDirs.get(id) ?? new Set<string>();
  const dirDone = (id: string, dir: string) => getCardDirs(id).has(dir);

  const batchFinished = batchSizeRef.current > 0 && queue.length === 0;

  // Progress: direction-slots (each card × 2 directions)
  const removedCount = batchSizeRef.current - queue.length;
  const inQueueCompleted = queue.reduce((acc, c) => acc + getCardDirs(c.id).size, 0);
  const completedSlots = removedCount * 2 + inQueueCompleted;
  const totalSlots = batchSizeRef.current * 2;
  const progressPct = totalSlots > 0 ? (completedSlots / totalSlots) * 100 : 0;

  const findNextPending = (
    updatedDirs: Map<string, Set<string>>,
    dir: string,
    fromIndex: number
  ): number => {
    const len = queue.length;
    for (let offset = 1; offset <= len; offset++) {
      const idx = (fromIndex + offset) % len;
      const card = queue[idx];
      const cardDirs = updatedDirs.get(card.id) ?? new Set<string>();
      if (!cardDirs.has(dir)) return idx;
    }
    return -1;
  };

  const handleNext = (knew: boolean) => {
    if (!currentCard) return;

    if (knew) {
      const dirs = new Set(getCardDirs(currentCard.id));
      dirs.add(direction);
      const newCompletedDirs = new Map(completedDirs).set(currentCard.id, dirs);
      setCompletedDirs(newCompletedDirs);

      const bothDone = dirs.has("jp-en") && dirs.has("en-jp");

      if (bothDone) {
        updateCard.mutate(
          {
            id: currentCard.id,
            data: {
              lessonDirectionsCompleted: Array.from(dirs),
              lessonComplete: true,
              nextReview: Date.now(),
              srsStage: "apprentice1",
            },
          },
          {
            onSuccess: () => {
              queryClient.invalidateQueries({ queryKey: getGetLessonCardsQueryKey() });
              queryClient.invalidateQueries({ queryKey: getGetDashboardQueryKey() });
            },
          }
        );

        const newQueue = queue.filter((c) => c.id !== currentCard.id);
        setQueue(newQueue);
        setCurrentIndex((i) => Math.min(i, Math.max(0, newQueue.length - 1)));
        setFlipped(false);
        return;
      }

      const nextIdx = findNextPending(newCompletedDirs, direction, currentIndex);

      if (nextIdx === -1) {
        const nextDir: LessonDirection = direction === "jp-en" ? "en-jp" : "jp-en";
        setDirection(nextDir);
        setCurrentIndex(0);
      } else {
        setCurrentIndex(nextIdx);
      }

      setFlipped(false);
      return;
    }

    setCurrentIndex((i) => (i + 1) % queue.length);
    setFlipped(false);
  };

  const handleStartNextBatch = () => {
    const batch = (fetchedCards as ApiCard[]).slice(0, BATCH_SIZE);
    setQueue(batch);
    batchSizeRef.current = batch.length;
    setCurrentIndex(0);
    setFlipped(false);
    setDirection("jp-en");
    setCompletedDirs(new Map());
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="flex justify-center items-center py-24">
          <div className="animate-spin w-12 h-12 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      </Layout>
    );
  }

  if (queue.length === 0) {
    const remaining = fetchedCards.length;

    if (remaining > 0) {
      return (
        <Layout>
          <div className="flex flex-col items-center justify-center py-24 text-center animate-in fade-in">
            <div className="bg-primary/10 text-primary w-24 h-24 rounded-full flex items-center justify-center mb-6 text-4xl font-serif">
              花
            </div>
            <h2 className="text-2xl font-serif font-semibold mb-2">Batch complete!</h2>
            <p className="text-muted-foreground mb-2">
              Great work on this batch of {BATCH_SIZE} words.
            </p>
            <p className="text-muted-foreground mb-8">
              {remaining} more word{remaining !== 1 ? "s" : ""} waiting in your next batch.
            </p>
            <div className="flex gap-4">
              <Button asChild variant="outline">
                <Link href="/">Back to Dashboard</Link>
              </Button>
              <Button onClick={handleStartNextBatch}>
                Start Next Batch ({Math.min(remaining, BATCH_SIZE)} words)
              </Button>
            </div>
          </div>
        </Layout>
      );
    }

    return (
      <Layout>
        <div className="flex flex-col items-center justify-center py-24 text-center animate-in fade-in">
          <div className="bg-primary/10 text-primary w-24 h-24 rounded-full flex items-center justify-center mb-6 text-4xl font-serif">
            花
          </div>
          <h2 className="text-2xl font-serif font-semibold mb-2">You're all caught up!</h2>
          <p className="text-muted-foreground mb-8">
            No new lessons in your queue. Take a break or add more vocabulary.
          </p>
          <div className="flex gap-4">
            <Button asChild variant="outline">
              <Link href="/">Back to Dashboard</Link>
            </Button>
            <Button asChild>
              <Link href="/upload">Add Vocabulary</Link>
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

  if (!currentCard) return null;

  const allCardsDoneInCurrentDirection = queue.every((card) =>
    dirDone(card.id, direction)
  );
  const shouldShowSwitchHint = allCardsDoneInCurrentDirection && !batchFinished;

  return (
    <Layout>
      <div className="max-w-2xl mx-auto animate-in fade-in duration-500">
        <div className="flex justify-between items-center mb-6 gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-serif font-bold">New Lessons</h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Learn the full batch in one direction first, then switch.
            </p>
          </div>

          <div className="flex items-center gap-2 rounded-full border bg-background p-1 text-sm">
            <Button
              size="sm"
              variant={direction === "jp-en" ? "default" : "ghost"}
              onClick={() => {
                setDirection("jp-en");
                setFlipped(false);
              }}
            >
              JP → EN
            </Button>
            <Button
              size="sm"
              variant={direction === "en-jp" ? "default" : "ghost"}
              onClick={() => {
                setDirection("en-jp");
                setFlipped(false);
              }}
            >
              EN → JP
            </Button>
          </div>

          <span className="text-muted-foreground font-medium bg-muted px-3 py-1 rounded-full text-sm">
            {queue.length} left in batch
          </span>
        </div>

        <div className="flex items-center gap-3 mb-5">
          <Progress value={progressPct} className="h-2 flex-1" />
          <span className="text-sm font-medium text-muted-foreground tabular-nums whitespace-nowrap">
            {completedSlots} / {totalSlots}
          </span>
        </div>

        {shouldShowSwitchHint && (
          <div className="mb-4 rounded-lg border bg-primary/10 px-4 py-3 text-sm text-primary font-medium">
            ✓ All words learned in {direction === "jp-en" ? "JP → EN" : "EN → JP"}! Switching to{" "}
            {direction === "jp-en" ? "EN → JP" : "JP → EN"} direction…
          </div>
        )}

        <Card className="min-h-[450px] flex flex-col justify-between border shadow-sm relative overflow-hidden bg-card">
          <CardContent className="flex-1 flex flex-col items-center justify-center p-8 text-center h-full">
            <div className="flex-1 flex flex-col items-center justify-center">

              {/* ── JP→EN: Japanese is the prompt — 🔊 always visible ── */}
              {direction === "jp-en" && (
                <>
                  {flipped && lesson?.reading && (
                    <div className="text-xl text-muted-foreground mb-3 font-serif">
                      {lesson.reading}
                    </div>
                  )}
                  <div className="flex items-center justify-center gap-3 mb-8">
                    <div className="text-6xl md:text-8xl font-serif text-foreground">
                      {lesson?.prompt}
                    </div>
                    <SpeakButton
                      text={currentCard.japanese}
                      speak={speak}
                      speaking={speaking}
                    />
                  </div>
                </>
              )}

              {/* ── EN→JP: English is the prompt — no 🔊 until answer revealed ── */}
              {direction === "en-jp" && (
                <div className="text-6xl md:text-8xl font-serif mb-8 text-foreground">
                  {lesson?.prompt}
                </div>
              )}

              <div className="flex gap-2 mb-4">
                {(["jp-en", "en-jp"] as const).map((dir) => (
                  <span
                    key={dir}
                    className={`text-xs px-2.5 py-1 rounded-full border font-medium transition-colors ${
                      dirDone(currentCard.id, dir)
                        ? "bg-green-100 text-green-700 border-green-300"
                        : dir === direction
                        ? "bg-primary/10 text-primary border-primary/30"
                        : "bg-muted text-muted-foreground border-border"
                    }`}
                  >
                    {dir === "jp-en" ? "JP→EN" : "EN→JP"}
                    {dirDone(currentCard.id, dir) ? " ✓" : ""}
                  </span>
                ))}
              </div>

              {flipped && lesson && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 space-y-3">
                  {direction === "en-jp" ? (
                    <>
                      {/* Japanese answer + 🔊 side by side */}
                      <div className="flex items-center justify-center gap-3">
                        <div className="text-3xl font-semibold text-primary">
                          {lesson.answer}
                        </div>
                        <SpeakButton
                          text={currentCard.japanese}
                          speak={speak}
                          speaking={speaking}
                        />
                      </div>
                      {lesson.reading && (
                        <div className="text-xl text-muted-foreground font-serif">
                          {lesson.reading}
                        </div>
                      )}
                    </>
                  ) : (
                    /* JP→EN answer is English — no 🔊 needed */
                    <div className="text-3xl font-semibold text-primary">
                      {lesson.answer}
                    </div>
                  )}

                  {currentCard.partOfSpeech && (
                    <div className="text-sm text-muted-foreground uppercase tracking-widest">
                      {currentCard.partOfSpeech}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="w-full max-w-sm mt-8">
              {flipped ? (
                <div className="flex gap-4 animate-in fade-in duration-300">
                  <Button
                    variant="outline"
                    className="flex-1 border-destructive text-destructive hover:bg-destructive/10 h-14 text-lg"
                    onClick={() => handleNext(false)}
                  >
                    Needs Work
                  </Button>
                  <Button
                    className="flex-1 bg-primary hover:bg-primary/90 h-14 text-lg"
                    onClick={() => handleNext(true)}
                  >
                    Got It
                  </Button>
                </div>
              ) : (
                <Button
                  onClick={() => setFlipped(true)}
                  size="lg"
                  className="w-full h-14 text-lg bg-secondary text-secondary-foreground hover:bg-secondary/90 transition-all"
                >
                  Reveal Answer
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
