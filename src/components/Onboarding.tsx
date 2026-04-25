import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronRight, MapPin, Calendar, Users, Sliders, Heart } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { apiService } from '../services/apiService';

const dealbreakerOptions = [
  "Smoker", "Drinks Alcohol", "Wants Kids", "Doesn't Want Kids", 
  "Conservative", "Liberal", "Cats", "Dogs", "Religious", "Career-Driven"
];

export function Onboarding() {
  const { user, refreshProfile } = useAuth();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    firstName: '',
    dob: '',
    gender: 'Everyone',
    targetGender: 'Everyone',
    ageRange: { min: 18, max: 80 },
    distance: 25,
    dealbreakers: [] as string[]
  });

  const nextStep = () => setStep(s => s + 1);
  const prevStep = () => setStep(s => s - 1);

  const toggleDealbreaker = (pill: string) => {
    setFormData(prev => ({
      ...prev,
      dealbreakers: prev.dealbreakers.includes(pill)
        ? prev.dealbreakers.filter(d => d !== pill)
        : prev.dealbreakers.length < 3 ? [...prev.dealbreakers, pill] : prev.dealbreakers
    }));
  };

  const handleComplete = async () => {
    if (!user) return;
    try {
      const token = localStorage.getItem("token") || "";
      await apiService.completeOnboarding(token, {
        ...formData,
        age: formData.dob ? new Date().getFullYear() - new Date(formData.dob).getFullYear() : null,
        distance: formData.distance,
        interests: formData.dealbreakers,
      });
      await refreshProfile();
    } catch (e) {
      console.error("Onboarding failed", e);
    }
  };

  const progress = (step / 5) * 100;

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col items-center justify-center p-6 font-sans">
      <div className="w-full max-w-md bg-white rounded-[48px] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.14)] border-8 border-[#1E293B] overflow-hidden flex flex-col p-8 min-h-[667px]">
        {/* Progress Bar */}
        <div className="h-1.5 bg-slate-100 rounded-full mb-12 overflow-hidden">
          <motion.div 
            className="h-full bg-gradient-to-r from-[#FF4B6E] to-[#7C3AED]"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
          />
        </div>

        <AnimatePresence mode="wait" className="flex-1">
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8 flex-1 flex flex-col"
            >
              <div className="space-y-4">
                <h1 className="text-3xl font-bold tracking-tight text-slate-900 leading-tight">The Basics</h1>
                <p className="text-slate-500 text-sm">Tell us a bit about yourself.</p>
              </div>

              <div className="space-y-6 flex-1">
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-widest font-bold text-slate-400">First Name</label>
                  <input 
                    type="text"
                    value={formData.firstName}
                    onChange={e => setFormData({ ...formData, firstName: e.target.value })}
                    placeholder="Enter your name"
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 outline-none focus:border-rose-500 transition-colors"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-widest font-bold text-slate-400">Date of Birth</label>
                  <div className="relative">
                    <input 
                      type="date"
                      value={formData.dob}
                      onChange={e => setFormData({ ...formData, dob: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 outline-none focus:border-rose-500 transition-colors appearance-none"
                    />
                    <Calendar className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 pointer-events-none" />
                  </div>
                </div>

                <button 
                  onClick={() => {
                    navigator.geolocation.getCurrentPosition(() => {}, () => {});
                    nextStep();
                  }}
                  className="w-full bg-slate-50 border border-slate-200 hover:border-rose-500 rounded-2xl p-4 flex items-center justify-center gap-3 transition-all text-slate-600 font-medium"
                >
                  <MapPin className="text-rose-500 w-4 h-4" />
                  <span className="text-sm">Enable Location</span>
                </button>
              </div>

              <button 
                disabled={!formData.firstName || !formData.dob}
                onClick={nextStep}
                className="w-full bg-[#1E293B] text-white disabled:opacity-30 rounded-2xl py-4 font-bold flex items-center justify-center gap-2 group transition-all shadow-lg"
              >
                Next
                <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8 flex-1 flex flex-col"
            >
              <div className="space-y-4">
                <h1 className="text-3xl font-bold tracking-tight text-slate-900 leading-tight">Identity</h1>
                <p className="text-slate-500 text-sm">How do you identify?</p>
              </div>

              <div className="grid grid-cols-1 gap-4 flex-1">
                {['Women', 'Men', 'Everyone'].map((opt) => (
                  <button
                    key={opt}
                    onClick={() => setFormData({ ...formData, gender: opt })}
                    className={`p-6 rounded-2xl border transition-all text-left flex items-center justify-between ${
                      formData.gender === opt ? 'border-rose-500 bg-rose-50' : 'border-slate-100 bg-slate-50'
                    }`}
                  >
                    <span className="font-bold text-slate-700">{opt}</span>
                    <Users className={formData.gender === opt ? 'text-rose-500' : 'text-slate-300'} />
                  </button>
                ))}
              </div>

              <div className="flex gap-4">
                <button onClick={prevStep} className="flex-1 bg-slate-100 text-slate-600 rounded-2xl py-4 font-bold text-sm">Back</button>
                <button onClick={nextStep} className="flex-[2] bg-[#1E293B] text-white rounded-2xl py-4 font-bold text-sm shadow-lg">Next</button>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8 flex-1 flex flex-col"
            >
              <div className="space-y-4">
                <h1 className="text-3xl font-bold tracking-tight text-slate-900 leading-tight">Preferences</h1>
                <p className="text-slate-500 text-sm">Who are you hoping to meet?</p>
              </div>

              <div className="space-y-8 flex-1">
                <div className="space-y-4">
                  <label className="text-[10px] uppercase tracking-widest font-bold text-slate-400">Target Gender</label>
                  <div className="grid grid-cols-3 gap-2">
                    {['Women', 'Men', 'Everyone'].map((opt) => (
                      <button
                        key={opt}
                        onClick={() => setFormData({ ...formData, targetGender: opt })}
                        className={`py-3 px-1 rounded-xl border text-xs font-bold transition-all ${
                          formData.targetGender === opt ? 'border-rose-500 bg-rose-50 text-rose-500' : 'border-slate-100 bg-slate-50 text-slate-400'
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <label className="font-bold text-slate-400 uppercase tracking-wider">Age Range</label>
                      <span className="text-rose-500 font-black">{formData.ageRange.min} - {formData.ageRange.max}</span>
                    </div>
                    <input 
                      type="range" 
                      min="18" max="100"
                      value={formData.ageRange.max}
                      onChange={e => setFormData({ ...formData, ageRange: { ...formData.ageRange, max: parseInt(e.target.value) } })}
                      className="w-full accent-rose-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <label className="font-bold text-slate-400 uppercase tracking-wider">Distance</label>
                      <span className="text-rose-500 font-black">{formData.distance} miles</span>
                    </div>
                    <input 
                      type="range" 
                      min="1" max="100"
                      value={formData.distance}
                      onChange={e => setFormData({ ...formData, distance: parseInt(e.target.value) })}
                      className="w-full accent-rose-500"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-4">
                <button onClick={prevStep} className="flex-1 bg-slate-100 text-slate-600 rounded-2xl py-4 font-bold text-sm">Back</button>
                <button onClick={nextStep} className="flex-[2] bg-[#1E293B] text-white rounded-2xl py-4 font-bold text-sm shadow-lg">Next</button>
              </div>
            </motion.div>
          )}

          {step === 4 && (
            <motion.div
              key="step4"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8 flex-1 flex flex-col"
            >
              <div className="space-y-4">
                <h1 className="text-3xl font-bold tracking-tight text-slate-900 leading-tight">Dealbreakers</h1>
                <p className="text-slate-500 text-sm">Select up to 3 filters.</p>
              </div>

              <div className="flex flex-wrap gap-2 flex-1 items-start">
                {dealbreakerOptions.map((opt) => (
                  <button
                    key={opt}
                    onClick={() => toggleDealbreaker(opt)}
                    className={`px-4 py-2 rounded-full border text-xs font-bold transition-all ${
                      formData.dealbreakers.includes(opt)
                        ? 'border-rose-500 bg-rose-50 text-rose-500'
                        : 'border-slate-100 bg-slate-50 text-slate-400'
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>

              <div className="flex gap-4">
                <button onClick={prevStep} className="flex-1 bg-slate-100 text-slate-600 rounded-2xl py-4 font-bold text-sm">Back</button>
                <button onClick={nextStep} className="flex-[2] bg-[#1E293B] text-white rounded-2xl py-4 font-bold text-sm shadow-lg">Almost Done</button>
              </div>
            </motion.div>
          )}

          {step === 5 && (
            <motion.div
              key="step5"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex-1 flex flex-col items-center justify-center text-center space-y-8"
            >
              {/* Radar Visualization */}
              <div className="relative w-48 h-48 flex items-center justify-center">
                <div className="absolute w-full h-full border-2 border-rose-500/10 rounded-full animate-ping" />
                <div className="absolute w-40 h-40 border-2 border-rose-500/20 rounded-full" />
                <div className="absolute w-32 h-32 border-2 border-rose-500/40 rounded-full" />
                <div className="absolute w-24 h-24 bg-gradient-to-tr from-rose-500/30 to-transparent rounded-full animate-spin-slow" />
                
                <div className="w-12 h-12 bg-rose-500 rounded-full shadow-[0_0_20px_rgba(255,75,110,0.4)] flex items-center justify-center z-10">
                  <Heart className="w-6 h-6 text-white" fill="currentColor" />
                </div>
              </div>

              <div className="space-y-3">
                <h1 className="text-2xl font-bold text-slate-900 leading-tight">Wait, someone is online near you!</h1>
                <p className="text-slate-500 text-sm leading-relaxed px-4">
                  We found a high-vibe match that fits your profile. Open chat to calibrate.
                </p>
              </div>

              <button 
                onClick={handleComplete}
                className="w-full bg-[#1E293B] text-white rounded-2xl py-4 font-bold shadow-lg hover:shadow-xl transition-all active:scale-[0.98] flex items-center justify-center gap-3"
              >
                Open Chat
                <ChevronRight className="w-5 h-5" />
              </button>
              
              <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">
                Simulation Mode: Active
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Bottom Home Indicator */}
        <div className="w-32 h-1 bg-slate-100 rounded-full mx-auto mt-6"></div>
      </div>
    </div>
  );
}
