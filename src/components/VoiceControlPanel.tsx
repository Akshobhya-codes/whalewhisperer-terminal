import { useState, useRef } from "react";
import { Mic, MicOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AudioRecorder, blobToBase64, base64ToAudioUrl } from "@/utils/audioRecorder";
import { parseVoiceCommand, generateAIResponse } from "@/utils/voiceCommands";
import { supabase } from "@/integrations/supabase/client";
import { Token, Holding } from "@/types/trading";

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
  const [transcribedText, setTranscribedText] = useState("");
  const recorderRef = useRef<AudioRecorder | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

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
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-orbitron font-bold text-foreground">
            🎙️ Voice Control
          </h2>
          <span className="text-xs text-primary font-inter animate-pulse">
            (Hathora Voice AI Active 🎙️)
          </span>
        </div>
      </div>

      <div className="flex flex-col items-center gap-4">
        <Button
          onClick={handleVoiceCommand}
          disabled={isProcessing}
          className={`relative w-20 h-20 rounded-full font-orbitron transition-all duration-300 ${
            isListening
              ? "bg-secondary animate-pulse glow-purple"
              : isProcessing
              ? "bg-muted-foreground cursor-not-allowed"
              : "bg-primary hover:bg-primary/90 hover:glow-cyan"
          }`}
        >
          {isListening ? (
            <MicOff className="w-8 h-8" />
          ) : (
            <Mic className="w-8 h-8" />
          )}
          
          {isListening && (
            <div className="absolute inset-0 rounded-full border-4 border-secondary animate-ping" />
          )}
        </Button>

        <div className="text-center">
          <div className="text-sm font-orbitron font-semibold text-foreground mb-1">
            {isProcessing ? "Processing..." : isListening ? "Listening... (click to stop)" : "Speak to WhaleWhisperer"}
          </div>
          {transcribedText && !isListening && !isProcessing && (
            <div className="text-xs text-muted-foreground font-inter">
              "{transcribedText}"
            </div>
          )}
        </div>

        {isListening && (
          <div className="flex gap-2">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="w-1 bg-primary rounded-full animate-pulse"
                style={{
                  height: Math.random() * 30 + 10 + "px",
                  animationDelay: i * 0.1 + "s",
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default VoiceControlPanel;
