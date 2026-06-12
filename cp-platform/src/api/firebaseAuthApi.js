import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  sendEmailVerification,
} from 'firebase/auth'
import { auth } from '../firebase/config.js'

export const firebaseAuthApi = {
  /**
   * Log in user with email and password
   * @param {string} email
   * @param {string} password
   */
  async signIn(email, password) {
    if (!auth) throw new Error('Firebase Auth not initialized.')
    return signInWithEmailAndPassword(auth, email, password)
  },

  /**
   * Register a new user with email and password
   * @param {string} email
   * @param {string} password
   */
  async signUp(email, password) {
    if (!auth) throw new Error('Firebase Auth not initialized.')
    return createUserWithEmailAndPassword(auth, email, password)
  },

  /**
   * Sign out the current user
   */
  async signOut() {
    if (!auth) return
    return signOut(auth)
  },

  /**
   * Subscribe to auth state changes
   * @param {function} callback
   */
  onAuthStateChanged(callback) {
    if (!auth) {
      callback(null)
      return () => {}
    }
    return onAuthStateChanged(auth, callback)
  },

  /**
   * Send password reset email
   * @param {string} email
   */
  async sendPasswordReset(email) {
    if (!auth) throw new Error('Firebase Auth not initialized.')
    return sendPasswordResetEmail(auth, email)
  },

  /**
   * Send email verification
   * @param {any} firebaseUser
   */
  async sendVerification(firebaseUser) {
    if (!firebaseUser) throw new Error('No user provided for verification.')
    return sendEmailVerification(firebaseUser)
  },
}
