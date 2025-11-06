"use client";
import React, { useRef, useState, useCallback } from 'react';
import { Button } from '../ui/Button';
import { RecordingTimer } from './RecordingTimer';
import { AudioVisualizer } from './AudioVisualizer';
import { RecordingState, AudioFile } from '@/types';

interface VoiceRecorderProps {
  onRecordingComplete: (file: File) => void;
  recordingDuration?: number;
}

export const VoiceRecorder: React.FC<VoiceRecorderProps> = ({
  onRecordingComplete,
  recordingDuration = 10
}) => {
  const [recordingState, setRecordingState] = useState<RecordingState>({
    isRecording: false,
    countdown: recordingDuration,
    duration: recordingDuration
  });
  
  const [audioFile, setAudioFile] = useState<AudioFile>({ file: null, url: '' });
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);

  const convertWebMToWav = useCallback(async (webmBlob: Blob): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const audioContext = new AudioContext();
      const fileReader = new FileReader();

      fileReader.onload = async () => {
        try {
          const arrayBuffer = fileReader.result as ArrayBuffer;
          const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
          
          const numChannels = audioBuffer.numberOfChannels;
          const sampleRate = audioBuffer.sampleRate;
          const length = audioBuffer.length * numChannels * 2;
          const buffer = new ArrayBuffer(44 + length);
          const view = new DataView(buffer);

          const writeString = (offset: number, string: string) => {
            for (let i = 0; i < string.length; i++) {
              view.setUint8(offset + i, string.charCodeAt(i));
            }
          };

          writeString(0, 'RIFF');
          view.setUint32(4, 36 + length, true);
          writeString(8, 'WAVE');
          writeString(12, 'fmt ');
          view.setUint32(16, 16, true);
          view.setUint16(20, 1, true);
          view.setUint16(22, numChannels, true);
          view.setUint32(24, sampleRate, true);
          view.setUint32(28, sampleRate * numChannels * 2, true);
          view.setUint16(32, numChannels * 2, true);
          view.setUint16(34, 16, true);
          writeString(36, 'data');
          view.setUint32(40, length, true);

          const channelData = [];
          for (let channel = 0; channel < numChannels; channel++) {
            channelData.push(audioBuffer.getChannelData(channel));
          }

          let offset = 44;
          for (let i = 0; i < audioBuffer.length; i++) {
            for (let channel = 0; channel < numChannels; channel++) {
              const sample = Math.max(-1, Math.min(1, channelData[channel][i]));
              view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
              offset += 2;
            }
          }

          const wavBlob = new Blob([buffer], { type: 'audio/wav' });
          resolve(wavBlob);
        } catch (error) {
          reject(error);
        }
      };

      fileReader.onerror = reject;
      fileReader.readAsArrayBuffer(webmBlob);
    });
  }, []);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true
        } 
      });
      
      streamRef.current = stream;
      chunksRef.current = [];

      const options = { mimeType: 'audio/webm;codecs=opus' };
      const mediaRecorder = new MediaRecorder(stream, options);
      
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        
        try {
          const wavBlob = await convertWebMToWav(blob);
          const wavFile = new File([wavBlob], "recorded_audio.wav", { type: "audio/wav" });
          const url = URL.createObjectURL(wavFile);
          
          setAudioFile({ file: wavFile, url });
          onRecordingComplete(wavFile);
        } catch (error) {
          console.error("Error converting to WAV:", error);
          const webmFile = new File([blob], "recorded_audio.webm", { type: "audio/webm" });
          const url = URL.createObjectURL(webmFile);
          
          setAudioFile({ file: webmFile, url });
          onRecordingComplete(webmFile);
        }

        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
        }
      };

      mediaRecorder.start(100);
      mediaRecorderRef.current = mediaRecorder;
      
      setRecordingState(prev => ({
        ...prev,
        isRecording: true,
        countdown: recordingDuration
      }));

      countdownRef.current = setInterval(() => {
        setRecordingState(prev => {
          if (prev.countdown <= 1) {
            if (countdownRef.current) {
              clearInterval(countdownRef.current);
              countdownRef.current = null;
            }
            mediaRecorder.stop();
            return { ...prev, isRecording: false, countdown: 0 };
          }
          return { ...prev, countdown: prev.countdown - 1 };
        });
      }, 1000);
      
    } catch (error) {
      console.error("Error starting recording:", error);
      alert("ไม่สามารถเข้าถึงไมโครโฟนได้ กรุณาอนุญาตการเข้าถึงไมโครโฟน");
    }
  }, [recordingDuration, convertWebMToWav, onRecordingComplete]);

  const stopRecording = useCallback(() => {
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }

    if (mediaRecorderRef.current && recordingState.isRecording) {
      mediaRecorderRef.current.stop();
      setRecordingState(prev => ({ ...prev, isRecording: false }));
    }
  }, [recordingState.isRecording]);

  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setAudioFile({ file, url });
      onRecordingComplete(file);
    }
  }, [onRecordingComplete]);

  const clearRecording = useCallback(() => {
    setAudioFile({ file: null, url: '' });
    if (audioFile.url) {
      URL.revokeObjectURL(audioFile.url);
    }
  }, [audioFile.url]);

  return (
    <div className="space-y-6">
      {/* Recording Controls */}
      <div className="flex gap-3">
        {!recordingState.isRecording ? (
          <Button
            onClick={startRecording}
            variant="success"
            className="flex-1"
          >
            <div className="w-3 h-3 bg-white rounded-full"></div>
            🎤 เริ่มบันทึกเสียง
          </Button>
        ) : (
          <Button
            onClick={stopRecording}
            variant="danger"
            className="flex-1"
          >
            <div className="w-3 h-3 bg-white rounded-full animate-pulse"></div>
            ⏹️ หยุดบันทึก
          </Button>
        )}
      </div>

      {/* Audio Visualizer */}
      <AudioVisualizer isRecording={recordingState.isRecording} />

      {/* Recording Timer and Progress */}
      <RecordingTimer
        countdown={recordingState.countdown}
        totalDuration={recordingState.duration}
        isRecording={recordingState.isRecording}
      />

      {/* File Upload */}
      <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-blue-400 transition-colors duration-200">
        <div className="text-gray-400 mb-3">
          <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
        </div>
        <p className="text-gray-600 mb-2 font-medium">หรืออัปโหลดไฟล์เสียง</p>
        <p className="text-sm text-gray-500 mb-4">รองรับไฟล์ WAV, MP3, M4A, WebM</p>
        <input
          type="file"
          accept="audio/*,.wav,.mp3,.m4a,.webm"
          onChange={handleFileUpload}
          className="block w-full text-sm text-gray-500
            file:mr-4 file:py-2 file:px-4
            file:rounded-full file:border-0
            file:text-sm file:font-semibold
            file:bg-blue-50 file:text-blue-700
            hover:file:bg-blue-100 transition-colors"
        />
      </div>

      {/* Audio Preview */}
      {audioFile.file && (
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <span className="text-blue-600">🎵</span>
              </div>
              <div>
                <p className="font-medium text-gray-800">{audioFile.file.name}</p>
                <p className="text-sm text-gray-600">
                  {audioFile.file.type} • {(audioFile.file.size / 1024).toFixed(1)} KB
                </p>
              </div>
            </div>
            <button
              onClick={clearRecording}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <audio
            controls
            src={audioFile.url}
            className="w-full mt-3 rounded-lg"
          />
        </div>
      )}
    </div>
  );
};