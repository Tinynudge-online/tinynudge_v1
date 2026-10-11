'use client';

import React from 'react';

export default function HighLowBuffaloPage() {
  return (
    <div className="max-w-xl mx-auto px-4 py-8 print:py-4">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">🦬 High Low Buffalo</h1>
        <p className="text-gray-500 text-sm">A 5-minute dinner-table ritual to stay connected every single day.</p>
      </div>

      {/* Cards */}
      <div className="space-y-4 mb-8">
        <div className="bg-green-50 border border-green-200 rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-2xl">⬆️</span>
            <h2 className="text-lg font-bold text-green-700">High</h2>
          </div>
          <p className="text-green-800 text-sm leading-relaxed">
            Share the <strong>best part of your day</strong>. It could be a moment, a feeling, something someone said, or something you achieved — big or small.
          </p>
          <p className="text-green-600 text-xs mt-3 italic">Example: "My high was when my teacher said my drawing was really creative."</p>
        </div>

        <div className="bg-red-50 border border-red-200 rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-2xl">⬇️</span>
            <h2 className="text-lg font-bold text-red-700">Low</h2>
          </div>
          <p className="text-red-800 text-sm leading-relaxed">
            Share the <strong>hardest or least favourite part of your day</strong>. This is a safe space — no fixing, no judging, just listening and understanding.
          </p>
          <p className="text-red-600 text-xs mt-3 italic">Example: "My low was that I couldn't figure out the maths problem and felt frustrated."</p>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-2xl">🦬</span>
            <h2 className="text-lg font-bold text-amber-700">Buffalo</h2>
          </div>
          <p className="text-amber-800 text-sm leading-relaxed">
            Share something <strong>random, weird, unexpected, or funny</strong> that happened today. The buffalo is the wildcard — it keeps things light and surprising.
          </p>
          <p className="text-amber-600 text-xs mt-3 italic">Example: "My buffalo was that a pigeon walked into our classroom and nobody moved for a full minute."</p>
        </div>
      </div>

      {/* Rules */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5 mb-6">
        <h2 className="text-sm font-semibold text-gray-900 mb-3">The Two Rules</h2>
        <ul className="text-sm text-gray-600 space-y-2">
          <li className="flex gap-2">
            <span className="text-pink-500 font-bold">1.</span>
            <span><strong>Everyone shares</strong> — parents included. No observers.</span>
          </li>
          <li className="flex gap-2">
            <span className="text-pink-500 font-bold">2.</span>
            <span><strong>No advice unless asked.</strong> Just listen, nod, and ask a follow-up question.</span>
          </li>
        </ul>
      </div>

      {/* Printable table */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5 print:border-2">
        <h2 className="text-sm font-semibold text-gray-700 mb-4 print:text-base">Tonight&apos;s Table</h2>
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-2 pr-4 text-gray-500 font-medium w-1/4">Name</th>
              <th className="text-left py-2 pr-4 text-green-600 font-medium">⬆️ High</th>
              <th className="text-left py-2 pr-4 text-red-600 font-medium">⬇️ Low</th>
              <th className="text-left py-2 text-amber-600 font-medium">🦬 Buffalo</th>
            </tr>
          </thead>
          <tbody>
            {['', '', '', ''].map((_, i) => (
              <tr key={i} className="border-b border-gray-100">
                <td className="py-4 pr-4"><div className="h-px bg-gray-200 mt-3 w-20" /></td>
                <td className="py-4 pr-4"><div className="h-px bg-gray-200 mt-3 w-full" /></td>
                <td className="py-4 pr-4"><div className="h-px bg-gray-200 mt-3 w-full" /></td>
                <td className="py-4"><div className="h-px bg-gray-200 mt-3 w-full" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
