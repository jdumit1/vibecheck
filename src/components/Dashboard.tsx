import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowUp,
  Camera,
  ChevronLeft,
  ChevronRight,
  Heart,
  ImagePlus,
  MapPin,
  MessageCircleMore,
  Sparkles,
  Upload,
  X,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { apiService, type MatchThread, type VibeProfile } from '../services/apiService';
import { discoverProfiles, type DiscoverProfile } from '../lib/discoverProfiles';

type SwipeAction = 'pass' | 'like' | 'super';

interface GalleryViewerState {
  title: string;
  subtitle?: string;
  photos: string[];
  activeIndex: number;
}

function formatMatchTimestamp(timestamp?: string) {
  if (!timestamp) {
    return 'just now';
  }

  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return 'just now';
  }

  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.max(0, Math.floor(diffMs / 60000));

  if (diffMinutes < 1) {
    return 'just now';
  }

  if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  }

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) {
    return `${diffDays}d ago`;
  }

  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function normalizeTerm(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function scoreCandidateForVibe(candidate: DiscoverProfile, vibeProfile?: VibeProfile) {
  if (!vibeProfile) {
    return candidate.compatibility;
  }

  const preferredBadges = (vibeProfile.preferredBadges || []).map(normalizeTerm);
  const preferredTraits = (vibeProfile.preferredTraits || []).map(normalizeTerm);
  const candidateTerms = [
    ...candidate.badges,
    candidate.bio,
    candidate.job,
    candidate.prompt,
  ].map(normalizeTerm);

  let score = candidate.compatibility;

  for (const badge of preferredBadges) {
    if (candidateTerms.some((term) => term.includes(badge) || badge.includes(term))) {
      score += 8;
    }
  }

  for (const trait of preferredTraits) {
    if (candidateTerms.some((term) => term.includes(trait))) {
      score += 5;
    }
  }

  const lookingFor = normalizeTerm(vibeProfile.lookingFor || '');
  if (lookingFor && candidateTerms.some((term) => lookingFor.includes(term) || term.includes(lookingFor))) {
    score += 6;
  }

  return score;
}

export function Dashboard() {
  const { profile, refreshProfile } = useAuth();
  const [deck, setDeck] = useState(discoverProfiles);
  const [activeSwipe, setActiveSwipe] = useState<{
    id: string;
    x: number;
    y: number;
    rotate: number;
    action: SwipeAction;
  } | null>(null);
  const [photoCursor, setPhotoCursor] = useState<Record<string, number>>(() =>
    Object.fromEntries(discoverProfiles.map((candidate) => [candidate.id, 0])),
  );
  const [feedback, setFeedback] = useState('Swipe right on people you want to meet.');
  const [likesCount, setLikesCount] = useState(12);
  const [galleryViewer, setGalleryViewer] = useState<GalleryViewerState | null>(null);
  const [matchReveal, setMatchReveal] = useState<MatchThread | null>(null);
  const [galleryError, setGalleryError] = useState<string | null>(null);
  const [matchError, setMatchError] = useState<string | null>(null);
  const [isUploadingPhotos, setIsUploadingPhotos] = useState(false);
  const [isSavingGallery, setIsSavingGallery] = useState(false);
  const [isCreatingMatch, setIsCreatingMatch] = useState(false);
  const [isSendingMatchMessage, setIsSendingMatchMessage] = useState(false);
  const [simulatingMatchId, setSimulatingMatchId] = useState<string | null>(null);
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(profile?.activeMatchId || null);
  const [matchComposer, setMatchComposer] = useState('');
  const uploadInputRef = useRef<HTMLInputElement | null>(null);

  const vibeStyle = profile?.vibeScore?.style || 'Curious';
  const userPhotoPaths = profile?.photos || [];
  const matches = profile?.matches || [];
  const matchesCount = matches.length;
  const personalizedProfiles = useMemo(
    () => [...discoverProfiles].sort((left, right) => scoreCandidateForVibe(right, profile?.vibeScore) - scoreCandidateForVibe(left, profile?.vibeScore)),
    [profile?.vibeScore],
  );
  const userPhotos = useMemo(
    () => userPhotoPaths.map((photo) => apiService.getAssetUrl(photo)),
    [userPhotoPaths],
  );
  const activeMatch = useMemo(
    () => matches.find((match) => match.id === selectedMatchId) ?? matches[0] ?? null,
    [matches, selectedMatchId],
  );
  const latestIncomingMessage = useMemo(
    () => activeMatch?.messages.slice().reverse().find((message) => message.sender === 'match') ?? null,
    [activeMatch],
  );
  const unreadMatchesCount = useMemo(
    () => matches.reduce((total, match) => total + (match.unreadCount || 0), 0),
    [matches],
  );
  const stackCards = deck.slice(0, 3).map((candidate, index) => ({ candidate, index })).reverse();
  const topProfile = deck[0];

  useEffect(() => {
    if (matches.length === 0) {
      setSelectedMatchId(null);
      return;
    }

    if (profile?.activeMatchId && matches.some((match) => match.id === profile.activeMatchId)) {
      setSelectedMatchId(profile.activeMatchId);
      return;
    }

    if (!selectedMatchId || !matches.some((match) => match.id === selectedMatchId)) {
      setSelectedMatchId(matches[0].id);
    }
  }, [matches, profile?.activeMatchId, selectedMatchId]);

  useEffect(() => {
    setDeck((currentDeck) => {
      const isStillDefaultOrder = currentDeck.every((candidate, index) => candidate.id === discoverProfiles[index]?.id);
      return isStillDefaultOrder ? personalizedProfiles : currentDeck;
    });
  }, [personalizedProfiles]);

  useEffect(() => {
    const token = localStorage.getItem('token') || '';
    if (!token || !activeMatch || !latestIncomingMessage) {
      return;
    }

    if (activeMatch.unreadCount === 0 || activeMatch.lastSeenMessageId === latestIncomingMessage.id) {
      return;
    }

    let ignore = false;

    const markRead = async () => {
      try {
        await apiService.markMatchRead(token, activeMatch.id);
        if (!ignore) {
          await refreshProfile();
        }
      } catch (error) {
        console.error('Failed to mark match as read', error);
      }
    };

    void markRead();

    return () => {
      ignore = true;
    };
  }, [activeMatch, latestIncomingMessage, refreshProfile]);

  const movePhoto = (candidateId: string, direction: 'next' | 'prev') => {
    setPhotoCursor((currentCursor) => {
      const candidate = deck.find((entry) => entry.id === candidateId);
      if (!candidate) {
        return currentCursor;
      }

      const currentIndex = currentCursor[candidateId] || 0;
      const nextIndex = direction === 'next'
        ? (currentIndex + 1) % candidate.photos.length
        : (currentIndex - 1 + candidate.photos.length) % candidate.photos.length;

      return { ...currentCursor, [candidateId]: nextIndex };
    });
  };

  const openGallery = (title: string, photos: string[], activeIndex = 0, subtitle?: string) => {
    setGalleryViewer({ title, photos, activeIndex, subtitle });
  };

  const queueSwipe = (action: SwipeAction) => {
    if (!topProfile || activeSwipe) {
      return;
    }

    const nextSwipe =
      action === 'pass'
        ? { id: topProfile.id, x: -420, y: 44, rotate: -18, action }
        : action === 'super'
          ? { id: topProfile.id, x: 0, y: -520, rotate: 0, action }
          : { id: topProfile.id, x: 420, y: 36, rotate: 18, action };

    setActiveSwipe(nextSwipe);
  };

  const focusMatchThread = async (matchId: string) => {
    const token = localStorage.getItem('token') || '';
    setSelectedMatchId(matchId);

    if (!token) {
      return;
    }

    try {
      setMatchError(null);
      await apiService.activateMatch(token, matchId);
      await refreshProfile();
    } catch (error) {
      console.error('Failed to activate match', error);
      setMatchError('Could not open that chat right now.');
    }
  };

  const createMatchFromSwipe = async (candidate: DiscoverProfile, action: SwipeAction) => {
    const token = localStorage.getItem('token') || '';
    if (!token) {
      setFeedback(`Matched with ${candidate.name}, but you need to sign in again to save the thread.`);
      return;
    }

    try {
      setIsCreatingMatch(true);
      setMatchError(null);
      const response = await apiService.createMatch(token, candidate);
      setSelectedMatchId(response.match.id);
      setMatchReveal(response.match);
      await refreshProfile();
      setFeedback(
        response.isNew
          ? `${candidate.name} is a match. Open the chat and make the first move.`
          : `${candidate.name} is already in your matches. Jump back into the thread.`,
      );
    } catch (error) {
      console.error('Failed to create match', error);
      setMatchError('Could not save that match right now.');
      setFeedback(`The swipe landed, but ${candidate.name}'s chat thread could not be created.`);
    } finally {
      setIsCreatingMatch(false);
    }
  };

  const finalizeSwipe = (candidate: DiscoverProfile, action: SwipeAction) => {
    setDeck((currentDeck) => {
      const [currentHead, ...rest] = currentDeck;
      if (!currentHead) {
        return currentDeck;
      }

      return [...rest, currentHead];
    });

    setPhotoCursor((currentCursor) => ({ ...currentCursor, [candidate.id]: 0 }));

    if (action === 'like' || action === 'super') {
      setLikesCount((currentLikes) => currentLikes + 1);
      setFeedback(
        action === 'super'
          ? `Super like sent to ${candidate.name}. Opening the real thread next.`
          : `Right swipe on ${candidate.name} locked in. Building the match thread.`,
      );
      void createMatchFromSwipe(candidate, action);
    } else {
      setFeedback(`Passed on ${candidate.name}. Keep the stack moving.`);
    }

    setActiveSwipe(null);
  };

  const saveGallery = async (nextPhotos: string[]) => {
    const token = localStorage.getItem('token') || '';
    if (!token) {
      return;
    }

    try {
      setIsSavingGallery(true);
      setGalleryError(null);
      await apiService.updateProfilePhotos(token, nextPhotos);
      await refreshProfile();
    } catch (error) {
      console.error('Failed to update gallery', error);
      setGalleryError('Could not update the gallery right now.');
    } finally {
      setIsSavingGallery(false);
    }
  };

  const handleAddPhotos = async (files: File[]) => {
    const token = localStorage.getItem('token') || '';
    if (!token || files.length === 0) {
      return;
    }

    try {
      setIsUploadingPhotos(true);
      setGalleryError(null);
      const availableSlots = Math.max(0, 6 - userPhotoPaths.length);
      await apiService.uploadProfilePhotos(token, files.slice(0, availableSlots));
      await refreshProfile();
    } catch (error) {
      console.error('Failed to upload photos', error);
      setGalleryError('Photo upload failed. Use lighter images and try again.');
    } finally {
      setIsUploadingPhotos(false);
    }
  };

  const handleGalleryInput = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    event.target.value = '';
    await handleAddPhotos(files);
  };

  const removePhoto = async (photoPath: string) => {
    await saveGallery(userPhotoPaths.filter((photo) => photo !== photoPath));
  };

  const makeCoverPhoto = async (photoPath: string) => {
    await saveGallery([photoPath, ...userPhotoPaths.filter((photo) => photo !== photoPath)]);
  };

  const handleSendMatchMessage = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const token = localStorage.getItem('token') || '';
    const text = matchComposer.trim();
    if (!token || !activeMatch || !text) {
      return;
    }

    try {
      setIsSendingMatchMessage(true);
      setMatchError(null);
      const response = await apiService.sendMatchMessage(token, activeMatch.id, text);
      setMatchComposer('');
      setSelectedMatchId(response.match.id);
      await refreshProfile();
    } catch (error) {
      console.error('Failed to send match message', error);
      setMatchError('Message failed to send. Try again in a second.');
    } finally {
      setIsSendingMatchMessage(false);
    }
  };

  const handleSimulateReply = async (matchId: string) => {
    const token = localStorage.getItem('token') || '';
    if (!token) {
      return;
    }

    try {
      setSimulatingMatchId(matchId);
      setMatchError(null);
      await apiService.simulateMatchReply(token, matchId);
      await refreshProfile();
      setFeedback('Simulated a new incoming reply so unread and ordering changes are visible.');
    } catch (error) {
      console.error('Failed to simulate match reply', error);
      setMatchError('Could not simulate a new reply right now.');
    } finally {
      setSimulatingMatchId(null);
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,#ffd6df,transparent_25%),radial-gradient(circle_at_top_right,#fde68a,transparent_22%),linear-gradient(180deg,#fff7f8_0%,#fffaf5_36%,#f8fafc_100%)] text-slate-900 font-sans">
      <input
        ref={uploadInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleGalleryInput}
      />

      <nav className="max-w-7xl mx-auto px-5 md:px-8 pt-6 md:pt-8 pb-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.32em] text-rose-500">Discover</p>
          <h1 className="text-3xl md:text-5xl font-black tracking-[-0.05em] text-slate-950">Swipe to meet a match.</h1>
        </div>
        <div className="flex gap-3 self-start md:self-auto">
          <div className="rounded-full bg-white/90 px-4 py-2 border border-white shadow-sm">
            <p className="text-[10px] uppercase tracking-[0.24em] text-slate-400 font-black">Likes queued</p>
            <p className="text-xl font-black text-slate-900">{likesCount}</p>
          </div>
          <div className="rounded-full bg-slate-950 px-4 py-2 shadow-sm">
            <p className="text-[10px] uppercase tracking-[0.24em] text-slate-500 font-black">Matches</p>
            <p className="text-xl font-black text-white">{matchesCount}</p>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-5 md:px-8 pb-10 grid gap-8 xl:grid-cols-[minmax(0,1.2fr)_400px] items-start">
        <section className="space-y-6">
          <div className="flex flex-wrap items-center gap-3">
            <div className="rounded-full bg-white/85 border border-white px-4 py-2 shadow-sm flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-rose-500" />
              <span className="text-sm font-semibold text-slate-700">{feedback}</span>
            </div>
            {isCreatingMatch && (
              <div className="rounded-full bg-slate-950 text-white px-4 py-2 text-sm font-semibold shadow-sm">
                Saving match thread...
              </div>
            )}
            <div className="rounded-full bg-slate-950 text-white px-4 py-2 text-sm font-semibold shadow-sm flex items-center gap-2">
              <MapPin className="w-4 h-4 text-amber-300" />
              Near {profile?.location || 'your city'}
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-[minmax(0,430px)_minmax(0,1fr)] items-start">
            <div className="space-y-5">
              <div className="relative mx-auto w-full max-w-[430px] h-[680px]">
                {stackCards.map(({ candidate, index }) => {
                  const isTopCard = index === 0;
                  const activePhotoIndex = photoCursor[candidate.id] || 0;
                  const isAnimating = activeSwipe?.id === candidate.id;

                  return (
                    <motion.article
                      key={candidate.id}
                      drag={isTopCard ? true : false}
                      dragElastic={0.16}
                      onDragEnd={(_, info) => {
                        if (!isTopCard || activeSwipe) {
                          return;
                        }

                        if (info.offset.x > 120) {
                          queueSwipe('like');
                        } else if (info.offset.x < -120) {
                          queueSwipe('pass');
                        } else if (info.offset.y < -120) {
                          queueSwipe('super');
                        }
                      }}
                      whileDrag={isTopCard ? { scale: 1.01, rotate: 5 } : undefined}
                      animate={
                        isAnimating
                          ? { x: activeSwipe.x, y: activeSwipe.y, rotate: activeSwipe.rotate, opacity: 0.1 }
                          : { x: 0, y: index * 16, rotate: 0, scale: 1 - index * 0.035, opacity: 1 - index * 0.08 }
                      }
                      transition={{ type: 'spring', stiffness: 220, damping: 26 }}
                      onAnimationComplete={() => {
                        if (isAnimating && activeSwipe) {
                          finalizeSwipe(candidate, activeSwipe.action);
                        }
                      }}
                      className="absolute inset-0 rounded-[36px] overflow-hidden border border-white/60 shadow-[0_30px_80px_-24px_rgba(15,23,42,0.36)] bg-slate-200"
                      style={{ zIndex: 40 - index }}
                    >
                      <img src={candidate.photos[activePhotoIndex]} alt={`${candidate.name} profile`} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-gradient-to-b from-slate-950/8 via-transparent to-slate-950/90" />

                      <div className="absolute top-4 left-4 right-4 flex gap-1.5">
                        {candidate.photos.map((_, photoIndex) => (
                          <div
                            key={`${candidate.id}-${photoIndex}`}
                            className={`h-1.5 flex-1 rounded-full ${photoIndex === activePhotoIndex ? 'bg-white' : 'bg-white/35'}`}
                          />
                        ))}
                      </div>

                      <button
                        type="button"
                        onClick={() => movePhoto(candidate.id, 'prev')}
                        className="absolute inset-y-0 left-0 w-1/2"
                        aria-label="Previous photo"
                      />
                      <button
                        type="button"
                        onClick={() => movePhoto(candidate.id, 'next')}
                        className="absolute inset-y-0 right-0 w-1/2"
                        aria-label="Next photo"
                      />

                      <div className="absolute left-5 right-5 bottom-5 text-white space-y-4">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h2 className="text-4xl font-black tracking-tight">{candidate.name}</h2>
                              <span className="text-3xl font-light text-white/90">{candidate.age}</span>
                              <span className="rounded-full bg-emerald-400/18 border border-emerald-300/40 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-emerald-100">
                                {candidate.compatibility}% sync
                              </span>
                            </div>
                            <p className="text-sm font-semibold text-white/82 mt-2">{candidate.job} • {candidate.distance}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => openGallery(candidate.name, candidate.photos, activePhotoIndex, candidate.prompt)}
                            className="w-12 h-12 rounded-full bg-white/16 backdrop-blur-md border border-white/25 flex items-center justify-center"
                          >
                            <Camera className="w-5 h-5" />
                          </button>
                        </div>

                        <p className="text-base leading-7 text-white/92 max-w-[30rem]">{candidate.bio}</p>

                        <div className="flex flex-wrap gap-2">
                          {candidate.badges.map((badge) => (
                            <span
                              key={badge}
                              className="rounded-full bg-white/14 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.18em] text-white/88 border border-white/12"
                            >
                              {badge}
                            </span>
                          ))}
                        </div>

                        <div className="rounded-[26px] bg-slate-950/42 backdrop-blur-md border border-white/10 p-4 text-sm leading-6 text-white/82">
                          <span className="block text-[10px] font-black uppercase tracking-[0.22em] text-white/54 mb-2">Prompt</span>
                          {candidate.prompt}
                        </div>
                      </div>
                    </motion.article>
                  );
                })}
              </div>

              <div className="flex items-center justify-center gap-4 md:gap-6">
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => queueSwipe('pass')}
                  className="w-16 h-16 rounded-full bg-white border border-white shadow-[0_16px_40px_-20px_rgba(15,23,42,0.5)] flex items-center justify-center text-amber-500"
                >
                  <X className="w-8 h-8" />
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => queueSwipe('super')}
                  className="w-14 h-14 rounded-full bg-slate-950 text-sky-300 shadow-[0_16px_40px_-20px_rgba(15,23,42,0.58)] flex items-center justify-center"
                >
                  <ArrowUp className="w-7 h-7" />
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => queueSwipe('like')}
                  className="w-16 h-16 rounded-full bg-gradient-to-br from-rose-500 to-pink-500 text-white shadow-[0_20px_48px_-18px_rgba(244,63,94,0.7)] flex items-center justify-center"
                >
                  <Heart className="w-8 h-8" fill="currentColor" />
                </motion.button>
              </div>
            </div>

            <div className="space-y-5">
              <div className="rounded-[32px] bg-white/90 border border-white shadow-[0_30px_70px_-28px_rgba(15,23,42,0.32)] p-6 space-y-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.24em] text-rose-500">Why they fit</p>
                    <h3 className="text-2xl font-black tracking-tight text-slate-950 mt-2">The top card should feel alive.</h3>
                  </div>
                  <div className="w-11 h-11 rounded-2xl bg-rose-50 flex items-center justify-center text-rose-500 border border-rose-100">
                    <MessageCircleMore className="w-5 h-5" />
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  {[
                    { label: 'Bio depth', value: 'Strong' },
                    { label: 'Photo variety', value: '3 shots' },
                    { label: 'Reply odds', value: 'High' },
                  ].map((item) => (
                    <div key={item.label} className="rounded-3xl bg-slate-50 p-4 border border-slate-100">
                      <p className="text-[10px] uppercase tracking-[0.22em] text-slate-400 font-black">{item.label}</p>
                      <p className="text-lg font-black text-slate-900 mt-2">{item.value}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-[32px] bg-slate-950 text-white p-6 space-y-4 shadow-[0_32px_80px_-28px_rgba(15,23,42,0.7)]">
                <p className="text-[10px] uppercase tracking-[0.22em] text-slate-500 font-black">Current strategy</p>
                <h3 className="text-2xl font-black tracking-tight">Open with the best photo, then give context fast.</h3>
                <p className="text-sm leading-7 text-slate-300">
                  Tinder and Bumble work because the first frame pulls you in, then the rest of the gallery answers the real question: what would spending time with this person feel like?
                </p>
              </div>
            </div>
          </div>
        </section>

        <aside className="space-y-5 xl:sticky xl:top-6">
          <section className="rounded-[36px] bg-white/92 border border-white shadow-[0_30px_70px_-28px_rgba(15,23,42,0.32)] overflow-hidden">
            <div className="relative aspect-[4/5] bg-slate-200">
              {userPhotos[0] ? (
                <img src={userPhotos[0]} alt="Your profile cover" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-[linear-gradient(180deg,#fda4af_0%,#fb7185_45%,#0f172a_100%)] flex items-end p-6">
                  <div className="w-full rounded-[28px] bg-white/18 backdrop-blur-md border border-white/20 p-5 text-white">
                    <p className="text-3xl font-black tracking-tight">{profile?.firstName || 'You'}</p>
                    <p className="text-sm text-white/80 mt-2">Add a cover photo and this becomes the card people swipe on.</p>
                  </div>
                </div>
              )}

              <div className="absolute inset-x-0 bottom-0 p-5 bg-gradient-to-t from-slate-950/85 via-slate-950/40 to-transparent text-white">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-3xl font-black tracking-tight">{profile?.firstName || 'You'}</h2>
                      <span className="text-2xl font-light text-white/90">{profile?.age || '—'}</span>
                    </div>
                    <p className="text-sm font-semibold text-white/78 mt-2">{profile?.location || 'Add your neighborhood'} • {vibeStyle} vibe</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => userPhotos.length > 0 && openGallery('Your gallery', userPhotos, 0, 'This is what your profile looks like to the next person.')}
                    className="w-12 h-12 rounded-full bg-white/16 backdrop-blur-md border border-white/25 flex items-center justify-center disabled:opacity-30"
                    disabled={userPhotos.length === 0}
                  >
                    <Camera className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-5">
              <div>
                <p className="text-[10px] uppercase tracking-[0.22em] text-slate-400 font-black">Profile note</p>
                <p className="text-sm leading-7 text-slate-600 mt-2">
                  {profile?.bio || 'Write a short bio in onboarding and the card gets dramatically more swipeable.'}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                {(profile?.interests || []).length > 0 ? (
                  (profile?.interests || []).map((interest) => (
                    <span key={interest} className="rounded-full bg-rose-50 text-rose-600 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] border border-rose-100">
                      {interest}
                    </span>
                  ))
                ) : (
                  <span className="rounded-full bg-slate-100 text-slate-500 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] border border-slate-200">
                    Add a few dealbreakers to sharpen recommendations
                  </span>
                )}
              </div>

              <div className="rounded-[28px] bg-slate-50 border border-slate-100 p-4 space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-slate-900">Gallery studio</p>
                    <p className="text-xs text-slate-500 mt-1">Reorder cover shots, remove weak ones, add up to 6.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => uploadInputRef.current?.click()}
                    disabled={isUploadingPhotos || userPhotoPaths.length >= 6}
                    className="rounded-full bg-slate-950 text-white px-4 py-2 text-xs font-black uppercase tracking-[0.2em] disabled:opacity-40 flex items-center gap-2"
                  >
                    <Upload className="w-4 h-4" />
                    {isUploadingPhotos ? 'Uploading' : 'Add'}
                  </button>
                </div>

                {galleryError && <p className="text-sm font-semibold text-rose-500">{galleryError}</p>}

                {userPhotoPaths.length > 0 ? (
                  <div className="grid grid-cols-3 gap-3">
                    {userPhotoPaths.map((photoPath, index) => (
                      <div key={photoPath} className="rounded-[24px] overflow-hidden border border-slate-200 bg-white">
                        <div className="relative aspect-[3/4]">
                          <img src={apiService.getAssetUrl(photoPath)} alt={`Gallery ${index + 1}`} className="w-full h-full object-cover" />
                          {index === 0 && (
                            <span className="absolute left-2 top-2 rounded-full bg-white/92 px-2 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-slate-700">
                              Cover
                            </span>
                          )}
                        </div>
                        <div className="p-2.5 space-y-2 bg-white">
                          <button
                            type="button"
                            onClick={() => makeCoverPhoto(photoPath)}
                            disabled={index === 0 || isSavingGallery}
                            className="w-full rounded-full border border-slate-200 px-2 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-slate-600 disabled:opacity-40"
                          >
                            Make cover
                          </button>
                          <button
                            type="button"
                            onClick={() => removePhoto(photoPath)}
                            disabled={isSavingGallery}
                            className="w-full rounded-full bg-rose-50 px-2 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-rose-500 disabled:opacity-40"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => uploadInputRef.current?.click()}
                    className="w-full rounded-[28px] border border-dashed border-slate-300 bg-white p-6 flex flex-col items-center justify-center gap-3 text-slate-500"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-500 border border-rose-100 flex items-center justify-center">
                      <ImagePlus className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="font-bold text-slate-900">Upload your first photo</p>
                      <p className="text-xs mt-1">Without a gallery, your card looks unfinished.</p>
                    </div>
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-[24px] bg-slate-950 text-white p-4">
                  <p className="text-[10px] uppercase tracking-[0.22em] text-slate-500 font-black">Profile strength</p>
                  <p className="text-2xl font-black mt-2">{Math.min(100, 55 + userPhotoPaths.length * 8)}%</p>
                </div>
                <div className="rounded-[24px] bg-amber-50 text-slate-900 p-4 border border-amber-100">
                  <p className="text-[10px] uppercase tracking-[0.22em] text-amber-700 font-black">Best next move</p>
                  <p className="text-sm font-bold mt-2">Add one candid shot and one full-body photo.</p>
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-[32px] bg-slate-950 text-white p-5 space-y-4 shadow-[0_32px_80px_-28px_rgba(15,23,42,0.7)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] uppercase tracking-[0.22em] text-slate-500 font-black">Matches</p>
                <h3 className="text-2xl font-black tracking-tight mt-2">
                  {matchesCount > 0 ? 'Right swipes now open a real chat.' : 'Your next right swipe starts a persistent thread.'}
                </h3>
                {unreadMatchesCount > 0 && (
                  <p className="text-xs font-bold tracking-[0.18em] uppercase text-rose-200 mt-2">
                    {unreadMatchesCount} unread {unreadMatchesCount === 1 ? 'message' : 'messages'} waiting
                  </p>
                )}
                {profile?.vibeScore?.subcategory && (
                  <p className="text-xs text-white/62 mt-2 max-w-xs leading-5">
                    Discover is currently weighted for a {profile.vibeScore.subcategory.toLowerCase()} looking for {profile.vibeScore.lookingFor?.toLowerCase() || 'real chemistry'}.
                  </p>
                )}
              </div>
              <div className="w-11 h-11 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center text-rose-200">
                <MessageCircleMore className="w-5 h-5" />
              </div>
            </div>

            {matchError && <p className="text-sm font-semibold text-rose-300">{matchError}</p>}

            {matchesCount > 0 ? (
              <>
                <div className="flex gap-3 overflow-x-auto pb-1">
                  {matches.map((match) => {
                    const isActive = activeMatch?.id === match.id;
                    return (
                      <div key={match.id} className="min-w-[188px] space-y-2">
                        <button
                          type="button"
                          onClick={() => void focusMatchThread(match.id)}
                          className={`w-full rounded-[24px] border p-3 text-left transition ${
                            isActive ? 'bg-white text-slate-900 border-white' : 'bg-white/6 border-white/10 text-white'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="relative shrink-0">
                              <img src={match.photos[0]} alt={match.name} className="w-12 h-12 rounded-2xl object-cover bg-slate-200" />
                              {match.unreadCount > 0 && (
                                <span className="absolute -right-1 -top-1 min-w-5 h-5 rounded-full bg-rose-500 px-1 flex items-center justify-center text-[10px] font-black text-white">
                                  {match.unreadCount}
                                </span>
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-2">
                                <p className="text-sm font-black truncate">{match.name}</p>
                                <span className={`shrink-0 text-[10px] font-bold uppercase tracking-[0.16em] ${isActive ? 'text-slate-400' : 'text-white/45'}`}>
                                  {formatMatchTimestamp(match.lastMessageAt)}
                                </span>
                              </div>
                              <p className={`text-xs truncate ${isActive ? 'text-slate-500' : 'text-white/62'}`}>{match.lastMessage}</p>
                            </div>
                          </div>
                        </button>
                        {!isActive && (
                          <button
                            type="button"
                            onClick={() => void handleSimulateReply(match.id)}
                            disabled={simulatingMatchId === match.id}
                            className="w-full rounded-full border border-white/10 bg-white/8 px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-white/80 disabled:opacity-40"
                          >
                            {simulatingMatchId === match.id ? 'Simulating' : 'Simulate reply'}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>

                {activeMatch && (
                  <div className="rounded-[28px] bg-white text-slate-900 p-4 space-y-4">
                    <div className="flex items-center gap-3">
                      <img src={activeMatch.photos[0]} alt={activeMatch.name} className="w-14 h-14 rounded-[20px] object-cover bg-slate-200" />
                      <div>
                        <p className="text-lg font-black text-slate-950">{activeMatch.name}, {activeMatch.age}</p>
                        <p className="text-sm text-slate-500">{activeMatch.job} • {activeMatch.distance}</p>
                      </div>
                    </div>

                    <div className="max-h-[320px] space-y-3 overflow-y-auto pr-1">
                      {activeMatch.messages.map((message) => (
                        <div key={message.id} className={`flex ${message.sender === 'self' ? 'justify-end' : 'justify-start'}`}>
                          <div
                            className={`max-w-[85%] rounded-[22px] px-4 py-3 text-sm leading-6 ${
                              message.sender === 'self'
                                ? 'bg-rose-500 text-white'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            <p>{message.text}</p>
                            <p className={`mt-2 text-[10px] font-bold uppercase tracking-[0.16em] ${
                              message.sender === 'self' ? 'text-white/75' : 'text-slate-400'
                            }`}>
                              {formatMatchTimestamp(message.timestamp)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>

                    <form onSubmit={handleSendMatchMessage} className="flex gap-2">
                      <input
                        value={matchComposer}
                        onChange={(event) => setMatchComposer(event.target.value)}
                        placeholder={`Message ${activeMatch.name}...`}
                        className="flex-1 rounded-full border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-rose-300"
                      />
                      <button
                        type="submit"
                        disabled={isSendingMatchMessage || matchComposer.trim().length === 0}
                        className="rounded-full bg-slate-950 px-4 py-3 text-xs font-black uppercase tracking-[0.18em] text-white disabled:opacity-40"
                      >
                        {isSendingMatchMessage ? 'Sending' : 'Send'}
                      </button>
                    </form>
                  </div>
                )}
              </>
            ) : (
              <div className="rounded-[28px] border border-dashed border-white/15 bg-white/6 p-5 text-sm leading-7 text-slate-300">
                Swipe right on someone in the discover stack and they move straight into a saved conversation here. The thread stays attached to your profile instead of disappearing with the deck animation.
              </div>
            )}
          </section>
        </aside>
      </main>

      <AnimatePresence>
        {matchReveal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-slate-950/70 backdrop-blur-sm p-4 flex items-center justify-center"
          >
            <motion.div
              initial={{ opacity: 0, y: 24, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 24, scale: 0.98 }}
              className="w-full max-w-md overflow-hidden rounded-[36px] bg-white shadow-[0_40px_120px_-30px_rgba(15,23,42,0.6)]"
            >
              <div className="relative aspect-[4/5] bg-slate-200">
                <img src={matchReveal.photos[0]} alt={matchReveal.name} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-b from-slate-950/10 via-transparent to-slate-950/85" />
                <div className="absolute inset-x-0 bottom-0 p-6 text-white">
                  <p className="text-[10px] uppercase tracking-[0.24em] text-rose-200 font-black">It&apos;s a match</p>
                  <h2 className="text-4xl font-black tracking-tight mt-2">{matchReveal.name} wants the first message.</h2>
                  <p className="text-sm leading-7 text-white/80 mt-3">The right swipe did not just rotate the deck. It opened a real chat thread and dropped in their opener.</p>
                </div>
              </div>

              <div className="p-6 space-y-4">
                <div className="rounded-[24px] bg-slate-50 border border-slate-100 p-4 text-sm leading-7 text-slate-600">
                  {matchReveal.messages[0]?.text}
                </div>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setMatchReveal(null)}
                    className="flex-1 rounded-full border border-slate-200 px-4 py-3 text-xs font-black uppercase tracking-[0.18em] text-slate-600"
                  >
                    Keep swiping
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const nextMatchId = matchReveal.id;
                      setMatchReveal(null);
                      void focusMatchThread(nextMatchId);
                    }}
                    className="flex-1 rounded-full bg-slate-950 px-4 py-3 text-xs font-black uppercase tracking-[0.18em] text-white"
                  >
                    Open chat
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {galleryViewer && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm p-4 md:p-8 flex items-center justify-center"
          >
            <motion.div
              initial={{ opacity: 0, y: 18, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 18, scale: 0.98 }}
              className="w-full max-w-5xl rounded-[36px] bg-white overflow-hidden shadow-[0_40px_120px_-30px_rgba(15,23,42,0.6)]"
            >
              <div className="p-5 border-b border-slate-100 flex items-center justify-between gap-4">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.22em] text-slate-400 font-black">Gallery</p>
                  <h2 className="text-2xl font-black text-slate-950 mt-1">{galleryViewer.title}</h2>
                  {galleryViewer.subtitle && <p className="text-sm text-slate-500 mt-2">{galleryViewer.subtitle}</p>}
                </div>
                <button
                  type="button"
                  onClick={() => setGalleryViewer(null)}
                  className="w-11 h-11 rounded-full border border-slate-200 text-slate-500 flex items-center justify-center"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="grid lg:grid-cols-[minmax(0,1fr)_230px]">
                <div className="relative bg-slate-100 min-h-[420px] lg:min-h-[700px]">
                  <img
                    src={galleryViewer.photos[galleryViewer.activeIndex]}
                    alt={`${galleryViewer.title} gallery`}
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => setGalleryViewer((currentViewer) => currentViewer ? {
                      ...currentViewer,
                      activeIndex: (currentViewer.activeIndex - 1 + currentViewer.photos.length) % currentViewer.photos.length,
                    } : currentViewer)}
                    className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/85 border border-white flex items-center justify-center text-slate-700 shadow-sm"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setGalleryViewer((currentViewer) => currentViewer ? {
                      ...currentViewer,
                      activeIndex: (currentViewer.activeIndex + 1) % currentViewer.photos.length,
                    } : currentViewer)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/85 border border-white flex items-center justify-center text-slate-700 shadow-sm"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>

                <div className="p-5 bg-slate-50 border-l border-slate-100 space-y-3 max-h-[700px] overflow-y-auto">
                  {galleryViewer.photos.map((photo, index) => (
                    <button
                      type="button"
                      key={`${galleryViewer.title}-${index}`}
                      onClick={() => setGalleryViewer((currentViewer) => currentViewer ? { ...currentViewer, activeIndex: index } : currentViewer)}
                      className={`w-full rounded-[24px] overflow-hidden border ${
                        index === galleryViewer.activeIndex ? 'border-rose-500' : 'border-white'
                      } bg-white shadow-sm`}
                    >
                      <img src={photo} alt={`Thumbnail ${index + 1}`} className="w-full aspect-[3/4] object-cover" />
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}