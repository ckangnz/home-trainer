export function errorCode(error: unknown): string {
  return typeof error === 'object' && error !== null && 'code' in error ? String((error as { code: unknown }).code) : ''
}

export function describeAuthError(cause: unknown): string {
  switch (errorCode(cause)) {
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
      return 'Sign-in was canceled. Please try again.'
    case 'auth/network-request-failed':
      return 'Network error during sign-in. Check your connection and try again.'
    case 'auth/unauthorized-domain':
      return 'This domain is not authorized for sign-in yet. Add it in the Firebase console.'
    default:
      return 'Google sign-in failed. Please try again.'
  }
}
