export type ActivityStatus = 'active' | 'completed' | 'skipped' | 'paused';

export interface User {
  email: string;
  id: string;
  name?: string;
  picture?: string;
}

export interface Connection {
  id: string;
  title: string;
  emoji: string;
  description: string;
  frequency?: string;
  activitiesCompleted?: number;
  totalActivities?: number;
  isPaused?: boolean;
}

export interface Activity {
  id: string;
  connection_id: string;
  title: string;
  description: string;
  status: ActivityStatus;
  created_at?: string;
  completed_at?: string | null;
  user_id: string;
}

export interface Frequency {
  id: string;
  title: string;
  time: string;
  description: string;
  bgColor: string;
  borderColor: string;
  selectedBg: string;
  selectedBorder: string;
}
