import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronRight, MapPin, Calendar, Users, Heart, ImagePlus, X, Sparkles } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { apiService } from '../services/apiService';

const dealbreakerOptions = [
  'Smoker',
  'Drinks Alcohol',
  'Wants Kids',
  "Doesn't Want Kids",
  'Conservative',
  'Liberal',
  'Cats',
  'Dogs',
  'Religious',
  'Career-Driven',
];

interface PendingPhoto {
  id: string;
  file: File;
  preview: string;
}

const readFileAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

export function Onboarding() {
  const { user, refreshProfile } = useAuth();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [pendingPhotos, setPendingPhotos] = useState<PendingPhoto[]>([]);
  const [formData, setFormData] = useState({
    firstName: '',
    dob: '',
    bio: '',
    location: '',
    gender: 'Everyone',
    targetGender: 'Everyone',
    ageRange: { min: 18, max: 80 },
    distance: 25,
    dealbreakers: [] as string[],
  });

  const nextStep = () => setStep((currentStep) => currentStep + 1);
  const prevStep = () => setStep((currentStep) => currentStep - 1);

  const toggleDealbreaker = (pill: string) => {
    setFormData((previousState) => ({
      ...previousState,
      dealbreakers: previousState.dealbreakers.includes(pill)
        ? previousState.dealbreakers.filter((item) => item !== pill)
        : previousState.dealbreakers.length < 3
          ? [...previousState.dealbreakers, pill]
          : previousState.dealbreakers,
    }));
  };

  const handlePhotoSelection = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    event.target.value = '';

    if (files.length === 0) {
      return;
    }

    const availableSlots = Math.max(0, 6 - pendingPhotos.length);
    const selectedFiles = files.slice(0, availableSlots);

    const nextPhotos = await Promise.all(
      selectedFiles.map(async (file) => ({
        id: `${file.name}-${file.lastModified}-${Math.random().toString(36).slice(2, 8)}`,
        file,
        preview: await readFileAsDataUrl(file),
      })),
    );

    setPendingPhotos((currentPhotos) => [...currentPhotos, ...nextPhotos]);
  };

  const removePhoto = (photoId: string) => {
    setPendingPhotos((currentPhotos) => currentPhotos.filter((photo) => photo.id !== photoId));
  };

  const handleComplete = async () => {
    if (!user) {
      return;
    }

    try {
      setIsSubmitting(true);
      setSubmitError(null);

      const token = localStorage.getItem('token') || '';
      let uploadedPhotos: string[] = [];

      if (pendingPhotos.length > 0) {
        const uploadResponse = await apiService.uploadProfilePhotos(
          token,
          pendingPhotos.map((photo) => photo.file),
        );
        uploadedPhotos = uploadResponse.photos;
      }

      await apiService.completeOnboarding(token, {
        firstName: formData.firstName,
        age: formData.dob ? new Date().getFullYear() - new Date(formData.dob).getFullYear() : null,
        distance: formData.distance,
        bio: formData.bio,
        location: formData.location,
        interests: formData.dealbreakers,
        photos: uploadedPhotos,
      });

      await refreshProfile();
    } catch (error) {
      console.error('Onboarding failed', error);
      setSubmitError('Could not finish your profile. Try one more time.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const progress = (step / 5) * 100;
  const basicsReady = Boolean(formData.firstName && formData.dob && formData.bio.trim() && pendingPhotos.length > 0);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#ffe0e7,transparent_32%),linear-gradient(180deg,#fff1f3_0%,#f8fafc_42%,#fff7ed_100%)] text-slate-900 flex flex-col items-center justify-center p-6 font-sans">
      <div className="w-full max-w-md bg-white rounded-[48px] shadow-[0_32px_64px_-12px_rgba(15,23,42,0.18)] border-8 border-[#1E293B] overflow-hidden flex flex-col p-8 min-h-[760px]">
        <div className="h-1.5 bg-slate-100 rounded-full mb-10 overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-[#FF4B6E] via-[#FB7185] to-[#F59E0B]"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
          />
        </div>

        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              className="space-y-7 flex-1 flex flex-col"
            >
              <div className="space-y-3">
                <p className="text-[10px] font-black uppercase tracking-[0.28em] text-rose-500">Build your card</p>
                <h1 className="text-3xl font-black tracking-tight leading-tight text-slate-900">Add photos that make people pause.</h1>
                <p className="text-sm text-slate-500">Think like Tinder: one strong cover photo, then enough context that someone can picture the date.</p>
              </div>

              <div className="space-y-4">
                <label className="block cursor-pointer rounded-[28px] border border-dashed border-rose-300 bg-rose-50/70 p-5 text-center hover:border-rose-500 transition-colors">
                  <input type="file" accept="image/*" multiple className="hidden" onChange={handlePhotoSelection} />
                  <div className="flex flex-col items-center gap-3 text-slate-600">
                    <div className="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center border border-rose-100">
                      <ImagePlus className="w-6 h-6 text-rose-500" />
                    </div>
                    <div>
                      <p className="font-bold text-slate-900">Upload up to 6 photos</p>
                      <p className="text-xs text-slate-500 mt-1">First photo becomes your cover. Mix one portrait with a few context shots.</p>
                    </div>
                  </div>
                </label>

                <div className="grid grid-cols-3 gap-3">
                  {pendingPhotos.map((photo, index) => (
                    <div key={photo.id} className="relative aspect-[3/4] rounded-[24px] overflow-hidden border border-slate-200 bg-slate-100">
                      <img src={photo.preview} alt={`Selected profile ${index + 1}`} className="w-full h-full object-cover" />
                      {index === 0 && (
                        <span className="absolute left-2 top-2 rounded-full bg-white/90 px-2 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-slate-700">
                          Cover
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => removePhoto(photo.id)}
                        className="absolute right-2 top-2 w-7 h-7 rounded-full bg-slate-950/75 text-white flex items-center justify-center"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  {Array.from({ length: Math.max(0, 3 - pendingPhotos.length) }).map((_, index) => (
                    <div
                      key={`placeholder-${index}`}
                      className="aspect-[3/4] rounded-[24px] border border-dashed border-slate-200 bg-slate-50 flex items-center justify-center text-slate-300"
                    >
                      <Sparkles className="w-6 h-6" />
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-5 flex-1">
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-widest font-bold text-slate-400">First Name</label>
                  <input
                    type="text"
                    value={formData.firstName}
                    onChange={(event) => setFormData({ ...formData, firstName: event.target.value })}
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
                      onChange={(event) => setFormData({ ...formData, dob: event.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 outline-none focus:border-rose-500 transition-colors appearance-none"
                    />
                    <Calendar className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 pointer-events-none" />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-widest font-bold text-slate-400">Neighborhood</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={formData.location}
                      onChange={(event) => setFormData({ ...formData, location: event.target.value })}
                      placeholder="Silver Lake, Brooklyn, Mission..."
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 pl-12 outline-none focus:border-rose-500 transition-colors"
                    />
                    <MapPin className="absolute left-5 top-1/2 -translate-y-1/2 text-rose-500 w-4 h-4" />
                  </div>
                </div>

                <div className="space-y-2 flex-1">
                  <label className="text-[10px] uppercase tracking-widest font-bold text-slate-400">Bio</label>
                  <textarea
                    value={formData.bio}
                    onChange={(event) => setFormData({ ...formData, bio: event.target.value })}
                    placeholder="What would someone remember after meeting you once?"
                    rows={4}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 outline-none focus:border-rose-500 transition-colors resize-none"
                  />
                </div>
              </div>

              <button
                disabled={!basicsReady}
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
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              className="space-y-8 flex-1 flex flex-col"
            >
              <div className="space-y-4">
                <h1 className="text-3xl font-bold tracking-tight text-slate-900 leading-tight">Identity</h1>
                <p className="text-slate-500 text-sm">How do you identify?</p>
              </div>

              <div className="grid grid-cols-1 gap-4 flex-1">
                {['Women', 'Men', 'Everyone'].map((option) => (
                  <button
                    key={option}
                    onClick={() => setFormData({ ...formData, gender: option })}
                    className={`p-6 rounded-2xl border transition-all text-left flex items-center justify-between ${
                      formData.gender === option ? 'border-rose-500 bg-rose-50' : 'border-slate-100 bg-slate-50'
                    }`}
                  >
                    <span className="font-bold text-slate-700">{option}</span>
                    <Users className={formData.gender === option ? 'text-rose-500' : 'text-slate-300'} />
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
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
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
                    {['Women', 'Men', 'Everyone'].map((option) => (
                      <button
                        key={option}
                        onClick={() => setFormData({ ...formData, targetGender: option })}
                        className={`py-3 px-1 rounded-xl border text-xs font-bold transition-all ${
                          formData.targetGender === option
                            ? 'border-rose-500 bg-rose-50 text-rose-500'
                            : 'border-slate-100 bg-slate-50 text-slate-400'
                        }`}
                      >
                        {option}
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
                      min="18"
                      max="100"
                      value={formData.ageRange.max}
                      onChange={(event) => setFormData({
                        ...formData,
                        ageRange: { ...formData.ageRange, max: parseInt(event.target.value, 10) },
                      })}
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
                      min="1"
                      max="100"
                      value={formData.distance}
                      onChange={(event) => setFormData({ ...formData, distance: parseInt(event.target.value, 10) })}
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
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              className="space-y-8 flex-1 flex flex-col"
            >
              <div className="space-y-4">
                <h1 className="text-3xl font-bold tracking-tight text-slate-900 leading-tight">Dealbreakers</h1>
                <p className="text-slate-500 text-sm">Select up to 3 filters.</p>
              </div>

              <div className="flex flex-wrap gap-2 flex-1 items-start">
                {dealbreakerOptions.map((option) => (
                  <button
                    key={option}
                    onClick={() => toggleDealbreaker(option)}
                    className={`px-4 py-2 rounded-full border text-xs font-bold transition-all ${
                      formData.dealbreakers.includes(option)
                        ? 'border-rose-500 bg-rose-50 text-rose-500'
                        : 'border-slate-100 bg-slate-50 text-slate-400'
                    }`}
                  >
                    {option}
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
                <h1 className="text-2xl font-bold text-slate-900 leading-tight">Your card is ready for the stack.</h1>
                <p className="text-slate-500 text-sm leading-relaxed px-4">
                  One more tap and we will move you into the live swipe flow and start the match calibration chat.
                </p>
              </div>

              {submitError && <p className="text-sm font-semibold text-rose-500">{submitError}</p>}

              <button
                onClick={handleComplete}
                disabled={isSubmitting}
                className="w-full bg-[#1E293B] text-white rounded-2xl py-4 font-bold shadow-lg hover:shadow-xl transition-all active:scale-[0.98] flex items-center justify-center gap-3 disabled:opacity-60"
              >
                {isSubmitting ? 'Saving profile...' : 'Open Chat'}
                <ChevronRight className="w-5 h-5" />
              </button>

              <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Simulation Mode: Active</p>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="w-32 h-1 bg-slate-100 rounded-full mx-auto mt-6"></div>
      </div>
    </div>
  );
}