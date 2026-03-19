import { useState, useRef } from 'react';
import { Mic, Square, Loader2, CheckCircle2, AlertCircle, Sparkles, Activity } from 'lucide-react';

export default function IntentExtractor() {
  const [isRecording, setIsRecording] = useState(false);
  const [status, setStatus] = useState('idle'); // idle, recording, processing, success, error
  const [response, setResponse] = useState(null);
  const [error, setError] = useState(null);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/mp4' });
        await sendAudioToBackend(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setStatus('recording');
      setResponse(null);
      setError(null);
    } catch (err) {
      console.error('Error accessing microphone:', err);
      setError('Failed to access microphone. Please grant permission.');
      setStatus('error');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setStatus('processing');
    }
  };

  const sendAudioToBackend = async (audioBlob) => {
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.mp4');

      const res = await fetch(`${import.meta.env.VITE_INTENT_EXTRACTOR_API || 'http://localhost:3000'}/api/v1/extract-intent`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        throw new Error(`Server error: ${res.status}`);
      }

      const data = await res.json();
      setResponse(data);
      setStatus('success');
    } catch (err) {
      console.error('Error sending audio:', err);
      setError(err.message || 'Failed to process audio');
      setStatus('error');
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto animate-fade-in glass-panel p-10 mt-8 relative">
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-sky-300 to-transparent opacity-50"></div>
      
      <div className="text-center mb-10">
        <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-white/40 shadow-sm border border-white mb-4 backdrop-blur-md">
          <Sparkles className="text-sky-500" size={32} />
        </div>
        <h2 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-slate-800 to-slate-500 mb-3 tracking-tight">
          Intent Extraction
        </h2>
        <p className="text-slate-500 font-medium text-lg">Record your voice to extract structured intelligent insights</p>
      </div>

      <div className="flex flex-col items-center justify-center mb-10">
        <div className={`mb-8 px-6 py-2.5 rounded-full text-sm font-semibold flex items-center gap-2.5 border backdrop-blur-md shadow-sm transition-all duration-300 ${
          status === 'idle' ? 'bg-white/60 border-slate-200 text-slate-600' :
          status === 'recording' ? 'bg-red-50/80 border-red-200 text-red-600 shadow-[0_0_15px_rgba(239,68,68,0.2)]' :
          status === 'processing' ? 'bg-amber-50/80 border-amber-200 text-amber-600' :
          status === 'success' ? 'bg-emerald-50/80 border-emerald-200 text-emerald-600 shadow-[0_0_15px_rgba(16,185,129,0.2)]' :
          'bg-rose-50/80 border-rose-200 text-rose-600'
        }`}>
          {status === 'idle' && <><div className="w-2.5 h-2.5 rounded-full bg-slate-400"></div> Ready to record</>}
          {status === 'recording' && <><div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse"></div> Recording...</>}
          {status === 'processing' && <><Loader2 className="animate-spin" size={16} /> Processing Audio...</>}
          {status === 'success' && <><CheckCircle2 size={16} /> Extraction Complete</>}
          {status === 'error' && <><AlertCircle size={16} /> Error Processing</>}
        </div>

        <div className="relative group">
          {/* Subtle glowing ring behind button */}
          <div className={`absolute -inset-4 rounded-full opacity-0 blur-xl transition-all duration-700 ${
             status === 'recording' ? 'bg-red-500 opacity-40 animate-pulse' : 'bg-sky-400 group-hover:opacity-30'
          }`}></div>
          
          {!isRecording ? (
            <button
              className="relative flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-tr from-sky-500 to-sky-300 text-white shadow-[0_10px_40px_-5px_rgba(14,165,233,0.5)] border-4 border-white hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:hover:scale-100 disabled:grayscale"
              onClick={startRecording}
              disabled={status === 'processing'}
            >
              <Mic size={36} />
            </button>
          ) : (
            <button
              className="relative flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-tr from-rose-500 to-red-400 text-white shadow-[0_10px_40px_-5px_rgba(244,63,94,0.5)] border-4 border-white hover:scale-105 transition-all duration-300 animate-pulse-glow"
              onClick={stopRecording}
            >
              <Square size={32} fill="currentColor" />
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="p-5 bg-rose-50/90 border border-rose-200 rounded-2xl text-rose-700 backdrop-blur-md mb-8 flex items-start gap-3 shadow-sm animate-fade-in">
          <AlertCircle className="mt-0.5 shrink-0" size={20} />
          <p className="font-medium">{error}</p>
        </div>
      )}

      {response && (
        <div className="bg-white/40 backdrop-blur-xl border border-white/60 rounded-[2rem] p-8 shadow-[0_8px_32px_rgba(0,0,0,0.04)] animate-fade-in">
          <div className="flex items-center gap-3 mb-8 border-b border-sky-100/60 pb-5">
            <Activity className="text-sky-500" size={24} />
            <h3 className="text-2xl font-semibold text-slate-800 tracking-tight">Extracted Insights</h3>
          </div>
          
          <div className="space-y-8">
            <div className="group">
              <h4 className="text-xs font-bold text-sky-600 uppercase tracking-widest mb-3 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-sky-400 inline-block"></span>
                Refined Transcription
              </h4>
              <p className="text-slate-700 bg-white/70 p-5 rounded-2xl border border-white/80 shadow-sm leading-relaxed text-lg transition-all hover:bg-white/90">
                {response.refined_transcription || 'N/A'}
              </p>
            </div>

            <div className="group">
              <h4 className="text-xs font-bold text-sky-600 uppercase tracking-widest mb-3 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-sky-400 inline-block"></span>
                Summary
              </h4>
              <p className="text-slate-700 bg-white/70 p-5 rounded-2xl border border-white/80 shadow-sm leading-relaxed text-lg transition-all hover:bg-white/90">
                {response.summary || 'N/A'}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="bg-gradient-to-b from-white/80 to-white/40 p-5 rounded-2xl border border-white/80 shadow-sm hover:shadow-md transition-shadow">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">Action</h4>
                <p className="text-xl font-bold text-sky-600 capitalize">{response.action || 'None detected'}</p>
              </div>
              <div className="bg-gradient-to-b from-white/80 to-white/40 p-5 rounded-2xl border border-white/80 shadow-sm hover:shadow-md transition-shadow">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">Confidence</h4>
                <p className="text-xl font-bold text-sky-600">{(response.confidence_score * 100).toFixed(1)}%</p>
              </div>
              <div className="bg-gradient-to-b from-white/80 to-white/40 p-5 rounded-2xl border border-white/80 shadow-sm hover:shadow-md transition-shadow">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">Processing Time</h4>
                <p className="text-xl font-bold text-slate-700">{response.processing_time_ms} <span className="text-sm font-medium text-slate-400">ms</span></p>
              </div>
            </div>

            {response.entities && Object.keys(response.entities).length > 0 && (
              <div className="group">
                <h4 className="text-xs font-bold text-sky-600 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-sky-400 inline-block"></span>
                  Extracted Entities
                </h4>
                <div className="bg-white/70 p-5 rounded-2xl border border-white/80 shadow-sm overflow-auto">
                  <pre className="text-sm text-slate-700 font-mono">
                    {JSON.stringify(response.entities, null, 2)}
                  </pre>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}