import type { Metadata } from 'next';
import Link from 'next/link';
import { Heart } from 'lucide-react';

const SUPPORT_EMAIL = 'tinynudge@gmail.com';
const LAST_UPDATED = '2026-10-17';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description:
    'How TinyNudge collects, uses, shares and protects your personal data, and how to delete your account.',
  alternates: { canonical: '/privacy' },
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="text-xl font-bold text-gray-900 mb-3">{title}</h2>
      <div className="space-y-3 text-gray-700 leading-relaxed">{children}</div>
    </section>
  );
}

export default function PrivacyPage() {
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
            <Link href="/terms" className="hover:text-pink-600">Terms</Link>
            <Link href="/support" className="hover:text-pink-600">Support</Link>
          </nav>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-10">
        <h1 className="text-3xl font-bold text-gray-900">Privacy Policy</h1>
        <p className="mt-2 text-sm font-medium text-pink-600">Last updated: {LAST_UPDATED}</p>

        <p className="mt-6 text-gray-700 leading-relaxed">
          TinyNudge helps parents and caregivers stay close to their children with one small activity a day. This
          policy explains, in plain English, what personal data we collect when you use the TinyNudge website
          (tinynudge.online) and our iPhone and Android apps, why we collect it, who we share it with, and the
          choices you have.
        </p>

        <Section title="1. Who we are">
          <p>
            TinyNudge (&quot;we&quot;, &quot;us&quot;) is the data controller for the personal data described in this
            policy. You can contact us about anything in this policy at{' '}
            <a href={`mailto:${SUPPORT_EMAIL}`} className="text-pink-600 underline">{SUPPORT_EMAIL}</a>.
          </p>
        </Section>

        <Section title="2. What we collect">
          <p><strong>Account information.</strong> When you sign up we receive your email address and, depending on
            how you sign in, your name and profile photo. If you sign in with Google or Apple we receive these from
            that provider. If you use Sign in with Apple and choose to hide your email, we receive an Apple relay
            address instead. We never see your Google or Apple password, and email/password sign-in is handled by
            Google Firebase Authentication.</p>
          <p><strong>Your activity in TinyNudge.</strong> The connections you choose, the nudges and activities you
            start and complete, your streak and progress, and things you save in our resources (for example Blind
            Date journal entries, watched short films and meal plans).</p>
          <p><strong>Your child&apos;s first name (optional).</strong> You can choose to type in your child&apos;s
            first name so nudges feel more personal. This is optional. It is stored only in TinyNudge&apos;s own
            database, is used only to show it back to you inside the app, and is never sent to our email provider
            or any other third party. Please do not enter anything other than a first name or nickname.</p>
          <p><strong>Preferences.</strong> Your reminder time, time zone and which emails you want to receive.</p>
          <p><strong>Subscription details.</strong> Your plan (free, trial or premium), trial dates and subscription
            status. If you subscribe on the web, Lemon Squeezy gives us a subscription and customer ID. If you
            subscribe in the iPhone app, Apple gives us a transaction ID and expiry date. We never receive or store
            your full card details.</p>
          <p><strong>Notification tokens.</strong> If you turn on push notifications we store the push subscription
            (web) or device token (iPhone) needed to deliver them.</p>
          <p><strong>Usage and device data.</strong> On the website we use Google Analytics to understand how pages
            are used (pages viewed, approximate location, device and browser type, and similar data collected
            through cookies or similar technology). We also keep standard server logs for security and
            troubleshooting.</p>
          <p><strong>Messages to us.</strong> If you email support, we keep that conversation so we can help you.</p>
        </Section>

        <Section title="3. Why we use it and our legal bases">
          <ul className="list-disc pl-6 space-y-2">
            <li><strong>To provide TinyNudge</strong> (your account, daily nudges, progress and streaks, saved
              content): necessary to perform our contract with you.</li>
            <li><strong>To process subscriptions and free trials</strong>: necessary to perform our contract, and to
              meet tax and accounting obligations.</li>
            <li><strong>To send reminder and progress emails and push notifications</strong>: with your consent or
              in our legitimate interest in helping you keep the habit you signed up for. You can switch each email
              type off in Account settings, unsubscribe from any email, and turn off push notifications at any time.</li>
            <li><strong>To send essential service emails</strong> (such as account or billing messages): necessary to
              perform our contract.</li>
            <li><strong>To measure and improve the website</strong> with Google Analytics: with your consent where
              the law requires it, collected through our cookie banner.</li>
            <li><strong>To keep TinyNudge secure</strong> and prevent abuse: our legitimate interests.</li>
            <li><strong>To comply with the law</strong> and respond to lawful requests: legal obligation.</li>
          </ul>
          <p>We do not sell your personal data, we do not use it for targeted advertising, and we do not show ads.</p>
        </Section>

        <Section title="4. Who we share it with">
          <p>We share personal data only with service providers that help us run TinyNudge, and only what each one
            needs:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong>Google Firebase</strong> (Google LLC): sign-in, our database, hosting, cloud functions and
              push notification delivery (Firebase Cloud Messaging). Your child&apos;s first name, if you add it, is
              stored here and nowhere else.</li>
            <li><strong>Google Analytics</strong> (Google LLC): website usage statistics.</li>
            <li><strong>CookieYes</strong>: shows our cookie banner and records your cookie choices.</li>
            <li><strong>Loops</strong>: sends our emails. Loops receives your email address, first name, email
              preferences, and streak and activity statistics (such as your current streak and last active date).
              Loops never receives your child&apos;s name or any other information about your child.</li>
            <li><strong>Lemon Squeezy</strong>: our payment provider and merchant of record for web subscriptions.
              Lemon Squeezy collects your payment details directly under its own privacy policy.</li>
            <li><strong>Apple</strong>: if you subscribe in the iPhone app, Apple processes the payment under its own
              privacy policy and tells us whether your subscription is active. Apple also provides Sign in with Apple
              and delivers iPhone notifications.</li>
            <li><strong>YouTube</strong> (Google LLC): some nudges include an embedded YouTube video. When you play
              or load one, YouTube may collect data and set cookies under Google&apos;s privacy policy.</li>
          </ul>
          <p>We may also disclose data if required by law, to protect the rights and safety of our users or others,
            or as part of a sale or reorganisation of TinyNudge (in which case this policy will continue to apply).</p>
        </Section>

        <Section title="5. Cookies">
          <p>The website uses cookies and similar technologies that are needed to keep you signed in, plus analytics
            cookies from Google Analytics. Where required, we ask for your consent through the CookieYes banner, and
            you can change your choice at any time from that banner or your browser settings. Embedded YouTube
            videos may set their own cookies.</p>
        </Section>

        <Section title="6. How long we keep it">
          <ul className="list-disc pl-6 space-y-2">
            <li><strong>Account and activity data</strong> (including your child&apos;s first name): for as long as you
              have an account. When you delete your account it is removed from our database.</li>
            <li><strong>Email contact at Loops</strong>: until you delete your account. If you only unsubscribe,
              we keep your address marked as unsubscribed so we don&apos;t email you again.</li>
            <li><strong>Payment and billing records</strong>: kept by Lemon Squeezy or Apple, and by us where needed,
              for as long as tax and accounting law requires.</li>
            <li><strong>Analytics data</strong>: according to our Google Analytics retention setting (no longer than
              14 months).</li>
            <li><strong>Support emails</strong>: for as long as needed to resolve your request, and then deleted
              when no longer needed.</li>
          </ul>
        </Section>

        <Section title="7. Deleting your account">
          <p>You can delete your account at any time from <strong>Account &gt; Profile &gt; Delete account</strong> in
            the app or website. If you can&apos;t sign in, follow the steps on our{' '}
            <Link href="/delete-account" className="text-pink-600 underline">delete account page</Link> or email us.</p>
          <p>Deleting your account removes your sign-in, profile, connections, activities, saved content,
            preferences and notification tokens, removes you from our email list, and cancels any web (Lemon
            Squeezy) subscription. <strong>Subscriptions bought on iPhone are billed by Apple</strong> and must be
            cancelled in your iPhone Settings &gt; [your name] &gt; Subscriptions; deleting your account does not
            cancel them.</p>
        </Section>

        <Section title="8. Your rights">
          <p>Depending on where you live, you may have the right to access, correct, delete or download your
            personal data, to object to or restrict how we use it, to withdraw consent at any time, and to complain
            to your local data protection authority. California residents have the right to know, delete and correct
            their data and not to be discriminated against for using these rights; we do not sell or share personal
            data for cross-context behavioural advertising. To use any of these rights, email{' '}
            <a href={`mailto:${SUPPORT_EMAIL}`} className="text-pink-600 underline">{SUPPORT_EMAIL}</a>. We will reply
            within 30 days and may need to confirm your identity.</p>
        </Section>

        <Section title="9. Children">
          <p>TinyNudge is a service for adults: parents, grandparents and other caregivers. It is not directed to
            children, and children under 13 (or the minimum age in your country) must not create an account. We do
            not knowingly collect personal data from children. The only information about a child that TinyNudge may
            hold is an optional first name typed in by the parent, which stays in our database and is never shared
            with third parties. If you believe a child has given us personal data, contact us and we will delete it.</p>
        </Section>

        <Section title="10. International transfers">
          <p>We and our service providers may process your data in the United States and other countries whose data
            protection laws may differ from yours. Where the law requires it, we rely on safeguards such as the
            European Commission&apos;s Standard Contractual Clauses or the EU-US Data Privacy Framework offered by our
            providers.</p>
        </Section>

        <Section title="11. Security">
          <p>Data is encrypted in transit, access to our database is restricted by security rules so you can only
            read your own data, and sensitive fields (such as your plan and billing status) can only be changed by
            our servers. No system is perfectly secure, so please use a strong, unique password.</p>
        </Section>

        <Section title="12. Changes to this policy">
          <p>We may update this policy from time to time. We will change the &quot;Last updated&quot; date above, and
            if the changes are significant we will tell you by email or in the app before they take effect.</p>
        </Section>

        <Section title="13. Contact">
          <p>Questions, requests or complaints:{' '}
            <a href={`mailto:${SUPPORT_EMAIL}`} className="text-pink-600 underline">{SUPPORT_EMAIL}</a>.</p>
        </Section>

        <footer className="mt-14 pt-6 border-t border-gray-200 flex flex-wrap gap-4 text-sm text-gray-500">
          <Link href="/" className="hover:text-pink-600">Home</Link>
          <Link href="/terms" className="hover:text-pink-600">Terms of Service</Link>
          <Link href="/support" className="hover:text-pink-600">Support</Link>
          <Link href="/delete-account" className="hover:text-pink-600">Delete account</Link>
        </footer>
      </main>
    </div>
  );
}
