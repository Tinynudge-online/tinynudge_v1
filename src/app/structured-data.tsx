export function HomeStructuredData() {
  const schema = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebApplication',
        name: 'TinyNudge',
        url: 'https://tinynudge.online',
        description:
          'TinyNudge helps busy parents stay close to their young children through tiny daily activities. 50 expert-backed micro-moments, 5-minute connection rituals, streak tracking.',
        applicationCategory: 'LifestyleApplication',
        operatingSystem: 'Any',
        offers: [
          {
            '@type': 'Offer',
            name: 'Free Plan',
            price: '0',
            priceCurrency: 'USD',
            description: '5 nudges per month, 1 connection',
          },
          {
            '@type': 'Offer',
            name: 'Premium',
            price: '2.99',
            priceCurrency: 'USD',
            description: 'Unlimited nudges, multiple connections, full library access',
          },
        ],
        featureList: [
          '50 expert-backed parent-child activities',
          'Daily streak tracking',
          'Personalised email reminders',
          'Filter by time available and effort level',
          '7-day free trial',
        ],
        audience: {
          '@type': 'Audience',
          audienceType: 'Parents of children under 10',
        },
      },
      {
        '@type': 'Organization',
        name: 'TinyNudge',
        url: 'https://tinynudge.online',
        logo: 'https://tinynudge.online/heart-favicon.svg',
        contactPoint: {
          '@type': 'ContactPoint',
          email: 'tinynudge@gmail.com',
          contactType: 'customer support',
        },
      },
      {
        '@type': 'FAQPage',
        mainEntity: [
          {
            '@type': 'Question',
            name: 'What is TinyNudge?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'TinyNudge is a web app that gives busy parents one tiny daily activity — a nudge — to stay emotionally close to their young child. Each nudge takes 5–30 minutes and needs no preparation.',
            },
          },
          {
            '@type': 'Question',
            name: 'How much does TinyNudge cost?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'TinyNudge is free to start — the free plan includes 5 nudges per month. Premium is $2.99/month with a 7-day free trial and gives unlimited access to all 50 nudges.',
            },
          },
          {
            '@type': 'Question',
            name: 'Do I need to download an app?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'No download needed. TinyNudge is a web app that works in any browser on any device — phone, tablet, or desktop.',
            },
          },
          {
            '@type': 'Question',
            name: 'What age children is TinyNudge for?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'TinyNudge is designed for parents of children under 10. The nudges are crafted for young children and require no reading ability from the child.',
            },
          },
        ],
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
