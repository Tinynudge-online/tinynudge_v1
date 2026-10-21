// Copy of src/lib/loops-transactional.ts (Cloud Functions cannot import from src/). Keep in sync.
// Loops transactional email IDs for account & billing emails (not secret).
// Loops is the source of truth for these templates; edit their content in Loops.
// Data variables: every template takes firstName; payment_failed also takes
// updatePaymentUrl; subscription_cancelled also takes accessEndsDate.
export const LOOPS_TRANSACTIONAL_IDS = {
  trial_ended: 'cmv3ds5kc0hj10jxbh08uqe05',
  premium_started: 'cmv3ds9q40hza0jwuzalyine7',
  payment_failed: 'cmv3dse8v0fcb0jx9j4or9lgr',
  payment_recovered: 'cmv3dshn50hvr0j08v26fjfi8',
  subscription_cancelled: 'cmv3dstg70hjk0jxbx35ghwmk',
  subscription_resumed: 'cmv3dsxtc0hjs0jxbbp7sz9s3',
  subscription_expired: 'cmv3dt8370hta0jyc07zf915f',
} as const;

export type LoopsTransactionalKey = keyof typeof LOOPS_TRANSACTIONAL_IDS;
