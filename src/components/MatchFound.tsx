import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { MessageSquare, Zap } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { apiService } from '../services/apiService';

export function MatchFound() {
  const { user, profile, refreshProfile } = useAuth();
  const [progressValue, setProgressValue] = useState(0);
  const [showRadar, setShowRadar] = useState(false);
  const [headline, setHeadline] = useState('Building your profile...');
  const [isInterrupted, setIsInterrupted] = useState(false);
  const [showChatButton, setShowChatButton] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Progress bar animation
  useEffect(() => {
    const timer = setInterval(() => {
      setProgressValue((prev) => {
        if (prev >= 100) {
          clearInterval(timer);
          return 100;
        }
        return prev + Math.random() * 30;
      });
    }, 300);

    return () => clearInterval(timer);
  }, []);

  // Trigger radar when progress completes
  useEffect(() => {
    if (progressValue >= 100) {
      setTimeout(() => setShowRadar(true), 300);
    }
  }, [progressValue]);

  // Headline interruption after 3 seconds
  useEffect(() => {
    if (showRadar) {
      const timer = setTimeout(() => {
        triggerHaptic();
        setHeadline('Wait, someone is online near you!');
        setIsInterrupted(true);
        setTimeout(() => setShowChatButton(true), 500);
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [showRadar]);

  const triggerHaptic = () => {
    if (navigator.vibrate) {
      navigator.vibrate([100, 50, 100]);
    }
  };

  const handleOpenChat = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      const token = localStorage.getItem("token") || "";
      await apiService.markMatchFound(token);
      await refreshProfile();
    } catch (error) {
      console.error('Error updating profile:', error);
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans">
      {/* Ambient background glow */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <motion.div
          animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 4, repeat: Infinity }}
          className="absolute top-1/3 left-1/2 -translate-x-1/2 w-96 h-96 bg-gradient-to-r from-rose-500/20 to-purple-500/20 rounded-full blur-[120px]"
        />
      </div>

      <div className="relative z-10 max-w-2xl w-full space-y-12 text-center">
        {/* Progress Bar Section */}
        {!showRadar && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-6"
          >
            <div className="space-y-2">
              <h2 className="text-3xl font-black text-white tracking-tight">Analyzing Compatibility</h2>
              <p className="text-slate-400 text-sm">Finding your perfect vibe match...</p>
            </div>

            {/* Progress Bar */}
            <div className="space-y-3">
              <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(progressValue, 100)}%` }}
                  transition={{ duration: 0.5 }}
                  className="h-full bg-gradient-to-r from-rose-500 to-purple-500 rounded-full"
                />
              </div>
              <p className="text-xs text-slate-500 font-black uppercase tracking-widest">
                {Math.min(Math.round(progressValue), 100)}%
              </p>
            </div>
          </motion.div>
        )}

        {/* Radar Section */}
        {showRadar && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6 }}
            className="space-y-12"
          >
            {/* Radar Animation */}
            <div className="flex justify-center mb-4">
              <div className="relative w-48 h-48">
                {/* Outer circles */}
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="absolute inset-0 border-2 border-rose-500/30 rounded-full"
                />
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 2.5, repeat: Infinity, delay: 0.3 }}
                  className="absolute inset-0 border-2 border-purple-500/20 rounded-full"
                />
                <div className="absolute inset-0 border-2 border-slate-700/50 rounded-full" />

                {/* Center dot */}
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 bg-rose-500 rounded-full shadow-lg shadow-rose-500/50"
                />

                {/* Scanning lines */}
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                  className="absolute inset-0 flex items-center justify-center"
                >
                  <div className="absolute h-24 w-0.5 bg-gradient-to-b from-rose-500/50 to-transparent origin-bottom" />
                </motion.div>

                {/* Ping effect */}
                <motion.div
                  animate={{ scale: [1, 2], opacity: [1, 0] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="absolute inset-0 border-2 border-rose-500/50 rounded-full"
                />
              </div>
            </div>

            {/* Headline Section */}
            <div className="space-y-4 min-h-20">
              <h1 className="text-5xl font-black text-white tracking-tighter leading-tight">
                {headline}
              </h1>
              {isInterrupted && (
                <motion.p
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                  className="text-slate-400 text-lg"
                >
                  Alex just came online. Sparks flying! ⚡
                </motion.p>
              )}
            </div>

            {/* Profile Preview */}
            {showChatButton && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="bg-slate-800/50 backdrop-blur-md rounded-3xl p-6 border border-slate-700/50 space-y-4"
              >
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-rose-500 to-purple-500 flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-2xl font-black">A</span>
                  </div>
                  <div className="text-left flex-1">
                    <h3 className="text-xl font-bold text-white">Alex, 26</h3>
                    <p className="text-xs text-slate-400 uppercase tracking-widest mt-1">
                      <span className="inline-block w-2 h-2 bg-emerald-500 rounded-full mr-2" />
                      Online now
                    </p>
                  </div>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <span className="text-xs bg-rose-500/20 text-rose-300 px-3 py-1 rounded-full font-bold uppercase">Deep Conversations</span>
                  <span className="text-xs bg-purple-500/20 text-purple-300 px-3 py-1 rounded-full font-bold uppercase">Authentic</span>
                </div>
              </motion.div>
            )}

            {/* Chat Button */}
            {showChatButton && (
              <motion.button
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.4 }}
                onClick={handleOpenChat}
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-rose-500 to-purple-500 text-white font-bold py-6 rounded-2xl flex items-center justify-center gap-3 relative overflow-hidden group disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {/* Pulsing background */}
                <motion.div
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className="absolute inset-0 bg-gradient-to-r from-rose-500 to-purple-500 rounded-2xl -z-10 opacity-80"
                />
                <motion.div
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity, delay: 0.1 }}
                  className="absolute inset-0 bg-gradient-to-r from-rose-500 to-purple-500 rounded-2xl -z-10 blur-lg opacity-50"
                />

                {isLoading ? (
                  <>
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                      className="w-5 h-5 border-2 border-white border-t-transparent rounded-full relative z-10"
                    />
                    <span className="relative z-10 uppercase font-black tracking-widest">Opening...</span>
                  </>
                ) : (
                  <>
                    <MessageSquare className="w-5 h-5 relative z-10" />
                    <span className="relative z-10 uppercase font-black tracking-widest">Open Chat</span>
                    <Zap className="w-5 h-5 relative z-10" />
                  </>
                )}
              </motion.button>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}
