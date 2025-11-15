import React, { useEffect, useRef } from 'react';

interface WaveformVisualizerProps {
  isActive: boolean;
  isSpeaking?: boolean;
}

const WaveformVisualizer: React.FC<WaveformVisualizerProps> = ({ isActive, isSpeaking = false }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bars = 40;
    const barWidth = canvas.width / bars;
    let phase = 0;

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (!isActive) {
        animationRef.current = requestAnimationFrame(draw);
        return;
      }

      // Different animation for listening vs speaking
      const frequency = isSpeaking ? 0.08 : 0.05;
      const amplitude = isSpeaking ? 0.8 : 0.6;

      for (let i = 0; i < bars; i++) {
        const x = i * barWidth;
        const normalizedPosition = i / bars;
        
        // Create wave effect
        const wave = Math.sin(normalizedPosition * Math.PI * 4 + phase) * amplitude;
        const randomVariation = Math.random() * 0.3;
        const height = (Math.abs(wave) + randomVariation) * (canvas.height / 2);

        // Gradient color based on position
        const hue = isSpeaking ? 200 : 280; // Blue for speaking, purple for listening
        const saturation = 70 + (wave * 30);
        const lightness = 50 + (wave * 20);
        
        ctx.fillStyle = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
        ctx.fillRect(x, canvas.height / 2 - height / 2, barWidth - 2, height);
      }

      phase += frequency;
      animationRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isActive, isSpeaking]);

  return (
    <div className="relative w-full h-24 bg-background/50 rounded-lg overflow-hidden border border-border/50">
      <canvas
        ref={canvasRef}
        width={400}
        height={96}
        className="w-full h-full"
      />
      {!isActive && (
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="text-sm text-muted-foreground">
            Press Space or click to activate
          </p>
        </div>
      )}
    </div>
  );
};

export default WaveformVisualizer;
