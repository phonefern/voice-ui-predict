export interface PredictionResponse {
  label: "HC" | "PD";
  confidence: number;
  error?: string;
}

export interface RecordingState {
  isRecording: boolean;
  countdown: number;
  duration: number;
}

export interface AudioFile {
  file: File | null;
  url: string;
}