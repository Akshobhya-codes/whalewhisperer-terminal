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
import { Holding } from "@/types/trading";

interface SellModalProps {
  isOpen: boolean;
  onClose: () => void;
  holding: Holding | null;
  onConfirm: (quantity: number) => void;
}

const SellModal = ({ isOpen, onClose, holding, onConfirm }: SellModalProps) => {
  const [quantity, setQuantity] = useState("");

  const handleConfirm = () => {
    const numQuantity = parseFloat(quantity);
    if (holding && numQuantity > 0 && numQuantity <= holding.quantity) {
      onConfirm(numQuantity);
      setQuantity("");
      onClose();
    }
  };

  if (!holding) return null;

  const usdReceived = quantity ? parseFloat(quantity) * holding.currentPrice : 0;
  const pl = quantity ? (holding.currentPrice - holding.buyPrice) * parseFloat(quantity) : 0;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="glass-card border-border">
        <DialogHeader>
          <DialogTitle className="font-orbitron text-2xl text-gradient-cyan">
            Sell {holding.tokenName}
          </DialogTitle>
          <DialogDescription className="font-inter text-muted-foreground">
            Enter the quantity you want to sell
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="glass-card rounded-lg p-4">
            <div className="grid grid-cols-2 gap-4 text-sm font-inter">
              <div>
                <div className="text-muted-foreground">Current Price</div>
                <div className="text-primary font-semibold text-lg">
                  ${holding.currentPrice.toFixed(6)}
                </div>
              </div>
              <div>
                <div className="text-muted-foreground">Available Quantity</div>
                <div className="text-foreground font-semibold text-lg">
                  {holding.quantity.toLocaleString()} {holding.symbol}
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="quantity" className="font-inter">
              Quantity
            </Label>
            <Input
              id="quantity"
              type="number"
              placeholder="0"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="font-orbitron text-lg bg-input border-border"
            />
          </div>

          {quantity && (
            <div className="space-y-3">
              <div className="glass-card rounded-lg p-4 bg-primary/10">
                <div className="text-sm text-muted-foreground font-inter mb-1">
                  You will receive
                </div>
                <div className="text-2xl font-orbitron font-bold text-primary">
                  ${usdReceived.toFixed(2)}
                </div>
              </div>

              <div className={`glass-card rounded-lg p-4 ${pl >= 0 ? 'bg-success/10' : 'bg-destructive/10'}`}>
                <div className="text-sm text-muted-foreground font-inter mb-1">
                  P/L on this sale
                </div>
                <div className={`text-2xl font-orbitron font-bold ${pl >= 0 ? 'text-success' : 'text-destructive'}`}>
                  {pl >= 0 ? '+' : ''}${pl.toFixed(2)}
                </div>
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
            disabled={!quantity || parseFloat(quantity) <= 0 || parseFloat(quantity) > holding.quantity}
            className="flex-1 font-orbitron bg-destructive hover:bg-destructive/90 text-destructive-foreground"
          >
            Confirm Sell
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SellModal;
