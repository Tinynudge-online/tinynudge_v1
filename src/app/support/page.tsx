import type { Metadata } from 'next';
import Link from 'next/link';
import { Heart, Mail } from 'lucide-react';

const SUPPORT_EMAIL = 'tinynudge@gmail.com';

export const metadata: Metadata = {
  title: 'Support',
  description:
    'Get help with TinyNudge: contact support, manage or cancel your subscription, delete your account, reset your password and set up notifications.',
  alternates: { canonical: '/support' },
};

const FAQS: { q: string; a: React.ReactNode }[] = [
  {
    q: 'How do I manage or cancel a subscription I bought on the website?',
    a: (
      <>
        Web subscriptions are billed by Lemon Squeezy. Use the &quot;Manage subscription&quot; link in your Lemon
        Squeezy receipt or billing email to update your card or cancel. You can also email us and we will cancel it
        for you. You keep Premium until the end of the period you have paid for.
      </>
    ),
  },
  {
    q: 'How do I manage or cancel a subscription I bought on my iPhone?',
    a: (
      <>
        iPhone subscriptions are billed by Apple, so only Apple can change or cancel them. On your iPhone open{' '}
        <strong>Settings &gt; [your name] &gt; Subscriptions &gt; TinyNudge</strong>. To cancel a free trial without
        being charged, cancel at least 24 hours before it ends. For refunds, go to reportaproblem.apple.com.
      </>
    ),
  },
  {
    q: 'Can I buy Premium in the Android app?',
    a: (
      <>
        Not at the moment. If you already have Premium from the website, sign in to the Android app with the same
        account and it will be unlocked.
      </>
    ),
  },
  {
    q: 'How do I delete my account?',
    a: (
      <>
        In TinyNudge, go to <strong>Account &gt; Profile &gt; Delete account</strong>. This permanently deletes your
        account and data and cancels any web subscription. If you can&apos;t sign in, see our{' '}
        <Link href="/delete-account" className="text-pink-600 underline">delete account page</Link>. If you subscribed
        on iPhone, cancel in iPhone Settings first, because deleting your account does not stop Apple billing.
      </>
    ),
  },
  {
    q: 'I forgot my password. How do I reset it?',
    a: (
      <>
        If you signed in with Google or Apple, you don&apos;t have a TinyNudge password: use that button again, and
        manage your password with Google or Apple. If you signed up with email and password, email us from the
        address on your account and we will send you a password reset link.
      </>
    ),
  },
  {
    q: 'How do I change or turn off reminder emails?',
    a: (
      <>
        Go to <strong>Account &gt; Email</strong> to choose your reminder time and which emails you get. Every email
        also has an unsubscribe link at the bottom.
      </>
    ),
  },
  {
    q: 'How do I turn push notifications on or off?',
    a: (
      <>
        Turn them on from the notifications button in TinyNudge and allow notifications when your device asks. To
        turn them off, use your browser&apos;s site settings or, on iPhone, <strong>Settings &gt; Notifications &gt;
        TinyNudge</strong>. If you don&apos;t get notifications, check that your device isn&apos;t in Do Not Disturb
        or Focus mode and that notifications are allowed for TinyNudge.
      </>
    ),
  },
  {
    q: 'Is my child’s information safe?',
    a: (
      <>
        Adding your child&apos;s first name is optional. It stays in TinyNudge&apos;s own database and is never shared
        with our email provider or anyone else. See our{' '}
        <Link href="/privacy" className="text-pink-600 underline">Privacy Policy</Link> for details.
      </>
    ),
  },
];

export default function SupportPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 bg-pink-500 rounded-full flex items-center justify-center">
              <Heart className="w-4 h-4 text-white fill-white" />
            </div>
            <span className="text-lg font-semibold text-gray-900">TinyNudge</span>
          </Link>
          <nav className="flex gap-4 text-sm text-gray-600">
            <Link href="/privacy" className="hover:text-pink-600">Privacy</Link>
            <Link href="/terms" className="hover:text-pink-600">Terms</Link>
          </nav>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-10">
        <h1 className="text-3xl font-bold text-gray-900">Support</h1>
        <p className="mt-4 text-gray-700 leading-relaxed">
          Need a hand? Check the answers below, or get in touch. We usually reply within 2 business days.
        </p>

        <a
          href={`mailto:${SUPPORT_EMAIL}?subject=TinyNudge%20support`}
          className="mt-6 inline-flex items-center gap-2 bg-pink-500 hover:bg-pink-600 text-white font-semibold px-5 py-3 rounded-xl transition-colors"
        >
          <Mail className="w-5 h-5" />
          {SUPPORT_EMAIL}
        </a>
        <p className="mt-3 text-sm text-gray-500">
          Please email from the address you use for TinyNudge, and tell us whether you use the website, iPhone app or
          Android app.
        </p>

        <h2 className="mt-12 text-xl font-bold text-gray-900">Frequently asked questions</h2>
        <div className="mt-4 space-y-3">
          {FAQS.map(({ q, a }) => (
            <details key={q} className="group bg-white rounded-2xl border border-gray-200 p-5">
              <summary className="cursor-pointer font-semibold text-gray-900 list-none flex justify-between items-center gap-4">
                {q}
                <span className="text-pink-500 text-xl leading-none group-open:rotate-45 transition-transform">+</span>
              </summary>
              <div className="mt-3 text-gray-700 leading-relaxed">{a}</div>
            </details>
          ))}
        </div>

        <footer className="mt-14 pt-6 border-t border-gray-200 flex flex-wrap gap-4 text-sm text-gray-500">
          <Link href="/" className="hover:text-pink-600">Home</Link>
          <Link href="/privacy" className="hover:text-pink-600">Privacy Policy</Link>
          <Link href="/terms" className="hover:text-pink-600">Terms of Service</Link>
          <Link href="/delete-account" className="hover:text-pink-600">Delete account</Link>
        </footer>
      </main>
    </div>
  );
}
