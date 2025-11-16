import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { base64ToAudioUrl } from "@/utils/audioRecorder";

const taunts = [
  "🐳 Ouch — the whale just belly-flopped. Shake it off, Captain!",
  "Looks like someone's swimming against the current. Time to turn around!",
  "The market's a tough ocean today. Don't worry, even whales have bad days.",
  "Your portfolio's taking a dive! Better hold your breath!",
  "Red numbers? That's just the market giving you character!",
];

const appreciations = [
  "💰 Profit tide rising! Keep swimming, legend.",
  "You're riding the wave like a true whale! Magnificent!",
  "Green numbers everywhere! You've got the Midas touch!",
  "Your portfolio is absolutely crushing it right now!",
  "Profits rolling in! The ocean bows to your greatness!",
];

export const useVoiceReactions = (totalPL: number, enabled: boolean = true) => {
  const lastPLRef = useRef<number>(totalPL);
  const lastReactionRef = useRef<number>(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const playVoiceReaction = async (text: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('hathora-tts', {
        body: { text, voice: 'af_bella', speed: 1.1 }
      });

      if (error || !data?.audioContent) {
        console.error('TTS error:', error);
        return;
      }

      const audioUrl = base64ToAudioUrl(data.audioContent);
      if (!audioRef.current) {
        audioRef.current = new Audio();
      }
      audioRef.current.src = audioUrl;
      await audioRef.current.play();
    } catch (error) {
      console.error('Error playing voice reaction:', error);
    }
  };

  useEffect(() => {
    if (!enabled) return;

    const now = Date.now();
    // Prevent reactions more than once per minute
    if (now - lastReactionRef.current < 60000) return;

    const plChange = ((totalPL - lastPLRef.current) / Math.abs(lastPLRef.current || 1)) * 100;

    if (plChange < -5) {
      // Taunt
      const taunt = taunts[Math.floor(Math.random() * taunts.length)];
      playVoiceReaction(taunt);
      lastReactionRef.current = now;
    } else if (plChange > 5) {
      // Appreciation
      const appreciation = appreciations[Math.floor(Math.random() * appreciations.length)];
      playVoiceReaction(appreciation);
      lastReactionRef.current = now;
    }

    lastPLRef.current = totalPL;
  }, [totalPL, enabled]);

  const triggerManualReaction = async (type: 'roast' | 'compliment') => {
    const message = type === 'roast' 
      ? taunts[Math.floor(Math.random() * taunts.length)]
      : appreciations[Math.floor(Math.random() * appreciations.length)];
    
    await playVoiceReaction(message);
  };

  return { triggerManualReaction };
};
