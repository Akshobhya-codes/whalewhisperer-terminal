import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Mic, User } from "lucide-react";
import { Button } from "./ui/button";

interface NavbarProps {
  balance?: number;
}

const Navbar = ({ balance }: NavbarProps) => {
  const [username, setUsername] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    fetchUser();
  }, []);

  const fetchUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase
        .from("profiles")
        .select("username")
        .eq("id", user.id)
        .single();
      
      setUsername(data?.username || null);
    }
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="glass-card border-b border-border/50 px-6 py-4">
      <div className="flex items-center justify-between max-w-[1800px] mx-auto">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate("/")}>
            <div className="text-4xl animate-pulse-slow">🐳</div>
            <h1 className="text-2xl font-orbitron font-bold text-gradient-cyan">
              WhaleWhisperer
            </h1>
          </div>

          {username && (
            <div className="hidden md:flex items-center gap-2">
              <Button
                variant={isActive("/") ? "default" : "ghost"}
                onClick={() => navigate("/")}
                size="sm"
              >
                Dashboard
              </Button>
              <Button
                variant={isActive("/leaderboard") ? "default" : "ghost"}
                onClick={() => navigate("/leaderboard")}
                size="sm"
              >
                🏆 Leaderboard
              </Button>
              <Button
                variant={isActive("/groups") ? "default" : "ghost"}
                onClick={() => navigate("/groups")}
                size="sm"
              >
                Groups
              </Button>
              <Button
                variant={isActive("/profile") ? "default" : "ghost"}
                onClick={() => navigate("/profile")}
                size="sm"
              >
                Profile
              </Button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-6">
          {balance !== undefined && (
            <div className="glass-card px-6 py-3 rounded-lg glow-cyan">
              <div className="text-xs text-muted-foreground font-inter">USD Balance</div>
              <div className="text-2xl font-orbitron font-bold text-primary">
                ${balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
          )}

          {username ? (
            <div
              className="glass-card px-4 py-2 rounded-lg flex items-center gap-2 cursor-pointer hover:glow-purple transition-all"
              onClick={() => navigate("/profile")}
            >
              <User className="w-5 h-5 text-primary" />
              <span className="font-orbitron">{username}</span>
            </div>
          ) : (
            <Button onClick={() => navigate("/auth")} variant="outline">
              Sign In
            </Button>
          )}

          {location.pathname === "/" && (
            <button className="glass-card p-3 rounded-full hover:glow-purple transition-all duration-300 opacity-50 cursor-not-allowed">
              <Mic className="w-5 h-5 text-muted-foreground" />
            </button>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
