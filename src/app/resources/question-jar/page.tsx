'use client';

import React, { useState } from 'react';

const QUESTIONS = [
  'What made you smile today?',
  'If you could be any animal, what would you be and why?',
  "What's your favorite memory from this week?",
  'If you could go anywhere in the world, where would you go?',
  "What's something you're really good at?",
  "What's your favorite thing to do on weekends?",
  'If you could have one superpower, what would it be?',
  "What's the funniest thing that happened to you lately?",
  "What's something you want to learn how to do?",
  'Who is your hero and why?',
  "What's your favorite food, and would you eat it every single day?",
  'If you could change one thing about school, what would it be?',
  "What's something that made you feel really proud recently?",
  'If you had a time machine, where would you go?',
  "What's your favorite season and why?",
  'What do you think makes a really good friend?',
  'If you could invent something, what would you make?',
  "What's something you're looking forward to?",
  "What's the best gift you've ever received?",
  'If you could talk to any animal, what would you ask it?',
  "What's something you find really interesting that most people don't know about?",
  'Who do you think has the hardest job in the world?',
  "What's a random act of kindness you could do tomorrow?",
  'If you had a whole free day to do anything, what would you do?',
  "What's your favorite thing about our family?",
  "What's something that always makes you feel better when you're sad?",
  'If you could meet any person — alive or from history — who would it be?',
  "What's something you think is unfair?",
  "What's your favorite thing about yourself?",
  "What's one thing you want to do before you grow up?",
];

export default function QuestionJarPage() {
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
        <h1 className="text-2xl font-bold text-gray-900 mb-1">🫙 Question Jar</h1>
        <p className="text-gray-500 text-sm">Pick a random question or print the full list to cut up and put in a jar.</p>
      </div>

      {/* Random picker — hidden when printing */}
      <div className="mb-8 print:hidden">
        <button
          onClick={pickRandom}
          className="w-full py-4 rounded-2xl font-semibold text-white text-lg transition-all"
          style={{ background: 'linear-gradient(135deg, #f97316, #ec4899)' }}
        >
          Pick a Random Question 🎲
        </button>
        {picked !== null && (
          <div className="mt-4 bg-white border border-pink-200 rounded-2xl p-6 shadow-sm text-center">
            <p className="text-gray-400 text-xs mb-2">Question {picked + 1} of {QUESTIONS.length}</p>
            <p className="text-gray-900 text-xl font-medium leading-relaxed">{QUESTIONS[picked]}</p>
          </div>
        )}
        {used.size > 0 && (
          <p className="text-center text-xs text-gray-400 mt-3">{used.size} of {QUESTIONS.length} questions used</p>
        )}
      </div>

      {/* Full list — always printed */}
      <div>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4 print:text-gray-800 print:text-base">
          All 30 Questions
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 print:grid-cols-2 print:gap-4">
          {QUESTIONS.map((q, i) => (
            <div
              key={i}
              className="bg-white border border-gray-200 rounded-xl p-4 print:border print:rounded-none print:border-dashed print:border-gray-400 print:p-3"
            >
              <span className="text-xs font-bold text-pink-500 mr-2 print:text-gray-500">#{i + 1}</span>
              <span className="text-sm text-gray-800 leading-relaxed">{q}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
