"use client";

// ============================================================================
// PART 1: IMPORTS, INTERFACES, AND SUPABASE SETUP
// ============================================================================

import React, { useState, useEffect } from 'react';
import { Heart, Settings, Star, Eye, EyeOff, X, Plus, Pause, Play, Trash2 } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

// ============================================================================
// GLOBAL DECLARATIONS
// ============================================================================

declare global {
  interface Window {
    google: any;
    handleGoogleSignIn: (response: any) => void;
  }
}

// ============================================================================
// SUPABASE CLIENT INITIALIZATION
// ============================================================================

const supabaseUrl = 'https://uaqbwsmuuvaukxurzdks.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVhcWJ3c211dXZhdWt4dXJ6ZGtzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUwNTI4NzEsImV4cCI6MjA3MDYyODg3MX0.V__PztLOgmJO40UE7Nf3OcQRYojURZsKvpH-hp-XurU';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    detectSessionInUrl: true,
    autoRefreshToken: true
  },
  db: {
    schema: 'public'
  }
});

// ============================================================================
// TYPESCRIPT INTERFACES
// ============================================================================

interface User {
  email: string;
  id: string;
  name?: string;
  picture?: string;
}

export default function HomePage() {

interface Connection {
  id: string;
  title: string;
  emoji: string;
  description: string;
  frequency?: string;
  activitiesCompleted?: number;
  totalActivities?: number;
  isPaused?: boolean;
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

interface Activity {
  id: string;
  connection_id: string;
  title: string;
  description: string;
  status: 'active' | 'completed' | 'skipped' | 'paused';
  created_at?: string;
  completed_at?: string | null;
  user_id: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const GOOGLE_CLIENT_ID = '601381853625-n8j65mvl61a3irt7pj3gd8pgauk5pdak.apps.googleusercontent.com';
// ============================================================================
// PART 2: ACTIVITY MANAGEMENT FUNCTIONS & TEMPLATES
// ============================================================================

// Activity Templates for each connection type
const activityTemplates: Record<string, string[]> = {
  'Partner': [
    'Send a heartfelt good morning text',
    'Plan a surprise date night',
    'Cook their favorite meal together',
    'Write a love note and hide it somewhere they\'ll find',
    'Give them a 5-minute shoulder massage'
  ],
  'Daughter': [
    'Read a bedtime story together',
    'Have a tea party or picnic',
    'Draw pictures together',
    'Go for a nature walk and collect leaves',
    'Bake cookies together'
  ],
  'Son': [
    'Play catch in the backyard',
    'Build something together with blocks',
    'Go on a bike ride',
    'Teach him a new skill',
    'Have a pillow fight'
  ],
  'Mom': [
    'Call her just to say hi',
    'Send flowers or a card',
    'Cook her favorite meal',
    'Look through old photos together',
    'Ask about her childhood memories'
  ],
  'Dad': [
    'Ask about his day at work',
    'Watch his favorite sports team together',
    'Work on a project together',
    'Share a coffee or tea',
    'Ask for his advice on something'
  ],
  'Friend': [
    'Send a funny meme that reminds you of them',
    'Plan a coffee date',
    'Call them to catch up',
    'Invite them to try something new together',
    'Send an encouraging text'
  ],
  'Girlfriend': [
    'Write her a sweet note',
    'Plan a fun outing together',
    'Surprise her with her favorite treat',
    'Share a playlist of songs that remind you of her',
    'Ask her about her dreams'
  ],
  'Boyfriend': [
    'Send him a motivational message',
    'Plan a game night',
    'Cook his favorite meal',
    'Go for a walk together',
    'Ask him about his goals'
  ],
  'Fiancée': [
    'Talk about wedding plans',
    'Share a memory from your relationship',
    'Plan a date night',
    'Write a list of things you love about them',
    'Dream about your future together'
  ],
  'Brother': [
    'Play a video game together',
    'Share a funny story',
    'Go for a bike ride',
    'Help him with a project',
    'Reminisce about childhood memories'
  ],
  'Sister': [
    'Have a spa day at home',
    'Share a favorite book',
    'Go shopping together',
    'Cook a meal together',
    'Watch a movie together'
  ],
  'Cousin': [
    'Call to catch up',
    'Share a family story',
    'Plan a get-together',
    'Send a funny meme',
    'Ask about their hobbies'
  ],
  'Relative': [
    'Send a holiday card',
    'Share a family recipe',
    'Call to check in',
    'Plan a family gathering',
    'Ask about their favorite memory'
  ],
  'Colleague': [
    'Compliment their work',
    'Invite them for coffee',
    'Share a helpful resource',
    'Ask about their weekend',
    'Offer help on a project'
  ],
  'Roommate': [
    'Cook a meal together',
    'Plan a movie night',
    'Clean a shared space together',
    'Talk about your day',
    'Plan a fun outing'
  ]
};

// ============================================================================
// DATABASE HELPER FUNCTIONS
// ============================================================================

/**
 * Load all connections for a user
 */
async function loadUserConnections(userId: string): Promise<Connection[]> {
  if (!userId) {
    console.error('loadUserConnections: No userId provided');
    return [];
  }

  try {
    const { data, error } = await supabase
      .from('user_connections')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading user connections:', error);
      return [];
    }

    return (data || []).map((conn) => ({
      id: conn.id,
      title: conn.title,
      emoji: conn.emoji,
      description: conn.description,
      frequency: conn.frequency,
      activitiesCompleted: conn.activities_completed || 0,
      totalActivities: conn.total_activities || 5,
      isPaused: conn.is_paused || false
    }));
  } catch (error) {
    console.error('Unexpected error loading connections:', error);
    return [];
  }
}

/**
 * Load all activities for a user
 */
async function loadUserActivities(userId: string): Promise<Activity[]> {
  if (!userId) {
    console.error('loadUserActivities: No userId provided');
    return [];
  }

  try {
    const { data, error } = await supabase
      .from('user_activities')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error loading user activities:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Unexpected error loading activities:', error);
    return [];
  }
}

/**
 * Get activities for a specific connection
 */
function getActivitiesForConnection(activities: Activity[], connectionId: string): Activity[] {
  if (!connectionId || !Array.isArray(activities)) {
    return [];
  }
  return activities.filter(activity => activity.connection_id === connectionId);
}

/**
 * Update activity status
 */
async function updateActivityStatus(
  activityId: string, 
  status: 'active' | 'completed' | 'skipped' | 'paused',
  userId: string
): Promise<Activity | null> {
  if (!activityId || !userId) {
    throw new Error('Activity ID and User ID are required');
  }

  try {
    const updateData: any = {
      status: status,
      completed_at: status === 'completed' ? new Date().toISOString() : null
    };

    const { data, error } = await supabase
      .from('user_activities')
      .update(updateData)
      .eq('id', activityId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      console.error('Error updating activity status:', error);
      throw new Error(`Failed to update activity: ${error.message}`);
    }

    return data;
  } catch (error) {
    console.error('Unexpected error in updateActivityStatus:', error);
    throw error;
  }
}

/**
 * Create activities for a new connection
 */
async function createActivitiesForConnection(
  connectionId: string, 
  connectionTitle: string, 
  userId: string
): Promise<Activity[]> {
  if (!connectionId || !connectionTitle || !userId) {
    throw new Error('Missing required parameters for creating activities');
  }

  const templates = activityTemplates[connectionTitle] || activityTemplates['Friend'];
  
  if (!templates || templates.length === 0) {
    throw new Error(`No activity templates found for ${connectionTitle}`);
  }

  console.log('Creating activities for connection ID:', connectionId);
  console.log('User ID:', userId);
  console.log('Templates found:', templates.length);
  
  const activitiesToCreate = templates.map((template) => ({
    connection_id: connectionId,
    title: template,
    description: `A meaningful way to connect with your ${connectionTitle.toLowerCase()}`,
    status: 'active' as const,
    user_id: userId,
    created_at: new Date().toISOString(),
    completed_at: null
  }));

  try {
    console.log('Activities payload:', activitiesToCreate);
    
    const { data, error } = await supabase
      .from('user_activities')
      .insert(activitiesToCreate)
      .select();

    if (error) {
      console.error('Supabase error creating activities:', error);
      throw new Error(`Failed to create activities: ${error.message}`);
    }

    if (!data || data.length === 0) {
      throw new Error('No activities were created - database returned empty result');
    }

    console.log('Successfully created activities:', data);
    return data;
  } catch (error) {
    console.error('Error in createActivitiesForConnection:', error);
    throw error;
  }
}
// ============================================================================
// PART 3: MAIN COMPONENT, STATE, AND USEEFFECT HOOKS
// ============================================================================

export default function Page() {
  // ============================================================================
  // STATE MANAGEMENT
  // ============================================================================
  
  const [currentPage, setCurrentPage] = useState('home');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showFrequencyModal, setShowFrequencyModal] = useState(false);
  
  // Form states
  const [signupEmail, setSignupEmail] = useState('');
  const [signinEmail, setSigninEmail] = useState('');
  const [signinPassword, setSigninPassword] = useState('');
  const [showSigninPassword, setShowSigninPassword] = useState(false);
  const [signupPassword, setSignupPassword] = useState('');
  const [signupConfirmPassword, setSignupConfirmPassword] = useState('');
  const [showAddConnectionModal, setShowAddConnectionModal] = useState(false);
  const [showActivitiesModal, setShowActivitiesModal] = useState(false);
  const [selectedConnection, setSelectedConnection] = useState<Connection | null>(null);
  const [selectedActivityConnection, setSelectedActivityConnection] = useState<Connection | null>(null);
  const [showLoading, setShowLoading] = useState(false);
  const [selectedFrequency, setSelectedFrequency] = useState<Frequency | null>(null);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [userName, setUserName] = useState('');
  const [isFirstTime, setIsFirstTime] = useState(true);
  const [userConnections, setUserConnections] = useState<Connection[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [userActivities, setUserActivities] = useState<Activity[]>([]);
  const [signinEmail, setSigninEmail] = useState('');
  const [signinPassword, setSigninPassword] = useState('');
  const [showSigninPassword, setShowSigninPassword] = useState(false);
  const [lastActivitiesLoad, setLastActivitiesLoad] = useState<string | null>(null);

  // ============================================================================
  // STATIC DATA
  // ============================================================================
  
  const frequencies: Frequency[] = [
    {
      id: 'daily',
      title: 'Daily',
      time: '5-15 mins',
      description: 'Quick daily moments',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      selectedBg: 'bg-blue-100',
      selectedBorder: 'border-blue-500'
    },
    {
      id: 'weekly',
      title: 'Weekly',
      time: '5-15 mins',
      description: 'Meaningful weekly connections',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      selectedBg: 'bg-green-100',
      selectedBorder: 'border-green-500'
    },
    {
      id: 'biweekly',
      title: '15 days once',
      time: '10-20 mins',
      description: 'Deeper bi-weekly moments',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-200',
      selectedBg: 'bg-purple-100',
      selectedBorder: 'border-purple-500'
    },
    {
      id: 'monthly',
      title: 'Monthly',
      time: '10-30 mins',
      description: 'Quality monthly experiences',
      bgColor: 'bg-pink-50',
      borderColor: 'border-pink-200',
      selectedBg: 'bg-pink-100',
      selectedBorder: 'border-pink-500'
    }
  ];

  const connections = [
    { id: 'partner', title: 'Partner', emoji: '😍💕', description: 'Strengthen your romantic bond' },
    { id: 'daughter', title: 'Daughter', emoji: '👧🏻', description: 'Build precious memories together' },
    { id: 'son', title: 'Son', emoji: '👦🏻', description: 'Create lasting father-son moments' },
    { id: 'mom', title: 'Mom', emoji: '👩🏻', description: 'Show appreciation for all she does' },
    { id: 'dad', title: 'Dad', emoji: '👨🏻', description: 'Connect with your father figure' },
    { id: 'girlfriend', title: 'Girlfriend', emoji: '💕', description: 'Keep the romance alive' },
    { id: 'boyfriend', title: 'Boyfriend', emoji: '💙', description: 'Deepen your connection' },
    { id: 'fiancee', title: 'Fiancée', emoji: '💍', description: 'Prepare for your journey together' },
    { id: 'brother', title: 'Brother', emoji: '👬', description: 'Strengthen sibling bonds' },
    { id: 'sister', title: 'Sister', emoji: '👭', description: 'Create sisterly connections' },
    { id: 'friend', title: 'Friend', emoji: '👥', description: 'Nurture lifelong friendships' },
    { id: 'cousin', title: 'Cousin', emoji: '👫', description: 'Stay connected with family' },
    { id: 'relative', title: 'Relative', emoji: '🏠', description: 'Build family relationships' },
    { id: 'colleague', title: 'Colleague', emoji: '💼', description: 'Improve work relationships' },
    { id: 'roommate', title: 'Roommate', emoji: '🏡', description: 'Create harmony at home' }
  ];

  // ============================================================================
  // USEEFFECT HOOKS
  // ============================================================================

  // Load Google Sign-In script
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);

    script.onload = () => {
      console.log('[Google Sign-In] Script loaded');
      if (window.google && window.google.accounts) {
        window.handleGoogleSignIn = async (response: any) => {
          try {
            console.log('[Google Sign-In] Callback fired', response);
            
            const { data, error } = await supabase.auth.signInWithIdToken({
              provider: 'google',
              token: response.credential,
            });

            if (error) {
              console.error('[Google Sign-In] Supabase error:', error);
              alert(`Error signing in with Google: ${(error as Error)?.message || 'Unknown error'}`);
              setLoading(false);
              return;
            }

            const user = data.user;
            setCurrentPage('dashboard');
            setUserName(user.user_metadata?.name || user.email?.split('@')[0] || 'User');
            setUser({ 
              email: user.email || '', 
              id: user.id,
              name: user.user_metadata?.name || undefined,
              picture: user.user_metadata?.picture || undefined
            });
            
            const connections = await loadUserConnections(user.id);
            const activities = await loadUserActivities(user.id);
            setUserConnections(connections);
            setUserActivities(activities);
            
            sessionStorage.setItem('hasVisited', 'true');
            
            if (selectedConnection && selectedFrequency) {
              await handleAddConnection(selectedConnection);
            }
            
            alert('Welcome to TinyNudge!');
            setLoading(false);
          } catch (error) {
            console.error('[Google Sign-In] Error processing Google Sign-In:', error);
            alert('Error signing in with Google');
            setLoading(false);
          }
        };

        try {
          window.google.accounts.id.initialize({
            client_id: GOOGLE_CLIENT_ID,
            callback: window.handleGoogleSignIn,
            auto_select: false,
            cancel_on_tap_outside: false
          });
        } catch (error) {
          console.error('[Google Sign-In] Initialization error:', error);
        }
      } else {
        console.error('[Google Sign-In] window.google not available after script load');
      }
    };

    return () => {
      if (document.head.contains(script)) {
        document.head.removeChild(script);
      }
    };
  }, []);

  // Render Google Sign-In button
  useEffect(() => {
    const buttonEl = document.getElementById('google-signin-button');
    if (window.google && buttonEl) {
      window.google.accounts.id.renderButton(
        buttonEl,
        { 
          theme: 'outline', 
          size: 'large',
          type: 'standard',
          text: 'continue_with'
        }
      );
      console.log('[Google Sign-In] Button rendered (post-mount)');
    }
  }, []);

  // Check if user is returning
  useEffect(() => {
    const hasVisited = sessionStorage.getItem('hasVisited');
    if (hasVisited) {
      setIsFirstTime(false);
    }
  }, []);

  // Sync activities when userActivities change
  useEffect(() => {
    if (selectedActivityConnection && userActivities.length > 0) {
      const connectionActivities = getActivitiesForConnection(userActivities, selectedActivityConnection.id);
      setActivities(connectionActivities);
    }
  }, [userActivities, selectedActivityConnection]);

  // Check authentication on mount
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser({ 
          email: session.user.email || '', 
          id: session.user.id,
          name: session.user.user_metadata?.name,
          picture: session.user.user_metadata?.picture
        });
        setUserName(session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'User');
        setCurrentPage('dashboard');
        const connections = await loadUserConnections(session.user.id);
        const activities = await loadUserActivities(session.user.id);
        setUserConnections(connections);
        setUserActivities(activities);
      }
    };
    checkAuth();
  }, []);

  // Sync activities for selected connection
  useEffect(() => {
    const syncActivities = async () => {
      if (selectedActivityConnection && user?.id) {
        const loadedActivities = await loadUserActivities(user.id);
        const connectionActivities = loadedActivities.filter(
          (activity: Activity) => activity.connection_id === selectedActivityConnection.id
        );
        setActivities(connectionActivities);
      }
    };

    syncActivities();
  }, [selectedActivityConnection, userActivities, user?.id]);

  // Debug logging
  useEffect(() => {
    console.log('User activities updated:', userActivities.length);
    console.log('User connections updated:', userConnections.length);
    
    if (userActivities.length > 0) {
      console.log('Sample activity:', userActivities[0]);
    }
    if (userConnections.length > 0) {
      console.log('Sample connection:', userConnections[0]);
    }
  }, [userActivities, userConnections]);

  // Debug database state
  useEffect(() => {
    const debugDatabaseState = async () => {
      if (!user?.id) return;
      
      console.log('=== DEBUG DATABASE STATE ===');
      console.log('User ID:', user.id);
      
      const { data: connections, error: connError } = await supabase
        .from('user_connections')
        .select('*')
        .eq('user_id', user.id);
      
      console.log('Connections from direct query:', connections);
      if (connError) console.error('Connection error:', connError);
      
      const { data: activities, error: actError } = await supabase
        .from('user_activities')
        .select('*')
        .eq('user_id', user.id);
      
      console.log('Activities from direct query:', activities);
      if (actError) console.error('Activity error:', actError);
      console.log('=== END DEBUG ===');
    };

    if (user?.id) {
      console.log('User detected, running debug...');
      debugDatabaseState();
    }
  }, [user]);
  // ============================================================================
