import React from 'react';
import { PredictionResponse } from '@/types';
import { ConfidenceBar } from './ConfidenceBar';
import { ProgressBar } from '../ui/ProgressBar';

interface PredictionResultProps {
  prediction: PredictionResponse | null;
  loading?: boolean;
}

export const PredictionResult: React.FC<PredictionResultProps> = ({
  prediction,
  loading = false
}) => {
  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
        <p className="text-gray-600">กำลังวิเคราะห์เสียง...</p>
        <p className="text-sm text-gray-400 mt-2">กรุณารอสักครู่</p>
      </div>
    );
  }

  if (!prediction) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-gray-400 text-2xl">📊</span>
        </div>
        <p className="text-gray-500">ผลการวิเคราะห์จะแสดงที่นี่</p>
        <p className="text-sm text-gray-400 mt-2">หลังจากที่คุณบันทึกเสียงและกดวิเคราะห์</p>
      </div>
    );
  }

  if (prediction.error) {
    return (
      <div className="text-center py-8">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-red-500 text-2xl">⚠️</span>
        </div>
        <p className="text-red-600 font-medium">{prediction.error}</p>
      </div>
    );
  }

  const isHC = prediction.label === "HC";
  const hcConfidence = isHC ? prediction.confidence : 1 - prediction.confidence;
  const pdConfidence = isHC ? 1 - prediction.confidence : prediction.confidence;

  return (
    <div className="space-y-6">
      {/* Prediction Result */}
      <div className={`rounded-xl p-6 ${
        isHC 
          ? "bg-green-50 border border-green-200" 
          : "bg-orange-50 border border-orange-200"
      }`}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-800">ผลการคัดกรอง</h3>
          <div className={`px-3 py-1 rounded-full text-sm font-medium ${
            isHC 
              ? "bg-green-100 text-green-800" 
              : "bg-orange-100 text-orange-800"
          }`}>
            {isHC ? "Healthy Control" : "Parkinson's Disease"}
          </div>
        </div>
        
        <div className="mb-4">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>ความมั่นใจในการวิเคราะห์</span>
            <span>{(prediction.confidence * 100).toFixed(1)}%</span>
          </div>
          <ProgressBar 
            progress={prediction.confidence * 100} 
            color={isHC ? "green" : "orange"} 
          />
        </div>
      </div>

      {/* Confidence Breakdown */}
      <div className="bg-gray-50 rounded-xl p-6">
        <h4 className="font-semibold text-gray-800 mb-4">การกระจายความมั่นใจ</h4>
        <div className="space-y-4">
          <ConfidenceBar
            label="Healthy Control (HC)"
            confidence={hcConfidence}
            color="green"
            isPrimary={isHC}
          />
          <ConfidenceBar
            label="Parkinson's Disease (PD)"
            confidence={pdConfidence}
            color="orange"
            isPrimary={!isHC}
          />
        </div>
      </div>

      {/* Medical Disclaimer */}
      <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
        <div className="flex items-start gap-3">
          <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
            <span className="text-blue-600 text-sm">ℹ️</span>
          </div>
          <div>
            <p className="text-sm text-blue-800 font-medium">ข้อควรทราบ</p>
            <p className="text-xs text-blue-700 mt-1">
              ผลการวิเคราะห์นี้เป็นเพียงการคัดกรองเบื้องต้นเท่านั้น 
              กรุณาปรึกษาแพทย์ผู้เชี่ยวชาญสำหรับการวินิจฉัยที่ถูกต้อง
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};