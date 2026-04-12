import { useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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

export default function Lessons() {
  const queryClient = useQueryClient();
  const { data: fetchedCards = [], isLoading } = useGetLessonCards();
  const updateCard = useUpdateCard();

  // The active batch for this session — seeded once, never replaced by background refetches
  const [queue, setQueue] = useState<ApiCard[]>([]);
  const seeded = useRef(false);
  useEffect(() => {
    if (!seeded.current && !isLoading && fetchedCards.length > 0) {
      setQueue((fetchedCards as ApiCard[]).slice(0, BATCH_SIZE));
      seeded.current = true;
    }
  }, [fetchedCards, isLoading]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [direction, setDirection] = useState<LessonDirection>("jp-en");

  // Per-card direction completion tracked locally
  const [completedDirs, setCompletedDirs] = useState<Map<string, Set<string>>>(
    () => new Map()
  );

  const currentCard = queue[currentIndex];
  const lesson = currentCard ? getLessonPrompt(currentCard as any, direction) : null;

  const getCardDirs = (id: string) => completedDirs.get(id) ?? new Set<string>();
  const dirDone = (id: string, dir: string) => getCardDirs(id).has(dir);

  const handleNext = (knew: boolean) => {
    if (!currentCard) return;

    if (knew) {
      // Mark this direction as learned
      const dirs = new Set(getCardDirs(currentCard.id));
      dirs.add(direction);
      setCompletedDirs(new Map(completedDirs).set(currentCard.id, dirs));

      const bothDone = dirs.has("jp-en") && dirs.has("en-jp");

      if (bothDone) {
        // Graduate this card to the review queue
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
        // Remove from local batch and clamp index
        const newQueue = queue.filter((c) => c.id !== currentCard.id);
        setQueue(newQueue);
        setCurrentIndex((i) => Math.min(i, Math.max(0, newQueue.length - 1)));
        setFlipped(false);
        return;
      }

      // One direction done — immediately flip to the other direction for the same card
      const otherDir: LessonDirection = direction === "jp-en" ? "en-jp" : "jp-en";
      setDirection(otherDir);
      setFlipped(false);
      return;
    }

    // "Needs Work" — advance to next card (wrap), keep current direction
    setCurrentIndex((i) => (i + 1) % queue.length);
    setFlipped(false);
  };

  const handleStartNextBatch = () => {
    setQueue((fetchedCards as ApiCard[]).slice(0, BATCH_SIZE));
    setCurrentIndex(0);
    setFlipped(false);
    setDirection("jp-en");
    setCompletedDirs(new Map());
  };

  // ── Loading ────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <Layout>
        <div className="flex justify-center items-center py-24">
          <div className="animate-spin w-12 h-12 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      </Layout>
    );
  }

  // ── Empty states ───────────────────────────────────────────────────────────
  if (queue.length === 0) {
    const remaining = fetchedCards.length;

    if (remaining > 0) {
      // This batch is done but there are more lessons waiting
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

    // Truly all done
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

  // ── Main lesson view ───────────────────────────────────────────────────────
  return (
    <Layout>
      <div className="max-w-2xl mx-auto animate-in fade-in duration-500">
        <div className="flex justify-between items-center mb-6 gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-serif font-bold">New Lessons</h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Learn each word in both directions to move it to reviews.
            </p>
          </div>

          {/* Manual direction toggle */}
          <div className="flex items-center gap-2 rounded-full border bg-background p-1 text-sm">
            <Button
              size="sm"
              variant={direction === "jp-en" ? "default" : "ghost"}
              onClick={() => { setDirection("jp-en"); setFlipped(false); }}
            >
              JP → EN
            </Button>
            <Button
              size="sm"
              variant={direction === "en-jp" ? "default" : "ghost"}
              onClick={() => { setDirection("en-jp"); setFlipped(false); }}
            >
              EN → JP
            </Button>
          </div>

          <span className="text-muted-foreground font-medium bg-muted px-3 py-1 rounded-full text-sm">
            {queue.length} left in batch
          </span>
        </div>

        {/* Per-card progress bar */}
        <div className="flex gap-1 mb-4 flex-wrap">
          {queue.map((card, i) => {
            const jp = dirDone(card.id, "jp-en");
            const en = dirDone(card.id, "en-jp");
            return (
              <div
                key={card.id}
                className={`h-1.5 flex-1 rounded-full transition-colors ${
                  i === currentIndex
                    ? "bg-primary"
                    : jp && en
                    ? "bg-green-400"
                    : jp || en
                    ? "bg-primary/40"
                    : "bg-muted"
                }`}
              />
            );
          })}
        </div>

        <Card className="min-h-[450px] flex flex-col justify-between border shadow-sm relative overflow-hidden bg-card">
          <CardContent className="flex-1 flex flex-col items-center justify-center p-8 text-center h-full">
            <div className="flex-1 flex flex-col items-center justify-center">

              {/* Prompt */}
              {lesson?.reading && direction === "jp-en" && flipped && (
                <div className="text-xl text-muted-foreground mb-3 font-serif">
                  {lesson.reading}
                </div>
              )}
              <div className="text-6xl md:text-8xl font-serif mb-8 text-foreground">
                {lesson?.prompt}
              </div>

              {/* Direction completion badges */}
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

              {/* Revealed answer */}
              {flipped && lesson && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 space-y-2">
                  <div className="text-3xl font-semibold text-primary">{lesson.answer}</div>
                  {direction === "en-jp" && lesson.reading && (
                    <div className="text-xl text-muted-foreground font-serif">
                      {lesson.reading}
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