// PART 4: EVENT HANDLER FUNCTIONS
// ============================================================================

  // Handle connection selection
  const handleConnectionSelect = (connectionType: Connection) => {
    if (!connectionType) {
      alert('Please select a valid connection type');
      return;
    }
    
    setSelectedConnection(connectionType);
    handleAddConnection(connectionType);
  };

  // Handle frequency selection
  const handleFrequencySelect = (frequency: Frequency) => {
    if (!frequency) {
      alert('Please select a valid frequency');
      return;
    }
    
    if (!selectedConnection) {
      alert('Please select a connection type first');
      setShowFrequencyModal(false);
      return;
    }
    
    setSelectedFrequency(frequency);
    setShowFrequencyModal(false);
    setShowLoading(true);
    
    setTimeout(() => {
      setShowLoading(false);
      setCurrentPage('signin');
    }, 3000);
  };

  // Handle adding a connection
  const handleAddConnection = async (connectionType: Connection) => {
    if (!connectionType || !connectionType.title) {
      alert('Invalid connection type selected');
      return;
    }

    if (!user?.id) {
      alert('Please sign in to add connections');
      return;
    }

    const duplicate = userConnections.some(conn => conn.title === connectionType.title);
    if (duplicate) {
      alert(`You already have a connection for ${connectionType.title}. Please choose a different one.`);
      return;
    }

    try {
      console.log('Adding connection for user:', user.id);
      console.log('Connection type:', connectionType);
      console.log('Selected frequency:', selectedFrequency);

      const connectionPayload = {
        user_id: user.id,
        title: connectionType.title,
        emoji: connectionType.emoji,
        description: connectionType.description,
        frequency: selectedFrequency?.title || 'As needed',
        activities_completed: 0,
        total_activities: 5,
        is_paused: false
      };

      console.log('Connection payload:', connectionPayload);

      const { data: connectionRecord, error: connectionError } = await supabase
        .from('user_connections')
        .insert([connectionPayload])
        .select()
        .single();

      if (connectionError) {
        console.error('Supabase connection error:', connectionError);
        alert(`Failed to create connection: ${connectionError.message}`);
        return;
      }

      if (!connectionRecord) {
        alert('Failed to create connection - no data returned');
        return;
      }

      console.log('Successfully created connection record:', connectionRecord);

      const newConnection: Connection = {
        id: connectionRecord.id,
        title: connectionRecord.title,
        emoji: connectionRecord.emoji,
        description: connectionRecord.description,
        frequency: connectionRecord.frequency,
        activitiesCompleted: connectionRecord.activities_completed || 0,
        totalActivities: connectionRecord.total_activities || 5,
        isPaused: connectionRecord.is_paused || false
      };

      setUserConnections(prev => [...prev, newConnection]);

      try {
        const createdActivities = await createActivitiesForConnection(
          connectionRecord.id, 
          connectionType.title, 
          user.id
        );
        console.log('Successfully created activities:', createdActivities);
      } catch (activityError) {
        console.error('Error creating activities:', activityError);
        alert('Connection created but failed to generate activities. Please try refreshing the page.');
      }
      
      try {
        const reloadedActivities = await loadUserActivities(user.id);
        setUserActivities(reloadedActivities);
      } catch (reloadError) {
        console.error('Error reloading activities:', reloadError);
      }
      
      setShowAddConnectionModal(false);
      setSelectedConnection(null);
      setSelectedFrequency(null);

    } catch (error) {
      console.error('Unexpected error in handleAddConnection:', error);
      alert(`Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Handle deleting a connection
  const handleDeleteConnection = async (connectionId: string) => {
    if (!connectionId) {
      alert('Invalid connection ID');
      return;
    }

    if (!user?.id) {
      alert('Please sign in to delete connections');
      return;
    }

    if (!window.confirm('Are you sure you want to delete this connection and all its activities? This action cannot be undone.')) {
      return;
    }

    try {
      console.log('Deleting connection:', connectionId, 'for user:', user.id);

      const { error: activitiesError } = await supabase
        .from('user_activities')
        .delete()
        .eq('connection_id', connectionId)
        .eq('user_id', user.id);

      if (activitiesError) {
        console.error('Error deleting activities:', activitiesError);
        alert(`Failed to delete activities: ${activitiesError.message}`);
        return;
      }

      const { error: connectionError } = await supabase
        .from('user_connections')
        .delete()
        .eq('id', connectionId)
        .eq('user_id', user.id);

      if (connectionError) {
        console.error('Error deleting connection:', connectionError);
        alert(`Failed to delete connection: ${connectionError.message}`);
        return;
      }

      setUserConnections(prev => prev.filter(conn => conn.id !== connectionId));
      setUserActivities(prev => prev.filter(activity => activity.connection_id !== connectionId));

      if (selectedActivityConnection?.id === connectionId) {
        setShowActivitiesModal(false);
        setSelectedActivityConnection(null);
        setActivities([]);
      }

      alert('Connection deleted successfully');
    } catch (error) {
      console.error('Unexpected error in handleDeleteConnection:', error);
      alert(`Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Handle toggling pause state
  const handleTogglePause = async (connectionId: string) => {
    if (!connectionId || !user?.id) {
      alert('Invalid connection or user');
      return;
    }

    const connection = userConnections.find(conn => conn.id === connectionId);
    if (!connection) {
      alert('Connection not found');
      return;
    }

    const newPauseStatus = !connection.isPaused;

    try {
      console.log(`${newPauseStatus ? 'Pausing' : 'Resuming'} connection:`, connectionId);

      const { error: connectionError } = await supabase
        .from('user_connections')
        .update({ is_paused: newPauseStatus })
        .eq('id', connectionId)
        .eq('user_id', user.id);

      if (connectionError) {
        console.error('Error updating connection pause status:', connectionError);
        alert(`Failed to ${newPauseStatus ? 'pause' : 'resume'} connection: ${connectionError.message}`);
        return;
      }

      setUserConnections(prev => 
        prev.map(conn => 
          conn.id === connectionId 
            ? { ...conn, isPaused: newPauseStatus }
            : conn
        )
      );

      const connectionActivities = getActivitiesForConnection(userActivities, connectionId);
      const activitiesToUpdate = connectionActivities.filter(
        activity => activity.status === 'active' || activity.status === 'paused'
      );

      if (activitiesToUpdate.length > 0) {
        const newActivityStatus = newPauseStatus ? 'paused' : 'active';
        
        const { error: activitiesError } = await supabase
          .from('user_activities')
          .update({ status: newActivityStatus })
          .in('id', activitiesToUpdate.map(a => a.id))
          .eq('user_id', user.id);

        if (activitiesError) {
          console.error('Error updating activity statuses:', activitiesError);
          alert('Connection status updated, but some activities may not have been updated properly');
        } else {
          setUserActivities(prev =>
            prev.map(activity =>
              activitiesToUpdate.find(a => a.id === activity.id)
                ? { ...activity, status: newActivityStatus }
                : activity
            )
          );

          if (selectedActivityConnection?.id === connectionId) {
            setActivities(prev =>
              prev.map(activity =>
                activitiesToUpdate.find(a => a.id === activity.id)
                  ? { ...activity, status: newActivityStatus }
                  : activity
              )
            );
          }
        }
      }

      alert(`Connection ${newPauseStatus ? 'paused' : 'resumed'} successfully`);

    } catch (error) {
      console.error('Unexpected error in handleTogglePause:', error);
      alert(`Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Handle viewing activities
  const handleViewActivities = async (connection: Connection) => {
    if (!connection || !connection.id) {
      alert('Invalid connection selected');
      return;
    }

    if (!user?.id) {
      alert('Please sign in to view activities');
      return;
    }

    try {
      console.log('Loading activities for connection:', connection.id);
      
      setSelectedActivityConnection(connection);

      const updatedActivities = await loadUserActivities(user.id);
      setUserActivities(updatedActivities);
      
      const connectionActivities = updatedActivities.filter(
        activity => activity.connection_id === connection.id
      );
      
      console.log(`Found ${connectionActivities.length} activities for connection ${connection.title}`);
      setActivities(connectionActivities);
      
      setShowActivitiesModal(true);
    } catch (error) {
      console.error('Error loading activities:', error);
      alert(`Failed to load activities: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Handle completing an activity
  const handleCompleteActivity = async (activityId: string) => {
    if (!activityId || !user?.id) {
      alert('Invalid activity or user');
      return;
    }

    try {
      console.log('Completing activity:', activityId);
      
      const updatedActivity = await updateActivityStatus(activityId, 'completed', user.id);
      console.log('Activity marked as completed:', updatedActivity);
      
      setUserActivities(prev =>
        prev.map(activity =>
          activity.id === activityId
            ? { ...activity, status: 'completed', completed_at: new Date().toISOString() }
            : activity
        )
      );

      if (selectedActivityConnection) {
        const updatedActivities = await loadUserActivities(user.id);
        const connectionActivities = updatedActivities.filter(
          activity => activity.connection_id === selectedActivityConnection.id
        );
        setActivities(connectionActivities);

        const completedCount = connectionActivities.filter(a => a.status === 'completed').length;
        
        try {
          await supabase
            .from('user_connections')
            .update({ activities_completed: completedCount })
            .eq('id', selectedActivityConnection.id)
            .eq('user_id', user.id);

          setUserConnections(prev => 
            prev.map(conn => 
              conn.id === selectedActivityConnection.id 
                ? { ...conn, activitiesCompleted: completedCount }
                : conn
            )
          );
        } catch (progressError) {
          console.error('Error updating connection progress:', progressError);
        }
      }

    } catch (error) {
      console.error('Error completing activity:', error);
      alert(`Failed to complete activity: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Handle skipping an activity
  const handleSkipActivity = async (activityId: string) => {
    if (!activityId || !user?.id) {
      alert('Invalid activity or user');
      return;
    }

    try {
      console.log('Skipping activity:', activityId);
      
      await updateActivityStatus(activityId, 'skipped', user.id);
      
      setUserActivities(prev =>
        prev.map(activity =>
          activity.id === activityId
            ? { ...activity, status: 'skipped', completed_at: null }
            : activity
        )
      );

      if (selectedActivityConnection) {
        const updatedActivities = await loadUserActivities(user.id);
        const connectionActivities = updatedActivities.filter(
          activity => activity.connection_id === selectedActivityConnection.id
        );
        setActivities(connectionActivities);
      }
    } catch (error) {
      console.error('Error skipping activity:', error);
      alert(`Failed to skip activity: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Handle undoing a skip
  const handleUndoSkipActivity = async (activityId: string) => {
    if (!activityId || !user?.id) {
      alert('Invalid activity or user');
      return;
    }

    try {
      console.log('Undoing skip for activity:', activityId);

      const activity = userActivities.find(a => a.id === activityId);
      const connection = userConnections.find(c => c.id === activity?.connection_id);
      
      const newStatus = connection?.isPaused ? 'paused' : 'active';
      
      await updateActivityStatus(activityId, newStatus, user.id);

      setUserActivities(prev =>
        prev.map(act =>
          act.id === activityId
            ? { ...act, status: newStatus, completed_at: null }
            : act
        )
      );

      setActivities(prev => 
        prev.map(act => 
          act.id === activityId 
            ? { ...act, status: newStatus, completed_at: null }
            : act
        )
      );

      console.log(`Activity ${activityId} unskipped successfully`);

    } catch (error) {
      console.error('Error undoing skip activity:', error);
      alert(`Failed to undo skip: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Handle Google Sign-In
  const handleGoogleSignIn = () => {
    if (!window.google) {
      alert('Google Sign-In is still loading. Please wait a moment and try again.');
      return;
    }
    
    if (loading) {
      console.log('Sign-in already in progress');
      return;
    }
    
    setLoading(true);
    
    try {
      window.google.accounts.id.prompt((notification: any) => {
        if (notification.isNotDisplayed()) {
          console.log('Google Sign-In popup was blocked or not displayed');
          alert('Please allow popups for this site to use Google Sign-In, or try the email option below.');
          setLoading(false);
        } else if (notification.isSkippedMoment()) {
          console.log('Google Sign-In was skipped by user');
          setLoading(false);
        }
      });
    } catch (error) {
      console.error('Error triggering Google Sign-In:', error);
      alert('Error with Google Sign-In. Please try the email option below.');
      setLoading(false);
    }
  };

  // Handle email sign-in
  const handleEmailSignIn = () => {
    setCurrentPage('signin');
  };

  const handleSignIn = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: signinEmail,
        password: signinPassword,
      });

      if (error) {
        alert(error.message);
        return;
      }

      if (data.user) {
        const user = data.user;
        setUser({
          email: user.email || '',
          id: user.id,
          name: user.user_metadata?.name || user.email?.split('@')[0] || 'User'
        });
        
        // Load user data
        const { data: connectionsData } = await supabase
          .from('connections')
          .select('*')
          .eq('user_id', user.id);
          
        const { data: activitiesData } = await supabase
          .from('activities')
          .select('*')
          .eq('user_id', user.id);
          
        setUserConnections(connectionsData || []);
        setUserActivities(activitiesData || []);
        setCurrentPage('dashboard');
      }
    } catch (err) {
      console.error('Sign in error:', err);
      alert('An error occurred during sign in');
    } finally {
      setLoading(false);
    }
  };

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
      });

      if (error) {
        alert(`Error: ${(error as Error)?.message || 'Unknown error'}`);
        setLoading(false);
        return;
      }

      setCurrentPage('dashboard');
      setUser({ email, id: data.user.id });
      const connections = await loadUserConnections(data.user.id);
      const activities = await loadUserActivities(data.user.id);
      setUserConnections(connections);
      setUserActivities(activities);
      setUserName(email.split('@')[0]);
      sessionStorage.setItem('hasVisited', 'true');
      
      if (selectedConnection && selectedFrequency) {
        await handleAddConnection(selectedConnection);
      }
      
      alert('Welcome to TinyNudge!');
      setLoading(false);

    } catch (error) {
      console.error('Error:', error);
      alert('Error signing in');
      setLoading(false);
    }
  };

  // Handle email sign-up
  const handleEmailSignUp = async () => {
    try {
      setLoading(true);
      console.log('Starting sign-up process...');
      
      const email = signupEmail.trim();
      const password = signupPassword;

      console.log('Validating form data:', {
        hasEmail: !!email,
        emailLength: email.length,
        hasPassword: !!password,
        passwordLength: password.length,
        passwordsMatch: password === confirmPassword
      });

      if (!email) {
        alert('Please enter your email address');
        return;
      }

      if (!password) {
        alert('Please enter your password');
        return;
      }

      if (password !== confirmPassword) {
        alert('Passwords do not match');
        return;
      }

      if (password.length < 6) {
        alert('Password must be at least 6 characters long');
        return;
      }

      console.log('All validations passed, attempting to create account...');

      // Create the account
      const { error: signUpError } = await supabase.auth.signUp({
        email: email,
        password: password,
        options: {
          data: {
            name: email.split('@')[0]
          }
        }
      });

      if (signUpError) {
        console.error('Signup error:', signUpError);
        alert(`Error: ${signUpError.message}`);
        return;
      }

      // Immediately sign in
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: email,
        password: password
      });

      if (authError) {
        console.error('Sign in error:', authError);
        alert(`Error signing in: ${authError.message}`);
        return;
      }

      if (authData.user) {
        // Update user state
        setUser({
          email: authData.user.email || '',
          id: authData.user.id,
          name: authData.user.user_metadata?.name || authData.user.email?.split('@')[0] || 'User'
        });
        
        // Redirect to dashboard
        setCurrentPage('dashboard');
      }
      
      // Automatically sign in after signup
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
      });

      if (signInError) {
        console.error('Sign in error:', signInError);
        alert(`Error signing in: ${signInError.message}`);
        return;
      }

      // Set user state and redirect
      const user = signInData.user;
      setUser({ 
        email: user.email || '', 
        id: user.id,
        name: user.user_metadata?.name || user.email?.split('@')[0] || 'User',
        picture: user.user_metadata?.picture
      });
      setUserName(user.user_metadata?.name || user.email?.split('@')[0] || 'User');
      
      // Load user data
      const connections = await loadUserConnections(user.id);
      const activities = await loadUserActivities(user.id);
      setUserConnections(connections);
      setUserActivities(activities);
      
      setCurrentPage('dashboard');
      sessionStorage.setItem('hasVisited', 'true');

    } catch (error) {
      console.error('Unexpected error during signup:', error);
      alert('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }

    if (password !== confirmPassword) {
      alert('Passwords do not match');
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email: email,
        password: password,
      });

      if (error) {
        alert(`Error: ${(error as Error)?.message || 'Unknown error'}`);
        setLoading(false);
        return;
      }

      alert('Please check your email for a verification link!');
      setLoading(false);

    } catch (error) {
      console.error('Error:', error);
      alert('Error creating account');
      setLoading(false);
    }
  };

  // Handle sign-out
  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Error signing out:', error);
      }
    } catch (error) {
      console.error('Error during sign out:', error);
    } finally {
      setUser(null);
      setUserName('');
      setUserConnections([]);
      setUserActivities([]);
      setActivities([]);
      setSelectedConnection(null);
      setSelectedActivityConnection(null);
      setShowAddConnectionModal(false);
      setShowActivitiesModal(false);
      setShowFrequencyModal(false);
      sessionStorage.removeItem('hasVisited');
      setCurrentPage('home');
    }
  };
  // ============================================================================
// PART 5: UI COMPONENTS AND MAIN RENDER
// ============================================================================

  // Component: Loading Screen
  const LoadingScreen = () => (
    <div className="min-h-screen bg-gradient-to-br from-pink-100 via-purple-50 to-blue-100 flex items-center justify-center relative overflow-hidden">
      <div className="absolute inset-0">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="absolute animate-pulse"
            style={{
              left: `${20 + i * 15}%`,
              top: `${10 + (i % 3) * 30}%`,
              animationDelay: `${i * 0.5}s`,
              animationDuration: '2s'
            }}
          >
            <Heart className="w-6 h-6 text-pink-300 fill-pink-300 opacity-40" />
          </div>
        ))}
      </div>

      <div className="text-center z-10">
        <div className="relative mb-8">
          <div className="w-32 h-32 bg-gradient-to-br from-pink-400 to-pink-600 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce shadow-2xl">
            <Heart className="w-16 h-16 text-white fill-white animate-pulse" />
          </div>
        </div>

        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-800 mb-4 animate-pulse">
            Creating Your Connection Journey...
          </h2>
          <p className="text-lg text-gray-600 animate-pulse">
            Preparing personalized nudges for your {selectedConnection?.title?.toLowerCase()}
          </p>
        </div>

        <div className="w-80 mx-auto">
          <div className="bg-white bg-opacity-50 rounded-full h-3 mb-4 overflow-hidden shadow-inner">
            <div 
              className="h-full bg-gradient-to-r from-pink-400 via-purple-400 to-blue-400 rounded-full animate-pulse"
              style={{
                animation: 'loading 2s ease-in-out infinite',
                width: '85%'
              }}
            ></div>
          </div>
        </div>
      </div>
      
      <style jsx>{`
        @keyframes jump {
          0%, 100% { transform: translateY(0px); }
          25% { transform: translateY(-8px); }
          50% { transform: translateY(-15px); }
          75% { transform: translateY(-8px); }
        }
        
        .animate-jump {
          animation: jump 1.5s ease-in-out infinite;
        }
        
        @keyframes ring {
          0%, 100% { transform: rotate(0deg); }
          10% { transform: rotate(-15deg); }
          20% { transform: rotate(15deg); }
          30% { transform: rotate(-10deg); }
          40% { transform: rotate(10deg); }
          50% { transform: rotate(-5deg); }
          60% { transform: rotate(5deg); }
          70% { transform: rotate(0deg); }
        }
        
        .animate-ring {
          animation: ring 2s ease-in-out infinite;
        }
        
        @keyframes grow {
          0% { transform: scale(1); }
          25% { transform: scale(1.1) rotateZ(2deg); }
          50% { transform: scale(1.2) rotateZ(-2deg); }
          75% { transform: scale(1.1) rotateZ(1deg); }
          100% { transform: scale(1); }
        }
        
        .animate-grow {
          animation: grow 2.5s ease-in-out infinite;
        }
      `}</style>
    </div>
  );

  // Component: Frequency Modal
  const FrequencyModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl relative mx-4">
        <button
          onClick={() => setShowFrequencyModal(false)}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 z-10 bg-white rounded-full p-1 shadow-md hover:shadow-lg transition-all"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center mb-6">
          <h3 className="text-2xl font-bold text-gray-900 mb-2">
            Choose Your Connection Frequency
          </h3>
        </div>

        <div className="space-y-2">
          {frequencies.map((freq) => (
            <button
              key={freq.id}
              onClick={() => handleFrequencySelect(freq)}
              className={`w-full p-3 rounded-xl border-2 transition-all duration-200 text-left hover:scale-105 ${
                selectedFrequency?.id === freq.id
                  ? `${freq.selectedBg} ${freq.selectedBorder}`
                  : `${freq.bgColor} ${freq.borderColor} hover:${freq.selectedBg}`
              }`}
            >
              <div className="flex justify-between items-center">
                <div>
                  <h4 className="font-semibold text-gray-900 mb-1">
                    {freq.title}
                  </h4>
                  <p className="text-sm text-gray-600">{freq.description}</p>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium text-gray-700">
                    {freq.time}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  // Component: Add Connection Modal
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
          <h3 className="text-2xl font-bold text-gray-900 mb-2">
            Add New Connection
          </h3>
          <p className="text-gray-600">
            Choose someone you'd like to strengthen your relationship with
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {connections.map((connection, index) => (
            <button 
              key={index}
              onClick={() => handleAddConnection(connection)}
              className="bg-gray-50 rounded-2xl p-6 shadow-lg border border-gray-200 hover:shadow-xl hover:scale-105 transition-all duration-200 text-center"
            >
              <div className="text-4xl mb-3">{connection.emoji}</div>
              <h3 className="font-semibold text-gray-900 mb-2">{connection.title}</h3>
              <p className="text-sm text-gray-600">{connection.description}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  // Component: Activities Modal
  const ActivitiesModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl p-4 sm:p-8 max-w-xs sm:max-w-2xl w-full shadow-2xl relative max-h-[80vh] overflow-y-auto" style={{ minWidth: '320px' }}>
        <button
          onClick={() => setShowActivitiesModal(false)}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
        >
          <X className="w-6 h-6" />
        </button>

        <div className="text-center mb-4 sm:mb-8">
          <div className="text-3xl sm:text-4xl mb-2 sm:mb-3">{selectedActivityConnection?.emoji}</div>
          <h3 className="text-lg sm:text-2xl font-bold text-gray-900 mb-1 sm:mb-2">
            Activities for {selectedActivityConnection?.title}
          </h3>
          <p className="text-xs sm:text-sm text-gray-600">
            Choose activities to strengthen your connection
          </p>
        </div>

        <div className="space-y-3 sm:space-y-4">
          {activities.map((activity) => (
            <div 
              key={activity.id}
              className={`p-3 sm:p-6 rounded-xl sm:rounded-2xl border-2 transition-all duration-200 text-sm sm:text-base ${
                activity.status === 'completed' 
                  ? 'bg-green-50 border-green-200' 
                  : activity.status === 'skipped'
                  ? 'bg-gray-100 border-gray-300 opacity-60'
                  : activity.status === 'paused'
                  ? 'bg-yellow-50 border-yellow-200'
                  : 'bg-gray-50 border-gray-200'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900 mb-2">
                    {activity.title}
                  </h4>
                  <p className="text-sm text-gray-600 mb-4">
                    {activity.description}
                  </p>
                </div>
                {activity.status === 'completed' && (
                  <div className="text-green-500 ml-4">
                    <Star className="w-6 h-6 fill-current" />
                  </div>
                )}
                {activity.status === 'skipped' && (
                  <div className="text-gray-500 ml-4">
                    <span className="text-sm font-medium">Skipped</span>
                  </div>
                )}
                {activity.status === 'paused' && (
                  <div className="text-yellow-500 ml-4">
                    <Pause className="w-5 h-5" />
                  </div>
                )}
              </div>
              {activity.status === 'active' && (
                <div className="flex gap-3">
                  <button
                    onClick={() => handleCompleteActivity(activity.id)}
                    className="flex-1 bg-pink-500 hover:bg-pink-600 text-white font-medium py-2 px-4 rounded-xl transition-colors"
                  >
                    Complete
                  </button>
                  <button
                    onClick={() => handleSkipActivity(activity.id)}
                    className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium py-2 px-4 rounded-xl transition-colors"
                  >
                    Skip
                  </button>
                </div>
              )}
              {activity.status === 'skipped' && (
                <div className="flex gap-3">
                  <button
                    onClick={() => handleUndoSkipActivity(activity.id)}
                    className="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-xl transition-colors"
                  >
                    Undo Skip
                  </button>
                </div>
              )}
              {activity.status === 'paused' && (
                <div className="text-center text-yellow-600 py-2">
                  <span className="text-sm font-medium">Activity is paused</span>
                </div>
              )}
              {activity.status === 'completed' && activity.completed_at && (
                <div className="text-center text-green-600 py-2">
                  <span className="text-xs">
                    Completed: {new Date(activity.completed_at).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>
          ))}
          {activities.length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-500 mb-4">All activities completed!</p>
              <button
                onClick={() => {
                  if (selectedActivityConnection && user?.id) {
                    createActivitiesForConnection(selectedActivityConnection.id, selectedActivityConnection.title, user.id);
                  }
                }}
                className="bg-pink-500 hover:bg-pink-600 text-white font-medium py-2 px-6 rounded-xl transition-colors"
              >
                Get More Activities
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // Component: Dashboard Header
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
          className={`text-gray-600 hover:text-pink-600 transition-colors px-4 py-2 ${
            currentPage === 'dashboard' ? 'text-pink-600 font-medium' : ''
          }`}
        >
          🏠 Home
        </button>
        <button 
          onClick={() => setCurrentPage('account')}
          className={`text-gray-600 hover:text-pink-600 transition-colors px-4 py-2 ${
            currentPage === 'account' ? 'text-pink-600 font-medium' : ''
          }`}
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

  // ============================================================================
  // MAIN RENDER LOGIC
  // ============================================================================

  // Show loading screen
  if (showLoading) {
    return <LoadingScreen />;
  }

  // Sign-in/Sign-up page
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

          <div className="bg-white rounded-3xl p-8 shadow-2xl border border-gray-200">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Join TinyNudge! 🎉
              </h2>
              <p className="text-gray-600">Start building stronger relationships today</p>
            </div>

            <div>
              <div id="google-signin-button" style={{ display: 'block' }}></div>
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
                {loading ? 'Loading...' : 'Continue with Google 🚀'}
              </button>
            </div>

            <form 
              onSubmit={(e) => {
                e.preventDefault();
                console.log('Form submitted with:', {
                  email: signupEmail,
                  password: signupPassword,
                  confirmPassword: signupConfirmPassword
                });
                handleEmailSignUp();
              }} 
              className="space-y-4"
            >
              <div>
                <label htmlFor="signup-email" className="block text-sm font-medium text-gray-900 mb-2">
                  Email Address ✉️
                </label>
                <input
                  id="signup-email"
                  type="email"
                  value={signupEmail}
                  onChange={(e) => setSignupEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                  autoComplete="email"
                  className="w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                />
              </div>

              <div>
                <label htmlFor="signup-password" className="block text-sm font-medium text-gray-900 mb-2">
                  Password 🔒
                </label>
                <div className="relative">
                  <input
                    id="signup-password"
                    type={showPassword ? "text" : "password"}
                    value={signupPassword}
                    onChange={(e) => setSignupPassword(e.target.value)}
                    placeholder="Enter your password"
                    required
                    minLength={6}
                    autoComplete="new-password"
                    className="w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 pr-12 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div>
                <label htmlFor="signup-confirm-password" className="block text-sm font-medium text-gray-900 mb-2">
                  Confirm Password 🔒
                </label>
                <div className="relative">
                  <input
                    id="signup-confirm-password"
                    type={showConfirmPassword ? "text" : "password"}
                    value={signupConfirmPassword}
                    onChange={(e) => setSignupConfirmPassword(e.target.value)}
                    placeholder="Confirm your password"
                    required
                    minLength={6}
                    autoComplete="new-password"
                    className="w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 pr-12 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-pink-500 hover:bg-pink-600 text-white font-medium py-3 px-4 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? 'Loading...' : 'Create Account 🚀'}
              </button>
            </form>

            <div className="text-center mt-6">
              <p className="text-gray-600">
                Already have an account?{' '}
                <button 
                  onClick={handleEmailSignIn}
                  className="text-pink-500 hover:text-pink-600 font-medium"
                >
                  Sign in 👋
                </button>
              </p>
            </div>
          </div>

          <div className="text-center mt-8">
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

  // Dashboard page
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
              <p className="text-gray-600 text-lg mb-8">
                Keep building stronger relationships with personalized activities ✨
              </p>
              
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-2xl font-semibold text-gray-900">Your Connections</h2>
                <button 
                  onClick={() => setShowAddConnectionModal(true)}
                  className="bg-pink-500 hover:bg-pink-600 text-white font-medium py-3 px-6 rounded-xl transition-colors flex items-center gap-2"
                >
                  <Plus className="w-5 h-5" />
                  Add Connection
                </button>
              </div>

              {userConnections.length === 0 ? (
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
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {userConnections.map((connection) => {
                    const connectionActivities = getActivitiesForConnection(userActivities, connection.id);
                    const completedCount = connectionActivities.filter(activity => activity.status === 'completed').length;
                    const totalCount = connectionActivities.length;
                    const completionPercentage = totalCount ? Math.round((completedCount / totalCount) * 100) : 0;
                    
                    return (
                      <div 
                        key={connection.id} 
                        className="bg-white rounded-2xl p-6 shadow-lg border border-gray-200 hover:shadow-xl transition-all duration-200"
                      >
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center">
                            <div className="text-3xl mr-3">{connection.emoji}</div>
                            <div>
                              <h3 className="font-semibold text-gray-900 text-lg">{connection.title}</h3>
                              <p className="text-sm text-gray-600">{connection.frequency}</p>
                            </div>
                          </div>
                          {connection.isPaused && (
                            <div className="bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full text-xs font-medium">
                              Paused
                            </div>
                          )}
                        </div>

                        <div className="mb-4">
                          <div className="flex justify-between text-sm text-gray-600 mb-2">
                            <span>Progress</span>
                            <span>{completionPercentage}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-3">
                            <div 
                              className="bg-pink-500 h-3 rounded-full transition-all duration-300"
                              style={{ width: `${completionPercentage}%` }}
                            ></div>
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {completedCount} of {totalCount} activities completed
                          </div>
                        </div>

                        <div className="space-y-3">
                          <button
                            onClick={() => handleViewActivities(connection)}
                            className="w-full bg-pink-500 hover:bg-pink-600 text-white font-medium py-2 px-4 rounded-xl transition-colors"
                          >
                            View Activities
                          </button>
                          
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleTogglePause(connection.id)}
                              className={`flex-1 font-medium py-2 px-4 rounded-xl transition-colors flex items-center justify-center gap-2 ${
                                connection.isPaused 
                                  ? 'bg-green-100 hover:bg-green-200 text-green-700' 
                                  : 'bg-yellow-100 hover:bg-yellow-200 text-yellow-700'
                              }`}
                            >
                              {connection.isPaused ? (
                                <>
                                  <Play className="w-4 h-4" />
                                  Resume
                                </>
                              ) : (
                                <>
                                  <Pause className="w-4 h-4" />
                                  Pause
                                </>
                              )}
                            </button>
                            
                            <button
                              onClick={() => handleDeleteConnection(connection.id)}
                              className="flex-1 bg-red-100 hover:bg-red-200 text-red-700 font-medium py-2 px-4 rounded-xl transition-colors flex items-center justify-center gap-2"
                            >
                              <Trash2 className="w-4 h-4" />
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
        {showAddConnectionModal && <AddConnectionModal />}
        {showActivitiesModal && <ActivitiesModal />}
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
                        <label className="block text-sm font-medium text-gray-900 mb-2">
                          Display Name
                        </label>
                        <input
                          type="text"
                          value={userName}
                          onChange={(e) => setUserName(e.target.value)}
                          className="w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                        />
                      </div>
                      
                      <div>
                        <label className="
                        block text-sm font-medium text-gray-900 mb-2">
                          Email Address
                        </label>
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
                        <label className="block text-sm font-medium text-gray-900 mb-2">
                          Default Notification Time
                        </label>
                        <select className="w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent">
                          <option>9:00 AM</option>
                          <option>12:00 PM</option>
                          <option>6:00 PM</option>
                          <option>8:00 PM</option>
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-900 mb-4">
                          Email Notifications
                        </label>
                        <div className="space-y-3">
                          <label className="flex items-center">
                            <input type="checkbox" defaultChecked className="mr-3 h-4 w-4 text-pink-500 focus:ring-pink-500 border-gray-300 rounded" />
                            <span className="text-gray-700">Daily activity reminders</span>
                          </label>
                          <label className="flex items-center">
                            <input type="checkbox" defaultChecked className="mr-3 h-4 w-4 text-pink-500 focus:ring-pink-500 border-gray-300 rounded" />
                            <span className="text-gray-700">Weekly progress updates</span>
                          </label>
                          <label className="flex items-center">
                            <input type="checkbox" className="mr-3 h-4 w-4 text-pink-500 focus:ring-pink-500 border-gray-300 rounded" />
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
                        <div className="text-2xl font-bold text-pink-600">{userConnections.length}</div>
                        <div className="text-sm text-pink-700">Active Connections</div>
                      </div>
                      
                      <div className="text-center p-4 bg-blue-50 rounded-xl">
                        <div className="text-2xl font-bold text-blue-600">
                          {userConnections.reduce((sum, conn) => sum + (conn.activitiesCompleted || 0), 0)}
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
      </>
    );
  }

  // Home page (default)
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
            onClick={() => setCurrentPage('signin')}
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
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Choose Your Connection
            </h2>            
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 px-4">
            {connections.map((connection, index) => (
              <button 
                key={index}
                onClick={() => handleConnectionSelect(connection)}
                className="bg-white rounded-2xl p-6 shadow-lg border border-gray-200 hover:shadow-xl hover:scale-105 transition-all duration-200 text-center"
              >
                <div className="text-4xl mb-3">{connection.emoji}</div>
                <h3 className="font-semibold text-gray-900 mb-2">{connection.title}</h3>
                <p className="text-sm text-gray-600">{connection.description}</p>
              </button>
            ))}
          </div>
        </div>
      </main>

      <section id="about" className="bg-white py-20">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">How TinyNudge Works</h2>
            <p className="text-gray-600 text-lg">Simple steps to stronger relationships</p>
          </div>

          <div className="mb-16">
            <div className="bg-white rounded-3xl p-8 shadow-2xl border border-gray-200 max-w-xl mx-auto">
              <div className="aspect-video bg-gray-100 rounded-2xl overflow-hidden shadow-inner mb-6">
                <video 
                  className="w-full h-full object-cover"
                  controls
                  poster="/path-to-your-video-thumbnail.jpg"
                >
                  <source src="/path-to-your-video.mp4" type="video/mp4" />
                  <source src="/path-to-your-video.webm" type="video/webm" />
                  Your browser does not support the video tag.
                </video>
              </div>
              <div className="text-center">
                <h3 className="text-2xl font-bold text-gray-900 mb-3">See TinyNudge in Action</h3>
                <p className="text-gray-600 text-lg">
                  Watch how easy it is to strengthen your relationships with just a few taps
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center group hover:scale-105 transition-transform duration-300">
              <div className="relative mb-4">
                <div className="text-6xl mb-2 animate-bounce">🤝</div>
                <div className="absolute -top-2 -right-2 text-3xl font-bold text-pink-500 bg-white rounded-full w-12 h-12 flex items-center justify-center shadow-lg animate-jump">1</div>
              </div>
              <h4 className="font-semibold text-gray-900 mb-2 group-hover:text-pink-600 transition-colors">Connect</h4>
              <p className="text-gray-600">Add the people who matter most to you</p>
            </div>
            <div className="text-center group hover:scale-105 transition-transform duration-300">
              <div className="relative mb-4">
                <div className="text-6xl mb-2 animate-ring">🔔</div>
                <div className="absolute -top-2 -right-2 text-3xl font-bold text-pink-500 bg-white rounded-full w-12 h-12 flex items-center justify-center shadow-lg animate-jump">2</div>
              </div>
              <h4 className="font-semibold text-gray-900 mb-2 group-hover:text-pink-600 transition-colors">Nudge</h4>
              <p className="text-gray-600">Get personalized activity suggestions</p>
            </div>
            <div className="text-center group hover:scale-105 transition-transform duration-300">
              <div className="relative mb-4">
                <div className="text-6xl mb-2 animate-grow">🌱</div>
                <div className="absolute -top-2 -right-2 text-3xl font-bold text-pink-500 bg-white rounded-full w-12 h-12 flex items-center justify-center shadow-lg animate-jump">3</div>
              </div>
              <h4 className="font-semibold text-gray-900 mb-2 group-hover:text-pink-600 transition-colors">Grow</h4>
              <p className="text-gray-600">Watch your relationships flourish</p>
            </div>
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
                <li className="flex items-center">
                  <div className="w-2 h-2 bg-gray-700 rounded-full mr-3"></div>
                  <span className="text-gray-700">5 nudges per month</span>
                </li>
                <li className="flex items-center">
                  <div className="w-2 h-2 bg-gray-700 rounded-full mr-3"></div>
                  <span className="text-gray-700">2 connections at a time</span>
                </li>
                <li className="flex items-center">
                  <div className="w-2 h-2 bg-gray-700 rounded-full mr-3"></div>
                  <span className="text-gray-700">Basic dashboard</span>
                </li>
                <li className="flex items-center">
                  <div className="w-2 h-2 bg-gray-700 rounded-full mr-3"></div>
                  <span className="text-gray-700">Weekly Reminders</span>
                </li>
              </ul>
              
              <button 
                onClick={() => setCurrentPage('signin')}
                className="w-full bg-gray-600 hover:bg-gray-700 text-white font-medium py-3 px-6 rounded-xl transition-colors"
              >
                Get Started
              </button>
            </div>
            
            <div className="bg-white rounded-2xl p-8 shadow-lg border-2 border-pink-500 relative">
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <div className="bg-pink-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                  Most Popular
                </div>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Premium</h3>
              <div className="flex items-baseline mb-4">
                <span className="text-4xl font-bold text-gray-900">$3.3</span>
                <span className="text-gray-600 ml-1">/month</span>
              </div>
              <p className="text-gray-600 mb-6">Everything you need for stronger connections</p>
              
              <ul className="space-y-3 mb-8">
                <li className="flex items-center">
                  <div className="w-2 h-2 bg-pink-500 rounded-full mr-3"></div>
                  <span className="text-gray-700">100 nudges per month</span>
                </li>
                <li className="flex items-center">
                  <div className="w-2 h-2 bg-pink-500 rounded-full mr-3"></div>
                  <span className="text-gray-700">10 connections at a time</span>
                </li>
                <li className="flex items-center">
                  <div className="w-2 h-2 bg-pink-500 rounded-full mr-3"></div>
                  <span className="text-gray-700">Consolidated Dashboard</span>
                </li>
                <li className="flex items-center">
                  <div className="w-2 h-2 bg-pink-500 rounded-full mr-3"></div>
                  <span className="text-gray-700">Daily Reminders</span>
                </li>
              </ul>
              
              <button className="w-full bg-pink-500 hover:bg-pink-600 text-white font-medium py-3 px-6 rounded-xl transition-colors">
                Coming Soon
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
            <p className="text-gray-400">
              One tap a day keeps the distance away
            </p>
            <p className="text-gray-500 text-sm mt-4">
              © 2024 TinyNudge. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
