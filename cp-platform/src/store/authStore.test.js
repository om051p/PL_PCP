import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest'

// Configure the backend registry with the Firebase provider (uses mocks below)
import { configureBackend } from '../providers/backend/registry.js'
import { firebaseAuthProvider } from '../providers/backend/firebase/firebaseAuthProvider.js'
import { firebaseUserProvider } from '../providers/backend/firebase/firebaseUserProvider.js'
import { firebaseAuditProvider } from '../providers/backend/firebase/firebaseAuditProvider.js'
import { localStorageProjectProvider } from '../providers/backend/firebase/firebaseProjectProvider.js'

beforeAll(() => {
  configureBackend({
    auth: firebaseAuthProvider,
    user: firebaseUserProvider,
    project: localStorageProjectProvider,
    audit: firebaseAuditProvider,
  })
})

// Mock firebase/auth functions
const mockSignInWithEmailAndPassword = vi.fn()
const mockCreateUserWithEmailAndPassword = vi.fn()
const mockSignOut = vi.fn()
const mockOnAuthStateChanged = vi.fn()
const mockSendPasswordResetEmail = vi.fn()
const mockSendEmailVerification = vi.fn()

vi.mock('firebase/auth', () => ({
  signInWithEmailAndPassword: (...args) => mockSignInWithEmailAndPassword(...args),
  createUserWithEmailAndPassword: (...args) => mockCreateUserWithEmailAndPassword(...args),
  signOut: (...args) => mockSignOut(...args),
  onAuthStateChanged: (...args) => mockOnAuthStateChanged(...args),
  sendPasswordResetEmail: (...args) => mockSendPasswordResetEmail(...args),
  sendEmailVerification: (...args) => mockSendEmailVerification(...args),
  getAuth: vi.fn(),
  connectAuthEmulator: vi.fn(),
}))

// Mock firebase/firestore functions
const mockGetDoc = vi.fn()
const mockSetDoc = vi.fn()
const mockGetDocs = vi.fn()

vi.mock('firebase/firestore', () => ({
  getFirestore: vi.fn(),
  doc: vi.fn((db, col, id) => ({ db, col, id })),
  collection: vi.fn((db, col) => ({ db, col })),
  getDoc: (...args) => mockGetDoc(...args),
  setDoc: (...args) => mockSetDoc(...args),
  getDocs: (...args) => mockGetDocs(...args),
}))

// Mock firebase config
vi.mock('../firebase/config.js', () => ({
  auth: { currentUser: null },
  app: {},
  appCheck: {},
}))

import { useAuthStore } from './authStore.js'
import { hasRole } from '../config/authPolicy.js'

