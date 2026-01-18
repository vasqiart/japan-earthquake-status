export type PlanKey = 'day' | 'week';

export const PLAN_DURATION_MS: Record<PlanKey, number> = {
  day: 24 * 60 * 60 * 1000,
  week: 7 * 24 * 60 * 60 * 1000,
};

export const ACTIVATION_DEADLINE_DAYS = 30;
