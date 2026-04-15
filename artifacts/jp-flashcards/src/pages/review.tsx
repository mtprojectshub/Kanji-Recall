import { useState, useRef, useEffect } from "react";
import { Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getNextStage, getStageName, calculateNextReview, SRSStage } from "@/lib/srs";
import {
  useGetDueCards,
  useGetLessonCards,
  useUpdateCard,
  useCreateSession,
  getGetDueCardsQueryKey,
  getGetDashboardQueryKey,
  getListSessionsQueryKey,
  getGetLessonCardsQueryKey,
} from "@workspace/api-client-react";
import { Check, ArrowRight, X, AlertCircle } from "lucide-react";
import { Progress } from "@/components/ui/progress";

// ---------------------------------------------------------------------------
// Rescue banner — shown when there are cards stuck in limbo
// (lessonComplete=false, totalReviews=0) that should be in the review queue
// ---------------------------------------------------------------------------
function RescueBanner({
  count,
  onRescue,
  rescuing,
}: {
  count: number;
  onRescue: () => void;
  rescuing: boolean;
}) {
  return (
    <div className="mb-6 flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-200">
      <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-600" />
      <div className="flex-1">
        <span className="font-medium">
          {count} card{count !== 1 ? "s" : ""} stuck in limbo.
        </span>{" "}
        {count === 1 ? "It was" : "They were"} added but never fully graduated
        from lessons. Click to move {count === 1 ? "it" : "them"} into your
        review queue now.
      </div>
      <Button
        size="sm"
        variant="outline"
        className="flex-shrink-0 border-amber-400 text-amber-900 hover:bg-amber-100 dark:border-amber-600 dark:text-amber-200 dark:hover:bg-amber-900/40"
        onClick={onRescue}
        disabled={rescuing}
      >
        {rescuing ? "Rescuing…" : `Rescue ${count === 1 ? "card" : "cards"}`}
      </Button>
    </div>
  );
}

