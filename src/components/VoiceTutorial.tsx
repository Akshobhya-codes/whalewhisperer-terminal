import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { HelpCircle, Mic, DollarSign, TrendingUp, Wallet, RotateCcw } from 'lucide-react';

const VoiceTutorial: React.FC = () => {
  const commands = [
    {
      category: "Trading",
      icon: DollarSign,
      examples: [
        { command: "Buy 100 BONK", description: "Purchase 100 tokens of BONK" },
        { command: "Buy $500 worth of PEPE", description: "Spend $500 to buy PEPE tokens" },
        { command: "Sell 50 WIF", description: "Sell 50 tokens of WIF" },
        { command: "Sell all BONK", description: "Sell your entire BONK holdings" },
      ]
    },
    {
      category: "Portfolio",
      icon: TrendingUp,
      examples: [
        { command: "Check my portfolio", description: "View your current holdings and balance" },
        { command: "What's my balance", description: "See your available cash balance" },
        { command: "Show my holdings", description: "Display all your token positions" },
      ]
    },
    {
      category: "Account",
      icon: Wallet,
      examples: [
        { command: "Reset my portfolio", description: "Reset to starting balance of $10,000" },
      ]
    }
  ];

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon" className="fixed top-4 right-20 z-50">
          <HelpCircle className="h-5 w-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mic className="h-6 w-6 text-primary" />
            Voice Trading Tutorial
          </DialogTitle>
          <DialogDescription>
            Learn how to use voice commands to trade cryptocurrencies hands-free
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Quick Start */}
          <Card className="p-4 bg-primary/5 border-primary/20">
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              <RotateCcw className="h-4 w-4" />
              Quick Start
            </h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>• Press <Badge variant="secondary">Space</Badge> or click the mic button to start listening</li>
              <li>• Speak your command clearly</li>
              <li>• The AI will confirm and execute your request</li>
              <li>• Press <Badge variant="secondary">Space</Badge> again to stop early</li>
            </ul>
          </Card>

          {/* Command Categories */}
          {commands.map((category) => {
            const Icon = category.icon;
            return (
              <div key={category.category} className="space-y-3">
                <h3 className="font-semibold flex items-center gap-2">
                  <Icon className="h-5 w-5 text-primary" />
                  {category.category}
                </h3>
                <div className="space-y-2">
                  {category.examples.map((example, idx) => (
                    <Card key={idx} className="p-3 hover:bg-accent/50 transition-colors">
                      <div className="flex flex-col gap-1">
                        <code className="text-sm font-mono text-primary">
                          "{example.command}"
                        </code>
                        <p className="text-xs text-muted-foreground">
                          {example.description}
                        </p>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            );
          })}

          {/* Tips */}
          <Card className="p-4 bg-muted/50">
            <h3 className="font-semibold mb-2">💡 Tips</h3>
            <ul className="space-y-1 text-sm text-muted-foreground">
              <li>• Speak naturally - the AI understands conversational language</li>
              <li>• You can specify amounts in tokens or dollars</li>
              <li>• Token symbols are case-insensitive (BONK = bonk = Bonk)</li>
              <li>• Check the voice console for command history</li>
            </ul>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default VoiceTutorial;
