'use client';

import React from 'react';
import Link from 'next/link';

interface ResourceCard {
  href: string;
  emoji: string;
  title: string;
  description: string;
  tag: string;
  gradient: string;
}

const RESOURCES: ResourceCard[] = [
  {
    href: '/resources/question-jar',
    emoji: '🫙',
    title: 'Question Jar',
    description: '30 conversation-starting questions to spark real talk at any age.',
    tag: 'Printable',
    gradient: 'from-orange-400 to-pink-500',
  },
  {
    href: '/resources/what-if-questions',
    emoji: '💭',
    title: 'What If Questions',
    description: '25 playful hypotheticals that get kids (and parents) thinking big.',
    tag: 'Printable',
    gradient: 'from-pink-400 to-purple-500',
  },
  {
    href: '/resources/story-chain',
    emoji: '📖',
    title: 'Story Chain',
    description: '15 story starters to build wild tales together, one sentence at a time.',
    tag: 'Printable',
    gradient: 'from-purple-400 to-blue-500',
  },
  {
    href: '/resources/high-low-buffalo',
    emoji: '🦬',
    title: 'High Low Buffalo',
    description: 'Share the best, worst, and weirdest part of your day over dinner.',
    tag: 'Printable',
    gradient: 'from-blue-400 to-teal-500',
  },
  {
    href: '/resources/name-place-animal-thing',
    emoji: '✏️',
    title: 'Name Place Animal Thing',
    description: 'The classic alphabet game with a live scoreboard for the whole family.',
    tag: 'Interactive',
    gradient: 'from-teal-400 to-green-500',
  },
  {
    href: '/resources/blind-date',
    emoji: '💌',
    title: 'Blind Date Journal',
    description: 'Plan surprise parent-child date nights and keep a log of memories.',
    tag: 'Journal',
    gradient: 'from-rose-400 to-pink-500',
  },
  {
    href: '/resources/short-films',
    emoji: '🎬',
    title: 'Short Films',
    description: '12 family-friendly short films to watch and discuss together.',
    tag: 'Watch Together',
    gradient: 'from-amber-400 to-orange-500',
  },
  {
    href: '/resources/meal-planner',
    emoji: '🍽️',
    title: 'Meal Planner',
    description: 'Plan family meals for the week and make cooking a connection ritual.',
    tag: 'Planner',
    gradient: 'from-lime-400 to-green-500',
  },
];

const TAG_STYLES: Record<string, string> = {
  Printable: 'bg-blue-100 text-blue-700',
  Interactive: 'bg-purple-100 text-purple-700',
  Journal: 'bg-pink-100 text-pink-700',
  'Watch Together': 'bg-amber-100 text-amber-700',
  Planner: 'bg-green-100 text-green-700',
};

export default function ResourcesPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Family Resources</h1>
        <p className="text-gray-500 text-base">
          Tools, games, and activities to make every day a little more connected.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {RESOURCES.map((r) => (
          <Link
            key={r.href}
            href={r.href}
            className="group bg-white rounded-2xl shadow-sm border border-gray-200 hover:shadow-md hover:border-pink-200 transition-all duration-200 overflow-hidden"
          >
            <div className={`h-2 bg-gradient-to-r ${r.gradient}`} />
            <div className="p-5">
              <div className="flex items-start justify-between mb-3">
                <span className="text-3xl">{r.emoji}</span>
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${TAG_STYLES[r.tag] ?? 'bg-gray-100 text-gray-600'}`}>
                  {r.tag}
                </span>
              </div>
              <h2 className="text-base font-semibold text-gray-900 mb-1 group-hover:text-pink-600 transition-colors">
                {r.title}
              </h2>
              <p className="text-sm text-gray-500 leading-relaxed">{r.description}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
