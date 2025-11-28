export interface AudioConfig {
  inputSampleRate: number;
  outputSampleRate: number;
  bufferSize: number;
}

export interface LiveConfig {
  voiceName: string;
  systemInstruction: string;
}

export enum ConnectionState {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  ERROR = 'error',
}

export interface VolumeLevel {
  input: number;
  output: number;
}

export interface LogEntry {
  timestamp: Date;
  role: 'user' | 'model' | 'system';
  message: string;
}
