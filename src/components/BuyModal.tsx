import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Token } from "@/types/trading";

interface BuyModalProps {
  isOpen: boolean;
  onClose: () => void;
  token: Token | null;
  balance: number;
  onConfirm: (amount: number) => void;
}

const BuyModal = ({ isOpen, onClose, token, balance, onConfirm }: BuyModalProps) => {
  const [amount, setAmount] = useState("");

  const handleConfirm = () => {
    const numAmount = parseFloat(amount);
    if (numAmount > 0 && numAmount <= balance) {
      onConfirm(numAmount);
      setAmount("");
      onClose();
    }
  };

  if (!token) return null;

  const tokensReceived = amount ? parseFloat(amount) / token.price : 0;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="glass-card border-border">
        <DialogHeader>
          <DialogTitle className="font-orbitron text-2xl text-gradient-cyan">
            Buy {token.name}
          </DialogTitle>
          <DialogDescription className="font-inter text-muted-foreground">
            Enter the USD amount you want to spend
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="glass-card rounded-lg p-4">
            <div className="grid grid-cols-2 gap-4 text-sm font-inter">
              <div>
                <div className="text-muted-foreground">Current Price</div>
                <div className="text-primary font-semibold text-lg">
                  ${token.price.toFixed(6)}
                </div>
              </div>
              <div>
                <div className="text-muted-foreground">Available Balance</div>
                <div className="text-foreground font-semibold text-lg">
                  ${balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount" className="font-inter">
              Amount (USD)
            </Label>
            <Input
              id="amount"
              type="number"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="font-orbitron text-lg bg-input border-border"
            />
          </div>

          {amount && (
            <div className="glass-card rounded-lg p-4 bg-primary/10">
              <div className="text-sm text-muted-foreground font-inter mb-1">
                You will receive
              </div>
              <div className="text-2xl font-orbitron font-bold text-primary">
                {tokensReceived.toLocaleString()} {token.symbol}
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <Button
            onClick={onClose}
            variant="outline"
            className="flex-1 font-orbitron"
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!amount || parseFloat(amount) <= 0 || parseFloat(amount) > balance}
            className="flex-1 font-orbitron bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            Confirm Buy
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BuyModal;
