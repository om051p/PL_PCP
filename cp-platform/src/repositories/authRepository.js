import { firebaseAuthApi } from '../api/firebaseAuthApi.js'
import { mapFirebaseError } from '../config/errorMessages.js'

export const authRepository = {
  /**
   * Log in user and return credentials, wrapping Firebase errors
   * @param {string} email
   * @param {string} password
   */
  async signIn(email, password) {
    try {
      return await firebaseAuthApi.signIn(email, password)
    } catch (err) {
      throw new Error(mapFirebaseError(err), { cause: err })
    }
  },

  /**
   * Register user, send verification, and wrap errors
   * @param {string} email
   * @param {string} password
   */
  async signUp(email, password) {
    try {
      const userCredential = await firebaseAuthApi.signUp(email, password)
      const firebaseUser = userCredential.user
      
      // Send verification immediately
      await firebaseAuthApi.sendVerification(firebaseUser)
      return userCredential
    } catch (err) {
      throw new Error(mapFirebaseError(err), { cause: err })
    }
  },

  /**
   * Sign out current user session
   */
  async signOut() {
    try {
      await firebaseAuthApi.signOut()
    } catch (err) {
      throw new Error(mapFirebaseError(err), { cause: err })
    }
  },

  /**
   * Register auth state change observer
   * @param {function} callback
   */
  onAuthStateChanged(callback) {
    return firebaseAuthApi.onAuthStateChanged(callback)
  },

  /**
   * Request password reset email
   * @param {string} email
   */
  async sendPasswordReset(email) {
    try {
      await firebaseAuthApi.sendPasswordReset(email)
    } catch (err) {
      throw new Error(mapFirebaseError(err), { cause: err })
    }
  },
}
