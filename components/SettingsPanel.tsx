import React, { useState } from 'react';
import { FileText, Upload, Loader2, CheckCircle, File, Type } from 'lucide-react';
import { LiveConfig } from '../types.ts';

interface SettingsPanelProps {
  config: LiveConfig;
  setConfig: React.Dispatch<React.SetStateAction<LiveConfig>>;
  disabled: boolean;
}

const VOICES = ['Puck', 'Charon', 'Kore', 'Fenrir', 'Zephyr'];

const SettingsPanel: React.FC<SettingsPanelProps> = ({ config, setConfig, disabled }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setFileName(file.name);

    try {
      if (file.type === 'application/pdf') {
        // Dynamic import to prevent app crash on initial load
        const pdfjs = await import('pdfjs-dist');
        
        // Configure worker
        if (!pdfjs.GlobalWorkerOptions.workerSrc) {
            pdfjs.GlobalWorkerOptions.workerSrc = `https://esm.sh/pdfjs-dist@4.2.67/build/pdf.worker.min.mjs`;
        }

        const arrayBuffer = await file.arrayBuffer();
        const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
        const pdf = await loadingTask.promise;
        
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
          systemInstruction: prev.systemInstruction + `\n\n=== Knowledge Base (PDF): ${file.name} ===\n${fullText}`
        }));

      } else {
        // Fallback for text files
        const reader = new FileReader();
        reader.onload = (event) => {
          const text = event.target?.result as string;
          if (text) {
            setConfig(prev => ({
              ...prev,
              systemInstruction: prev.systemInstruction + `\n\n=== Knowledge Base (File): ${file.name} ===\n${text}`
            }));
          }
        };
        reader.readAsText(file);
      }
    } catch (error) {
      console.error("Error reading file:", error);
      alert("Failed to parse file. Please ensure it is a valid PDF or text file.");
      setFileName(null);
    } finally {
      setIsProcessing(false);
      e.target.value = '';
    }
  };

  return (
    <div className="p-6 space-y-8">
      {/* File Upload Section */}
      <section>
        <label className="flex items-center gap-2 text-sm font-medium text-slate-300 mb-3 uppercase tracking-wider">
           <File size={16} className="text-indigo-400" />
           Document Source
        </label>
        
        <div className={`
            relative group rounded-xl border-2 border-dashed transition-all duration-200
            ${fileName 
                ? 'border-indigo-500/50 bg-indigo-500/5' 
                : 'border-slate-700 hover:border-indigo-400/50 hover:bg-slate-800/50'}
            ${disabled || isProcessing ? 'opacity-50 cursor-not-allowed' : ''}
        `}>
          <input 
            type="file" 
            accept=".txt,.md,.json,.csv,.pdf"
            onChange={handleFileUpload}
            disabled={disabled || isProcessing}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
          />
          
          <div className="p-6 flex flex-col items-center justify-center text-center gap-3">
            {isProcessing ? (
               <Loader2 size={32} className="text-indigo-400 animate-spin" />
            ) : fileName ? (
               <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <CheckCircle size={24} />
               </div>
            ) : (
               <div className="w-12 h-12 rounded-full bg-slate-800 text-slate-400 group-hover:bg-slate-700 group-hover:text-indigo-400 transition-colors flex items-center justify-center">
                  <Upload size={20} />
               </div>
            )}
            
            <div>
              <p className="font-medium text-slate-200">
                {isProcessing ? "Processing Document..." : fileName || "Drop PDF or Text file here"}
              </p>
              {!fileName && !isProcessing && (
                <p className="text-xs text-slate-500 mt-1">
                  Supports PDF, TXT, MD, JSON
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* System Instruction Editor */}
      <section>
        <label className="flex items-center gap-2 text-sm font-medium text-slate-300 mb-3 uppercase tracking-wider">
           <Type size={16} className="text-indigo-400" />
           System Context
        </label>
        <div className="relative">
          <textarea
            value={config.systemInstruction}
            onChange={(e) => setConfig({ ...config, systemInstruction: e.target.value })}
            disabled={disabled}
            placeholder="Enter system instructions or upload a file above..."
            className="w-full h-64 bg-slate-950/50 border border-slate-700 rounded-xl p-4 text-sm text-slate-300 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all outline-none resize-none font-mono leading-relaxed custom-scrollbar"
          />
          <div className="absolute bottom-3 right-3 text-xs font-mono text-slate-600 bg-slate-900/80 px-2 py-1 rounded">
            {config.systemInstruction.length} chars
          </div>
        </div>
      </section>

      {/* Voice Selection */}
      <section>
        <label className="block text-sm font-medium text-slate-300 mb-3 uppercase tracking-wider">
            Voice Persona
        </label>
        <div className="grid grid-cols-2 gap-2">
          {VOICES.map(voice => (
            <button
              key={voice}
              onClick={() => setConfig({ ...config, voiceName: voice })}
              disabled={disabled}
              className={`
                px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 border
                ${config.voiceName === voice
                  ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-500/20'
                  : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-750 hover:border-slate-600'
                } 
                ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
              `}
            >
              {voice}
            </button>
          ))}
        </div>
      </section>
    </div>
  );
};

export default SettingsPanel;