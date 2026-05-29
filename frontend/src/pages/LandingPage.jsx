import React from 'react';
import DroneCanvas from '../components/ui/DroneCanvas';
import { Zap, ChevronRight, Navigation, Cpu, Heart } from 'lucide-react';

export default function LandingPage({ onEnterAuth }) {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between">
      
      {/* Header */}
      <header className="max-w-6xl mx-auto w-full px-6 h-16 flex items-center justify-between z-10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-cyan-500 rounded flex items-center justify-center font-bold text-slate-950">
            Æ
          </div>
          <span className="font-bold text-white tracking-widest text-sm">AETHER NETWORK</span>
        </div>
        <button
          onClick={onEnterAuth}
          className="px-4 py-1.5 rounded border border-cyan-500/40 text-xs font-bold text-cyan-400 hover:bg-cyan-500/10 transition-colors"
          style={{ boxShadow: '0 0 10px rgba(6, 182, 212, 0.15)' }}
        >
          Connect Identity
        </button>
      </header>

      {/* Hero */}
      <main className="max-w-6xl mx-auto w-full px-6 py-12 grid grid-cols-1 md:grid-cols-2 gap-12 items-center flex-1">
        
        {/* Left Copy */}
        <div className="flex flex-col gap-6 text-left">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 font-bold text-[10px] uppercase rounded w-fit">
            <Zap className="w-3.5 h-3.5" /> SYSTEM GRID V1.0 ONLINE
          </div>
          
          <h2 className="text-4xl md:text-5xl font-black text-white leading-tight">
            AI-POWERED <br/>
            <span className="text-cyan-400 drop-shadow-[0_0_10px_rgba(6,182,212,0.3)]">
              HYPERLOCAL DISPATCH
            </span>
          </h2>
          
          <p className="text-slate-400 text-sm leading-relaxed max-w-md">
            Place multi-stop delivery dispatches, track online courier nodes in real-time, and control dynamic surge pricing multipliers during bad weather.
          </p>

          <div className="flex gap-4 mt-2">
            <button
              onClick={onEnterAuth}
              className="px-5 py-2.5 rounded bg-cyan-500 text-slate-950 font-bold text-xs uppercase hover:opacity-85 flex items-center gap-1 transition-opacity"
            >
              Launch Console <ChevronRight className="w-4 h-4" />
            </button>
            <a
              href="#specs"
              className="px-5 py-2.5 rounded border border-slate-700 hover:bg-slate-800 text-slate-300 text-xs font-bold transition-colors"
            >
              Read Specs
            </a>
          </div>
        </div>

        {/* Right Animated SVG Drone */}
        <div 
          className="h-[300px] border border-slate-800 rounded-xl bg-slate-900/40 relative flex items-center justify-center overflow-hidden"
          style={{ boxShadow: '0 0 15px rgba(6, 182, 212, 0.08)' }}
        >
          <DroneCanvas />
        </div>

      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 py-6 text-center text-slate-600 text-[10px] uppercase tracking-wider">
        © 2026 AETHER LOGISTICS PLATFORM. ALL DECK NODES ONLINE.
      </footer>

    </div>
  );
}