describe('authStore', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    useAuthStore.setState({
      user: null,
      loading: false,
      error: null,
      initialized: false,
      usersList: [],
      failedAttempts: [],
      lockoutUntil: 0,
      sessionStart: 0,
    })

    // Setup local storage mock
    const storeData = {}
    const mockStorage = {
      getItem: vi.fn((key) => storeData[key] ?? null),
      setItem: vi.fn((key, value) => {
        storeData[key] = value
      }),
      removeItem: vi.fn((key) => {
        delete storeData[key]
      }),
    }
    vi.stubGlobal('localStorage', mockStorage)
  })

  describe('Login validation paths', () => {
    it('successfully logs in an approved user with allowed @ikkgroup.com email', async () => {
      // Mock authenticated firebase user
      const mockUser = {
        uid: 'user-123',
        email: 'engineer@ikkgroup.com',
        emailVerified: true,
        displayName: 'Test Engineer',
      }
      mockSignInWithEmailAndPassword.mockResolvedValue({ user: mockUser })

      // Mock Firestore user profile doc fetch
      const mockProfileDoc = {
        exists: () => true,
        data: () => ({
          uid: 'user-123',
          email: 'engineer@ikkgroup.com',
          role: 'engineer',
          approved: true,
          status: 'active',
          organizationId: 'ikk',
        }),
      }
      mockGetDoc.mockResolvedValue(mockProfileDoc)

      const user = await useAuthStore.getState().login('engineer@ikkgroup.com', 'password')

      expect(user).toBeDefined()
      expect(user.id).toBe('user-123')
      expect(user.role).toBe('engineer')
      expect(user.status).toBe('active')
      expect(useAuthStore.getState().user).toEqual(user)
      expect(useAuthStore.getState().error).toBeNull()
    })

    it('rejects login if email domain is not allowed', async () => {
      const mockUser = {
        uid: 'user-456',
        email: 'hacker@attacker.com',
        emailVerified: true,
      }
      mockSignInWithEmailAndPassword.mockResolvedValue({ user: mockUser })

      await expect(
        useAuthStore.getState().login('hacker@attacker.com', 'password')
      ).rejects.toThrow('Organization Access Restricted\n\nOnly authorized organization email addresses may access RAXA.\n\nIf you believe this is an error, contact your administrator.')

      expect(useAuthStore.getState().user).toBeNull()
      expect(mockSignOut).toHaveBeenCalled()
    })

    it('rejects login if email is not verified', async () => {
      const mockUser = {
        uid: 'user-789',
        email: 'newuser@ikkgroup.com',
        emailVerified: false,
      }
      mockSignInWithEmailAndPassword.mockResolvedValue({ user: mockUser })

      await expect(
        useAuthStore.getState().login('newuser@ikkgroup.com', 'password')
      ).rejects.toThrow('Email Verification Required\n\nPlease verify your email address before accessing RAXA.\n\nCheck your inbox and spam folder.')

      expect(useAuthStore.getState().user).toBeNull()
      expect(mockSignOut).toHaveBeenCalled()
    })

    it('rejects login if user Firestore profile does not exist', async () => {
      const mockUser = {
        uid: 'user-999',
        email: 'orphan@ikkgroup.com',
        emailVerified: true,
      }
      mockSignInWithEmailAndPassword.mockResolvedValue({ user: mockUser })

      const mockProfileDoc = {
        exists: () => false,
      }
      mockGetDoc.mockResolvedValue(mockProfileDoc)

      await expect(
        useAuthStore.getState().login('orphan@ikkgroup.com', 'password')
      ).rejects.toThrow('Invalid Email or Password\n\nThe email address or password entered is incorrect.\n\nPlease verify your credentials and try again.')

      expect(useAuthStore.getState().user).toBeNull()
      expect(mockSignOut).toHaveBeenCalled()
    })

    it('rejects login if account is pending administrator approval', async () => {
      const mockUser = {
        uid: 'user-001',
        email: 'pending@ikkgroup.com',
        emailVerified: true,
      }
      mockSignInWithEmailAndPassword.mockResolvedValue({ user: mockUser })

      const mockProfileDoc = {
        exists: () => true,
        data: () => ({
          uid: 'user-001',
          email: 'pending@ikkgroup.com',
          role: 'engineer',
          approved: false,
          status: 'pending',
          organizationId: 'ikk',
        }),
      }
      mockGetDoc.mockResolvedValue(mockProfileDoc)

      await expect(
        useAuthStore.getState().login('pending@ikkgroup.com', 'password')
      ).rejects.toThrow('Access Pending Approval\n\nYour account has been created successfully but has not yet been approved by an administrator.\n\nPlease contact your RAXA administrator for access.')

      expect(useAuthStore.getState().user).toBeNull()
      expect(mockSignOut).not.toHaveBeenCalled()
    })

    it('signs out the user when they request approval', async () => {
      mockSignOut.mockClear()
      await useAuthStore.getState().requestApproval('pending@ikkgroup.com')
      expect(mockSignOut).toHaveBeenCalled()
      expect(useAuthStore.getState().error).toContain('SUCCESS_APPROVAL_REQUESTED:')
    })

    it('rejects login if account is suspended', async () => {
      const mockUser = {
        uid: 'user-002',
        email: 'suspended@ikkgroup.com',
        emailVerified: true,
      }
      mockSignInWithEmailAndPassword.mockResolvedValue({ user: mockUser })

      const mockProfileDoc = {
        exists: () => true,
        data: () => ({
          uid: 'user-002',
          email: 'suspended@ikkgroup.com',
          role: 'engineer',
          approved: true,
          status: 'suspended',
          organizationId: 'ikk',
        }),
      }
      mockGetDoc.mockResolvedValue(mockProfileDoc)

      await expect(
        useAuthStore.getState().login('suspended@ikkgroup.com', 'password')
      ).rejects.toThrow('Account Suspended\n\nYour account has been temporarily disabled.\n\nPlease contact your RAXA administrator.')

      expect(useAuthStore.getState().user).toBeNull()
      expect(mockSignOut).toHaveBeenCalled()
    })
  })

  describe('Admin Bootstrapping', () => {
    it('automatically bootstraps and approves admin profile for rahul.panchel@ikkgroup.com if missing', async () => {
      const mockUser = {
        uid: 'rahul-uid',
        email: 'rahul.panchel@ikkgroup.com',
        emailVerified: true,
      }
      mockSignInWithEmailAndPassword.mockResolvedValue({ user: mockUser })

      // First call doc.exists returns false (no profile yet)
      const mockProfileDoc = {
        exists: () => false,
      }
      mockGetDoc.mockResolvedValue(mockProfileDoc)
      mockSetDoc.mockResolvedValue()

      const user = await useAuthStore.getState().login('rahul.panchel@ikkgroup.com', 'password')

      expect(user).toBeDefined()
      expect(user.role).toBe('admin')
      expect(user.status).toBe('active')
      expect(user.isActive).toBe(true)
      expect(mockSetDoc).toHaveBeenCalled()
    })
  })

  describe('Role Hierarchy permissions checks', () => {
    it('calculates role hierarchy checks correctly', () => {
      const adminUser = { role: 'admin' }
      const managerUser = { role: 'manager' }
      const engineerUser = { role: 'engineer' }
      const reviewerUser = { role: 'reviewer' }
      const viewerUser = { role: 'viewer' }

      // Admin has admin level or lower
      expect(hasRole(adminUser, 'admin')).toBe(true)
      expect(hasRole(adminUser, 'engineer')).toBe(true)
      expect(hasRole(adminUser, 'viewer')).toBe(true)

      // Engineer has engineer level or lower, but not admin
      expect(hasRole(engineerUser, 'engineer')).toBe(true)
      expect(hasRole(engineerUser, 'viewer')).toBe(true)
      expect(hasRole(engineerUser, 'admin')).toBe(false)

      // Viewer only has viewer level
      expect(hasRole(viewerUser, 'viewer')).toBe(true)
      expect(hasRole(viewerUser, 'engineer')).toBe(false)
    })
  })

  describe('Account Lockout Policy', () => {
    it('locks out user after 5 failed attempts within 15 minutes', async () => {
      mockSignInWithEmailAndPassword.mockRejectedValue(new Error('auth/invalid-credential'))

      // Trigger 4 failed attempts
      for (let i = 0; i < 4; i++) {
        await expect(
          useAuthStore.getState().login('lock@ikkgroup.com', 'wrong-pass')
        ).rejects.toThrow()
      }

      expect(useAuthStore.getState().failedAttempts.length).toBe(4)
      expect(useAuthStore.getState().lockoutUntil).toBe(0)

      // Trigger 5th failed attempt -> should set lockoutUntil
      await expect(
        useAuthStore.getState().login('lock@ikkgroup.com', 'wrong-pass')
      ).rejects.toThrow('Account Temporarily Locked')

      expect(useAuthStore.getState().lockoutUntil).toBeGreaterThan(Date.now())

      // 6th attempt should fail immediately because of lockout
      await expect(
        useAuthStore.getState().login('lock@ikkgroup.com', 'wrong-pass')
      ).rejects.toThrow('Account Temporarily Locked')
    })
  })

  describe('Logout Cleanup', () => {
    it('clears session and resets auth state upon logout', async () => {
      useAuthStore.setState({
        user: { uid: 'u1', email: 'test@ikkgroup.com', role: 'engineer' },
      })
      mockSignOut.mockResolvedValue()

      await useAuthStore.getState().logout()

      expect(useAuthStore.getState().user).toBeNull()
      expect(mockSignOut).toHaveBeenCalled()
    })
  })
})
