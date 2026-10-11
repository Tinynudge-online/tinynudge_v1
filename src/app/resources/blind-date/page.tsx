'use client';

import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  addDoc,
  deleteDoc,
  doc,
} from 'firebase/firestore';
import { auth, db } from '../../firebase';
import Link from 'next/link';

interface DateEntry {
  id: string;
  user_id: string;
  date_name: string;
  date_date: string;
  notes: string;
  rating: number;
  created_at: string;
}

const DATE_IDEAS = [
  'Backyard Picnic under the Stars',
  'Home Movie Marathon with Popcorn Bar',
  'Build a Fort and Tell Stories Inside',
  'Cooking Competition — same ingredients, different dish',
  'Sunrise Breakfast Walk',
  'Art Afternoon — paint anything you like',
  'Library Treasure Hunt',
  'Bake Something Neither of You Has Tried Before',
  'Scavenger Hunt Around the House',
  'Board Game Tournament',
];

export default function BlindDatePage() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [entries, setEntries] = useState<DateEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ date_name: '', date_date: '', notes: '', rating: 5 });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthLoading(false);
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (!user) return;
    loadEntries();
  }, [user]);

  const loadEntries = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const q = query(
        collection(db, 'blind_date_entries'),
        where('user_id', '==', user.uid),
        orderBy('created_at', 'desc')
      );
      const snap = await getDocs(q);
      setEntries(snap.docs.map(d => ({ id: d.id, ...d.data() } as DateEntry)));
    } finally {
      setLoading(false);
    }
  };

  const saveEntry = async () => {
    if (!user || !form.date_name.trim()) return;
    setSaving(true);
    try {
      await addDoc(collection(db, 'blind_date_entries'), {
        user_id: user.uid,
        date_name: form.date_name.trim(),
        date_date: form.date_date,
        notes: form.notes.trim(),
        rating: form.rating,
        created_at: new Date().toISOString(),
      });
      setForm({ date_name: '', date_date: '', notes: '', rating: 5 });
      setShowForm(false);
      await loadEntries();
    } finally {
      setSaving(false);
    }
  };

  const deleteEntry = async (id: string) => {
    await deleteDoc(doc(db, 'blind_date_entries', id));
    setEntries(prev => prev.filter(e => e.id !== id));
  };

  const pickRandom = () => {
    const idea = DATE_IDEAS[Math.floor(Math.random() * DATE_IDEAS.length)];
    setForm(prev => ({ ...prev, date_name: idea }));
    setShowForm(true);
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 rounded-full animate-pulse" style={{ background: 'linear-gradient(135deg, #f97316, #ec4899)' }} />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-sm mx-auto px-4 py-16 text-center">
        <div className="text-5xl mb-4">💌</div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Sign in to keep your journal</h2>
        <p className="text-gray-500 text-sm mb-6">Your date memories are saved to your account.</p>
        <Link
          href="/"
          className="inline-block px-6 py-3 rounded-xl text-white font-semibold"
          style={{ background: 'linear-gradient(135deg, #f97316, #ec4899)' }}
        >
          Go to Dashboard to Sign In
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">💌 Blind Date Journal</h1>
        <p className="text-gray-500 text-sm">Plan surprise parent-child dates and keep a log of your memories together.</p>
      </div>

      {/* CTA Buttons */}
      <div className="flex gap-3 mb-6">
        <button
          onClick={() => setShowForm(true)}
          className="flex-1 py-3 rounded-xl font-semibold text-white text-sm"
          style={{ background: 'linear-gradient(135deg, #f43f5e, #ec4899)' }}
        >
          + Log a Date
        </button>
        <button
          onClick={pickRandom}
          className="flex-1 py-3 rounded-xl font-semibold text-sm bg-pink-50 text-pink-600 hover:bg-pink-100 border border-pink-200 transition-colors"
        >
          🎲 Surprise Me
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white border border-pink-200 rounded-2xl p-5 mb-6 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-800 mb-4">New Date Entry</h2>
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Date Name / Activity</label>
              <input
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300"
                placeholder="e.g. Backyard Picnic under the Stars"
                value={form.date_name}
                onChange={e => setForm(prev => ({ ...prev, date_name: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Date (optional)</label>
              <input
                type="date"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300"
                value={form.date_date}
                onChange={e => setForm(prev => ({ ...prev, date_date: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Notes / Memories</label>
              <textarea
                rows={3}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300 resize-none"
                placeholder="What happened? What did they say? What made you laugh?"
                value={form.notes}
                onChange={e => setForm(prev => ({ ...prev, notes: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Rating</label>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map(n => (
                  <button
                    key={n}
                    onClick={() => setForm(prev => ({ ...prev, rating: n }))}
                    className={`text-2xl transition-transform hover:scale-110 ${n <= form.rating ? 'opacity-100' : 'opacity-30'}`}
                  >
                    ⭐
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button
              onClick={saveEntry}
              disabled={saving || !form.date_name.trim()}
              className="flex-1 py-2.5 rounded-xl text-white font-medium text-sm disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #f43f5e, #ec4899)' }}
            >
              {saving ? 'Saving...' : 'Save Memory'}
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="px-4 py-2.5 rounded-xl text-gray-500 text-sm hover:bg-gray-100"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Ideas */}
      <div className="bg-pink-50 border border-pink-100 rounded-2xl p-4 mb-6">
        <h2 className="text-sm font-semibold text-pink-700 mb-2">Date Ideas</h2>
        <div className="flex flex-wrap gap-2">
          {DATE_IDEAS.map((idea, i) => (
            <button
              key={i}
              onClick={() => { setForm(prev => ({ ...prev, date_name: idea })); setShowForm(true); }}
              className="text-xs bg-white border border-pink-200 text-pink-700 px-2.5 py-1 rounded-full hover:bg-pink-100 transition-colors"
            >
              {idea}
            </button>
          ))}
        </div>
      </div>

      {/* Journal entries */}
      {loading ? (
        <div className="text-center py-8 text-gray-400 text-sm">Loading your journal...</div>
      ) : entries.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-4xl mb-3">💌</div>
          <p className="text-gray-500 text-sm">No dates logged yet. Plan your first one!</p>
        </div>
      ) : (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Your Date Journal</h2>
          {entries.map(entry => (
            <div key={entry.id} className="bg-white border border-gray-200 rounded-2xl p-4">
              <div className="flex justify-between items-start mb-1">
                <h3 className="font-semibold text-gray-900 text-sm">{entry.date_name}</h3>
                <button
                  onClick={() => deleteEntry(entry.id)}
                  className="text-gray-300 hover:text-red-400 text-xs ml-2"
                >
                  ✕
                </button>
              </div>
              <div className="flex items-center gap-3 mb-2">
                <span className="text-sm">{'⭐'.repeat(entry.rating)}</span>
                {entry.date_date && (
                  <span className="text-xs text-gray-400">{new Date(entry.date_date).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                )}
              </div>
              {entry.notes && <p className="text-sm text-gray-600 leading-relaxed">{entry.notes}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
