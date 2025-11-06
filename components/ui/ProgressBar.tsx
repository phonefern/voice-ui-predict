import React from 'react';

interface ProgressBarProps {
  progress: number;
  color?: 'blue' | 'green' | 'red' | 'orange';
  height?: 'sm' | 'md' | 'lg';
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  color = 'blue',
  height = 'md'
}) => {
  const heightClasses = {
    sm: 'h-2',
    md: 'h-3',
    lg: 'h-4'
  };

  const colorClasses = {
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    red: 'bg-red-500',
    orange: 'bg-orange-500'
  };

  return (
    <div className={`w-full bg-gray-200 rounded-full ${heightClasses[height]}`}>
      <div
        className={`${colorClasses[color]} h-full rounded-full transition-all duration-1000 ease-linear`}
        style={{ width: `${progress}%` }}
      ></div>
    </div>
  );
};