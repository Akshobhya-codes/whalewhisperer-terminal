import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trophy, TrendingUp, TrendingDown, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import Navbar from "@/components/Navbar";

type LeaderboardEntry = {
  id: string;
  username: string;
  avatar_url: string | null;
  portfolio_value: number;
  total_pl: number;
  pl_percentage: number;
  last_trade_time: string | null;
};

type FilterPeriod = "global" | "week" | "friends";

export default function Leaderboard() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [filter, setFilter] = useState<FilterPeriod>("global");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setCurrentUserId(user?.id || null);
    });
  }, []);

  useEffect(() => {
    fetchLeaderboard();
    const interval = setInterval(fetchLeaderboard, 30000);
    return () => clearInterval(interval);
  }, [filter]);

  const fetchLeaderboard = async () => {
    try {
      const { data, error } = await supabase.rpc("get_leaderboard");
      
      if (error) throw error;
      setLeaderboard(data || []);
    } catch (error) {
      console.error("Error fetching leaderboard:", error);
    } finally {
      setLoading(false);
    }
  };

  const getRankIcon = (index: number) => {
    if (index === 0) return "🥇";
    if (index === 1) return "🥈";
    if (index === 2) return "🥉";
    return `#${index + 1}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8">
        <Card className="border-primary/20 shadow-[0_0_30px_rgba(var(--primary),0.15)]">
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <Trophy className="w-8 h-8 text-primary" />
                <CardTitle className="text-3xl">🏆 Leaderboard</CardTitle>
              </div>
              
              <div className="flex gap-2">
                <Button
                  variant={filter === "global" ? "default" : "outline"}
                  onClick={() => setFilter("global")}
                  size="sm"
                >
                  Global
                </Button>
                <Button
                  variant={filter === "week" ? "default" : "outline"}
                  onClick={() => setFilter("week")}
                  size="sm"
                >
                  This Week
                </Button>
                <Button
                  variant={filter === "friends" ? "default" : "outline"}
                  onClick={() => setFilter("friends")}
                  size="sm"
                >
                  Friends Only
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">
                Loading leaderboard...
              </div>
            ) : leaderboard.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No traders yet. Be the first!
              </div>
            ) : (
              <div className="space-y-2">
                {leaderboard.slice(0, 20).map((entry, index) => (
                  <div
                    key={entry.id}
                    className={`flex items-center gap-4 p-4 rounded-lg border transition-all ${
                      entry.id === currentUserId
                        ? "bg-primary/10 border-primary animate-pulse"
                        : "bg-card/50 border-border/50 hover:border-primary/30"
                    }`}
                  >
                    <div className="text-2xl font-bold w-12 text-center">
                      {getRankIcon(index)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="font-semibold truncate">
                        {entry.username}
                        {entry.id === currentUserId && (
                          <span className="ml-2 text-xs text-primary">(You)</span>
                        )}
                      </div>
                      {entry.last_trade_time && (
                        <div className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDistanceToNow(new Date(entry.last_trade_time), {
                            addSuffix: true,
                          })}
                        </div>
                      )}
                    </div>

                    <div className="text-right">
                      <div className="font-semibold">
                        ${entry.portfolio_value.toFixed(2)}
                      </div>
                      <div
                        className={`text-sm flex items-center gap-1 justify-end ${
                          entry.pl_percentage >= 0
                            ? "text-green-500"
                            : "text-red-500"
                        }`}
                      >
                        {entry.pl_percentage >= 0 ? (
                          <TrendingUp className="w-3 h-3" />
                        ) : (
                          <TrendingDown className="w-3 h-3" />
                        )}
                        {entry.pl_percentage >= 0 ? "+" : ""}
                        {entry.pl_percentage.toFixed(2)}%
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
