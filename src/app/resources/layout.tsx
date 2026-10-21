'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Heart, ArrowLeft, Printer } from 'lucide-react';


export default function ResourcesLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  const handleBack = () => {
    const params = new URLSearchParams(window.location.search);

    if (params.get('returnTo') === 'nudges') {
      const returnParams = new URLSearchParams({ open: 'nudges' });
      const connectionId = params.get('connectionId');
      const activityId = params.get('activityId');

      if (connectionId) returnParams.set('connectionId', connectionId);
      if (activityId) returnParams.set('activityId', activityId);

      router.push(`/?${returnParams.toString()}`);
      return;
    }

    router.back();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="fixed top-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-b border-gray-200 z-50 flex justify-between items-center px-4 py-3">
        <div className="flex items-center gap-3">
          <button
            onClick={handleBack}
            className="flex items-center gap-2 text-gray-600 hover:text-pink-600 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm font-medium">Back</span>
          </button>
          <div className="w-px h-5 bg-gray-300" />
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-pink-500 rounded-full flex items-center justify-center">
              <Heart className="w-3.5 h-3.5 text-white fill-white" />
            </div>
            <span className="text-base font-semibold text-gray-900">Resources</span>
          </div>
        </div>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 text-sm text-gray-600 hover:text-pink-600 transition-colors px-3 py-1.5 rounded-lg hover:bg-pink-50 print:hidden"
        >
          <Printer className="w-4 h-4" />
          Print
        </button>
      </header>
      <main className="pt-16">
        {children}
      </main>
    </div>
  );
}
