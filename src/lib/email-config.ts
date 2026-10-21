// Billing emails that Lemon Squeezy can also send itself. Keep these off until
// Lemon Squeezy's own versions are turned off, or customers get both.
// Flip to true (and redeploy) once that's confirmed.
export const SEND_LS_OVERLAP_EMAILS = {
  payment_failed: false,
  subscription_cancelled: false,
};
