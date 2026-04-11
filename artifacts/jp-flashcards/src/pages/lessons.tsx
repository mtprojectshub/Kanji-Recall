import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { Layout } from "@/components/layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Flashcard, LessonDirection, getLessonPrompt, processReview } from "@/lib/srs";
import { getLessonCards, updateCard } from "@/lib/storage";

export default function Lessons() {
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [direction, setDirection] = useState<LessonDirection>("jp-en");

  useEffect(() => {
    setCards(getLessonCards());
  }, []);

  const currentCard = cards[currentIndex];
  const lesson = useMemo(() => {
    if (!currentCard) {
      return null;
    }

    return getLessonPrompt(currentCard, direction);
  }, [currentCard, direction]);

  if (cards.length === 0) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center py-24 text-center animate-in fade-in">
          <div className="bg-primary/10 text-primary w-24 h-24 rounded-full flex items-center justify-center mb-6 text-4xl font-serif">
            花
          </div>
          <h2 className="text-2xl font-serif font-semibold mb-2">You're all caught up!</h2>
          <p className="text-muted-foreground mb-8">No new lessons in your queue. Take a break or add more vocabulary.</p>
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

  const handleNext = (knew: boolean) => {
    const updated = processReview(currentCard, knew);
    updateCard(updated);

    if (currentIndex < cards.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setFlipped(false);
    } else {
      setCards([]);
    }
  };

  return (
    <Layout>
      <div className="max-w-2xl mx-auto animate-in fade-in duration-500">
        <div className="flex justify-between items-center mb-8 gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-serif font-bold">New Lessons</h1>
            <p className="text-muted-foreground mt-1">Study in both directions so the words stick faster.</p>
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
            {currentIndex + 1} / {cards.length}
          </span>
        </div>

        <Card className="min-h-[450px] flex flex-col justify-between border shadow-sm relative overflow-hidden transition-all duration-300 bg-card">
          <CardContent className="flex-1 flex flex-col items-center justify-center p-8 text-center h-full">
            <div className="flex-1 flex flex-col items-center justify-center">
              {lesson?.reading && direction === "jp-en" && flipped && (
                <div className="text-xl text-muted-foreground mb-4 font-serif">{lesson.reading}</div>
              )}
              <div className="text-6xl md:text-8xl font-serif mb-8 text-foreground">{lesson?.prompt}</div>

              {flipped && lesson && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 space-y-2">
                  <div className="text-3xl font-semibold text-primary">{lesson.answer}</div>
                  {direction === "en-jp" && lesson.reading && (
                    <div className="text-xl text-muted-foreground font-serif">{lesson.reading}</div>
                  )}
                  {currentCard.partOfSpeech && (
                    <div className="text-sm text-muted-foreground uppercase tracking-widest">{currentCard.partOfSpeech}</div>
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
