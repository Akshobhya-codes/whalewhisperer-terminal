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

  // Hotkey support (Space bar)
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Only activate on Space if not typing in an input and no modal open (unless awaiting voice confirmation)
      if (e.code === 'Space' && !isProcessing && e.target === document.body) {
        if (!showConfirmation || isAwaitingConfirmation) {
          e.preventDefault();
          handleVoiceCommand();
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isListening, isProcessing, showConfirmation, isAwaitingConfirmation]);

  // Track audio playback for speaking state
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
        audioRef.current.play().catch((error) => {
          console.error('Failed to play audio:', error);
          resolve();
        });
      });
    } catch (error) {
      console.error('Audio playback error:', error);
    }
  };

  // Stop all confirmation activity
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
    
    if (recorderRef.current?.isRecording()) {
      try {
        await recorderRef.current.stop();
      } catch (e) {
        console.error('Error stopping recorder:', e);
      }
    }
    setIsListening(false);
  };

  // Execute the pending action
  const executePendingAction = async () => {
    const action = pendingActionRef.current;
    if (!action) {
      console.error('❌ No pending action to execute');
      return;
    }

    console.log('✅ Executing pending action:', action);
    
    await stopConfirmationLoop();
    setShowConfirmation(false);
    setIsProcessing(true);

    try {
      // Map to command format expected by onExecuteCommand
      let commandToExecute: any;
      
      if (action.intent === 'buy') {
        commandToExecute = {
          action: 'buy',
          token: action.tokenSymbol,
          amount: action.amountType === 'dollars' ? action.amount : undefined,
          quantity: action.amountType === 'tokens' ? action.amount : undefined
        };
      } else if (action.intent === 'sell') {
        commandToExecute = {
          action: 'sell',
          token: action.tokenSymbol,
          quantity: action.quantity === 'all' ? -1 : (action.amount ?? 0)
        };
      }

      if (!commandToExecute) {
        throw new Error(`Cannot execute ${action.intent}`);
      }

      console.log('📤 Sending command:', commandToExecute);
      onExecuteCommand(commandToExecute);

      // Success feedback
      const successMsg = action.intent === 'buy' 
        ? `Bought ${action.amountType === 'dollars' ? `$${action.amount}` : `${action.amount} tokens`} of ${action.tokenDisplayName}`
        : `Sold ${action.quantity === 'all' ? 'all' : action.amount} ${action.tokenDisplayName}`;
      
      toast({
        title: "✅ Trade Executed",
        description: successMsg,
        duration: 3000,
        className: "bg-success/10 border-success/50"
      });

      await playAudioResponse(`Done! ${successMsg}`);
      onCommand(action.rawText, `Trade executed: ${successMsg}`);

    } catch (error: any) {
      console.error('❌ Execution error:', error);
      const errorMsg = error.message || 'Failed to execute';
      toast({
        title: "Error",
        description: errorMsg,
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

  const handleCommandConfirm = async (modifiedCommand?: InterpretedCommand) => {
    const cmdToExecute = modifiedCommand || pendingCommand;
    if (!cmdToExecute) return;

    // Stop any ongoing confirmation listening loop and recording
    confirmLoopActiveRef.current = false;
    if (confirmChunkTimerRef.current) {
      clearTimeout(confirmChunkTimerRef.current);
      confirmChunkTimerRef.current = null;
    }
    if (recorderRef.current?.isRecording()) {
      try { await recorderRef.current.stop(); } catch {}
    }

    setIsListening(false);
    setShowConfirmation(false);
    setIsAwaitingConfirmation(false);
    setIsProcessing(true);

    if (confirmationTimeoutRef.current) {
      clearTimeout(confirmationTimeoutRef.current);
    }

    try {
      // Map interpreted command to old command format
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

      // Execute command
      onExecuteCommand(commandToExecute);

      // Show success toast
      let toastTitle = "✅ Trade Executed";
      let toastDescription = "";
      if (cmdToExecute.intent === 'buy') {
        toastDescription = `Bought ${cmdToExecute.amountType === 'dollars' ? `$${cmdToExecute.amount}` : `${cmdToExecute.amount} tokens`} of ${cmdToExecute.tokenDisplayName || cmdToExecute.tokenSymbol}`;
      } else if (cmdToExecute.intent === 'sell') {
        toastDescription = `Sold ${cmdToExecute.quantity === 'all' ? 'all' : cmdToExecute.amount} ${cmdToExecute.tokenDisplayName || cmdToExecute.tokenSymbol}`;
      } else if (cmdToExecute.intent === 'check') {
        toastTitle = "📊 Portfolio Check";
        toastDescription = "Checking your holdings";
      } else if (cmdToExecute.intent === 'reset') {
        toastTitle = "🔄 Portfolio Reset";
        toastDescription = "Your portfolio has been reset";
      }

      toast({
        title: toastTitle,
        description: toastDescription,
        duration: 3000,
        className: "bg-success/10 border-success/50 animate-scale-in"
      });

      // Generate success response
      const successText = modifiedCommand 
        ? `Trade executed! ${generateConfirmationText(modifiedCommand).replace('?', '.')}` 
        : `Trade executed! ${confirmationText.replace('?', '.')}`;
      await playAudioResponse(successText);
      onCommand(cmdToExecute.rawText, successText);

    } catch (error) {
      console.error('Command execution error:', error);
      const errorMsg = error instanceof Error ? error.message : 'Failed to execute command';
      await playAudioResponse(errorMsg);
      onCommand(cmdToExecute.rawText, errorMsg);
    } finally {
      setIsProcessing(false);
      setPendingCommand(null);
      setTranscribedText("");
    }
  };

  const handleCommandCancel = async () => {
    // Stop loop and any recording immediately
    confirmLoopActiveRef.current = false;
    if (confirmChunkTimerRef.current) {
      clearTimeout(confirmChunkTimerRef.current);
      confirmChunkTimerRef.current = null;
    }
    if (recorderRef.current?.isRecording()) {
      try { await recorderRef.current.stop(); } catch {}
    }
    setIsListening(false);

    setShowConfirmation(false);
    setIsAwaitingConfirmation(false);
    if (confirmationTimeoutRef.current) {
      clearTimeout(confirmationTimeoutRef.current);
    }
    
    const cancelMsg = "Command cancelled.";
    await playAudioResponse(cancelMsg);
    if (pendingCommand) {
      onCommand(pendingCommand.rawText, cancelMsg);
    }
    setPendingCommand(null);
    setTranscribedText("");
  };

  const listenForConfirmation = async () => {
    try {
      setIsAwaitingConfirmation(true);
      setTranscribedText("Say yes, no, or change the amount...");
      confirmLoopActiveRef.current = true;

      const startTime = Date.now();

      const startChunk = async () => {
        if (!confirmLoopActiveRef.current) return;

        // Global timeout safeguard
        if (Date.now() - startTime > 20000) {
          confirmLoopActiveRef.current = false;
          await handleCommandCancel();
          return;
        }

        // Start a short recording chunk
        recorderRef.current = new AudioRecorder();
        await recorderRef.current.start();
        setIsListening(true);

        if (confirmChunkTimerRef.current) clearTimeout(confirmChunkTimerRef.current);
        confirmChunkTimerRef.current = setTimeout(async () => {
          try {
            if (!recorderRef.current) return;
            const audioBlob = await recorderRef.current.stop();
            setIsListening(false);
            const base64Audio = await blobToBase64(audioBlob);

            // Send to STT
            const { data: sttData, error: sttError } = await supabase.functions.invoke('hathora-stt', {
              body: { audioData: base64Audio }
            });

            if (sttError) {
              console.error('STT error during confirmation:', sttError);
            }

            const text = sttData?.text || '';
            if (text) {
              console.log('Confirmation chunk transcribed:', text);
              setTranscribedText(text);
              if (isAwaitingConfirmation && pendingCommand) {
                const response = parseConfirmationResponse(text);
                if (response.action === 'confirm') {
                  confirmLoopActiveRef.current = false;
                  if (confirmationTimeoutRef.current) clearTimeout(confirmationTimeoutRef.current);
                  await handleCommandConfirm();
                  return;
                } else if (response.action === 'cancel') {
                  confirmLoopActiveRef.current = false;
                  if (confirmationTimeoutRef.current) clearTimeout(confirmationTimeoutRef.current);
                  await handleCommandCancel();
                  return;
                } else if (response.action === 'modify' && response.newAmount) {
                  const modifiedCommand = {
                    ...pendingCommand,
                    amount: response.newAmount,
                    amountType: response.newAmountType
                  } as InterpretedCommand;
                  const newConfText = generateConfirmationText(modifiedCommand);
                  setPendingCommand(modifiedCommand);
                  setConfirmationText(newConfText);
                  await playAudioResponse(`Updated to: ${newConfText}. Say yes to confirm or no to cancel.`);
                  // fall through to keep listening
                }
              }
            }
          } catch (err) {
            console.error('Confirmation chunk processing error:', err);
          } finally {
            // Schedule next chunk quickly for near-continuous listening
            setTimeout(startChunk, 150);
          }
        }, 2200); // listen ~2.2s per chunk
      };

      // Overall timeout
      if (confirmationTimeoutRef.current) clearTimeout(confirmationTimeoutRef.current);
      confirmationTimeoutRef.current = setTimeout(async () => {
        if (!confirmLoopActiveRef.current) return;
        confirmLoopActiveRef.current = false;
        if (recorderRef.current?.isRecording()) {
          try { await recorderRef.current.stop(); } catch {}
          setIsListening(false);
        }
        await handleCommandCancel();
      }, 20000);

      // Kick off the first chunk
      await startChunk();
    } catch (error) {
      console.error('Failed to start confirmation listening:', error);
      await handleCommandCancel();
    }
  };

  const handleVoiceCommand = async () => {
    if (isListening) {
      // Stop recording
      try {
        setIsProcessing(true);
        const audioBlob = await recorderRef.current!.stop();
        const base64Audio = await blobToBase64(audioBlob);

        console.log('Sending audio to Hathora STT...');
        setTranscribedText("Processing...");

        // Send to Hathora STT
        const { data: sttData, error: sttError } = await supabase.functions.invoke('hathora-stt', {
          body: { audioData: base64Audio }
        });

        if (sttError || !sttData?.text) {
          throw new Error(sttError?.message || 'Failed to transcribe audio');
        }

        const transcribedText = sttData.text;
        console.log('Transcribed:', transcribedText);
        setTranscribedText(transcribedText);

        // Clear timeout if listening for confirmation
        if (confirmationTimeoutRef.current) {
          clearTimeout(confirmationTimeoutRef.current);
        }

        // Handle confirmation response
        if (isAwaitingConfirmation && pendingCommand) {
          const response = parseConfirmationResponse(transcribedText);
          console.log('Confirmation response:', response);

          if (response.action === 'confirm') {
            await handleCommandConfirm();
          } else if (response.action === 'cancel') {
            await handleCommandCancel();
          } else if (response.action === 'modify' && response.newAmount) {
            // Update the pending command with new amount
            const modifiedCommand = {
              ...pendingCommand,
              amount: response.newAmount,
              amountType: response.newAmountType
            };
            
            const newConfText = generateConfirmationText(modifiedCommand);
            setConfirmationText(newConfText);
            await playAudioResponse(`Updated to: ${newConfText}. Say yes to confirm or no to cancel.`);
            
            // Listen again for final confirmation
            setPendingCommand(modifiedCommand);
            setIsProcessing(false);
            await listenForConfirmation();
            return;
          }

          setIsListening(false);
          setIsAwaitingConfirmation(false);
          setIsProcessing(false);
          return;
        }

        // Regular command interpretation
        const interpretedCmd = interpretCommand(transcribedText, tokens);
        console.log('Interpreted command:', interpretedCmd);

        // Handle different command types
        if (interpretedCmd.intent === 'unknown' || interpretedCmd.confidence < 0.4) {
          const fallbackMsg = "I didn't catch that fully. Try again, or say 'help' for examples.";
          await playAudioResponse(fallbackMsg);
          onCommand(transcribedText, fallbackMsg);
          setTranscribedText("");
          setIsListening(false);
          setIsProcessing(false);
          return;
        }

        if (interpretedCmd.intent === 'help') {
          const helpMsg = "You can say things like: Buy 100 dollars of PEPE, Sell all BONK, or Check my portfolio.";
          await playAudioResponse(helpMsg);
          onCommand(transcribedText, helpMsg);
          setTranscribedText("");
          setIsListening(false);
          setIsProcessing(false);
          return;
        }

        // Commands that need confirmation
        if (interpretedCmd.needsConfirmation) {
          const confText = generateConfirmationText(interpretedCmd);
          setConfirmationText(confText);
          setPendingCommand(interpretedCmd);
          setShowConfirmation(true);
          
          // Speak confirmation and WAIT for it to finish before listening
          setIsListening(false);
          setIsProcessing(true);
          await playAudioResponse(`Did you mean: ${confText}. Say yes to confirm, no to cancel, or say a new amount.`);
          
          // Now that audio finished, start listening for confirmation response
          setIsProcessing(false);
          await listenForConfirmation();
          return;
        } else {
          // Execute immediately (check, reset)
          let commandToExecute: any | undefined;
          if (interpretedCmd.intent === 'check') {
            commandToExecute = { action: 'check' };
          } else if (interpretedCmd.intent === 'reset') {
            commandToExecute = { action: 'reset' };
          }

          if (!commandToExecute) {
            const msg = "I didn't catch that fully. Try again, or say 'help' for examples.";
            await playAudioResponse(msg);
            onCommand(transcribedText, msg);
            setIsListening(false);
            setIsProcessing(false);
            return;
          }

          onExecuteCommand(commandToExecute);
          const aiResponse = `${interpretedCmd.intent === 'check' ? 'Checking your portfolio.' : 'Resetting your portfolio.'}`;
          await playAudioResponse(aiResponse);
          onCommand(transcribedText, aiResponse);
        }

        setIsListening(false);
        setTranscribedText("");
      } catch (error) {
        console.error('Voice command error:', error);
        const errorMsg = error instanceof Error ? error.message : 'Voice command failed';
        onCommand("Error", errorMsg);
        await playAudioResponse(errorMsg);
        setIsListening(false);
        setIsAwaitingConfirmation(false);
        setTranscribedText("");
      } finally {
        setIsProcessing(false);
      }
    } else {
      // Start recording
      try {
        recorderRef.current = new AudioRecorder();
        await recorderRef.current.start();
        setIsListening(true);
        setTranscribedText("Listening...");
      } catch (error) {
        console.error('Failed to start recording:', error);
        const errorMsg = error instanceof Error ? error.message : 'Failed to access microphone';
        onCommand("Error", errorMsg);
      }
    }
  };

  return (
    <>
      <div className="glass-card rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-gradient">Voice Commands</h2>
          <Badge variant="outline" className="text-xs">
            Press <kbd className="px-2 py-1 mx-1 bg-muted rounded">Space</kbd> to activate
          </Badge>
        </div>
        
        <div className="flex flex-col items-center gap-4">
          {/* Waveform Visualizer */}
          <WaveformVisualizer isActive={isListening || isSpeaking} isSpeaking={isSpeaking} />

          <Button
            onClick={handleVoiceCommand}
            disabled={isProcessing}
            size="lg"
            className={`rounded-full w-20 h-20 transition-all ${
              isListening 
                ? 'bg-destructive hover:bg-destructive/90 animate-pulse scale-110' 
                : 'bg-primary hover:bg-primary/90 hover-scale'
            }`}
          >
            {isListening ? (
              <MicOff className="h-8 w-8" />
            ) : (
              <Mic className="h-8 w-8" />
            )}
          </Button>

          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-2">
              {isProcessing 
                ? '⚙️ Processing your command...' 
                : isSpeaking 
                ? '🔊 AI is responding...'
                : isAwaitingConfirmation
                ? '🎙️ Listening for your confirmation (say yes or no)...'
                : isListening
                ? '🎙️ Listening... Speak now'
                : '💬 Click or press Space to speak'}
            </p>
            {transcribedText && (
              <p className="text-sm font-medium animate-fade-in text-primary">
                "{transcribedText}"
              </p>
            )}
          </div>

          <div className="text-center space-y-2">
            <p className="text-xs text-muted-foreground">Try saying:</p>
            <div className="flex flex-wrap gap-2 justify-center">
              <span className="px-3 py-1 bg-muted rounded-full text-xs hover-scale cursor-default">"Buy hundred dollars PEPE"</span>
              <span className="px-3 py-1 bg-muted rounded-full text-xs hover-scale cursor-default">"Sell all my BONK"</span>
              <span className="px-3 py-1 bg-muted rounded-full text-xs hover-scale cursor-default">"Check portfolio"</span>
            </div>
          </div>
        </div>
      </div>

      <ConfirmationDialog
        isOpen={showConfirmation}
        command={pendingCommand}
        confirmationText={confirmationText}
        onConfirm={handleCommandConfirm}
        onCancel={handleCommandCancel}
        timeout={20}
      />
    </>
  );
};

export default VoiceControlPanel;
