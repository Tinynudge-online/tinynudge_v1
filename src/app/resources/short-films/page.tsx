'use client';

import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import {
  collection,
  query,
  where,
  getDocs,
  setDoc,
  deleteDoc,
  doc,
} from 'firebase/firestore';
import { auth, db } from '../../firebase';
import Link from 'next/link';

interface Film {
  id: string;
  title: string;
  studio: string;
  year: number;
  duration: string;
  description: string;
  discussionPrompts: string[];
  emoji: string;
  youtubeUrl?: string;
  streamingNote?: string;
}

const FILMS: Film[] = [
  // ── Free on YouTube ──────────────────────────────────────────────
  {
    id: 'hair-love',
    title: 'Hair Love',
    studio: 'Sony Pictures Animation',
    year: 2019,
    duration: '7 min',
    emoji: '💇',
    description: 'An African-American father tries to do his daughter\'s hair for the first time.',
    youtubeUrl: 'https://www.youtube.com/watch?v=kNw8V_Fkw28',
    discussionPrompts: [
      'What do you think the dad was feeling when he couldn\'t get the hair right?',
      'What\'s something you\'ve tried really hard at, even when it was difficult?',
    ],
  },
  {
    id: 'the-present',
    title: 'The Present',
    studio: 'Jacob Frey',
    year: 2014,
    duration: '4 min',
    emoji: '🐾',
    description: 'A boy glued to his video game is given a puppy with a surprise — and a lesson in empathy.',
    youtubeUrl: 'https://www.youtube.com/watch?v=WjqiU5FgsYc',
    discussionPrompts: [
      'Why did the boy not want to play with the puppy at first?',
      'Has something ever surprised you in a way that changed how you felt about it?',
    ],
  },
  {
    id: 'bear-story',
    title: 'Bear Story (Historia de un Oso)',
    studio: 'Punkrobot',
    year: 2014,
    duration: '11 min',
    emoji: '🐻',
    description: 'A bear builds a mechanical diorama to tell the story of being separated from his family — and his longing to return.',
    youtubeUrl: 'https://www.youtube.com/watch?v=QDhrNdwLZxI',
    discussionPrompts: [
      'What do you think the bear missed most about his family?',
      'What would you do if you missed someone a lot and couldn\'t be with them?',
    ],
  },
  {
    id: 'oktapodi',
    title: 'Oktapodi',
    studio: 'GOBELINS',
    year: 2007,
    duration: '3 min',
    emoji: '🐙',
    description: 'Two octopuses go on a wild chase through a Greek island village to stay together.',
    youtubeUrl: 'https://www.youtube.com/watch?v=uhQu4HqT7y8',
    discussionPrompts: [
      'What made this funny even though nobody talked?',
      'What would you do to find someone you really cared about?',
    ],
  },
  {
    id: 'soar',
    title: 'Soar',
    studio: 'Ringling College',
    year: 2015,
    duration: '6 min',
    emoji: '✈️',
    description: 'A young girl discovers a tiny pilot who has crash-landed and helps him build a plane to fly home.',
    youtubeUrl: 'https://www.youtube.com/watch?v=eDkpVwrhYfo',
    discussionPrompts: [
      'What did the girl give up to help the pilot?',
      'When have you helped someone even when it cost you something?',
    ],
  },
  {
    id: 'wishgranter',
    title: 'The Wishgranter',
    studio: 'Ringling College',
    year: 2016,
    duration: '6 min',
    emoji: '🪙',
    description: 'A grumpy wish-granter living under a fountain reluctantly helps a boy and girl find love.',
    youtubeUrl: 'https://www.youtube.com/watch?v=zON0wDD7VJY',
    discussionPrompts: [
      'Why do you think the wishgranter was so grumpy at first?',
      'What\'s a wish you would put in a fountain?',
    ],
  },
  {
    id: 'dia-de-los-muertos',
    title: 'Dia de los Muertos',
    studio: 'Ringling College',
    year: 2013,
    duration: '3 min',
    emoji: '💀',
    description: 'A little girl journeys into the colourful land of the dead to find her grandfather.',
    youtubeUrl: 'https://www.youtube.com/watch?v=jCQnUuq-TEE',
    discussionPrompts: [
      'What do you think happens when we remember people we love?',
      'Is there someone you miss? What do you love about them?',
    ],
  },
  // ── On Disney+ / Streaming ────────────────────────────────────────
  {
    id: 'piper',
    title: 'Piper',
    studio: 'Pixar',
    year: 2016,
    duration: '6 min',
    emoji: '🐦',
    description: 'A hungry sandpiper hatchling ventures from her nest for the first time.',
    streamingNote: 'Disney+',
    discussionPrompts: [
      "What did Piper learn about being brave?",
      "What's something that scared you at first but turned out to be okay?",
    ],
  },
  {
    id: 'bao',
    title: 'Bao',
    studio: 'Pixar',
    year: 2018,
    duration: '8 min',
    emoji: '🥟',
    description: 'A Chinese-Canadian mum gets a second chance at motherhood when her dumpling comes to life.',
    streamingNote: 'Disney+',
    discussionPrompts: [
      'Why do you think the mum felt sad?',
      "What's your favourite thing we do together?",
    ],
  },
  {
    id: 'lou',
    title: 'Lou',
    studio: 'Pixar',
    year: 2017,
    duration: '7 min',
    emoji: '🧸',
    description: 'A lost-and-found creature teaches the playground bully a lesson.',
    streamingNote: 'Disney+',
    discussionPrompts: [
      'Why was the bully being mean?',
      'How do you feel when someone shares with you?',
    ],
  },
  {
    id: 'kitbull',
    title: 'Kitbull',
    studio: 'Pixar',
    year: 2019,
    duration: '9 min',
    emoji: '🐱',
    description: 'An unlikely friendship forms between a stray kitten and an abused pit bull.',
    streamingNote: 'Disney+',
    discussionPrompts: [
      'Why did the kitten take a while to trust the dog?',
      'Has a friendship ever surprised you?',
    ],
  },
  {
    id: 'float',
    title: 'Float',
    studio: 'Pixar',
    year: 2019,
    duration: '9 min',
    emoji: '🎈',
    description: 'A Filipino-American dad discovers his son can float, and tries to hide it from the world.',
    streamingNote: 'Disney+',
    discussionPrompts: [
      'Why was the dad worried about what people thought?',
      'What makes you feel different in a good way?',
    ],
  },
];

