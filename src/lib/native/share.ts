import { getAppContext } from '@/lib/app-context';

export type ShareInput = { title?: string; text?: string; url?: string };

function isCancel(err: unknown): boolean {
  const name = (err as { name?: string } | null)?.name;
  const message = err instanceof Error ? err.message : String(err);
  return name === 'AbortError' || /cancel/i.test(message);
}

/** Native share sheet on iOS, Web Share API when available, else copy to clipboard. */
export async function shareText({ title, text, url }: ShareInput): Promise<void> {
  if (typeof window === 'undefined') return;

  if (getAppContext() === 'ios-app') {
    try {
      const { Share } = await import('@capacitor/share');
      await Share.share({ title, text, url, dialogTitle: title });
      return;
    } catch (err) {
      if (isCancel(err)) return;
      console.error('[share] native share failed:', err);
    }
  }

  if (typeof navigator.share === 'function') {
    try {
      await navigator.share({ title, text, url });
      return;
    } catch (err) {
      if (isCancel(err)) return;
      console.error('[share] navigator.share failed:', err);
    }
  }

  const content = [text, url].filter(Boolean).join('\n');
  if (!content) return;
  if (!navigator.clipboard?.writeText) throw new Error('Sharing is not supported on this device.');
  await navigator.clipboard.writeText(content);
}
