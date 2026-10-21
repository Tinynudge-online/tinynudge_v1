import type { Metadata } from 'next';
import Link from 'next/link';
import { Heart } from 'lucide-react';

const SUPPORT_EMAIL = 'tinynudge@gmail.com';

export const metadata: Metadata = {
  title: 'Delete your account',
  description:
    'How to delete your TinyNudge account and data, what gets deleted, and how to cancel an App Store subscription.',
  alternates: { canonical: '/delete-account' },
};

const DELETED_ITEMS = [
  'Your sign-in (email, name and Google or Apple sign-in link)',
  "Your connections, including any child's name you added",
  'Your activity history, streaks and nudge progress',
  'Blind date journal entries, watched films and meal plans',
  'Your email and reminder preferences',
  'Push notification registrations for your devices',
  'Your contact record with our email provider (Loops)',
];

export default function DeleteAccountPage() {
  const mailto = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent('Delete my TinyNudge account')}`;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-2">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 bg-pink-500 rounded-full flex items-center justify-center">
              <Heart className="w-4 h-4 text-white fill-white" />
            </div>
            <span className="text-lg font-semibold text-gray-900">TinyNudge</span>
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-10 space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Delete your TinyNudge account</h1>
          <p className="mt-3 text-gray-600">
            You can delete your account and all of its data at any time, from the app or by email.
          </p>
        </div>

        <section className="bg-white rounded-2xl border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900">Delete it in the app</h2>
          <ol className="mt-4 space-y-2 text-gray-700 list-decimal list-inside">
            <li>Sign in to TinyNudge (in the app or at tinynudge.online).</li>
            <li>
              Open <strong>Account</strong>, then the <strong>Profile</strong> tab.
            </li>
            <li>
              Tap <strong>Delete account</strong> and confirm.
            </li>
          </ol>
          <p className="mt-4 text-gray-600">
            Your account is deleted straight away. This can&apos;t be undone.
          </p>
        </section>

        <section className="bg-white rounded-2xl border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900">What gets deleted</h2>
          <ul className="mt-4 space-y-2 text-gray-700 list-disc list-inside">
            {DELETED_ITEMS.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <p className="mt-4 text-gray-600">
            If you pay through our website, your subscription is cancelled automatically, so you won&apos;t be
            charged again. Our payment provider, Lemon Squeezy, keeps its own payment and invoice records for as long
            as tax law requires. Community counters (such as how many people did a nudge today) are anonymous totals
            and aren&apos;t linked to you.
          </p>
        </section>

        <section className="bg-pink-50 rounded-2xl border border-pink-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900">Subscribed on iPhone?</h2>
          <p className="mt-3 text-gray-700">
            Subscriptions bought through the App Store are managed by Apple, and deleting your account doesn&apos;t
            cancel them. To stop being charged, open <strong>Settings</strong> on your iPhone, tap your name, then{' '}
            <strong>Subscriptions</strong>, choose <strong>TinyNudge</strong> and tap{' '}
            <strong>Cancel Subscription</strong>.
          </p>
        </section>

        <section className="bg-white rounded-2xl border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900">Can&apos;t sign in? Ask us by email</h2>
          <p className="mt-3 text-gray-700">
            Email{' '}
            <a href={mailto} className="text-pink-600 font-medium hover:underline">
              {SUPPORT_EMAIL}
            </a>{' '}
            from the email address you use for TinyNudge, with the subject &ldquo;Delete my TinyNudge account&rdquo;.
            We&apos;ll delete your account and the data listed above, and confirm by email within 30 days.
          </p>
        </section>

        <p className="text-sm text-gray-500 text-center pt-4">
          <Link href="/" className="hover:text-pink-600">
            Back to TinyNudge
          </Link>
        </p>
      </main>
    </div>
  );
}
