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
import { getFirestore, doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore'
import { auth } from '../firebase/config.js'
import { mapFirebaseError } from '../config/errorMessages.js'
import { validateUserDomain, DOMAIN_RESTRICTION_MESSAGE, DEFAULT_ROLE, DEACTIVATION_MESSAGE } from '../config/authPolicy.js'

/**
 * @typedef {Object} User
 * @property {string} uid
 * @property {string | null} email
 * @property {string | null} displayName
 * @property {string | null} photoURL
 * @property {string} role - User role: 'admin', 'manager', 'engineer', 'reviewer', or 'viewer'
 * @property {boolean} isActive - Whether user account is active
 * @property {boolean} [isSimulation] - Whether this is a simulation account
 */

function mapFirebaseUser(firebaseUser, role = DEFAULT_ROLE, isActive = true, name = '') {
  /** @type {User} */
  return {
    uid: firebaseUser.uid,
    email: firebaseUser.email,
    displayName: name || firebaseUser.displayName || firebaseUser.email?.split('@')[0],
    photoURL: firebaseUser.photoURL,
    role,
    isActive,
  }
}

/**
 * Fetch user profile from Firestore or local simulation fallback.
 */
async function fetchUserProfile(email, uid) {
  if (!email) return null
  
  try {
    const db = getFirestore()
    
    // Wrap Firestore fetch in a 2-second timeout to prevent blocking the UI
    const fetchPromise = getDoc(doc(db, 'users', email.toLowerCase()))
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Firestore request timed out')), 2000)
    )
    
    const userDoc = await Promise.race([fetchPromise, timeoutPromise])
    
    if (userDoc.exists()) {
      const data = userDoc.data()
      return {
        role: data.role || DEFAULT_ROLE,
        isActive: data.active === true || data.isActive === true,
        name: data.name || email.split('@')[0],
      }
    }
  } catch (err) {
    console.warn('[Auth] Firestore fetch failed or timed out, falling back to local registry:', err.message)
  }

  // Fallback to local simulation registry
  const store = useAuthStore.getState()
  const localUser = store?.usersRegistry?.find((u) => u.email.toLowerCase() === email.toLowerCase())
  if (localUser) {
    return {
      role: localUser.role,
      isActive: localUser.active,
      name: localUser.name,
    }
  }
  return null
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

      // Approved User Registry (in memory & localStorage, synced with Firestore)
      usersRegistry: [
        { email: 'admin@ikkgroup.com', name: 'Ahmad Admin', role: 'admin', active: true },
        { email: 'manager@ikkgroup.com', name: 'Mazen Manager', role: 'manager', active: true },
        { email: 'engineer@ikkgroup.com', name: 'Eyad Engineer', role: 'engineer', active: true },
        { email: 'reviewer@ikkgroup.com', name: 'Rayan Reviewer', role: 'reviewer', active: true },
        { email: 'inactive@ikkgroup.com', name: 'Imad Inactive', role: 'engineer', active: false },
      ],

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
            try { await signOut(auth) } catch {}
            set((state) => {
              state.user = null
              state.loading = false
              state.error = reason || DOMAIN_RESTRICTION_MESSAGE
            })
            throw new Error(reason || DOMAIN_RESTRICTION_MESSAGE)
          }

          // Fetch user profile from approved registry
          const profile = await fetchUserProfile(userCredential.user.email, userCredential.user.uid)
          if (!profile) {
            try { await signOut(auth) } catch {}
            const errMessage = 'Access Denied. You are not in the approved users list.'
            set((state) => {
              state.user = null
              state.loading = false
              state.error = errMessage
            })
            throw new Error(errMessage)
          }

          const { role, isActive, name } = profile
          if (!isActive) {
            try { await signOut(auth) } catch {}
            set((state) => {
              state.user = null
              state.loading = false
              state.error = DEACTIVATION_MESSAGE
            })
            throw new Error(DEACTIVATION_MESSAGE)
          }

          const user = mapFirebaseUser(userCredential.user, role, isActive, name)
          set((state) => {
            state.user = user
            state.loading = false
            state.error = null
          })
          return user
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Login failed'
          set((state) => {
            state.loading = false
            state.error = message
          })
          throw err
        }
      },

      simulationLogin: async (email) => {
        set((state) => {
          state.loading = true
          state.error = null
        })
        try {
          const registeredUser = get().usersRegistry.find((u) => u.email.toLowerCase() === email.toLowerCase())
          if (!registeredUser) {
            throw new Error('Access Denied. You are not in the approved users list.')
          }
          if (!registeredUser.active) {
            throw new Error(DEACTIVATION_MESSAGE)
          }
          const user = {
            uid: `sim-${registeredUser.role}-${registeredUser.email}`,
            email: registeredUser.email,
            displayName: registeredUser.name,
            photoURL: null,
            role: registeredUser.role,
            isActive: registeredUser.active,
            isSimulation: true,
          }
          set((state) => {
            state.user = user
            state.loading = false
            state.error = null
          })
          return user
        } catch (err) {
          set((state) => {
            state.loading = false
            state.error = err.message
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

          // Check if email exists in the approved users registry first
          const profile = await fetchUserProfile(email, '')
          if (!profile) {
            const errMessage = 'Access Denied. You are not in the approved users list.'
            set((state) => {
              state.loading = false
              state.error = errMessage
            })
            throw new Error(errMessage)
          }

          const userCredential = await createUserWithEmailAndPassword(auth, email, password).catch((err) => {
            throw new Error(mapFirebaseError(err))
          })

          // Update/Set user profile in Firestore
          try {
            const db = getFirestore()
            await setDoc(doc(db, 'users', email.toLowerCase()), {
              email: email,
              role: profile.role,
              active: profile.isActive,
              name: profile.name,
              uid: userCredential.user.uid,
              createdAt: new Date().toISOString(),
            }, { merge: true })
          } catch (firestoreErr) {
            console.warn('[Auth] Could not update user profile in Firestore:', firestoreErr.message)
          }

          const user = mapFirebaseUser(userCredential.user, profile.role, profile.isActive, profile.name)
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
        set((state) => {
          state.loading = true
        })
        try {
          if (auth) {
            await signOut(auth)
          }
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

      // Admin Approved Users Management Actions
      addUserRegistry: async (newUser) => {
        set((state) => {
          const exists = state.usersRegistry.some((u) => u.email.toLowerCase() === newUser.email.toLowerCase())
          if (exists) return
          state.usersRegistry.push(newUser)
        })
        
        try {
          const db = getFirestore()
          await setDoc(doc(db, 'users', newUser.email.toLowerCase()), {
            email: newUser.email,
            name: newUser.name,
            role: newUser.role,
            active: newUser.active,
            createdAt: new Date().toISOString(),
          })
        } catch (err) {
          console.warn('[Auth] Could not write user to Firestore:', err.message)
        }
      },

      updateUserRegistry: async (email, fields) => {
        set((state) => {
          const user = state.usersRegistry.find((u) => u.email.toLowerCase() === email.toLowerCase())
          if (user) {
            Object.assign(user, fields)
            if (state.user && state.user.email.toLowerCase() === email.toLowerCase()) {
              if (fields.active === false) {
                state.user = null
                state.error = DEACTIVATION_MESSAGE
              } else {
                if (fields.role) state.user.role = fields.role
                if (fields.name) state.user.displayName = fields.name
              }
            }
          }
        })

        try {
          const db = getFirestore()
          const docRef = doc(db, 'users', email.toLowerCase())
          const updateData = {}
          if (fields.name !== undefined) updateData.name = fields.name
          if (fields.role !== undefined) updateData.role = fields.role
          if (fields.active !== undefined) updateData.active = fields.active
          updateData.modifiedAt = new Date().toISOString()
          updateData.modifiedBy = get().user?.email || 'system'
          
          await setDoc(docRef, updateData, { merge: true })
        } catch (err) {
          console.warn('[Auth] Could not update user in Firestore:', err.message)
        }
      },

      deleteUserRegistry: async (email) => {
        set((state) => {
          state.usersRegistry = state.usersRegistry.filter((u) => u.email.toLowerCase() !== email.toLowerCase())
          if (state.user && state.user.email.toLowerCase() === email.toLowerCase()) {
            state.user = null
          }
        })

        try {
          const db = getFirestore()
          await deleteDoc(doc(db, 'users', email.toLowerCase()))
        } catch (err) {
          console.warn('[Auth] Could not delete user from Firestore:', err.message)
        }
      },

      initialize: () => {
        if (get().initialized) return () => {}

        if (!auth) {
          set((state) => {
            state.initialized = true
            state.loading = false
          })
          return () => {}
        }

        // Add a safety timeout: if Firebase auth hangs or fails to resolve within 3 seconds,
        // force loading to false so that the login page becomes accessible.
        const timeoutId = setTimeout(() => {
          if (get().loading) {
            console.warn('[Auth] Firebase initialization timed out. Forcing loading state to false.');
            set((state) => {
              state.loading = false
            })
          }
        }, 3000)

        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
          clearTimeout(timeoutId)
          if (firebaseUser) {
            const tempUser = mapFirebaseUser(firebaseUser)
            const { allowed, reason } = validateUserDomain(tempUser)
            if (!allowed) {
              try { await signOut(auth) } catch {}
              set((state) => {
                state.user = null
                state.loading = false
                state.error = reason || DOMAIN_RESTRICTION_MESSAGE
              })
              return
            }

            const profile = await fetchUserProfile(firebaseUser.email, firebaseUser.uid)
            if (!profile) {
              try { await signOut(auth) } catch {}
              set((state) => {
                state.user = null
                state.loading = false
                state.error = 'Access Denied. You are not in the approved users list.'
              })
              return
            }

            if (!profile.isActive) {
              try { await signOut(auth) } catch {}
              set((state) => {
                state.user = null
                state.loading = false
                state.error = DEACTIVATION_MESSAGE
              })
              return
            }

            get().setUser(mapFirebaseUser(firebaseUser, profile.role, profile.isActive, profile.name))
          } else {
            // Keep simulation user active
            const currentUser = get().user
            if (currentUser && currentUser.isSimulation) {
              set((state) => {
                state.loading = false
              })
            } else {
              get().setUser(null)
            }
          }
        })

        set((state) => {
          state.initialized = true
        })

        return () => {
          clearTimeout(timeoutId)
          unsubscribe()
        }
      },
    })),
    {
      name: 'cp-platform-auth',
      version: 1,
      partialize: (state) => ({
        user: state.user,
        usersRegistry: state.usersRegistry,
      }),
    },
  ),
)

export const getAuthActions = () => useAuthStore.getState()