export default function Review() {
  const queryClient = useQueryClient();
  const { data: serverCards = [], isLoading } = useGetDueCards();
  const { data: lessonCards = [] } = useGetLessonCards();
  const updateCard = useUpdateCard();
  const createSession = useCreateSession();

  // Count orphaned cards: in lesson queue but have totalReviews=0, meaning
  // they never completed the lesson flow and are invisible to the /due query.
  // Only flag cards that partially started lessons (lessonDirectionsCompleted has
  // entries) but never finished — NOT brand-new cards with empty directions.
  const orphanedCards = (lessonCards as any[]).filter(
    (c) =>
      c.totalReviews === 0 &&
      Array.isArray(c.lessonDirectionsCompleted) &&
      c.lessonDirectionsCompleted.length > 0
  );
  const orphanCount = orphanedCards.length;

  const [rescuing, setRescuing] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const handleRescue = async () => {
    setRescuing(true);
    try {
      // Patch each orphaned card to lessonComplete=true, nextReview=now
      await Promise.all(
        orphanedCards.map((card) =>
          updateCard.mutateAsync({
            id: card.id,
            data: {
              lessonComplete: true,
              nextReview: Date.now(),
              srsStage: "apprentice1",
            },
          })
        )
      );
      queryClient.invalidateQueries({ queryKey: getGetDueCardsQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetLessonCardsQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetDashboardQueryKey() });
      setDismissed(true);
    } catch (err) {
      console.error("Rescue failed", err);
    } finally {
      setRescuing(false);
    }
  };

  const showRescueBanner = orphanCount > 0 && !dismissed;

  // Freeze the card list at mount so background refetches don't shuffle cards mid-session
  const [cards] = useState(() => serverCards);
  const frozenCards = cards.length > 0 ? cards : serverCards;

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState<"correct" | "incorrect" | null>(null);
  const [sessionCorrect, setSessionCorrect] = useState(0);
  const [sessionIncorrect, setSessionIncorrect] = useState(0);
  const [sessionSaved, setSessionSaved] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const composingRef = useRef(false);

  // Prevent the Next/Continue button from being triggered by tab-switch focus
  // restoration or accidental double-tap. The button is disabled for 400ms
  // after feedback is shown, which is long enough for a tab switch to settle
  // but imperceptible to a deliberate click.
  const [nextReady, setNextReady] = useState(false);
  useEffect(() => {
    if (feedback !== null) {
      setNextReady(false);
      const t = setTimeout(() => setNextReady(true), 400);
      return () => clearTimeout(t);
    } else {
      setNextReady(false);
    }
  }, [feedback]);

  const saveSession = (correct: number, incorrect: number, total: number) => {
    if (sessionSaved) return;
    setSessionSaved(true);
    createSession.mutate(
      { data: { date: Date.now(), cardsReviewed: total, correct, incorrect } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetDueCardsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetDashboardQueryKey() });
          queryClient.invalidateQueries({ queryKey: getListSessionsQueryKey() });
        },
      }
    );
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

  if (frozenCards.length === 0) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center py-24 text-center animate-in fade-in">
          {showRescueBanner && (
            <div className="w-full max-w-md mb-8">
              <RescueBanner
                count={orphanCount}
                onRescue={handleRescue}
                rescuing={rescuing}
              />
            </div>
          )}
          <div className="bg-primary/10 text-primary w-24 h-24 rounded-full flex items-center justify-center mb-6 text-4xl font-serif">
            花
          </div>
          <h2 className="text-2xl font-serif font-semibold mb-2">No reviews due right now</h2>
          <p className="text-muted-foreground mb-8">
            You're doing great! Check back later or learn some new words.
          </p>
          <div className="flex gap-4">
            <Button asChild variant="outline">
              <Link href="/">Back to Dashboard</Link>
            </Button>
            <Button asChild>
              <Link href="/lessons">Learn New Words</Link>
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

  if (currentIndex >= frozenCards.length) {
    const total = sessionCorrect + sessionIncorrect;
    saveSession(sessionCorrect, sessionIncorrect, total);
    const pct = total > 0 ? Math.round((sessionCorrect / total) * 100) : 0;

    return (
      <Layout>
        <div className="flex flex-col items-center justify-center py-24 text-center animate-in fade-in slide-in-from-bottom-8 duration-500">
          <div className="text-primary w-24 h-24 rounded-full flex items-center justify-center mb-6 bg-primary/10">
            <Check className="w-12 h-12" />
          </div>
          <h2 className="text-3xl font-serif font-bold mb-2">Review Session Complete</h2>
          <p className="text-muted-foreground mb-8">
            {sessionCorrect} / {total} correct ({pct}%)
          </p>
          <div className="flex gap-4">
            <Button asChild variant="outline">
              <Link href="/">Back to Dashboard</Link>
            </Button>
            <Button asChild>
              <Link href="/lessons">Learn New Words</Link>
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

  const currentCard = frozenCards[currentIndex] as any;
  const totalCards = frozenCards.length;
  const progressPct = (currentIndex / totalCards) * 100;
  const currentStageName = getStageName(currentCard.srsStage as SRSStage);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (composingRef.current) return;
    if (feedback !== null || !answer.trim()) return;

    const normalise = (s: string) =>
      s.trim().toLowerCase().replace(/\s+/g, " ");
    const correct = normalise(answer) === normalise(currentCard.reading) ||
      normalise(answer) === normalise(currentCard.japanese);
    const result = correct ? "correct" : "incorrect";
    setFeedback(result);

    const nextStage = getNextStage(currentCard.srsStage as SRSStage, correct);
    const nextReview = calculateNextReview(nextStage);

    updateCard.mutate({
      id: currentCard.id,
      data: {
        srsStage: nextStage,
        nextReview,
        totalReviews: (currentCard.totalReviews ?? 0) + 1,
        correctReviews: (currentCard.correctReviews ?? 0) + (correct ? 1 : 0),
        incorrectReviews: (currentCard.incorrectReviews ?? 0) + (!correct ? 1 : 0),
        streak: correct ? (currentCard.streak ?? 0) + 1 : 0,
        lastReviewed: Date.now(),
      },
    });

    if (correct) setSessionCorrect((n) => n + 1);
    else setSessionIncorrect((n) => n + 1);
  };

  const handleNext = () => {
    setAnswer("");
    setFeedback(null);
    setCurrentIndex((i) => i + 1);
    setTimeout(() => inputRef.current?.focus(), 10);
  };

  return (
    <Layout>
      <div className="max-w-2xl mx-auto">
        {showRescueBanner && (
          <RescueBanner
            count={orphanCount}
            onRescue={handleRescue}
            rescuing={rescuing}
          />
        )}

        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-serif font-bold">Reviews</h1>
          <div className="text-sm font-medium text-muted-foreground">
            {currentIndex + 1} / {totalCards}
          </div>
        </div>

        <div className="flex items-center gap-3 mb-5">
          <Progress value={progressPct} className="h-2 flex-1" />
          <span className="text-sm font-medium text-muted-foreground tabular-nums whitespace-nowrap">
            {currentIndex} / {totalCards}
          </span>
        </div>

        <Card className="min-h-[450px] flex flex-col justify-between border shadow-sm relative overflow-hidden bg-card">
          <CardContent className="flex-1 flex flex-col items-center justify-center p-8 text-center h-full relative">
            {feedback !== null && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="bg-background/80 backdrop-blur-sm px-4 py-2 rounded-full text-sm font-medium shadow-sm flex items-center gap-2">
                  <span className="text-muted-foreground">{currentStageName}</span>
                  <span className="text-muted-foreground">→</span>
                  <span className={feedback === "correct" ? "text-green-600" : "text-destructive"}>
                    {getStageName(getNextStage(currentCard.srsStage as SRSStage, feedback === "correct"))}
                  </span>
                </div>
              </div>
            )}

            <div className="flex-1 flex flex-col items-center justify-center">
              <div className="text-xs text-muted-foreground uppercase tracking-widest mb-3">
                What is the reading?
              </div>

              <div className="text-4xl md:text-5xl font-serif font-semibold mb-6 text-foreground">
                {currentCard.english}
              </div>

              {feedback !== null && (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 text-center">
                  <div className="text-4xl font-serif font-bold text-foreground">
                    {currentCard.japanese}
                  </div>
                  {currentCard.reading && (
                    <div className="text-xl text-muted-foreground font-serif">
                      {currentCard.reading}
                    </div>
                  )}
                  {feedback === "incorrect" && (
                    <div className="flex items-center gap-2 text-destructive animate-in fade-in mt-2">
                      <X className="w-4 h-4" />
                      <span className="text-lg font-serif">{answer}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Input area */}
            <div className="w-full max-w-lg mt-auto">
              <form onSubmit={handleSubmit} className="flex gap-2">
                <Input
                  ref={inputRef}
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  onCompositionStart={() => { composingRef.current = true; }}
                  onCompositionEnd={() => { composingRef.current = false; }}
                  placeholder="ひらがなで入力..."
                  lang="ja"
                  className={`h-24 text-5xl md:text-5xl text-center font-serif ${
                    feedback !== null ? "pointer-events-none" : ""
                  } ${
                    feedback === "correct"
                      ? "border-green-500 text-green-600"
                      : feedback === "incorrect"
                      ? "border-destructive text-destructive"
                      : ""
                  }`}
                  disabled={feedback !== null}
                  autoFocus
                  autoComplete="off"
                />
                {!feedback && (
                  <Button
                    type="submit"
                    size="icon"
                    className="h-24 w-16 bg-primary hover:bg-primary/90 flex-shrink-0"
                    disabled={!answer.trim()}
                  >
                    <ArrowRight className="w-6 h-6" />
                  </Button>
                )}
              </form>

              {feedback !== null && (
                <Button
                  onClick={handleNext}
                  className={`w-full h-14 mt-4 text-lg animate-in fade-in slide-in-from-bottom-2 ${
                    feedback === "correct"
                      ? "bg-green-600 text-white hover:bg-green-700"
                      : "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  }`}
                  disabled={!nextReady}
                >
                  {feedback === "correct" ? "Next" : "Continue"}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
