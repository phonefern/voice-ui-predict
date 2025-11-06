"use client";
import React, { useState } from 'react';
import { VoiceRecorder } from '@/components/voice-recoder';
import { PredictionResult } from '@/components/prediction-result';
import { Button } from '@/components/ui/Button';
import { PredictionResponse } from '@/types';

const HF_API_URL = "https://chula-pd-voice-pd-api.hf.space/predict";

export default function VoiceTestPage() {
  const [file, setFile] = useState<File | null>(null);
  const [prediction, setPrediction] = useState<PredictionResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const handleRecordingComplete = (audioFile: File) => {
    setFile(audioFile);
    setPrediction(null);
  };

  const handleSubmit = async () => {
    if (!file) {
      alert("กรุณาอัดเสียงหรือเลือกไฟล์ก่อนส่งครับ");
      return;
    }

    setLoading(true);
    setPrediction(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(HF_API_URL, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      const data = await res.json();
      setPrediction(data);
      
    } catch (err) {
      console.error("Error:", err);
      setPrediction({ 
        label: "HC",
        confidence: 0,
        error: "ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้ กรุณาลองใหม่อีกครั้ง" 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setPrediction(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex justify-center items-center mb-4">
            <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center mr-3">
              <span className="text-white text-xl">🧠</span>
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              CheckPD Voice
            </h1>
          </div>
          <p className="text-gray-600 text-lg max-w-2xl mx-auto">
            ระบบคัดกรองโรคพาร์กินสันเบื้องต้นผ่านการวิเคราะห์เสียง
            <br />
            <span className="text-sm text-gray-500">บันทึกเสียงคำว่า "อาาาา" เป็นเวลา 10 วินาที</span>
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Left Column - Input */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="flex items-center mb-6">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                <span className="text-blue-600 text-sm">1</span>
              </div>
              <h2 className="text-xl font-semibold text-gray-800">บันทึกหรืออัปโหลดเสียง</h2>
            </div>

            <VoiceRecorder onRecordingComplete={handleRecordingComplete} />

            {/* Action Buttons */}
            <div className="flex gap-3 mt-6">
              <Button
                onClick={handleSubmit}
                disabled={loading || !file}
                variant="primary"
                loading={loading}
                className="flex-1"
              >
                🚀 วิเคราะห์เสียง
              </Button>
              
              <Button
                onClick={handleReset}
                variant="secondary"
              >
                ล้าง
              </Button>
            </div>
          </div>

          {/* Right Column - Results */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="flex items-center mb-6">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                <span className="text-blue-600 text-sm">2</span>
              </div>
              <h2 className="text-xl font-semibold text-gray-800">ผลการวิเคราะห์</h2>
            </div>

            <PredictionResult prediction={prediction} loading={loading} />
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-12 pt-8 border-t border-gray-200">
          <p className="text-gray-600">
            CheckPD Voice Screening System • สำหรับการคัดกรองเบื้องต้น
          </p>
          <p className="text-sm text-gray-500 mt-2">
            © 2025 Chula Parkinson Data Team • ใช้สำหรับการศึกษาวิจัย
          </p>
        </div>
      </div>
    </div>
  );
}