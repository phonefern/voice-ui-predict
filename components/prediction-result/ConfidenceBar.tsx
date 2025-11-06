import React from 'react';
import { ProgressBar } from '../ui/ProgressBar';

interface ConfidenceBarProps {
  label: string;
  confidence: number;
  color: 'green' | 'orange';
  isPrimary: boolean;
}

export const ConfidenceBar: React.FC<ConfidenceBarProps> = ({
  label,
  confidence,
  color,
  isPrimary
}) => {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-gray-600">{label}</span>
      <div className="flex items-center gap-3">
        <ProgressBar 
          progress={confidence * 100} 
          color={color} 
          height="sm" 
        />
        <span className={`font-medium text-sm ${isPrimary ? 'text-gray-800' : 'text-gray-500'}`}>
          {(confidence * 100).toFixed(1)}%
        </span>
      </div>
    </div>
  );
};