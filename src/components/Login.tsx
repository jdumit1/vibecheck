import React, { useState } from 'react';
import { motion } from 'motion/react';
import { LogIn, MessageSquare, ShieldCheck, Zap, Mail, Lock, User } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export function Login() {
  const { signIn, register } = useAuth();
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      if (isLoginMode) {
        await signIn(email, password);
      } else {
        await register(email, firstName, password);
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden">
        <motion.div
          animate={{ scale: [1, 1.2, 1], opacity: [0.05, 0.1, 0.05] }}
          transition={{ duration: 10, repeat: Infinity }}
          className="absolute -top-1/4 -left-1/4 w-[100vw] h-[100vw] bg-[#FF4B6E] rounded-full blur-[140px]"
        />
        <motion.div
          animate={{ scale: [1.2, 1, 1.2], opacity: [0.03, 0.08, 0.03] }}
          transition={{ duration: 12, repeat: Infinity }}
          className="absolute -bottom-1/4 -right-1/4 w-[80vw] h-[80vw] bg-[#7C3AED] rounded-full blur-[140px]"
        />
      </div>

      <div className="max-w-md w-full relative space-y-8">
        {/* Logo Section */}
        <div className="text-center space-y-6">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="w-20 h-20 bg-gradient-to-br from-[#FF4B6E] to-[#7C3AED] rounded-3xl mx-auto flex items-center justify-center rotate-12 shadow-[0_20px_40px_rgba(255,75,110,0.3)]"
          >
            <span className="text-white text-4xl font-black italic">V</span>
          </motion.div>
          <div className="space-y-2">
            <h1 className="text-6xl font-black tracking-tighter text-slate-900 italic uppercase">VibeCheck</h1>
            <p className="text-slate-500 font-medium text-lg leading-relaxed">
              Find your vibe. For real.
            </p>
          </div>
        </div>

        {/* Feature Pills */}
        <div className="flex flex-wrap justify-center gap-3">
          {[
            { icon: <MessageSquare className="w-3 h-3" />, text: "AI Assessment" },
            { icon: <ShieldCheck className="w-3 h-3" />, text: "Real Connections" },
            { icon: <Zap className="w-3 h-3" />, text: "Behavioral Sync" }
          ].map((feature, i) => (
            <div key={i} className="flex items-center gap-2 bg-white border border-slate-200 shadow-sm px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest text-slate-500">
              {feature.icon}
              {feature.text}
            </div>
          ))}
        </div>

        {/* Form Section */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLoginMode && (
            <div>
              <label className="text-xs font-black uppercase tracking-widest text-slate-500 mb-2 block">Name</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="First name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full bg-white border border-slate-200 pl-10 pr-4 py-3 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:border-rose-500"
                />
              </div>
            </div>
          )}

          <div>
            <label className="text-xs font-black uppercase tracking-widest text-slate-500 mb-2 block">Email</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-white border border-slate-200 pl-10 pr-4 py-3 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:border-rose-500"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-black uppercase tracking-widest text-slate-500 mb-2 block">Password</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-white border border-slate-200 pl-10 pr-4 py-3 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:border-rose-500"
              />
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-[#1E293B] text-white hover:bg-slate-800 disabled:opacity-70 font-bold py-3 rounded-lg flex items-center justify-center gap-3 transition-all active:scale-[0.98]"
          >
            {isLoading ? (
              <>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  className="w-4 h-4 border-2 border-white border-t-transparent rounded-full"
                />
                <span>Please wait...</span>
              </>
            ) : (
              <>
                <LogIn className="w-4 h-4" />
                {isLoginMode ? 'Sign In' : 'Sign Up'}
              </>
            )}
          </button>
        </form>

        {/* Toggle Mode */}
        <div className="text-center">
          <button
            onClick={() => setIsLoginMode(!isLoginMode)}
            className="text-sm text-slate-500 hover:text-slate-700 underline"
          >
            {isLoginMode ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
          </button>
        </div>

        {/* Footer */}
        <p className="text-[10px] text-center text-slate-400 uppercase tracking-widest font-medium">
          By continuing, you agree to our <span className="underline cursor-pointer hover:text-slate-600 transition-colors">Terms of Service</span> and <span className="underline cursor-pointer hover:text-slate-600 transition-colors">Privacy Policy</span>.
        </p>
      </div>
    </div>
  );
}
