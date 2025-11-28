import React, { useRef, useEffect } from 'react';
import { VolumeLevel } from '../types';

interface AudioVisualizerProps {
  volume: VolumeLevel;
  isConnected: boolean;
}

const AudioVisualizer: React.FC<AudioVisualizerProps> = ({ volume, isConnected }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    let time = 0;

    const render = () => {
      time += 0.05;
      const width = canvas.width;
      const height = canvas.height;
      const centerX = width / 2;
      const centerY = height / 2;

      ctx.clearRect(0, 0, width, height);

      // Base radius plus volume reaction
      // Use output volume primarily for the "Voice" feel, input for "Listening"
      const activeVolume = Math.max(volume.input, volume.output);
      const baseRadius = 60;
      const reactionScale = 150; 
      
      const currentRadius = baseRadius + (activeVolume * reactionScale);

      // Draw the central orb
      const gradient = ctx.createRadialGradient(centerX, centerY, baseRadius * 0.5, centerX, centerY, currentRadius);
      
      if (isConnected) {
        if (volume.output > 0.01) {
             // Speaking (Gemini) - Cyan/Blue
            gradient.addColorStop(0, 'rgba(56, 189, 248, 0.9)'); // Sky 400
            gradient.addColorStop(0.6, 'rgba(56, 189, 248, 0.4)');
            gradient.addColorStop(1, 'rgba(56, 189, 248, 0)');
        } else if (volume.input > 0.01) {
            // Listening (User) - Purple/Pink
            gradient.addColorStop(0, 'rgba(232, 121, 249, 0.9)'); // Fuscia 400
            gradient.addColorStop(0.6, 'rgba(232, 121, 249, 0.4)');
            gradient.addColorStop(1, 'rgba(232, 121, 249, 0)');
        } else {
             // Idle connected - Dim Blue
            gradient.addColorStop(0, 'rgba(148, 163, 184, 0.3)'); 
            gradient.addColorStop(1, 'rgba(148, 163, 184, 0)');
        }
      } else {
         // Disconnected - Dark Gray
         gradient.addColorStop(0, 'rgba(71, 85, 105, 0.2)');
         gradient.addColorStop(1, 'rgba(71, 85, 105, 0)');
      }

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(centerX, centerY, currentRadius, 0, Math.PI * 2);
      ctx.fill();

      // Draw orbiting particles if connected
      if (isConnected) {
        const numParticles = 8;
        for (let i = 0; i < numParticles; i++) {
          const angle = (i / numParticles) * Math.PI * 2 + time;
          const orbitRadius = currentRadius + 20 + Math.sin(time * 2 + i) * 10;
          const px = centerX + Math.cos(angle) * orbitRadius;
          const py = centerY + Math.sin(angle) * orbitRadius;
          
          ctx.beginPath();
          ctx.fillStyle = volume.output > 0.01 ? '#38bdf8' : '#e879f9';
          ctx.arc(px, py, 3, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      animationId = requestAnimationFrame(render);
    };

    render();

    return () => cancelAnimationFrame(animationId);
  }, [volume, isConnected]);

  return (
    <div className="relative w-full h-80 flex items-center justify-center bg-slate-900 rounded-3xl overflow-hidden shadow-inner shadow-slate-800 border border-slate-800">
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5"></div>
      <canvas 
        ref={canvasRef} 
        width={600} 
        height={400} 
        className="z-10 w-full h-full object-contain"
      />
      {!isConnected && (
         <div className="absolute z-20 text-slate-500 font-display text-lg tracking-widest uppercase">
            Start Session
         </div>
      )}
    </div>
  );
};

export default AudioVisualizer;
