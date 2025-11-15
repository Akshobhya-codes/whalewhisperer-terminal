import { Mic } from "lucide-react";

interface NavbarProps {
  balance: number;
}

const Navbar = ({ balance }: NavbarProps) => {
  return (
    <nav className="glass-card border-b border-border/50 px-6 py-4">
      <div className="flex items-center justify-between max-w-[1800px] mx-auto">
        <div className="flex items-center gap-3">
          <div className="text-4xl animate-pulse-slow">🐳</div>
          <h1 className="text-2xl font-orbitron font-bold text-gradient-cyan">
            WhaleWhisperer
          </h1>
        </div>

        <div className="flex items-center gap-6">
          <div className="glass-card px-6 py-3 rounded-lg glow-cyan">
            <div className="text-xs text-muted-foreground font-inter">USD Balance</div>
            <div className="text-2xl font-orbitron font-bold text-primary">
              ${balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>

          <button className="glass-card p-3 rounded-full hover:glow-purple transition-all duration-300 opacity-50 cursor-not-allowed">
            <Mic className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
