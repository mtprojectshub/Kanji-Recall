import { useState, useEffect, useRef } from "react";
import { Link } from "wouter";
import { Layout } from "@/components/layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Flashcard, processReview, getNextStage, getStageName } from "@/lib/srs";
import { getDueCards, updateCard, addSession } from "@/lib/storage";
import { Check, X, ArrowRight } from "lucide-react";
import { Progress } from "@/components/ui/progress";

export default function Review() {
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState<'correct' | 'incorrect' | null>(null);
  const [sessionCorrect, setSessionCorrect] = useState(0);
  const [sessionIncorrect, setSessionIncorrect] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setCards(getDueCards());
  }, []);

  // Finish session
  useEffect(() => {
    if (cards.length > 0 && currentIndex >= cards.length) {
      addSession({
        date: Date.now(),
        cardsReviewed: cards.length,
        correct: sessionCorrect,
        incorrect: sessionIncorrect
      });
    }
  }, [currentIndex, cards.length, sessionCorrect, sessionIncorrect]);

  if (cards.length === 0) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center py-24 text-center animate-in fade-in">
          <div className="bg-primary/10 text-primary w-24 h-24 rounded-full flex items-center justify-center mb-6 text-4xl font-serif">
            花
          </div>
          <h2 className="text-2xl font-serif font-semibold mb-2">No reviews due right now</h2>
          <p className="text-muted-foreground mb-8">You're doing great! Check back later or learn some new words.</p>
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

  if (currentIndex >= cards.length) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center py-24 text-center animate-in fade-in slide-in-from-bottom-8 duration-500">
          <div className="text-primary w-24 h-24 rounded-full flex items-center justify-center mb-6 bg-primary/10">
            <Check className="w-12 h-12" />
          </div>
          <h2 className="text-3xl font-serif font-bold mb-2">Review Session Complete</h2>
          <p className="text-muted-foreground mb-8">You reviewed {cards.length} cards with {Math.round((sessionCorrect / cards.length) * 100)}% accuracy.</p>
          <div className="flex gap-4">
            <Button asChild size="lg">
              <Link href="/">Return Home</Link>
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

  const card = cards[currentIndex];
  const progress = (currentIndex / cards.length) * 100;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (feedback !== null) return;
    
    if (!answer.trim()) return;

    const isCorrect = answer.trim().toLowerCase() === card.english.toLowerCase();
    setFeedback(isCorrect ? 'correct' : 'incorrect');

    if (isCorrect) setSessionCorrect(prev => prev + 1);
    else setSessionIncorrect(prev => prev + 1);

    const updated = processReview(card, isCorrect);
    updateCard(updated);
  };

  const handleNext = () => {
    setFeedback(null);
    setAnswer("");
    setCurrentIndex(prev => prev + 1);
    setTimeout(() => {
      inputRef.current?.focus();
    }, 10);
  };

  const currentStageName = getStageName(card.srsStage);
  const nextStageName = getStageName(getNextStage(card.srsStage, feedback === 'correct'));

  return (
    <Layout>
      <div className="max-w-2xl mx-auto">
        <div className="mb-6 flex items-center gap-4">
          <div className="flex-1">
            <Progress value={progress} className="h-2" />
          </div>
          <div className="text-sm font-medium text-muted-foreground">
            {currentIndex} / {cards.length}
          </div>
        </div>

        <Card className={`min-h-[450px] flex flex-col justify-between border shadow-sm relative overflow-hidden transition-colors duration-300 ${
          feedback === 'correct' ? 'bg-srs-master/10 border-srs-master' : 
          feedback === 'incorrect' ? 'bg-destructive/10 border-destructive' : 
          'bg-card'
        }`}>
          <CardContent className="flex-1 flex flex-col items-center justify-center p-8 text-center h-full relative">
            
            {feedback !== null && (
              <div className="absolute top-6 left-0 right-0 flex justify-center animate-in fade-in slide-in-from-top-4">
                <div className="bg-background/80 backdrop-blur-sm px-4 py-2 rounded-full text-sm font-medium shadow-sm flex items-center gap-2">
                  <span className="text-muted-foreground">{currentStageName}</span>
                  <ArrowRight className="w-4 h-4" />
                  <span className={feedback === 'correct' ? 'text-primary' : 'text-destructive'}>
                    {nextStageName}
                  </span>
                </div>
              </div>
            )}

            <div className="flex-1 flex flex-col items-center justify-center w-full">
              {feedback !== null && card.reading && (
                <div className="text-xl text-muted-foreground mb-4 font-serif animate-in fade-in">{card.reading}</div>
              )}
              
              <div className="text-6xl md:text-8xl font-serif mb-8 text-foreground transition-transform duration-300" style={{ transform: feedback !== null ? 'translateY(-10px)' : 'none' }}>
                {card.japanese}
              </div>

              {feedback !== null && (
                <div className={`text-2xl font-semibold mb-8 animate-in fade-in slide-in-from-bottom-2 ${feedback === 'correct' ? 'text-primary' : 'text-destructive'}`}>
                  {card.english}
                </div>
              )}
            </div>

            <div className="w-full max-w-sm mt-auto">
              <form onSubmit={handleSubmit} className="flex gap-2">
                <Input 
                  ref={inputRef}
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  placeholder="Meaning in English..."
                  className={`h-14 text-lg text-center font-medium ${feedback !== null ? 'opacity-50 pointer-events-none' : ''}`}
                  disabled={feedback !== null}
                  autoFocus
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck="false"
                />
                {!feedback && (
                  <Button type="submit" size="icon" className="h-14 w-14 bg-primary hover:bg-primary/90 flex-shrink-0" disabled={!answer.trim()}>
                    <ArrowRight className="w-6 h-6" />
                  </Button>
                )}
              </form>

              {feedback !== null && (
                <Button 
                  onClick={handleNext} 
                  className={`w-full h-14 mt-4 text-lg animate-in fade-in slide-in-from-bottom-2 ${feedback === 'correct' ? 'bg-primary text-primary-foreground hover:bg-primary/90' : 'bg-destructive text-destructive-foreground hover:bg-destructive/90'}`}
                  autoFocus
                >
                  {feedback === 'correct' ? 'Next' : 'Continue'}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}