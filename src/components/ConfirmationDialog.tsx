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
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary animate-pulse" />
            Confirm Voice Command
          </DialogTitle>
          <DialogDescription>
            Please confirm the following action:
          </DialogDescription>
        </DialogHeader>

        <div className="py-6">
          <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 mb-4">
            <p className="text-lg font-semibold text-center">
              {confirmationText}
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

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={onCancel}
            className="flex-1"
          >
            <X className="h-4 w-4 mr-2" />
            No, Cancel
          </Button>
          <Button
            onClick={onConfirm}
            className="flex-1 bg-primary hover:bg-primary/90"
          >
            <Check className="h-4 w-4 mr-2" />
            Yes, Execute ({timeLeft}s)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ConfirmationDialog;
