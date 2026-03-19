import React, { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import { Mic, Square, Radio, Loader2, AlertCircle, CheckCircle2, Sparkles } from "lucide-react";

export default function LiveCaption() {
  const socketRef = useRef(null);
  const audioContextRef = useRef(null);
  const workletNodeRef = useRef(null);
  const streamRef = useRef(null);

  const [finalTranscript, setFinalTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [vadProcessing, setVadProcessing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [status, setStatus] = useState("Disconnected");
  
  const transcriptEndRef = useRef(null);

  useEffect(() => {
    if (transcriptEndRef.current) {
      transcriptEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [finalTranscript, interimTranscript]);

  useEffect(() => {
    const socket = io(import.meta.env.VITE_LIVE_CAPTION_API || "http://localhost:3002", {
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      timeout: 10000,
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("[DEBUG] Connected to server");
      setStatus("Connected");
    });

    socket.on("sarvam-ready", () => {
      console.log("[DEBUG] Sarvam Ready received");
      setStatus("Ready");
    });

    socket.on("transcript", (data) => {
      console.log("[DEBUG] Transcript received:", data);
      setFinalTranscript(data.transcript || "");
      setInterimTranscript(data.interim || "");
    });

    socket.on("vad-status", (data) => {
      setVadProcessing(data.isProcessing);
    });

    socket.on("error", (msg) => {
      console.error("Server error:", msg);
      setStatus("Error");
    });

    socket.on("disconnect", () => {
      setStatus("Disconnected");
    });

    return () => {
      socket.disconnect();
      setIsRecording(false);
    };
  }, []);

  async function startRecording() {
    try {
      socketRef.current.emit("start-recording");
      setStatus("Connecting...");

      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error("Connection timeout")), 15000);
        socketRef.current.once("sarvam-ready", () => {
          clearTimeout(timeout);
          resolve();
        });
        socketRef.current.once("error", (msg) => {
          clearTimeout(timeout);
          reject(new Error(msg));
        });
      });

      if (audioContextRef.current && audioContextRef.current.state === "suspended") {
        await audioContextRef.current.resume();
        setIsRecording(true);
        setStatus("Recording");
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { sampleRate: 16000, channelCount: 1, echoCancellation: true, noiseSuppression: true }
      });
      streamRef.current = stream;

      const audioContext = new AudioContext({ sampleRate: 16000 });
      audioContextRef.current = audioContext;

      const workletCode = `
        class PCMProcessor extends AudioWorkletProcessor {
          process(inputs) {
            const input = inputs[0];
            if (input && input[0]) {
              const float32 = input[0];
              const int16 = new Int16Array(float32.length);
              for (let i = 0; i < float32.length; i++) {
                const s = Math.max(-1, Math.min(1, float32[i]));
                int16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
              }
              this.port.postMessage(int16.buffer, [int16.buffer]);
            }
            return true;
          }
        }
        registerProcessor('pcm-processor', PCMProcessor);
      `;
      const blob = new Blob([workletCode], { type: "application/javascript" });
      const workletUrl = URL.createObjectURL(blob);
      await audioContext.audioWorklet.addModule(workletUrl);
      URL.revokeObjectURL(workletUrl);

      const workletNode = new AudioWorkletNode(audioContext, "pcm-processor");
      workletNodeRef.current = workletNode;

      const source = audioContext.createMediaStreamSource(stream);
      const gainNode = audioContext.createGain();
      gainNode.gain.value = 2.5;

      source.connect(gainNode);
      gainNode.connect(workletNode);
      workletNode.connect(audioContext.destination);

      workletNode.port.onmessage = (event) => {
        if (socketRef.current?.connected) {
          socketRef.current.emit("audio-chunk", event.data);
        }
      };

      setIsRecording(true);
      setStatus("Recording");

    } catch (err) {
      console.error("Mic error:", err);
      setStatus("Mic Error");
    }
  }

  function stopRecording() {
    if (audioContextRef.current && audioContextRef.current.state === "running") {
      audioContextRef.current.suspend();
      setIsRecording(false);
      setStatus("Paused");
      socketRef.current?.emit("stop-recording");
    }
  }

  const toggleRecording = async () => {
    if (!isRecording) {
      await startRecording();
    } else {
      stopRecording();
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto animate-fade-in glass-panel p-6 sm:p-8 flex flex-col min-h-[80vh] mt-4 relative mb-12">
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-sky-300 to-transparent opacity-50"></div>
      
      <div className="text-center mb-8 shrink-0">
        <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-white/40 shadow-sm border border-white mb-4 backdrop-blur-md">
          <Radio className="text-sky-500" size={32} />
        </div>
        <h2 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-slate-800 to-slate-500 mb-3 tracking-tight">
          Live Captioning
        </h2>
        <p className="text-slate-500 font-medium text-lg">Real-time intelligent transcription powered by VAD</p>
      </div>

      <div className="flex flex-col items-center justify-center mb-6 shrink-0 z-10">
        <div className={`mb-6 px-6 py-2.5 rounded-full text-xs sm:text-sm font-semibold flex items-center gap-2.5 border backdrop-blur-md shadow-sm transition-all duration-300 ${
          status === 'Disconnected' ? 'bg-white/60 border-slate-200 text-slate-600' :
          status === 'Connected' ? 'bg-sky-50/80 border-sky-200 text-sky-600 shadow-[0_0_15px_rgba(14,165,233,0.1)]' :
          status === 'Ready' ? 'bg-emerald-50/80 border-emerald-200 text-emerald-600 shadow-[0_0_15px_rgba(16,185,129,0.2)]' :
          status === 'Connecting...' ? 'bg-amber-50/80 border-amber-200 text-amber-600' :
          status === 'Recording' ? 'bg-red-50/80 border-red-200 text-red-600 shadow-[0_0_15px_rgba(239,68,68,0.2)]' :
          status === 'Paused' ? 'bg-white/60 border-slate-200 text-slate-600' :
          'bg-rose-50/80 border-rose-200 text-rose-600'
        }`}>
          {(status === 'Disconnected' || status === 'Paused') && <><div className="w-2.5 h-2.5 rounded-full bg-slate-400"></div> {status}</>}
          {(status === 'Connected' || status === 'Ready') && <><CheckCircle2 size={16} /> Server {status}</>}
          {status === 'Connecting...' && <><Loader2 className="animate-spin" size={16} /> {status}</>}
          {status === 'Recording' && <><div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse"></div> Live {status}</>}
          {(status === 'Error' || status === 'Mic Error') && <><AlertCircle size={16} /> {status}</>}
        </div>

        <div className="relative group">
          <div className={`absolute -inset-4 rounded-full opacity-0 blur-xl transition-all duration-700 ${
             status === 'Recording' ? 'bg-red-500 opacity-40 animate-pulse' : 'bg-sky-400 group-hover:opacity-30'
          }`}></div>
          
          <button
            onClick={toggleRecording}
            disabled={status === 'Connecting...' || status === 'Disconnected'}
            className={`relative flex items-center justify-center w-20 h-20 sm:w-24 sm:h-24 rounded-full text-white shadow-[0_10px_40px_-5px_rgba(0,0,0,0.2)] border-4 border-white transition-all duration-300 disabled:opacity-50 disabled:hover:scale-100 outline-none ${
              !isRecording 
                ? 'bg-gradient-to-tr from-sky-500 to-sky-300 group-hover:scale-105 shadow-sky-500/50' 
                : 'bg-gradient-to-tr from-rose-500 to-red-400 hover:scale-105 animate-pulse-glow shadow-rose-500/50'
            }`}
          >
            {!isRecording ? (
              <Mic size={36} />
            ) : (
              <Square size={32} fill="currentColor" />
            )}
          </button>
        </div>

        {vadProcessing && (
          <div className="mt-5 flex items-center gap-2 text-sm text-sky-600 font-bold tracking-wide h-4 animate-fade-in drop-shadow-[0_0_5px_rgba(14,165,233,0.3)]">
            <Loader2 className="animate-spin" size={16} /> PROCESSING SPEECH...
          </div>
        )}
        {!vadProcessing && <div className="mt-5 h-4"></div>}
      </div>

      <div className="bg-white/40 backdrop-blur-xl border border-white/60 rounded-[2rem] p-6 sm:p-8 shadow-[0_8px_32px_rgba(0,0,0,0.04)] flex-1 flex flex-col relative overflow-hidden z-10 mt-4">
        <h3 className="text-xl font-semibold text-slate-800 mb-6 flex items-center gap-3 border-b border-white/80 pb-4 shrink-0">
           <Sparkles className="text-sky-500" size={20} /> Transcript Feed
        </h3>
        
        <div className="flex-1 overflow-y-auto custom-scrollbar pr-4 text-lg min-h-[300px]">
          {(!finalTranscript && !interimTranscript) ? (
            <div className="flex items-center justify-center text-slate-400 font-medium py-12">
              Start recording to see live captions...
            </div>
          ) : (
            <div className="flex flex-col gap-3 pb-4 pt-2">
              {finalTranscript && (
                <div className="text-slate-800 leading-relaxed whitespace-pre-wrap font-medium bg-white/50 p-4 rounded-xl shadow-sm border border-white/60">
                  {finalTranscript}
                </div>
              )}
              
              {interimTranscript && (
                <div className="text-sky-600 leading-relaxed font-bold animate-pulse whitespace-pre-wrap mt-2 drop-shadow-sm px-4">
                  {interimTranscript}
                </div>
              )}
              <div ref={transcriptEndRef} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}