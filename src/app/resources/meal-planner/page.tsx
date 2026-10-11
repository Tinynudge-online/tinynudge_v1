'use client';

import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
} from 'firebase/firestore';
import { auth, db } from '../../firebase';
import Link from 'next/link';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const;
type Day = typeof DAYS[number];
const MEALS = ['Breakfast', 'Lunch', 'Dinner'] as const;
type Meal = typeof MEALS[number];

type MealPlan = Record<Day, Record<Meal, string>>;

const EMPTY_PLAN: MealPlan = Object.fromEntries(
  DAYS.map(d => [d, Object.fromEntries(MEALS.map(m => [m, ''])) as Record<Meal, string>])
) as MealPlan;

const MEAL_IDEAS: string[] = [
  'Pancakes', 'Scrambled eggs', 'Avocado toast', 'Oats with fruit', 'Yoghurt parfait',
  'Cheese toasties', 'Tuna wraps', 'Caesar salad', 'Leftover pasta', 'Soup + bread',
  'Spaghetti bolognese', 'Chicken stir fry', 'Fish tacos', 'Homemade pizza', 'Roast chicken',
  'Veggie curry', 'Beef tacos', 'Salmon + rice', 'Lamb chops', 'BBQ sausages',
];

function getWeekId(offset: number = 0): string {
  const d = new Date();
  d.setDate(d.getDate() - d.getDay() + 1 + offset * 7);
  return d.toISOString().split('T')[0];
}

export default function MealPlannerPage() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [plan, setPlan] = useState<MealPlan>(EMPTY_PLAN);
  const [weekOffset, setWeekOffset] = useState(0);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [editingCell, setEditingCell] = useState<{ day: Day; meal: Meal } | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthLoading(false);
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (!user) return;
    loadPlan();
  }, [user, weekOffset]);

  const weekId = getWeekId(weekOffset);

  const loadPlan = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const ref = doc(db, 'meal_plans', `${user.uid}_${weekId}`);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        setPlan(snap.data().plan as MealPlan);
      } else {
        setPlan(EMPTY_PLAN);
      }
    } finally {
      setLoading(false);
    }
  };

  const savePlan = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const ref = doc(db, 'meal_plans', `${user.uid}_${weekId}`);
      await setDoc(ref, { user_id: user.uid, week_id: weekId, plan, updated_at: new Date().toISOString() });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  const updateMeal = (day: Day, meal: Meal, value: string) => {
    setPlan(prev => ({ ...prev, [day]: { ...prev[day], [meal]: value } }));
  };

  const randomFill = () => {
    const filled = { ...EMPTY_PLAN } as MealPlan;
    DAYS.forEach(d => {
      MEALS.forEach(m => {
        const idx = Math.floor(Math.random() * MEAL_IDEAS.length);
        filled[d][m] = MEAL_IDEAS[idx];
      });
    });
    setPlan(filled);
  };

  const weekLabel = weekOffset === 0 ? 'This Week' : weekOffset === 1 ? 'Next Week' : weekOffset === -1 ? 'Last Week' : `Week of ${weekId}`;

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 rounded-full animate-pulse" style={{ background: 'linear-gradient(135deg, #84cc16, #22c55e)' }} />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-sm mx-auto px-4 py-16 text-center">
        <div className="text-5xl mb-4">🍽️</div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Sign in to save your meal plan</h2>
        <p className="text-gray-500 text-sm mb-6">Your plans are saved per week to your account.</p>
        <Link
          href="/"
          className="inline-block px-6 py-3 rounded-xl text-white font-semibold"
          style={{ background: 'linear-gradient(135deg, #84cc16, #22c55e)' }}
        >
          Go to Dashboard to Sign In
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">🍽️ Meal Planner</h1>
        <p className="text-gray-500 text-sm">Plan family meals for the week. Make cooking a connection ritual — involve the kids!</p>
      </div>

      {/* Week nav */}
      <div className="flex items-center justify-between bg-white border border-gray-200 rounded-2xl px-4 py-3 mb-4">
        <button
          onClick={() => setWeekOffset(prev => prev - 1)}
          className="text-gray-500 hover:text-gray-800 text-lg px-2"
        >
          ←
        </button>
        <div className="text-center">
          <p className="text-sm font-semibold text-gray-900">{weekLabel}</p>
          <p className="text-xs text-gray-400">{weekId}</p>
        </div>
        <button
          onClick={() => setWeekOffset(prev => prev + 1)}
          className="text-gray-500 hover:text-gray-800 text-lg px-2"
        >
          →
        </button>
      </div>

      {/* Action buttons */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={savePlan}
          disabled={saving}
          className="flex-1 py-2.5 rounded-xl font-semibold text-white text-sm disabled:opacity-50"
          style={{ background: 'linear-gradient(135deg, #84cc16, #22c55e)' }}
        >
          {saving ? 'Saving...' : saved ? '✓ Saved!' : 'Save Plan'}
        </button>
        <button
          onClick={randomFill}
          className="px-4 py-2.5 rounded-xl text-sm font-medium bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 transition-colors"
        >
          🎲 Fill Randomly
        </button>
      </div>

      {/* Meal grid */}
      {loading ? (
        <div className="text-center py-12 text-gray-400 text-sm">Loading plan...</div>
      ) : (
        <div className="space-y-3">
          {DAYS.map(day => (
            <div key={day} className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
              <div className="px-4 py-2 bg-gray-50 border-b border-gray-100">
                <h2 className="text-sm font-semibold text-gray-700">{day}</h2>
              </div>
              <div className="grid grid-cols-3 divide-x divide-gray-100">
                {MEALS.map(meal => {
                  const isEditing = editingCell?.day === day && editingCell?.meal === meal;
                  const value = plan[day][meal];
                  return (
                    <div key={meal} className="p-3">
                      <p className="text-xs text-gray-400 mb-1">{meal}</p>
                      {isEditing ? (
                        <div className="relative">
                          <input
                            autoFocus
                            className="w-full text-xs border border-green-300 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-green-400"
                            value={value}
                            onChange={e => updateMeal(day, meal, e.target.value)}
                            onBlur={() => setEditingCell(null)}
                            onKeyDown={e => { if (e.key === 'Enter' || e.key === 'Escape') setEditingCell(null); }}
                            list={`ideas-${day}-${meal}`}
                            placeholder="e.g. Pasta"
                          />
                          <datalist id={`ideas-${day}-${meal}`}>
                            {MEAL_IDEAS.map(idea => <option key={idea} value={idea} />)}
                          </datalist>
                        </div>
                      ) : (
                        <button
                          onClick={() => setEditingCell({ day, meal })}
                          className={`w-full text-left text-xs rounded-lg px-2 py-1.5 transition-colors ${
                            value ? 'text-gray-800 bg-green-50 hover:bg-green-100' : 'text-gray-400 hover:bg-gray-50'
                          }`}
                        >
                          {value || '+ Add meal'}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tip */}
      <div className="mt-6 bg-green-50 border border-green-100 rounded-2xl p-4">
        <p className="text-xs text-green-700 font-semibold mb-1">💡 Tip</p>
        <p className="text-xs text-green-700">Let your child pick one dinner each week and help you cook it. It builds confidence and makes them more likely to eat it!</p>
      </div>
    </div>
  );
}
