import { useState, useRef } from "react";
import { Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getNextStage, getStageName, calculateNextReview, SRSStage } from "@/lib/srs";
import {
  useGetDueCards,
  useUpdateCard,
  useCreateSession,
  getGetDueCardsQueryKey,
  getGetDashboardQueryKey,
  getListSessionsQueryKey,
} from "@workspace/api-client-react";
import { Check, ArrowRight, X } from "lucide-react";
import { Progress } from "@/components/ui/progress";

export default function Review() {
  const queryClient = useQueryClient();
  const { data: serverCards = [], isLoading } = useGetDueCards();
  const updateCard = useUpdateCard();
  const createSession = useCreateSession();

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
  // Track IME composition to avoid submitting mid-composition
  const composingRef = useRef(false);

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
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center py-24 text-center animate-in fade-in slide-in-from-bottom-8 duration-500">
          <div className="text-primary w-24 h-24 rounded-full flex items-center justify-center mb-6 bg-primary/10">
            <Check className="w-12 h-12" />
          </div>
          <h2 className="text-3xl font-serif font-bold mb-2">Review Session Complete</h2>
          <p className="text-muted-foreground mb-8">
            You reviewed {frozenCards.length} cards with{" "}
            {frozenCards.length > 0
              ? Math.round((sessionCorrect / frozenCards.length) * 100)
              : 0}
            % accuracy.
          </p>
          <Button asChild size="lg">
            <Link href="/">Return Home</Link>
          </Button>
        </div>
      </Layout>
    );
  }

  const card = frozenCards[currentIndex];
  const progress = (currentIndex / frozenCards.length) * 100;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (feedback !== null) return;
    if (composingRef.current) return;
    if (!answer.trim()) return;

    const typed = answer.trim();
    // Accept either the kanji form or the hiragana reading
    const isCorrect =
      typed === card.japanese.trim() ||
      (card.reading.trim() !== "" && typed === card.reading.trim());

    setFeedback(isCorrect ? "correct" : "incorrect");

    const newCorrect = sessionCorrect + (isCorrect ? 1 : 0);
    const newIncorrect = sessionIncorrect + (!isCorrect ? 1 : 0);
    if (isCorrect) setSessionCorrect(newCorrect);
    else setSessionIncorrect(newIncorrect);

    const nextStage = getNextStage(card.srsStage as SRSStage, isCorrect);
    const nextReview = calculateNextReview(nextStage);

    updateCard.mutate({
      id: card.id,
      data: {
        srsStage: nextStage,
        nextReview,
        totalReviews: card.totalReviews + 1,
        correctReviews: card.correctReviews + (isCorrect ? 1 : 0),
        incorrectReviews: card.incorrectReviews + (!isCorrect ? 1 : 0),
        streak: isCorrect ? card.streak + 1 : 0,
        lastReviewed: Date.now(),
      },
    });

    // If this was the last card, save the session now
    if (currentIndex === frozenCards.length - 1) {
      saveSession(newCorrect, newIncorrect, frozenCards.length);
    }
  };

  const handleNext = () => {
    setFeedback(null);
    setAnswer("");
    setCurrentIndex((prev) => prev + 1);
    setTimeout(() => inputRef.current?.focus(), 10);
  };

  const currentStageName = getStageName(card.srsStage as SRSStage);
  const nextStageForDisplay = getNextStage(card.srsStage as SRSStage, feedback === "correct");
  const nextStageName = getStageName(nextStageForDisplay);

  return (
    <Layout>
      <div className="max-w-2xl mx-auto">
        <div className="mb-6 flex items-center gap-4">
          <div className="flex-1">
            <Progress value={progress} className="h-2" />
          </div>
          <div className="text-sm font-medium text-muted-foreground">
            {currentIndex} / {frozenCards.length}
          </div>
        </div>

        <Card
          className={`min-h-[480px] flex flex-col justify-between border shadow-sm relative overflow-hidden transition-colors duration-300 ${
            feedback === "correct"
              ? "bg-green-50 border-green-400"
              : feedback === "incorrect"
              ? "bg-destructive/10 border-destructive"
              : "bg-card"
          }`}
        >
          <CardContent className="flex-1 flex flex-col items-center justify-center p-8 text-center h-full relative">

            {/* SRS stage change banner */}
            {feedback !== null && (
              <div className="absolute top-6 left-0 right-0 flex justify-center animate-in fade-in slide-in-from-top-4">
                <div className="bg-background/80 backdrop-blur-sm px-4 py-2 rounded-full text-sm font-medium shadow-sm flex items-center gap-2">
                  <span className="text-muted-foreground">{currentStageName}</span>
                  <ArrowRight className="w-4 h-4" />
                  <span className={feedback === "correct" ? "text-green-600" : "text-destructive"}>
                    {nextStageName}
                  </span>
                </div>
              </div>
            )}

            <div className="flex-1 flex flex-col items-center justify-center w-full">
              {/* Part of speech label */}
              {card.partOfSpeech && (
                <div className="text-xs text-muted-foreground uppercase tracking-widest mb-3">
                  {card.partOfSpeech}
                </div>
              )}

              {/* English prompt — shown throughout */}
              <div className="text-4xl md:text-5xl font-serif font-semibold mb-6 text-foreground">
                {card.english}
              </div>

              {/* Correct Japanese answer — revealed after submission */}
              {feedback !== null && (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-1 mb-4">
                  <div className="text-4xl font-serif font-bold text-foreground">
                    {card.japanese}
                  </div>
                  {card.reading && card.reading !== card.japanese && (
                    <div className="text-xl text-muted-foreground font-serif">
                      {card.reading}
                    </div>
                  )}
                </div>
              )}

              {/* Wrong answer — show what the user typed */}
              {feedback === "incorrect" && (
                <div className="flex items-center gap-2 text-destructive animate-in fade-in mt-2">
                  <X className="w-4 h-4 flex-shrink-0" />
                  <span className="text-lg font-serif">{answer}</span>
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
                  autoFocus
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
