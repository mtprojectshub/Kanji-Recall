import { useEffect, useState } from "react";
import { Link } from "wouter";
import { getDueCards, getLessonCards, getCards } from "@/lib/storage";
import { Flashcard } from "@/lib/srs";
import { Layout } from "@/components/layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function Home() {
  const [dueCards, setDueCards] = useState<Flashcard[]>([]);
  const [lessonCards, setLessonCards] = useState<Flashcard[]>([]);
  const [allCards, setAllCards] = useState<Flashcard[]>([]);

  useEffect(() => {
    setDueCards(getDueCards());
    setLessonCards(getLessonCards());
    setAllCards(getCards());
  }, []);

  const totalReviews = allCards.reduce((acc, c) => acc + c.totalReviews, 0);
  const correctReviews = allCards.reduce((acc, c) => acc + c.correctReviews, 0);
  const accuracy = totalReviews > 0 ? Math.round((correctReviews / totalReviews) * 100) : 0;

  const getCountByStage = (stagePrefix: string) => {
    return allCards.filter(c => c.srsStage.startsWith(stagePrefix)).length;
  };

  const getBurnedCount = () => {
    return allCards.filter(c => c.srsStage === 'burned').length;
  };

  return (
    <Layout>
      <div className="space-y-8 animate-in fade-in duration-500">
        <header>
          <h1 className="text-3xl font-serif font-bold text-foreground">Welcome back</h1>
          <p className="text-muted-foreground mt-2">Take a moment to center yourself and begin your studies.</p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="bg-primary text-primary-foreground border-none shadow-md relative overflow-hidden">
            <div className="absolute top-0 right-0 -mr-8 -mt-8 opacity-10">
              <span className="text-9xl font-serif">学</span>
            </div>
            <CardContent className="p-6 relative z-10 flex flex-col items-center justify-center text-center space-y-4">
              <div className="text-5xl font-serif font-bold">{dueCards.length}</div>
              <div className="text-primary-foreground/80 font-medium tracking-wider uppercase text-sm">REVIEWS DUE</div>
              <Link href="/review" className="w-full">
                <Button 
                  className="w-full bg-white text-primary hover:bg-white/90 hover-elevate transition-all" 
                  disabled={dueCards.length === 0}
                  size="lg"
                >
                  Start Reviews
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="bg-secondary/10 border-none shadow-sm relative overflow-hidden">
            <CardContent className="p-6 relative z-10 flex flex-col items-center justify-center text-center space-y-4 h-full">
              <div className="text-5xl font-serif font-bold text-secondary">{lessonCards.length}</div>
              <div className="text-muted-foreground font-medium tracking-wider uppercase text-sm">NEW LESSONS</div>
              <Link href="/lessons" className="w-full">
                <Button 
                  className="w-full bg-secondary text-secondary-foreground hover:bg-secondary/90 hover-elevate transition-all" 
                  disabled={lessonCards.length === 0}
                  size="lg"
                >
                  Start Lessons
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        <div>
          <h2 className="text-xl font-serif font-semibold mb-4">Your Progress</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div className="flex flex-col items-center p-4 bg-card rounded-lg border shadow-sm">
              <Badge className="bg-srs-apprentice mb-2 hover:bg-srs-apprentice">Apprentice</Badge>
              <span className="text-2xl font-bold">{getCountByStage('apprentice')}</span>
            </div>
            <div className="flex flex-col items-center p-4 bg-card rounded-lg border shadow-sm">
              <Badge className="bg-srs-guru mb-2 hover:bg-srs-guru">Guru</Badge>
              <span className="text-2xl font-bold">{getCountByStage('guru')}</span>
            </div>
            <div className="flex flex-col items-center p-4 bg-card rounded-lg border shadow-sm">
              <Badge className="bg-srs-master mb-2 hover:bg-srs-master">Master</Badge>
              <span className="text-2xl font-bold">{getCountByStage('master')}</span>
            </div>
            <div className="flex flex-col items-center p-4 bg-card rounded-lg border shadow-sm">
              <Badge className="bg-srs-enlightened mb-2 hover:bg-srs-enlightened">Enlightened</Badge>
              <span className="text-2xl font-bold">{getCountByStage('enlightened')}</span>
            </div>
            <div className="flex flex-col items-center p-4 bg-card rounded-lg border shadow-sm">
              <Badge className="bg-srs-burned mb-2 hover:bg-srs-burned">Burned</Badge>
              <span className="text-2xl font-bold">{getBurnedCount()}</span>
            </div>
          </div>
        </div>

        <Card className="border shadow-sm">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <div className="text-sm text-muted-foreground uppercase tracking-wider font-medium">All Time Accuracy</div>
              <div className="text-3xl font-serif font-bold mt-1">{accuracy}%</div>
            </div>
            <div className="text-right">
              <div className="text-sm text-muted-foreground uppercase tracking-wider font-medium">Total Reviews</div>
              <div className="text-3xl font-serif font-bold mt-1">{totalReviews}</div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
