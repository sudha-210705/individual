import React from 'react';

export default function DroneCanvas() {
  return (
    <div className="w-full h-full min-h-[300px] flex items-center justify-center relative select-none">
      {/* Background glowing circle */}
      <div className="absolute w-48 h-48 rounded-full bg-cyan-500/10 blur-2xl animate-pulse" />
      
      {/* SVG Drone drawing */}
      <svg 
        xmlns="http://www.w3.org/2000/svg" 
        viewBox="0 0 200 200" 
        className="w-44 h-44 drop-shadow-[0_0_15px_rgba(6,182,212,0.5)] animate-[bounce_3s_ease-in-out_infinite]"
      >
        {/* Core body */}
        <circle cx="100" cy="100" r="16" fill="#1e293b" stroke="#06b6d4" strokeWidth="3" />
        <circle cx="100" cy="100" r="6" fill="#ec4899" className="animate-ping" />
        
        {/* Rotors arms */}
        {/* Arm Top-Left */}
        <line x1="100" y1="100" x2="60" y2="60" stroke="#475569" strokeWidth="5" strokeLinecap="round" />
        {/* Arm Top-Right */}
        <line x1="100" y1="100" x2="140" y2="60" stroke="#475569" strokeWidth="5" strokeLinecap="round" />
        {/* Arm Bottom-Left */}
        <line x1="100" y1="100" x2="60" y2="140" stroke="#475569" strokeWidth="5" strokeLinecap="round" />
        {/* Arm Bottom-Right */}
        <line x1="100" y1="100" x2="140" y2="140" stroke="#475569" strokeWidth="5" strokeLinecap="round" />

        {/* Propeller Mounts and spinning rotors */}
        {/* Top-Left */}
        <circle cx="60" cy="60" r="8" fill="#0f172a" stroke="#a78bfa" strokeWidth="2" />
        <ellipse cx="60" cy="60" rx="20" ry="4" fill="none" stroke="#06b6d4" strokeWidth="1.5" className="origin-center animate-[spin_0.8s_linear_infinite]" />
        
        {/* Top-Right */}
        <circle cx="140" cy="60" r="8" fill="#0f172a" stroke="#a78bfa" strokeWidth="2" />
        <ellipse cx="140" cy="60" rx="20" ry="4" fill="none" stroke="#06b6d4" strokeWidth="1.5" className="origin-center animate-[spin_0.7s_linear_infinite]" />

        {/* Bottom-Left */}
        <circle cx="60" cy="140" r="8" fill="#0f172a" stroke="#a78bfa" strokeWidth="2" />
        <ellipse cx="60" cy="140" rx="20" ry="4" fill="none" stroke="#06b6d4" strokeWidth="1.5" className="origin-center animate-[spin_0.9s_linear_infinite]" />

        {/* Bottom-Right */}
        <circle cx="140" cy="140" r="8" fill="#0f172a" stroke="#a78bfa" strokeWidth="2" />
        <ellipse cx="140" cy="140" rx="20" ry="4" fill="none" stroke="#06b6d4" strokeWidth="1.5" className="origin-center animate-[spin_0.8s_linear_infinite]" />
        
        {/* Payload / Delivery box */}
        <rect x="88" y="116" width="24" height="20" rx="3" fill="#ec4899" stroke="#f472b6" strokeWidth="2" />
        <line x1="88" y1="126" x2="112" y2="126" stroke="#ffffff" strokeWidth="1.5" />
      </svg>
    </div>
  );
}
