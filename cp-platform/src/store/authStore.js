import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import { authRepository } from '../repositories/authRepository.js'
import { userRepository } from '../repositories/userRepository.js'
import { validateUserDomain, DOMAIN_RESTRICTION_MESSAGE, DEFAULT_ROLE, DEACTIVATION_MESSAGE } from '../config/authPolicy.js'
import { ANONYMOUS_USER } from '../providers/backend/normalizedUser.js'

/**
 * @typedef {import('../providers/backend/normalizedUser.js').NormalizedUser} NormalizedUser
 */

/**
 * Helper to log immutable audit events via UserRepository.
 */
export async function logAuditEvent(action, targetUser, performedBy, details = {}) {
  try {
    await userRepository.logAuditEvent(action, targetUser, performedBy, details)
  } catch (err) {
    console.warn('[AuditLog] Failed to write audit log:', err.message)
  }
}

/**
 * Merge profile data into a NormalizedUser to produce the final session user.
 * The authRepository provides the base NormalizedUser (from the auth provider).
 * The userRepository provides the profile (role, status, org, etc.).
 *
 * @param {NormalizedUser} baseUser  — From auth provider (has id, email, emailVerified)
 * @param {object} profile           — From user repository (has role, status, displayName, etc.)
 * @returns {NormalizedUser}
 */
function mergeProfile(baseUser, profile) {
  return {
    ...baseUser,
    displayName: profile.displayName || profile.name || baseUser.displayName,
    role: profile.role || baseUser.role,
    isActive: profile.status === 'active' || profile.active === true,
    status: profile.status || 'pending',
    organizationId: profile.organizationId || baseUser.organizationId,
  }
}

