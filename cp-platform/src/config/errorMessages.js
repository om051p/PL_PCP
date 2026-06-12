/**
 * FIREBASE ERROR MESSAGE MAPPER
 *
 * Maps raw Firebase error codes to user-friendly messages.
 * Prevents implementation details from leaking to users.
 */

const ERROR_MAP = {
  // Auth errors
  'auth/user-not-found': 'Invalid Email or Password\n\nThe email address or password entered is incorrect.\n\nPlease verify your credentials and try again.',
  'auth/wrong-password': 'Invalid Email or Password\n\nThe email address or password entered is incorrect.\n\nPlease verify your credentials and try again.',
  'auth/invalid-email': 'Please enter a valid email address.',
  'auth/user-disabled': 'Account Suspended\n\nYour account has been temporarily disabled.\n\nPlease contact your RAXA administrator.',
  'auth/too-many-requests': 'Account Temporarily Locked\n\nToo many unsuccessful login attempts were detected.\n\nPlease wait and try again later or reset your password.',
  'auth/network-request-failed': 'Connection Error\n\nUnable to contact the authentication service.\n\nCheck your internet connection and try again.',
  'auth/invalid-credential': 'Invalid Email or Password\n\nThe email address or password entered is incorrect.\n\nPlease verify your credentials and try again.',
  'auth/credential-already-in-use': 'This credential is already associated with another account.',
  'auth/email-already-in-use': 'An account with this email already exists.',
  'auth/operation-not-allowed': 'This sign-in method is not enabled.',
  'auth/weak-password': 'Password is too weak. Use at least 6 characters.',
  'auth/requires-recent-login': 'Please sign in again to complete this action.',
  'auth/popup-closed-by-user': 'Sign-in popup was closed. Please try again.',
  'auth/cancelled-popup-request': 'Sign-in was cancelled. Please try again.',

  // Firestore errors
  'permission-denied': 'You do not have permission to perform this action.',
  'not-found': 'The requested resource was not found.',
  'already-exists': 'This resource already exists.',
  'resource-exhausted': 'Too many requests. Please try again later.',
  'failed-precondition': 'Operation failed. Please try again.',
  'aborted': 'Operation was aborted. Please try again.',
  'out-of-range': 'The request is out of range.',
  'unauthenticated': 'Please sign in to continue.',
  'unavailable': 'Service is temporarily unavailable. Please try again.',
  'data-loss': 'An unexpected error occurred. Please contact support.',
}

/**
 * Map a Firebase error to a user-friendly message.
 *
 * @param {Error | string} error - The Firebase error or error message
 * @returns {string} A user-friendly error message
 */
export function mapFirebaseError(error) {
  const raw = error instanceof Error ? error.message : String(error)

  const lowerRaw = raw.toLowerCase()
  if (lowerRaw.includes('timeout') || lowerRaw.includes('unavailable') || lowerRaw.includes('network') || lowerRaw.includes('connect')) {
    return 'Connection Error\n\nUnable to contact the authentication service.\n\nCheck your internet connection and try again.'
  }

  // Try to extract error code from message (e.g., "Firebase: Error (auth/invalid-credential).")
  const codeMatch = raw.match(/\(([^)]+)\)/) || raw.match(/auth\/[\w-]+|[\w-]+\/[\w-]+/)
  if (codeMatch) {
    const code = codeMatch[1] || codeMatch[0]
    if (ERROR_MAP[code]) return ERROR_MAP[code]
  }

  // Check for partial matches
  for (const [code, message] of Object.entries(ERROR_MAP)) {
    if (raw.includes(code)) return message
  }

  // Fallback — don't reveal implementation details
  return 'An unexpected error occurred. Please try again.'
}

/**
 * Map Firebase auth errors specifically.
 *
 * @param {Error | string} error
 * @returns {{ message: string, isDomainError: boolean }}
 */
export function mapAuthError(error) {
  const raw = error instanceof Error ? error.message : String(error)

  if (raw.includes('Access restricted') || raw.includes('domain')) {
    return { message: raw, isDomainError: true }
  }

  if (raw.includes('deactivated')) {
    return { message: raw, isDomainError: false }
  }

  return { message: mapFirebaseError(error), isDomainError: false }
}
