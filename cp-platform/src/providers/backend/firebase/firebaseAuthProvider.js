/**
 * FIREBASE AUTH PROVIDER
 *
 * Implements AuthProvider contract using Firebase Authentication SDK.
 * Only this file (and firebase/config.js) import 'firebase/auth'.
 *
 * @implements {import('../contracts/authProvider.js').AuthProvider}
 */

import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as fbSignOut,
  onAuthStateChanged as fbOnAuthStateChanged,
  sendPasswordResetEmail,
  sendEmailVerification,
} from 'firebase/auth'
import { auth } from '../../../firebase/config.js'

export const firebaseAuthProvider = {
  providerId: 'firebase',

  async signIn({ email, password }) {
    if (!auth) throw new Error('Firebase Auth not initialized.')
    const credential = await signInWithEmailAndPassword(auth, email, password)
    const fbUser = credential.user
    return {
      userId: fbUser.uid,
      email: fbUser.email,
      emailVerified: fbUser.emailVerified,
      raw: fbUser,
    }
  },

  async signUp({ email, password }) {
    if (!auth) throw new Error('Firebase Auth not initialized.')
    const credential = await createUserWithEmailAndPassword(auth, email, password)
    const fbUser = credential.user
    // Send verification as part of sign-up
    await sendEmailVerification(fbUser)
    return {
      userId: fbUser.uid,
      email: fbUser.email,
      emailVerified: fbUser.emailVerified,
      raw: fbUser,
    }
  },

  async signOut() {
    if (!auth) return
    return fbSignOut(auth)
  },

  onAuthStateChanged(callback) {
    if (!auth) {
      callback(null)
      return () => {}
    }
    return fbOnAuthStateChanged(auth, (fbUser) => {
      if (fbUser) {
        callback({
          userId: fbUser.uid,
          email: fbUser.email,
          emailVerified: fbUser.emailVerified,
          raw: fbUser,
        })
      } else {
        callback(null)
      }
    })
  },

  async sendPasswordReset(email) {
    if (!auth) throw new Error('Firebase Auth not initialized.')
    return sendPasswordResetEmail(auth, email)
  },

  async sendEmailVerification(session) {
    if (!session?.raw) {
      // Fallback: only works if raw Firebase user was stashed
      throw new Error('Cannot send verification without a live Firebase session.')
    }
    return sendEmailVerification(session.raw)
  },
}
