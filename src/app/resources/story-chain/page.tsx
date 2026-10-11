'use client';

import React, { useState } from 'react';

const STARTERS = [
  'Once upon a time, a dragon knocked on the front door and said...',
  'The last cookie in the jar suddenly sat up and said...',
  'On the way to school, we found a glowing map that led to...',
  'A tiny silver spaceship landed in our garden and out walked...',
  'The clouds turned purple and began to rain something unexpected...',
  'My dog had always been able to talk — but today was the first time she used it to say...',
  'We were walking in the park when the ground started to rumble and...',
  'There was a knock at midnight. When we opened the door, we found...',
  'The painting in the museum slowly blinked, then leaned forward and whispered...',
  'We dug a hole in the backyard and discovered a hidden door that led to...',
  'The postman delivered a large box with air holes in the side. Inside was...',
  'I woke up with the strange ability to understand what plants were saying. The first one said...',
  'A rusty time capsule was found buried under our garden. Inside it contained...',
  'Our car broke down in the middle of a forest where every tree was a different candy colour and...',
  'A message in a bottle washed up on the beach and when we unrolled it, it read...',
];

export default function StoryChainPage() {
  const [picked, setPicked] = useState<number | null>(null);
  const [used, setUsed] = useState<Set<number>>(new Set());

  const pickRandom = () => {
    const available = STARTERS.map((_, i) => i).filter(i => !used.has(i));
    if (available.length === 0) {
      setUsed(new Set());
      const i = Math.floor(Math.random() * STARTERS.length);
      setPicked(i);
      return;
    }
    const i = available[Math.floor(Math.random() * available.length)];
    setPicked(i);
    setUsed(prev => new Set([...prev, i]));
  };

  return (
    <div className="max-w-xl mx-auto px-4 py-8 print:py-4">
      <div className="mb-6 print:hidden">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">📖 Story Chain</h1>
        <p className="text-gray-500 text-sm">
          One person reads the starter, then take turns adding one sentence each. See where the story goes!
        </p>
      </div>

      <div className="mb-6 bg-white border border-purple-100 rounded-2xl p-5 print:hidden">
        <h2 className="text-sm font-semibold text-purple-700 mb-2">How to play</h2>
        <ol className="text-sm text-gray-600 space-y-1 list-decimal list-inside">
          <li>Pick a starter (random or from the list below).</li>
          <li>The first person reads it aloud.</li>
          <li>Each person adds one sentence — no stopping allowed!</li>
          <li>Keep going until the story feels complete (or gets too silly to continue).</li>
        </ol>
      </div>

      <div className="mb-8 print:hidden">
        <button
          onClick={pickRandom}
          className="w-full py-4 rounded-2xl font-semibold text-white text-lg transition-all"
          style={{ background: 'linear-gradient(135deg, #8b5cf6, #3b82f6)' }}
        >
          Pick a Random Starter 🎲
        </button>
        {picked !== null && (
          <div className="mt-4 bg-white border border-blue-200 rounded-2xl p-6 shadow-sm">
            <p className="text-gray-400 text-xs mb-2">Starter {picked + 1} of {STARTERS.length}</p>
            <p className="text-gray-900 text-xl font-medium leading-relaxed italic">"{STARTERS[picked]}"</p>
            <p className="text-gray-400 text-sm mt-3">...now continue the story!</p>
          </div>
        )}
      </div>

      <div>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4 print:text-gray-800 print:text-base">
          All 15 Story Starters
        </h2>
        <div className="space-y-3 print:grid print:grid-cols-2 print:gap-4 print:space-y-0">
          {STARTERS.map((s, i) => (
            <div
              key={i}
              className="bg-white border border-gray-200 rounded-xl p-4 print:border print:rounded-none print:border-dashed print:border-gray-400 print:p-3"
            >
              <span className="text-xs font-bold text-blue-500 print:text-gray-500">Story {i + 1}</span>
              <p className="text-sm text-gray-800 leading-relaxed mt-1 italic">"{s}"</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
