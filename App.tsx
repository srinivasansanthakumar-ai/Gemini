import React, { useState } from 'react';
import { Mic, MicOff, AlertCircle, FileCheck } from 'lucide-react';
import { useLiveApi } from './hooks/use-live-api';
import AudioVisualizer from './components/AudioVisualizer';
import SettingsPanel from './components/SettingsPanel';
import { LiveConfig, ConnectionState } from './types';

const App: React.FC = () => {
  const [config, setConfig] = useState<LiveConfig>({
    voiceName: 'Kore',
    systemInstruction: 'You are a helpful and knowledgeable AI assistant. Keep responses concise and conversational.',
  });

  const { connect, disconnect, connectionState, volume, error } = useLiveApi(config);
  
  // Detect if system instruction has been modified (simple check for knowledge base)
  const hasContext = config.systemInstruction.length > 200; // Arbitrary threshold for default vs customized

  const toggleConnection = () => {
    if (connectionState === ConnectionState.CONNECTED) {
      disconnect();
    } else {
      connect();
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 md:p-8 relative overflow-hidden">
      {/* Background Ambience */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-indigo-600/20 rounded-full blur-[128px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-purple-600/20 rounded-full blur-[128px] pointer-events-none" />

      {/* Main Card */}
      <div className="w-full max-w-4xl bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-3xl shadow-2xl p-6 md:p-10 relative z-10 flex flex-col items-center">
        
        {/* Header */}
        <div className="text-center mb-8 relative">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800 border border-slate-700 text-xs font-medium text-slate-400 mb-4">
            <span className={`w-2 h-2 rounded-full ${connectionState === ConnectionState.CONNECTED ? 'bg-emerald-500 animate-pulse' : 'bg-slate-500'}`} />
            Gemini 2.5 Live API
          </div>
          
          <h1 className="text-4xl md:text-5xl font-display font-bold text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400 mb-2">
            Conversational Voice
          </h1>
          <p className="text-slate-400 max-w-lg mx-auto">
            Experience real-time, low-latency voice interactions with grounded context from your documents.
          </p>
          
          {hasContext && (
            <div className="absolute -right-4 top-0 hidden md:flex flex-col items-center animate-fade-in">
                <div className="bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-2 shadow-sm">
                   <FileCheck size={14} />
                   <span>Knowledge Base Active</span>
                </div>
            </div>
          )}
        </div>

        {/* Visualizer Container */}
        <div className="w-full mb-10">
          <AudioVisualizer volume={volume} isConnected={connectionState === ConnectionState.CONNECTED} />
        </div>

        {/* Controls */}
        <div className="flex flex-col items-center gap-6 w-full max-w-md">
          {error && (
            <div className="w-full p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-3 text-red-400 text-sm animate-shake">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          <button
            onClick={toggleConnection}
            disabled={connectionState === ConnectionState.CONNECTING}
            className={`
              relative group flex items-center justify-center gap-3 w-full py-4 rounded-2xl font-semibold text-lg transition-all duration-300
              ${connectionState === ConnectionState.CONNECTED 
                ? 'bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20' 
                : 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 hover:bg-indigo-500 hover:shadow-indigo-500/40 hover:-translate-y-0.5'
              }
              ${connectionState === ConnectionState.CONNECTING ? 'opacity-75 cursor-wait' : ''}
            `}
          >
            {connectionState === ConnectionState.CONNECTING ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Connecting...
              </span>
            ) : connectionState === ConnectionState.CONNECTED ? (
              <>
                <MicOff size={24} />
                End Conversation
              </>
            ) : (
              <>
                <Mic size={24} />
                Start Conversation
              </>
            )}
          </button>

          <div className="flex items-center gap-2 text-xs text-slate-500 font-mono">
             <span>STATUS:</span>
             <span className={`
               uppercase
               ${connectionState === ConnectionState.CONNECTED ? 'text-emerald-400' : ''}
               ${connectionState === ConnectionState.ERROR ? 'text-red-400' : ''}
               ${connectionState === ConnectionState.DISCONNECTED ? 'text-slate-400' : ''}
             `}>
               {connectionState}
             </span>
          </div>
        </div>

        {/* Settings Button (Positioned Absolute) */}
        <SettingsPanel 
          config={config} 
          setConfig={setConfig} 
          disabled={connectionState === ConnectionState.CONNECTED} 
        />
      </div>
    </div>
  );
};

export default App;