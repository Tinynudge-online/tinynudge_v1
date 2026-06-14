'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Heart, Settings, Star, Eye, EyeOff, X, Plus, Pause, Play, Trash2, ArrowLeft } from 'lucide-react';
import { getNudgesByRelationship, getNudgeById, type RelationshipType } from '../data/nudges';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  updateProfile,
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
  increment,
} from 'firebase/firestore';
import { auth, db } from './firebase';

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

async function loadUserConnections(userId: string): Promise<Connection[]> {
  if (!userId) return [];
  try {
    const q = query(collection(db, 'user_connections'), where('user_id', '==', userId));
    const snapshot = await getDocs(q);
    const conns = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Connection));
    return conns.sort((a, b) => b.created_at.localeCompare(a.created_at));
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
    return acts.sort((a, b) => a.created_at.localeCompare(b.created_at));
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

async function updateUserPlan(userId: string, updates: Partial<UserPlan>): Promise<void> {
  await updateDoc(doc(db, 'users', userId), { ...updates });
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

function calculateStreakUpdate(plan: UserPlan): {
  currentStreak: number; longestStreak: number; lastCompletedDate: string;
  streakFreezes: number; streakSaved: boolean;
} {
  const today = new Date().toISOString().split('T')[0];
  const last = plan.lastCompletedDate ?? null;
  let streak = plan.currentStreak ?? 0;
  let freezes = plan.streakFreezes ?? 0;
  let streakSaved = false;

  if (last === today) {
    return { currentStreak: streak, longestStreak: Math.max(plan.longestStreak ?? 0, streak), lastCompletedDate: today, streakFreezes: freezes, streakSaved: false };
  }
  if (!last) {
    streak = 1;
  } else {
    const daysDiff = Math.round((new Date(today).getTime() - new Date(last).getTime()) / 86400000);
    if (daysDiff === 1) {
      streak += 1;
    } else if (daysDiff === 2 && freezes > 0) {
      streak += 1;
      freezes -= 1;
      streakSaved = true;
    } else {
      streak = 1;
    }
  }
  return { currentStreak: streak, longestStreak: Math.max(plan.longestStreak ?? 0, streak), lastCompletedDate: today, streakFreezes: freezes, streakSaved };
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

  const pendingConnectionRef = useRef<{ connection: ConnectionType; frequency: Frequency } | null>(null);

  const [userPlan, setUserPlan] = useState<UserPlan | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgradeBlockReason, setUpgradeBlockReason] = useState<'connection' | 'nudge' | null>(null);
  const [showComingSoonToast, setShowComingSoonToast] = useState(false);
  const [streakSavedByFreeze, setStreakSavedByFreeze] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareActivity, setShareActivity] = useState<Activity | null>(null);
  const [showScratchCardModal, setShowScratchCardModal] = useState(false);
  const [currentScratchReward, setCurrentScratchReward] = useState<ScratchReward | null>(null);
  const [scratchRevealed, setScratchRevealed] = useState(false);

  const [notificationTime, setNotificationTime] = useState('9:00 AM');
  const [emailDailyReminders, setEmailDailyReminders] = useState(true);
  const [emailWeeklyProgress, setEmailWeeklyProgress] = useState(true);
  const [emailMonthlyInsights, setEmailMonthlyInsights] = useState(false);

  // ============================================================================
  // AUTH STATE LISTENER
  // ============================================================================

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
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

        const nowDate = new Date();
        if (nowDate >= new Date(plan.nudgeResetDate)) {
          const resetUpdates = { nudgeCount: 0, nudgeResetDate: getNextResetDate() };
          await updateUserPlan(firebaseUser.uid, resetUpdates);
          plan = { ...plan, ...resetUpdates };
        }

        if (plan.plan === 'trial' && plan.trialEndDate && nowDate > new Date(plan.trialEndDate)) {
          await updateUserPlan(firebaseUser.uid, { plan: 'free' });
          plan = { ...plan, plan: 'free' };
          const sorted = [...loadedConnections].sort((a, b) => a.created_at.localeCompare(b.created_at));
          const toPause = sorted.slice(1);
          if (toPause.length > 0) {
            const pauseBatch = writeBatch(db);
            toPause.forEach(c => pauseBatch.update(doc(db, 'user_connections', c.id), { is_paused: true }));
            await pauseBatch.commit();
            for (const conn of toPause) {
              const actQ = query(collection(db, 'user_activities'), where('connection_id', '==', conn.id), where('status', '==', 'active'));
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
          const isDuplicate = loadedConnections.some(c => c.title === connection.title);
          if (!isDuplicate && isPlanAllowed(plan, 'connection') && isPlanAllowed(plan, 'nudge')) {
            const now = new Date().toISOString();
            const connData = {
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
            const connRef = await addDoc(collection(db, 'user_connections'), connData);
            await createActivitiesForConnection(connRef.id, connection.title, firebaseUser.uid, getActivityCount(plan));
            const planUpdates = { connectionCount: plan.connectionCount + 1, nudgeCount: plan.nudgeCount + 5 };
            await updateUserPlan(firebaseUser.uid, planUpdates);
            plan = { ...plan, ...planUpdates };
            [loadedConnections, loadedActivities] = await Promise.all([
              loadUserConnections(firebaseUser.uid),
              loadUserActivities(firebaseUser.uid),
            ]);
          }
          pendingConnectionRef.current = null;
          setSelectedConnection(null);
          setSelectedFrequency(null);
        }

        // Load email preferences
        const prefSnap = await getDoc(doc(db, 'user_preferences', firebaseUser.uid));
        if (prefSnap.exists()) {
          const prefs = prefSnap.data();
          if (prefs.notificationTime) setNotificationTime(prefs.notificationTime);
          if (typeof prefs.emailDailyReminders === 'boolean') setEmailDailyReminders(prefs.emailDailyReminders);
          if (typeof prefs.emailWeeklyProgress === 'boolean') setEmailWeeklyProgress(prefs.emailWeeklyProgress);
          if (typeof prefs.emailMonthlyInsights === 'boolean') setEmailMonthlyInsights(prefs.emailMonthlyInsights);
        }

        setConnections(loadedConnections);
        setUserActivities(loadedActivities);
        setUserPlan(plan);
        setIsFirstTime(!sessionStorage.getItem('hasVisited'));
        setCurrentPage('dashboard');
      } else {
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

  useEffect(() => {
    if (!showComingSoonToast) return;
    const t = setTimeout(() => setShowComingSoonToast(false), 3000);
    return () => clearTimeout(t);
  }, [showComingSoonToast]);

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================

  const handleConnectionSelect = (connectionType: ConnectionType) => {
    if (!LIVE_CONNECTION_TITLES.has(connectionType.title)) return;
    setSelectedConnection(connectionType);
    const defaultFrequency = FREQUENCIES[0];
    setSelectedFrequency(defaultFrequency);
    pendingConnectionRef.current = { connection: connectionType, frequency: defaultFrequency };
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
    pendingConnectionRef.current = { connection: selectedConnection, frequency };
    setShowFrequencyModal(false);
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setAuthTab('signup');
      setCurrentPage('signin');
    }, 3000);
  };

  const handleGoogleSignIn = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      sessionStorage.setItem('hasVisited', 'true');
      // Only register new users in Loops
      const isNew = (result as any)._tokenResponse?.isNewUser;
      if (isNew) {
        const { displayName, email } = result.user;
        await fetch('/api/loops/event', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email,
            eventName: 'signup',
            contactProperties: { firstName: displayName?.split(' ')[0] ?? '', source: 'google' },
          }),
        });
      }
    } catch (error: any) {
      if (error.code !== 'auth/popup-closed-by-user') {
        console.error('Google sign-in error:', error);
        alert('Error signing in with Google. Please try again.');
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
      // Register new contact in Loops and fire signup event
      await fetch('/api/loops/event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          eventName: 'signup',
          contactProperties: { firstName, source: 'email' },
        }),
      });
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

  const savePreferences = async (updates: {
    notificationTime?: string;
    emailDailyReminders?: boolean;
    emailWeeklyProgress?: boolean;
    emailMonthlyInsights?: boolean;
  }) => {
    if (!user?.id) return;
    const prefs = {
      email: user.email,
      notificationTime,
      emailDailyReminders,
      emailWeeklyProgress,
      emailMonthlyInsights,
      ...updates,
    };
    await setDoc(doc(db, 'user_preferences', user.id), prefs, { merge: true });
    // Sync to Loops contact so Loops campaigns can filter by preference
    fetch('/api/loops/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(prefs),
    });
  };

  const handleAddConnection = async (connectionType: ConnectionType) => {
    if (!user?.id) { alert('Please sign in to add connections'); return; }
    const duplicate = connections.some(c => c.title === connectionType.title);
    if (duplicate) {
      alert(`You already have a connection for ${connectionType.title}.`);
      return;
    }
    if (userPlan && !isPlanAllowed(userPlan, 'connection')) {
      setUpgradeBlockReason('connection');
      setShowUpgradeModal(true);
      setShowAddConnectionModal(false);
      return;
    }
    if (userPlan && !isPlanAllowed(userPlan, 'nudge')) {
      setUpgradeBlockReason('nudge');
      setShowUpgradeModal(true);
      setShowAddConnectionModal(false);
      return;
    }
    try {
      const now = new Date().toISOString();
      const connData = {
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
      const connRef = await addDoc(collection(db, 'user_connections'), connData);
      await createActivitiesForConnection(connRef.id, connectionType.title, user.id, userPlan ? getActivityCount(userPlan) : 5);
      const [newConns, newActs] = await Promise.all([
        loadUserConnections(user.id),
        loadUserActivities(user.id),
      ]);
      setConnections(newConns);
      setUserActivities(newActs);
      if (userPlan) {
        const updatedPlan = { ...userPlan, connectionCount: userPlan.connectionCount + 1, nudgeCount: userPlan.nudgeCount + 5 };
        await updateUserPlan(user.id, { connectionCount: updatedPlan.connectionCount, nudgeCount: updatedPlan.nudgeCount });
        setUserPlan(updatedPlan);
      }
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
      const q = query(collection(db, 'user_activities'), where('connection_id', '==', connectionId));
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
    if (user?.id && userPlan) {
      const updatedPlan = { ...userPlan, connectionCount: Math.max(0, userPlan.connectionCount - 1) };
      try {
        await updateUserPlan(user.id, { connectionCount: updatedPlan.connectionCount });
        setUserPlan(updatedPlan);
      } catch (error) {
        console.error('Error updating plan count after delete:', error);
      }
    }
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

  const handleViewActivities = async (connection: Connection) => {
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
          connActivities = [...connActivities, ...newActivities];
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
    setCurrentActivityIndex(0);
    const today = new Date().toISOString().split('T')[0];
    const statsSnap = await getDoc(doc(db, 'daily_stats', today));
    setNudgesTodayCount(statsSnap.exists() ? (statsSnap.data().nudgeCount ?? 0) : 0);
    setShowActivitiesModal(true);
  };

  const handleCompleteActivity = async (activityId: string) => {
    if (!user?.id) return;
    const completedActivity = userActivities.find(a => a.id === activityId);
    try {
      await updateActivityStatus(activityId, 'completed');
      const today = new Date().toISOString().split('T')[0];
      await setDoc(doc(db, 'daily_stats', today), { nudgeCount: increment(1) }, { merge: true });
      setNudgesTodayCount(prev => prev + 1);
      const now = new Date().toISOString();
      setUserActivities(prev => prev.map(a => a.id === activityId ? { ...a, status: 'completed', completed_at: now } : a));
      const updatedActivities = activities.map(a => a.id === activityId ? { ...a, status: 'completed' as Activity['status'], completed_at: now } : a);
      setActivities(updatedActivities);
      if (selectedActivityConnection) {
        const completedCount = updatedActivities.filter(a => a.status === 'completed').length;
        await updateDoc(doc(db, 'user_connections', selectedActivityConnection.id), { activities_completed: completedCount });
        setConnections(prev => prev.map(c => c.id === selectedActivityConnection.id ? { ...c, activities_completed: completedCount } : c));
      }
      if (userPlan) {
        const streakResult = calculateStreakUpdate(userPlan);
        const newTotal = (userPlan.totalActivitiesCompleted ?? 0) + 1;
        const earnedScratchCard = newTotal > 0 && newTotal % 5 === 0;
        const planUpdates: Partial<UserPlan> = {
          currentStreak: streakResult.currentStreak,
          longestStreak: streakResult.longestStreak,
          lastCompletedDate: streakResult.lastCompletedDate,
          streakFreezes: streakResult.streakFreezes,
          totalActivitiesCompleted: newTotal,
          scratchCardsAvailable: (userPlan.scratchCardsAvailable ?? 0) + (earnedScratchCard ? 1 : 0),
        };
        await updateUserPlan(user.id, planUpdates);
        setUserPlan(prev => prev ? { ...prev, ...planUpdates } : prev);
        if (streakResult.streakSaved) {
          setStreakSavedByFreeze(true);
          setTimeout(() => setStreakSavedByFreeze(false), 4000);
        }
      }
      if (completedActivity) {
        setShareActivity(completedActivity);
        setShowShareModal(true);
      }
    } catch (error) {
      console.error('Error completing activity:', error);
      alert('Failed to complete activity.');
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
    if (!user?.id || !userPlan) return;
    const now = new Date();
    const trialEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const updates: Partial<UserPlan> = {
      plan: 'trial',
      trialStartDate: now.toISOString(),
      trialEndDate: trialEnd.toISOString(),
      trialUsed: true,
    };
    await updateUserPlan(user.id, updates);
    setUserPlan(prev => prev ? { ...prev, ...updates } : prev);
    setShowUpgradeModal(false);
  };

  const handleUpgrade = async () => {
    if (!user?.id || !user?.email) return;
    setLoading(true);
    setShowUpgradeModal(false);
    try {
      const res = await fetch('/api/lemonsqueezy/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user.email, userId: user.id }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert('Failed to start checkout. Please try again.');
      }
    } catch {
      alert('Failed to start checkout. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleComingSoon = () => {
    setShowUpgradeModal(false);
    setShowComingSoonToast(true);
  };

  const handleApplyScratchReward = async (type: ScratchReward['type']) => {
    if (!user?.id || !userPlan) return;
    const updates: Partial<UserPlan> = {
      scratchCardsAvailable: Math.max(0, (userPlan.scratchCardsAvailable ?? 0) - 1),
    };
    if (type === 'bonus_nudge') {
      updates.bonusNudgesEarned = (userPlan.bonusNudgesEarned ?? 0) + 1;
    } else if (type === 'streak_freeze') {
      updates.streakFreezes = (userPlan.streakFreezes ?? 0) + 1;
    } else if (type === 'extra_relation') {
      const expiry = new Date();
      expiry.setDate(expiry.getDate() + 7);
      updates.extraRelationExpiry = expiry.toISOString();
    }
    await updateUserPlan(user.id, updates);
    setUserPlan(prev => prev ? { ...prev, ...updates } : prev);
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

  const FrequencyModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 max-w-sm w-full text-center shadow-xl">
            <p className="text-gray-500 mb-4">No nudges yet for this connection.</p>
            <button onClick={() => setShowActivitiesModal(false)} className="text-gray-400 text-sm">Close</button>
          </div>
        </div>
      );
    }

    const activity = activities[currentActivityIndex];
    const nudge = activity.nudge_id ? getNudgeById(activity.nudge_id) : null;
    const cat = nudge ? CATEGORY_CONFIG[nudge.category] : null;
    const timeLabel = nudge ? TIME_LABELS[nudge.timeRequired] : null;
    const countDisplay = nudgesTodayCount.toLocaleString();

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-0 md:p-6">
        {/* Modal container: full-screen mobile, compact desktop */}
        <div className="w-full h-full md:h-auto md:max-h-[90vh] md:max-w-4xl md:rounded-2xl md:shadow-2xl overflow-hidden bg-white flex flex-col">

          {/* Nav bar */}
          <nav className="flex-shrink-0 flex justify-between items-center px-4 md:px-8 py-4 bg-white/80 backdrop-blur-md border-b border-gray-100 z-10">
            <button onClick={() => setShowActivitiesModal(false)} className="flex items-center gap-2 text-gray-700 hover:opacity-70 transition-opacity active:scale-95">
              <ArrowLeft className="w-5 h-5" />
              <span className="text-xs font-bold uppercase tracking-widest hidden sm:inline">Back to Library</span>
            </button>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setCurrentActivityIndex(prev => Math.max(0, prev - 1))}
                disabled={currentActivityIndex === 0}
                className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-gray-200 disabled:opacity-25 disabled:cursor-not-allowed active:scale-90 transition-all"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              {activities.map((a, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentActivityIndex(i)}
                  className={`rounded-full transition-all duration-200 ${
                    i === currentActivityIndex ? 'w-5 h-2 bg-pink-500'
                    : a.status === 'completed' ? 'w-2 h-2 bg-green-400'
                    : 'w-2 h-2 bg-gray-300'
                  }`}
                />
              ))}
              <button
                onClick={() => setCurrentActivityIndex(prev => Math.min(activities.length - 1, prev + 1))}
                disabled={currentActivityIndex === activities.length - 1}
                className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-gray-200 disabled:opacity-25 disabled:cursor-not-allowed active:scale-90 transition-all"
              >
                <ArrowLeft className="w-4 h-4 rotate-180" />
              </button>
            </div>
            <div className="w-20 flex items-center justify-end gap-2">
              <span className="text-xs text-gray-400 font-medium">{currentActivityIndex + 1} / {activities.length}</span>
              <button
                onClick={() => setShowActivitiesModal(false)}
                className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 active:scale-90 transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </nav>

          {/* Body */}
          <div className="flex flex-1 overflow-hidden">

            {/* Left hero — desktop only, blank for future images */}
            <section className="hidden md:flex md:w-[42%] flex-shrink-0 relative flex-col">
              <div className="absolute inset-0 bg-gradient-to-br from-slate-200 to-slate-300" />
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
                        {currentActivityIndex < activities.length - 1 ? (
                          <button
                            onClick={() => setCurrentActivityIndex(prev => prev + 1)}
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
                        Undo Skip
                      </button>
                      {currentActivityIndex < activities.length - 1 && (
                        <button onClick={() => setCurrentActivityIndex(prev => prev + 1)} className="w-full h-12 text-gray-400 text-xs font-bold uppercase tracking-wider">
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
                      {currentActivityIndex < activities.length - 1 && (
                        <button
                          onClick={() => setCurrentActivityIndex(prev => prev + 1)}
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
    <header className="fixed top-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-b border-gray-200 z-50 flex justify-between items-center px-6 py-4">
      <div className="flex items-center">
        <div className="w-8 h-8 bg-pink-500 rounded-full flex items-center justify-center mr-3">
          <Heart className="w-5 h-5 text-white fill-white" />
        </div>
        <span className="text-xl font-semibold text-gray-900">TinyNudge</span>
      </div>
      <nav className="flex items-center space-x-4">
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
          className="text-gray-600 hover:text-gray-900 transition-colors px-4 py-2"
        >
          Sign Out
        </button>
      </nav>
    </header>
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
          {isUrgent && ' — Upgrade to keep full access'}
        </span>
        <button
          onClick={() => { setUpgradeBlockReason(null); setShowUpgradeModal(true); }}
          className={`text-sm font-medium px-3 py-1 rounded-lg transition-colors ${isUrgent ? 'bg-orange-500 hover:bg-orange-600 text-white' : 'bg-blue-500 hover:bg-blue-600 text-white'}`}
        >
          Upgrade
        </button>
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
        {used >= 5 && (
          <button
            onClick={() => { setUpgradeBlockReason('nudge'); setShowUpgradeModal(true); }}
            className="text-xs font-medium underline"
          >
            Upgrade
          </button>
        )}
      </div>
    );
  };

  const UpgradeModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
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

  const ComingSoonToast = () => (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-6 py-3 rounded-full shadow-lg z-50 text-sm font-medium">
      Coming soon — stay tuned! 🎉
    </div>
  );

  const StreakFreezeNotification = () => {
    if (!streakSavedByFreeze) return null;
    return (
      <div className="fixed top-20 left-1/2 -translate-x-1/2 bg-blue-500 text-white px-6 py-3 rounded-full shadow-lg z-50 text-sm font-medium whitespace-nowrap">
        ❄️ Streak saved by freeze!
      </div>
    );
  };

  const StreakWidget = () => {
    if (!userPlan) return null;
    const { currentStreak, longestStreak, lastCompletedDate, streakFreezes } = userPlan;
    const todayDate = new Date();
    const todayStr = todayDate.toISOString().split('T')[0];
    const dow = todayDate.getDay();
    const weekStart = new Date(todayDate);
    weekStart.setDate(todayDate.getDate() - dow);
    const weekDays = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart);
      d.setDate(weekStart.getDate() + i);
      return { dateStr: d.toISOString().split('T')[0], label: ['S','M','T','W','T','F','S'][i] };
    });
    const filledDates = new Set<string>();
    if (lastCompletedDate && currentStreak > 0) {
      for (let i = 0; i < Math.min(currentStreak, 7); i++) {
        const d = new Date(lastCompletedDate);
        d.setDate(d.getDate() - i);
        filledDates.add(d.toISOString().split('T')[0]);
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
      if (typeof navigator !== 'undefined' && 'share' in navigator) {
        try { await (navigator as Navigator & { share: (d: object) => Promise<void> }).share({ text }); } catch {}
      }
    };
    const canShare = typeof navigator !== 'undefined' && 'share' in navigator;
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
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
      <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50">
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
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
              </div>
            )}
          </div>

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
          <div className="pt-20 px-6">
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
                <button
                  onClick={() => setShowAddConnectionModal(true)}
                  className="bg-pink-500 hover:bg-pink-600 text-white font-medium py-3 px-6 rounded-xl transition-colors flex items-center gap-2"
                >
                  <Plus className="w-5 h-5" />
                  Add Connection
                </button>
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
                          View Activities
                        </button>
                        <button
                          onClick={() => handleTogglePause(connection.id)}
                          className="p-2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl transition-colors"
                          title={connection.is_paused ? 'Resume' : 'Pause'}
                        >
                          {connection.is_paused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
        {showAddConnectionModal && <AddConnectionModal />}
        {showActivitiesModal && <ActivitiesModal />}
        {showUpgradeModal && <UpgradeModal />}
        {showShareModal && <ShareModal />}
        {showScratchCardModal && <ScratchCardModal />}
        {showComingSoonToast && <ComingSoonToast />}
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
          <div className="pt-20 px-6">
            <div className="max-w-4xl mx-auto">
              <h1 className="text-4xl font-bold text-gray-900 mb-8">Account Settings ⚙️</h1>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2">
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

                  <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-200">
                    <h2 className="text-2xl font-semibold text-gray-900 mb-6 flex items-center gap-2">
                      <Settings className="w-6 h-6 text-pink-500" />
                      Preferences
                    </h2>
                    <div className="space-y-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-900 mb-2">Default Notification Time</label>
                        <select
                          value={notificationTime}
                          onChange={(e) => {
                            setNotificationTime(e.target.value);
                            savePreferences({ notificationTime: e.target.value });
                          }}
                          className="w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                        >
                          <option>9:00 AM</option>
                          <option>12:00 PM</option>
                          <option>6:00 PM</option>
                          <option>8:00 PM</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-900 mb-4">Email Notifications</label>
                        <div className="space-y-3">
                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              checked={emailDailyReminders}
                              onChange={(e) => {
                                setEmailDailyReminders(e.target.checked);
                                savePreferences({ emailDailyReminders: e.target.checked });
                              }}
                              className="mr-3 h-4 w-4 text-pink-500 focus:ring-pink-500 border-gray-300 rounded"
                            />
                            <span className="text-gray-700">Daily activity reminders</span>
                          </label>
                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              checked={emailWeeklyProgress}
                              onChange={(e) => {
                                setEmailWeeklyProgress(e.target.checked);
                                savePreferences({ emailWeeklyProgress: e.target.checked });
                              }}
                              className="mr-3 h-4 w-4 text-pink-500 focus:ring-pink-500 border-gray-300 rounded"
                            />
                            <span className="text-gray-700">Weekly progress updates</span>
                          </label>
                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              checked={emailMonthlyInsights}
                              onChange={(e) => {
                                setEmailMonthlyInsights(e.target.checked);
                                savePreferences({ emailMonthlyInsights: e.target.checked });
                              }}
                              className="mr-3 h-4 w-4 text-pink-500 focus:ring-pink-500 border-gray-300 rounded"
                            />
                            <span className="text-gray-700">Monthly relationship insights</span>
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
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
                        <div className="text-2xl font-bold text-green-600">7</div>
                        <div className="text-sm text-green-700">Day Streak</div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-200">
                    <h3 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions ⚡</h3>
                    <div className="space-y-3">
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
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        {showAddConnectionModal && <AddConnectionModal />}
        {showUpgradeModal && <UpgradeModal />}
        {showShareModal && <ShareModal />}
        {showScratchCardModal && <ScratchCardModal />}
        {showComingSoonToast && <ComingSoonToast />}
        <StreakFreezeNotification />
      </>
    );
  }

  // Home page
  return (
    <div className="min-h-screen bg-gray-50">
      {showFrequencyModal && <FrequencyModal />}

      <header className="fixed top-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-b border-gray-200 z-50 flex justify-between items-center px-6 py-4">
        <div className="flex items-center">
          <div className="w-8 h-8 bg-pink-500 rounded-full flex items-center justify-center mr-3">
            <Heart className="w-5 h-5 text-white fill-white" />
          </div>
          <span className="text-xl font-semibold text-gray-900">TinyNudge</span>
        </div>
        <nav className="flex items-center space-x-8">
          <a href="#about" className="text-gray-600 hover:text-gray-900 transition-colors">About</a>
          <a href="#pricing" className="text-gray-600 hover:text-gray-900 transition-colors">Pricing</a>
          <button
            onClick={() => { setAuthTab('signin'); setCurrentPage('signin'); }}
            className="text-gray-900 font-medium hover:text-pink-600 transition-colors"
          >
            Sign In
          </button>
        </nav>
      </header>

      <main className="flex flex-col items-center justify-center px-6 py-20 pt-32">
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
                {['5 nudges per month', '2 connections at a time', 'Basic dashboard', 'Weekly Reminders'].map(item => (
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
                {['100 nudges per month', '10 connections at a time', 'Consolidated Dashboard', 'Daily Reminders'].map(item => (
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
            <p className="text-gray-500 text-sm mt-4">© 2024 TinyNudge. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Page;
