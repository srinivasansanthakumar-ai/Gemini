import React, { useState } from 'react';
import { Mic, MicOff, AlertCircle, Zap, Layout, Github } from 'lucide-react';
import { useLiveApi } from './hooks/use-live-api.ts';
import AudioVisualizer from './components/AudioVisualizer.tsx';
import SettingsPanel from './components/SettingsPanel.tsx';
import { LiveConfig, ConnectionState } from './types.ts';

const App: React.FC = () => {
  const [config, setConfig] = useState<LiveConfig>({
    voiceName: 'Kore',
    systemInstruction: 'You are a helpful and knowledgeable AI assistant. Keep responses concise and conversational.',
  });

  const { connect, disconnect, connectionState, volume, error } = useLiveApi(config);
  
  const toggleConnection = () => {
    if (connectionState === ConnectionState.CONNECTED) {
      disconnect();
    } else {
      connect();
    }
  };

  return (
    <div className="flex flex-col md:flex-row h-screen bg-slate-950 text-slate-200 overflow-hidden font-sans selection:bg-indigo-500/30">
      {/* LEFT PANEL: Main Interaction Area */}
      <main className="flex-1 flex flex-col relative overflow-hidden">
        {/* Ambient Background */}
        <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none" />
        
        {/* Header */}
        <header className="flex items-center justify-between p-6 md:p-8 z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-tr from-indigo-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Zap className="text-white" size={20} fill="currentColor" />
            </div>
            <div>
              <h1 className="text-xl font-display font-bold text-white tracking-tight">Gemini Live</h1>
              <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
                <span className={`w-2 h-2 rounded-full ${connectionState === ConnectionState.CONNECTED ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'}`} />
                {connectionState === ConnectionState.CONNECTED ? 'ONLINE' : 'OFFLINE'}
              </div>
            </div>
          </div>
          
          <a href="#" className="p-2 hover:bg-slate-800 rounded-full transition-colors text-slate-500 hover:text-white">
            <Github size={20} />
          </a>
        </header>

        {/* Visualizer & Status */}
        <div className="flex-1 flex flex-col items-center justify-center p-4 relative z-10">
          <div className="w-full max-w-2xl aspect-video relative flex items-center justify-center">
             <AudioVisualizer volume={volume} isConnected={connectionState === ConnectionState.CONNECTED} />
          </div>
          
          {error && (
            <div className="mt-6 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-400 text-sm max-w-md animate-in slide-in-from-bottom-2">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Bottom Controls */}
        <div className="p-6 md:p-10 flex justify-center z-10 bg-gradient-to-t from-slate-950 to-transparent">
          <button
            onClick={toggleConnection}
            disabled={connectionState === ConnectionState.CONNECTING}
            className={`
              relative group flex items-center justify-center gap-4 px-12 py-4 rounded-full font-semibold text-lg transition-all duration-300 shadow-xl
              ${connectionState === ConnectionState.CONNECTED 
                ? 'bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 ring-1 ring-red-500/30' 
                : 'bg-white text-slate-950 hover:bg-slate-200 hover:scale-105 ring-4 ring-slate-800'
              }
              ${connectionState === ConnectionState.CONNECTING ? 'opacity-80 cursor-wait' : ''}
            `}
          >
            {connectionState === ConnectionState.CONNECTING ? (
               <span className="w-5 h-5 border-2 border-slate-900/30 border-t-slate-900 rounded-full animate-spin" />
            ) : connectionState === ConnectionState.CONNECTED ? (
               <MicOff size={24} />
            ) : (
               <Mic size={24} />
            )}
            <span>
              {connectionState === ConnectionState.CONNECTING ? 'Connecting...' : 
               connectionState === ConnectionState.CONNECTED ? 'End Session' : 'Start Conversation'}
            </span>
          </button>
        </div>
      </main>

      {/* RIGHT PANEL: Sidebar / Knowledge Base */}
      <aside className="w-full md:w-[400px] lg:w-[450px] bg-slate-900 border-l border-slate-800 flex flex-col h-[50vh] md:h-screen relative z-20">
        <div className="p-6 border-b border-slate-800 flex items-center gap-2">
          <Layout size={18} className="text-indigo-400" />
          <h2 className="font-display font-semibold text-white">Knowledge Base</h2>
        </div>
        
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <SettingsPanel 
            config={config} 
            setConfig={setConfig} 
            disabled={connectionState === ConnectionState.CONNECTED} 
          />
        </div>

        {/* Footer Info */}
        <div className="p-6 border-t border-slate-800 bg-slate-900/50 text-xs text-slate-500 leading-relaxed">
          <p>
            Upload documents to ground the AI's responses. The content is added to the system context for real-time reference.
          </p>
        </div>
      </aside>
    </div>
  );
};

export default App;