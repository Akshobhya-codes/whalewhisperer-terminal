import { useState, useRef, useEffect } from "react";
import { Mic, MicOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AudioRecorder, blobToBase64, base64ToAudioUrl } from "@/utils/audioRecorder";
import { supabase } from "@/integrations/supabase/client";
import { Token, Holding } from "@/types/trading";
import WaveformVisualizer from "./WaveformVisualizer";
import ConfirmationDialog from "./ConfirmationDialog";
import { Badge } from "@/components/ui/badge";
import { interpretCommand, generateConfirmationText, parseConfirmationResponse, InterpretedCommand } from "@/utils/intelligentCommandParser";
import { useToast } from "@/hooks/use-toast";

interface VoiceControlPanelProps {
  onCommand: (userText: string, aiResponse: string) => void;
  tokens: Token[];
  holdings: Holding[];
  balance: number;
  onExecuteCommand: (command: any) => void;
}

const VoiceControlPanel = ({ onCommand, tokens, holdings, balance, onExecuteCommand }: VoiceControlPanelProps) => {
  const { toast } = useToast();
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcribedText, setTranscribedText] = useState("");
  const [confirmationText, setConfirmationText] = useState("");
  const [showConfirmation, setShowConfirmation] = useState(false);
  const recorderRef = useRef<AudioRecorder | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  // Single source of truth for pending action
  const pendingActionRef = useRef<InterpretedCommand | null>(null);
  const confirmLoopActiveRef = useRef<boolean>(false);
  const confirmTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reminderTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reminderIssuedRef = useRef<boolean>(false);

  // Hotkey support (Space bar)
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !isProcessing && e.target === document.body) {
        if (!showConfirmation || confirmLoopActiveRef.current) {
          e.preventDefault();
          handleVoiceCommand();
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isListening, isProcessing, showConfirmation]);

  // Track audio playback
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handlePlay = () => setIsSpeaking(true);
    const handleEnded = () => setIsSpeaking(false);
    const handlePause = () => setIsSpeaking(false);

    audio.addEventListener('play', handlePlay);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('pause', handlePause);

    return () => {
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('pause', handlePause);
    };
  }, []);

  const playAudioResponse = async (text: string): Promise<void> => {
    try {
      const { data: ttsData, error: ttsError } = await supabase.functions.invoke('hathora-tts', {
        body: { text, voice: 'af_bella', speed: 1.1 }
      });

      if (ttsError || !ttsData?.audioContent) {
        console.error('TTS error:', ttsError);
        return;
      }

      const audioUrl = base64ToAudioUrl(ttsData.audioContent);
      if (!audioRef.current) {
        audioRef.current = new Audio();
      }
      audioRef.current.src = audioUrl;
      
      return new Promise((resolve) => {
        if (!audioRef.current) {
          resolve();
          return;
        }
        
        const handleEnded = () => {
          audioRef.current?.removeEventListener('ended', handleEnded);
          resolve();
        };
        
        audioRef.current.addEventListener('ended', handleEnded);
        audioRef.current.play().catch(error => {
          console.error('Audio playback failed:', error);
          audioRef.current?.removeEventListener('ended', handleEnded);
          resolve();
        });
      });
    } catch (error) {
      console.error('Error generating audio response:', error);
    }
  };

  // Stop the confirmation loop
  const stopConfirmationLoop = async () => {
    console.log('🛑 Stopping confirmation loop');
    confirmLoopActiveRef.current = false;
    
    if (confirmTimeoutRef.current) {
      clearTimeout(confirmTimeoutRef.current);
      confirmTimeoutRef.current = null;
    }
    if (reminderTimeoutRef.current) {
      clearTimeout(reminderTimeoutRef.current);
      reminderTimeoutRef.current = null;
    }
    reminderIssuedRef.current = false;
    
    if (recorderRef.current?.isRecording()) {
      try {
        await recorderRef.current.stop();
      } catch (e) {
        console.error("Error stopping recorder:", e);
      }
    }
    setIsListening(false);
  };

  // Execute the pending action
  const executePendingAction = async () => {
    const cmdToExecute = pendingActionRef.current;
    if (!cmdToExecute) {
      console.log('⚠️ No pending action to execute');
      return;
    }

    console.log('✅ Executing pending action:', cmdToExecute);
    console.log('🎯 Voice confirmation detected - calling onExecuteCommand');
    
    await stopConfirmationLoop();
    setShowConfirmation(false);
    setIsProcessing(true);

    try {
      let commandToExecute: any | undefined;

      if (cmdToExecute.intent === 'buy') {
        if (!cmdToExecute.amount || !cmdToExecute.tokenSymbol) {
          throw new Error('Missing amount or token for buy command');
        }
        commandToExecute = {
          action: 'buy',
          token: cmdToExecute.tokenSymbol,
          amount: cmdToExecute.amountType === 'dollars' ? cmdToExecute.amount : undefined,
          quantity: cmdToExecute.amountType === 'tokens' ? cmdToExecute.amount : undefined
        };
      } else if (cmdToExecute.intent === 'sell') {
        if (!cmdToExecute.tokenSymbol) {
          throw new Error('Missing token for sell command');
        }
        commandToExecute = {
          action: 'sell',
          token: cmdToExecute.tokenSymbol,
          quantity: cmdToExecute.quantity === 'all' ? -1 : (cmdToExecute.amount ?? 0)
        };
      } else if (cmdToExecute.intent === 'check') {
        commandToExecute = { action: 'check' };
      } else if (cmdToExecute.intent === 'reset') {
        commandToExecute = { action: 'reset' };
      }

      if (!commandToExecute) {
        throw new Error(`Unsupported command intent: ${cmdToExecute.intent}`);
      }

      console.log('Executing command:', commandToExecute);
      console.log('📞 Calling onExecuteCommand with:', commandToExecute);
      onExecuteCommand(commandToExecute);

      let toastTitle = "✅ Trade Executed";
      let toastDescription = "";
      if (cmdToExecute.intent === 'buy') {
        toastDescription = `Bought ${cmdToExecute.amountType === 'dollars' ? `$${cmdToExecute.amount}` : `${cmdToExecute.amount} tokens`} of ${cmdToExecute.tokenDisplayName || cmdToExecute.tokenSymbol}`;
      } else if (cmdToExecute.intent === 'sell') {
        toastDescription = `Sold ${cmdToExecute.quantity === 'all' ? 'all' : cmdToExecute.amount} ${cmdToExecute.tokenDisplayName || cmdToExecute.tokenSymbol}`;
      }

      toast({
        title: toastTitle,
        description: toastDescription,
        duration: 3000,
        className: "bg-success/10 border-success/50"
      });

      const successText = `Trade executed! ${confirmationText.replace('?', '.')}`;
      await playAudioResponse(successText);
      onCommand(cmdToExecute.rawText, successText);

    } catch (error) {
      console.error('❌ Command execution error:', error);
      const errorMsg = error instanceof Error ? error.message : 'Failed to execute command';
      toast({
        title: "❌ Error",
        description: errorMsg,
        duration: 3000,
        variant: "destructive"
      });
      await playAudioResponse(errorMsg);
    } finally {
      pendingActionRef.current = null;
      setConfirmationText("");
      setTranscribedText("");
      setIsProcessing(false);
    }
  };

  // Cancel the pending action
  const cancelPendingAction = async () => {
    console.log('❌ Canceling pending action');
    
    await stopConfirmationLoop();
    setShowConfirmation(false);
    
    const cancelMsg = "Command cancelled.";
    toast({
      title: "❌ Cancelled",
      description: cancelMsg,
      duration: 2000,
      className: "bg-destructive/10 border-destructive/50"
    });
    
    await playAudioResponse(cancelMsg);
    if (pendingActionRef.current) {
      onCommand(pendingActionRef.current.rawText, cancelMsg);
    }
    
    pendingActionRef.current = null;
    setConfirmationText("");
    setTranscribedText("");
  };

  // Start confirmation loop
  const startConfirmationLoop = async () => {
    console.log('🎯 Starting confirmation loop');
    confirmLoopActiveRef.current = true;
    reminderIssuedRef.current = false;

    confirmTimeoutRef.current = setTimeout(async () => {
      if (confirmLoopActiveRef.current) {
        console.log('⏱️ Confirmation timeout');
        await cancelPendingAction();
      }
    }, 15000);

    reminderTimeoutRef.current = setTimeout(async () => {
      if (confirmLoopActiveRef.current && !reminderIssuedRef.current) {
        console.log('⏰ Reminder');
        reminderIssuedRef.current = true;
        await playAudioResponse("Still waiting. Say yes to confirm, or no to cancel.");
      }
    }, 10000);

    await continuouslyListenForConfirmation();
  };

  // Continuously listen for yes/no
  const continuouslyListenForConfirmation = async () => {
    if (!confirmLoopActiveRef.current) return;

    try {
      console.log('🎤 New confirmation chunk');
      recorderRef.current = new AudioRecorder();
      await recorderRef.current.start();
      setIsListening(true);

      await new Promise(resolve => setTimeout(resolve, 3000));

      if (!recorderRef.current || !confirmLoopActiveRef.current) return;

      const audioBlob = await recorderRef.current.stop();
      setIsListening(false);
      const base64Audio = await blobToBase64(audioBlob);

      const { data: sttData, error: sttError } = await supabase.functions.invoke('hathora-stt', {
        body: { audioData: base64Audio }
      });

      if (sttError) {
        console.error('STT error:', sttError);
      }

      const transcript = (sttData?.text || '').toLowerCase();
      console.log("Confirmation chunk:", transcript);

      if (confirmLoopActiveRef.current && pendingActionRef.current) {
        const parsed = parseConfirmationResponse(transcript);

        if (parsed.action === 'confirm') {
          console.log("🎉 Heard 'yes'!");
          console.log("Confirmed by voice — executing trade now.");
          confirmLoopActiveRef.current = false;
          setShowConfirmation(false);

          if (recorderRef.current?.isRecording()) {
            try { await recorderRef.current.stop(); } catch {}
          }
          setIsListening(false);

          if (confirmTimeoutRef.current) {
            clearTimeout(confirmTimeoutRef.current);
            confirmTimeoutRef.current = null;
          }
          if (reminderTimeoutRef.current) {
            clearTimeout(reminderTimeoutRef.current);
            reminderTimeoutRef.current = null;
          }

          console.log("Using same confirm handler as button (executePendingAction)");
          await executePendingAction();
          return;
        } else if (parsed.action === 'cancel') {
          console.log("❌ Heard 'no'");
          await cancelPendingAction();
          return;
        }
      }

      if (pendingActionRef.current && confirmLoopActiveRef.current) {
        await continuouslyListenForConfirmation();
      }
    } catch (error) {
      console.error('Error in confirmation listening:', error);
      await stopConfirmationLoop();
      setShowConfirmation(false);
      setIsListening(false);
    }
  };

  const handleVoiceCommand = async () => {
    if (isListening || isProcessing || isSpeaking) {
      console.log('Already busy');
      return;
    }

    try {
      setIsListening(true);
      setIsProcessing(true);
      setTranscribedText("");

      recorderRef.current = new AudioRecorder();
      await recorderRef.current.start();
      await new Promise(resolve => setTimeout(resolve, 3000));

      const audioBlob = await recorderRef.current.stop();
      setIsListening(false);
      const base64Audio = await blobToBase64(audioBlob);

      const { data: sttData, error: sttError } = await supabase.functions.invoke('hathora-stt', {
        body: { audioData: base64Audio }
      });

      if (sttError) throw sttError;

      const transcribedCommand = sttData?.text || "";
      setTranscribedText(transcribedCommand);

      if (!transcribedCommand.trim()) {
        throw new Error("No speech detected. Please try again.");
      }

      console.log('Transcribed:', transcribedCommand);

      const interpreted = interpretCommand(transcribedCommand, tokens);
      console.log('Interpreted:', interpreted.intent, interpreted.tokenSymbol, interpreted.amount);

      if (interpreted.needsConfirmation) {
        if (pendingActionRef.current) {
          console.log("Canceling previous command");
          await stopConfirmationLoop();
        }

        const confirmText = generateConfirmationText(interpreted);
        setConfirmationText(confirmText);
        pendingActionRef.current = interpreted;
        setShowConfirmation(true);

        await playAudioResponse(confirmText + " Say yes to confirm, or no to cancel.");
        await startConfirmationLoop();

      } else {
        console.log('No confirmation needed');
        pendingActionRef.current = interpreted;
        await executePendingAction();
      }
    } catch (error: any) {
      console.error('Error handling voice command:', error);
      confirmLoopActiveRef.current = false;

      const aiResponse = error.message || "Sorry, I didn't understand that command.";
      onCommand(transcribedText, aiResponse);
      pendingActionRef.current = null;
      setShowConfirmation(false);
      await playAudioResponse(aiResponse);
    } finally {
      setIsProcessing(false);
      if (recorderRef.current?.isRecording()) {
        try {
          await recorderRef.current.stop();
        } catch (e) {
          console.error("Error stopping recorder:", e);
        }
      }
      setIsListening(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Voice Control</h2>
        <div className="flex gap-2 items-center">
          <Badge variant="outline" className="text-xs">
            {isListening ? "🎤 Listening..." : isSpeaking ? "🔊 Speaking..." : "💤 Idle"}
          </Badge>
          {confirmLoopActiveRef.current && pendingActionRef.current && (
            <Badge variant="secondary" className="text-xs animate-pulse">
              🎯 Listening for confirmation...
            </Badge>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <Button
          onClick={handleVoiceCommand}
          disabled={isListening || isProcessing || isSpeaking}
          size="lg"
          className="w-full"
        >
          {isListening ? (
            <>
              <MicOff className="mr-2 h-5 w-5" />
              Listening...
            </>
          ) : (
            <>
              <Mic className="mr-2 h-5 w-5" />
              {isSpeaking ? "Speaking..." : "Hold to Speak (Space)"}
            </>
          )}
        </Button>

        {isListening && <WaveformVisualizer isActive={isListening} isSpeaking={isSpeaking} />}

        {transcribedText && (
          <div className="p-4 bg-muted rounded-lg">
            <p className="text-sm font-medium">You said:</p>
            <p className="text-sm">{transcribedText}</p>
          </div>
        )}
      </div>

      {showConfirmation && pendingActionRef.current && (
        <ConfirmationDialog
          isOpen={showConfirmation}
          command={pendingActionRef.current}
          confirmationText={confirmationText}
          onConfirm={executePendingAction}
          onCancel={cancelPendingAction}
          timeout={15}
        />
      )}

      <audio ref={audioRef} className="hidden" />
    </div>
  );
};

export default VoiceControlPanel;
