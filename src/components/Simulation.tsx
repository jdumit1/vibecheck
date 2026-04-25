import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Send, User, Bot, Sparkles, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { apiService } from '../services/apiService';

export function Simulation() {
  const { user, profile, refreshProfile } = useAuth();
  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const token = localStorage.getItem("token") || "";

  useEffect(() => {
    if (!user || !token) return;

    const loadMessages = async () => {
      try {
        const msgs = await apiService.getMessages(token);
        setMessages(msgs);

        if (msgs.length === 0) {
          await sendAiMessage("Hey! I'm Alex. I saw we both listed some similar interests. How are you doing today?");
        }
      } catch (err) {
        console.error("Failed to load messages:", err);
      }
    };

    loadMessages();
    const interval = setInterval(loadMessages, 2000);
    return () => clearInterval(interval);
  }, [user, token]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const sendAiMessage = async (text: string) => {
    if (!user || !token) return;
    try {
      await apiService.sendMessage(token, "ai", text, true);
      const msgs = await apiService.getMessages(token);
      setMessages(msgs);
    } catch (err) {
      console.error("Failed to send AI message:", err);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !user || isTyping || !token) return;

    const userText = inputText.trim();
    setInputText('');
    setError(null);

    try {
      setIsTyping(true);
      await apiService.sendMessage(token, user.uid, userText, false);
      const msgs = await apiService.getMessages(token);
      setMessages(msgs);
    } catch (e: any) {
      console.error(e);
      setError("Failed to send message. Please try again.");
    } finally {
      setIsTyping(false);
    }
  };

  const handleFinishSimulation = async () => {
    if (!user || messages.length < 5 || !token) return;
    setIsTyping(true);
    try {
      await apiService.completeSimulation(token);
      await refreshProfile();
    } catch (e) {
      console.error("Analysis failed", e);
      setError("Failed to complete simulation");
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-[#F8FAFC] font-sans">
      {/* Header */}
      <header className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-white/80 backdrop-blur-md sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-rose-50 border border-rose-100 flex items-center justify-center">
            <Bot className="w-6 h-6 text-rose-500" />
          </div>
          <div>
            <h2 className="text-slate-900 font-bold">Alex</h2>
            <p className="text-[10px] text-rose-500 font-black uppercase tracking-widest flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              Active Now
            </p>
          </div>
        </div>
        {messages.length >= 5 && (
          <button
            onClick={handleFinishSimulation}
            disabled={isTyping}
            className="text-[10px] font-black uppercase tracking-widest bg-[#1E293B] text-white px-4 py-2 rounded-full hover:bg-slate-800 disabled:opacity-50 transition-all shadow-sm"
          >
            Finish Sync
          </button>
        )}
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-8 space-y-6">
        {messages.map((msg, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex ${msg.isAi ? 'justify-start' : 'justify-end'}`}
          >
            <div className={`max-w-[75%] flex gap-3 ${msg.isAi ? 'flex-row' : 'flex-row-reverse'}`}>
              <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center shadow-sm ${msg.isAi ? 'bg-white border border-slate-200' : 'bg-[#1E293B]'}`}>
                {msg.isAi ? <Bot className="w-4 h-4 text-slate-400" /> : <User className="w-4 h-4 text-white" />}
              </div>
              <div className={`px-5 py-3 rounded-2xl text-sm leading-relaxed shadow-sm ${
                msg.isAi ? 'bg-white text-slate-700 border border-slate-100' : 'bg-[#1E293B] text-white'
              }`}>
                {msg.text}
              </div>
            </div>
          </motion.div>
        ))}

        {isTyping && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-white border border-slate-200 shadow-sm flex items-center justify-center">
              <Bot className="w-4 h-4 text-slate-400" />
            </div>
            <div className="bg-white px-5 py-3 rounded-2xl flex gap-1 items-center border border-slate-100 shadow-sm">
              <motion.div animate={{ scale: [1, 1.5, 1] }} transition={{ repeat: Infinity, duration: 0.6 }} className="w-1.5 h-1.5 bg-rose-500 rounded-full" />
              <motion.div animate={{ scale: [1, 1.5, 1] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.2 }} className="w-1.5 h-1.5 bg-rose-500 rounded-full" />
              <motion.div animate={{ scale: [1, 1.5, 1] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.4 }} className="w-1.5 h-1.5 bg-rose-500 rounded-full" />
            </div>
          </motion.div>
        )}

        {error && (
          <div className="flex justify-center">
            <div className="bg-rose-50 border border-rose-100 text-rose-500 px-4 py-2 rounded-full text-xs font-bold flex items-center gap-2 shadow-sm">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          </div>
        )}
        <div ref={scrollRef} />
      </div>

      {/* Input */}
      <footer className="p-6 bg-white border-t border-slate-100">
        <form onSubmit={handleSend} className="max-w-2xl mx-auto relative">
          <input
            type="text"
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            disabled={isTyping}
            placeholder="Calibrating profile..."
            className="w-full bg-slate-50 text-slate-900 border border-slate-200 rounded-2xl px-6 py-5 pr-16 outline-none focus:border-rose-500/50 transition-all placeholder:text-slate-400 shadow-inner"
          />
          <button
            type="submit"
            disabled={isTyping || !inputText.trim()}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-3.5 bg-[#1E293B] text-white rounded-xl hover:bg-slate-800 disabled:opacity-20 transition-all shadow-md active:scale-95"
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
        <p className="text-[10px] text-center text-slate-400 mt-4 uppercase tracking-[0.2em] font-black">
          Simulation Active // Pattern Recognition in Progress
        </p>
      </footer>
    </div>
  );
}