export const useAuthStore = create()(
  persist(
    immer((set, get) => ({
      /** @type {NormalizedUser | null} */
      user: null,
      loading: true,
      /** @type {string | null} */
      error: null,
      initialized: false,
      usersList: [], // Dynamically loaded via UserRepository
      auditLogs: [], // Loaded via UserRepository
      failedAttempts: [],
      lockoutUntil: 0,
      sessionStart: 0,
      requiresTwoFactor: false,
      twoFactorMethod: 'authenticator',

      login: async (email, password) => {
        set((state) => {
          state.loading = true
          state.error = null
          state.requiresTwoFactor = false
        })
        try {
          const now = Date.now()
          if (get().lockoutUntil && now < get().lockoutUntil) {
            const errMessage = 'Account Temporarily Locked\n\nToo many unsuccessful login attempts were detected. Please wait and try again later or reset your password.'
            set((state) => {
              state.error = errMessage
              state.loading = false
            })
            throw new Error(errMessage)
          }

          const normalizedUser = await authRepository.signIn(email, password)

          // Validation 1: Email Verified?
          if (!normalizedUser.emailVerified) {
            try { await authRepository.signOut() } catch { /* ignore */ }
            const errMessage = 'Email Verification Required\n\nPlease verify your email address before accessing RAXA.\n\nCheck your inbox and spam folder.'
            set((state) => {
              state.user = null
              state.loading = false
              state.error = errMessage
            })
            await logAuditEvent('LOGIN_FAILURE', email, 'system', { status: 'unverified' })
            throw new Error(errMessage)
          }

          // Verify email domain is allowed
          const { allowed } = validateUserDomain(normalizedUser)
          if (!allowed) {
            try { await authRepository.signOut() } catch { /* ignore */ }
            const errMessage = 'Organization Access Restricted\n\nOnly authorized organization email addresses may access RAXA.\n\nIf you believe this is an error, contact your administrator.'
            set((state) => {
              state.user = null
              state.loading = false
              state.error = errMessage
            })
            await logAuditEvent('LOGIN_FAILURE', email, 'system', { status: 'domain_restricted' })
            throw new Error(errMessage)
          }

          // Fetch user profile from UserRepository
          const profile = await userRepository.fetchUserProfile(normalizedUser.id, normalizedUser.email)

          // Validation 2: User Record Exists?
          if (!profile) {
            try { await authRepository.signOut() } catch { /* ignore */ }
            const errMessage = 'Invalid Email or Password\n\nThe email address or password entered is incorrect.\n\nPlease verify your credentials and try again.'
            set((state) => {
              state.user = null
              state.loading = false
              state.error = errMessage
            })
            await logAuditEvent('LOGIN_FAILURE', email, 'system', { status: 'record_missing' })
            throw new Error(errMessage)
          }

          // Validation 3: Approved? (NormalizedUser uses status instead of approved flag)
          if (profile.status === 'pending' || profile.status === 'rejected') {
            const errMessage = 'Access Pending Approval\n\nYour account has been created successfully but has not yet been approved by an administrator.\n\nPlease contact your RAXA administrator for access.'
            set((state) => {
              state.user = null
              state.loading = false
              state.error = errMessage
            })
            await logAuditEvent('APPROVAL_DENIED', email, 'system', { status: 'pending_approval' })
            throw new Error(errMessage)
          }

          // Validation 4: Status Active?
          const isActive = profile.status === 'active' || profile.active === true
          if (!isActive) {
            try { await authRepository.signOut() } catch { /* ignore */ }
            const errMessage = 'Account Suspended\n\nYour account has been temporarily disabled.\n\nPlease contact your RAXA administrator.'
            set((state) => {
              state.user = null
              state.loading = false
              state.error = errMessage
            })
            await logAuditEvent('ACCOUNT_SUSPENDED', email, 'system', { status: 'suspended' })
            throw new Error(errMessage)
          }

          const user = mergeProfile(normalizedUser, profile)

          // Check 2FA requirement (set on profile by admin or self-enrollment)
          if (profile.twoFactorEnabled) {
            set((state) => {
              state.failedAttempts = []
              state.requiresTwoFactor = true
              state.twoFactorMethod = profile.twoFactorMethod || 'authenticator'
              state.user = null
              state.loading = false
              state.error = null
            })
            await logAuditEvent('LOGIN_2FA_REQUIRED', email, email, { method: profile.twoFactorMethod || 'authenticator' })
            return user
          }

          set((state) => {
            state.failedAttempts = []
            state.lockoutUntil = 0
            state.sessionStart = Date.now()
            state.user = user
            state.loading = false
            state.error = null
          })

          const ua = typeof navigator !== 'undefined' ? navigator.userAgent : ''
          let browser = 'Unknown Browser'
          let device = 'Unknown Device'
          if (ua.includes('Firefox')) browser = 'Firefox'
          else if (ua.includes('Chrome') && !ua.includes('Edg')) browser = 'Chrome'
          else if (ua.includes('Safari') && !ua.includes('Chrome')) browser = 'Safari'
          else if (ua.includes('Edg')) browser = 'Edge'

          if (ua.includes('Windows')) device = 'Windows PC'
          else if (ua.includes('Macintosh')) device = 'macOS Device'
          else if (ua.includes('Linux')) device = 'Linux PC'
          else if (ua.includes('Android')) device = 'Android Device'
          else if (ua.includes('iPhone')) device = 'iOS Device'

          await logAuditEvent('LOGIN_SUCCESS', email, email, {
            browser,
            device,
            location: 'unknown',
            status: 'active'
          })

          console.info(`✉️ [New Login Notification] Send to ${email}:\nNew Login Detected\n\nA new login to your RAXA account was detected.\n\nIf this was not you, contact your administrator immediately.`)

          try {
            await userRepository.updateUserLastLogin(normalizedUser.id)
          } catch (lastLoginErr) {
            console.warn('[Auth] Failed to update last login timestamp:', lastLoginErr.message)
          }

          return user
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Login failed'
          
          if (!message.includes('Account Temporarily Locked')) {
            const failTime = Date.now()
            const attempts = [...(get().failedAttempts || [])]
            attempts.push(failTime)
            const fifteenMinsAgo = failTime - 15 * 60 * 1000
            const activeAttempts = attempts.filter(t => t > fifteenMinsAgo)

            set((state) => {
              state.failedAttempts = activeAttempts
            })

            if (activeAttempts.length >= 5) {
              const lockTime = failTime + 30 * 60 * 1000
              set((state) => {
                state.lockoutUntil = lockTime
                state.failedAttempts = []
              })
              await logAuditEvent('LOGIN_LOCKED', email, 'system', { status: 'locked' })
              const errMessage = 'Account Temporarily Locked\n\nToo many unsuccessful login attempts were detected. Please wait and try again later or reset your password.'
              set((state) => {
                state.error = errMessage
                state.loading = false
              })
              throw new Error(errMessage, { cause: err })
            }
          }

          const isCustomErr = message.includes('Email Verification Required') ||
                              message.includes('Access Pending Approval') ||
                              message.includes('Account Suspended') ||
                              message.includes('Organization Access Restricted') ||
                              message.includes('Invalid Email or Password') ||
                              message.includes('Account Temporarily Locked')

          if (!isCustomErr) {
            let status = 'credential_failure'
            if (message.includes('Locked')) {
              status = 'locked'
            } else if (message.includes('Connection Error')) {
              status = 'network_error'
            }
            await logAuditEvent('LOGIN_FAILURE', email, 'system', { status, reason: message })
          }

          set((state) => {
            state.loading = false
            state.error = message
          })
          throw err
        }
      },

      register: async (email, password) => {
        set((state) => {
          state.loading = true
          state.error = null
        })
        try {
          const emailTrimmed = email.trim().toLowerCase()

          // Validate email domain BEFORE creating the Firebase account
          const domainCheck = validateUserDomain({ email: emailTrimmed })
          if (!domainCheck.allowed) {
            const errMessage = 'Organization Access Restricted\n\nOnly authorized organization email addresses may access RAXA.\n\nIf you believe this is an error, contact your administrator.'
            set((state) => {
              state.loading = false
              state.error = errMessage
            })
            throw new Error(errMessage)
          }

          // Create account via AuthRepository (sends verification automatically)
          const { user: newUser } = await authRepository.signUp(emailTrimmed, password)

          // Save pending profile in UserRepository
          try {
            await userRepository.createUserProfile(newUser.id, emailTrimmed)
          } catch (profileErr) {
            console.warn('[Auth] Could not create user profile:', profileErr.message)
          }

          // Write audit log
          await logAuditEvent('USER_REGISTERED', emailTrimmed, 'system')

          // Sign out immediately (since user needs to verify email and await approval)
          await authRepository.signOut()

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

      logout: async (options = {}) => {
        const currentUser = get().user
        set((state) => {
          state.loading = true
        })
        try {
          await authRepository.signOut()
          if (currentUser) {
            await logAuditEvent('USER_LOGOUT', currentUser.email, currentUser.email)
          }
          set((state) => {
            state.user = null
            state.loading = false
            state.sessionStart = 0
            state.error = options?.expired
              ? 'Session Expired\n\nPlease sign in again.'
              : null
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
        set((state) => {
          state.loading = true
          state.error = null
        })
        try {
          await authRepository.sendPasswordReset(email)
          await logAuditEvent('PASSWORD_RESET_REQUEST', email, get().user?.email || 'system', { status: 'sent' })
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

       /**
        * Verify a 2FA code after login() has set requiresTwoFactor=true.
        * For the demo: any 6-digit code is accepted. In production this
        * would call authRepository.verifyTotp(code) or similar.
        */
       verifyTwoFactor: async (_email, code) => {
         set((state) => {
           state.loading = true
           state.error = null
         })
         try {
           if (!code || code.length !== 6 || !/^\d{6}$/.test(code)) {
             throw new Error('Invalid verification code\n\nPlease enter the 6-digit code from your authenticator app.')
           }
           // Simulated 2FA verification — in production, replace with a real
           // TOTP/SMS/email code check. For now, accept any 6-digit code.
           await new Promise((r) => setTimeout(r, 400)) // simulate network
           set((state) => {
             state.requiresTwoFactor = false
             state.loading = false
           })
           await logAuditEvent('LOGIN_2FA_SUCCESS', _email, _email, { method: get().twoFactorMethod })
         } catch (err) {
           const message = err instanceof Error ? err.message : '2FA verification failed'
           set((state) => {
             state.loading = false
             state.error = message
           })
           throw err
         }
       },

      resendVerificationEmail: async (email, password) => {
        set((state) => {
          state.loading = true
          state.error = null
        })
        try {
          const emailTrimmed = email.trim().toLowerCase()
          const normalizedUser = await authRepository.signIn(emailTrimmed, password)
          await authRepository.sendVerification(normalizedUser)
          await authRepository.signOut()
          
          set((state) => {
            state.loading = false
            state.error = 'SUCCESS_VERIFICATION_SENT'
          })
          await logAuditEvent('VERIFICATION_EMAIL_RESENT', emailTrimmed, 'system', { status: 'sent' })
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Failed to send verification email'
          set((state) => {
            state.loading = false
            state.error = message
          })
          throw err
        }
      },

      requestApproval: async (email) => {
        set((state) => {
          state.loading = true
          state.error = null
        })
        try {
          const emailTrimmed = email.trim().toLowerCase()
          const now = Date.now()
          if (get().lastApprovalRequest && now - get().lastApprovalRequest < 60 * 1000) {
            throw new Error('Please wait at least 1 minute before submitting another approval request.')
          }

          const refId = 'REQ-' + Array.from({length: 6}, () => 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'[Math.floor(Math.random() * 36)]).join('')

          await logAuditEvent('APPROVAL_REQUEST', emailTrimmed, 'system', { referenceId: refId, status: 'pending' })
          
          try {
            await authRepository.signOut()
          } catch { /* ignore */ }

          set((state) => {
            state.loading = false
            state.lastApprovalRequest = now
            state.error = 'SUCCESS_APPROVAL_REQUESTED:' + refId
          })
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Failed to request approval'
          set((state) => {
            state.loading = false
            state.error = message
          })
          throw err
        }
      },

      fetchAuditLogs: async () => {
        try {
          const logs = await userRepository.fetchAuditLogs()
          set((state) => {
            state.auditLogs = logs
          })
        } catch (err) {
          console.warn('[Auth] Failed to fetch audit logs:', err.message)
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

      // Admin console operations delegating to UserRepository
      fetchUsersList: async () => {
        try {
          const orgId = get().user?.organizationId || 'ikk'
          const list = await userRepository.fetchUsersList(orgId)
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
          await userRepository.approveUser(uid, email, adminEmail)
          await get().fetchUsersList()
        } catch (err) {
          console.error('[Auth] Failed to approve user:', err.message)
          throw err
        }
      },

      rejectUser: async (uid, email) => {
        const adminEmail = get().user?.email || 'admin'
        try {
          await userRepository.rejectUser(uid, email, adminEmail)
          await get().fetchUsersList()
        } catch (err) {
          console.error('[Auth] Failed to reject user:', err.message)
          throw err
        }
      },

      updateUserRole: async (uid, email, newRole) => {
        const adminEmail = get().user?.email || 'admin'
        try {
          await userRepository.updateUserRole(uid, email, newRole, adminEmail)
          await get().fetchUsersList()
        } catch (err) {
          console.error('[Auth] Failed to update user role:', err.message)
          throw err
        }
      },

      suspendUser: async (uid, email) => {
        const adminEmail = get().user?.email || 'admin'
        try {
          await userRepository.suspendUser(uid, email, adminEmail)
          await get().fetchUsersList()
        } catch (err) {
          console.error('[Auth] Failed to suspend user:', err.message)
          throw err
        }
      },

      disableUser: async (uid, email) => {
        const adminEmail = get().user?.email || 'admin'
        try {
          await userRepository.disableUser(uid, email, adminEmail)
          await get().fetchUsersList()
        } catch (err) {
          console.error('[Auth] Failed to disable user:', err.message)
          throw err
        }
      },

      enableUser: async (uid, email) => {
        const adminEmail = get().user?.email || 'admin'
        try {
          await userRepository.enableUser(uid, email, adminEmail)
          await get().fetchUsersList()
        } catch (err) {
          console.error('[Auth] Failed to enable user:', err.message)
          throw err
        }
      },

      resetUserAccess: async (uid, email) => {
        const adminEmail = get().user?.email || 'admin'
        try {
          await authRepository.sendPasswordReset(email)
          await logAuditEvent('PASSWORD_RESET_SENT', email, adminEmail)
        } catch (err) {
          console.error('[Auth] Failed to reset user access:', err.message)
          throw err
        }
      },

      initialize: () => {
        if (get().initialized) return () => {}

        // E2E testing mock auth — DEVELOPMENT ONLY (tree-shaken in production)
        // eslint-disable-next-line no-undef
        if (import.meta.env.DEV && localStorage.getItem('e2e-mock-auth') === 'true') {
          set((state) => {
            state.user = {
              id: 'mock-e2e-engineer',
              email: 'engineer@cpdesigner.com',
              displayName: 'E2E Test Engineer',
              role: 'engineer',
              isActive: true,
              emailVerified: true,
              status: 'active',
              organizationId: 'ikk',
              avatarUrl: null,
            }
            state.initialized = true
            state.loading = false
          })
          return () => {}
        }

        // Add a safety timeout
        const timeoutId = setTimeout(() => {
          if (get().loading) {
            console.warn('[Auth] Firebase initialization timed out. Forcing loading state to false.')
            set((state) => {
              state.loading = false
            })
          }
        }, 3000)

        const unsubscribe = authRepository.onAuthStateChanged(async (normalizedUser) => {
          clearTimeout(timeoutId)
          // Check for ANONYMOUS_USER sentinel (signed out)
          if (normalizedUser && normalizedUser.id) {
            // Max session check: 12 hours
            const sessionStart = get().sessionStart
            if (sessionStart && Date.now() - sessionStart >= 12 * 60 * 60 * 1000) {
              try { await authRepository.signOut() } catch { /* ignore */ }
              set((state) => {
                state.user = null
                state.sessionStart = 0
                state.loading = false
                state.error = 'Session Expired\n\nPlease sign in again.'
              })
              return
            }

            // Validation 1: Email Verified?
            if (!normalizedUser.emailVerified) {
              try { await authRepository.signOut() } catch { /* ignore */ }
              set((state) => {
                state.user = null
                state.loading = false
                state.error = 'Email Verification Required\n\nPlease verify your email address before accessing RAXA.\n\nCheck your inbox and spam folder.'
              })
              return
            }

            const { allowed } = validateUserDomain(normalizedUser)
            if (!allowed) {
              try { await authRepository.signOut() } catch { /* ignore */ }
              set((state) => {
                state.user = null
                state.loading = false
                state.error = 'Organization Access Restricted\n\nOnly authorized organization email addresses may access RAXA.\n\nIf you believe this is an error, contact your administrator.'
              })
              return
            }

            const profile = await userRepository.fetchUserProfile(normalizedUser.id, normalizedUser.email)
            if (!profile) {
              try { await authRepository.signOut() } catch { /* ignore */ }
              set((state) => {
                state.user = null
                state.loading = false
                state.error = 'Invalid Email or Password\n\nThe email address or password entered is incorrect.\n\nPlease verify your credentials and try again.'
              })
              return
            }

            if (profile.status === 'pending' || profile.status === 'rejected') {
              try { await authRepository.signOut() } catch { /* ignore */ }
              set((state) => {
                state.user = null
                state.loading = false
                state.error = 'Access Pending Approval\n\nYour account has been created successfully but has not yet been approved by an administrator.\n\nPlease contact your RAXA administrator for access.'
              })
              return
            }

            const isActive = profile.status === 'active'
            if (!isActive) {
              try { await authRepository.signOut() } catch { /* ignore */ }
              set((state) => {
                state.user = null
                state.loading = false
                state.error = 'Account Suspended\n\nYour account has been temporarily disabled.\n\nPlease contact your RAXA administrator.'
              })
              return
            }

            get().setUser(mergeProfile(normalizedUser, profile))
          } else {
            get().setUser(null)
          }
        })

        set((state) => {
          state.initialized = true
        })

        return () => {
          // Do not clear timeout or unsubscribe here to allow the global auth listener 
          // and safety timeout to survive React StrictMode remounts.
        }
      },
    })),
    {
      name: 'cp-platform-auth',
      version: 2,
      partialize: (state) => ({
        user: state.user,
        usersList: state.usersList,
        failedAttempts: state.failedAttempts,
        lockoutUntil: state.lockoutUntil,
        sessionStart: state.sessionStart,
      }),
    },
  ),
)

export const getAuthActions = () => useAuthStore.getState()
