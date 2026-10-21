// Plain-language messages for Firebase Auth errors, so people never see raw codes.
// Returns null for errors we don't have wording for (callers keep their own fallback).

export function friendlyAuthMessage(error: unknown): string | null {
  const code = (error as { code?: string } | null)?.code ?? '';
  switch (code) {
    case 'auth/account-exists-with-different-credential':
      return 'An account already exists for this email, created with a different sign-in method. Sign in the way you did before, then add this method under Account → Sign-in methods so it works everywhere.';
    case 'auth/email-already-in-use':
      return 'An account with this email already exists. Try signing in instead. If you signed up with Google or Apple, use that button.';
    case 'auth/invalid-credential':
    case 'auth/invalid-login-credentials':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return "That email or password doesn't look right. If you signed up with Google or Apple, use that button, or tap \"Forgot password?\".";
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/weak-password':
      return 'Please choose a stronger password (at least 6 characters).';
    case 'auth/too-many-requests':
      return 'Too many attempts. Please wait a few minutes and try again.';
    case 'auth/network-request-failed':
      return "Can't reach the network. Check your connection and try again.";
    case 'auth/user-disabled':
      return 'This account has been disabled. Please contact support.';
    default:
      return null;
  }
}
