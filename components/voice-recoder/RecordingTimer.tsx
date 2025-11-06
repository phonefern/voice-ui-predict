import React from 'react';
import { ProgressBar } from '../ui/ProgressBar';

interface RecordingTimerProps {
  countdown: number;
  totalDuration: number;
  isRecording: boolean;
}

export const RecordingTimer: React.FC<RecordingTimerProps> = ({
  countdown,
  totalDuration,
  isRecording
}) => {
  const progress = ((totalDuration - countdown) / totalDuration) * 100;

  if (!isRecording) return null;

  return (
    <div className="space-y-4">
      <div className="text-center py-3 bg-red-50 rounded-lg">
        <div className="flex items-center justify-center gap-2 text-red-600 mb-2">
          <div className="w-2 h-2 bg-red-600 rounded-full animate-pulse"></div>
          <span className="font-medium">กำลังบันทึกเสียง... พูดคำว่า "อาาาา"</span>
        </div>
        <div className="text-2xl font-bold text-red-600">
          {countdown} วินาที
        </div>
      </div>

      <div className="space-y-2">
        <ProgressBar progress={progress} color="green" height="lg" />
        <div className="flex justify-between text-sm text-gray-600">
          <span>0s</span>
          <span>{Math.floor(totalDuration / 2)}s</span>
          <span>{totalDuration}s</span>
        </div>
      </div>
    </div>
  );
};