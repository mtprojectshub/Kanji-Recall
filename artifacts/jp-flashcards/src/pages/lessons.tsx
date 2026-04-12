import { useEffect, useMemo, useRef, useState } from "react";
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

export default function Lessons() {
  const queryClient = useQueryClient();
  const { data: fetchedCards = [], isLoading } = useGetLessonCards();
  const updateCard = useUpdateCard();

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

  const currentCard = queue[currentIndex];
  const lesson = currentCard ? getLessonPrompt(currentCard as any, direction) : null;

  const getCardDirs = (id: string) => completedDirs.get(id) ?? new Set<string>();
  const dirDone = (id: string, dir: string) => getCardDirs(id).has(dir);

  const batchFinished = batchSizeRef.current > 0 && queue.length === 0;
  const completedCount = batchSizeRef.current - queue.length;
  const progressPct = batchSizeRef.current > 0 ? (completedCount / batchSizeRef.current) * 100 : 0;

  const handleNext = (knew: boolean) => {
    if (!currentCard) return;

    if (knew) {
      const dirs = new Set(getCardDirs(currentCard.id));
      dirs.add(direction);
      setCompletedDirs(new Map(completedDirs).set(currentCard.id, dirs));

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
            <p className="text-muted-foreground mb-2">Great work on this batch of {BATCH_SIZE} words.</p>
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

  const batchDirection = direction;
  const currentBatchComplete = batchFinished;
  const allCardsDoneInCurrentDirection = queue.every((card) =>
    dirDone(card.id, batchDirection)
  );
  const shouldShowSwitchHint = allCardsDoneInCurrentDirection && !currentBatchComplete;

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
            {completedCount} / {batchSizeRef.current}
          </span>
        </div>

        {shouldShowSwitchHint && (
          <div className="mb-4 rounded-lg border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
            This batch is done in {batchDirection === "jp-en" ? "JP → EN" : "EN → JP"}. Switch to the opposite direction to continue.
          </div>
        )}

        <Card className="min-h-[450px] flex flex-col justify-between border shadow-sm relative overflow-hidden bg-card">
          <CardContent className="flex-1 flex flex-col items-center justify-center p-8 text-center h-full">
            <div className="flex-1 flex flex-col items-center justify-center">
              {lesson?.reading && direction === "jp-en" && flipped && (
                <div className="text-xl text-muted-foreground mb-3 font-serif">
                  {lesson.reading}
                </div>
              )}
              <div className="text-6xl md:text-8xl font-serif mb-8 text-foreground">
                {lesson?.prompt}
              </div>

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
