'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Heart, Settings, Star, Eye, EyeOff, X, Plus, Pause, Play, Trash2, ArrowLeft, Mail, Check } from 'lucide-react';
import { getNudgesByRelationship, getNudgeById, type RelationshipType } from '../data/nudges';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  sendPasswordResetEmail,
  updateProfile,
  getAdditionalUserInfo,
  type UserCredential,
} from 'firebase/auth';
import {
  collection,
  query,
  where,
  getDocs,
  getDoc,
  setDoc,
  addDoc,
  updateDoc,
  doc,
  writeBatch,
  onSnapshot,
} from 'firebase/firestore';
import { auth, db } from './firebase';
import { fireLoopsEvent, updateLoopsContact } from '@/lib/loops-client';
import {
  registerServiceWorker,
  enableWebPush,
  disableWebPush,
  isWebPushSupported,
  isWebPushEnabled,
} from '@/lib/push-client';
import { enableNativePush } from '@/lib/native/push';
import { shareText } from '@/lib/native/share';
import { tapFeedback } from '@/lib/native/haptics';
import {
  DEFAULT_EMAIL_PREFERENCES,
  NOTIFICATION_TIMES,
  type EmailPreferences,
} from '@/lib/email-preferences';
import { useAppContext, getAppContext, getPurchaseChannel } from '@/lib/app-context';
import {
  nativeSignInWithGoogle,
  nativeSignInWithApple,
  getSignInProviders,
  reauthenticateCurrentUser,
  revokeAppleSignIn,
} from '@/lib/native/auth';
import {
  getPremiumProduct,
  purchasePremium,
  restorePurchases,
  openManageSubscriptions,
} from '@/lib/native/purchases';
import { openExternal } from '@/lib/native/browser';

// ============================================================================
// INTERFACES
// ============================================================================

interface UserState {
  id: string;
  email: string;
  name: string | null;
  picture: string | null;
}

interface Connection {
  id: string;
  title: string;
  emoji: string;
  description: string;
  frequency: string;
  activities_completed: number;
  total_activities: number;
  is_paused: boolean;
  user_id: string;
  created_at: string;
}

interface Activity {
  id: string;
  connection_id: string;
  user_id: string;
  nudge_id?: string;
  title: string;
  description: string;
  status: 'active' | 'completed' | 'skipped' | 'paused';
  created_at: string;
  completed_at: string | null;
}

interface UserPlan {
  plan: 'free' | 'trial' | 'premium';
  nudgeCount: number;
  nudgeResetDate: string;
  connectionCount: number;
  trialStartDate: string | null;
  trialEndDate: string | null;
  trialUsed: boolean;
  lsCustomerId: string | null;
  lsSubscriptionId: string | null;
  subscriptionStatus: string | null;
  // Written server-side only (src/lib/entitlements.ts); not part of PLAN_DEFAULTS.
  billingSource?: 'lemonsqueezy' | 'apple' | null;
  currentStreak: number;
  longestStreak: number;
  lastCompletedDate: string | null;
  totalActivitiesCompleted: number;
  bonusNudgesEarned: number;
  scratchCardsAvailable: number;
  streakFreezes: number;
  extraRelationExpiry: string | null;
}

interface ScratchReward {
  type: 'bonus_nudge' | 'streak_freeze' | 'extra_relation';
  label: string;
  description: string;
  emoji: string;
}

interface ConnectionType {
  title: string;
  emoji: string;
  description: string;
}

interface Frequency {
  id: string;
  title: string;
  time: string;
  description: string;
  bgColor: string;
  borderColor: string;
  selectedBg: string;
  selectedBorder: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const CONNECTION_TYPES: ConnectionType[] = [
  { title: 'Son', emoji: '👦', description: 'Your son (under 10)' },
  { title: 'Daughter', emoji: '👧', description: 'Your daughter (under 10)' },
  { title: 'Partner', emoji: '💑', description: 'Romantic partner' },
  { title: 'Mom', emoji: '👩', description: 'Your mother' },
  { title: 'Dad', emoji: '👨', description: 'Your father' },
  { title: 'Friend', emoji: '🤝', description: 'Close friend' },
  { title: 'Girlfriend', emoji: '💝', description: 'Your girlfriend' },
  { title: 'Boyfriend', emoji: '💙', description: 'Your boyfriend' },
  { title: 'Fiancée', emoji: '💍', description: 'Your fiancée/fiancé' },
  { title: 'Brother', emoji: '🧑', description: 'Your brother' },
  { title: 'Sister', emoji: '🧒', description: 'Your sister' },
  { title: 'Cousin', emoji: '👫', description: 'Your cousin' },
  { title: 'Relative', emoji: '👨‍👩‍👧‍👦', description: 'Extended family' },
  { title: 'Colleague', emoji: '💼', description: 'Work colleague' },
  { title: 'Roommate', emoji: '🏠', description: 'Roommate' },
];

const LIVE_CONNECTION_TITLES = new Set(['Son', 'Daughter']);

const NUDGE_RESOURCE_MAP: Record<string, { href: string; emoji: string; label: string }> = {
  'nudge-005': { href: '/resources/high-low-buffalo', emoji: '🦬', label: 'Get the full High Low Buffalo guide' },
  'nudge-007': { href: '/resources/what-if-questions', emoji: '💭', label: "Need more What If questions? We've got 25" },
  'nudge-009': { href: '/resources/story-chain', emoji: '📖', label: 'Pick a story starter from our Story Chain' },
  'nudge-010': { href: '/resources/question-jar', emoji: '🫙', label: 'Browse 30 questions for your Question Jar' },
  'nudge-018': { href: '/resources/question-jar', emoji: '🫙', label: 'Browse 30 questions for your Question Jar' },
  'nudge-024': { href: '/resources/name-place-animal-thing', emoji: '✏️', label: 'Use our live scoreboard for this game' },
  'nudge-031': { href: '/resources/story-chain', emoji: '📖', label: 'Pick a story starter from our Story Chain' },
  'nudge-038': { href: '/resources/blind-date', emoji: '💌', label: 'Log this date in your Blind Date Journal' },
  'nudge-047': { href: '/resources/short-films', emoji: '🎬', label: 'Find a short film to watch tonight' },
  'nudge-048': { href: '/resources/blind-date', emoji: '💌', label: 'Log this date in your Blind Date Journal' },
  'nudge-050': { href: '/resources/meal-planner', emoji: '🍽️', label: 'Plan this week\'s meals together' },
};

const FREQUENCIES: Frequency[] = [
  {
    id: 'daily', title: 'Daily', time: 'Every day',
    description: 'Perfect for close relationships',
    bgColor: 'bg-pink-50', borderColor: 'border-pink-200',
    selectedBg: 'bg-pink-100', selectedBorder: 'border-pink-500',
  },
  {
    id: 'weekly', title: 'Weekly', time: 'Once a week',
    description: 'Great for staying connected',
    bgColor: 'bg-purple-50', borderColor: 'border-purple-200',
    selectedBg: 'bg-purple-100', selectedBorder: 'border-purple-500',
  },
  {
    id: 'biweekly', title: 'Bi-Weekly', time: 'Twice a month',
    description: 'Good for maintaining bonds',
    bgColor: 'bg-blue-50', borderColor: 'border-blue-200',
    selectedBg: 'bg-blue-100', selectedBorder: 'border-blue-500',
  },
  {
    id: 'monthly', title: 'Monthly', time: 'Once a month',
    description: 'For distant connections',
    bgColor: 'bg-green-50', borderColor: 'border-green-200',
    selectedBg: 'bg-green-100', selectedBorder: 'border-green-500',
  },
];

const activityTemplates: Record<string, string[]> = {
  'Partner': [
    'Send a heartfelt good morning text',
    'Plan a surprise date night',
    'Cook their favorite meal together',
    "Write a love note and hide it somewhere they'll find",
    'Give them a 5-minute shoulder massage',
  ],
  'Daughter': [
    'Read a bedtime story together',
    'Have a tea party or picnic',
    'Draw pictures together',
    'Go for a nature walk and collect leaves',
    'Bake cookies together',
  ],
  'Son': [
    'Play catch in the backyard',
    'Build something together with blocks',
    'Go on a bike ride',
    'Teach him a new skill',
    'Have a pillow fight',
  ],
  'Mom': [
    'Call her just to say hi',
    'Send flowers or a card',
    'Cook her favorite meal',
    'Look through old photos together',
    'Ask about her childhood memories',
  ],
  'Dad': [
    'Ask about his day at work',
    'Watch his favorite sports team together',
    'Work on a project together',
    'Share a coffee or tea',
    'Ask for his advice on something',
  ],
  'Friend': [
    'Send a funny meme that reminds you of them',
    'Plan a coffee date',
    'Call them to catch up',
    'Invite them to try something new together',
    'Send an encouraging text',
  ],
  'Girlfriend': [
    'Write her a sweet note',
    'Plan a fun outing together',
    'Surprise her with her favorite treat',
    'Share a playlist of songs that remind you of her',
    'Ask her about her dreams',
  ],
  'Boyfriend': [
    'Send him a motivational message',
    'Plan a game night',
    'Cook his favorite meal',
    'Go for a walk together',
    'Ask him about his goals',
  ],
  'Fiancée': [
    'Talk about wedding plans',
    'Share a memory from your relationship',
    'Plan a date night',
    'Write a list of things you love about them',
    'Dream about your future together',
  ],
  'Brother': [
    'Play a video game together',
    'Share a funny story',
    'Go for a bike ride',
    'Help him with a project',
    'Reminisce about childhood memories',
  ],
  'Sister': [
    'Have a spa day at home',
    'Share a favorite book',
    'Go shopping together',
    'Cook a meal together',
    'Watch a movie together',
  ],
  'Cousin': [
    'Call to catch up',
    'Share a family story',
    'Plan a get-together',
    'Send a funny meme',
    'Ask about their hobbies',
  ],
  'Relative': [
    'Send a holiday card',
    'Share a family recipe',
    'Call to check in',
    'Plan a family gathering',
    'Ask about their favorite memory',
  ],
  'Colleague': [
    'Compliment their work',
    'Invite them for coffee',
    'Share a helpful resource',
    'Ask about their weekend',
    'Offer help on a project',
  ],
  'Roommate': [
    'Cook a meal together',
    'Plan a movie night',
    'Clean a shared space together',
    'Talk about your day',
    'Plan a fun outing',
  ],
};

// ============================================================================
// FIRESTORE HELPER FUNCTIONS
// ============================================================================

// Shared by the one-off loads and the live onSnapshot listeners so ordering is identical.
function sortConnections(conns: Connection[]): Connection[] {
  return conns.sort((a, b) => b.created_at.localeCompare(a.created_at));
}

// Ties in created_at (a batch of nudges added at once) fall back to nudge_id
// (zero-padded, so pool order) and then the doc id, so the order is deterministic.
function sortActivities(acts: Activity[]): Activity[] {
  return acts.sort((a, b) =>
    a.created_at.localeCompare(b.created_at) ||
    (a.nudge_id ?? '').localeCompare(b.nudge_id ?? '') ||
    a.id.localeCompare(b.id)
  );
}

async function loadUserConnections(userId: string): Promise<Connection[]> {
  if (!userId) return [];
  try {
    const q = query(collection(db, 'user_connections'), where('user_id', '==', userId));
    const snapshot = await getDocs(q);
    const conns = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Connection));
    return sortConnections(conns);
  } catch (error) {
    console.error('Error loading connections:', error);
    return [];
  }
}

async function loadUserActivities(userId: string): Promise<Activity[]> {
  if (!userId) return [];
  try {
    const q = query(collection(db, 'user_activities'), where('user_id', '==', userId));
    const snapshot = await getDocs(q);
    const acts = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Activity));
    return sortActivities(acts);
  } catch (error) {
    console.error('Error loading activities:', error);
    return [];
  }
}

async function createActivitiesForConnection(
  connectionId: string,
  connectionTitle: string,
  userId: string,
  count: number = 5
): Promise<Activity[]> {
  const now = new Date().toISOString();
  const created: Activity[] = [];

  const CONNECTION_TITLE_TO_RELATIONSHIP: Partial<Record<string, RelationshipType>> = {
    'Son': 'son-under-10',
    'Daughter': 'daughter-under-10',
  };
  const relationshipType = CONNECTION_TITLE_TO_RELATIONSHIP[connectionTitle];
  const nudgePool = relationshipType ? getNudgesByRelationship(relationshipType) : null;

  if (nudgePool && nudgePool.length > 0) {
    const shuffled = [...nudgePool].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, Math.min(count, nudgePool.length));
    for (const nudge of selected) {
      const data = {
        connection_id: connectionId,
        user_id: userId,
        nudge_id: nudge.id,
        title: nudge.title,
        description: nudge.description,
        status: 'active' as const,
        created_at: now,
        completed_at: null,
      };
      const ref = await addDoc(collection(db, 'user_activities'), data);
      created.push({ id: ref.id, ...data });
    }
  } else {
    const templates = activityTemplates[connectionTitle] || activityTemplates['Friend'];
    for (const template of templates) {
      const data = {
        connection_id: connectionId,
        user_id: userId,
        title: template,
        description: `A meaningful way to connect with your ${connectionTitle.toLowerCase()}`,
        status: 'active' as const,
        created_at: now,
        completed_at: null,
      };
      const ref = await addDoc(collection(db, 'user_activities'), data);
      created.push({ id: ref.id, ...data });
    }
  }

  return created;
}

async function updateActivityStatus(activityId: string, status: Activity['status']): Promise<void> {
  await updateDoc(doc(db, 'user_activities', activityId), {
    status,
    completed_at: status === 'completed' ? new Date().toISOString() : null,
  });
}

// ============================================================================
// PLAN HELPER FUNCTIONS
// ============================================================================

function getNextResetDate(): string {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString();
}

// Returns today's date as YYYY-MM-DD in the user's LOCAL timezone (not UTC).
// Using UTC here breaks streaks for users in non-UTC zones — e.g. UTC-5 at 10 PM
// is already "tomorrow" in UTC but still "today" locally.
function getLocalDateStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const PLAN_DEFAULTS: UserPlan = {
  plan: 'free',
  nudgeCount: 0,
  nudgeResetDate: '',
  connectionCount: 0,
  trialStartDate: null,
  trialEndDate: null,
  trialUsed: false,
  lsCustomerId: null,
  lsSubscriptionId: null,
  subscriptionStatus: null,
  currentStreak: 0,
  longestStreak: 0,
  lastCompletedDate: null,
  totalActivitiesCompleted: 0,
  bonusNudgesEarned: 0,
  scratchCardsAvailable: 0,
  streakFreezes: 0,
  extraRelationExpiry: null,
};

async function getOrCreateUserPlan(userId: string): Promise<UserPlan> {
  const userRef = doc(db, 'users', userId);
  const snap = await getDoc(userRef);
  if (snap.exists()) return { ...PLAN_DEFAULTS, ...snap.data() } as UserPlan;
  const newPlan: UserPlan = { ...PLAN_DEFAULTS, nudgeResetDate: getNextResetDate() };
  await setDoc(userRef, newPlan);
  return newPlan;
}

// Quota, streak and entitlement fields on users/{uid} are write-protected by
// Firestore rules, so they are updated through authenticated API routes.
async function postPlanApi<T>(path: string, body?: unknown): Promise<T> {
  const idToken = await auth.currentUser?.getIdToken();
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
    body: JSON.stringify(body ?? {}),
  });
  if (!res.ok) throw new Error(`${path} failed with status ${res.status}`);
  return res.json();
}

function isPlanAllowed(plan: UserPlan, type: 'connection' | 'nudge'): boolean {
  if (plan.plan === 'premium') return true;
  if (plan.plan === 'trial' && plan.trialEndDate && new Date() <= new Date(plan.trialEndDate)) return true;
  if (type === 'connection') {
    const hasExtraRelation = !!(plan.extraRelationExpiry && new Date() <= new Date(plan.extraRelationExpiry));
    return plan.connectionCount < (hasExtraRelation ? 2 : 1);
  }
  return plan.nudgeCount < (5 + (plan.bonusNudgesEarned ?? 0));
}

const SCRATCH_REWARDS: ScratchReward[] = [
  { type: 'bonus_nudge',    label: '+1 Bonus Nudge',       description: 'Get one extra nudge this month!',        emoji: '✨' },
  { type: 'streak_freeze',  label: 'Streak Freeze',         description: 'Protects your streak for 1 missed day.', emoji: '❄️' },
  { type: 'extra_relation', label: '+1 Extra Connection',   description: 'Add one more connection for 7 days!',    emoji: '💝' },
];

function generateScratchReward(): ScratchReward {
  return SCRATCH_REWARDS[Math.floor(Math.random() * SCRATCH_REWARDS.length)];
}

// ============================================================================
// MAIN PAGE COMPONENT
// ============================================================================

function getActivityCount(plan: UserPlan): number {
  if (plan.plan === 'premium') return 50;
  if (plan.plan === 'trial' && plan.trialEndDate && new Date() <= new Date(plan.trialEndDate)) return 50;
  return 5;
}

// sessionStorage key for the onboarding selection kept across a Google redirect sign-in.
const PENDING_CONNECTION_KEY = 'tn_pending_connection';

// Safe-area padding (notch / home indicator) for the iOS app and installed PWAs.
// In-page links scroll without a hash navigation: a hash change adds a history
// entry with null state, which breaks the back-button layers below.
function scrollToSection(id: string) {
  return (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };
}

// env() resolves to 0 on regular browsers, so the web layout is unchanged.
const SAFE_OVERLAY_STYLE: React.CSSProperties = {
  paddingTop: 'max(1rem, env(safe-area-inset-top))',
  paddingBottom: 'max(1rem, env(safe-area-inset-bottom))',
};
const SAFE_HEADER_STYLE: React.CSSProperties = {
  paddingTop: 'calc(1rem + env(safe-area-inset-top))',
};
const SAFE_BOTTOM_NAV_STYLE: React.CSSProperties = {
  paddingBottom: 'env(safe-area-inset-bottom)',
};
// Content under the fixed header (pt-20) and above the mobile bottom nav (pb-24).
const SAFE_CONTENT_STYLE: React.CSSProperties = {
  paddingTop: 'calc(5rem + env(safe-area-inset-top))',
};
const SAFE_TOAST_STYLE: React.CSSProperties = {
  bottom: 'calc(1.5rem + env(safe-area-inset-bottom))',
};

