import { useState, useRef, useCallback, useEffect } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { createAudioContentBlob, decodeAudioData, decodeBase64ToUint8Array } from '../utils/audio-utils';
import { ConnectionState, LiveConfig, VolumeLevel } from '../types';

// Robustly get API Key from process.env or window.process.env
const API_KEY = (process.env.API_KEY as string) || ((window as any).process?.env?.API_KEY as string) || '';
const MODEL_NAME = 'gemini-2.5-flash-native-audio-preview-09-2025';

export const useLiveApi = (config: LiveConfig) => {
  const [connectionState, setConnectionState] = useState<ConnectionState>(ConnectionState.DISCONNECTED);
  const [volume, setVolume] = useState<VolumeLevel>({ input: 0, output: 0 });
  const [error, setError] = useState<string | null>(null);

  // Audio Contexts and Nodes
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const inputSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const outputNodeRef = useRef<GainNode | null>(null);
  
  // State for gapless playback
  const nextStartTimeRef = useRef<number>(0);
  const scheduledSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  
  // API Client
  const sessionPromiseRef = useRef<Promise<any> | null>(null);
  const currentSessionRef = useRef<any>(null); // To track active session for cleanup

  // Analysis for visualizer
  const inputAnalyserRef = useRef<AnalyserNode | null>(null);
  const outputAnalyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const updateVolume = () => {
    if (inputAnalyserRef.current && outputAnalyserRef.current) {
      const inputBuffer = new Uint8Array(inputAnalyserRef.current.frequencyBinCount);
      const outputBuffer = new Uint8Array(outputAnalyserRef.current.frequencyBinCount);
      
      inputAnalyserRef.current.getByteFrequencyData(inputBuffer);
      outputAnalyserRef.current.getByteFrequencyData(outputBuffer);

      const inputAvg = inputBuffer.reduce((a, b) => a + b, 0) / inputBuffer.length;
      const outputAvg = outputBuffer.reduce((a, b) => a + b, 0) / outputBuffer.length;

      setVolume({
        input: inputAvg / 255,
        output: outputAvg / 255
      });
    }
    animationFrameRef.current = requestAnimationFrame(updateVolume);
  };

  const connect = useCallback(async () => {
    if (!API_KEY) {
      setError("API Key not found in environment.");
      return;
    }

    try {
      setConnectionState(ConnectionState.CONNECTING);
      setError(null);

      // 1. Setup Audio Contexts
      const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      const outputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      
      // Analysers
      const inputAnalyser = inputCtx.createAnalyser();
      const outputAnalyser = outputCtx.createAnalyser();
      inputAnalyser.fftSize = 256;
      outputAnalyser.fftSize = 256;
      
      inputAudioContextRef.current = inputCtx;
      outputAudioContextRef.current = outputCtx;
      inputAnalyserRef.current = inputAnalyser;
      outputAnalyserRef.current = outputAnalyser;

      // Start volume monitoring
      updateVolume();

      // 2. Setup Microphone
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const source = inputCtx.createMediaStreamSource(stream);
      const processor = inputCtx.createScriptProcessor(4096, 1, 1);
      
      inputSourceRef.current = source;
      processorRef.current = processor;

      // Connect graph: Mic -> Analyser -> Processor -> Destination
      source.connect(inputAnalyser);
      inputAnalyser.connect(processor);
      processor.connect(inputCtx.destination); // ScriptProcessor needs a destination to fire events

      // Output Graph
      const outputGain = outputCtx.createGain();
      outputNodeRef.current = outputGain;
      outputGain.connect(outputAnalyser);
      outputAnalyser.connect(outputCtx.destination);

      // 3. Initialize Gemini Client
      const ai = new GoogleGenAI({ apiKey: API_KEY });
      
      // Define callbacks
      const callbacks = {
        onopen: () => {
          console.log('Gemini Live API Connected');
          setConnectionState(ConnectionState.CONNECTED);
        },
        onmessage: async (message: LiveServerMessage) => {
           // Handle Audio Output
           const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
           if (base64Audio && outputAudioContextRef.current && outputNodeRef.current) {
             const ctx = outputAudioContextRef.current;
             const audioData = decodeBase64ToUint8Array(base64Audio);
             
             // Setup Gapless Playback
             nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
             
             const audioBuffer = await decodeAudioData(audioData, ctx, 24000, 1);
             const bufferSource = ctx.createBufferSource();
             bufferSource.buffer = audioBuffer;
             bufferSource.connect(outputNodeRef.current);
             
             bufferSource.addEventListener('ended', () => {
                scheduledSourcesRef.current.delete(bufferSource);
             });

             bufferSource.start(nextStartTimeRef.current);
             scheduledSourcesRef.current.add(bufferSource);
             nextStartTimeRef.current += audioBuffer.duration;
           }

           // Handle Interruptions
           if (message.serverContent?.interrupted) {
             console.log('Model interrupted');
             scheduledSourcesRef.current.forEach(src => {
               try { src.stop(); } catch(e) {}
             });
             scheduledSourcesRef.current.clear();
             nextStartTimeRef.current = 0;
           }
        },
        onclose: () => {
          console.log('Gemini Live API Closed');
          setConnectionState(ConnectionState.DISCONNECTED);
        },
        onerror: (err: any) => {
          console.error('Gemini Live API Error', err);
          setConnectionState(ConnectionState.ERROR);
          setError(err.message || "Unknown WebSocket error");
        }
      };

      // 4. Connect
      const sessionPromise = ai.live.connect({
        model: MODEL_NAME,
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: config.voiceName || 'Kore' } }
          },
          systemInstruction: config.systemInstruction || 'You are a helpful assistant.',
        },
        callbacks
      });

      sessionPromiseRef.current = sessionPromise;
      
      // Handle Audio Input Streaming
      processor.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);
        const pcmBlob = createAudioContentBlob(inputData, 16000);
        
        sessionPromise.then(session => {
          currentSessionRef.current = session;
          session.sendRealtimeInput({ media: pcmBlob });
        }).catch(err => {
            console.error("Session send error", err);
        });
      };

    } catch (err: any) {
      console.error("Connection failed", err);
      setError(err.message || "Failed to initialize connection");
      setConnectionState(ConnectionState.ERROR);
      disconnect();
    }
  }, [config.voiceName, config.systemInstruction]);

  const disconnect = useCallback(() => {
    // 1. Stop Audio Contexts
    if (inputAudioContextRef.current) {
      inputAudioContextRef.current.close();
      inputAudioContextRef.current = null;
    }
    if (outputAudioContextRef.current) {
      outputAudioContextRef.current.close();
      outputAudioContextRef.current = null;
    }

    // 2. Stop Sources & Animation
    if (inputSourceRef.current) {
        inputSourceRef.current.disconnect();
        inputSourceRef.current = null;
    }
    if (processorRef.current) {
        processorRef.current.disconnect();
        processorRef.current = null;
    }
    if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
    }
    
    // 3. Close Session
    if (currentSessionRef.current) {
        // Unfortunately the SDK doesn't expose a clean .close() on the session object easily in all versions, 
        // but the WebSocket close is handled if we drop the reference or if the SDK provides it. 
        // Based on docs: "When the conversation is finished, use `session.close()`"
        try {
            currentSessionRef.current.close();
        } catch(e) {
            console.warn("Could not close session explicitly", e);
        }
    }
    
    sessionPromiseRef.current = null;
    currentSessionRef.current = null;
    scheduledSourcesRef.current.clear();
    nextStartTimeRef.current = 0;

    setConnectionState(ConnectionState.DISCONNECTED);
    setVolume({ input: 0, output: 0 });
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    connect,
    disconnect,
    connectionState,
    volume,
    error
  };
};