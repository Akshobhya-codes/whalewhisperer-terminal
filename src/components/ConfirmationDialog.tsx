import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Check, X, Clock } from 'lucide-react';
import { InterpretedCommand } from '@/utils/intelligentCommandParser';

interface ConfirmationDialogProps {
  isOpen: boolean;
  command: InterpretedCommand | null;
  confirmationText: string;
  onConfirm: () => void;
  onCancel: () => void;
  timeout?: number; // seconds
}

const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({
  isOpen,
  command,
  confirmationText,
  onConfirm,
  onCancel,
  timeout = 5
}) => {
  const [timeLeft, setTimeLeft] = useState(timeout);

  useEffect(() => {
    if (!isOpen) {
      setTimeLeft(timeout);
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          onCancel(); // Auto-cancel on timeout
          return timeout;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, timeout, onCancel]);

  if (!command) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Clock className="h-6 w-6 text-primary animate-pulse" />
            🎤 Voice Confirmation
            <span className="ml-auto text-sm font-normal text-muted-foreground">
              {timeLeft}s remaining
            </span>
          </DialogTitle>
          <DialogDescription className="text-base">
            Speak "yes" or "no", or click the buttons below
          </DialogDescription>
        </DialogHeader>

        <div className="py-6">
          <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 mb-4 animate-fade-in">
            <p className="text-lg font-semibold text-center">
              {confirmationText}
            </p>
          </div>

          <div className="bg-accent/20 border border-accent/30 rounded-lg p-3 mb-4 animate-fade-in">
            <p className="text-sm text-center">
              🎙️ <strong>Speak or click to respond:</strong> Say "yes" or "no", or click the buttons below
            </p>
          </div>

          {command.confidence < 0.9 && (
            <div className="bg-warning/10 border border-warning/20 rounded-lg p-3 text-sm">
              <p className="text-muted-foreground">
                ⚠️ Confidence: {Math.round(command.confidence * 100)}% - Please verify this is correct
              </p>
            </div>
          )}

          <div className="mt-4 text-center">
            <p className="text-xs text-muted-foreground">
              You said: "{command.rawText}"
            </p>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-3 pt-2">
          <Button
            variant="outline"
            onClick={onCancel}
            size="lg"
            className="flex-1 border-2 border-destructive/50 text-destructive hover:bg-destructive/10 hover:text-destructive hover:border-destructive transition-all"
          >
            <X className="h-5 w-5 mr-2" />
            ❌ No, Cancel
          </Button>
          <Button
            onClick={onConfirm}
            size="lg"
            className="flex-1 bg-success hover:bg-success/90 text-success-foreground font-bold shadow-lg shadow-success/50 hover:shadow-success/70 transition-all animate-pulse border-2 border-success"
          >
            <Check className="h-5 w-5 mr-2" />
            ✅ Yes, Execute
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ConfirmationDialog;
