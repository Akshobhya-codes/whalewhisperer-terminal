import { useState, useRef, useEffect } from "react";
import { Mic, MicOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AudioRecorder, blobToBase64, base64ToAudioUrl } from "@/utils/audioRecorder";
import { parseVoiceCommand, generateAIResponse } from "@/utils/voiceCommands";
import { supabase } from "@/integrations/supabase/client";
import { Token, Holding } from "@/types/trading";
import WaveformVisualizer from "./WaveformVisualizer";
import { Badge } from "@/components/ui/badge";

interface VoiceControlPanelProps {
  onCommand: (userText: string, aiResponse: string) => void;
  tokens: Token[];
  holdings: Holding[];
  balance: number;
  onExecuteCommand: (command: any) => void;
}

const VoiceControlPanel = ({ onCommand, tokens, holdings, balance, onExecuteCommand }: VoiceControlPanelProps) => {
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcribedText, setTranscribedText] = useState("");
  const recorderRef = useRef<AudioRecorder | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Hotkey support (Space bar)
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Only activate on Space if not typing in an input
      if (e.code === 'Space' && !isProcessing && e.target === document.body) {
        e.preventDefault();
        handleVoiceCommand();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isListening, isProcessing]);

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

        // Parse command
        const command = parseVoiceCommand(transcribedText);
        console.log('Parsed command:', command);

        // Execute command
        let success = true;
        try {
          onExecuteCommand(command);
        } catch (error) {
          console.error('Command execution error:', error);
          success = false;
        }

        // Generate AI response
        const aiResponse = generateAIResponse(command, tokens, holdings, balance, success);
        console.log('AI response:', aiResponse);

        // Send to Hathora TTS
        const { data: ttsData, error: ttsError } = await supabase.functions.invoke('hathora-tts', {
          body: { text: aiResponse, voice: 'af_bella', speed: 1.1 }
        });

        if (ttsError || !ttsData?.audioContent) {
          throw new Error(ttsError?.message || 'Failed to generate speech');
        }

        // Play audio response
        const audioUrl = base64ToAudioUrl(ttsData.audioContent);
        if (!audioRef.current) {
          audioRef.current = new Audio();
        }
        audioRef.current.src = audioUrl;
        audioRef.current.play();

        // Log to console
        onCommand(transcribedText, aiResponse);

        setIsListening(false);
        setTranscribedText("");
      } catch (error) {
        console.error('Voice command error:', error);
        onCommand("Error", error instanceof Error ? error.message : 'Voice command failed');
        setIsListening(false);
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
        onCommand("Error", error instanceof Error ? error.message : 'Failed to access microphone');
      }
    }
  };

  return (
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
              ? 'Processing your command...' 
              : isSpeaking 
              ? 'AI is responding...'
              : isListening
              ? 'Listening... Speak now'
              : 'Click or press Space to speak'}
          </p>
          {transcribedText && (
            <p className="text-sm font-medium animate-fade-in">
              {transcribedText}
            </p>
          )}
        </div>

        <div className="text-center space-y-2">
          <p className="text-xs text-muted-foreground">Try saying:</p>
          <div className="flex flex-wrap gap-2 justify-center">
            <span className="px-3 py-1 bg-muted rounded-full text-xs hover-scale cursor-default">"Buy 100 BONK"</span>
            <span className="px-3 py-1 bg-muted rounded-full text-xs hover-scale cursor-default">"Sell all PEPE"</span>
            <span className="px-3 py-1 bg-muted rounded-full text-xs hover-scale cursor-default">"Check my portfolio"</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VoiceControlPanel;
