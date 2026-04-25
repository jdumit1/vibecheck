import React from 'react';
import { motion } from 'motion/react';
import { Sparkles, Brain, MessageSquare, Heart, ShieldCheck, MapPin, User } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export function Dashboard() {
  const { profile, user } = useAuth();
  const vibe = profile?.vibeScore;

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans">
      {/* Navbar */}
      <nav className="p-8 flex items-center justify-between">
        <h1 className="text-3xl font-black tracking-tighter text-[#FF4B6E] italic">VIBECHECK</h1>
        <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-full border border-slate-200 shadow-sm">
          <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none">Matrix Synced</span>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto p-8 space-y-12">
        {/* Profile Card */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-12">
          <div className="md:col-span-1">
            <div className="relative group">
              <div className="absolute inset-0 bg-[#FF4B6E] rounded-[48px] blur-3xl opacity-10 group-hover:opacity-20 transition-opacity" />
              <div className="relative aspect-[3/4] bg-white rounded-[48px] border-8 border-[#1E293B] shadow-2xl flex items-center justify-center overflow-hidden">
                <Heart className="w-24 h-24 text-rose-50 text-rose-500/10" fill="currentColor" />
                <div className="absolute bottom-6 left-6 right-6 bg-white/90 backdrop-blur-md p-4 rounded-3xl border border-slate-100 shadow-sm">
                  <p className="text-lg font-bold text-slate-900">{profile?.firstName}, {profile?.age || '24'}</p>
                  <p className="text-[10px] text-slate-400 flex items-center gap-1 uppercase tracking-widest font-black mt-1">
                    <MapPin className="w-3 h-3 text-rose-500" />
                    Within {profile?.distance || 10} miles
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="md:col-span-2 space-y-8 py-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-rose-500 font-black uppercase tracking-[0.2em] text-[10px]">
                <Brain className="w-4 h-4" />
                Behavioral Report
              </div>
              <h2 className="text-5xl font-black tracking-tighter text-slate-900">Your Vibe Analysis</h2>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                <p className="text-[10px] uppercase tracking-widest text-slate-400 font-black mb-2">Engage Style</p>
                <p className="text-xl font-bold text-slate-800 uppercase tracking-tight">{vibe?.style || 'Syncing...'}</p>
              </div>
              <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                <p className="text-[10px] uppercase tracking-widest text-slate-400 font-black mb-2">Emotional IQ</p>
                <p className="text-xl font-bold text-slate-800">{vibe?.eq ? `${vibe.eq}/10` : 'CALIBRATING'}</p>
              </div>
            </div>

            <div className="bg-white/50 backdrop-blur-sm p-8 rounded-[40px] border border-slate-100 relative overflow-hidden shadow-inner">
              <Sparkles className="absolute -right-6 -top-6 w-32 h-32 text-rose-500/5 rotate-12" />
              <p className="text-sm leading-[1.8] text-slate-600 italic font-medium relative z-10 font-sans">
                "{vibe?.summary || 'We are still processing your interaction data to finalize your behavioral matrix. Keep chatting to refine your results.'}"
              </p>
            </div>
          </div>
        </section>

        {/* Matches Feed */}
        <section className="space-y-8">
          <div className="flex items-center justify-between">
            <h3 className="text-2xl font-bold tracking-tight text-slate-900 leading-tight">Behavioral Matches</h3>
            <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
              Sorted by Compatibility
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-20">
            {[1, 2, 3, 4].map((i) => (
              <motion.div 
                key={i}
                whileHover={{ y: -4, shadow: "0 20px 40px -12px rgba(0,0,0,0.1)" }}
                className="bg-white p-6 rounded-[32px] border border-slate-100 flex items-center gap-6 group cursor-pointer transition-all hover:border-rose-500/20 shadow-sm"
              >
                <div className="w-24 h-24 rounded-3xl bg-slate-50 border border-slate-100 flex-shrink-0 flex items-center justify-center">
                  <User className="text-slate-200 w-12 h-12" />
                </div>
                <div className="space-y-4 flex-1">
                  <div>
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-slate-900">User {i}</h4>
                      <span className="text-[10px] font-black text-rose-500 bg-rose-50 px-2 py-0.5 rounded">9{i}% SYNC</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">Matched on "Deep Conversations"</p>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-[10px] bg-slate-50 px-2 py-1 rounded-lg text-slate-400 font-bold uppercase tracking-wider">Altruistic</span>
                    <span className="text-[10px] bg-slate-50 px-2 py-1 rounded-lg text-slate-400 font-bold uppercase tracking-wider">Introvert</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
