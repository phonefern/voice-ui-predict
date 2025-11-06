import React from 'react';

interface AudioVisualizerProps {
  isRecording: boolean;
}

export const AudioVisualizer: React.FC<AudioVisualizerProps> = ({ isRecording }) => {
  if (!isRecording) return null;

  return (
    <div className="flex items-end justify-center gap-1 h-16 mb-4">
      {Array.from({ length: 20 }).map((_, i) => (
        <div
          key={i}
          className="w-2 bg-green-500 rounded-t transition-all duration-300"
          style={{
            height: `${Math.random() * 100}%`,
            animation: 'pulse 1.5s ease-in-out infinite',
            animationDelay: `${i * 0.1}s`
          }}
        />
      ))}
    </div>
  );
};