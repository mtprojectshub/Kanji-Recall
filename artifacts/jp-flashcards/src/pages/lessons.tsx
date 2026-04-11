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

  // Capture the lesson queue once — never let a background refetch change it mid-session
  const [queue, setQueue] = useState<ApiCard[]>([]);
  const seeded = useRef(false);
  useEffect(() => {
    if (!seeded.current && fetchedCards.length > 0) {
      setQueue(fetchedCards as ApiCard[]);
      seeded.current = true;
    }
  }, [fetchedCards]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [direction, setDirection] = useState<LessonDirection>("jp-en");

  // Track which directions are done for each card locally (cardId → Set of directions)
  const [completedDirs, setCompletedDirs] = useState<Map<string, Set<string>>>(
    () => new Map()
  );

  const currentCard = queue[currentIndex];

  const lesson =
    currentCard ? getLessonPrompt(currentCard as any, direction) : null;

  const getCardDirs = (cardId: string) =>
    completedDirs.get(cardId) ?? new Set<string>();

  const handleNext = (knew: boolean) => {
    if (!currentCard) return;

    let newCompletedDirs = new Map(completedDirs);

    if (knew) {
      const dirs = new Set(getCardDirs(currentCard.id));
      dirs.add(direction);
      newCompletedDirs.set(currentCard.id, dirs);
      setCompletedDirs(newCompletedDirs);

      const bothDone =
        dirs.has("jp-en") && dirs.has("en-jp");

      if (bothDone) {
        // Persist to server and remove from local queue
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
              queryClient.invalidateQueries({
                queryKey: getGetLessonCardsQueryKey(),
              });
              queryClient.invalidateQueries({
                queryKey: getGetDashboardQueryKey(),
              });
            },
          }
        );

        // Remove the finished card from the local queue
        const newQueue = queue.filter((c) => c.id !== currentCard.id);
        setQueue(newQueue);
        const nextIndex = Math.min(currentIndex, newQueue.length - 1);
        setCurrentIndex(Math.max(0, nextIndex));
        setFlipped(false);
        return;
      }
    }

    // Advance to next card (wrap around so every card gets seen)
    const nextIndex = (currentIndex + 1) % queue.length;
    setCurrentIndex(nextIndex);
    setFlipped(false);
  };

  const dirDone = (cardId: string, dir: string) =>
    getCardDirs(cardId).has(dir);

  if (isLoading) {
    return (
      <Layout>
        <div className="flex justify-center items-center py-24">
          <div className="animate-spin w-12 h-12 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      </Layout>
    );
  }

  if (queue.length === 0 && !isLoading) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center py-24 text-center animate-in fade-in">
          <div className="bg-primary/10 text-primary w-24 h-24 rounded-full flex items-center justify-center mb-6 text-4xl font-serif">
            花
          </div>
          <h2 className="text-2xl font-serif font-semibold mb-2">
            You're all caught up!
          </h2>
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

  return (
    <Layout>
      <div className="max-w-2xl mx-auto animate-in fade-in duration-500">
        <div className="flex justify-between items-center mb-8 gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-serif font-bold">New Lessons</h1>
            <p className="text-muted-foreground mt-1">
              Complete both directions for each card to move it to reviews.
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
              Japanese → English
            </Button>
            <Button
              size="sm"
              variant={direction === "en-jp" ? "default" : "ghost"}
              onClick={() => {
                setDirection("en-jp");
                setFlipped(false);
              }}
            >
              English → Japanese
            </Button>
          </div>

          <span className="text-muted-foreground font-medium bg-muted px-3 py-1 rounded-full text-sm">
            {currentIndex + 1} / {queue.length}
          </span>
        </div>

        {/* Progress indicators per card */}
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

        <Card className="min-h-[450px] flex flex-col justify-between border shadow-sm relative overflow-hidden transition-all duration-300 bg-card">
          <CardContent className="flex-1 flex flex-col items-center justify-center p-8 text-center h-full">
            <div className="flex-1 flex flex-col items-center justify-center">
              {lesson?.reading && direction === "jp-en" && flipped && (
                <div className="text-xl text-muted-foreground mb-4 font-serif">
                  {lesson.reading}
                </div>
              )}
              <div className="text-6xl md:text-8xl font-serif mb-8 text-foreground">
                {lesson?.prompt}
              </div>

              {/* Show which directions are done for this card */}
              <div className="flex gap-2 mb-4">
                <span
                  className={`text-xs px-2 py-0.5 rounded-full border ${
                    dirDone(currentCard.id, "jp-en")
                      ? "bg-green-100 text-green-700 border-green-300"
                      : "bg-muted text-muted-foreground border-border"
                  }`}
                >
                  JP→EN {dirDone(currentCard.id, "jp-en") ? "✓" : ""}
                </span>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full border ${
                    dirDone(currentCard.id, "en-jp")
                      ? "bg-green-100 text-green-700 border-green-300"
                      : "bg-muted text-muted-foreground border-border"
                  }`}
                >
                  EN→JP {dirDone(currentCard.id, "en-jp") ? "✓" : ""}
                </span>
              </div>

              {flipped && lesson && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 space-y-2">
                  <div className="text-3xl font-semibold text-primary">
                    {lesson.answer}
                  </div>
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
                  className="w-full h-14 text-lg bg-secondary text-secondary-foreground hover:bg-secondary/90 hover-elevate transition-all"
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
