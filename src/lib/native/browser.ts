import { getAppContext } from '@/lib/app-context';

/** Open a URL outside the app: in-app Safari sheet on iOS, new tab elsewhere. */
export async function openExternal(url: string): Promise<void> {
  if (typeof window === 'undefined') return;
  if (getAppContext() === 'ios-app') {
    try {
      const { Browser } = await import('@capacitor/browser');
      await Browser.open({ url });
      return;
    } catch (err) {
      console.error('[browser] native open failed:', err);
    }
  }
  window.open(url, '_blank', 'noopener');
}
