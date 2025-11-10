"use client";

import { useState, useEffect, useRef } from "react";

export default function Home() {
  const API_URL = "https://chula-pd-tremor-post-pd-api.hf.space/predict";
  type SensorDatum = {
    ax: number;
    ay: number;
    az: number;
    gx: number;
    gy: number;
    gz: number;
    ts: number;
  };

  type ApiSuccess = {
    prediction: "PD" | "Normal" | string;
    probability_pd: number;
    [key: string]: unknown;
  };

  type ResultState =
    | null
    | { status: "loading" }
    | ApiSuccess
    | { error: unknown };

  const [recording, setRecording] = useState<boolean>(false);
  const [sensorData, setSensorData] = useState<SensorDatum[]>([]);
  const [timeLeft, setTimeLeft] = useState<number>(15);
  const [result, setResult] = useState<ResultState>(null);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const motionHandlerRef = useRef<((e: DeviceMotionEvent) => void) | null>(null);

  // Safe runtime environment checks to avoid SSR "window is not defined"
  const isMobile =
    typeof navigator !== "undefined" &&
    /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
  const deviceMotionSupported =
    typeof window !== "undefined" &&
    // Using in-operator avoids direct property access when undefined
    ("DeviceMotionEvent" in window) &&
    // Narrow to ensure truthy constructor
    Boolean((window as unknown as { DeviceMotionEvent?: unknown }).DeviceMotionEvent);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (motionHandlerRef.current) {
        window.removeEventListener("devicemotion", motionHandlerRef.current);
      }
    };
  }, []);

  // ===== Start Recording =====
  const startRecording = async () => {
    console.log("🟡 Starting recording...");
    setError(null);

    try {
      // ✅ ตรวจสอบ mobile device
      if (!/Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)) {
        setError("⚠️ กรุณาเปิดบนมือถือหรือแท็บเล็ตเพื่อทดสอบเซนเซอร์");
        return;
      }

      // ✅ ตรวจสอบ HTTPS (สำคัญมาก!)
      if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
        setError("⚠️ ต้องเปิดผ่าน HTTPS เท่านั้น");
        return;
      }

      console.log("🔍 Checking DeviceMotion support...");

      // ✅ ตรวจสอบการรองรับ DeviceMotion
      if (!window.DeviceMotionEvent) {
        setError("❌ อุปกรณ์นี้ไม่รองรับการอ่านเซนเซอร์การเคลื่อนไหว");
        return;
      }

      // ✅ iOS Permission Flow
      if (typeof (DeviceMotionEvent as any).requestPermission === 'function') {
        console.log("📱 iOS - Requesting permission...");
        try {
          const permission = await (DeviceMotionEvent as any).requestPermission();
          if (permission !== 'granted') {
            setError("❌ จำเป็นต้องอนุญาตการเข้าถึงเซนเซอร์สำหรับการทดสอบ");
            return;
          }
          console.log("✅ iOS Permission granted");
        } catch (err) {
          console.error("iOS Permission error:", err);
          setError("❌ เกิดข้อผิดพลาดในการขออนุญาตเซนเซอร์");
          return;
        }
      }

      // ✅ เริ่มต้น recording
      setSensorData([]);
      setResult(null);
      setRecording(true);
      setTimeLeft(15);
      console.log("✅ Recording started");

      // ✅ สร้าง event handler สำหรับเซนเซอร์
      const handleMotion = (event: DeviceMotionEvent) => {
        if (!event.acceleration || !event.rotationRate) {
          console.warn("⚠️ No motion data available");
          return;
        }

        const newData: SensorDatum = {
          ax: event.acceleration.x || 0,
          ay: event.acceleration.y || 0,
          az: event.acceleration.z || 0,
          gx: event.rotationRate.alpha || 0,
          gy: event.rotationRate.beta || 0,
          gz: event.rotationRate.gamma || 0,
          ts: Date.now() / 1000,
        };

        console.log("📊 Sensor data:", newData);
        setSensorData(prev => [...prev, newData]);
      };

      // ✅ บันทึก reference และเพิ่ม event listener
      motionHandlerRef.current = handleMotion;
      window.addEventListener("devicemotion", handleMotion);

      // ✅ Timer สำหรับบันทึก 15 วินาที
      let t = 15;
      timerRef.current = setInterval(() => {
        t -= 1;
        setTimeLeft(t);
        
        if (t <= 0) {
          console.log("⏰ Timer finished");
          stopRecording();
        }
      }, 1000);

    } catch (error) {
      console.error("🚨 Start recording error:", error);
      setError("❌ เกิดข้อผิดพลาดในการเริ่มบันทึก");
    }
  };

  // ===== Stop Recording =====
  const stopRecording = async () => {
    console.log("🛑 Stopping recording...");
    
    // ✅ Cleanup timers and event listeners
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    if (motionHandlerRef.current) {
      window.removeEventListener("devicemotion", motionHandlerRef.current);
      motionHandlerRef.current = null;
    }

    setRecording(false);

    // ✅ ตรวจสอบว่ามีข้อมูลเพียงพอ
    if (sensorData.length < 10) {
      setError("❌ ข้อมูลน้อยเกินไป ลองใหม่อีกครั้ง");
      return;
    }

    console.log(`📦 Sending ${sensorData.length} data points to API`);

    // ✅ ส่งข้อมูลไปยัง API
    await sendSensorDataToAPI(sensorData);
  };

  // ===== Send Sensor Data to API =====
  const sendSensorDataToAPI = async (data: SensorDatum[]) => {
    setResult({ status: "loading" });

    const jsonPayload = {
      recording: {
        recordingFormat: ["ax", "ay", "az", "gx", "gy", "gz"],
        recordedData: data.map((d) => ({
          data: [d.ax, d.ay, d.az, d.gx, d.gy, d.gz],
          ts: d.ts,
        })),
      },
    };

    const blob = new Blob([JSON.stringify(jsonPayload)], {
      type: "application/json",
    });

    await sendToAPI(blob);
  };

  // ===== Send to Hugging Face API =====
  const sendToAPI = async (input: Blob | File) => {
    try {
      setResult({ status: "loading" });
      
      const formData = new FormData();
      formData.append("file", input);

      console.log("🚀 Sending to API...");
      const res = await fetch(API_URL, { 
        method: "POST", 
        body: formData 
      });
      
      if (!res.ok) {
        throw new Error(`API error: ${res.status}`);
      }
      
      const response: ApiSuccess = await res.json();
      console.log("✅ API Response:", response);
      setResult(response);
      setError(null);
    } catch (e) {
      console.error("❌ API Error:", e);
      setError("เกิดข้อผิดพลาดในการเชื่อมต่อกับ API");
      setResult({ error: e });
    }
  };

  // ===== Handle File Upload =====
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0];
      
      // ✅ ตรวจสอบว่าเป็นไฟล์ JSON
      if (selectedFile.type !== "application/json" && 
          !selectedFile.name.endsWith('.json')) {
        setError("กรุณาเลือกไฟล์ JSON เท่านั้น");
        return;
      }
      
      setFile(selectedFile);
      setError(null);
      console.log("📁 File selected:", selectedFile.name);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError("กรุณาเลือกไฟล์ JSON ก่อน!");
      return;
    }

    console.log("📤 Uploading file...");
    setResult(null);
    await sendToAPI(file);
  };

  // ===== Test Sensors =====
  const testSensors = () => {
    if (!window.DeviceMotionEvent) {
      setError("❌ DeviceMotion NOT Supported");
      return;
    }
    
    setError(null);
    const handler = (e: DeviceMotionEvent) => {
      console.log("Test sensor data:", e);
      alert(`✅ Sensors working! 
Acceleration: ${e.acceleration?.x?.toFixed(2)}, ${e.acceleration?.y?.toFixed(2)}, ${e.acceleration?.z?.toFixed(2)}
Rotation: ${e.rotationRate?.alpha?.toFixed(2)}, ${e.rotationRate?.beta?.toFixed(2)}, ${e.rotationRate?.gamma?.toFixed(2)}
      `);
      window.removeEventListener('devicemotion', handler);
    };
    
    window.addEventListener('devicemotion', handler);
    
    // Auto remove after 3 seconds
    setTimeout(() => {
      window.removeEventListener('devicemotion', handler);
    }, 3000);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
      <div className="bg-white shadow-lg rounded-2xl p-6 w-full max-w-md">
        <h1 className="text-2xl font-bold text-center text-indigo-600 mb-4">
          🧠 CheckPD Tremor Test
        </h1>

        <p className="text-gray-600 text-center mb-6">
          Upload JSON หรือใช้เซนเซอร์ในมือถือเพื่อทำนายอาการสั่น (PD / Normal)
        </p>

        {/* Debug Info */}
        <div className="text-xs text-gray-500 mb-4 p-2 bg-gray-50 rounded">
          <div>Device: {isMobile ? '📱 Mobile' : '💻 Desktop/SSR'}</div>
          <div>DeviceMotion: {deviceMotionSupported ? '✅ Supported' : '❌ Not Supported'}</div>
          <div>Data Points: {sensorData.length}</div>
          <div>Recording: {recording ? '✅ Yes' : '❌ No'}</div>
        </div>

        {/* Upload JSON Section */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            อัปโหลดไฟล์ JSON:
          </label>
          <input
            type="file"
            accept=".json"
            onChange={handleFileChange}
            className="border border-gray-300 p-2 rounded w-full mb-2"
          />
          <button
            onClick={handleUpload}
            disabled={!file}
            className={`w-full py-2 rounded ${
              file 
                ? "bg-blue-600 text-white hover:bg-blue-700" 
                : "bg-gray-300 text-gray-500 cursor-not-allowed"
            }`}
          >
            📁 Upload JSON
          </button>
        </div>

        <div className="text-center text-gray-500 mb-4">หรือ</div>

        {/* Sensor Recording Section */}
        {!recording ? (
          <>
            <div className="space-y-3">
              <button
                onClick={startRecording}
                className="bg-green-600 text-white w-full py-2 rounded hover:bg-green-700"
              >
                ▶️ Start 15s Recording
              </button>
              
              <button
                onClick={testSensors}
                className="bg-gray-600 text-white w-full py-2 rounded hover:bg-gray-700"
              >
                🔧 Test Sensors
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="text-center mb-4">
              <p className="text-lg font-semibold text-indigo-600">
                ⏱ กำลังบันทึก... ({timeLeft}s)
              </p>
              <div className="w-full bg-gray-200 rounded-full h-3 mt-2">
                <div
                  className="bg-indigo-600 h-3 rounded-full transition-all"
                  style={{ width: `${((15 - timeLeft) / 15) * 100}%` }}
                ></div>
              </div>
              <p className="text-sm text-gray-600 mt-2">
                เก็บข้อมูลแล้ว: {sensorData.length} points
              </p>
            </div>
            <button
              onClick={stopRecording}
              className="bg-red-500 text-white w-full py-2 rounded hover:bg-red-600"
            >
              ⏹ Stop Now
            </button>
          </>
        )}

        {/* Error Display */}
        {error && (
          <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            ⚠️ {error}
          </div>
        )}

        {/* Result Display */}
        {result && "status" in result && result.status === "loading" && (
          <div className="mt-6 text-center text-gray-600 animate-pulse">
            🔄 กำลังส่งข้อมูลไปยังโมเดล...
          </div>
        )}

        {result && (result as ApiSuccess).prediction && (
          <div className="text-center mt-6 p-4 bg-green-50 rounded-lg">
            <p className="text-xl font-semibold">
              🔮 ผลลัพธ์:{" "}
              <span
                className={`${
                  (result as ApiSuccess).prediction === "PD"
                    ? "text-red-600"
                    : "text-green-600"
                }`}
              >
                {(result as ApiSuccess).prediction === "PD" ? "Parkinson's Disease" : "Normal"}
              </span>
            </p>
            <p className="text-gray-700 mt-2">
              ความมั่นใจ: {(((result as ApiSuccess).probability_pd ?? 0) * 100).toFixed(2)}%
            </p>
            {(result as ApiSuccess).prediction === "PD" ? (
              <p className="text-sm text-red-600 mt-2">
                ⚠️ แนะนำให้ปรึกษาแพทย์ผู้เชี่ยวชาญ
              </p>
            ) : (
              <p className="text-sm text-green-600 mt-2">
                ✅ ผลปกติ
              </p>
            )}
          </div>
        )}

        {result && "error" in result && (
          <div className="mt-6 text-center text-red-600">
            ❌ เกิดข้อผิดพลาด: {String(JSON.stringify((result as { error: unknown }).error))}
          </div>
        )}
      </div>
    </div>
  );
}