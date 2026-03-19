import { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Upload, Search, UserCheck, Loader2, Target, Tag, FileAudio, Users, CheckCircle2, Code, X, AlertCircle, Sparkles } from 'lucide-react';

export default function Diarization() {
  const [activeTab, setActiveTab] = useState('save');
  const [file, setFile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [saveResult, setSaveResult] = useState(null);
  const [saveError, setSaveError] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchLimit, setSearchLimit] = useState(5);
  const [allEntries, setAllEntries] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState(null);
  const [searchError, setSearchError] = useState('');
  
  const [jsonModalData, setJsonModalData] = useState(null);
  const [isJsonModalOpen, setIsJsonModalOpen] = useState(false);

  const openJsonModal = (data) => {
    setJsonModalData(data);
    setIsJsonModalOpen(true);
    document.body.style.overflow = 'hidden';
  };

  const closeJsonModal = () => {
    setIsJsonModalOpen(false);
    setTimeout(() => setJsonModalData(null), 300);
    document.body.style.overflow = 'auto';
  };

  const [agentName, setAgentName] = useState('');
  const [agentFile, setAgentFile] = useState(null);
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [enrollResult, setEnrollResult] = useState(null);
  const [enrollError, setEnrollError] = useState('');
  const agentFileInputRef = useRef(null);

  const API_URL = import.meta.env.VITE_DIARIZATION_API || 'http://localhost:3001';

  const handleAgentFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setAgentFile(e.target.files[0]);
      setEnrollError('');
    }
  };

  const handleEnroll = async (e) => {
    e.preventDefault();
    if (!agentFile || !agentName.trim()) return;

    setIsEnrolling(true);
    setEnrollError('');
    setEnrollResult(null);

    const formData = new FormData();
    formData.append('name', agentName.trim());
    formData.append('voice_sample', agentFile);

    try {
      const res = await fetch(`${API_URL}/api/v1/agents/enroll`, { method: 'POST', body: formData });
      const data = await res.json();
      if (data.error || !data.success) throw new Error(data.detail || data.error || data.message || 'Failed to enroll agent');
      setEnrollResult(data);
      setAgentName('');
      setAgentFile(null);
    } catch (err) {
      setEnrollError(err.message || 'Failed to enroll agent');
    } finally {
      setIsEnrolling(false);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setSaveError('');
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
      setSaveError('');
    }
  };

  const handleSave = async () => {
    if (!file) return;
    setIsProcessing(true);
    setSaveError('');
    setSaveResult(null);
    const formData = new FormData();
    formData.append('call_recording', file);

    try {
      const res = await fetch(`${API_URL}/api/v1/transcriptions`, { method: 'POST', body: formData });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setSaveResult(data);
    } catch (err) {
      setSaveError(err.message || 'Failed to process audio');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSearch = async (e) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setSearchError('');
    setSearchResults(null);

    try {
      const res = await fetch(`${API_URL}/api/v1/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: searchQuery.trim(),
          limit: parseInt(searchLimit),
          all_entries: allEntries
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setSearchResults(data);
    } catch (err) {
      setSearchError(err.message || 'Search failed');
    } finally {
      setIsSearching(false);
    }
  };

  const formatTranscript = (text) => {
    if (!text) return '';
    const lines = text.split(/\r?\n|\\n/);
    
    return lines.map((line, i) => {
      if (!line.trim()) return null;
      
      let speakerClass = "text-slate-800 font-bold";
      let speakerName = "";
      let speakerText = line;
      let bubbleStyle = "bg-white/80 border-slate-200/50 mr-8 rounded-tr-xl";
      
      const colonIndex = line.indexOf(':');
      if (colonIndex > -1 && colonIndex < 30) {
        speakerName = line.substring(0, colonIndex + 1);
        speakerText = line.substring(colonIndex + 1);
        
        if (speakerName.toLowerCase().includes('agent') || speakerName.toLowerCase().includes('ayush')) {
          speakerClass = "text-sky-700 font-bold";
          bubbleStyle = "bg-gradient-to-br from-sky-50/90 to-blue-50/50 border-sky-100 ml-8 rounded-tl-xl";
        } else if (speakerName.toLowerCase().includes('client')) {
          speakerClass = "text-emerald-700 font-bold";
          bubbleStyle = "bg-gradient-to-br from-emerald-50/90 to-teal-50/50 border-emerald-100 mr-8 rounded-tr-xl text-right";
        }
      }

      return (
        <div key={i} className={`mb-4 p-4 rounded-2xl rounded-bl-sm border backdrop-blur-sm shadow-[0_4px_15px_rgba(0,0,0,0.02)] ${bubbleStyle} transition-all hover:scale-[1.01]`}>
          {speakerName && <div className={`${speakerClass} mb-1.5 text-xs tracking-widest uppercase opacity-80`}>{speakerName.replace(':', '')}</div>}
          <div className={`text-slate-700 font-medium ${speakerName.toLowerCase().includes('client') ? 'text-right' : 'text-left'}`}>{speakerText.trim()}</div>
        </div>
      );
    });
  };

  return (
    <div className="w-full max-w-5xl mx-auto animate-fade-in glass-panel p-6 sm:p-10 mt-8 relative">
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-sky-300 to-transparent opacity-50"></div>
      
      <div className="text-center mb-10">
        <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-white/40 shadow-sm border border-white mb-4 backdrop-blur-md">
          <Users className="text-sky-500" size={32} />
        </div>
        <h2 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-slate-800 to-slate-500 mb-3 tracking-tight">
          Speaker Diarization
        </h2>
        <p className="text-slate-500 font-medium text-lg">Process multiplexed calls, search intelligent transcripts, and enroll agents</p>
      </div>

      <div className="flex p-1.5 rounded-full inset-glass mb-10 max-w-2xl mx-auto backdrop-blur-md">
        {[
          { id: 'save', icon: Upload, label: 'Process Audio' },
          { id: 'search', icon: Search, label: 'Search Nexus' },
          { id: 'agents', icon: UserCheck, label: 'Agent Hub' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-full text-sm font-semibold transition-all duration-300 ${
              activeTab === tab.id 
                ? 'tab-active' 
                : 'tab-inactive'
            }`}
          >
            <tab.icon size={18} className={activeTab === tab.id ? "text-sky-500" : ""} />
            {tab.label}
          </button>
        ))}
      </div>

      <div className="bg-white/40 backdrop-blur-xl border border-white/60 rounded-[2rem] p-8 mt-4 shadow-[0_8px_32px_rgba(0,0,0,0.04)] min-h-[450px]">
        {/* PROCESS TAB */}
        {activeTab === 'save' && (
          <div className="animate-fade-in space-y-8">
            <div
              className={`animated-gradient-border p-[3px] rounded-3xl transition-all duration-300 ${isDragOver ? 'scale-[1.02]' : ''}`}
              onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
              onDragLeave={(e) => { e.preventDefault(); setIsDragOver(false); }}
              onDrop={handleDrop}
            >
              <div
                className={`rounded-[1.35rem] p-12 text-center cursor-pointer transition-all duration-300 bg-white/70 backdrop-blur-md hover:bg-white/90 shadow-inner`}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="audio/*,video/mpeg,audio/mpeg,video/mp4,audio/mp4,.mp3,.mpeg,.mpg,.m4a,.aac,.wav,.ogg"
                  className="hidden"
                />
                <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-sky-100 to-white shadow-[0_5px_20px_rgba(14,165,233,0.15)] flex items-center justify-center mx-auto mb-6 border border-white text-sky-500">
                  {file ? <FileAudio size={36} /> : <Upload size={36} />}
                </div>
                
                {file ? (
                  <div>
                    <h3 className="text-slate-800 font-bold text-xl mb-2">{file.name}</h3>
                    <p className="text-sky-600 font-medium bg-sky-50 px-3 py-1 rounded-full inline-block">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                ) : (
                  <div>
                    <h3 className="text-slate-800 font-bold text-2xl mb-2 tracking-tight">Drop audio file here</h3>
                    <p className="text-slate-500 font-medium">Click to browse (Supports MP3, WAV, MP4)</p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-center">
              <button
                className="glass-button glass-button-hover flex items-center justify-center gap-3 px-10 py-4 rounded-full text-sky-800 font-bold text-lg w-full sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-[0_10px_30px_rgba(14,165,233,0.2)]"
                onClick={handleSave}
                disabled={!file || isProcessing}
              >
                {isProcessing ? (
                  <><Loader2 className="animate-spin" size={24} /> Analyzing Audio Matrix...</>
                ) : (
                  <><Sparkles size={24} className="text-sky-500" /> Transcribe & Analyze</>
                )}
              </button>
            </div>

            {saveError && (
              <div className="p-5 bg-rose-50/90 border border-rose-200 rounded-2xl text-rose-700 font-medium backdrop-blur-md flex gap-3 shadow-sm">
                <AlertCircle size={20} className="shrink-0" /> {saveError}
              </div>
            )}

            {saveResult && (
              <div className="mt-10 space-y-8 animate-fade-in">
                <div className="flex items-center gap-3 text-emerald-700 bg-emerald-50/80 px-5 py-4 rounded-2xl border border-emerald-200 shadow-sm backdrop-blur-md">
                  <CheckCircle2 size={24} className="text-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)] rounded-full" />
                  <span className="font-bold text-lg">Successfully processed {file.name}</span>
                </div>
                
                <div className="bg-white/60 backdrop-blur-md rounded-3xl border border-white/80 p-8 shadow-sm">
                  <h3 className="font-bold text-2xl text-slate-800 mb-6 flex items-center gap-3">
                    <Tag size={24} className="text-sky-500" /> Intelligent Summary
                  </h3>
                  
                  <div className="space-y-8">
                    <div>
                      <p className="text-slate-700 leading-relaxed font-medium text-lg bg-white/80 p-6 rounded-2xl border border-white shadow-sm">
                        {saveResult.analysis?.summary || saveResult.summary || "No summary available"}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
                      {saveResult.analysis?.satisfactionScore !== undefined && (
                        <div className="bg-gradient-to-b from-white/90 to-white/50 p-5 rounded-2xl border border-white shadow-sm">
                          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Satisfaction</h4>
                          <p className="text-3xl font-black text-emerald-500">{saveResult.analysis.satisfactionScore}<span className="text-xl text-slate-400 font-medium">/10</span></p>
                        </div>
                      )}
                      
                      {saveResult.speakerCount !== undefined && (
                        <div className="bg-gradient-to-b from-white/90 to-white/50 p-5 rounded-2xl border border-white shadow-sm">
                          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Speakers</h4>
                          <p className="text-3xl font-black text-sky-500">{saveResult.speakerCount}</p>
                        </div>
                      )}

                      {saveResult.metrics?.totalWords !== undefined && (
                        <div className="bg-gradient-to-b from-white/90 to-white/50 p-5 rounded-2xl border border-white shadow-sm">
                          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Total Words</h4>
                          <p className="text-3xl font-black text-sky-500">{saveResult.metrics.totalWords}</p>
                        </div>
                      )}

                      {saveResult.metrics?.processingMs && (
                        <div className="bg-gradient-to-b from-white/90 to-white/50 p-5 rounded-2xl border border-white shadow-sm">
                          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Time</h4>
                          <p className="text-3xl font-black text-slate-700">
                            {((saveResult.metrics.processingMs.stt || 0) + (saveResult.metrics.processingMs.gemini || 0))} <span className="text-lg text-slate-400 font-medium">ms</span>
                          </p>
                        </div>
                      )}
                    </div>

                    {saveResult.analysis?.tags && saveResult.analysis.tags.length > 0 && (
                      <div>
                        <div className="flex flex-wrap gap-2.5">
                          {saveResult.analysis.tags.map((tag, idx) => (
                            <span key={idx} className="px-4 py-1.5 bg-gradient-to-r from-sky-100 to-sky-50 text-sky-700 border border-sky-200 rounded-full text-sm font-bold shadow-sm">
                              #{tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-white/60 backdrop-blur-md rounded-3xl border border-white/80 p-8 shadow-sm">
                  <h3 className="font-bold text-2xl text-slate-800 mb-6 flex items-center gap-3">
                    <Target size={24} className="text-sky-500" /> Diarized Transcript
                  </h3>
                  <div className="max-h-[500px] overflow-y-auto pr-4 custom-scrollbar rounded-2xl bg-slate-50/50 p-4 border border-slate-100/50 inset-glass">
                    {formatTranscript(saveResult.transcript || saveResult.refined_transcription)}
                  </div>
                </div>

                <div className="pt-4 flex justify-end">
                  <button
                    onClick={() => openJsonModal(saveResult)}
                    className="glass-button glass-button-hover flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold text-slate-700 shadow-sm"
                  >
                    <Code size={18} className="text-sky-500" />
                    Open Developer JSON
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* SEARCH TAB */}
        {activeTab === 'search' && (
          <div className="animate-fade-in space-y-8">
            <form onSubmit={handleSearch} className="space-y-6 bg-white/50 p-8 rounded-3xl border border-white/80 shadow-sm backdrop-blur-md">
              <div className="relative group">
                <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-sky-500 transition-colors" size={24} />
                <input
                  type="text"
                  placeholder="Ask Nexus... (e.g. 'find support tickets about billing')"
                  className="w-full pl-14 pr-6 py-5 rounded-2xl bg-white/80 border border-white outline-none focus:border-sky-300 focus:ring-4 focus:ring-sky-100/50 transition-all text-slate-800 text-lg font-medium placeholder:text-slate-400 shadow-sm backdrop-blur-sm"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              
              <div className="flex flex-wrap gap-4 items-center pl-2">
                <div className="flex items-center gap-3 bg-white/80 px-4 py-2.5 rounded-xl border border-white shadow-sm font-medium">
                  <label className="text-sm text-slate-600">Results Limit:</label>
                  <input
                    type="number"
                    min="1" max="100"
                    className="w-16 px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold outline-none focus:border-sky-400 text-center"
                    value={searchLimit}
                    onChange={(e) => setSearchLimit(e.target.value)}
                  />
                </div>
                
                <label className="flex items-center gap-3 cursor-pointer bg-white/80 px-5 py-3 rounded-xl border border-white shadow-sm hover:bg-white transition-colors">
                  <input
                    type="checkbox"
                    className="w-5 h-5 text-sky-500 rounded border-slate-300 focus:ring-sky-500"
                    checked={allEntries}
                    onChange={(e) => setAllEntries(e.target.checked)}
                  />
                  <span className="text-sm font-bold text-slate-700">Deep Search (Ignore Limits)</span>
                </label>
                
                <button
                  type="submit"
                  disabled={!searchQuery.trim() || isSearching}
                  className="ml-auto glass-button glass-button-hover px-8 py-3 rounded-xl text-sky-800 font-bold shadow-sm flex items-center gap-2 disabled:opacity-50 text-lg"
                >
                  {isSearching ? <Loader2 className="animate-spin" size={20} /> : <Search size={20} />}
                  Commence Search
                </button>
              </div>
            </form>

            {searchError && (
              <div className="p-5 bg-rose-50/90 border border-rose-200 rounded-2xl text-rose-700 font-medium backdrop-blur-md">
                {searchError}
              </div>
            )}

            {searchResults && searchResults.results && (
              <div className="mt-8 space-y-6">
                <h3 className="font-bold text-xl text-slate-800 flex items-center gap-2 pl-2">
                  <Sparkles className="text-sky-500 border" size={22} /> Found {searchResults.results.length} Nexus Records
                </h3>
                
                {searchResults.results.length === 0 ? (
                  <div className="text-center py-16 text-slate-500 font-medium bg-white/40 rounded-3xl border border-white shadow-sm">
                    No matching records found in the database.
                  </div>
                ) : (
                  <div className="grid gap-6">
                    {searchResults.results.map((result, index) => (
                      <div key={index} className="bg-white/70 backdrop-blur-md border border-white hover:border-sky-300 transition-all duration-300 rounded-3xl p-8 shadow-sm hover:shadow-[0_8px_30px_rgba(14,165,233,0.1)] group">
                        <div className="flex justify-between items-center mb-6">
                          <h4 className="font-bold text-slate-800 text-xl flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-sky-500"></span>
                            Record #{result.record_id}
                          </h4>
                          <span className="px-3 py-1 bg-gradient-to-r from-sky-100 to-sky-50 text-sky-700 rounded-full text-xs font-bold uppercase tracking-widest border border-sky-200">
                            Relevance: {(result.score || 0).toFixed(2)}
                          </span>
                        </div>
                        
                        <div className="bg-white/80 p-5 rounded-2xl border border-white shadow-sm mb-6">
                           <h5 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Summary</h5>
                           <p className="text-slate-700 font-medium text-lg leading-relaxed">
                            {result.analysis?.summary || result.summary || 'No summary'}
                           </p>
                        </div>
                        
                        {result.analysis?.tags && result.analysis.tags.length > 0 && (
                          <div className="flex flex-wrap gap-2 mb-6">
                            {result.analysis.tags.map((tag, idx) => (
                              <span key={idx} className="px-3 py-1 bg-slate-100/80 text-slate-600 border border-slate-200 rounded-lg text-xs font-bold shadow-sm">
                                #{tag}
                              </span>
                            ))}
                          </div>
                        )}
                        
                        <div className="max-h-[250px] overflow-y-auto pr-4 custom-scrollbar text-base bg-slate-50/50 inset-glass p-5 rounded-2xl">
                          {formatTranscript(result.transcript || result.refined_transcription)}
                        </div>
                        
                        <div className="pt-6 mt-6 border-t border-slate-200/50 flex justify-end">
                          <button
                            onClick={() => openJsonModal(result)}
                            className="glass-button glass-button-hover flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold text-slate-600 shadow-sm"
                          >
                            <Code size={18} className="text-sky-500" />
                            Developer View
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* AGENTS TAB */}
        {activeTab === 'agents' && (
          <div className="animate-fade-in space-y-8 max-w-2xl mx-auto">
            <div className="bg-white/60 p-10 rounded-[2rem] border border-white shadow-sm text-center mb-8 backdrop-blur-md">
              <div className="inline-flex p-4 rounded-3xl bg-sky-50 mb-4 shadow-inner border border-sky-100">
                 <UserCheck className="text-sky-500" size={36} />
              </div>
              <h3 className="text-3xl font-bold text-slate-800 mb-2">Agent Enrollment</h3>
              <p className="text-slate-500 font-medium text-lg">Provide a pristine voice sample to register a new agent archetype.</p>
            </div>

            <form onSubmit={handleEnroll} className="space-y-6">
              <div className="bg-white/60 p-8 rounded-3xl border border-white shadow-sm backdrop-blur-md space-y-6">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-wide">Agent Designation</label>
                  <input
                    type="text"
                    placeholder="e.g. Agent Smith"
                    className="w-full px-5 py-4 rounded-xl bg-white/90 border border-slate-200 outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100/50 transition-all text-slate-800 font-medium text-lg shadow-sm"
                    value={agentName}
                    onChange={(e) => setAgentName(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-wide">Vocal Matrix (.wav, .mp3)</label>
                  <div
                    className="border-2 border-dashed border-sky-200 bg-sky-50/30 rounded-2xl p-8 text-center cursor-pointer hover:border-sky-400 hover:bg-sky-50/60 transition-all group"
                    onClick={() => agentFileInputRef.current?.click()}
                  >
                    <input
                      type="file"
                      ref={agentFileInputRef}
                      onChange={handleAgentFileChange}
                      accept="audio/*,video/mpeg,audio/mpeg,video/mp4,audio/mp4,.mp3,.mpeg,.mpg,.m4a,.aac,.wav,.ogg"
                      className="hidden"
                    />
                    <FileAudio className="mx-auto text-sky-400 mb-3 group-hover:scale-110 transition-transform" size={40} />
                    {agentFile ? (
                      <div className="text-sky-800 font-bold text-lg">{agentFile.name}</div>
                    ) : (
                      <div className="text-sky-600 font-medium text-lg">Click to select audio sample</div>
                    )}
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={!agentName.trim() || !agentFile || isEnrolling}
                className="w-full glass-button glass-button-hover flex items-center justify-center gap-3 px-8 py-4 rounded-2xl text-sky-800 font-bold text-xl shadow-sm disabled:opacity-50 hover:shadow-[0_10px_30px_rgba(14,165,233,0.2)]"
              >
                {isEnrolling ? <Loader2 className="animate-spin" size={24} /> : <UserCheck size={24} />}
                {isEnrolling ? 'Enrolling Matrix...' : 'Initialize Agent'}
              </button>

              {enrollError && (
                <div className="p-5 bg-rose-50/90 border border-rose-200 rounded-2xl text-rose-700 font-medium flex gap-3 shadow-sm backdrop-blur-md">
                  <AlertCircle size={22} className="shrink-0" /> {enrollError}
                </div>
              )}

              {enrollResult && enrollResult.success && (
                <div className="p-5 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl text-emerald-800 flex gap-4 items-center shadow-sm backdrop-blur-md">
                  <CheckCircle2 size={32} className="text-emerald-500 shrink-0 drop-shadow-sm" />
                  <div>
                    <strong className="block font-bold text-lg mb-0.5">Agent Enrolled Successfully</strong>
                    <span className="font-medium text-emerald-700/80">Matrix analyzed {(enrollResult.duration_seconds || 0).toFixed(1)}s of audio.</span>
                  </div>
                </div>
              )}
            </form>
          </div>
        )}
      </div>

      {/* Modern Glass JSON Modal */}
      {isJsonModalOpen && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
          <div 
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-xl transition-opacity animate-fade-in" 
            onClick={closeJsonModal}
          ></div>
          
          <div className="relative bg-slate-900/80 rounded-[2rem] shadow-[0_20px_60px_rgba(0,0,0,0.4)] w-full max-w-4xl max-h-[85vh] flex flex-col border border-white/10 animate-fade-in z-10 overflow-hidden backdrop-blur-2xl">
            <div className="flex items-center justify-between p-6 border-b border-white/10 bg-white/5">
              <h3 className="font-bold text-white text-xl flex items-center gap-3 tracking-wide">
                <Code className="text-sky-400" size={24} /> 
                Developer Matrix Data
              </h3>
              <button 
                onClick={closeJsonModal}
                className="p-2.5 text-slate-400 hover:text-rose-400 hover:bg-white/10 rounded-full transition-colors"
              >
                <X size={24} />
              </button>
            </div>
            
            <div className="flex-1 overflow-auto custom-scrollbar bg-black/20 p-6">
              <pre className="text-sm text-sky-100/90 font-mono w-full min-w-max leading-relaxed">
                {jsonModalData ? JSON.stringify(jsonModalData, null, 2) : ''}
              </pre>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}