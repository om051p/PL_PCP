import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  sendEmailVerification,
} from 'firebase/auth'
import { getFirestore, doc, getDoc, setDoc, collection, getDocs } from 'firebase/firestore'
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
 * @property {boolean} approved - Whether user account is approved
 * @property {string} status - User status: 'pending', 'active', 'suspended', 'disabled', 'rejected'
 * @property {string} organizationId - Tenant organization ID
 */

/**
 * Helper to log immutable audit events to Firestore.
 */
export async function logAuditEvent(action, targetUser, performedBy, details = {}) {
  try {
    const db = getFirestore()
    const logId = `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    await setDoc(doc(db, 'audit_logs', logId), {
      action,
      targetUser,
      performedBy: performedBy || 'system',
      timestamp: new Date().toISOString(),
      details,
      organizationId: 'ikk'
    })
  } catch (err) {
    console.warn('[AuditLog] Failed to write audit log:', err.message)
  }
}

function mapFirebaseUser(firebaseUser, role = DEFAULT_ROLE, isActive = true, name = '', approved = false, status = 'pending', organizationId = 'ikk') {
  /** @type {User} */
  return {
    uid: firebaseUser.uid,
    email: firebaseUser.email,
    displayName: name || firebaseUser.displayName || firebaseUser.email?.split('@')[0],
    photoURL: firebaseUser.photoURL,
    role,
    isActive,
    approved,
    status,
    organizationId,
  }
}

/**
 * Fetch user profile from Firestore or bootstrap rahul.panchal@ikkgroup.com
 */
async function fetchUserProfile(uid, email = null) {
  if (!uid) return null
  
  try {
    const db = getFirestore()
    
    // Wrap Firestore fetch in a 2-second timeout to prevent blocking the UI
    const fetchPromise = getDoc(doc(db, 'users', uid))
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Firestore request timed out')), 2000)
    )
    
    const userDoc = await Promise.race([fetchPromise, timeoutPromise])
    
    if (userDoc.exists()) {
      return userDoc.data()
    }
  } catch (err) {
    console.warn('[Auth] Firestore fetch failed or timed out:', err.message)
  }

  // Admin Bootstrap Account for rahul.panchal@ikkgroup.com
  if (email && email.toLowerCase() === 'rahul.panchal@ikkgroup.com') {
    try {
      const db = getFirestore()
      const data = {
        uid,
        email: 'rahul.panchal@ikkgroup.com',
        displayName: 'Rahul Panchal',
        organizationId: 'ikk',
        role: 'admin',
        approved: true,
        status: 'active',
        active: true,
        createdAt: new Date().toISOString(),
        approvedBy: 'system_bootstrap',
        approvedAt: new Date().toISOString()
      }
      await setDoc(doc(db, 'users', uid), data)
      await logAuditEvent('USER_APPROVED', 'rahul.panchal@ikkgroup.com', 'system_bootstrap', { reason: 'bootstrap' })
      return data
    } catch (bootstrapErr) {
      console.warn('[Auth] Failed to bootstrap admin user:', bootstrapErr.message)
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
      usersList: [], // Dynamically loaded from Firestore

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

          const firebaseUser = userCredential.user

          // Validation 1: Email Verified?
          if (!firebaseUser.emailVerified) {
            try { await signOut(auth) } catch {}
            const errMessage = 'Please verify your email before logging in.'
            set((state) => {
              state.user = null
              state.loading = false
              state.error = errMessage
            })
            await logAuditEvent('LOGIN_FAILED_UNVERIFIED', email, 'system')
            throw new Error(errMessage)
          }

          // Verify email domain is allowed
          const tempUser = mapFirebaseUser(firebaseUser)
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

          // Fetch user profile from Firestore users/{uid}
          const profile = await fetchUserProfile(firebaseUser.uid, firebaseUser.email)

          // Validation 2: User Record Exists?
          if (!profile) {
            try { await signOut(auth) } catch {}
            const errMessage = 'Access Denied. User record does not exist.'
            set((state) => {
              state.user = null
              state.loading = false
              state.error = errMessage
            })
            await logAuditEvent('LOGIN_FAILED_RECORD_MISSING', email, 'system')
            throw new Error(errMessage)
          }

          // Validation 3: Approved?
          if (!profile.approved) {
            try { await signOut(auth) } catch {}
            const errMessage = 'Your account is pending administrator approval.'
            set((state) => {
              state.user = null
              state.loading = false
              state.error = errMessage
            })
            await logAuditEvent('LOGIN_FAILED_PENDING', email, 'system')
            throw new Error(errMessage)
          }

          // Validation 4: Status Active?
          const isActive = profile.status === 'active' || profile.active === true
          if (!isActive) {
            try { await signOut(auth) } catch {}
            const errMessage = profile.status === 'suspended'
              ? 'Your account has been suspended. Contact your administrator.'
              : DEACTIVATION_MESSAGE
            set((state) => {
              state.user = null
              state.loading = false
              state.error = errMessage
            })
            await logAuditEvent('LOGIN_FAILED_DISABLED', email, 'system', { status: profile.status })
            throw new Error(errMessage)
          }

          const user = mapFirebaseUser(
            firebaseUser,
            profile.role,
            isActive,
            profile.displayName || profile.name,
            profile.approved,
            profile.status,
            profile.organizationId || 'ikk'
          )

          set((state) => {
            state.user = user
            state.loading = false
            state.error = null
          })

          await logAuditEvent('USER_LOGIN', email, email)
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

      register: async (email, password) => {
        if (!auth) throw new Error('Firebase is not configured. Check your .env file.')
        set((state) => {
          state.loading = true
          state.error = null
        })
        try {
          const emailTrimmed = email.trim().toLowerCase()

          // Validate email domain BEFORE creating the Firebase account
          const domainCheck = validateUserDomain({ email: emailTrimmed })
          if (!domainCheck.allowed) {
            set((state) => {
              state.loading = false
              state.error = domainCheck.reason || DOMAIN_RESTRICTION_MESSAGE
            })
            throw new Error(domainCheck.reason || DOMAIN_RESTRICTION_MESSAGE)
          }

          // Create Firebase account
          const userCredential = await createUserWithEmailAndPassword(auth, emailTrimmed, password).catch((err) => {
            throw new Error(mapFirebaseError(err))
          })

          const firebaseUser = userCredential.user

          // Send verification email immediately
          await sendEmailVerification(firebaseUser)

          // Save pending profile in Firestore users/{uid}
          try {
            const db = getFirestore()
            await setDoc(doc(db, 'users', firebaseUser.uid), {
              uid: firebaseUser.uid,
              email: emailTrimmed,
              displayName: emailTrimmed.split('@')[0],
              organizationId: 'ikk',
              role: 'engineer',
              approved: false,
              status: 'pending',
              active: false,
              createdAt: new Date().toISOString(),
            })
          } catch (firestoreErr) {
            console.warn('[Auth] Could not create user profile in Firestore:', firestoreErr.message)
          }

          // Write audit log
          await logAuditEvent('USER_REGISTERED', emailTrimmed, 'system')

          // Sign out immediately (since user needs to verify email and await approval)
          await signOut(auth)

          set((state) => {
            state.user = null
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
        const currentUser = get().user
        set((state) => {
          state.loading = true
        })
        try {
          if (auth) {
            await signOut(auth)
          }
          if (currentUser) {
            await logAuditEvent('USER_LOGOUT', currentUser.email, currentUser.email)
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
          await logAuditEvent('PASSWORD_RESET_SENT', email, get().user?.email || 'system')
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

      // Admin console operations
      fetchUsersList: async () => {
        try {
          const db = getFirestore()
          const querySnapshot = await getDocs(collection(db, 'users'))
          const list = []
          querySnapshot.forEach((doc) => {
            list.push(doc.data())
          })
          set((state) => {
            state.usersList = list
          })
        } catch (err) {
          console.warn('[Auth] Failed to fetch users list:', err.message)
        }
      },

      approveUser: async (uid, email) => {
        const adminEmail = get().user?.email || 'admin'
        try {
          const db = getFirestore()
          await setDoc(doc(db, 'users', uid), {
            approved: true,
            status: 'active',
            active: true,
            approvedBy: adminEmail,
            approvedAt: new Date().toISOString()
          }, { merge: true })
          
          await logAuditEvent('USER_APPROVED', email, adminEmail)
          await get().fetchUsersList()
        } catch (err) {
          console.error('[Auth] Failed to approve user:', err.message)
          throw err
        }
      },

      rejectUser: async (uid, email) => {
        const adminEmail = get().user?.email || 'admin'
        try {
          const db = getFirestore()
          await setDoc(doc(db, 'users', uid), {
            approved: false,
            status: 'rejected',
            active: false
          }, { merge: true })
          
          await logAuditEvent('USER_REJECTED', email, adminEmail)
          await get().fetchUsersList()
        } catch (err) {
          console.error('[Auth] Failed to reject user:', err.message)
          throw err
        }
      },

      updateUserRole: async (uid, email, newRole) => {
        const adminEmail = get().user?.email || 'admin'
        try {
          const db = getFirestore()
          await setDoc(doc(db, 'users', uid), {
            role: newRole
          }, { merge: true })
          
          await logAuditEvent('ROLE_CHANGED', email, adminEmail, { newRole })
          await get().fetchUsersList()
        } catch (err) {
          console.error('[Auth] Failed to update user role:', err.message)
          throw err
        }
      },

      suspendUser: async (uid, email) => {
        const adminEmail = get().user?.email || 'admin'
        try {
          const db = getFirestore()
          await setDoc(doc(db, 'users', uid), {
            status: 'suspended',
            active: false
          }, { merge: true })
          
          await logAuditEvent('USER_SUSPENDED', email, adminEmail)
          await get().fetchUsersList()
        } catch (err) {
          console.error('[Auth] Failed to suspend user:', err.message)
          throw err
        }
      },

      disableUser: async (uid, email) => {
        const adminEmail = get().user?.email || 'admin'
        try {
          const db = getFirestore()
          await setDoc(doc(db, 'users', uid), {
            status: 'disabled',
            active: false
          }, { merge: true })
          
          await logAuditEvent('USER_DISABLED', email, adminEmail)
          await get().fetchUsersList()
        } catch (err) {
          console.error('[Auth] Failed to disable user:', err.message)
          throw err
        }
      },

      enableUser: async (uid, email) => {
        const adminEmail = get().user?.email || 'admin'
        try {
          const db = getFirestore()
          await setDoc(doc(db, 'users', uid), {
            status: 'active',
            active: true,
            approved: true
          }, { merge: true })
          
          await logAuditEvent('USER_ENABLED', email, adminEmail)
          await get().fetchUsersList()
        } catch (err) {
          console.error('[Auth] Failed to enable user:', err.message)
          throw err
        }
      },

      resetUserAccess: async (uid, email) => {
        const adminEmail = get().user?.email || 'admin'
        try {
          await sendPasswordResetEmail(auth, email)
          await logAuditEvent('PASSWORD_RESET_SENT', email, adminEmail)
        } catch (err) {
          console.error('[Auth] Failed to reset user access:', err.message)
          throw err
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

        // Add a safety timeout
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
            // Validation 1: Email Verified?
            if (!firebaseUser.emailVerified) {
              try { await signOut(auth) } catch {}
              set((state) => {
                state.user = null
                state.loading = false
                state.error = 'Please verify your email before logging in.'
              })
              return
            }

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

            const profile = await fetchUserProfile(firebaseUser.uid, firebaseUser.email)
            if (!profile) {
              try { await signOut(auth) } catch {}
              set((state) => {
                state.user = null
                state.loading = false
                state.error = 'Access Denied. User record does not exist.'
              })
              return
            }

            if (!profile.approved) {
              try { await signOut(auth) } catch {}
              set((state) => {
                state.user = null
                state.loading = false
                state.error = 'Your account is pending administrator approval.'
              })
              return
            }

            const isActive = profile.status === 'active' || profile.active === true
            if (!isActive) {
              try { await signOut(auth) } catch {}
              set((state) => {
                state.user = null
                state.loading = false
                state.error = profile.status === 'suspended'
                  ? 'Your account has been suspended. Contact your administrator.'
                  : DEACTIVATION_MESSAGE
              })
              return
            }

            get().setUser(mapFirebaseUser(
              firebaseUser,
              profile.role,
              isActive,
              profile.displayName || profile.name,
              profile.approved,
              profile.status,
              profile.organizationId || 'ikk'
            ))
          } else {
            get().setUser(null)
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
      version: 2,
      partialize: (state) => ({
        user: state.user,
        usersList: state.usersList,
      }),
    },
  ),
)

export const getAuthActions = () => useAuthStore.getState()
