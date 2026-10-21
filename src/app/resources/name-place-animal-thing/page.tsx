'use client';

import React, { useState } from 'react';

const ALPHABET = 'ABCDEFGHIJKLMNOPRSTW'.split('');
const CATEGORIES = ['Name', 'Place', 'Animal', 'Thing'] as const;
type Category = typeof CATEGORIES[number];

interface PlayerScore {
  name: string;
  scores: number[];
}

export default function NamePlaceAnimalThingPage() {
  const [players, setPlayers] = useState<PlayerScore[]>([
    { name: 'Player 1', scores: [] },
    { name: 'Player 2', scores: [] },
  ]);
  const [rounds, setRounds] = useState<string[]>([]);
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [currentLetter, setCurrentLetter] = useState<string | null>(null);
  const [phase, setPhase] = useState<'setup' | 'playing' | 'scoring'>('setup');

  const pickLetter = () => {
    const unused = ALPHABET.filter(l => !rounds.includes(l));
    if (unused.length === 0) return;
    const letter = unused[Math.floor(Math.random() * unused.length)];
    setCurrentLetter(letter);
    const newAnswers: Record<string, string[]> = {};
    players.forEach(p => { newAnswers[p.name] = ['', '', '', '']; });
    setAnswers(newAnswers);
    setPhase('playing');
  };

  const updateAnswer = (playerName: string, catIdx: number, val: string) => {
    setAnswers(prev => ({
      ...prev,
      [playerName]: prev[playerName].map((v, i) => i === catIdx ? val : v),
    }));
  };

  const finishRound = () => {
    setPhase('scoring');
  };

  const scoreRound = () => {
    if (!currentLetter) return;
    const newPlayers = players.map(p => {
      let roundScore = 0;
      CATEGORIES.forEach((_, idx) => {
        const myAnswer = (answers[p.name]?.[idx] ?? '').trim().toLowerCase();
        if (!myAnswer) return;
        const others = players.filter(op => op.name !== p.name);
        const duplicate = others.some(op => (answers[op.name]?.[idx] ?? '').trim().toLowerCase() === myAnswer);
        roundScore += duplicate ? 5 : 10;
      });
      return { ...p, scores: [...p.scores, roundScore] };
    });
    setPlayers(newPlayers);
    setRounds(prev => [...prev, currentLetter]);
    setCurrentLetter(null);
    setPhase('setup');
  };

  const addPlayer = () => {
    setPlayers(prev => [...prev, { name: `Player ${prev.length + 1}`, scores: [] }]);
  };

  const removePlayer = (idx: number) => {
    if (players.length <= 2) return;
    setPlayers(prev => prev.filter((_, i) => i !== idx));
  };

  const updatePlayerName = (idx: number, name: string) => {
    setPlayers(prev => prev.map((p, i) => i === idx ? { ...p, name } : p));
  };

  const resetGame = () => {
    setPlayers(players.map(p => ({ ...p, scores: [] })));
    setRounds([]);
    setCurrentLetter(null);
    setPhase('setup');
  };

  const totalScore = (p: PlayerScore) => p.scores.reduce((a, b) => a + b, 0);
  const topScore = Math.max(...players.map(totalScore));

  return (
    <div className="max-w-xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">✏️ Name Place Animal Thing</h1>
        <p className="text-gray-500 text-sm">
          A letter is chosen — everyone races to write a Name, Place, Animal, and Thing starting with it. Unique answer = 10 pts. Shared answer = 5 pts.
        </p>
      </div>

      {/* Scoreboard */}
      {rounds.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-2xl p-4 mb-6">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-sm font-semibold text-gray-700">Scoreboard</h2>
            <span className="text-xs text-gray-400">Rounds: {rounds.join(', ')}</span>
          </div>
          <div className="space-y-2">
            {[...players].sort((a, b) => totalScore(b) - totalScore(a)).map((p, i) => (
              <div key={p.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {totalScore(p) === topScore && <span className="text-yellow-500">👑</span>}
                  <span className="text-sm font-medium text-gray-800">{p.name}</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex gap-1">
                    {p.scores.map((s, idx) => (
                      <span key={idx} className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">{s}</span>
                    ))}
                  </div>
                  <span className="text-sm font-bold text-pink-600 w-8 text-right">{totalScore(p)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Setup phase */}
      {phase === 'setup' && (
        <div className="space-y-4">
          <div className="bg-white border border-gray-200 rounded-2xl p-4">
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-sm font-semibold text-gray-700">Players</h2>
              <button onClick={addPlayer} className="text-xs text-pink-600 hover:text-pink-700 font-medium">+ Add Player</button>
            </div>
            <div className="space-y-2">
              {players.map((p, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <input
                    className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300"
                    value={p.name}
                    onChange={e => updatePlayerName(i, e.target.value)}
                  />
                  {players.length > 2 && (
                    <button onClick={() => removePlayer(i)} className="text-gray-400 hover:text-red-500 text-lg leading-none">×</button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={pickLetter}
            className="w-full py-4 rounded-2xl font-semibold text-white text-lg"
            style={{ background: 'linear-gradient(135deg, #14b8a6, #22c55e)' }}
          >
            {rounds.length === 0 ? 'Start Game — Pick a Letter 🎲' : 'Next Round — Pick a Letter 🎲'}
          </button>

          {rounds.length > 0 && (
            <button onClick={resetGame} className="w-full py-2 text-sm text-gray-400 hover:text-gray-600">
              Reset Scores
            </button>
          )}
        </div>
      )}

      {/* Playing phase */}
      {phase === 'playing' && currentLetter && (
        <div className="space-y-4">
          <div className="text-center py-6">
            <p className="text-sm text-gray-500 mb-1">This round&apos;s letter is</p>
            <div
              className="inline-flex items-center justify-center w-24 h-24 rounded-full text-5xl font-black text-white"
              style={{ background: 'linear-gradient(135deg, #14b8a6, #22c55e)' }}
            >
              {currentLetter}
            </div>
          </div>

          {players.map((p) => (
            <div key={p.name} className="bg-white border border-gray-200 rounded-2xl p-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">{p.name}</h3>
              <div className="grid grid-cols-2 gap-2">
                {CATEGORIES.map((cat, idx) => (
                  <div key={cat}>
                    <label className="block text-xs text-gray-500 mb-1">{cat}</label>
                    <input
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-300"
                      placeholder={`${cat} starting with ${currentLetter}...`}
                      value={answers[p.name]?.[idx] ?? ''}
                      onChange={e => updateAnswer(p.name, idx, e.target.value)}
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}

          <button
            onClick={finishRound}
            className="w-full py-4 rounded-2xl font-semibold text-white text-lg"
            style={{ background: 'linear-gradient(135deg, #14b8a6, #22c55e)' }}
          >
            Stop! Calculate Scores
          </button>
        </div>
      )}

      {/* Scoring phase */}
      {phase === 'scoring' && currentLetter && (
        <div className="space-y-4">
          <h2 className="text-base font-semibold text-gray-900">Review Answers — Round {currentLetter}</h2>
          {CATEGORIES.map((cat, catIdx) => (
            <div key={cat} className="bg-white border border-gray-200 rounded-2xl p-4">
              <h3 className="text-sm font-semibold text-gray-600 mb-2">{cat}</h3>
              <div className="space-y-1">
                {players.map(p => {
                  const myAnswer = (answers[p.name]?.[catIdx] ?? '').trim();
                  const isDuplicate = myAnswer && players
                    .filter(op => op.name !== p.name)
                    .some(op => (answers[op.name]?.[catIdx] ?? '').trim().toLowerCase() === myAnswer.toLowerCase());
                  const pts = !myAnswer ? 0 : isDuplicate ? 5 : 10;
                  return (
                    <div key={p.name} className="flex justify-between items-center text-sm">
                      <span className="text-gray-700">{p.name}: <span className="font-medium">{myAnswer || '—'}</span></span>
                      <span className={`font-bold ${pts === 10 ? 'text-green-600' : pts === 5 ? 'text-amber-600' : 'text-gray-400'}`}>
                        {pts > 0 ? `+${pts}` : '0'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
          <button
            onClick={scoreRound}
            className="w-full py-4 rounded-2xl font-semibold text-white text-lg"
            style={{ background: 'linear-gradient(135deg, #14b8a6, #22c55e)' }}
          >
            Confirm Scores ✓
          </button>
        </div>
      )}
    </div>
  );
}
