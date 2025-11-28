import React, { useState, useEffect } from 'react';
import { Settings, FileText, Upload, Info, Loader2 } from 'lucide-react';
import { LiveConfig } from '../types';
import * as pdfjsLib from 'pdfjs-dist';

// Initialize PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://esm.sh/pdfjs-dist@4.2.67/build/pdf.worker.min.mjs`;

interface SettingsPanelProps {
  config: LiveConfig;
  setConfig: React.Dispatch<React.SetStateAction<LiveConfig>>;
  disabled: boolean;
}

const VOICES = ['Puck', 'Charon', 'Kore', 'Fenrir', 'Zephyr'];

const SettingsPanel: React.FC<SettingsPanelProps> = ({ config, setConfig, disabled }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);

    try {
      if (file.type === 'application/pdf') {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        let fullText = '';
        
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          const pageText = textContent.items
            .map((item: any) => item.str)
            .join(' ');
          fullText += `\n--- PDF Page ${i} ---\n${pageText}`;
        }

        setConfig(prev => ({
          ...prev,
          systemInstruction: prev.systemInstruction + "\n\n=== PDF Knowledge Base (" + file.name + ") ===\n" + fullText
        }));

      } else {
        // Fallback for text files
        const reader = new FileReader();
        reader.onload = (event) => {
          const text = event.target?.result as string;
          if (text) {
            setConfig(prev => ({
              ...prev,
              systemInstruction: prev.systemInstruction + "\n\n=== Knowledge Base (" + file.name + ") ===\n" + text
            }));
          }
        };
        reader.readAsText(file);
      }
    } catch (error) {
      console.error("Error reading file:", error);
      alert("Failed to read file. Please ensure it is a valid text or PDF file.");
    } finally {
      setIsProcessing(false);
      // Reset input
      e.target.value = '';
    }
  };

  if (!isOpen) {
    return (
      <button 
        onClick={() => setIsOpen(true)}
        className="absolute top-6 right-6 p-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-full transition-all shadow-lg border border-slate-700"
        title="Settings"
      >
        <Settings size={20} />
      </button>
    );
  }

  return (
    <div className="absolute top-0 right-0 h-full w-full md:w-96 bg-slate-900/95 backdrop-blur-md border-l border-slate-700 p-6 shadow-2xl z-50 overflow-y-auto transition-transform">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-xl font-display font-bold text-white flex items-center gap-2">
          <Settings size={20} className="text-indigo-400" />
          Configuration
        </h2>
        <button 
          onClick={() => setIsOpen(false)}
          className="text-slate-400 hover:text-white p-2"
        >
          ✕
        </button>
      </div>

      {/* Voice Selection */}
      <div className="mb-8">
        <label className="block text-sm font-medium text-slate-400 mb-3 uppercase tracking-wider">Voice Persona</label>
        <div className="grid grid-cols-2 gap-3">
          {VOICES.map(voice => (
            <button
              key={voice}
              onClick={() => setConfig({ ...config, voiceName: voice })}
              disabled={disabled}
              className={`p-3 rounded-xl border text-sm font-semibold transition-all ${
                config.voiceName === voice
                  ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-500/20'
                  : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-750 hover:border-slate-600'
              } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {voice}
            </button>
          ))}
        </div>
      </div>

      {/* Knowledge Base */}
      <div className="mb-8">
        <label className="block text-sm font-medium text-slate-400 mb-3 uppercase tracking-wider flex justify-between items-center">
          <span>Knowledge Base</span>
          <div className="relative group">
             <Info size={14} className="text-slate-500 cursor-help"/>
             <div className="absolute right-0 w-48 p-2 bg-slate-800 text-xs text-slate-300 rounded shadow-xl hidden group-hover:block border border-slate-700 -mt-8 mr-6">
                Uploaded content is appended to the System Instruction.
             </div>
          </div>
        </label>
        
        <div className="bg-slate-800 rounded-xl p-4 border border-slate-700 mb-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-indigo-500/10 rounded-lg">
               <FileText size={20} className="text-indigo-400" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-white">Drive Context / PDF</h3>
              <p className="text-xs text-slate-400">Upload PDF or text to ground the model.</p>
            </div>
          </div>
          <div className="relative">
             <input 
               type="file" 
               accept=".txt,.md,.json,.csv,.pdf"
               onChange={handleFileUpload}
               disabled={disabled || isProcessing}
               className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
             />
             <button 
                disabled={disabled || isProcessing} 
                className={`w-full py-2 border-2 border-dashed border-slate-600 rounded-lg flex items-center justify-center gap-2 text-sm text-slate-400 hover:text-indigo-400 hover:border-indigo-400 transition-colors ${disabled || isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
             >
               {isProcessing ? (
                 <>
                   <Loader2 size={16} className="animate-spin" />
                   <span>Processing...</span>
                 </>
               ) : (
                 <>
                   <Upload size={16} />
                   <span>Load PDF or Text</span>
                 </>
               )}
             </button>
          </div>
        </div>

        <textarea
          value={config.systemInstruction}
          onChange={(e) => setConfig({ ...config, systemInstruction: e.target.value })}
          disabled={disabled}
          placeholder="Enter system instructions or paste your knowledge base text here..."
          className="w-full h-64 bg-slate-800 border border-slate-700 rounded-xl p-4 text-sm text-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none resize-none font-mono leading-relaxed"
        />
      </div>

      <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl text-xs text-yellow-200/80 leading-relaxed">
        <strong>Note:</strong> Changes to configuration require a new session connection to take effect.
      </div>
    </div>
  );
};

export default SettingsPanel;