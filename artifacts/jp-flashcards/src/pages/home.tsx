import { Link } from "wouter";
import { Layout } from "@/components/layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useGetDashboard } from "@workspace/api-client-react";

const STAGE_GROUPS = [
  { label: "Apprentice", prefix: "apprentice", param: "apprentice", color: "bg-srs-apprentice" },
  { label: "Guru",       prefix: "guru",        param: "guru",        color: "bg-srs-guru"        },
  { label: "Master",     prefix: "master",      param: "master",      color: "bg-srs-master"      },
  { label: "Enlightened",prefix: "enlightened", param: "enlightened", color: "bg-srs-enlightened" },
  { label: "Burned",     prefix: "burned",      param: "burned",      color: "bg-srs-burned"      },
] as const;

export default function Home() {
  const { data: summary, isLoading } = useGetDashboard();

  if (isLoading || !summary) {
    return (
      <Layout>
        <div className="space-y-8 animate-pulse">
          <div className="h-20 bg-muted rounded-md w-full max-w-md" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="h-48 bg-muted rounded-xl" />
            <div className="h-48 bg-muted rounded-xl" />
          </div>
          <div className="h-32 bg-muted rounded-xl" />
          <div className="h-24 bg-muted rounded-xl" />
        </div>
      </Layout>
    );
  }

  const getCountByStage = (prefix: string) =>
    summary.stageCounts
      .filter((s) => s.stage.startsWith(prefix))
      .reduce((acc, curr) => acc + curr.count, 0);

  return (
    <Layout>
      <div className="space-y-8 animate-in fade-in duration-500">
        <header>
          <h1 className="text-3xl font-serif font-bold text-foreground">Welcome back</h1>
          <p className="text-muted-foreground mt-2">
            Take a moment to center yourself and begin your studies.
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="bg-primary text-primary-foreground border-none shadow-md relative overflow-hidden">
            <div className="absolute top-0 right-0 -mr-8 -mt-8 opacity-10">
              <span className="text-9xl font-serif">学</span>
            </div>
            <CardContent className="p-6 relative z-10 flex flex-col items-center justify-center text-center space-y-4">
              <div className="text-5xl font-serif font-bold">{summary.reviewsDueCount}</div>
              <div className="text-primary-foreground/80 font-medium tracking-wider uppercase text-sm">
                REVIEWS DUE
              </div>
              <Link href="/review" className="w-full">
                <Button
                  className="w-full bg-white text-primary hover:bg-white/90 hover-elevate transition-all"
                  disabled={summary.reviewsDueCount === 0}
                  size="lg"
                >
                  Start Reviews
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="bg-secondary/10 border-none shadow-sm relative overflow-hidden">
            <CardContent className="p-6 relative z-10 flex flex-col items-center justify-center text-center space-y-4 h-full">
              <div className="text-5xl font-serif font-bold text-secondary">
                {summary.lessonsCount}
              </div>
              <div className="text-muted-foreground font-medium tracking-wider uppercase text-sm">
                NEW LESSONS
              </div>
              <Link href="/lessons" className="w-full">
                <Button
                  className="w-full bg-secondary text-secondary-foreground hover:bg-secondary/90 hover-elevate transition-all"
                  disabled={summary.lessonsCount === 0}
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
            {STAGE_GROUPS.map(({ label, prefix, param, color }) => (
              <Link key={param} href={`/cards?stage=${param}`}>
                <div className="flex flex-col items-center p-4 bg-card rounded-lg border shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer group">
                  <Badge className={`${color} mb-2 hover:${color} group-hover:opacity-90`}>
                    {label}
                  </Badge>
                  <span className="text-2xl font-bold">
                    {getCountByStage(prefix)}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>

        <Card className="border shadow-sm">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <div className="text-sm text-muted-foreground uppercase tracking-wider font-medium">
                All Time Accuracy
              </div>
              <div className="text-3xl font-serif font-bold mt-1">
                {Math.round(summary.allTimeAccuracy * 100)}%
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-muted-foreground uppercase tracking-wider font-medium">
                Total Reviews
              </div>
              <div className="text-3xl font-serif font-bold mt-1">{summary.totalReviews}</div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