const Page = () => {
  const [authLoading, setAuthLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState<'home' | 'signin' | 'dashboard' | 'account'>('home');
  const [authTab, setAuthTab] = useState<'signin' | 'signup'>('signup');
  const [isFirstTime, setIsFirstTime] = useState(true);

  const [user, setUser] = useState<UserState | null>(null);
  const [userName, setUserName] = useState('');

  const [signupForm, setSignupForm] = useState({
    email: '', password: '', confirmPassword: '',
    showPassword: false, showConfirmPassword: false,
  });
  const [signinForm, setSigninForm] = useState({
    email: '', password: '', showPassword: false,
  });
  const [resetStatus, setResetStatus] = useState<{ kind: 'sent' | 'error'; message: string } | null>(null);

  const [connections, setConnections] = useState<Connection[]>([]);
  const [userActivities, setUserActivities] = useState<Activity[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);

  const [selectedConnection, setSelectedConnection] = useState<ConnectionType | null>(null);
  const [selectedFrequency, setSelectedFrequency] = useState<Frequency | null>(null);
  const [selectedActivityConnection, setSelectedActivityConnection] = useState<Connection | null>(null);

  const [showFrequencyModal, setShowFrequencyModal] = useState(false);
  const [showAddConnectionModal, setShowAddConnectionModal] = useState(false);
  const [showActivitiesModal, setShowActivitiesModal] = useState(false);
  const [currentActivityIndex, setCurrentActivityIndex] = useState(0);
  const [nudgesTodayCount, setNudgesTodayCount] = useState(0);
  const [nudgeStatusFilter, setNudgeStatusFilter] = useState<'all' | 'active' | 'completed' | 'skipped'>('all');
  const [nudgeTimeFilter, setNudgeTimeFilter] = useState<string | null>(null);
  const [nudgeEffortFilter, setNudgeEffortFilter] = useState<string | null>(null);
  const [nudgeMaterialFilter, setNudgeMaterialFilter] = useState<boolean | null>(null);

  const pendingConnectionRef = useRef<{ connection: ConnectionType; frequency: Frequency; childName?: string } | null>(null);
  const restoredNudgesModalRef = useRef(false);
  const completingActivityRef = useRef<string | null>(null);

  const [userPlan, setUserPlan] = useState<UserPlan | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgradeBlockReason, setUpgradeBlockReason] = useState<'connection' | 'nudge' | null>(null);
  const [showComingSoonToast, setShowComingSoonToast] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [streakSavedByFreeze, setStreakSavedByFreeze] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareActivity, setShareActivity] = useState<Activity | null>(null);
  const [showScratchCardModal, setShowScratchCardModal] = useState(false);
  const [currentScratchReward, setCurrentScratchReward] = useState<ScratchReward | null>(null);
  const scratchClaimingRef = useRef(false);
  const [scratchRevealed, setScratchRevealed] = useState(false);

  const [emailPrefs, setEmailPrefs] = useState<EmailPreferences>(DEFAULT_EMAIL_PREFERENCES);
  const [prefsSaveStatus, setPrefsSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [accountTab, setAccountTab] = useState<'profile' | 'email'>('profile');

  const [showChildNameModal, setShowChildNameModal] = useState(false);
  const [childNameInput, setChildNameInput] = useState('');
  const [pendingConnectionForName, setPendingConnectionForName] = useState<ConnectionType | null>(null);

  // Purchase channel: 'lemonsqueezy' on the website, 'apple-iap' in the iOS app,
  // 'none' in the Android app. null until detected on the client — render no purchase UI then.
  const appContext = useAppContext();
  const purchaseChannel = appContext ? getPurchaseChannel(appContext) : null;
  const canPurchase = purchaseChannel === 'lemonsqueezy' || purchaseChannel === 'apple-iap';
  const [iapPrice, setIapPrice] = useState<string | null>(null);
  const [iapBusy, setIapBusy] = useState(false);

  // Live-sync bookkeeping: which uid each listener has delivered for, and the open nudges modal.
  const liveSyncUidRef = useRef<{ connections: string | null; activities: string | null }>({ connections: null, activities: null });
  const showActivitiesModalRef = useRef(false);
  const selectedActivityConnectionIdRef = useRef<string | null>(null);

  // Push notifications on this device. 'unknown' until checked on the client.
  const [pushStatus, setPushStatus] = useState<'unknown' | 'unsupported' | 'off' | 'denied' | 'on'>('unknown');
  const [pushBusy, setPushBusy] = useState(false);
  const [pushError, setPushError] = useState<string | null>(null);

  const [showDeleteAccount, setShowDeleteAccount] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deletePassword, setDeletePassword] = useState('');
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [deleteAccountError, setDeleteAccountError] = useState<string | null>(null);

  // ============================================================================
  // AUTH STATE LISTENER
  // ============================================================================

  useEffect(() => {
    // Restore the onboarding selection saved before a full-page Google redirect sign-in.
    try {
      const saved = sessionStorage.getItem(PENDING_CONNECTION_KEY);
      if (saved) {
        sessionStorage.removeItem(PENDING_CONNECTION_KEY);
        if (!pendingConnectionRef.current) pendingConnectionRef.current = JSON.parse(saved);
      }
    } catch (error) {
      console.error('Error restoring pending connection:', error);
    }

    // Complete a Google sign-in that fell back to signInWithRedirect (web / Android only;
    // the native iOS auth instance has no redirect resolver).
    if (getAppContext() !== 'ios-app') {
      getRedirectResult(auth)
        .then(result => { if (result) handleOAuthSuccess(result, 'google'); })
        .catch(error => {
          console.error('Google redirect sign-in error:', error);
          alert('Error signing in with Google: ' + (error?.message || 'Please try again.'));
        });
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) { try {
        const userState: UserState = {
          id: firebaseUser.uid,
          email: firebaseUser.email || '',
          name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
          picture: firebaseUser.photoURL || null,
        };
        setUser(userState);
        setUserName(userState.name || 'User');

        let [loadedConnections, loadedActivities] = await Promise.all([
          loadUserConnections(firebaseUser.uid),
          loadUserActivities(firebaseUser.uid),
        ]);

        let plan = await getOrCreateUserPlan(firebaseUser.uid);
        // connectionCount is write-protected by Firestore rules; derive it from the actual docs.
        plan = { ...plan, connectionCount: loadedConnections.length };

        const nowDate = new Date();
        const needsReset = !plan.nudgeResetDate || nowDate >= new Date(plan.nudgeResetDate);
        const trialExpired = plan.plan === 'trial' && !!plan.trialEndDate && nowDate > new Date(plan.trialEndDate);
        if (needsReset || trialExpired) {
          try {
            const { updates } = await postPlanApi<{ updates: Partial<UserPlan> }>('/api/plan/refresh');
            plan = { ...plan, ...updates };
          } catch (error) {
            console.error('Error refreshing plan:', error);
          }
        }

        if (trialExpired && plan.plan === 'free') {
          const sorted = [...loadedConnections].sort((a, b) => a.created_at.localeCompare(b.created_at));
          const toPause = sorted.slice(1);
          if (toPause.length > 0) {
            const pauseBatch = writeBatch(db);
            toPause.forEach(c => pauseBatch.update(doc(db, 'user_connections', c.id), { is_paused: true }));
            await pauseBatch.commit();
            for (const conn of toPause) {
              const actQ = query(collection(db, 'user_activities'), where('user_id', '==', firebaseUser.uid), where('connection_id', '==', conn.id), where('status', '==', 'active'));
              const actSnap = await getDocs(actQ);
              if (actSnap.docs.length > 0) {
                const actBatch = writeBatch(db);
                actSnap.docs.forEach(d => actBatch.update(d.ref, { status: 'paused' }));
                await actBatch.commit();
              }
            }
            [loadedConnections, loadedActivities] = await Promise.all([
              loadUserConnections(firebaseUser.uid),
              loadUserActivities(firebaseUser.uid),
            ]);
          }
        }

        if (pendingConnectionRef.current) {
          const { connection, frequency } = pendingConnectionRef.current;
          const savedChildName = (pendingConnectionRef.current as typeof pendingConnectionRef.current & { childName?: string }).childName ?? '';
          const isDuplicate = loadedConnections.some(c => c.title === connection.title);
          if (!isDuplicate && isPlanAllowed(plan, 'connection')) {
            const now = new Date().toISOString();
            const connData: Record<string, unknown> = {
              user_id: firebaseUser.uid,
              title: connection.title,
              emoji: connection.emoji,
              description: connection.description,
              frequency: frequency.title,
              activities_completed: 0,
              total_activities: 5,
              is_paused: false,
              created_at: now,
            };
            if (savedChildName) connData.childName = savedChildName;
            const connRef = await addDoc(collection(db, 'user_connections'), connData);
            await createActivitiesForConnection(connRef.id, connection.title, firebaseUser.uid, getActivityCount(plan));
            [loadedConnections, loadedActivities] = await Promise.all([
              loadUserConnections(firebaseUser.uid),
              loadUserActivities(firebaseUser.uid),
            ]);
            plan = { ...plan, connectionCount: loadedConnections.length };
          }
          pendingConnectionRef.current = null;
          setSelectedConnection(null);
          setSelectedFrequency(null);
        }

        // Load email preferences — also creates them with defaults on first sign-in
        // and keeps the stored email/timezone current so scheduled emails reach the user.
        try {
          const { preferences } = await postPlanApi<{ preferences: EmailPreferences }>(
            '/api/preferences',
            { timezone: Intl.DateTimeFormat().resolvedOptions().timeZone }
          );
          setEmailPrefs(preferences);
        } catch (error) {
          console.error('Error loading email preferences:', error);
        }

        // The live listeners (below) are the source of truth; only seed state from the
        // one-off load if they haven't delivered their first snapshot yet.
        if (liveSyncUidRef.current.connections !== firebaseUser.uid) setConnections(loadedConnections);
        if (liveSyncUidRef.current.activities !== firebaseUser.uid) setUserActivities(loadedActivities);
        setUserPlan(plan);
        setIsFirstTime(!sessionStorage.getItem('hasVisited'));
        setCurrentPage('dashboard');
        // Push permission is requested only from the explicit button in Account → Email preferences.
      } catch (err: any) {
        console.error('Auth flow error:', err);
        setCurrentPage('dashboard');
      } } else {
        setUser(null);
        setConnections([]);
        setUserActivities([]);
        setActivities([]);
        setUserPlan(null);
      }
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Service worker (offline page + push handling): registered on every load, without
  // asking for notification permission. The iOS app uses native push (FCM) instead.
  useEffect(() => {
    if (getAppContext() === 'ios-app') return;
    registerServiceWorker().catch(console.error);
  }, []);

  // Live sync: the user's connections and activities stream from Firestore so changes made
  // on another device (or by the server) show up without a reload. The snapshots are the
  // source of truth; local optimistic updates write the same values and get confirmed here.
  useEffect(() => {
    showActivitiesModalRef.current = showActivitiesModal;
    selectedActivityConnectionIdRef.current = selectedActivityConnection?.id ?? null;
  }, [showActivitiesModal, selectedActivityConnection?.id]);
  useEffect(() => {
    const uid = user?.id;
    if (!uid) {
      liveSyncUidRef.current = { connections: null, activities: null };
      return;
    }
    const unsubConnections = onSnapshot(
      query(collection(db, 'user_connections'), where('user_id', '==', uid)),
      (snap) => {
        const conns = sortConnections(snap.docs.map(d => ({ id: d.id, ...d.data() } as Connection)));
        liveSyncUidRef.current.connections = uid;
        setConnections(conns);
        // connectionCount is derived from the actual docs (it's write-protected by Firestore rules).
        setUserPlan(prev => prev && prev.connectionCount !== conns.length ? { ...prev, connectionCount: conns.length } : prev);
      },
      (error) => console.error('Connections live sync error:', error),
    );
    const unsubActivities = onSnapshot(
      query(collection(db, 'user_activities'), where('user_id', '==', uid)),
      (snap) => {
        const acts = sortActivities(snap.docs.map(d => ({ id: d.id, ...d.data() } as Activity)));
        liveSyncUidRef.current.activities = uid;
        setUserActivities(acts);
        // Keep the open nudges modal in step with the same data.
        const openConnectionId = selectedActivityConnectionIdRef.current;
        if (showActivitiesModalRef.current && openConnectionId) {
          // The modal tracks its position by index, so keep the order it opened
          // with: update docs in place, drop removed ones, append new ones.
          setActivities(prev => {
            const byId = new Map(acts.filter(a => a.connection_id === openConnectionId).map(a => [a.id, a] as const));
            const kept = prev.filter(a => byId.has(a.id)).map(a => byId.get(a.id)!);
            const keptIds = new Set(kept.map(a => a.id));
            return [...kept, ...[...byId.values()].filter(a => !keptIds.has(a.id))];
          });
        }
      },
      (error) => console.error('Activities live sync error:', error),
    );
    return () => {
      unsubConnections();
      unsubActivities();
      liveSyncUidRef.current = { connections: null, activities: null };
    };
  }, [user?.id]);

  // Real-time listener: sync entitlement fields from Firestore so that a webhook-driven
  // plan change (e.g. Premium bought on the web, App Store renewal, cancellation expiry,
  // trial start/end) is reflected live without a page reload.
  useEffect(() => {
    if (!user?.id) return;
    const unsubscribe = onSnapshot(doc(db, 'users', user.id), (snap) => {
      if (!snap.exists()) return;
      const remote = snap.data() as Partial<UserPlan>;
      setUserPlan(prev => {
        if (!prev) return prev;
        const entitlementKeys: (keyof UserPlan)[] = [
          'plan', 'subscriptionStatus', 'lsCustomerId', 'lsSubscriptionId', 'billingSource',
          'trialStartDate', 'trialEndDate', 'trialUsed',
        ];
        const updates: Partial<UserPlan> = {};
        for (const k of entitlementKeys) {
          if (remote[k] !== undefined && remote[k] !== prev[k]) {
            (updates as Record<string, unknown>)[k] = remote[k];
          }
        }
        return Object.keys(updates).length > 0 ? { ...prev, ...updates } : prev;
      });
    });
    return () => unsubscribe();
  }, [user?.id]);

  // Push notifications on this device: read the current state (never prompts).
  const refreshPushStatus = async () => {
    if (!appContext) return;
    try {
      if (appContext === 'ios-app') {
        const { FirebaseMessaging } = await import('@capacitor-firebase/messaging');
        const { receive } = await FirebaseMessaging.checkPermissions();
        setPushStatus(receive === 'granted' ? 'on' : receive === 'denied' ? 'denied' : 'off');
        return;
      }
      if (!isWebPushSupported()) { setPushStatus('unsupported'); return; }
      if (Notification.permission === 'denied') { setPushStatus('denied'); return; }
      const enabled = await isWebPushEnabled();
      setPushStatus(enabled ? 'on' : 'off');
      // Re-save an existing subscription inside the Android app (permission is
      // already granted, so no prompt) so the server knows to send reminder taps
      // to /?source=twa; subscriptions saved before that was recorded lack it.
      if (enabled && appContext === 'android-twa') void enableWebPush();
    } catch (error) {
      console.error('Error checking push status:', error);
      setPushStatus(appContext === 'ios-app' ? 'off' : 'unsupported');
    }
  };

  useEffect(() => {
    if (!appContext || !user?.id) return;
    void refreshPushStatus();
  }, [appContext, user?.id]);

  const handleEnablePush = async () => {
    if (!appContext || pushBusy) return;
    setPushBusy(true);
    setPushError(null);
    try {
      const ok = appContext === 'ios-app' ? await enableNativePush() : await enableWebPush();
      await refreshPushStatus();
      if (!ok) {
        const blocked = appContext === 'ios-app' || (typeof Notification !== 'undefined' && Notification.permission === 'denied');
        setPushError(blocked
          ? 'Notifications are blocked or weren\'t allowed. Allow them for TinyNudge in your device or browser settings, then try again.'
          : 'Couldn\'t turn on notifications. Please try again.');
      }
    } catch (error) {
      console.error('Error enabling push:', error);
      setPushError('Couldn\'t turn on notifications. Please try again.');
    } finally {
      setPushBusy(false);
    }
  };

  const handleDisablePush = async () => {
    if (pushBusy) return;
    setPushBusy(true);
    setPushError(null);
    try {
      const ok = await disableWebPush();
      await refreshPushStatus();
      if (!ok) setPushError('Couldn\'t turn off notifications. Please try again.');
    } catch (error) {
      console.error('Error disabling push:', error);
      setPushError('Couldn\'t turn off notifications. Please try again.');
    } finally {
      setPushBusy(false);
    }
  };

  // Localised App Store price for the iOS paywall (retried when the paywall opens if it failed).
  useEffect(() => {
    if (purchaseChannel !== 'apple-iap' || iapPrice) return;
    let cancelled = false;
    getPremiumProduct()
      .then(product => { if (!cancelled && product) setIapPrice(product.priceString); })
      .catch(console.error);
    return () => { cancelled = true; };
  }, [purchaseChannel, iapPrice, showUpgradeModal]);

  useEffect(() => {
    if (!showComingSoonToast) return;
    const t = setTimeout(() => setShowComingSoonToast(false), 3000);
    return () => clearTimeout(t);
  }, [showComingSoonToast]);

  useEffect(() => {
    if (!toastMessage) return;
    const t = setTimeout(() => setToastMessage(null), 3000);
    return () => clearTimeout(t);
  }, [toastMessage]);

  const showToast = (msg: string) => setToastMessage(msg);

  // ============================================================================
  // BACK BUTTON / BROWSER HISTORY
  // ============================================================================
  // Sub-pages (sign-in, account) and modals are React state, not routes. Each open
  // "layer" gets its own history entry so the browser back button, Android's
  // hardware back (TWA) and iOS swipe-back close the top layer instead of leaving
  // the app. The base page (home / dashboard) has no extra entry, so back from
  // there leaves normally and the first entry never traps the user.
  // Listed top-most first: back closes the first open one.
  const navLayers: { open: boolean; close: () => void }[] = [
    // A revealed card is claimed on back, so closing can't be used to re-roll the reward.
    { open: showScratchCardModal, close: () => {
      if (scratchRevealed && currentScratchReward) {
        if (!scratchClaimingRef.current) handleApplyScratchReward(currentScratchReward.type);
      } else {
        setShowScratchCardModal(false);
        setScratchRevealed(false);
      }
    } },
    { open: showShareModal, close: () => setShowShareModal(false) },
    { open: showUpgradeModal, close: () => setShowUpgradeModal(false) },
    { open: showChildNameModal, close: () => { setShowChildNameModal(false); setPendingConnectionForName(null); } },
    { open: showFrequencyModal, close: () => setShowFrequencyModal(false) },
    { open: showActivitiesModal, close: () => setShowActivitiesModal(false) },
    { open: showAddConnectionModal, close: () => setShowAddConnectionModal(false) },
    { open: currentPage === 'signin', close: () => setCurrentPage('home') },
    { open: currentPage === 'account', close: () => setCurrentPage('dashboard') },
  ];
  const openNavLayers = navLayers.filter(l => l.open);
  const navDepth = openNavLayers.length;

  // tnDepth of the history entry we are on (0 = base entry).
  const historyDepthRef = useRef(0);
  const closeNavLayersRef = useRef<(count: number) => void>(() => {});
  closeNavLayersRef.current = (count: number) => {
    openNavLayers.slice(0, count).forEach(l => l.close());
  };

  // Next.js' own router keys (__NA, tree): without them the app router reloads the
  // page on popstate. Captured at mount because the current entry can lose them
  // (e.g. a hash-link click creates an entry whose state is null).
  const nextHistoryStateRef = useRef<Record<string, unknown>>({});
  const withDepth = (depth: number) => ({
    ...(window.history.state ?? {}),
    ...(nextHistoryStateRef.current.__NA ? nextHistoryStateRef.current : {}),
    tnDepth: depth,
  });

  useEffect(() => {
    const initial = window.history.state as Record<string, unknown> | null;
    nextHistoryStateRef.current = {
      __NA: initial?.__NA,
      __PRIVATE_NEXTJS_INTERNALS_TREE: initial?.__PRIVATE_NEXTJS_INTERNALS_TREE,
    };
    // Normalise the entry we loaded on (a reload restores modal-less UI).
    try { window.history.replaceState(withDepth(0), ''); } catch { /* ignore */ }
    historyDepthRef.current = 0;

    const onPopState = (event: PopStateEvent) => {
      const raw = (event.state as { tnDepth?: unknown } | null)?.tnDepth;
      const target = typeof raw === 'number' ? raw : 0;
      const current = historyDepthRef.current;
      if (target === current) return;
      if (target < current) {
        historyDepthRef.current = target;
        closeNavLayersRef.current(current - target);
      } else {
        // Forward button: closed layers can't be re-opened, so step back again.
        window.history.go(current - target);
      }
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  // Keep history in step when layers are opened or closed from the UI.
  useEffect(() => {
    const current = historyDepthRef.current;
    if (navDepth === current) return;
    try {
      if (navDepth > current) {
        for (let d = current + 1; d <= navDepth; d++) window.history.pushState(withDepth(d), '');
      } else {
        // Closed via an on-screen button: drop the now-stale entries so the next
        // back press doesn't land on a layer that is no longer open.
        window.history.go(navDepth - current);
      }
    } catch (error) {
      console.error('History sync error:', error);
    }
    historyDepthRef.current = navDepth;
  }, [navDepth]);

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================

  const handleConnectionSelect = (connectionType: ConnectionType) => {
    if (!LIVE_CONNECTION_TITLES.has(connectionType.title)) return;
    // Collect child's name before proceeding
    setPendingConnectionForName(connectionType);
    setChildNameInput('');
    setShowChildNameModal(true);
  };

  const handleChildNameConfirm = () => {
    if (!pendingConnectionForName) return;
    const connectionType = pendingConnectionForName;
    setShowChildNameModal(false);
    setPendingConnectionForName(null);

    // If we're in the add-connection dashboard flow, route there
    if (user?.id) {
      void handleAddConnectionWithName(connectionType, childNameInput.trim());
      return;
    }

    // Home page onboarding flow
    setSelectedConnection(connectionType);
    const defaultFrequency = FREQUENCIES[0];
    setSelectedFrequency(defaultFrequency);
    pendingConnectionRef.current = { connection: connectionType, frequency: defaultFrequency, childName: childNameInput.trim() };
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setAuthTab('signup');
      setCurrentPage('signin');
    }, 3000);
  };

  const handleFrequencySelect = (frequency: Frequency) => {
    if (!selectedConnection) return;
    setSelectedFrequency(frequency);
    pendingConnectionRef.current = { connection: selectedConnection, frequency, childName: pendingConnectionRef.current?.childName };
    setShowFrequencyModal(false);
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setAuthTab('signup');
      setCurrentPage('signin');
    }, 3000);
  };

  // Shared post-sign-in flow for Google / Apple (popup, redirect or native).
  const handleOAuthSuccess = (result: UserCredential, source: 'google' | 'apple') => {
    sessionStorage.setItem('hasVisited', 'true');
    const isNew = getAdditionalUserInfo(result)?.isNewUser;
    if (isNew) {
      const { displayName } = result.user;
      const today = new Date().toISOString().split('T')[0];
      fireLoopsEvent('signup', { contactProperties: { firstName: displayName?.split(' ')[0] ?? '', source } }).catch(console.error);
      updateLoopsContact({ currentStreak: 0, lastActiveDate: today }).catch(console.error);
    }
  };

  // Errors that mean the user backed out of the sign-in sheet; not worth an alert.
  const isAuthCancelled = (error: any) => {
    const code: string = String(error?.code || '');
    const message: string = String(error?.message || '');
    return code === 'auth/popup-closed-by-user'
      || code === 'auth/cancelled-popup-request'
      || /cancel/i.test(code)
      || /cancel/i.test(message);
  };

  const handleGoogleSignIn = async () => {
    if (loading) return;
    setLoading(true);
    try {
      if (appContext === 'ios-app') {
        // Google blocks OAuth in WKWebView, so use the native Google SDK.
        const result = await nativeSignInWithGoogle();
        handleOAuthSuccess(result, 'google');
        return;
      }
      const provider = new GoogleAuthProvider();
      try {
        const result = await signInWithPopup(auth, provider);
        handleOAuthSuccess(result, 'google');
      } catch (popupError: any) {
        // Fall back to a full-page redirect only inside the Android app. On the website
        // the authDomain (firebaseapp.com) is cross-site, so browsers that partition
        // third-party storage (Safari, Firefox) lose the redirect result silently;
        // there the alert below asks the user to allow the popup and retry.
        const canRedirect = appContext === 'android-twa';
        if (canRedirect && (popupError?.code === 'auth/popup-blocked' || popupError?.code === 'auth/operation-not-supported-in-this-environment')) {
          // getRedirectResult on load finishes the flow.
          try {
            if (pendingConnectionRef.current) {
              sessionStorage.setItem(PENDING_CONNECTION_KEY, JSON.stringify(pendingConnectionRef.current));
            }
          } catch {
            // sessionStorage unavailable: the onboarding selection is simply not restored
          }
          await signInWithRedirect(auth, provider);
          return;
        }
        throw popupError;
      }
    } catch (error: any) {
      if (!isAuthCancelled(error)) {
        console.error('Google sign-in error:', error);
        if (error?.code === 'auth/popup-blocked') {
          alert('Your browser blocked the Google sign-in window. Please allow pop-ups for this site and try again.');
        } else {
          alert('Error signing in with Google: ' + error.message);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAppleSignIn = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const result = await nativeSignInWithApple();
      handleOAuthSuccess(result, 'apple');
    } catch (error: any) {
      if (!isAuthCancelled(error)) {
        console.error('Apple sign-in error:', error);
        alert('Error signing in with Apple: ' + error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async () => {
    if (loading) return;
    if (!signinForm.email || !signinForm.password) {
      alert('Please enter your email and password');
      return;
    }
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, signinForm.email, signinForm.password);
      sessionStorage.setItem('hasVisited', 'true');
    } catch (error: any) {
      console.error('Sign in error:', error);
      alert(error.message || 'Error signing in. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    const email = signinForm.email.trim();
    if (!email) {
      setResetStatus({ kind: 'error', message: 'Enter your email address above, then tap "Forgot password?" again.' });
      return;
    }
    setResetStatus(null);
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (error: any) {
      const code: string = error?.code || '';
      if (code === 'auth/invalid-email') {
        setResetStatus({ kind: 'error', message: 'Please enter a valid email address.' });
        return;
      }
      if (code === 'auth/too-many-requests' || code === 'auth/network-request-failed') {
        setResetStatus({ kind: 'error', message: 'Could not send the reset email right now. Please try again in a few minutes.' });
        return;
      }
      // Any other error (e.g. auth/user-not-found) gets the same neutral confirmation
      // so we never reveal whether an account exists for this email.
      console.error('Password reset error:', error);
    }
    setResetStatus({
      kind: 'sent',
      message: "If an account exists for that email, we've sent a link to reset your password. Check your inbox (and spam folder).",
    });
  };

  const handleSignUp = async () => {
    if (loading) return;
    const { email, password, confirmPassword } = signupForm;
    if (!email) { alert('Please enter your email address'); return; }
    if (!password) { alert('Please enter a password'); return; }
    if (password !== confirmPassword) { alert('Passwords do not match'); return; }
    if (password.length < 6) { alert('Password must be at least 6 characters'); return; }
    setLoading(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      const firstName = email.split('@')[0];
      await updateProfile(cred.user, { displayName: firstName });
      sessionStorage.setItem('hasVisited', 'true');
      // Register new contact in Loops — fire-and-forget, email is non-critical path
      const today = new Date().toISOString().split('T')[0];
      fireLoopsEvent('signup', { contactProperties: { firstName, source: 'email' } }).catch(console.error);
      updateLoopsContact({ currentStreak: 0, lastActiveDate: today }).catch(console.error);
    } catch (error: any) {
      console.error('Sign up error:', error);
      alert(error.message || 'Error creating account. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Sign out error:', error);
    }
    setUser(null);
    setUserPlan(null);
    setUserName('');
    setConnections([]);
    setUserActivities([]);
    setActivities([]);
    setSelectedConnection(null);
    setSelectedActivityConnection(null);
    setShowAddConnectionModal(false);
    setShowActivitiesModal(false);
    setShowFrequencyModal(false);
    pendingConnectionRef.current = null;
    sessionStorage.removeItem('hasVisited');
    setCurrentPage('home');
  };

  const savePreferences = async (updates: Partial<EmailPreferences>) => {
    if (!user?.id) return;
    const previous = emailPrefs;
    setEmailPrefs(prev => ({ ...prev, ...updates }));
    setPrefsSaveStatus('saving');
    try {
      const { preferences } = await postPlanApi<{ preferences: EmailPreferences }>('/api/preferences', updates);
      setEmailPrefs(preferences);
      setPrefsSaveStatus('saved');
      setTimeout(() => setPrefsSaveStatus(s => (s === 'saved' ? 'idle' : s)), 2500);
    } catch (error) {
      console.error('Error saving preferences:', error);
      setEmailPrefs(previous);
      setPrefsSaveStatus('error');
    }
  };

  const handleAddConnection = (connectionType: ConnectionType) => {
    if (!user?.id) { alert('Please sign in to add connections'); return; }
    const duplicate = connections.some(c => c.title === connectionType.title);
    if (duplicate) {
      showToast(`You already have a connection for ${connectionType.title}.`);
      return;
    }
    if (userPlan && !isPlanAllowed(userPlan, 'connection')) {
      setUpgradeBlockReason('connection');
      setShowUpgradeModal(true);
      setShowAddConnectionModal(false);
      return;
    }
    // For Son/Daughter, collect child name first
    if (LIVE_CONNECTION_TITLES.has(connectionType.title)) {
      setPendingConnectionForName(connectionType);
      setChildNameInput('');
      setShowChildNameModal(true);
      setShowAddConnectionModal(false);
      return;
    }
    void handleAddConnectionWithName(connectionType, '');
  };

  const handleAddConnectionWithName = async (connectionType: ConnectionType, childName: string) => {
    if (!user?.id || !userPlan) return;
    // Fresh Firestore check — guards against stale React state for both duplicate and plan limit
    const existingSnap = await getDocs(query(collection(db, 'user_connections'), where('user_id', '==', user.id)));
    const existingTitles = existingSnap.docs.map(d => (d.data() as { title: string }).title);
    if (existingTitles.includes(connectionType.title)) {
      showToast(`You already have a connection for ${connectionType.title}.`);
      return;
    }
    const freshCount = existingSnap.size;
    const planWithFreshCount = { ...userPlan, connectionCount: freshCount };
    if (!isPlanAllowed(planWithFreshCount, 'connection')) {
      setUpgradeBlockReason('connection');
      setShowUpgradeModal(true);
      return;
    }
    try {
      const now = new Date().toISOString();
      const connData: Record<string, unknown> = {
        user_id: user.id,
        title: connectionType.title,
        emoji: connectionType.emoji,
        description: connectionType.description,
        frequency: selectedFrequency?.title || 'As needed',
        activities_completed: 0,
        total_activities: 5,
        is_paused: false,
        created_at: now,
      };
      if (childName) connData.childName = childName;
      const connRef = await addDoc(collection(db, 'user_connections'), connData);
      await createActivitiesForConnection(connRef.id, connectionType.title, user.id, userPlan ? getActivityCount(userPlan) : 5);
      // The live listeners pick up the new connection, its activities and connectionCount.
      setShowAddConnectionModal(false);
    } catch (error) {
      console.error('Error adding connection:', error);
      alert('Failed to add connection. Please try again.');
    }
  };

  const handleDeleteConnection = async (connectionId: string) => {
    if (!user?.id) return;
    if (!window.confirm('Delete this connection and all its activities? This cannot be undone.')) return;
    try {
      const q = query(collection(db, 'user_activities'), where('user_id', '==', user.id), where('connection_id', '==', connectionId));
      const snapshot = await getDocs(q);
      const batch = writeBatch(db);
      snapshot.docs.forEach(d => batch.delete(d.ref));
      batch.delete(doc(db, 'user_connections', connectionId));
      await batch.commit();

      setConnections(prev => prev.filter(c => c.id !== connectionId));
      setUserActivities(prev => prev.filter(a => a.connection_id !== connectionId));
      if (selectedActivityConnection?.id === connectionId) {
        setShowActivitiesModal(false);
        setSelectedActivityConnection(null);
        setActivities([]);
      }
    } catch (error) {
      console.error('Error deleting connection:', error);
      alert('Failed to delete connection.');
      return;
    }
    // connectionCount is owned by the connections live listener (it already fired for this delete).
  };

  const handleTogglePause = async (connectionId: string) => {
    if (!user?.id) return;
    const connection = connections.find(c => c.id === connectionId);
    if (!connection) return;
    const newPauseStatus = !connection.is_paused;
    const newActivityStatus: Activity['status'] = newPauseStatus ? 'paused' : 'active';
    try {
      await updateDoc(doc(db, 'user_connections', connectionId), { is_paused: newPauseStatus });
      setConnections(prev => prev.map(c => c.id === connectionId ? { ...c, is_paused: newPauseStatus } : c));

      const toUpdate = userActivities.filter(
        a => a.connection_id === connectionId && (a.status === 'active' || a.status === 'paused')
      );
      if (toUpdate.length > 0) {
        const batch = writeBatch(db);
        toUpdate.forEach(a => batch.update(doc(db, 'user_activities', a.id), { status: newActivityStatus }));
        await batch.commit();
        setUserActivities(prev => prev.map(a =>
          toUpdate.find(u => u.id === a.id) ? { ...a, status: newActivityStatus } : a
        ));
        setActivities(prev => prev.map(a =>
          toUpdate.find(u => u.id === a.id) ? { ...a, status: newActivityStatus } : a
        ));
      }
    } catch (error) {
      console.error('Error toggling pause:', error);
      alert('Failed to update connection.');
    }
  };

  const handleViewActivities = async (connection: Connection, initialActivityId?: string) => {
    if (!user?.id) return;
    setSelectedActivityConnection(connection);
    const loaded = await loadUserActivities(user.id);
    let connActivities = loaded.filter(a => a.connection_id === connection.id);

    // Top up to full allocation for trial/premium users with existing connections
    const targetCount = userPlan ? getActivityCount(userPlan) : 5;
    if (connActivities.length < targetCount) {
      const CONNECTION_TITLE_TO_RELATIONSHIP: Partial<Record<string, RelationshipType>> = {
        'Son': 'son-under-10',
        'Daughter': 'daughter-under-10',
      };
      const relationshipType = CONNECTION_TITLE_TO_RELATIONSHIP[connection.title];
      if (relationshipType) {
        const existingNudgeIds = new Set(connActivities.map(a => a.nudge_id).filter(Boolean) as string[]);
        const allNudges = getNudgesByRelationship(relationshipType);
        const toAdd = allNudges
          .filter(n => !existingNudgeIds.has(n.id))
          .slice(0, targetCount - connActivities.length);
        if (toAdd.length > 0) {
          const now = new Date().toISOString();
          const newActivities: Activity[] = [];
          const batch = writeBatch(db);
          for (const nudge of toAdd) {
            const ref = doc(collection(db, 'user_activities'));
            const data = {
              connection_id: connection.id,
              user_id: user.id,
              nudge_id: nudge.id,
              title: nudge.title,
              description: nudge.description,
              status: 'active' as const,
              created_at: now,
              completed_at: null,
            };
            batch.set(ref, data);
            newActivities.push({ id: ref.id, ...data });
          }
          await batch.commit();
          connActivities = sortActivities([...connActivities, ...newActivities]);
          setUserActivities([...loaded, ...newActivities]);
        } else {
          setUserActivities(loaded);
        }
      } else {
        setUserActivities(loaded);
      }
    } else {
      setUserActivities(loaded);
    }

    setActivities(connActivities);
    const initialIndex = initialActivityId ? connActivities.findIndex(a => a.id === initialActivityId) : -1;
    setCurrentActivityIndex(initialIndex >= 0 ? initialIndex : 0);
    const today = new Date().toISOString().split('T')[0];
    const statsSnap = await getDoc(doc(db, 'daily_stats', today));
    setNudgesTodayCount(statsSnap.exists() ? (statsSnap.data().nudgeCount ?? 0) : 0);
    setNudgeStatusFilter('all');
    setNudgeTimeFilter(null);
    setNudgeEffortFilter(null);
    setNudgeMaterialFilter(null);
    setShowActivitiesModal(true);
  };

  useEffect(() => {
    if (restoredNudgesModalRef.current || !user?.id || !userPlan || connections.length === 0) return;

    const params = new URLSearchParams(window.location.search);
    if (params.get('open') !== 'nudges') return;

    const connectionId = params.get('connectionId');
    if (!connectionId) return;

    const connection = connections.find(c => c.id === connectionId);
    if (!connection) return;

    restoredNudgesModalRef.current = true;
    setCurrentPage('dashboard');
    void handleViewActivities(connection, params.get('activityId') ?? undefined)
      .then(() => {
        window.history.replaceState(null, '', window.location.pathname);
      })
      .catch(error => {
        console.error('Error restoring nudges modal:', error);
      });
  }, [connections, user?.id, userPlan]);

  const handleCompleteActivity = async (activityId: string) => {
    if (!user?.id) return;
    if (completingActivityRef.current) return; // prevent double-tap / rapid re-entry
    const completedActivity = userActivities.find(a => a.id === activityId);
    if (!completedActivity || completedActivity.status === 'completed') return;
    completingActivityRef.current = activityId;
    try {
      const { updates: planUpdates, streakSaved, completedAt: now } = await postPlanApi<{
        updates: Partial<UserPlan>;
        streakSaved: boolean;
        completedAt: string;
      }>('/api/activities/complete', { activityId, localDate: getLocalDateStr() });
      const idToken = await auth.currentUser?.getIdToken();
      await fetch('/api/stats/nudge', {
        method: 'POST',
        headers: { Authorization: `Bearer ${idToken}` },
      });
      tapFeedback();
      setNudgesTodayCount(prev => prev + 1);
      setUserActivities(prev => prev.map(a => a.id === activityId ? { ...a, status: 'completed', completed_at: now } : a));
      const updatedActivities = activities.map(a => a.id === activityId ? { ...a, status: 'completed' as Activity['status'], completed_at: now } : a);
      setActivities(updatedActivities);
      if (selectedActivityConnection) {
        const completedCount = updatedActivities.filter(a => a.status === 'completed').length;
        await updateDoc(doc(db, 'user_connections', selectedActivityConnection.id), { activities_completed: completedCount });
        setConnections(prev => prev.map(c => c.id === selectedActivityConnection.id ? { ...c, activities_completed: completedCount } : c));
      }
      setUserPlan(prev => prev ? { ...prev, ...planUpdates } : prev);
      if (streakSaved) {
        setStreakSavedByFreeze(true);
        setTimeout(() => setStreakSavedByFreeze(false), 4000);
      }
      if (completedActivity) {
        setShareActivity(completedActivity);
        setShowShareModal(true);
      }
    } catch (error) {
      console.error('Error completing activity:', error);
      alert('Failed to complete activity.');
    } finally {
      completingActivityRef.current = null;
    }
  };

  const handleSkipActivity = async (activityId: string) => {
    if (!user?.id) return;
    try {
      await updateActivityStatus(activityId, 'skipped');
      setUserActivities(prev => prev.map(a => a.id === activityId ? { ...a, status: 'skipped', completed_at: null } : a));
      setActivities(prev => prev.map(a => a.id === activityId ? { ...a, status: 'skipped', completed_at: null } : a));
    } catch (error) {
      console.error('Error skipping activity:', error);
      alert('Failed to skip activity.');
    }
  };

  const handleUndoSkipActivity = async (activityId: string) => {
    if (!user?.id) return;
    const activity = userActivities.find(a => a.id === activityId);
    const connection = connections.find(c => c.id === activity?.connection_id);
    const newStatus: Activity['status'] = connection?.is_paused ? 'paused' : 'active';
    try {
      await updateActivityStatus(activityId, newStatus);
      setUserActivities(prev => prev.map(a => a.id === activityId ? { ...a, status: newStatus, completed_at: null } : a));
      setActivities(prev => prev.map(a => a.id === activityId ? { ...a, status: newStatus, completed_at: null } : a));
    } catch (error) {
      console.error('Error undoing skip:', error);
      alert('Failed to undo skip.');
    }
  };

  const handleStartTrial = async () => {
    // The server trial is web-only: on iOS the App Store intro offer is the trial,
    // and the Android app has no purchase path at all.
    if (purchaseChannel !== 'lemonsqueezy') return;
    if (!user?.id || !userPlan || userPlan.trialUsed) return;
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) { alert('Please sign in again.'); return; }
      const idToken = await currentUser.getIdToken();
      const res = await fetch('/api/trial/start', {
        method: 'POST',
        headers: { Authorization: `Bearer ${idToken}` },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        console.error('Trial start failed:', body);
        alert('Failed to start trial. Please try again.');
        return;
      }
      const { trialStartDate, trialEndDate } = await res.json();
      const updates: Partial<UserPlan> = {
        plan: 'trial',
        trialStartDate,
        trialEndDate,
        trialUsed: true,
      };
      setUserPlan(prev => prev ? { ...prev, ...updates } : prev);
      setShowUpgradeModal(false);
      fireLoopsEvent('trial_started').catch(console.error);
    } catch (error) {
      console.error('Trial start error:', error);
      alert('Failed to start trial. Please try again.');
    }
  };

  const openUpgradeModal = (reason: 'connection' | 'nudge' | null = null) => {
    setUpgradeBlockReason(reason);
    setShowUpgradeModal(true);
  };

  const handleUpgrade = async () => {
    if (!user?.id) return;
    if (purchaseChannel === 'apple-iap') { openUpgradeModal(); return; }
    if (purchaseChannel !== 'lemonsqueezy') return;
    setLoading(true);
    setShowUpgradeModal(false);
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) { alert('Please sign in again.'); setLoading(false); return; }
      const idToken = await currentUser.getIdToken();
      const res = await fetch('/api/lemonsqueezy/checkout', {
        method: 'POST',
        headers: { Authorization: `Bearer ${idToken}` },
      });
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        console.error('Checkout error status:', res.status, res.statusText);
        console.error('Checkout error body:', text);
        alert('Failed to start checkout. Please try again.');
        return;
      }
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert('Failed to start checkout. Please try again.');
      }
    } catch (err) {
      console.error('Checkout error:', err);
      alert('Failed to start checkout. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Re-read entitlement fields from users/{uid} so a verified purchase unlocks Premium immediately.
  const refreshUserPlan = async () => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    try {
      const snap = await getDoc(doc(db, 'users', uid));
      if (!snap.exists()) return;
      const remote = snap.data() as Partial<UserPlan>;
      setUserPlan(prev => prev ? { ...prev, ...remote, connectionCount: prev.connectionCount } : prev);
    } catch (error) {
      console.error('Error refreshing plan:', error);
    }
  };

  const handleApplePurchase = async () => {
    if (purchaseChannel !== 'apple-iap' || iapBusy) return;
    setIapBusy(true);
    try {
      const result = await purchasePremium();
      if (result === 'purchased') {
        await refreshUserPlan();
        setShowUpgradeModal(false);
        showToast('Welcome to Premium! ✨');
      } else if (result === 'pending') {
        alert('Your purchase is waiting for approval. Premium will unlock as soon as it goes through.');
      }
    } catch (error: any) {
      console.error('Apple purchase error:', error);
      alert(error?.message || 'The purchase could not be completed. Please try again.');
    } finally {
      setIapBusy(false);
    }
  };

  const handleRestorePurchases = async () => {
    if (purchaseChannel !== 'apple-iap' || iapBusy) return;
    setIapBusy(true);
    try {
      const restored = await restorePurchases();
      await refreshUserPlan();
      if (restored) {
        setShowUpgradeModal(false);
        showToast('Purchases restored ✨');
      } else {
        alert('No active TinyNudge subscription was found for this Apple ID.');
      }
    } catch (error: any) {
      console.error('Restore purchases error:', error);
      alert(error?.message || 'Could not restore purchases. Please try again.');
    } finally {
      setIapBusy(false);
    }
  };

  const handleManageAppleSubscription = () => {
    openManageSubscriptions().catch(console.error);
  };

  // Email/password accounts confirm deletion with their password (the server
  // requires a recent sign-in); Google/Apple accounts re-confirm in a sign-in sheet.
  const deleteNeedsPassword = (() => {
    if (!user?.id) return false;
    const providers = getSignInProviders();
    return providers.includes('password') && !providers.includes('google.com') && !providers.includes('apple.com');
  })();

  const handleDeleteAccount = async () => {
    if (deletingAccount || deleteConfirmText.trim() !== 'DELETE') return;
    if (deleteNeedsPassword && !deletePassword) {
      setDeleteAccountError('Please enter your password to confirm.');
      return;
    }
    setDeletingAccount(true);
    setDeleteAccountError(null);
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) { setDeleteAccountError('Please sign in again, then try deleting your account.'); return; }

      // The server only accepts a sign-in from the last 5 minutes. Re-verify first
      // (synchronously from the click, so the Google popup isn't blocked) unless
      // the user just signed in. Sign in with Apple users in the iOS app always
      // re-verify: that returns the code used to revoke the app's Apple tokens.
      const appleInApp = appContext === 'ios-app' && getSignInProviders().includes('apple.com');
      const lastSignIn = Date.parse(currentUser.metadata.lastSignInTime ?? '');
      const signedInRecently = !Number.isNaN(lastSignIn) && Date.now() - lastSignIn < 4 * 60 * 1000;
      let reauthenticated = false;
      const reauthenticate = async () => {
        const { appleAuthorizationCode } = await reauthenticateCurrentUser(deletePassword || undefined);
        reauthenticated = true;
        if (appleAuthorizationCode) {
          // Required by App Review; don't block the deletion if Apple/Firebase rejects it.
          await revokeAppleSignIn(appleAuthorizationCode).catch(err => console.error('Apple token revoke failed:', err));
        }
      };
      try {
        if (appleInApp || deleteNeedsPassword || !signedInRecently) await reauthenticate();
      } catch (error: any) {
        if (isAuthCancelled(error)) {
          setDeleteAccountError('Your account was not deleted. Please confirm your sign-in to delete it.');
        } else if (error?.code === 'auth/wrong-password' || error?.code === 'auth/invalid-credential') {
          setDeleteAccountError('That password is not correct. Your account was not deleted.');
        } else {
          console.error('Re-authentication error:', error);
          setDeleteAccountError(error?.message || 'Please sign in again, then try deleting your account.');
        }
        return;
      }

      const postDelete = async () => {
        const idToken = await currentUser.getIdToken(true);
        const res = await fetch('/api/account/delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
          body: '{}',
        });
        const data = await res.json().catch(() => ({})) as { ok?: boolean; error?: string; code?: string; appleSubscriptionActive?: boolean };
        return { res, data };
      };
      let { res, data } = await postDelete();
      if (res.status === 401 && data.code === 'reauth_required' && !reauthenticated) {
        try {
          await reauthenticate();
        } catch (error: any) {
          if (!isAuthCancelled(error)) console.error('Re-authentication error:', error);
          setDeleteAccountError('Your account was not deleted. Please confirm your sign-in and try again.');
          return;
        }
        ({ res, data } = await postDelete());
      }
      if (!res.ok || !data.ok) {
        setDeleteAccountError(data.error || 'We couldn\'t delete your account right now. Please try again.');
        return;
      }
      setShowDeleteAccount(false);
      setDeleteConfirmText('');
      setDeletePassword('');
      alert(
        data.appleSubscriptionActive
          ? 'Your account has been deleted. Your Apple subscription is not cancelled automatically: please cancel it in iPhone Settings → Apple ID → Subscriptions so you are not charged again.'
          : 'Your account and all your data have been deleted.'
      );
      await handleSignOut();
    } catch (error) {
      console.error('Delete account error:', error);
      setDeleteAccountError('We couldn\'t delete your account right now. Please try again.');
    } finally {
      setDeletingAccount(false);
    }
  };

  const handleComingSoon = () => {
    setShowUpgradeModal(false);
    setShowComingSoonToast(true);
  };

  const handleApplyScratchReward = async (type: ScratchReward['type']) => {
    if (!user?.id || !userPlan || scratchClaimingRef.current) return;
    scratchClaimingRef.current = true;
    try {
      const { updates } = await postPlanApi<{ updates: Partial<UserPlan> }>('/api/scratch/apply', { type });
      setUserPlan(prev => prev ? { ...prev, ...updates } : prev);
    } catch (error) {
      console.error('Error applying scratch reward:', error);
      alert('Failed to apply reward. Please try again.');
    } finally {
      scratchClaimingRef.current = false;
    }
    setShowScratchCardModal(false);
    setScratchRevealed(false);
    setCurrentScratchReward(null);
  };

  // ============================================================================
  // UI COMPONENTS
  // ============================================================================

  const LoadingScreen = () => (
    <div className="min-h-screen bg-gradient-to-br from-pink-100 via-purple-50 to-blue-100 flex items-center justify-center relative overflow-hidden">
      <div className="absolute inset-0">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="absolute animate-pulse"
            style={{ left: `${20 + i * 15}%`, top: `${10 + (i % 3) * 30}%`, animationDelay: `${i * 0.5}s`, animationDuration: '2s' }}
          >
            <Heart className="w-6 h-6 text-pink-300 fill-pink-300 opacity-40" />
          </div>
        ))}
      </div>
      <div className="text-center z-10">
        <div className="w-32 h-32 bg-gradient-to-br from-pink-400 to-pink-600 rounded-full flex items-center justify-center mx-auto mb-8 animate-bounce shadow-2xl">
          <Heart className="w-16 h-16 text-white fill-white animate-pulse" />
        </div>
        <h2 className="text-3xl font-bold text-gray-800 mb-4 animate-pulse">
          Creating Your Connection Journey...
        </h2>
        <p className="text-lg text-gray-600 animate-pulse">
          Preparing personalized nudges for your {selectedConnection?.title?.toLowerCase()}
        </p>
        <div className="w-80 mx-auto mt-8">
          <div className="bg-white bg-opacity-50 rounded-full h-3 overflow-hidden shadow-inner">
            <div
              className="h-full bg-gradient-to-r from-pink-400 via-purple-400 to-blue-400 rounded-full animate-pulse"
              style={{ width: '85%' }}
            />
          </div>
        </div>
      </div>
    </div>
  );

  const ChildNameModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" style={SAFE_OVERLAY_STYLE}>
      <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl relative mx-4">
        <button
          onClick={() => { setShowChildNameModal(false); setPendingConnectionForName(null); }}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 bg-white rounded-full p-1 shadow-md"
        >
          <X className="w-5 h-5" />
        </button>
        <div className="text-center mb-6">
          <div className="text-4xl mb-3">{pendingConnectionForName?.emoji ?? '👶'}</div>
          <h3 className="text-2xl font-bold text-gray-900 mb-2">
            What&apos;s your {pendingConnectionForName?.title?.toLowerCase()}&apos;s name?
          </h3>
          <p className="text-gray-500 text-sm">We&apos;ll personalise your nudges and reminders.</p>
        </div>
        <input
          type="text"
          value={childNameInput}
          onChange={(e) => setChildNameInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleChildNameConfirm(); }}
          placeholder="e.g. Emma"
          autoFocus
          className="w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent mb-4"
        />
        <button
          onClick={handleChildNameConfirm}
          className="w-full bg-pink-500 hover:bg-pink-600 text-white font-semibold py-3 rounded-xl transition-colors"
        >
          Continue →
        </button>
        <button
          onClick={() => { setChildNameInput(''); handleChildNameConfirm(); }}
          className="w-full text-gray-400 text-sm mt-2 py-1 hover:text-gray-600 transition-colors"
        >
          Skip for now
        </button>
      </div>
    </div>
  );

  const FrequencyModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" style={SAFE_OVERLAY_STYLE}>
      <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl relative mx-4">
        <button
          onClick={() => setShowFrequencyModal(false)}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 bg-white rounded-full p-1 shadow-md"
        >
          <X className="w-5 h-5" />
        </button>
        <div className="text-center mb-6">
          <h3 className="text-2xl font-bold text-gray-900 mb-2">Choose Your Connection Frequency</h3>
        </div>
        <div className="space-y-2">
          {FREQUENCIES.map((freq) => (
            <button
              key={freq.id}
              onClick={() => handleFrequencySelect(freq)}
              className={`w-full p-3 rounded-xl border-2 transition-all duration-200 text-left hover:scale-105 ${
                selectedFrequency?.id === freq.id
                  ? `${freq.selectedBg} ${freq.selectedBorder}`
                  : `${freq.bgColor} ${freq.borderColor}`
              }`}
            >
              <div className="flex justify-between items-center">
                <div>
                  <h4 className="font-semibold text-gray-900 mb-1">{freq.title}</h4>
                  <p className="text-sm text-gray-600">{freq.description}</p>
                </div>
                <div className="text-sm font-medium text-gray-700">{freq.time}</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  const AddConnectionModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" style={SAFE_OVERLAY_STYLE}>
      <div className="bg-white rounded-3xl p-8 max-w-4xl w-full shadow-2xl relative max-h-[80vh] overflow-y-auto">
        <button
          onClick={() => setShowAddConnectionModal(false)}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
        >
          <X className="w-6 h-6" />
        </button>
        <div className="text-center mb-8">
          <h3 className="text-2xl font-bold text-gray-900 mb-2">Add New Connection</h3>
          <p className="text-gray-600">Choose someone you'd like to strengthen your relationship with</p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {CONNECTION_TYPES.map((connection, index) => {
            const isLive = LIVE_CONNECTION_TITLES.has(connection.title);
            return isLive ? (
              <button
                key={index}
                onClick={() => handleAddConnection(connection)}
                className="bg-gray-50 rounded-2xl p-6 shadow-lg border border-gray-200 hover:shadow-xl hover:scale-105 transition-all duration-200 text-center"
              >
                <div className="text-4xl mb-3">{connection.emoji}</div>
                <h3 className="font-semibold text-gray-900 mb-2">{connection.title}</h3>
                <p className="text-sm text-gray-600">{connection.description}</p>
              </button>
            ) : (
              <div
                key={index}
                className="bg-gray-50 rounded-2xl p-6 shadow-lg border border-gray-200 text-center opacity-50 cursor-not-allowed relative"
              >
                <div className="text-4xl mb-3 grayscale">{connection.emoji}</div>
                <h3 className="font-semibold text-gray-500 mb-2">{connection.title}</h3>
                <p className="text-xs text-gray-400 font-medium">Coming Soon</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  const CATEGORY_CONFIG: Record<string, { label: string; pill: string }> = {
    touch: { label: 'Touch & Connect', pill: 'bg-pink-500' },
    play:  { label: 'Play Together',   pill: 'bg-purple-500' },
    talk:  { label: 'Talk & Connect',  pill: 'bg-blue-500' },
    move:  { label: 'Get Moving',      pill: 'bg-green-500' },
    calm:  { label: 'Wind Down',       pill: 'bg-indigo-500' },
  };
  const TIME_LABELS: Record<string, string> = { quick: '5 mins', medium: '15 mins', long: '30+ mins' };

  const ActivitiesModal = () => {
    if (activities.length === 0) {
      return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" style={SAFE_OVERLAY_STYLE}>
          <div className="bg-white rounded-2xl p-8 max-w-sm w-full text-center shadow-xl">
            <p className="text-gray-500 mb-4">No nudges yet for this connection.</p>
            <button onClick={() => setShowActivitiesModal(false)} className="text-gray-400 text-sm">Close</button>
          </div>
        </div>
      );
    }

    // Status counts
    const doneCount = activities.filter(a => a.status === 'completed').length;
    const laterCount = activities.filter(a => a.status === 'skipped').length;
    const activeCount = activities.filter(a => a.status === 'active').length;

    // Apply all filters
    const filteredActivities = activities.filter(a => {
      if (nudgeStatusFilter !== 'all' && a.status !== nudgeStatusFilter) return false;
      const n = a.nudge_id ? getNudgeById(a.nudge_id) : null;
      if (nudgeTimeFilter && (!n || n.timeRequired !== nudgeTimeFilter)) return false;
      if (nudgeEffortFilter && (!n || n.effortLevel !== nudgeEffortFilter)) return false;
      if (nudgeMaterialFilter !== null && (!n || n.materialNeeded !== nudgeMaterialFilter)) return false;
      return true;
    });

    // Find position of current activity in filtered set
    const currentId = activities[currentActivityIndex]?.id;
    const filteredIndex = filteredActivities.findIndex(a => a.id === currentId);
    const effectiveFiltered = filteredIndex >= 0 ? filteredIndex : 0;
    const activity = filteredActivities[effectiveFiltered] ?? activities[currentActivityIndex];

    const goPrev = () => {
      if (effectiveFiltered > 0) {
        const target = filteredActivities[effectiveFiltered - 1];
        const fullIdx = activities.findIndex(a => a.id === target.id);
        setCurrentActivityIndex(fullIdx >= 0 ? fullIdx : 0);
      }
    };
    const goNext = () => {
      if (effectiveFiltered < filteredActivities.length - 1) {
        const target = filteredActivities[effectiveFiltered + 1];
        const fullIdx = activities.findIndex(a => a.id === target.id);
        setCurrentActivityIndex(fullIdx >= 0 ? fullIdx : 0);
      }
    };
    const jumpTo = (pos: number) => {
      const target = filteredActivities[Math.min(pos, filteredActivities.length) - 1];
      if (target) {
        const fullIdx = activities.findIndex(a => a.id === target.id);
        setCurrentActivityIndex(fullIdx >= 0 ? fullIdx : 0);
      }
    };

    const nudge = activity?.nudge_id ? getNudgeById(activity.nudge_id) : null;
    const cat = nudge ? CATEGORY_CONFIG[nudge.category] : null;
    const timeLabel = nudge ? TIME_LABELS[nudge.timeRequired] : null;
    const countDisplay = nudgesTodayCount.toLocaleString();

    const hasAttrFilters = nudgeTimeFilter || nudgeEffortFilter || nudgeMaterialFilter !== null;
    const JUMP_MARKS = [10, 20, 30, 40, 50].filter(n => n <= filteredActivities.length);

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-0 md:p-6">
        <div className="w-full h-full md:h-auto md:max-h-[90vh] md:max-w-4xl md:rounded-2xl md:shadow-2xl overflow-hidden bg-white flex flex-col" style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}>

          {/* Top nav */}
          <nav className="flex-shrink-0 bg-white border-b border-gray-100 z-10">
            {/* Row 1: back / counter / close */}
            <div className="flex justify-between items-center px-4 md:px-6 py-3">
              <button onClick={() => setShowActivitiesModal(false)} className="flex items-center gap-1.5 text-gray-600 hover:text-gray-900 transition-colors active:scale-95">
                <ArrowLeft className="w-4 h-4" />
                <span className="text-xs font-semibold uppercase tracking-widest hidden sm:inline">Library</span>
              </button>
              <div className="flex items-center gap-2">
                <button
                  onClick={goPrev}
                  disabled={effectiveFiltered === 0}
                  className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-gray-200 disabled:opacity-25 disabled:cursor-not-allowed active:scale-90 transition-all"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <span className="text-sm font-bold text-gray-800 min-w-[60px] text-center tabular-nums">
                  {effectiveFiltered + 1} <span className="text-gray-400 font-normal">/</span> {filteredActivities.length}
                </span>
                <button
                  onClick={goNext}
                  disabled={effectiveFiltered >= filteredActivities.length - 1}
                  className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-gray-200 disabled:opacity-25 disabled:cursor-not-allowed active:scale-90 transition-all"
                >
                  <ArrowLeft className="w-4 h-4 rotate-180" />
                </button>
              </div>
              <div className="flex items-center gap-2">
                {canPurchase && (!userPlan || userPlan.plan === 'free') && (
                  <button
                    onClick={() => { setShowActivitiesModal(false); setUpgradeBlockReason(null); setShowUpgradeModal(true); }}
                    className="px-3 py-1.5 bg-pink-500 hover:bg-pink-600 text-white text-xs font-semibold rounded-full transition-colors"
                  >
                    Upgrade
                  </button>
                )}
                <button
                  onClick={() => setShowActivitiesModal(false)}
                  className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 active:scale-90 transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Row 2: status filter tabs */}
            <div className="flex items-center gap-2 px-4 md:px-6 pb-2 overflow-x-auto scrollbar-hide">
              {([
                { key: 'all', label: 'All', count: activities.length, color: 'bg-gray-800 text-white', inactive: 'bg-gray-100 text-gray-600 hover:bg-gray-200' },
                { key: 'active', label: 'To Do', count: activeCount, color: 'bg-blue-500 text-white', inactive: 'bg-blue-50 text-blue-600 hover:bg-blue-100' },
                { key: 'completed', label: '✓ Done', count: doneCount, color: 'bg-green-500 text-white', inactive: 'bg-green-50 text-green-700 hover:bg-green-100' },
                { key: 'skipped', label: '→ Later', count: laterCount, color: 'bg-amber-500 text-white', inactive: 'bg-amber-50 text-amber-700 hover:bg-amber-100' },
              ] as const).map(tab => (
                <button
                  key={tab.key}
                  onClick={() => {
                    setNudgeStatusFilter(tab.key);
                    const firstInFilter = activities.find(a => tab.key === 'all' || a.status === tab.key);
                    if (firstInFilter) setCurrentActivityIndex(activities.indexOf(firstInFilter));
                  }}
                  className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${nudgeStatusFilter === tab.key ? tab.color : tab.inactive}`}
                >
                  {tab.label}
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${nudgeStatusFilter === tab.key ? 'bg-white/25' : 'bg-black/10'}`}>
                    {tab.count}
                  </span>
                </button>
              ))}
              <div className="w-px h-4 bg-gray-200 flex-shrink-0 mx-1" />
              {/* Attribute filter pills */}
              {([
                { label: '5 min', active: nudgeTimeFilter === 'quick', onClick: () => setNudgeTimeFilter(nudgeTimeFilter === 'quick' ? null : 'quick') },
                { label: '15 min', active: nudgeTimeFilter === 'medium', onClick: () => setNudgeTimeFilter(nudgeTimeFilter === 'medium' ? null : 'medium') },
                { label: '30+ min', active: nudgeTimeFilter === 'long', onClick: () => setNudgeTimeFilter(nudgeTimeFilter === 'long' ? null : 'long') },
                { label: 'Low effort', active: nudgeEffortFilter === 'low', onClick: () => setNudgeEffortFilter(nudgeEffortFilter === 'low' ? null : 'low') },
                { label: 'High effort', active: nudgeEffortFilter === 'high', onClick: () => setNudgeEffortFilter(nudgeEffortFilter === 'high' ? null : 'high') },
                { label: 'No materials', active: nudgeMaterialFilter === false, onClick: () => setNudgeMaterialFilter(nudgeMaterialFilter === false ? null : false) },
                { label: 'Needs materials', active: nudgeMaterialFilter === true, onClick: () => setNudgeMaterialFilter(nudgeMaterialFilter === true ? null : true) },
              ]).map((f, i) => (
                <button
                  key={i}
                  onClick={f.onClick}
                  className={`flex-shrink-0 px-2.5 py-1 rounded-full text-xs font-medium transition-all border ${
                    f.active
                      ? 'bg-pink-500 text-white border-pink-500'
                      : 'bg-white text-gray-500 border-gray-200 hover:border-pink-300 hover:text-pink-600'
                  }`}
                >
                  {f.label}
                </button>
              ))}
              {hasAttrFilters && (
                <button
                  onClick={() => { setNudgeTimeFilter(null); setNudgeEffortFilter(null); setNudgeMaterialFilter(null); }}
                  className="flex-shrink-0 px-2.5 py-1 rounded-full text-xs font-medium text-gray-400 hover:text-red-500 transition-colors"
                >
                  Clear ✕
                </button>
              )}
            </div>

            {/* Row 3: jump marks (only if 10+ nudges in filtered set) */}
            {filteredActivities.length >= 10 && (
              <div className="flex items-center gap-1.5 px-4 md:px-6 pb-2.5">
                <span className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold mr-1">Jump:</span>
                {JUMP_MARKS.map(n => (
                  <button
                    key={n}
                    onClick={() => jumpTo(n)}
                    className="text-[11px] font-semibold text-gray-500 hover:text-pink-600 bg-gray-100 hover:bg-pink-50 px-2 py-0.5 rounded transition-all"
                  >
                    {n}
                  </button>
                ))}
              </div>
            )}
          </nav>

          {/* Body */}
          <div className="flex flex-1 overflow-hidden">

            {/* Left hero — desktop only */}
            <section className="hidden md:flex md:w-[42%] flex-shrink-0 relative flex-col">
              <div className="absolute inset-0 bg-gradient-to-br from-slate-200 to-slate-300" />
              {nudge && (
                <img
                  src={`/nudges/${nudge.id}.png`}
                  alt={nudge.title}
                  className="absolute inset-0 w-full h-full object-cover"
                  onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
              {activity.status === 'completed' && (
                <div className="absolute top-4 right-4 bg-green-500 text-white text-xs font-bold px-3 py-1.5 rounded-full z-10">✓ Done</div>
              )}
              {activity.status === 'skipped' && (
                <div className="absolute top-4 right-4 bg-gray-500 text-white text-xs font-bold px-3 py-1.5 rounded-full z-10">Skipped</div>
              )}
              <div className="absolute bottom-0 left-0 w-full p-8 text-white z-10">
                {cat && (
                  <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-4 ${cat.pill}`}>
                    <span className="text-xs font-bold uppercase tracking-wider text-white">{cat.label}</span>
                  </div>
                )}
                <h1 className="text-2xl font-bold leading-tight mb-3">{activity.title}</h1>
                <p className="text-white/75 text-sm leading-relaxed line-clamp-3">{activity.description}</p>
              </div>
            </section>

            {/* Right column — scrollable */}
            <section className="flex-1 overflow-y-auto flex flex-col bg-white">

              {/* Mobile hero */}
              <div className="md:hidden relative h-52 flex-shrink-0">
                <div className="absolute inset-0 bg-gradient-to-br from-slate-200 to-slate-300" />
                {nudge && (
                  <img
                    src={`/nudges/${nudge.id}.png`}
                    alt={nudge.title}
                    className="absolute inset-0 w-full h-full object-cover"
                    onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                {activity.status === 'completed' && (
                  <div className="absolute top-3 right-3 bg-green-500 text-white text-xs font-bold px-2.5 py-1 rounded-full">✓ Done</div>
                )}
                {activity.status === 'skipped' && (
                  <div className="absolute top-3 right-3 bg-gray-500 text-white text-xs font-bold px-2.5 py-1 rounded-full">Skipped</div>
                )}
                <div className="absolute bottom-4 left-4 right-4">
                  {cat && <span className={`inline-block ${cat.pill} px-3 py-1 rounded-full text-white text-xs font-bold uppercase tracking-wider mb-2`}>{cat.label}</span>}
                  <h2 className="text-white text-xl font-bold leading-tight">{activity.title}</h2>
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 px-5 md:px-8 py-6 space-y-6 max-w-[520px] mx-auto w-full">

                {/* Meta tags */}
                {nudge && (
                  <div className="flex flex-wrap gap-2">
                    <span className="flex items-center gap-1.5 bg-teal-50 text-teal-700 text-xs font-bold px-3 py-1.5 rounded-full">⏱ {timeLabel}</span>
                    <span className="flex items-center gap-1.5 bg-rose-50 text-rose-600 text-xs font-bold px-3 py-1.5 rounded-full">
                      {nudge.effortLevel === 'low' ? '⚡ Low effort' : '💪 High effort'}
                    </span>
                    <span className="flex items-center gap-1.5 bg-amber-50 text-amber-700 text-xs font-bold px-3 py-1.5 rounded-full">
                      {nudge.materialNeeded ? `🎒 ${nudge.materialDescription || 'Materials needed'}` : '✋ No materials'}
                    </span>
                  </div>
                )}

                {/* About */}
                <div className="space-y-2">
                  <h2 className="text-lg font-bold text-gray-900">About this Nudge</h2>
                  <p className="text-gray-500 text-sm leading-relaxed">{activity.description}</p>
                </div>

                {/* Steps */}
                {nudge && nudge.steps.length > 0 && (
                  <div className="space-y-4">
                    <h2 className="text-lg font-bold text-gray-900">How to do it</h2>
                    {nudge.steps.map((step, i) => (
                      <div key={i} className="flex gap-3 items-start">
                        <div className="flex-shrink-0 w-7 h-7 rounded-full bg-teal-600 text-white flex items-center justify-center text-xs font-bold">{i + 1}</div>
                        <p className="text-gray-700 text-sm leading-relaxed pt-1">{step}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* YouTube video */}
                {nudge?.videoUrl && (() => {
                  const url = nudge.videoUrl;
                  const idMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&?\s]+)/);
                  const videoId = idMatch?.[1];
                  if (!videoId) return null;
                  return (
                    <div>
                      <h2 className="text-lg font-bold text-gray-900 mb-3">Watch first</h2>
                      <div className="relative w-full rounded-2xl overflow-hidden bg-black" style={{ paddingBottom: '56.25%' }}>
                        <iframe
                          src={`https://www.youtube.com/embed/${videoId}`}
                          title={nudge.title}
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                          className="absolute inset-0 w-full h-full"
                        />
                      </div>
                      {/* External site: system browser / Safari sheet in the iOS app, new tab on web */}
                      <a
                        href={`https://www.youtube.com/watch?v=${videoId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => { e.preventDefault(); openExternal(`https://www.youtube.com/watch?v=${videoId}`); }}
                        className="inline-block mt-2 text-xs text-gray-500 hover:text-gray-700 underline underline-offset-2"
                      >
                        Open in YouTube
                      </a>
                    </div>
                  );
                })()}

                {/* Why it works */}
                {nudge && (
                  <div className="bg-teal-50/60 border-l-4 border-teal-600 p-4 rounded-r-xl space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-base">🧠</span>
                      <h3 className="text-xs font-bold text-teal-700 uppercase tracking-wider">Why this works</h3>
                    </div>
                    <p className="text-gray-600 text-sm leading-relaxed italic">"{nudge.whyItWorks}"</p>
                  </div>
                )}

                {/* Resource link */}
                {nudge && NUDGE_RESOURCE_MAP[nudge.id] && (() => {
                  const res = NUDGE_RESOURCE_MAP[nudge.id];
                  const resourceParams = new URLSearchParams({ returnTo: 'nudges' });
                  if (selectedActivityConnection?.id) resourceParams.set('connectionId', selectedActivityConnection.id);
                  if (activity?.id) resourceParams.set('activityId', activity.id);
                  const resourceHref = `${res.href}?${resourceParams.toString()}`;

                  return (
                    <a
                      href={resourceHref}
                      className="flex items-center gap-3 bg-purple-50 border border-purple-200 rounded-xl p-3.5 hover:bg-purple-100 transition-colors group"
                    >
                      <span className="text-xl flex-shrink-0">{res.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-purple-600 uppercase tracking-wider mb-0.5">Resources</p>
                        <p className="text-sm text-purple-800 font-medium group-hover:underline">{res.label} →</p>
                      </div>
                    </a>
                  );
                })()}

                {/* Affiliate */}
                {nudge?.affiliateProduct && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-amber-700 uppercase tracking-wider mb-0.5">Recommended</p>
                      <p className="font-semibold text-gray-900 text-sm">{nudge.affiliateProduct}</p>
                      {nudge.affiliatePrice && <p className="text-amber-600 text-xs mt-0.5">{nudge.affiliatePrice}</p>}
                    </div>
                    <span className="text-2xl">🛒</span>
                  </div>
                )}

                {/* Actions */}
                <div className="space-y-3 pt-1">
                  {activity.status === 'active' && (
                    <>
                      <button
                        onClick={() => handleCompleteActivity(activity.id)}
                        className="w-full h-14 bg-gradient-to-r from-amber-400 to-yellow-300 text-gray-900 font-bold rounded-full flex items-center justify-center gap-2 shadow-lg shadow-amber-200/60 hover:scale-[1.02] active:scale-95 transition-all"
                      >
                        <Star className="w-5 h-5 fill-current" /> Done it
                      </button>
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          onClick={() => handleSkipActivity(activity.id)}
                          className="h-12 rounded-full border-2 border-teal-200 bg-teal-50 text-teal-700 text-xs font-bold uppercase tracking-wider hover:bg-teal-100 transition-colors active:scale-95"
                        >
                          Later
                        </button>
                        {effectiveFiltered < filteredActivities.length - 1 ? (
                          <button
                            onClick={goNext}
                            className="h-12 rounded-full text-gray-400 text-xs font-bold uppercase tracking-wider hover:text-gray-600 transition-colors"
                          >
                            Save for another day
                          </button>
                        ) : (
                          <div className="h-12" />
                        )}
                      </div>
                    </>
                  )}

                  {activity.status === 'skipped' && (
                    <div className="space-y-2">
                      <button
                        onClick={() => handleUndoSkipActivity(activity.id)}
                        className="w-full h-14 bg-blue-500 text-white font-bold rounded-full hover:bg-blue-600 active:scale-95 transition-all"
                      >
                        Undo Later
                      </button>
                      {effectiveFiltered < filteredActivities.length - 1 && (
                        <button onClick={goNext} className="w-full h-12 text-gray-400 text-xs font-bold uppercase tracking-wider">
                          Next nudge →
                        </button>
                      )}
                    </div>
                  )}

                  {activity.status === 'completed' && (
                    <div className="space-y-2">
                      <div className="text-center py-1">
                        <span className="text-green-500 font-bold">✓ Great job!</span>
                        {activity.completed_at && <p className="text-gray-400 text-xs mt-1">Completed {new Date(activity.completed_at).toLocaleDateString()}</p>}
                      </div>
                      {effectiveFiltered < filteredActivities.length - 1 && (
                        <button
                          onClick={goNext}
                          className="w-full h-14 bg-gradient-to-r from-amber-400 to-yellow-300 text-gray-900 font-bold rounded-full hover:scale-[1.02] active:scale-95 transition-all"
                        >
                          Next Nudge →
                        </button>
                      )}
                    </div>
                  )}

                  {activity.status === 'paused' && (
                    <div className="text-center py-3">
                      <span className="text-yellow-600 text-sm font-medium">This connection is paused</span>
                    </div>
                  )}
                </div>

                {/* Community counter */}
                <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
                  <div className="flex -space-x-2">
                    {['🧑', '👩', '👨'].map((e, i) => (
                      <div key={i} className="w-8 h-8 rounded-full bg-gray-100 border-2 border-white flex items-center justify-center text-sm">{e}</div>
                    ))}
                    <div className="w-8 h-8 rounded-full bg-teal-100 border-2 border-white flex items-center justify-center text-[9px] font-bold text-teal-700">
                      +{nudgesTodayCount > 999 ? `${(nudgesTodayCount / 1000).toFixed(1)}k` : nudgesTodayCount}
                    </div>
                  </div>
                  <p className="text-xs font-semibold text-gray-400">{countDisplay} parents nudged today</p>
                </div>

              </div>
            </section>
          </div>
        </div>
      </div>
    );
  };

  const DashboardHeader = () => (
    <>
      {/* Desktop header */}
      <header className="fixed top-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-b border-gray-200 z-50 flex justify-between items-center px-6 pb-4" style={SAFE_HEADER_STYLE}>
        <div className="flex items-center">
          <div className="w-8 h-8 bg-pink-500 rounded-full flex items-center justify-center mr-3">
            <Heart className="w-5 h-5 text-white fill-white" />
          </div>
          <span className="text-xl font-semibold text-gray-900">TinyNudge</span>
        </div>
        <nav className="hidden sm:flex items-center space-x-4">
          <button
            onClick={() => setCurrentPage('dashboard')}
            className={`text-gray-600 hover:text-pink-600 transition-colors px-4 py-2 ${currentPage === 'dashboard' ? 'text-pink-600 font-medium' : ''}`}
          >
            🏠 Home
          </button>
          <button
            onClick={() => setCurrentPage('account')}
            className={`text-gray-600 hover:text-pink-600 transition-colors px-4 py-2 ${currentPage === 'account' ? 'text-pink-600 font-medium' : ''}`}
          >
            👤 Account
          </button>
          <button
            onClick={handleSignOut}
            className="text-gray-600 hover:text-gray-900 transition-colors px-4 py-2 text-sm"
          >
            Sign Out
          </button>
        </nav>
      </header>
      {/* Mobile bottom nav */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 flex" style={SAFE_BOTTOM_NAV_STYLE}>
        <button
          onClick={() => setCurrentPage('dashboard')}
          className={`flex-1 flex flex-col items-center py-3 text-xs font-medium transition-colors ${currentPage === 'dashboard' ? 'text-pink-600' : 'text-gray-400'}`}
        >
          <span className="text-lg leading-none mb-0.5">🏠</span>
          Home
        </button>
        <button
          onClick={() => setCurrentPage('account')}
          className={`flex-1 flex flex-col items-center py-3 text-xs font-medium transition-colors ${currentPage === 'account' ? 'text-pink-600' : 'text-gray-400'}`}
        >
          <span className="text-lg leading-none mb-0.5">👤</span>
          Account
        </button>
        <button
          onClick={handleSignOut}
          className="flex-1 flex flex-col items-center py-3 text-xs font-medium text-gray-400"
        >
          <span className="text-lg leading-none mb-0.5">🚪</span>
          Sign Out
        </button>
      </nav>
    </>
  );

  const TrialBanner = () => {
    if (!userPlan || userPlan.plan !== 'trial' || !userPlan.trialEndDate) return null;
    const daysRemaining = Math.ceil(
      (new Date(userPlan.trialEndDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
    );
    if (daysRemaining <= 0) return null;
    const isUrgent = daysRemaining <= 5;
    return (
      <div className={`mb-6 rounded-xl px-4 py-3 flex items-center justify-between ${isUrgent ? 'bg-orange-50 border border-orange-200' : 'bg-blue-50 border border-blue-200'}`}>
        <span className={`text-sm font-medium ${isUrgent ? 'text-orange-700' : 'text-blue-700'}`}>
          {isUrgent ? '⚠️' : '✨'} {daysRemaining} day{daysRemaining !== 1 ? 's' : ''} left in your free trial
          {isUrgent && canPurchase && ' — Upgrade to keep full access'}
        </span>
        {canPurchase && (
          <button
            onClick={() => { setUpgradeBlockReason(null); setShowUpgradeModal(true); }}
            className={`text-sm font-medium px-3 py-1 rounded-lg transition-colors ${isUrgent ? 'bg-orange-500 hover:bg-orange-600 text-white' : 'bg-blue-500 hover:bg-blue-600 text-white'}`}
          >
            Upgrade
          </button>
        )}
      </div>
    );
  };

  const NudgeCounter = () => {
    if (!userPlan || userPlan.plan !== 'free') return null;
    const used = userPlan.nudgeCount;
    const isNearLimit = used >= 4;
    return (
      <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm ${isNearLimit ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-600'}`}>
        <span>{used}/5 nudges used this month</span>
        {used >= 5 && canPurchase && (
          <button
            onClick={() => { setUpgradeBlockReason('nudge'); setShowUpgradeModal(true); }}
            className="text-xs font-medium underline"
          >
            Upgrade
          </button>
        )}
        {used >= 5 && purchaseChannel === 'none' && (
          <span className="text-xs font-medium">More nudges are a Premium feature</span>
        )}
      </div>
    );
  };

  const UpgradeModal = () => {
    // Android app (or channel not yet detected): no purchase path, neutral copy only.
    if (purchaseChannel !== 'lemonsqueezy' && purchaseChannel !== 'apple-iap') {
      return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" style={SAFE_OVERLAY_STYLE}>
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl relative">
            <button
              onClick={() => setShowUpgradeModal(false)}
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="text-center mb-6">
              <div className="text-4xl mb-3">✨</div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Premium feature</h3>
              <p className="text-gray-600 text-sm">
                {upgradeBlockReason === 'connection'
                  ? 'The free plan includes 1 connection.'
                  : upgradeBlockReason === 'nudge'
                  ? 'The free plan includes 5 nudges per month.'
                  : 'This is a Premium feature.'}
              </p>
            </div>
            <button
              onClick={() => setShowUpgradeModal(false)}
              className="w-full bg-gray-900 hover:bg-gray-800 text-white font-medium py-3 px-6 rounded-xl transition-colors"
            >
              OK
            </button>
          </div>
        </div>
      );
    }

    if (purchaseChannel === 'apple-iap') {
      return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" style={SAFE_OVERLAY_STYLE}>
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setShowUpgradeModal(false)}
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="text-center mb-5">
              <div className="text-4xl mb-3">🚀</div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">TinyNudge Premium</h3>
              <p className="text-gray-600 text-sm">
                {upgradeBlockReason === 'connection'
                  ? 'Free plan allows 1 connection. Upgrade for unlimited.'
                  : upgradeBlockReason === 'nudge'
                  ? 'Free plan allows 5 nudges per month. Upgrade for unlimited.'
                  : 'Unlock unlimited connections and nudges with Premium.'}
              </p>
            </div>
            <ul className="space-y-2 mb-5 text-sm text-gray-700">
              {['Unlimited nudges — all 50', 'Multiple connections', 'Pause and remove connections', 'Streak tracking + freezes'].map(item => (
                <li key={item} className="flex items-center gap-2"><Check className="w-4 h-4 text-pink-500 shrink-0" />{item}</li>
              ))}
            </ul>
            <div className="text-center mb-4">
              <div className="text-lg font-semibold text-gray-900">
                {iapPrice ? `${iapPrice} / month` : 'Loading price…'}
              </div>
              <p className="text-xs text-gray-500 mt-1">Monthly auto-renewing subscription. If you&apos;re eligible for a free trial, the App Store shows it before you confirm.</p>
            </div>
            <div className="space-y-3">
              <button
                onClick={handleApplePurchase}
                disabled={iapBusy || !iapPrice}
                className="w-full bg-pink-500 hover:bg-pink-600 text-white font-medium py-3 px-6 rounded-xl transition-colors disabled:opacity-60"
              >
                {iapBusy ? 'Please wait…' : 'Subscribe'}
              </button>
              <button
                onClick={handleRestorePurchases}
                disabled={iapBusy}
                className="w-full bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium py-3 px-6 rounded-xl transition-colors disabled:opacity-60"
              >
                Restore purchases
              </button>
              <button
                onClick={() => setShowUpgradeModal(false)}
                className="w-full text-gray-500 hover:text-gray-700 text-sm py-2"
              >
                Maybe later
              </button>
            </div>
            <p className="text-[11px] leading-snug text-gray-500 mt-4">
              Payment is charged to your Apple ID at confirmation of purchase. The subscription renews automatically each month
              {iapPrice ? ` at ${iapPrice}` : ''} unless it is cancelled at least 24 hours before the end of the current period, and your
              account is charged for renewal within 24 hours before the period ends. Any unused part of a free trial is forfeited when you
              subscribe. You can manage or cancel your subscription in your App Store account settings.
            </p>
            <p className="text-[11px] text-gray-500 mt-2">
              <a href="/terms" className="underline hover:text-gray-700">Terms of Use</a>
              {' · '}
              <a href="/privacy" className="underline hover:text-gray-700">Privacy Policy</a>
            </p>
          </div>
        </div>
      );
    }

    // Website: Lemon Squeezy checkout, unchanged.
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" style={SAFE_OVERLAY_STYLE}>
        <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl relative">
          <button
            onClick={() => setShowUpgradeModal(false)}
            className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="text-center mb-6">
            <div className="text-4xl mb-3">🚀</div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">Upgrade Your Plan</h3>
            <p className="text-gray-600 text-sm">
              {upgradeBlockReason === 'connection'
                ? 'Free plan allows 1 connection. Upgrade for unlimited.'
                : upgradeBlockReason === 'nudge'
                ? 'Free plan allows 5 nudges per month. Upgrade for unlimited.'
                : 'Unlock unlimited connections and nudges with Premium.'}
            </p>
          </div>
          <div className="space-y-3">
            {!userPlan?.trialUsed && (
              <button
                onClick={handleStartTrial}
                className="w-full bg-pink-500 hover:bg-pink-600 text-white font-medium py-3 px-6 rounded-xl transition-colors"
              >
                Start 7-Day Free Trial
              </button>
            )}
            <button
              onClick={handleUpgrade}
              className="w-full bg-gray-900 hover:bg-gray-800 text-white font-medium py-3 px-6 rounded-xl transition-colors"
            >
              Upgrade $2.99/mo
            </button>
            <button
              onClick={() => setShowUpgradeModal(false)}
              className="w-full text-gray-500 hover:text-gray-700 text-sm py-2"
            >
              Maybe later
            </button>
          </div>
        </div>
      </div>
    );
  };

  const ComingSoonToast = () => (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-6 py-3 rounded-full shadow-lg z-50 text-sm font-medium" style={SAFE_TOAST_STYLE}>
      Coming soon — stay tuned! 🎉
    </div>
  );

  const StreakFreezeNotification = () => {
    if (!streakSavedByFreeze) return null;
    return (
      <div className="fixed top-20 left-1/2 -translate-x-1/2 bg-blue-500 text-white px-6 py-3 rounded-full shadow-lg z-50 text-sm font-medium whitespace-nowrap" style={{ top: 'calc(5rem + env(safe-area-inset-top))' }}>
        ❄️ Streak saved by freeze!
      </div>
    );
  };

  const StreakWidget = () => {
    if (!userPlan) return null;
    const { currentStreak, longestStreak, lastCompletedDate, streakFreezes } = userPlan;
    const todayDate = new Date();
    // Use local date so week ring matches the user's calendar, not UTC midnight
    const todayStr = `${todayDate.getFullYear()}-${String(todayDate.getMonth() + 1).padStart(2, '0')}-${String(todayDate.getDate()).padStart(2, '0')}`;
    const dow = todayDate.getDay();
    const weekDays = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(todayDate);
      d.setDate(todayDate.getDate() - dow + i);
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      return { dateStr, label: ['S','M','T','W','T','F','S'][i] };
    });
    const filledDates = new Set<string>();
    if (lastCompletedDate && currentStreak > 0) {
      // Parse as local date (YYYY-MM-DD) to avoid UTC-midnight → local-date-shift for negative offsets
      const [yr, mo, dy] = lastCompletedDate.split('-').map(Number);
      const base = new Date(yr, mo - 1, dy);
      for (let i = 0; i < Math.min(currentStreak, 7); i++) {
        const d = new Date(base);
        d.setDate(base.getDate() - i);
        filledDates.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
      }
    }
    return (
      <div className="bg-white rounded-2xl p-5 shadow-md border border-gray-100 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{currentStreak > 0 ? '🔥' : '💤'}</span>
            <div>
              <p className="text-xl font-bold text-gray-900">{currentStreak} day streak!</p>
              <p className="text-xs text-gray-500">Longest: {longestStreak} days</p>
            </div>
          </div>
          {(streakFreezes ?? 0) > 0 && (
            <div className="flex items-center gap-1 bg-blue-50 px-2 py-1 rounded-full">
              <span className="text-sm">❄️</span>
              <span className="text-xs font-medium text-blue-700">{streakFreezes} freeze{streakFreezes !== 1 ? 's' : ''}</span>
            </div>
          )}
        </div>
        <div className="flex justify-between">
          {weekDays.map(({ dateStr, label }, i) => {
            const isFilled = filledDates.has(dateStr);
            const isToday = dateStr === todayStr;
            return (
              <div key={i} className="flex flex-col items-center gap-1">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                  isFilled ? 'bg-orange-500 text-white' : isToday ? 'border-2 border-orange-300 text-gray-400' : 'bg-gray-100 text-gray-300'
                }`}>
                  {isFilled ? '✓' : ''}
                </div>
                <span className={`text-xs font-medium ${isToday ? 'text-orange-500' : 'text-gray-400'}`}>{label}</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const ScratchCardBanner = () => {
    if (!userPlan || (userPlan.scratchCardsAvailable ?? 0) <= 0) return null;
    const handleOpen = () => {
      setCurrentScratchReward(generateScratchReward());
      setScratchRevealed(false);
      setShowScratchCardModal(true);
    };
    return (
      <div onClick={handleOpen} className="mb-6 rounded-xl overflow-hidden cursor-pointer">
        <div className="bg-gradient-to-r from-amber-400 via-orange-400 to-amber-400 p-4 flex items-center justify-between animate-pulse">
          <div>
            <p className="font-bold text-white">🎰 {userPlan.scratchCardsAvailable} scratch card{userPlan.scratchCardsAvailable !== 1 ? 's' : ''} available!</p>
            <p className="text-amber-100 text-sm">Tap to reveal your reward</p>
          </div>
          <span className="text-3xl">🎁</span>
        </div>
      </div>
    );
  };

  const ShareModal = () => {
    const [copied, setCopied] = useState(false);
    if (!shareActivity) return null;
    const text = `I just completed "${shareActivity.title}" on TinyNudge! 🔥 ${userPlan?.currentStreak ?? 0} day streak`;
    const handleCopy = async () => {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    };
    const handleShare = async () => {
      // Native share sheet in the iOS app, Web Share API elsewhere, clipboard as a last resort.
      try {
        await shareText({ title: 'TinyNudge', text });
      } catch (error) {
        console.error('Share failed:', error);
      }
    };
    const canShare = appContext === 'ios-app' || (typeof navigator !== 'undefined' && 'share' in navigator);
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" style={SAFE_OVERLAY_STYLE}>
        <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl relative">
          <button onClick={() => setShowShareModal(false)} className="absolute top-4 right-4 text-gray-500 hover:text-gray-700">
            <X className="w-5 h-5" />
          </button>
          <div className="text-center mb-4">
            <div className="text-3xl mb-1">🎉</div>
            <h3 className="text-lg font-bold text-gray-900">Activity Complete!</h3>
          </div>
          <div className="bg-gradient-to-br from-pink-50 to-purple-50 rounded-2xl p-4 mb-4 border border-pink-100">
            <p className="text-gray-700 text-sm leading-relaxed">{text}</p>
          </div>
          <div className="space-y-2">
            {canShare && (
              <button onClick={handleShare} className="w-full bg-pink-500 hover:bg-pink-600 text-white font-medium py-2 px-4 rounded-xl transition-colors">
                Share
              </button>
            )}
            <button onClick={handleCopy} className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2 px-4 rounded-xl transition-colors">
              {copied ? '✓ Copied!' : 'Copy text'}
            </button>
            <button onClick={() => setShowShareModal(false)} className="w-full text-gray-500 hover:text-gray-700 text-sm py-1">
              Close
            </button>
          </div>
        </div>
      </div>
    );
  };

  const ScratchCardModal = () => {
    if (!currentScratchReward) return null;
    return (
      <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50" style={SAFE_OVERLAY_STYLE}>
        <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl">
          <div className="text-center mb-2">
            <h3 className="text-xl font-bold text-gray-900">🎰 Scratch Card!</h3>
            <p className="text-sm text-gray-500 mt-1">You completed 5 activities — you earned a reward!</p>
          </div>
          <div className="relative rounded-2xl overflow-hidden my-5" style={{ height: '160px' }}>
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-pink-50 to-purple-50 p-4">
              <div className="text-4xl mb-2">{currentScratchReward.emoji}</div>
              <h4 className="text-lg font-bold text-gray-900">{currentScratchReward.label}</h4>
              <p className="text-gray-500 text-xs text-center mt-1">{currentScratchReward.description}</p>
            </div>
            <div
              className={`absolute inset-0 flex flex-col items-center justify-center cursor-pointer transition-opacity duration-700 ${scratchRevealed ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
              style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #f97316 50%, #f59e0b 100%)' }}
              onClick={() => setScratchRevealed(true)}
            >
              <p className="text-4xl">🎁</p>
              <p className="text-white font-bold mt-2">Tap to Scratch!</p>
            </div>
          </div>
          {scratchRevealed ? (
            <div className="space-y-3">
              <p className="text-center text-sm text-gray-600">You earned: <strong>{currentScratchReward.label}</strong></p>
              <button
                onClick={() => handleApplyScratchReward(currentScratchReward.type)}
                className="w-full bg-pink-500 hover:bg-pink-600 text-white font-medium py-3 rounded-xl transition-colors"
              >
                Claim Reward! 🎉
              </button>
            </div>
          ) : (
            <button
              onClick={() => { setShowScratchCardModal(false); setScratchRevealed(false); }}
              className="w-full text-gray-500 text-sm py-2"
            >
              Save for later
            </button>
          )}
        </div>
      </div>
    );
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-16 h-16 bg-pink-500 rounded-full flex items-center justify-center animate-pulse">
          <Heart className="w-8 h-8 text-white fill-white" />
        </div>
      </div>
    );
  }

  if (loading) return <LoadingScreen />;

  // Sign-in / Sign-up page
  if (currentPage === 'signin') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4" style={SAFE_OVERLAY_STYLE}>
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-pink-500 rounded-2xl mb-4">
              <Heart className="w-8 h-8 text-white fill-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">TinyNudge</h1>
            <div className="inline-flex items-center bg-pink-100 text-pink-700 px-3 py-1 rounded-full text-sm">
              <span className="text-pink-500 mr-1">✨</span>
              Building Stronger Relationships
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8">
            {/* Tabs */}
            <div className="flex rounded-xl bg-gray-100 p-1 mb-6">
              <button
                onClick={() => setAuthTab('signup')}
                className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${authTab === 'signup' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600'}`}
              >
                Create Account
              </button>
              <button
                onClick={() => setAuthTab('signin')}
                className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${authTab === 'signin' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600'}`}
              >
                Sign In
              </button>
            </div>

            {/* Google Sign-In */}
            <button
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full bg-white hover:bg-gray-50 text-gray-900 font-medium py-3 px-4 rounded-xl flex items-center justify-center gap-3 mb-6 transition-colors border border-gray-300 disabled:opacity-50"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google
            </button>

            {/* Sign in with Apple: iOS app only (App Review 4.8 requires it alongside Google sign-in) */}
            {appContext === 'ios-app' && (
              <button
                onClick={handleAppleSignIn}
                disabled={loading}
                aria-label="Sign in with Apple"
                className="w-full bg-black hover:bg-gray-900 text-white font-medium py-3 px-4 rounded-xl flex items-center justify-center gap-2 -mt-3 mb-6 transition-colors disabled:opacity-50"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M16.37 12.62c-.02-2.3 1.88-3.4 1.96-3.46-1.07-1.56-2.73-1.78-3.32-1.8-1.41-.14-2.76.83-3.48.83-.72 0-1.82-.81-3-.79-1.54.02-2.96.9-3.76 2.28-1.6 2.78-.41 6.9 1.15 9.16.76 1.1 1.67 2.34 2.86 2.3 1.15-.05 1.58-.74 2.97-.74 1.38 0 1.77.74 2.98.72 1.23-.02 2.01-1.12 2.76-2.23.87-1.28 1.23-2.52 1.25-2.58-.03-.01-2.4-.92-2.42-3.65zM14.1 5.86c.63-.77 1.06-1.83.94-2.89-.91.04-2.01.61-2.66 1.37-.58.67-1.09 1.76-.96 2.8 1.02.08 2.05-.52 2.68-1.28z"/>
                </svg>
                Sign in with Apple
              </button>
            )}

            <div className="relative mb-6">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200" /></div>
              <div className="relative flex justify-center text-sm"><span className="bg-white px-3 text-gray-500">or</span></div>
            </div>

            {/* Sign Up Form */}
            {authTab === 'signup' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">Email Address</label>
                  <input
                    type="email"
                    value={signupForm.email}
                    onChange={(e) => setSignupForm(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="your@email.com"
                    autoComplete="email"
                    className="w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">Password</label>
                  <div className="relative">
                    <input
                      type={signupForm.showPassword ? 'text' : 'password'}
                      value={signupForm.password}
                      onChange={(e) => setSignupForm(prev => ({ ...prev, password: e.target.value }))}
                      placeholder="Enter your password"
                      autoComplete="new-password"
                      className="w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 pr-12 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                    />
                    <button
                      type="button"
                      onClick={() => setSignupForm(prev => ({ ...prev, showPassword: !prev.showPassword }))}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    >
                      {signupForm.showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">Confirm Password</label>
                  <div className="relative">
                    <input
                      type={signupForm.showConfirmPassword ? 'text' : 'password'}
                      value={signupForm.confirmPassword}
                      onChange={(e) => setSignupForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                      placeholder="Confirm your password"
                      autoComplete="new-password"
                      className="w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 pr-12 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                    />
                    <button
                      type="button"
                      onClick={() => setSignupForm(prev => ({ ...prev, showConfirmPassword: !prev.showConfirmPassword }))}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    >
                      {signupForm.showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
                <button
                  onClick={handleSignUp}
                  disabled={loading}
                  className="w-full bg-pink-500 hover:bg-pink-600 text-white font-medium py-3 px-4 rounded-xl transition-all duration-200 disabled:opacity-50"
                >
                  {loading ? 'Creating Account...' : 'Create Account 🚀'}
                </button>
              </div>
            )}

            {/* Sign In Form */}
            {authTab === 'signin' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">Email Address</label>
                  <input
                    type="email"
                    value={signinForm.email}
                    onChange={(e) => setSigninForm(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="your@email.com"
                    autoComplete="email"
                    className="w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">Password</label>
                  <div className="relative">
                    <input
                      type={signinForm.showPassword ? 'text' : 'password'}
                      value={signinForm.password}
                      onChange={(e) => setSigninForm(prev => ({ ...prev, password: e.target.value }))}
                      placeholder="Enter your password"
                      autoComplete="current-password"
                      className="w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 pr-12 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                    />
                    <button
                      type="button"
                      onClick={() => setSigninForm(prev => ({ ...prev, showPassword: !prev.showPassword }))}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    >
                      {signinForm.showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
                <button
                  onClick={handleSignIn}
                  disabled={loading}
                  className="w-full bg-pink-500 hover:bg-pink-600 text-white font-medium py-3 px-4 rounded-xl transition-all duration-200 disabled:opacity-50"
                >
                  {loading ? 'Signing In...' : 'Sign In 👋'}
                </button>
                <div className="text-center">
                  <button
                    type="button"
                    onClick={handleForgotPassword}
                    className="text-sm text-pink-600 hover:text-pink-700 font-medium"
                  >
                    Forgot password?
                  </button>
                </div>
                {resetStatus && (
                  <p
                    role="status"
                    className={`text-sm text-center rounded-xl px-3 py-2 ${resetStatus.kind === 'sent' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}
                  >
                    {resetStatus.message}
                  </p>
                )}
              </div>
            )}
          </div>

          <p className="text-center text-xs text-gray-500 mt-4">
            By continuing you agree to our{' '}
            <a href="/terms" className="underline hover:text-gray-700">Terms</a> and{' '}
            <a href="/privacy" className="underline hover:text-gray-700">Privacy Policy</a>.{' '}
            <a href="/support" className="underline hover:text-gray-700">Need help?</a>
          </p>

          <div className="text-center mt-6">
            <button
              onClick={() => setCurrentPage('home')}
              className="text-gray-600 hover:text-gray-900 transition-colors"
            >
              ← Back to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Dashboard
  if (currentPage === 'dashboard') {
    return (
      <>
        <div className="min-h-screen bg-gray-50">
          <DashboardHeader />
          <div className="pb-[calc(6rem+env(safe-area-inset-bottom))] sm:pb-8 px-6" style={SAFE_CONTENT_STYLE}>
            <div className="max-w-4xl mx-auto">
              <h1 className="text-4xl font-bold text-gray-900 mb-4">
                {isFirstTime ? `Welcome ${userName}! 👋` : `Welcome back, ${userName}! 👋`}
              </h1>
              <p className="text-gray-600 text-lg mb-6">
                Keep building stronger relationships with personalized activities ✨
              </p>
              <StreakWidget />
              <ScratchCardBanner />
              <TrialBanner />
              <div className="flex justify-between items-start mb-8">
                <div>
                  <h2 className="text-2xl font-semibold text-gray-900">Your Connections</h2>
                  <div className="mt-2"><NudgeCounter /></div>
                </div>
                <div className="flex items-center gap-3">
                  {canPurchase && userPlan?.plan === 'free' && (
                    <button
                      onClick={purchaseChannel === 'apple-iap' ? () => openUpgradeModal() : handleUpgrade}
                      disabled={loading}
                      className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-medium py-3 px-6 rounded-xl transition-all flex items-center gap-2 shadow-md hover:shadow-lg disabled:opacity-70"
                    >
                      <Star className="w-4 h-4 fill-white" />
                      Upgrade
                    </button>
                  )}
                  <button
                    onClick={() => setShowAddConnectionModal(true)}
                    className="bg-pink-500 hover:bg-pink-600 text-white font-medium py-3 px-6 rounded-xl transition-colors flex items-center gap-2"
                  >
                    <Plus className="w-5 h-5" />
                    Add Connection
                  </button>
                </div>
              </div>

              {connections.length === 0 ? (
                <div className="text-center py-20">
                  <div className="text-6xl mb-4">💕</div>
                  <p className="text-gray-500 mb-6 text-lg">You haven't added any connections yet!</p>
                  <p className="text-gray-400 mb-8">Start building stronger relationships today</p>
                  <button
                    onClick={() => setShowAddConnectionModal(true)}
                    className="bg-pink-500 hover:bg-pink-600 text-white font-medium py-3 px-6 rounded-xl transition-colors"
                  >
                    Add Your First Connection
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-8">
                  {connections.map((connection) => (
                    <div
                      key={connection.id}
                      className={`bg-white rounded-2xl p-6 shadow-lg border transition-all duration-200 ${
                        connection.is_paused ? 'border-yellow-200 opacity-75' : 'border-gray-200 hover:shadow-xl'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <span className="text-3xl">{connection.emoji}</span>
                          <div>
                            <h3 className="font-semibold text-gray-900 text-lg">{connection.title}</h3>
                            <p className="text-xs text-gray-500">{connection.frequency}</p>
                          </div>
                        </div>
                        {connection.is_paused && (
                          <span className="bg-yellow-100 text-yellow-700 text-xs px-2 py-1 rounded-full">Paused</span>
                        )}
                      </div>

                      <p className="text-sm text-gray-600 mb-4">{connection.description}</p>

                      <div className="mb-4">
                        <div className="flex justify-between text-xs text-gray-500 mb-1">
                          <span>Progress</span>
                          <span>{connection.activities_completed}/{connection.total_activities}</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-2">
                          <div
                            className="bg-pink-500 h-2 rounded-full transition-all"
                            style={{ width: `${Math.min((connection.activities_completed / connection.total_activities) * 100, 100)}%` }}
                          />
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => handleViewActivities(connection)}
                          className="flex-1 bg-pink-500 hover:bg-pink-600 text-white text-sm font-medium py-2 px-3 rounded-xl transition-colors"
                        >
                          View Nudges
                        </button>
                        {(userPlan?.plan === 'premium' || (userPlan?.plan === 'trial' && !!userPlan?.trialEndDate && new Date() <= new Date(userPlan.trialEndDate))) ? (
                          <>
                            <button
                              onClick={() => handleTogglePause(connection.id)}
                              className="p-2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl transition-colors"
                              title={connection.is_paused ? 'Resume' : 'Pause'}
                            >
                              {connection.is_paused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                            </button>
                            <button
                              onClick={() => handleDeleteConnection(connection.id)}
                              className="p-2 bg-gray-100 hover:bg-red-100 text-gray-400 hover:text-red-500 rounded-xl transition-colors"
                              title="Delete connection"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => { setUpgradeBlockReason(null); setShowUpgradeModal(true); }}
                              className="p-2 bg-gray-100 text-gray-300 rounded-xl cursor-not-allowed"
                              title={canPurchase ? 'Upgrade to pause' : 'Premium feature'}
                            >
                              <Pause className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => { setUpgradeBlockReason(null); setShowUpgradeModal(true); }}
                              className="p-2 bg-gray-100 text-gray-300 rounded-xl cursor-not-allowed"
                              title={canPurchase ? 'Upgrade to delete' : 'Premium feature'}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
        {showChildNameModal && <ChildNameModal />}
        {showAddConnectionModal && <AddConnectionModal />}
        {showActivitiesModal && <ActivitiesModal />}
        {showUpgradeModal && <UpgradeModal />}
        {showShareModal && <ShareModal />}
        {showScratchCardModal && <ScratchCardModal />}
        {showComingSoonToast && <ComingSoonToast />}
        {toastMessage && <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-6 py-3 rounded-full shadow-lg z-50 text-sm font-medium whitespace-nowrap" style={SAFE_TOAST_STYLE}>{toastMessage}</div>}
        <StreakFreezeNotification />
      </>
    );
  }

  // Account page
  if (currentPage === 'account') {
    return (
      <>
        <div className="min-h-screen bg-gray-50">
          <DashboardHeader />
          <div className="pb-[calc(6rem+env(safe-area-inset-bottom))] sm:pb-8 px-6" style={SAFE_CONTENT_STYLE}>
            <div className="max-w-4xl mx-auto">
              <h1 className="text-4xl font-bold text-gray-900 mb-6">Account Settings ⚙️</h1>
              <div className="flex gap-2 mb-8 border-b border-gray-200" role="tablist">
                {([
                  { id: 'profile', label: 'Profile', icon: <Settings className="w-4 h-4" /> },
                  { id: 'email', label: 'Email preferences', icon: <Mail className="w-4 h-4" /> },
                ] as const).map(tab => (
                  <button
                    key={tab.id}
                    role="tab"
                    aria-selected={accountTab === tab.id}
                    onClick={() => setAccountTab(tab.id)}
                    className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors ${
                      accountTab === tab.id
                        ? 'border-pink-500 text-pink-600'
                        : 'border-transparent text-gray-500 hover:text-gray-800'
                    }`}
                  >
                    {tab.icon}
                    {tab.label}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2">
                  {accountTab === 'profile' && (
                  <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-200 mb-6">
                    <h2 className="text-2xl font-semibold text-gray-900 mb-6 flex items-center gap-2">
                      <div className="w-8 h-8 bg-pink-500 rounded-full flex items-center justify-center">
                        <Heart className="w-4 h-4 text-white fill-white" />
                      </div>
                      Profile Information
                    </h2>
                    <div className="space-y-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-900 mb-2">Display Name</label>
                        <input
                          type="text"
                          value={userName}
                          onChange={(e) => setUserName(e.target.value)}
                          className="w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-900 mb-2">Email Address</label>
                        <input
                          type="email"
                          value={user?.email || ''}
                          disabled
                          className="w-full bg-gray-100 border border-gray-300 rounded-xl px-4 py-3 text-gray-500 cursor-not-allowed"
                        />
                        <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
                      </div>
                    </div>
                  </div>
                  )}

                  {accountTab === 'profile' && userPlan && (() => {
                    const trialActive = userPlan.plan === 'trial' && !!userPlan.trialEndDate && new Date() <= new Date(userPlan.trialEndDate);
                    const isPremium = userPlan.plan === 'premium';
                    const billedByApple = userPlan.billingSource === 'apple';
                    const planLabel = isPremium ? 'Premium' : trialActive ? 'Free trial' : 'Free';
                    return (
                      <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-200 mb-6">
                        <h2 className="text-2xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                          <Star className="w-6 h-6 text-pink-500" />
                          Your plan
                        </h2>
                        <p className="text-sm text-gray-700">
                          Current plan: <span className="font-semibold text-gray-900">{planLabel}</span>
                          {trialActive && userPlan.trialEndDate && (
                            <span className="text-gray-500"> (ends {new Date(userPlan.trialEndDate).toLocaleDateString()})</span>
                          )}
                        </p>

                        {purchaseChannel === 'lemonsqueezy' && (
                          <div className="mt-4 space-y-3">
                            {isPremium && billedByApple && (
                              <p className="text-sm text-gray-600">
                                Your subscription is billed through Apple. Manage or cancel it on your iPhone in Settings → Apple ID → Subscriptions.
                              </p>
                            )}
                            {isPremium && !billedByApple && (
                              <>
                                <a
                                  href="/support"
                                  className="inline-flex items-center justify-center bg-gray-900 hover:bg-gray-800 text-white text-sm font-medium py-2 px-4 rounded-xl transition-colors"
                                >
                                  Manage subscription
                                </a>
                                <p className="text-xs text-gray-500">Update your payment method, get receipts or cancel. Billing emails from Lemon Squeezy also include a link to manage your subscription.</p>
                              </>
                            )}
                            {!isPremium && (
                              <button
                                onClick={() => openUpgradeModal()}
                                className="bg-gradient-to-r from-orange-400 to-pink-500 hover:from-orange-500 hover:to-pink-600 text-white text-sm font-medium py-2 px-4 rounded-xl transition-all"
                              >
                                ✨ Upgrade to Premium
                              </button>
                            )}
                          </div>
                        )}

                        {purchaseChannel === 'apple-iap' && (
                          <div className="mt-4 flex flex-wrap gap-3">
                            {isPremium && billedByApple && (
                              <button
                                onClick={handleManageAppleSubscription}
                                className="bg-gray-900 hover:bg-gray-800 text-white text-sm font-medium py-2 px-4 rounded-xl transition-colors"
                              >
                                Manage subscription
                              </button>
                            )}
                            {!isPremium && (
                              <button
                                onClick={() => openUpgradeModal()}
                                className="bg-gradient-to-r from-orange-400 to-pink-500 hover:from-orange-500 hover:to-pink-600 text-white text-sm font-medium py-2 px-4 rounded-xl transition-all"
                              >
                                ✨ Upgrade to Premium
                              </button>
                            )}
                            <button
                              onClick={handleRestorePurchases}
                              disabled={iapBusy}
                              className="bg-gray-100 hover:bg-gray-200 text-gray-800 text-sm font-medium py-2 px-4 rounded-xl transition-colors disabled:opacity-60"
                            >
                              {iapBusy ? 'Please wait…' : 'Restore purchases'}
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {accountTab === 'profile' && (
                    <div className="bg-white rounded-2xl p-6 shadow-lg border border-red-200 mb-6">
                      <h2 className="text-xl font-semibold text-red-600 mb-2">Danger zone</h2>
                      <p className="text-sm text-gray-600">
                        Deleting your account permanently removes your profile, connections, nudge history and email preferences. This can&apos;t be undone.
                      </p>
                      {(appContext === 'ios-app' || userPlan?.billingSource === 'apple') && (
                        <p className="text-sm text-gray-600 mt-2">
                          Subscriptions bought in the iPhone app aren&apos;t cancelled automatically. Cancel yours in iPhone Settings → Apple ID → Subscriptions.
                        </p>
                      )}
                      {!showDeleteAccount ? (
                        <button
                          type="button"
                          onClick={() => { setShowDeleteAccount(true); setDeleteConfirmText(''); setDeleteAccountError(null); }}
                          className="mt-4 inline-flex items-center gap-2 border border-red-300 text-red-600 hover:bg-red-50 text-sm font-medium py-2 px-4 rounded-xl transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                          Delete account
                        </button>
                      ) : (
                        <div className="mt-4 space-y-3">
                          <label htmlFor="delete-confirm" className="block text-sm font-medium text-gray-900">
                            Type <span className="font-mono font-semibold">DELETE</span> to confirm
                          </label>
                          <input
                            id="delete-confirm"
                            type="text"
                            value={deleteConfirmText}
                            onChange={(e) => setDeleteConfirmText(e.target.value)}
                            autoComplete="off"
                            autoCapitalize="characters"
                            className="w-full sm:w-60 bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                          />
                          {deleteNeedsPassword && (
                            <>
                              <label htmlFor="delete-password" className="block text-sm font-medium text-gray-900">
                                Your password
                              </label>
                              <input
                                id="delete-password"
                                type="password"
                                value={deletePassword}
                                onChange={(e) => setDeletePassword(e.target.value)}
                                autoComplete="current-password"
                                className="w-full sm:w-60 bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                              />
                            </>
                          )}
                          {deleteAccountError && (
                            <p className="text-sm text-red-600" role="alert">{deleteAccountError}</p>
                          )}
                          <div className="flex flex-wrap gap-3">
                            <button
                              type="button"
                              onClick={handleDeleteAccount}
                              disabled={deletingAccount || deleteConfirmText.trim() !== 'DELETE'}
                              className="bg-red-600 hover:bg-red-700 text-white text-sm font-medium py-2 px-4 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {deletingAccount ? 'Deleting…' : 'Permanently delete my account'}
                            </button>
                            <button
                              type="button"
                              onClick={() => { setShowDeleteAccount(false); setDeleteConfirmText(''); setDeletePassword(''); setDeleteAccountError(null); }}
                              disabled={deletingAccount}
                              className="text-sm text-gray-600 hover:text-gray-900 py-2 px-4"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {accountTab === 'email' && (() => {
                    const optionalKeys = ['emailDailyReminders', 'notifyStreakMilestones', 'emailWeeklyProgress', 'emailMonthlyInsights', 'notifyReEngagement'] as const;
                    const anyOn = optionalKeys.some(k => emailPrefs[k]);
                    const renderToggle = (
                      key: typeof optionalKeys[number],
                      label: string,
                      desc: string,
                    ) => (
                      <div key={key} className="flex items-start justify-between gap-4 py-4">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{label}</p>
                          <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
                        </div>
                        <button
                          type="button"
                          role="switch"
                          aria-checked={emailPrefs[key]}
                          aria-label={label}
                          onClick={() => savePreferences({ [key]: !emailPrefs[key] })}
                          className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-pink-500 focus:ring-offset-2 ${
                            emailPrefs[key] ? 'bg-pink-500' : 'bg-gray-300'
                          }`}
                        >
                          <span
                            className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                              emailPrefs[key] ? 'translate-x-5' : 'translate-x-0.5'
                            }`}
                          />
                        </button>
                      </div>
                    );
                    return (
                      <div className="space-y-6">
                        <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-200">
                          <div className="flex items-start justify-between gap-4 mb-2">
                            <h2 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
                              <Mail className="w-6 h-6 text-pink-500" />
                              Email preferences
                            </h2>
                            <span className="text-xs font-medium mt-2 whitespace-nowrap" aria-live="polite">
                              {prefsSaveStatus === 'saving' && <span className="text-gray-400">Saving…</span>}
                              {prefsSaveStatus === 'saved' && <span className="text-green-600 flex items-center gap-1"><Check className="w-3.5 h-3.5" />Saved</span>}
                              {prefsSaveStatus === 'error' && <span className="text-red-500">Couldn&apos;t save, try again</span>}
                            </span>
                          </div>
                          <p className="text-sm text-gray-500">
                            Emails go to <span className="font-medium text-gray-700">{user?.email}</span>. Warm, short, and never spammy.
                          </p>
                        </div>

                        <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-200">
                          <h3 className="text-lg font-semibold text-gray-900">🔔 Daily nudge</h3>
                          <div className="divide-y divide-gray-100">
                            {renderToggle('emailDailyReminders', 'Daily nudge reminder', 'One email with today\'s nudge, only on days you haven\'t done one yet')}
                            <div className="py-4">
                              <label htmlFor="reminder-time" className="block text-sm font-medium text-gray-900 mb-2">Reminder time</label>
                              <select
                                id="reminder-time"
                                value={emailPrefs.notificationTime}
                                disabled={!emailPrefs.emailDailyReminders && pushStatus !== 'on'}
                                onChange={(e) => savePreferences({ notificationTime: e.target.value })}
                                className="w-full sm:w-60 bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {NOTIFICATION_TIMES.map(t => <option key={t}>{t}</option>)}
                              </select>
                              <p className="text-xs text-gray-500 mt-2">Your time zone: {emailPrefs.timezone.replace(/_/g, ' ')}</p>
                            </div>
                          </div>
                        </div>

                        <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-200">
                          <h3 className="text-lg font-semibold text-gray-900">📲 Push notifications on this device</h3>
                          <p className="text-sm text-gray-500 mt-1">
                            Get your daily nudge reminder as a notification on this {appContext === 'ios-app' ? 'iPhone' : 'device'} at your reminder time ({emailPrefs.notificationTime}). It only comes on days you haven&apos;t done a nudge yet, and works even if reminder emails are off.
                          </p>
                          <div className="flex flex-wrap items-center justify-between gap-3 mt-4">
                            <p className="text-sm font-medium text-gray-900" aria-live="polite">
                              {pushStatus === 'unknown' && <span className="text-gray-400">Checking…</span>}
                              {pushStatus === 'on' && <span className="text-green-600 flex items-center gap-1"><Check className="w-4 h-4" />On for this device</span>}
                              {pushStatus === 'off' && <span className="text-gray-700">Off for this device</span>}
                              {pushStatus === 'denied' && <span className="text-red-500">Blocked in {appContext === 'ios-app' ? 'iPhone' : 'browser'} settings</span>}
                              {pushStatus === 'unsupported' && <span className="text-gray-500">Not supported in this browser</span>}
                            </p>
                            {pushStatus === 'on' && appContext !== 'ios-app' ? (
                              <button
                                type="button"
                                onClick={handleDisablePush}
                                disabled={pushBusy}
                                className="bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium py-2 px-4 rounded-xl transition-colors disabled:opacity-50"
                              >
                                {pushBusy ? 'Turning off…' : 'Turn off'}
                              </button>
                            ) : pushStatus === 'off' ? (
                              <button
                                type="button"
                                onClick={handleEnablePush}
                                disabled={pushBusy}
                                className="bg-pink-500 hover:bg-pink-600 text-white text-sm font-medium py-2 px-4 rounded-xl transition-colors disabled:opacity-50"
                              >
                                {pushBusy ? 'Turning on…' : 'Turn on notifications'}
                              </button>
                            ) : null}
                          </div>
                          {appContext === 'ios-app' && pushStatus === 'on' && (
                            <p className="text-xs text-gray-500 mt-2">
                              To turn them off, go to iPhone Settings → Notifications → TinyNudge.{' '}
                              <button type="button" onClick={handleEnablePush} disabled={pushBusy} className="underline underline-offset-2 hover:text-pink-600 disabled:opacity-50">
                                {pushBusy ? 'Reconnecting…' : 'Not getting them? Reconnect this iPhone'}
                              </button>
                            </p>
                          )}
                          {pushStatus === 'denied' && (
                            <p className="text-xs text-gray-500 mt-2">
                              {appContext === 'ios-app'
                                ? 'Allow them in iPhone Settings → Notifications → TinyNudge, then come back here.'
                                : 'Allow notifications for this site in your browser settings, then reload this page.'}
                            </p>
                          )}
                          {pushError && <p className="text-xs text-red-500 mt-2">{pushError}</p>}
                        </div>

                        <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-200">
                          <h3 className="text-lg font-semibold text-gray-900">🔥 Progress &amp; celebrations</h3>
                          <div className="divide-y divide-gray-100">
                            {renderToggle('notifyStreakMilestones', 'Streak milestones', 'Celebrate when you reach 3, 7, 14, 30, 50, 100+ days in a row')}
                            {renderToggle('emailWeeklyProgress', 'Weekly progress', 'Your nudges and streak for the week, every Monday')}
                            {renderToggle('emailMonthlyInsights', 'Monthly insights', 'Your month in numbers plus a connection tip, on the 1st')}
                          </div>
                        </div>

                        <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-200">
                          <h3 className="text-lg font-semibold text-gray-900">💕 Check-ins</h3>
                          <div className="divide-y divide-gray-100">
                            {renderToggle('notifyReEngagement', 'Gentle check-in', 'A friendly note if you haven\'t done a nudge in 5 days (at most once a week)')}
                          </div>
                        </div>

                        <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-200">
                          <h3 className="text-lg font-semibold text-gray-900">🔒 Account &amp; billing</h3>
                          <p className="text-xs text-gray-500 mt-1 mb-3">Always on, because they&apos;re about your account and payments.</p>
                          <ul className="space-y-2 text-sm text-gray-700">
                            <li className="flex items-center gap-2"><Check className="w-4 h-4 text-green-600 shrink-0" />Free trial ending soon and trial ended</li>
                            <li className="flex items-center gap-2"><Check className="w-4 h-4 text-green-600 shrink-0" />Welcome to Premium</li>
                            <li className="flex items-center gap-2"><Check className="w-4 h-4 text-green-600 shrink-0" />Payment failed or payment fixed</li>
                            <li className="flex items-center gap-2"><Check className="w-4 h-4 text-green-600 shrink-0" />Subscription cancelled, resumed or ended</li>
                          </ul>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            const value = !anyOn;
                            savePreferences(Object.fromEntries(optionalKeys.map(k => [k, value])) as Partial<EmailPreferences>);
                          }}
                          className="text-sm text-gray-500 hover:text-pink-600 underline underline-offset-2"
                        >
                          {anyOn ? 'Turn off all optional emails' : 'Turn on all optional emails'}
                        </button>
                      </div>
                    );
                  })()}
                </div>
                <div className="lg:col-span-1">
                  <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-200 mb-6">
                    <h3 className="text-xl font-semibold text-gray-900 mb-4">Your Stats 📊</h3>
                    <div className="space-y-4">
                      <div className="text-center p-4 bg-pink-50 rounded-xl">
                        <div className="text-2xl font-bold text-pink-600">{connections.length}</div>
                        <div className="text-sm text-pink-700">Active Connections</div>
                      </div>
                      <div className="text-center p-4 bg-blue-50 rounded-xl">
                        <div className="text-2xl font-bold text-blue-600">
                          {connections.reduce((sum, c) => sum + (c.activities_completed || 0), 0)}
                        </div>
                        <div className="text-sm text-blue-700">Activities Completed</div>
                      </div>
                      <div className="text-center p-4 bg-green-50 rounded-xl">
                        <div className="text-2xl font-bold text-green-600">{userPlan?.currentStreak ?? 0}</div>
                        <div className="text-sm text-green-700">Day Streak 🔥</div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-200">
                    <h3 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions ⚡</h3>
                    <div className="space-y-3">
                      {canPurchase && (!userPlan || userPlan.plan === 'free') && (
                        <button
                          onClick={() => { setUpgradeBlockReason(null); setShowUpgradeModal(true); }}
                          className="w-full bg-gradient-to-r from-orange-400 to-pink-500 hover:from-orange-500 hover:to-pink-600 text-white font-medium py-2 px-4 rounded-xl transition-all flex items-center justify-center gap-2"
                        >
                          ✨ Upgrade to Premium
                        </button>
                      )}
                      <button
                        onClick={() => setShowAddConnectionModal(true)}
                        className="w-full bg-pink-500 hover:bg-pink-600 text-white font-medium py-2 px-4 rounded-xl transition-colors flex items-center justify-center gap-2"
                      >
                        <Plus className="w-4 h-4" />
                        Add Connection
                      </button>
                      <button
                        onClick={() => setCurrentPage('dashboard')}
                        className="w-full bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium py-2 px-4 rounded-xl transition-colors"
                      >
                        Back to Dashboard
                      </button>
                    </div>
                    <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 mt-5 pt-4 border-t border-gray-100 text-sm text-gray-500">
                      <a href="/privacy" className="hover:text-pink-600 underline underline-offset-2">Privacy</a>
                      <a href="/terms" className="hover:text-pink-600 underline underline-offset-2">Terms</a>
                      <a href="/support" className="hover:text-pink-600 underline underline-offset-2">Support</a>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        {showChildNameModal && <ChildNameModal />}
        {showAddConnectionModal && <AddConnectionModal />}
        {showUpgradeModal && <UpgradeModal />}
        {showShareModal && <ShareModal />}
        {showScratchCardModal && <ScratchCardModal />}
        {showComingSoonToast && <ComingSoonToast />}
        {toastMessage && <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-6 py-3 rounded-full shadow-lg z-50 text-sm font-medium whitespace-nowrap" style={SAFE_TOAST_STYLE}>{toastMessage}</div>}
        <StreakFreezeNotification />
      </>
    );
  }

  // Home page
  return (
    <div className="min-h-screen bg-gray-50">
      {purchaseChannel === 'lemonsqueezy' && (
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'WebApplication',
            name: 'TinyNudge',
            url: 'https://tinynudge.online',
            description: 'TinyNudge helps busy parents stay close to their young children through tiny daily activities. 50 expert-backed micro-moments, no prep required.',
            applicationCategory: 'LifestyleApplication',
            operatingSystem: 'Any',
            offers: [
              { '@type': 'Offer', name: 'Free Plan', price: '0', priceCurrency: 'USD' },
              { '@type': 'Offer', name: 'Premium', price: '2.99', priceCurrency: 'USD' },
            ],
          }),
        }}
      />
      )}
      {showChildNameModal && <ChildNameModal />}
      {showFrequencyModal && <FrequencyModal />}

      <header className="fixed top-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-b border-gray-200 z-50 flex justify-between items-center px-6 pb-4" style={SAFE_HEADER_STYLE}>
        <div className="flex items-center">
          <div className="w-8 h-8 bg-pink-500 rounded-full flex items-center justify-center mr-3">
            <Heart className="w-5 h-5 text-white fill-white" />
          </div>
          <span className="text-xl font-semibold text-gray-900">TinyNudge</span>
        </div>
        <nav className="flex items-center space-x-8">
          <a href="#about" onClick={scrollToSection('about')} className="text-gray-600 hover:text-gray-900 transition-colors">About</a>
          {purchaseChannel === 'lemonsqueezy' && (
            <a href="#pricing" onClick={scrollToSection('pricing')} className="text-gray-600 hover:text-gray-900 transition-colors">Pricing</a>
          )}
          <button
            onClick={() => { setAuthTab('signin'); setCurrentPage('signin'); }}
            className="text-gray-900 font-medium hover:text-pink-600 transition-colors"
          >
            Sign In
          </button>
        </nav>
      </header>

      <main className="flex flex-col items-center justify-center px-6 py-20 pt-32" style={{ paddingTop: 'calc(8rem + env(safe-area-inset-top))' }}>
        <div className="w-24 h-24 bg-pink-500 rounded-full flex items-center justify-center mb-12">
          <Heart className="w-12 h-12 text-white fill-white" />
        </div>

        <h1 className="text-5xl font-bold text-center text-gray-900 mb-6 max-w-4xl leading-tight">
          One tap a day keeps the distance away
        </h1>

        <div className="text-center text-gray-600 text-lg mb-4 max-w-2xl">
          <p>Strengthen your most important connections with daily micro-moments.</p>
          <p className="font-medium">Small gestures, big impact.</p>
        </div>

        <div className="w-full max-w-6xl mx-auto mb-20">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Choose Your Connection</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 px-4">
            {CONNECTION_TYPES.map((connection, index) => {
              const isLive = LIVE_CONNECTION_TITLES.has(connection.title);
              return isLive ? (
                <button
                  key={index}
                  onClick={() => handleConnectionSelect(connection)}
                  className="bg-white rounded-2xl p-6 shadow-lg border border-gray-200 hover:shadow-xl hover:scale-105 transition-all duration-200 text-center"
                >
                  <div className="text-4xl mb-3">{connection.emoji}</div>
                  <h3 className="font-semibold text-gray-900 mb-2">{connection.title}</h3>
                  <p className="text-sm text-gray-600">{connection.description}</p>
                </button>
              ) : (
                <div
                  key={index}
                  className="bg-white rounded-2xl p-6 shadow-lg border border-gray-200 text-center opacity-50 cursor-not-allowed"
                >
                  <div className="text-4xl mb-3 grayscale">{connection.emoji}</div>
                  <h3 className="font-semibold text-gray-500 mb-2">{connection.title}</h3>
                  <p className="text-xs text-gray-400 font-medium">Coming Soon</p>
                </div>
              );
            })}
          </div>
        </div>
      </main>

      <section id="about" className="bg-white py-20">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">How TinyNudge Works</h2>
            <p className="text-gray-600 text-lg">Simple steps to stronger relationships</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { emoji: '🤝', label: 'Connect', desc: 'Add the people who matter most to you' },
              { emoji: '🔔', label: 'Nudge', desc: 'Get personalized activity suggestions' },
              { emoji: '🌱', label: 'Grow', desc: 'Watch your relationships flourish' },
            ].map((step, i) => (
              <div key={i} className="text-center group hover:scale-105 transition-transform duration-300">
                <div className="relative mb-4">
                  <div className="text-6xl mb-2">{step.emoji}</div>
                  <div className="absolute -top-2 -right-2 text-3xl font-bold text-pink-500 bg-white rounded-full w-12 h-12 flex items-center justify-center shadow-lg">{i + 1}</div>
                </div>
                <h4 className="font-semibold text-gray-900 mb-2 group-hover:text-pink-600 transition-colors">{step.label}</h4>
                <p className="text-gray-600">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {purchaseChannel === 'lemonsqueezy' && (
        <section id="pricing" className="bg-gray-50 py-20">
          <div className="max-w-4xl mx-auto px-6">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold text-gray-900 mb-4">Choose Your Plan</h2>
              <p className="text-gray-600 text-lg">Start strengthening your relationships today</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-200">
                <h3 className="text-2xl font-bold text-gray-900 mb-4">Free</h3>
                <div className="text-4xl font-bold text-gray-900 mb-4">$0</div>
                <p className="text-gray-600 mb-6">Perfect for getting started</p>
                <ul className="space-y-3 mb-8">
                  {['5 nudges per month', '1 connection', 'Nudge library browser', 'Weekly email digest'].map(item => (
                    <li key={item} className="flex items-center">
                      <div className="w-2 h-2 bg-gray-700 rounded-full mr-3" />
                      <span className="text-gray-700">{item}</span>
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => { setAuthTab('signup'); setCurrentPage('signin'); }}
                  className="w-full bg-gray-600 hover:bg-gray-700 text-white font-medium py-3 px-6 rounded-xl transition-colors"
                >
                  Get Started
                </button>
              </div>
              <div className="bg-white rounded-2xl p-8 shadow-lg border-2 border-pink-500 relative">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <div className="bg-pink-500 text-white px-3 py-1 rounded-full text-sm font-medium">Most Popular</div>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Premium</h3>
                <div className="flex items-baseline mb-4">
                  <span className="text-4xl font-bold text-gray-900">$2.99</span>
                  <span className="text-gray-600 ml-1">/month</span>
                </div>
                <p className="text-gray-600 mb-6">Everything you need for stronger connections</p>
                <ul className="space-y-3 mb-8">
                  {['Unlimited nudges — all 50', 'Multiple connections', 'Streak tracking + freezes', 'Daily reminders + re-engagement', '7-day free trial'].map(item => (
                    <li key={item} className="flex items-center">
                      <div className="w-2 h-2 bg-pink-500 rounded-full mr-3" />
                      <span className="text-gray-700">{item}</span>
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => { setAuthTab('signup'); setCurrentPage('signin'); }}
                  className="w-full bg-pink-500 hover:bg-pink-600 text-white font-medium py-3 px-6 rounded-xl transition-colors"
                >
                  Get Started
                </button>
              </div>
            </div>
          </div>
        </section>
      )}

      <footer className="bg-gray-900 text-white py-16">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex items-center justify-center mb-8">
            <div className="w-8 h-8 bg-pink-500 rounded-full flex items-center justify-center mr-3">
              <Heart className="w-5 h-5 text-white fill-white" />
            </div>
            <span className="text-xl font-semibold">TinyNudge</span>
          </div>
          <div className="text-center">
            <p className="text-gray-400">One tap a day keeps the distance away</p>
            <nav className="flex justify-center gap-6 mt-6 text-sm text-gray-400" aria-label="Legal">
              <a href="/privacy" className="hover:text-white transition-colors">Privacy</a>
              <a href="/terms" className="hover:text-white transition-colors">Terms</a>
              <a href="/support" className="hover:text-white transition-colors">Support</a>
            </nav>
            <p className="text-gray-500 text-sm mt-4">© {new Date().getFullYear()} TinyNudge. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Page;
