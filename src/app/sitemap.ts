import { MetadataRoute } from 'next';

const APP_URL = 'https://tinynudge.online';

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: APP_URL, lastModified: new Date(), changeFrequency: 'weekly', priority: 1 },
    { url: `${APP_URL}/resources`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.6 },
    { url: `${APP_URL}/resources/high-low-buffalo`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    { url: `${APP_URL}/resources/what-if-questions`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    { url: `${APP_URL}/resources/story-chain`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    { url: `${APP_URL}/resources/question-jar`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    { url: `${APP_URL}/resources/name-place-animal-thing`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    { url: `${APP_URL}/resources/blind-date`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    { url: `${APP_URL}/resources/short-films`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    { url: `${APP_URL}/resources/meal-planner`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
  ];
}
