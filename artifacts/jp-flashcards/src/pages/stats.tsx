import { useState, useEffect } from "react";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { getCards, getSessions } from "@/lib/storage";
import { Flashcard, ReviewSession, getStageName, getStageColor } from "@/lib/srs";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { format, subDays, startOfDay } from "date-fns";

export default function Stats() {
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [sessions, setSessions] = useState<ReviewSession[]>([]);

  useEffect(() => {
    setCards(getCards());
    setSessions(getSessions());
  }, []);

  const totalReviews = cards.reduce((acc, c) => acc + c.totalReviews, 0);
  const correctReviews = cards.reduce((acc, c) => acc + c.correctReviews, 0);
  const accuracy = totalReviews > 0 ? Math.round((correctReviews / totalReviews) * 100) : 0;
  const burned = cards.filter(c => c.srsStage === 'burned').length;

  // Chart Data: Last 7 Days accuracy/reviews
  const last7Days = Array.from({ length: 7 }).map((_, i) => {
    const d = startOfDay(subDays(new Date(), 6 - i));
    const dayStr = format(d, 'MMM dd');
    return { name: dayStr, correct: 0, incorrect: 0, total: 0, date: d.getTime() };
  });

  sessions.forEach(session => {
    const sDate = startOfDay(new Date(session.date)).getTime();
    const dayData = last7Days.find(d => d.date === sDate);
    if (dayData) {
      dayData.correct += session.correct;
      dayData.incorrect += session.incorrect;
      dayData.total += session.cardsReviewed;
    }
  });

  // Pie Chart Data
  const stageCounts = cards.reduce((acc, card) => {
    const key = getStageName(card.srsStage);
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const pieData = Object.entries(stageCounts).map(([name, value]) => ({
    name,
    value,
    color: name === 'Apprentice' ? 'hsl(var(--srs-apprentice))' :
           name === 'Guru' ? 'hsl(var(--srs-guru))' :
           name === 'Master' ? 'hsl(var(--srs-master))' :
           name === 'Enlightened' ? 'hsl(var(--srs-enlightened))' :
           'hsl(var(--srs-burned))'
  }));

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-popover text-popover-foreground border border-border p-3 shadow-md rounded-md">
          <p className="font-medium mb-1">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }} className="text-sm">
              {entry.name}: {entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <Layout>
      <div className="space-y-8 animate-in fade-in">
        <header>
          <h1 className="text-3xl font-serif font-bold">Statistics</h1>
          <p className="text-muted-foreground mt-2">Track your learning journey over time.</p>
        </header>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="text-sm text-muted-foreground font-medium mb-1">Total Cards</div>
              <div className="text-3xl font-bold font-serif">{cards.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="text-sm text-muted-foreground font-medium mb-1">All Time Accuracy</div>
              <div className="text-3xl font-bold font-serif">{accuracy}%</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="text-sm text-muted-foreground font-medium mb-1">Total Reviews</div>
              <div className="text-3xl font-bold font-serif">{totalReviews}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="text-sm text-muted-foreground font-medium mb-1">Words Burned</div>
              <div className="text-3xl font-bold font-serif text-srs-burned">{burned}</div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <Card>
            <CardHeader>
              <CardTitle className="font-serif">Last 7 Days</CardTitle>
              <CardDescription>Reviews broken down by correctness</CardDescription>
            </CardHeader>
            <CardContent className="h-80 w-full pb-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={last7Days} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                  <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="correct" name="Correct" stackId="a" fill="hsl(var(--primary))" radius={[0, 0, 4, 4]} />
                  <Bar dataKey="incorrect" name="Incorrect" stackId="a" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="font-serif">Stage Distribution</CardTitle>
              <CardDescription>How well you know your vocabulary</CardDescription>
            </CardHeader>
            <CardContent className="h-80 w-full flex items-center justify-center">
              {pieData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={2}
                      dataKey="value"
                      stroke="none"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-muted-foreground">No data available yet.</div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}