export default function ShortFilmsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [watched, setWatched] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState<string | null>(null);
  const [tab, setTab] = useState<'free' | 'streaming'>('free');

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthLoading(false);
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (!user) return;
    loadWatched();
  }, [user]);

  const loadWatched = async () => {
    if (!user) return;
    try {
      const q = query(collection(db, 'watched_films'), where('user_id', '==', user.uid));
      const snap = await getDocs(q);
      setWatched(new Set(snap.docs.map(d => d.data().film_id as string)));
    } catch {}
  };

  const toggleWatched = async (filmId: string) => {
    if (!user) return;
    const docRef = doc(db, 'watched_films', `${user.uid}_${filmId}`);
    if (watched.has(filmId)) {
      await deleteDoc(docRef);
      setWatched(prev => { const n = new Set(prev); n.delete(filmId); return n; });
    } else {
      await setDoc(docRef, { user_id: user.uid, film_id: filmId, watched_at: new Date().toISOString() });
      setWatched(prev => new Set([...prev, filmId]));
    }
  };

  const freeFilms = FILMS.filter(f => !!f.youtubeUrl);
  const streamingFilms = FILMS.filter(f => !f.youtubeUrl);
  const displayFilms = tab === 'free' ? freeFilms : streamingFilms;

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 rounded-full animate-pulse" style={{ background: 'linear-gradient(135deg, #f59e0b, #f97316)' }} />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-sm mx-auto px-4 py-16 text-center">
        <div className="text-5xl mb-4">🎬</div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Sign in to track what you&apos;ve watched</h2>
        <p className="text-gray-500 text-sm mb-6">Your watch history is saved to your account.</p>
        <Link
          href="/"
          className="inline-block px-6 py-3 rounded-xl text-white font-semibold"
          style={{ background: 'linear-gradient(135deg, #f59e0b, #f97316)' }}
        >
          Go to Dashboard to Sign In
        </Link>
      </div>
    );
  }

  const watchedCount = watched.size;

  return (
    <div className="max-w-xl mx-auto px-4 py-8">
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">🎬 Short Films</h1>
        <p className="text-gray-500 text-sm">
          Watch together, then talk about it. Under 12 minutes each.
        </p>
      </div>

      {/* Tab switch */}
      <div className="flex rounded-xl bg-gray-100 p-1 mb-5">
        <button
          onClick={() => setTab('free')}
          className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${tab === 'free' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}
        >
          ▶ Free on YouTube ({freeFilms.length})
        </button>
        <button
          onClick={() => setTab('streaming')}
          className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${tab === 'streaming' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}
        >
          📺 On Disney+ ({streamingFilms.length})
        </button>
      </div>

      {/* Progress */}
      <div className="bg-white border border-amber-200 rounded-2xl p-4 mb-5">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-semibold text-gray-700">Watched</span>
          <span className="text-sm font-bold text-amber-600">{watchedCount} / {FILMS.length}</span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-2">
          <div
            className="h-2 rounded-full transition-all"
            style={{ width: `${(watchedCount / FILMS.length) * 100}%`, background: 'linear-gradient(90deg, #f59e0b, #f97316)' }}
          />
        </div>
      </div>

      {/* Film list */}
      <div className="space-y-3">
        {displayFilms.map(film => {
          const isWatched = watched.has(film.id);
          const isExpanded = expanded === film.id;
          return (
            <div
              key={film.id}
              className={`bg-white border rounded-2xl overflow-hidden transition-all ${isWatched ? 'border-amber-200' : 'border-gray-200'}`}
            >
              <div
                className="p-4 flex items-start gap-3 cursor-pointer"
                onClick={() => setExpanded(isExpanded ? null : film.id)}
              >
                <span className="text-2xl mt-0.5">{film.emoji}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className={`font-semibold text-sm ${isWatched ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
                        {film.title}
                      </h3>
                      <p className="text-xs text-gray-400">{film.studio} · {film.year} · {film.duration}</p>
                    </div>
                    <button
                      onClick={e => { e.stopPropagation(); toggleWatched(film.id); }}
                      className={`flex-shrink-0 w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all ${
                        isWatched ? 'bg-amber-400 border-amber-400 text-white' : 'border-gray-300 hover:border-amber-400'
                      }`}
                    >
                      {isWatched && <span className="text-xs">✓</span>}
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1 leading-relaxed">{film.description}</p>
                </div>
              </div>

              {isExpanded && (
                <div className="px-4 pb-4 pt-0 ml-9 space-y-3">
                  {/* Watch button or streaming note */}
                  {film.youtubeUrl ? (
                    <a
                      href={film.youtubeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90"
                      style={{ background: 'linear-gradient(135deg, #f97316, #ef4444)' }}
                    >
                      ▶ Watch on YouTube — free
                    </a>
                  ) : (
                    <div className="flex items-center gap-2 text-xs text-gray-500 bg-gray-50 rounded-xl px-3 py-2">
                      <span>📺</span>
                      <span>Available on <strong>{film.streamingNote}</strong></span>
                    </div>
                  )}

                  {/* Discussion prompts */}
                  <div className="border-t border-gray-100 pt-3">
                    <p className="text-xs font-semibold text-amber-600 uppercase tracking-wider mb-2">Talk About It</p>
                    <ul className="space-y-1.5">
                      {film.discussionPrompts.map((p, i) => (
                        <li key={i} className="text-xs text-gray-600 flex gap-2">
                          <span className="text-amber-400 flex-shrink-0">›</span>
                          <span>{p}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
