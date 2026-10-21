import { getAppContext } from '@/lib/app-context';

/** Light tap feedback on iOS; no-op everywhere else. Fire-and-forget. */
export function tapFeedback(): void {
  if (typeof window === 'undefined' || getAppContext() !== 'ios-app') return;
  import('@capacitor/haptics')
    .then(({ Haptics, ImpactStyle }) => Haptics.impact({ style: ImpactStyle.Light }))
    .catch(() => { /* haptics unavailable */ });
}
