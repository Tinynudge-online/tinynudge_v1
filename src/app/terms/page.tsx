import type { Metadata } from 'next';
import Link from 'next/link';
import { Heart } from 'lucide-react';

const SUPPORT_EMAIL = 'tinynudge@gmail.com';
const LAST_UPDATED = '2026-10-17';

export const metadata: Metadata = {
  title: 'Terms of Service',
  description:
    'The terms for using TinyNudge, including subscriptions, free trials, billing on the web and iPhone, and cancellation.',
  alternates: { canonical: '/terms' },
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="text-xl font-bold text-gray-900 mb-3">{title}</h2>
      <div className="space-y-3 text-gray-700 leading-relaxed">{children}</div>
    </section>
  );
}

export default function TermsPage() {
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
            <Link href="/support" className="hover:text-pink-600">Support</Link>
          </nav>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-10">
        <h1 className="text-3xl font-bold text-gray-900">Terms of Service</h1>
        <p className="mt-2 text-sm font-medium text-pink-600">Last updated: {LAST_UPDATED}</p>

        <p className="mt-6 text-gray-700 leading-relaxed">
          These terms are an agreement between you and TinyNudge (&quot;we&quot;, &quot;us&quot;) for your use of the
          TinyNudge website (tinynudge.online) and our iPhone and Android apps (together, the &quot;Service&quot;). By
          creating an account or using the Service you agree to these terms and to our{' '}
          <Link href="/privacy" className="text-pink-600 underline">Privacy Policy</Link>. If you don&apos;t agree,
          please don&apos;t use the Service.
        </p>

        <Section title="1. Who can use TinyNudge">
          <p>TinyNudge is for adults. You must be at least 18 years old (or the age of majority where you live) to
            create an account. The Service is designed for parents and caregivers and is not directed to children.
            You are responsible for keeping your sign-in details secure and for activity on your account.</p>
        </Section>

        <Section title="2. The Service">
          <p>TinyNudge gives you short daily activities (&quot;nudges&quot;), streak tracking, reminders and resources
            to help you connect with your child. Some features are free; others need a Premium subscription. We may
            add, change or remove features over time.</p>
        </Section>

        <Section title="3. Premium subscription and free trial">
          <ul className="list-disc pl-6 space-y-2">
            <li><strong>Price.</strong> Premium costs US$2.99 per month (or the local equivalent shown before you
              buy), plus any applicable taxes. The price shown at checkout or in the App Store is the price you
              pay.</li>
            <li><strong>Free trial.</strong> New subscribers may be offered a 7-day free trial. Unless you cancel
              before the trial ends, your subscription starts and you are charged automatically at the end of the
              trial. Each person may use only one free trial.</li>
            <li><strong>Auto-renewal.</strong> Subscriptions renew automatically each month until you cancel. You can
              cancel at any time; cancellation takes effect at the end of the current billing period and you keep
              Premium until then.</li>
            <li><strong>Price changes.</strong> If we change the price we will tell you in advance, and the new price
              applies from your next billing period. You can cancel before it applies.</li>
          </ul>
        </Section>

        <Section title="4. Billing on the web (Lemon Squeezy)">
          <p>If you subscribe on our website, payment is processed by Lemon Squeezy, which acts as the merchant of
            record and handles payments, taxes and receipts under its own terms. You can manage or cancel your web
            subscription through the &quot;Manage subscription&quot; link in your Lemon Squeezy receipt or billing emails,
            or by emailing us and we will cancel it for you.
            Refund requests for web purchases can be sent to{' '}
            <a href={`mailto:${SUPPORT_EMAIL}`} className="text-pink-600 underline">{SUPPORT_EMAIL}</a> and are
            handled case by case, and as required by law.</p>
        </Section>

        <Section title="5. Billing on iPhone (Apple)">
          <p>If you subscribe in the TinyNudge iPhone app, your purchase is made through Apple&apos;s App Store and
            charged to your Apple Account. Apple&apos;s Media Services Terms and Conditions apply to that purchase, and
            Apple&apos;s standard Licensed Application End User License Agreement applies to the iPhone app, alongside
            these terms. Payment is charged to your Apple Account at confirmation of purchase (or at the end of the
            free trial), and the subscription renews automatically unless it is turned off at least 24 hours before
            the end of the current period.</p>
          <p>We cannot cancel or refund Apple purchases. To manage or cancel, open <strong>Settings &gt; [your name]
            &gt; Subscriptions</strong> on your iPhone. Refund requests go to Apple at reportaproblem.apple.com.</p>
          <p>Deleting your TinyNudge account does not cancel an Apple subscription. Cancel it in Settings first.</p>
        </Section>

        <Section title="6. Android app">
          <p>The TinyNudge Android app does not sell subscriptions. If you already have Premium from the website, it
            works in the Android app when you sign in with the same account.</p>
        </Section>

        <Section title="7. Acceptable use">
          <p>You agree not to:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>use the Service for anything unlawful, harmful or abusive;</li>
            <li>try to access other people&apos;s accounts or data, or interfere with the Service&apos;s security or
              operation;</li>
            <li>scrape, copy, resell or redistribute the Service or its content, except printing resources for your
              own family&apos;s personal use;</li>
            <li>create accounts by automated means or abuse free trials;</li>
            <li>enter information about a child beyond an optional first name or nickname.</li>
          </ul>
          <p>We may suspend or close accounts that break these terms.</p>
        </Section>

        <Section title="8. Our content">
          <p>The nudges, images, text and design of TinyNudge belong to us or our licensors. We give you a personal,
            non-transferable, revocable licence to use them for your own family while you use the Service. Linked or
            embedded third-party content (such as YouTube videos) belongs to its owners and is subject to their
            terms.</p>
        </Section>

        <Section title="9. Not medical or professional advice">
          <p>TinyNudge offers general ideas for everyday connection. It is not medical, psychological, therapeutic or
            professional parenting advice, and it is not a substitute for advice from a qualified professional. Use
            your own judgement about what is safe and suitable for your child, and supervise activities
            appropriately. If you are worried about your child&apos;s health, development or safety, contact a
            qualified professional or, in an emergency, your local emergency services.</p>
        </Section>

        <Section title="10. Disclaimers">
          <p>The Service is provided &quot;as is&quot; and &quot;as available&quot;. To the extent the law allows, we make
            no warranties of any kind, including that the Service will be uninterrupted, error-free or meet your
            needs, or that reminders will always be delivered on time.</p>
        </Section>

        <Section title="11. Limitation of liability">
          <p>To the extent the law allows, TinyNudge will not be liable for any indirect, incidental, special,
            consequential or punitive damages, or for loss of data or goodwill, arising from your use of the Service.
            Our total liability for any claim relating to the Service is limited to the amount you paid us in the 12
            months before the claim, or US$50, whichever is greater. Nothing in these terms limits liability that
            cannot be limited by law, or your statutory rights as a consumer.</p>
        </Section>

        <Section title="12. Ending your account">
          <p>You can stop using TinyNudge and delete your account at any time from Account &gt; Profile, or via our{' '}
            <Link href="/delete-account" className="text-pink-600 underline">delete account page</Link>. We may
            suspend or end your access if you seriously or repeatedly break these terms, or if we stop offering the
            Service, in which case we will give you reasonable notice where we can.</p>
        </Section>

        <Section title="13. Changes to these terms">
          <p>We may update these terms from time to time. We will change the &quot;Last updated&quot; date above and,
            for significant changes, tell you by email or in the app before they take effect. If you keep using
            TinyNudge after the changes take effect, you accept the updated terms.</p>
        </Section>

        <Section title="14. Contact">
          <p>Questions about these terms:{' '}
            <a href={`mailto:${SUPPORT_EMAIL}`} className="text-pink-600 underline">{SUPPORT_EMAIL}</a>.</p>
        </Section>

        <footer className="mt-14 pt-6 border-t border-gray-200 flex flex-wrap gap-4 text-sm text-gray-500">
          <Link href="/" className="hover:text-pink-600">Home</Link>
          <Link href="/privacy" className="hover:text-pink-600">Privacy Policy</Link>
          <Link href="/support" className="hover:text-pink-600">Support</Link>
          <Link href="/delete-account" className="hover:text-pink-600">Delete account</Link>
        </footer>
      </main>
    </div>
  );
}
