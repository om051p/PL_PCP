import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
} from 'firebase/auth'
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore'
import { auth } from '../firebase/config.js'
import { mapFirebaseError } from '../config/errorMessages.js'
import { validateUserDomain, DOMAIN_RESTRICTION_MESSAGE, DEFAULT_ROLE, DEACTIVATION_MESSAGE } from '../config/authPolicy.js'

/**
 * @typedef {Object} User
 * @property {string} uid
 * @property {string | null} email
 * @property {string | null} displayName
 * @property {string | null} photoURL
 * @property {string} role - User role: 'admin', 'engineer', or 'viewer'
 * @property {boolean} isActive - Whether user account is active
 */

function mapFirebaseUser(firebaseUser, role = DEFAULT_ROLE, isActive = true) {
  /** @type {User} */
  return {
    uid: firebaseUser.uid,
    email: firebaseUser.email,
    displayName: firebaseUser.displayName,
    photoURL: firebaseUser.photoURL,
    role,
    isActive,
  }
}

/**
 * Fetch user profile from Firestore to get role and active status.
 * Falls back to defaults if document doesn't exist or Firestore not configured.
 */
async function fetchUserProfile(uid) {
  try {
    const db = getFirestore()
    const userDoc = await getDoc(doc(db, 'users', uid))
    if (userDoc.exists()) {
      const data = userDoc.data()
      return {
        role: data.role || DEFAULT_ROLE,
        isActive: data.isActive !== false,
      }
    }
  } catch (err) {
    // Firestore not configured or document doesn't exist — use defaults
    console.warn('[Auth] Could not fetch user profile:', err.message)
  }
  return { role: DEFAULT_ROLE, isActive: true }
}

export const useAuthStore = create()(
  persist(
    immer((set, get) => ({
      /** @type {User | null} */
      user: null,
      loading: true,
      /** @type {string | null} */
      error: null,
      initialized: false,

      login: async (email, password) => {
        if (!auth) throw new Error('Firebase is not configured. Check your .env file.')
        set((state) => {
          state.loading = true
          state.error = null
        })
        try {
          const userCredential = await signInWithEmailAndPassword(auth, email, password).catch((err) => {
            throw new Error(mapFirebaseError(err))
          })

          // Verify email domain is allowed
          const tempUser = mapFirebaseUser(userCredential.user)
          const { allowed, reason } = validateUserDomain(tempUser)
          if (!allowed) {
            try {
              await signOut(auth)
            } catch {
              // Sign out may fail if offline; still block the user
            }
            set((state) => {
              state.user = null
              state.loading = false
              state.error = reason || DOMAIN_RESTRICTION_MESSAGE
            })
            throw new Error(reason || DOMAIN_RESTRICTION_MESSAGE)
          }

          // Fetch user profile for role and active status
          const { role, isActive } = await fetchUserProfile(userCredential.user.uid)

          if (!isActive) {
            try {
              await signOut(auth)
            } catch {
              // Sign out may fail if offline; still block the user
            }
            set((state) => {
              state.user = null
              state.loading = false
              state.error = DEACTIVATION_MESSAGE
            })
            throw new Error(DEACTIVATION_MESSAGE)
          }

          const user = mapFirebaseUser(userCredential.user, role, isActive)

          set((state) => {
            state.user = user
            state.loading = false
            state.error = null
          })
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Login failed'
          set((state) => {
            state.loading = false
            state.error = message
          })
          throw err
        }
      },

      register: async (email, password) => {
        if (!auth) throw new Error('Firebase is not configured. Check your .env file.')
        set((state) => {
          state.loading = true
          state.error = null
        })
        try {
          // Validate email domain BEFORE creating the Firebase account
          const domainCheck = validateUserDomain({ email })
          if (!domainCheck.allowed) {
            set((state) => {
              state.loading = false
              state.error = domainCheck.reason || DOMAIN_RESTRICTION_MESSAGE
            })
            throw new Error(domainCheck.reason || DOMAIN_RESTRICTION_MESSAGE)
          }

          const userCredential = await createUserWithEmailAndPassword(auth, email, password).catch((err) => {
            throw new Error(mapFirebaseError(err))
          })

          // Create user profile in Firestore with default role
          try {
            const db = getFirestore()
            await setDoc(doc(db, 'users', userCredential.user.uid), {
              email: userCredential.user.email,
              role: DEFAULT_ROLE,
              isActive: true,
              createdAt: new Date().toISOString(),
            })
          } catch (firestoreErr) {
            console.warn('[Auth] Could not create user profile in Firestore:', firestoreErr.message)
            // Account created in Firebase Auth; Firestore profile can be created later
          }

          const user = mapFirebaseUser(userCredential.user, DEFAULT_ROLE, true)

          set((state) => {
            state.user = user
            state.loading = false
            state.error = null
          })
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Registration failed'
          set((state) => {
            state.loading = false
            state.error = message
          })
          throw err
        }
      },

      logout: async () => {
        if (!auth) {
          set((state) => {
            state.user = null
            state.loading = false
          })
          return
        }
        set((state) => {
          state.loading = true
        })
        try {
          await signOut(auth)
          set((state) => {
            state.user = null
            state.loading = false
            state.error = null
          })
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Logout failed'
          set((state) => {
            state.loading = false
            state.error = message
          })
          throw err
        }
      },

      resetPassword: async (email) => {
        if (!auth) throw new Error('Firebase is not configured. Check your .env file.')
        set((state) => {
          state.loading = true
          state.error = null
        })
        try {
          await sendPasswordResetEmail(auth, email).catch((err) => {
            throw new Error(mapFirebaseError(err))
          })
          set((state) => {
            state.loading = false
            state.error = null
          })
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Password reset failed'
          set((state) => {
            state.loading = false
            state.error = message
          })
          throw err
        }
      },

      clearError: () =>
        set((state) => {
          state.error = null
        }),

      setUser: (user) =>
        set((state) => {
          state.user = user
          state.loading = false
        }),

      initialize: () => {
        if (get().initialized) return () => {}

        // If Firebase failed to initialize, mark as initialized without auth
        if (!auth) {
          set((state) => {
            state.initialized = true
            state.loading = false
          })
          return () => {}
        }

        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
          if (firebaseUser) {
            const tempUser = mapFirebaseUser(firebaseUser)

            // Verify email domain on session restore
            const { allowed, reason } = validateUserDomain(tempUser)
            if (!allowed) {
              try {
                await signOut(auth)
              } catch {
                // Sign out may fail if offline; still block the user
              }
              set((state) => {
                state.user = null
                state.loading = false
                state.error = reason || DOMAIN_RESTRICTION_MESSAGE
              })
              return
            }

            // Fetch user profile for role and active status
            const { role, isActive } = await fetchUserProfile(firebaseUser.uid)

            if (!isActive) {
              try {
                await signOut(auth)
              } catch {
                // Sign out may fail if offline; still block the user
              }
              set((state) => {
                state.user = null
                state.loading = false
                state.error = DEACTIVATION_MESSAGE
              })
              return
            }

            get().setUser(mapFirebaseUser(firebaseUser, role, isActive))
          } else {
            get().setUser(null)
          }
        })

        set((state) => {
          state.initialized = true
        })

        return unsubscribe
      },
    })),
    {
      name: 'cp-platform-auth',
      version: 1,
      partialize: (state) => ({
        user: state.user,
      }),
    },
  ),
)

// Use the useAuthStore() hook in components instead of these stale exports
// These are provided only for non-React contexts (e.g., middleware, tests)
export const getAuthActions = () => useAuthStore.getState()
