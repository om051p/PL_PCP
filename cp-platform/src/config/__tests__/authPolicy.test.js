import { describe, it, expect } from 'vitest'
import {
  isEmailDomainAllowed,
  extractEmailDomain,
  validateUserDomain,
  hasRole,
  hasPermission,
  getUserPermissions,
  AUTH_ALLOWED_DOMAINS,
  USER_ROLES,
  ROLE_PERMISSIONS,
  DOMAIN_RESTRICTION_MESSAGE,
  ROLE_RESTRICTION_MESSAGE,
} from '../authPolicy.js'

describe('authPolicy', () => {
  // ─── isEmailDomainAllowed() ────────────────────────────────────────────────

  describe('isEmailDomainAllowed()', () => {
    it('allows valid @ikkgroup.com email', () => {
      expect(isEmailDomainAllowed('user@ikkgroup.com')).toBe(true)
    })

    it('allows mixed-case email', () => {
      expect(isEmailDomainAllowed('User@IKKGROUP.COM')).toBe(true)
    })

    it('allows email with leading/trailing whitespace', () => {
      expect(isEmailDomainAllowed('  user@ikkgroup.com  ')).toBe(true)
    })

    it('rejects external domain', () => {
      expect(isEmailDomainAllowed('user@gmail.com')).toBe(false)
    })

    it('rejects similar but not exact domain', () => {
      expect(isEmailDomainAllowed('user@ikkgroup.com.br')).toBe(false)
    })

    it('rejects subdomain', () => {
      expect(isEmailDomainAllowed('user@mail.ikkgroup.com')).toBe(false)
    })

    it('rejects empty string', () => {
      expect(isEmailDomainAllowed('')).toBe(false)
    })

    it('rejects null', () => {
      expect(isEmailDomainAllowed(null)).toBe(false)
    })

    it('rejects undefined', () => {
      expect(isEmailDomainAllowed(undefined)).toBe(false)
    })

    it('rejects non-string input', () => {
      expect(isEmailDomainAllowed(123)).toBe(false)
    })

    it('rejects email without @', () => {
      expect(isEmailDomainAllowed('userikkgroup.com')).toBe(false)
    })

    it('rejects email with @ at end', () => {
      expect(isEmailDomainAllowed('user@')).toBe(false)
    })

    it('handles email with multiple @ signs correctly', () => {
      expect(isEmailDomainAllowed('user@ikkgroup.com')).toBe(true)
      expect(isEmailDomainAllowed('user@other.com@ikkgroup.com')).toBe(true)
    })
  })

  // ─── extractEmailDomain() ──────────────────────────────────────────────────

  describe('extractEmailDomain()', () => {
    it('extracts domain from valid email', () => {
      expect(extractEmailDomain('user@ikkgroup.com')).toBe('ikkgroup.com')
    })

    it('lowercases the domain', () => {
      expect(extractEmailDomain('user@IKKGROUP.COM')).toBe('ikkgroup.com')
    })

    it('returns null for empty string', () => {
      expect(extractEmailDomain('')).toBe(null)
    })

    it('returns null for null', () => {
      expect(extractEmailDomain(null)).toBe(null)
    })

    it('returns null for email without @', () => {
      expect(extractEmailDomain('userikkgroup.com')).toBe(null)
    })
  })

  // ─── validateUserDomain() ──────────────────────────────────────────────────

  describe('validateUserDomain()', () => {
    it('allows user with valid ikkgroup.com email', () => {
      const result = validateUserDomain({ email: 'engineer@ikkgroup.com' })
      expect(result.allowed).toBe(true)
      expect(result.reason).toBe('')
    })

    it('rejects user with external email', () => {
      const result = validateUserDomain({ email: 'hacker@gmail.com' })
      expect(result.allowed).toBe(false)
      expect(result.reason).toContain('Access restricted')
    })

    it('rejects user with no email', () => {
      const result = validateUserDomain({ email: null })
      expect(result.allowed).toBe(false)
      expect(result.reason).toContain('No email')
    })

    it('rejects user with empty email', () => {
      const result = validateUserDomain({ email: '' })
      expect(result.allowed).toBe(false)
      expect(result.reason).toContain('No email')
    })

    it('rejects null user', () => {
      const result = validateUserDomain(null)
      expect(result.allowed).toBe(false)
      expect(result.reason).toContain('No user')
    })

    it('rejects user with undefined email', () => {
      const result = validateUserDomain({})
      expect(result.allowed).toBe(false)
    })

    it('handles mixed-case email correctly', () => {
      const result = validateUserDomain({ email: 'Admin@IKKGROUP.COM' })
      expect(result.allowed).toBe(true)
    })

    it('includes detected domain in rejection reason', () => {
      const result = validateUserDomain({ email: 'user@yahoo.com' })
      expect(result.reason).toContain('@yahoo.com')
    })
  })

  // ─── hasRole() ─────────────────────────────────────────────────────────────

  describe('hasRole()', () => {
    const adminUser = { role: USER_ROLES.ADMIN }
    const engineerUser = { role: USER_ROLES.ENGINEER }
    const viewerUser = { role: USER_ROLES.VIEWER }

    it('admin has admin role', () => {
      expect(hasRole(adminUser, USER_ROLES.ADMIN)).toBe(true)
    })

    it('admin has engineer role (higher)', () => {
      expect(hasRole(adminUser, USER_ROLES.ENGINEER)).toBe(true)
    })

    it('admin has viewer role (higher)', () => {
      expect(hasRole(adminUser, USER_ROLES.VIEWER)).toBe(true)
    })

    it('engineer has engineer role', () => {
      expect(hasRole(engineerUser, USER_ROLES.ENGINEER)).toBe(true)
    })

    it('engineer has viewer role (higher)', () => {
      expect(hasRole(engineerUser, USER_ROLES.VIEWER)).toBe(true)
    })

    it('engineer does NOT have admin role (lower)', () => {
      expect(hasRole(engineerUser, USER_ROLES.ADMIN)).toBe(false)
    })

    it('viewer has viewer role', () => {
      expect(hasRole(viewerUser, USER_ROLES.VIEWER)).toBe(true)
    })

    it('viewer does NOT have engineer role (higher)', () => {
      expect(hasRole(viewerUser, USER_ROLES.ENGINEER)).toBe(false)
    })

    it('viewer does NOT have admin role (higher)', () => {
      expect(hasRole(viewerUser, USER_ROLES.ADMIN)).toBe(false)
    })

    it('rejects null user', () => {
      expect(hasRole(null, USER_ROLES.VIEWER)).toBe(false)
    })

    it('rejects user with no role', () => {
      expect(hasRole({}, USER_ROLES.VIEWER)).toBe(false)
    })
  })

  // ─── hasPermission() ───────────────────────────────────────────────────────

  describe('hasPermission()', () => {
    it('admin has projects.delete permission', () => {
      expect(hasPermission({ role: USER_ROLES.ADMIN }, 'projects.delete')).toBe(true)
    })

    it('admin has users.manage permission', () => {
      expect(hasPermission({ role: USER_ROLES.ADMIN }, 'users.manage')).toBe(true)
    })

    it('engineer has projects.create permission', () => {
      expect(hasPermission({ role: USER_ROLES.ENGINEER }, 'projects.create')).toBe(true)
    })

    it('engineer does NOT have projects.delete permission', () => {
      expect(hasPermission({ role: USER_ROLES.ENGINEER }, 'projects.delete')).toBe(false)
    })

    it('engineer does NOT have users.manage permission', () => {
      expect(hasPermission({ role: USER_ROLES.ENGINEER }, 'users.manage')).toBe(false)
    })

    it('viewer has projects.read permission', () => {
      expect(hasPermission({ role: USER_ROLES.VIEWER }, 'projects.read')).toBe(true)
    })

    it('viewer does NOT have projects.create permission', () => {
      expect(hasPermission({ role: USER_ROLES.VIEWER }, 'projects.create')).toBe(false)
    })

    it('viewer does NOT have calculations.run permission', () => {
      expect(hasPermission({ role: USER_ROLES.VIEWER }, 'calculations.run')).toBe(false)
    })

    it('rejects null user', () => {
      expect(hasPermission(null, 'projects.read')).toBe(false)
    })

    it('rejects user with no role', () => {
      expect(hasPermission({}, 'projects.read')).toBe(false)
    })
  })

  // ─── getUserPermissions() ──────────────────────────────────────────────────

  describe('getUserPermissions()', () => {
    it('returns admin permissions', () => {
      const perms = getUserPermissions({ role: USER_ROLES.ADMIN })
      expect(perms).toContain('projects.delete')
      expect(perms).toContain('users.manage')
      expect(perms.length).toBeGreaterThan(0)
    })

    it('returns engineer permissions', () => {
      const perms = getUserPermissions({ role: USER_ROLES.ENGINEER })
      expect(perms).toContain('projects.create')
      expect(perms).not.toContain('projects.delete')
    })

    it('returns viewer permissions', () => {
      const perms = getUserPermissions({ role: USER_ROLES.VIEWER })
      expect(perms).toContain('projects.read')
      expect(perms).not.toContain('projects.create')
    })

    it('returns empty array for null user', () => {
      expect(getUserPermissions(null)).toEqual([])
    })
  })

  // ─── Constants ─────────────────────────────────────────────────────────────

  describe('Constants', () => {
    it('has ikkgroup.com in allowed domains', () => {
      expect(AUTH_ALLOWED_DOMAINS).toContain('ikkgroup.com')
    })

    it('has restriction message defined', () => {
      expect(DOMAIN_RESTRICTION_MESSAGE).toBeTruthy()
      expect(typeof DOMAIN_RESTRICTION_MESSAGE).toBe('string')
    })

    it('has role restriction message defined', () => {
      expect(ROLE_RESTRICTION_MESSAGE).toBeTruthy()
      expect(typeof ROLE_RESTRICTION_MESSAGE).toBe('string')
    })

    it('has all five roles defined', () => {
      expect(USER_ROLES.ADMIN).toBe('admin')
      expect(USER_ROLES.MANAGER).toBe('manager')
      expect(USER_ROLES.ENGINEER).toBe('engineer')
      expect(USER_ROLES.REVIEWER).toBe('reviewer')
      expect(USER_ROLES.VIEWER).toBe('viewer')
    })

    it('has permissions for all roles', () => {
      expect(ROLE_PERMISSIONS[USER_ROLES.ADMIN]).toBeDefined()
      expect(ROLE_PERMISSIONS[USER_ROLES.MANAGER]).toBeDefined()
      expect(ROLE_PERMISSIONS[USER_ROLES.ENGINEER]).toBeDefined()
      expect(ROLE_PERMISSIONS[USER_ROLES.REVIEWER]).toBeDefined()
      expect(ROLE_PERMISSIONS[USER_ROLES.VIEWER]).toBeDefined()
    })
  })
})
