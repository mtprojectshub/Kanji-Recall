import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useGetDashboard, useListSessions } from "@workspace/api-client-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { format, subDays, startOfDay } from "date-fns";

export default function Stats() {
  const { data: summary, isLoading: isSummaryLoading } = useGetDashboard();
  const { data: sessions = [], isLoading: isSessionsLoading } = useListSessions();

  if (isSummaryLoading || isSessionsLoading || !summary) {
    return (
      <Layout>
        <div className="flex justify-center items-center py-24">
          <div className="animate-spin w-12 h-12 border-4 border-primary border-t-transparent rounded-full"></div>
        </div>
      </Layout>
    );
  }

  const { totalCards, allTimeAccuracy, totalReviews, burnedCount } = summary;

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
  const pieData = summary.stageCounts.map(({ stage, count }) => {
    const name = stage.replace(/[0-9]/g, ''); // remove numbers from apprentice1 etc
    const capitalizedName = name.charAt(0).toUpperCase() + name.slice(1);
    
    return {
      name: capitalizedName,
      value: count,
      color: capitalizedName === 'Apprentice' ? 'hsl(var(--srs-apprentice))' :
             capitalizedName === 'Guru' ? 'hsl(var(--srs-guru))' :
             capitalizedName === 'Master' ? 'hsl(var(--srs-master))' :
             capitalizedName === 'Enlightened' ? 'hsl(var(--srs-enlightened))' :
             'hsl(var(--srs-burned))'
    };
  }).reduce((acc, curr) => {
    // combine apprentice1..4 into Apprentice
    const existing = acc.find((item: any) => item.name === curr.name);
    if (existing) {
      existing.value += curr.value;
    } else {
      acc.push(curr);
    }
    return acc;
  }, [] as any[]).filter((item: any) => item.value > 0);

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
              <div className="text-3xl font-bold font-serif">{totalCards}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="text-sm text-muted-foreground font-medium mb-1">All Time Accuracy</div>
              <div className="text-3xl font-bold font-serif">{allTimeAccuracy}%</div>
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
              <div className="text-3xl font-bold font-serif text-srs-burned">{burnedCount}</div>
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
                      {pieData.map((entry: any, index: number) => (
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
