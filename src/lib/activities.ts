import { Activity, ActivityStatus, Connection, User } from '../types';
import { supabase } from '../lib/supabase';

// Activity management
export const updateActivityStatus = async (activityId: string, status: ActivityStatus, userId: string) => {
  const updateData: any = { status };
  
  // Set completed_at only when completing an activity
  if (status === 'completed') {
    updateData.completed_at = new Date().toISOString();
  } else if (status === 'active' || status === 'skipped' || status === 'paused') {
    // Clear completed_at for non-completed statuses
    updateData.completed_at = null;
  }

  console.log(`Updating activity ${activityId} to status: ${status}`);

  const { data, error } = await supabase
    .from('user_activities')
    .update(updateData)
    .eq('id', activityId)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) {
    console.error('Error updating activity status:', error);
    throw error;
  }

  return data;
};
export const getActivitiesForConnection = (activities: Activity[], connectionId: string): Activity[] => {
  return activities.filter(activity => activity.connection_id === connectionId);
};

// Connection management
export const loadUserConnections = async (userId: string) => {
  const { data, error } = await supabase
    .from('user_connections')
    .select('*')
    .eq('user_id', userId);
    
  if (error) {
    console.error('Error loading connections:', error);
    return [];
  }
  
  if (Array.isArray(data)) {
    return data.map(row => ({
      id: row.id.toString(),
      title: row.title,
      emoji: row.emoji,
      description: row.description,
      frequency: row.frequency,
      activitiesCompleted: row.activities_completed || 0,
      totalActivities: row.total_activities || 5,
      isPaused: row.is_paused || false
    }));
  }

  return [];
};

export const loadUserActivities = async (userId: string) => {
  const { data, error } = await supabase
    .from('user_activities')
    .select('*')
    .eq('user_id', userId);
  
  if (error) {
    console.error('Error loading activities:', error);
    return [];
  }
  
if (Array.isArray(data)) {
  const normalized = data.map((row: any) => ({
    id: row.id.toString(),
    connection_id: row.connection_id !== undefined && row.connection_id !== null ? row.connection_id.toString() : '',
    title: row.title,
    description: row.description,
    status: row.status,
    created_at: row.created_at,
    completed_at: row.completed_at === null ? undefined : row.completed_at,
    user_id: row.user_id
  }));
  return normalized;
}

  return [];
};
