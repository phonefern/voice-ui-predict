"use client";
import React, { useState, useRef } from "react";

export default function VoiceTestPage() {
  const [file, setFile] = useState<File | null>(null);
  const [prediction, setPrediction] = useState<any>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [loading, setLoading] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const HF_API_URL = "https://chula-pd-voice-pd-api.hf.space/predict";

  // 🔴 เริ่มอัดเสียง
  const startRecording = async () => {
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
        console.log("Recording stopped, processing audio...");
        
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        
        // แปลง WebM เป็น WAV
        try {
          const wavBlob = await convertWebMToWav(blob);
          const wavFile = new File([wavBlob], "recorded_audio.wav", { 
            type: "audio/wav" 
          });
          setFile(wavFile);
          console.log("WAV file created successfully");
        } catch (error) {
          console.error("Error converting to WAV:", error);
          // Fallback: ใช้ WebM file
          const webmFile = new File([blob], "recorded_audio.webm", { 
            type: "audio/webm" 
          });
          setFile(webmFile);
        }

        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
        }
      };

      mediaRecorder.start(100);
      mediaRecorderRef.current = mediaRecorder;
      setIsRecording(true);
      
    } catch (error) {
      console.error("Error starting recording:", error);
      alert("ไม่สามารถเข้าถึงไมโครโฟนได้ กรุณาอนุญาตการเข้าถึงไมโครโฟน");
    }
  };

  // ⏹️ หยุดอัดเสียง
    const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      console.log("Stopping recording...");
    }
  };

  // 🔄 แปลง WebM เป็น WAV
  const convertWebMToWav = async (webmBlob: Blob): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const audioContext = new AudioContext();
      const fileReader = new FileReader();

      fileReader.onload = async () => {
        try {
          const arrayBuffer = fileReader.result as ArrayBuffer;
          
          // Decode WebM audio
          const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
          
          // สร้าง WAV buffer
          const wavBuffer = encodeWAV(audioBuffer);
          const wavBlob = new Blob([wavBuffer], { type: 'audio/wav' });
          
          resolve(wavBlob);
        } catch (error) {
          reject(error);
        }
      };

      fileReader.onerror = reject;
      fileReader.readAsArrayBuffer(webmBlob);
    });
  };

  // 📝 สร้าง WAV buffer
  const encodeWAV = (audioBuffer: AudioBuffer): ArrayBuffer => {
    const numChannels = audioBuffer.numberOfChannels;
    const sampleRate = audioBuffer.sampleRate;
    const length = audioBuffer.length * numChannels * 2;
    const buffer = new ArrayBuffer(44 + length);
    const view = new DataView(buffer);

    // WAV header
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

    // Audio data
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

    return buffer;
  };

  // 📤 ส่งไฟล์ไป predict
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
        error: "ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้ กรุณาลองใหม่อีกครั้ง" 
      });
    } finally {
      setLoading(false);
    }
  };

  // 🗑️ ล้างข้อมูล
  const handleReset = () => {
    setFile(null);
    setPrediction(null);
    if (isRecording) {
      stopRecording();
    }
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
            <span className="text-sm text-gray-500">บันทึกเสียงคำว่า "อาาาา" เพื่อวิเคราะห์</span>
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

            {/* Recording Section */}
            <div className="mb-6">
              <div className="flex gap-3 mb-4">
                {!isRecording ? (
                  <button
                    onClick={startRecording}
                    className="flex-1 py-3 bg-green-500 hover:bg-green-600 text-white rounded-xl font-medium transition-all duration-200 shadow-md hover:shadow-lg flex items-center justify-center gap-2"
                  >
                    <div className="w-3 h-3 bg-white rounded-full"></div>
                    🎤 เริ่มบันทึกเสียง
                  </button>
                ) : (
                  <button
                    onClick={stopRecording}
                    className="flex-1 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-medium transition-all duration-200 shadow-md hover:shadow-lg flex items-center justify-center gap-2"
                  >
                    <div className="w-3 h-3 bg-white rounded-full animate-pulse"></div>
                    ⏹️ หยุดบันทึก
                  </button>
                )}
              </div>

              {isRecording && (
                <div className="text-center py-3 bg-red-50 rounded-lg mb-4">
                  <div className="flex items-center justify-center gap-2 text-red-600">
                    <div className="w-2 h-2 bg-red-600 rounded-full animate-pulse"></div>
                    <span className="font-medium">กำลังบันทึกเสียง... พูดคำว่า "อาาาา" now</span>
                  </div>
                </div>
              )}
            </div>

            {/* File Upload */}
            <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-blue-400 transition-colors duration-200 mb-6">
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
                onChange={(e) => e.target.files && setFile(e.target.files[0])}
                className="block w-full text-sm text-gray-500
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-full file:border-0
                  file:text-sm file:font-semibold
                  file:bg-blue-50 file:text-blue-700
                  hover:file:bg-blue-100 transition-colors"
              />
            </div>

            {/* File Info */}
            {file && (
              <div className="bg-blue-50 rounded-lg p-4 mb-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <span className="text-blue-600">🎵</span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-800">{file.name}</p>
                      <p className="text-sm text-gray-600">
                        {file.type} • {(file.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setFile(null)}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <audio
                  controls
                  src={URL.createObjectURL(file)}
                  className="w-full mt-3 rounded-lg"
                />
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={handleSubmit}
                disabled={loading || !file}
                className="flex-1 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-xl font-medium transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    กำลังวิเคราะห์...
                  </>
                ) : (
                  <>
                    <span>🚀</span>
                    วิเคราะห์เสียง
                  </>
                )}
              </button>
              
              <button
                onClick={handleReset}
                className="px-6 py-3 border border-gray-300 hover:border-gray-400 text-gray-700 rounded-xl font-medium transition-all duration-200 hover:bg-gray-50"
              >
                ล้าง
              </button>
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

            {!prediction ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-gray-400 text-2xl">📊</span>
                </div>
                <p className="text-gray-500">ผลการวิเคราะห์จะแสดงที่นี่</p>
                <p className="text-sm text-gray-400 mt-2">หลังจากที่คุณบันทึกเสียงและกดวิเคราะห์</p>
              </div>
            ) : prediction.error ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-red-500 text-2xl">⚠️</span>
                </div>
                <p className="text-red-600 font-medium">{prediction.error}</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Prediction Result */}
                <div className={`rounded-xl p-6 ${
                  prediction.label === "HC" 
                    ? "bg-green-50 border border-green-200" 
                    : "bg-orange-50 border border-orange-200"
                }`}>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-800">ผลการคัดกรอง</h3>
                    <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                      prediction.label === "HC" 
                        ? "bg-green-100 text-green-800" 
                        : "bg-orange-100 text-orange-800"
                    }`}>
                      {prediction.label === "HC" ? "Healthy Control" : "Parkinson's Disease"}
                    </div>
                  </div>
                  
                  <div className="mb-4">
                    <div className="flex justify-between text-sm text-gray-600 mb-2">
                      <span>ความมั่นใจในการวิเคราะห์</span>
                      <span>{(prediction.confidence * 100).toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div 
                        className={`h-3 rounded-full transition-all duration-1000 ${
                          prediction.label === "HC" ? "bg-green-500" : "bg-orange-500"
                        }`}
                        style={{ width: `${prediction.confidence * 100}%` }}
                      ></div>
                    </div>
                  </div>
                </div>

                {/* Confidence Breakdown */}
                <div className="bg-gray-50 rounded-xl p-6">
                  <h4 className="font-semibold text-gray-800 mb-4">การกระจายความมั่นใจ</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Healthy Control (HC)</span>
                      <span className="font-medium text-green-600">
                        {prediction.label === "HC" 
                          ? (prediction.confidence * 100).toFixed(1) 
                          : ((1 - prediction.confidence) * 100).toFixed(1)
                        }%
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Parkinson's Disease (PD)</span>
                      <span className="font-medium text-orange-600">
                        {prediction.label === "PD" 
                          ? (prediction.confidence * 100).toFixed(1) 
                          : ((1 - prediction.confidence) * 100).toFixed(1)
                        }%
                      </span>
                    </div>
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
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-12 pt-8 border-t border-gray-200">
          <p className="text-gray-600">
            CheckPD Voice Screening System • สำหรับการคัดกรองเบื้องต้น
          </p>
          <p className="text-sm text-gray-500 mt-2">
            © 2024 CheckPD Team • ใช้สำหรับการศึกษาวิจัย
          </p>
        </div>
      </div>
    </div>
  );
}