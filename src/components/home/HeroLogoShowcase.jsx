import { Mic, Headphones, Volume2, Radio } from "lucide-react";

export default function HeroLogoShowcase() {
  return (
    <div className="relative w-full max-w-md mx-auto">
      <style>{`
        @keyframes freq1 { 0%,100%{height:12px} 50%{height:36px} }
        @keyframes freq2 { 0%,100%{height:20px} 50%{height:48px} }
        @keyframes freq3 { 0%,100%{height:8px} 50%{height:32px} }
        @keyframes freq4 { 0%,100%{height:16px} 50%{height:40px} }
        @keyframes freq5 { 0%,100%{height:10px} 50%{height:28px} }
        @keyframes pulse-ring { 0%{transform:scale(1);opacity:0.4} 100%{transform:scale(1.6);opacity:0} }
        @keyframes orbit { 0%{transform:rotate(0deg) translateX(120px) rotate(0deg)} 100%{transform:rotate(360deg) translateX(120px) rotate(-360deg)} }
        .freq-bar-1 { animation: freq1 1.2s ease-in-out infinite; }
        .freq-bar-2 { animation: freq2 0.9s ease-in-out infinite; }
        .freq-bar-3 { animation: freq3 1.4s ease-in-out infinite; }
        .freq-bar-4 { animation: freq4 1.1s ease-in-out infinite; }
        .freq-bar-5 { animation: freq5 1.3s ease-in-out infinite; }
        .pulse-ring-1 { animation: pulse-ring 2s ease-out infinite; }
        .pulse-ring-2 { animation: pulse-ring 2s ease-out infinite 0.6s; }
        .pulse-ring-3 { animation: pulse-ring 2s ease-out infinite 1.2s; }
        .orbit-icon { animation: orbit 8s linear infinite; }
        .orbit-icon-2 { animation: orbit 12s linear infinite reverse; }
        .orbit-icon-3 { animation: orbit 10s linear infinite; animation-delay: -3s; }
      `}</style>

      {/* Pulse rings */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-64 h-64 rounded-full border border-cyan-500/20 pulse-ring-1" />
      </div>
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-64 h-64 rounded-full border border-purple-500/15 pulse-ring-2" />
      </div>
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-64 h-64 rounded-full border border-cyan-400/10 pulse-ring-3" />
      </div>

      {/* Orbiting icons */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="orbit-icon">
          <div className="w-10 h-10 rounded-full bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center backdrop-blur-sm">
            <Mic className="w-4 h-4 text-cyan-400" />
          </div>
        </div>
      </div>
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="orbit-icon-2">
          <div className="w-10 h-10 rounded-full bg-purple-500/20 border border-purple-500/30 flex items-center justify-center backdrop-blur-sm">
            <Headphones className="w-4 h-4 text-purple-400" />
          </div>
        </div>
      </div>
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="orbit-icon-3">
          <div className="w-10 h-10 rounded-full bg-blue-500/20 border border-blue-500/30 flex items-center justify-center backdrop-blur-sm">
            <Radio className="w-4 h-4 text-blue-400" />
          </div>
        </div>
      </div>

      {/* Center logo */}
      <div className="relative flex flex-col items-center py-16">
        <div className="relative mb-6">
          <div className="absolute -inset-6 bg-gradient-to-r from-cyan-500/20 to-purple-500/20 rounded-3xl blur-2xl" />
          <div className="relative w-32 h-32 rounded-3xl bg-gradient-to-br from-slate-800 to-slate-900 border border-cyan-500/30 flex items-center justify-center shadow-2xl shadow-cyan-500/20 overflow-hidden">
            <img
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/692b24a5bac54e3067972063/2e8a22a03_AevoiceLogo.JPG"
              alt="AEVOICE"
              className="w-32 h-32 rounded-3xl object-cover"
            />
          </div>
        </div>

        {/* Audio frequency bars */}
        <div className="flex items-end gap-1 h-12 mb-4">
          <div className="w-1.5 rounded-full bg-gradient-to-t from-cyan-500 to-cyan-300 freq-bar-1" />
          <div className="w-1.5 rounded-full bg-gradient-to-t from-blue-500 to-blue-300 freq-bar-2" />
          <div className="w-1.5 rounded-full bg-gradient-to-t from-cyan-500 to-cyan-300 freq-bar-3" />
          <div className="w-1.5 rounded-full bg-gradient-to-t from-purple-500 to-purple-300 freq-bar-4" />
          <div className="w-1.5 rounded-full bg-gradient-to-t from-blue-500 to-blue-300 freq-bar-5" />
          <div className="w-1.5 rounded-full bg-gradient-to-t from-cyan-500 to-cyan-300 freq-bar-2" style={{ animationDelay: '0.2s' }} />
          <div className="w-1.5 rounded-full bg-gradient-to-t from-purple-500 to-purple-300 freq-bar-1" style={{ animationDelay: '0.4s' }} />
          <div className="w-1.5 rounded-full bg-gradient-to-t from-blue-500 to-blue-300 freq-bar-4" style={{ animationDelay: '0.1s' }} />
          <div className="w-1.5 rounded-full bg-gradient-to-t from-cyan-500 to-cyan-300 freq-bar-3" style={{ animationDelay: '0.3s' }} />
          <div className="w-1.5 rounded-full bg-gradient-to-t from-purple-500 to-purple-300 freq-bar-5" style={{ animationDelay: '0.5s' }} />
          <div className="w-1.5 rounded-full bg-gradient-to-t from-blue-500 to-blue-300 freq-bar-1" style={{ animationDelay: '0.6s' }} />
          <div className="w-1.5 rounded-full bg-gradient-to-t from-cyan-500 to-cyan-300 freq-bar-2" style={{ animationDelay: '0.15s' }} />
        </div>

        <div className="flex items-center gap-3 text-slate-500 text-xs">
          <Volume2 className="w-3.5 h-3.5 text-cyan-500" />
          <span className="font-mono tracking-widest text-cyan-400/60">AI VOICE ENGINE ACTIVE</span>
          <Mic className="w-3.5 h-3.5 text-cyan-500" />
        </div>
      </div>
    </div>
  );
}