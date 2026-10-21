// Shared definition of a user's email preferences (stored in user_preferences/{uid}).
// Used by the app, the /api/preferences route, and mirrored in functions/src/index.ts.

export type EmailPreferences = {
  notificationTime: string;
  timezone: string;
  emailDailyReminders: boolean;
  notifyStreakMilestones: boolean;
  emailWeeklyProgress: boolean;
  emailMonthlyInsights: boolean;
  notifyReEngagement: boolean;
};

export const DEFAULT_EMAIL_PREFERENCES: EmailPreferences = {
  notificationTime: '6:00 PM',
  timezone: 'UTC',
  emailDailyReminders: true,
  notifyStreakMilestones: true,
  emailWeeklyProgress: true,
  emailMonthlyInsights: false,
  notifyReEngagement: true,
};

export const NOTIFICATION_TIMES = [
  '7:00 AM', '8:00 AM', '9:00 AM', '12:00 PM',
  '5:00 PM', '6:00 PM', '7:00 PM', '8:00 PM', '9:00 PM',
];

export const STREAK_MILESTONES = [3, 7, 14, 30, 50, 100, 200, 365];

export const BOOLEAN_PREFERENCE_KEYS = [
  'emailDailyReminders',
  'notifyStreakMilestones',
  'emailWeeklyProgress',
  'emailMonthlyInsights',
  'notifyReEngagement',
] as const;
