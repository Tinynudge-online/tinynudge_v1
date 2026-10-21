'use client';

import React, { useState } from 'react';

const QUESTIONS = [
  'What if you could fly — where would you go first?',
  'What if animals could talk — which one would be your best friend?',
  'What if you could live inside any movie world — which one?',
  'What if you had to eat the same meal every day for a year — what would it be?',
  'What if you woke up invisible — what would you do first?',
  'What if you discovered a brand new planet — what would you name it?',
  'What if you could breathe underwater — where would you explore?',
  'What if you had to give up phones or TV forever — which would you choose?',
  'What if you could speak every language in the world?',
  'What if you had to swap lives with someone for a day — who would it be?',
  'What if you could make one wish come true for the whole world?',
  'What if you could shrink down to the size of an ant?',
  'What if it rained something other than water — what would you want it to rain?',
  'What if you had 100 extra hours every week — what would you do with them?',
  'What if you could go back and witness any moment in history?',
  'What if you could see the dreams of the person next to you?',
  'What if you could control the weather for one week?',
  'What if everything you touched turned a random color?',
  'What if you could only eat foods of one color — which color?',
  'What if dogs could send text messages?',
  'What if you found a treasure map on your doorstep today?',
  'What if you were in charge of your school for one day — what would you change?',
  'What if you had a robot that could do one thing for you — what would it do?',
  'What if you could live in any time period in history?',
  'What if you never needed to sleep again — what would you do with the extra time?',
];

export default function WhatIfQuestionsPage() {
  const [picked, setPicked] = useState<number | null>(null);
  const [used, setUsed] = useState<Set<number>>(new Set());

  const pickRandom = () => {
    const available = QUESTIONS.map((_, i) => i).filter(i => !used.has(i));
    if (available.length === 0) {
      setUsed(new Set());
      const i = Math.floor(Math.random() * QUESTIONS.length);
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
        <h1 className="text-2xl font-bold text-gray-900 mb-1">💭 What If Questions</h1>
        <p className="text-gray-500 text-sm">Playful hypotheticals that get kids and parents thinking big and laughing loud.</p>
      </div>

      <div className="mb-8 print:hidden">
        <button
          onClick={pickRandom}
          className="w-full py-4 rounded-2xl font-semibold text-white text-lg transition-all"
          style={{ background: 'linear-gradient(135deg, #ec4899, #8b5cf6)' }}
        >
          Pick a Random What If 🎲
        </button>
        {picked !== null && (
          <div className="mt-4 bg-white border border-purple-200 rounded-2xl p-6 shadow-sm text-center">
            <p className="text-gray-400 text-xs mb-2">Question {picked + 1} of {QUESTIONS.length}</p>
            <p className="text-gray-900 text-xl font-medium leading-relaxed">{QUESTIONS[picked]}</p>
          </div>
        )}
        {used.size > 0 && (
          <p className="text-center text-xs text-gray-400 mt-3">{used.size} of {QUESTIONS.length} questions used</p>
        )}
      </div>

      <div>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4 print:text-gray-800 print:text-base">
          All 25 What If Questions
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 print:grid-cols-2 print:gap-4">
          {QUESTIONS.map((q, i) => (
            <div
              key={i}
              className="bg-white border border-gray-200 rounded-xl p-4 print:border print:rounded-none print:border-dashed print:border-gray-400 print:p-3"
            >
              <span className="text-xs font-bold text-purple-500 mr-2 print:text-gray-500">#{i + 1}</span>
              <span className="text-sm text-gray-800 leading-relaxed">{q}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
