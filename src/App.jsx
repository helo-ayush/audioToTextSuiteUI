import { useState } from 'react';
import IntentExtractor from './components/IntentExtractor';
import Diarization from './components/Diarization';
import LiveCaption from './components/LiveCaption';
import { Mic, Users, Radio, Sparkles } from 'lucide-react';

function App() {
  const [activeFeature, setActiveFeature] = useState('intent');

  return (
    <div className="min-h-screen text-slate-800 font-sans selection:bg-sky-200 selection:text-sky-900 pb-12 relative overflow-hidden">

      {/* Premium Ambient Background */}
      <div className="ambient-bg">
        <div className="ambient-orb orb-1"></div>
        <div className="ambient-orb orb-2"></div>
        <div className="ambient-orb orb-3"></div>
      </div>

      {/* Navigation */}
      <nav className="glass-nav sticky top-6 z-50 px-6 py-4 mx-4 sm:mx-8 lg:mx-auto max-w-5xl mb-12 mt-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 group cursor-default">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-sky-400 to-sky-600 text-white shadow-lg shadow-sky-200 group-hover:shadow-sky-300 transition-all duration-300 group-hover:scale-105">
              <Sparkles size={20} />
            </div>
            <h1 className="text-2xl font-bold text-gradient tracking-tight">
              Audio to Text Suite
            </h1>
          </div>

          <div className="flex p-1.5 rounded-full inset-glass">
            {[
              { id: 'intent', icon: Mic, label: 'Intent' },
              { id: 'diarization', icon: Users, label: 'Diarization' },
              { id: 'caption', icon: Radio, label: 'Live Caption' }
            ].map(feature => (
              <button
                key={feature.id}
                onClick={() => setActiveFeature(feature.id)}
                className={`flex items-center gap-2 py-2 px-5 rounded-full text-sm font-semibold transition-all duration-300 ${activeFeature === feature.id
                    ? 'tab-active'
                    : 'tab-inactive'
                  }`}
              >
                <feature.icon size={16} className={activeFeature === feature.id ? "animate-pulse" : ""} />
                <span className="hidden sm:inline">{feature.label}</span>
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 animate-fade-in">
        <div className="transition-all duration-500 ease-in-out">
          {activeFeature === 'intent' && <IntentExtractor />}
          {activeFeature === 'diarization' && <Diarization />}
          {activeFeature === 'caption' && <LiveCaption />}
        </div>
      </main>

    </div>
  );
}

export default App;
