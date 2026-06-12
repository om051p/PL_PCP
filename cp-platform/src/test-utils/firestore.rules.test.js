import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing'
import { doc, getDoc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore'
import { readFileSync } from 'fs'
import { describe, it, beforeAll, afterAll, beforeEach } from 'vitest'

describe('Firestore Security Rules', () => {
  let testEnv

  beforeAll(async () => {
    testEnv = await initializeTestEnvironment({
      projectId: 'rworld-pcp-pl',
      firestore: {
        rules: readFileSync('firestore.rules', 'utf8'),
        host: '127.0.0.1',
        port: 8080,
      },
    })
  })

  afterAll(async () => {
    await testEnv.cleanup()
  })

  beforeEach(async () => {
    await testEnv.clearFirestore()
  })

  // Helper to get firestore instance
  function getDb(auth) {
    if (auth) {
      return testEnv.authenticatedContext(auth.uid, { email: auth.email, ...auth.token }).firestore()
    }
    return testEnv.unauthenticatedContext().firestore()
  }

  describe('Users Collection', () => {
    it('allows anyone to read their own user record', async () => {
      const db = getDb({ uid: 'user_a', email: 'user_a@ikkgroup.com' })
      const ref = doc(db, 'users', 'user_a')
      await assertSucceeds(getDoc(ref))
    })

    it('allows self-registration for pending engineer under ikk organization', async () => {
      const db = getDb({ uid: 'new_user', email: 'new_user@ikkgroup.com', token: { email: 'new_user@ikkgroup.com' } })
      const ref = doc(db, 'users', 'new_user')
      await assertSucceeds(setDoc(ref, {
        approved: false,
        status: 'pending',
        role: 'engineer',
        organizationId: 'ikk'
      }))
    })

    it('prevents self-registration with approved=true or active status', async () => {
      const db = getDb({ uid: 'new_user', email: 'new_user@ikkgroup.com', token: { email: 'new_user@ikkgroup.com' } })
      const ref = doc(db, 'users', 'new_user')
      await assertFails(setDoc(ref, {
        approved: true,
        status: 'active',
        role: 'engineer',
        organizationId: 'ikk'
      }))
    })

    it('allows bootstrap creation for rahul.panchel@ikkgroup.com', async () => {
      const db = getDb({ uid: 'rahul', email: 'rahul.panchel@ikkgroup.com', token: { email: 'rahul.panchel@ikkgroup.com' } })
      const ref = doc(db, 'users', 'rahul')
      await assertSucceeds(setDoc(ref, {
        approved: true,
        status: 'active',
        role: 'admin',
        organizationId: 'ikk'
      }))
    })

    it('allows self updates only for displayName and prevents self role-escalation/self-approval', async () => {
      // Setup existing user
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const db = context.firestore()
        await setDoc(doc(db, 'users', 'user_a'), {
          uid: 'user_a',
          email: 'user_a@ikkgroup.com',
          displayName: 'User A',
          approved: true,
          status: 'active',
          role: 'viewer',
          organizationId: 'ikk'
        })
      })

      const db = getDb({ uid: 'user_a', email: 'user_a@ikkgroup.com' })
      const ref = doc(db, 'users', 'user_a')

      // Succeeds for safe display name update
      await assertSucceeds(updateDoc(ref, {
        displayName: 'User A Updated'
      }))

      // Fails if trying to elevate role
      await assertFails(updateDoc(ref, {
        role: 'admin'
      }))

      // Fails if trying to approve self or change status
      await assertFails(updateDoc(ref, {
        approved: true,
        status: 'active',
        role: 'viewer',
        organizationId: 'other'
      }))
    })
  })

  describe('Projects Collection', () => {
    beforeEach(async () => {
      // Setup users and projects
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const db = context.firestore()
        // Admin Org A
        await setDoc(doc(db, 'users', 'admin_a'), {
          approved: true, status: 'active', role: 'admin', organizationId: 'org_a'
        })
        // Engineer Org A
        await setDoc(doc(db, 'users', 'engineer_a'), {
          approved: true, status: 'active', role: 'engineer', organizationId: 'org_a'
        })
        // Viewer Org A
        await setDoc(doc(db, 'users', 'viewer_a'), {
          approved: true, status: 'active', role: 'viewer', organizationId: 'org_a'
        })
        // Engineer Org B
        await setDoc(doc(db, 'users', 'engineer_b'), {
          approved: true, status: 'active', role: 'engineer', organizationId: 'org_b'
        })
        // Suspended Engineer Org A
        await setDoc(doc(db, 'users', 'suspended_a'), {
          approved: true, status: 'suspended', role: 'engineer', organizationId: 'org_a'
        })

        // Project A
        await setDoc(doc(db, 'projects', 'project_a'), {
          organizationId: 'org_a', name: 'Project A'
        })
      })
    })

    it('allows Org A engineer to read Org A projects', async () => {
      const db = getDb({ uid: 'engineer_a' })
      await assertSucceeds(getDoc(doc(db, 'projects', 'project_a')))
    })

    it('prevents Org B engineer from reading Org A projects', async () => {
      const db = getDb({ uid: 'engineer_b' })
      await assertFails(getDoc(doc(db, 'projects', 'project_a')))
    })

    it('prevents suspended users from reading any projects', async () => {
      const db = getDb({ uid: 'suspended_a' })
      await assertFails(getDoc(doc(db, 'projects', 'project_a')))
    })

    it('allows Org A engineer to create Org A projects', async () => {
      const db = getDb({ uid: 'engineer_a' })
      await assertSucceeds(setDoc(doc(db, 'projects', 'new_proj'), {
        organizationId: 'org_a', name: 'New Project'
      }))
    })

    it('prevents Org A viewer from creating projects', async () => {
      const db = getDb({ uid: 'viewer_a' })
      await assertFails(setDoc(doc(db, 'projects', 'new_proj'), {
        organizationId: 'org_a', name: 'New Project'
      }))
    })

    it('prevents Org A engineer from creating projects in Org B', async () => {
      const db = getDb({ uid: 'engineer_a' })
      await assertFails(setDoc(doc(db, 'projects', 'new_proj'), {
        organizationId: 'org_b', name: 'New Project'
      }))
    })
  })

  describe('Audit Logs Collection', () => {
    it('allows any authenticated user to create an audit log', async () => {
      const db = getDb({ uid: 'user_a' })
      await assertSucceeds(setDoc(doc(db, 'audit_logs', 'log_1'), {
        action: 'TEST', timestamp: new Date().toISOString()
      }))
    })

    it('allows admin to read audit logs', async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const db = context.firestore()
        await setDoc(doc(db, 'users', 'admin_user'), {
          approved: true, status: 'active', role: 'admin', organizationId: 'ikk'
        })
      })

      const db = getDb({ uid: 'admin_user' })
      await assertSucceeds(getDoc(doc(db, 'audit_logs', 'log_1')))
    })

    it('prevents non-admins from reading audit logs', async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const db = context.firestore()
        await setDoc(doc(db, 'users', 'engineer_user'), {
          approved: true, status: 'active', role: 'engineer', organizationId: 'ikk'
        })
      })

      const db = getDb({ uid: 'engineer_user' })
      await assertFails(getDoc(doc(db, 'audit_logs', 'log_1')))
    })

    it('prevents any modification or deletion of audit logs', async () => {
      const db = getDb({ uid: 'admin_user' })
      await assertFails(updateDoc(doc(db, 'audit_logs', 'log_1'), { action: 'MODIFIED' }))
      await assertFails(deleteDoc(doc(db, 'audit_logs', 'log_1')))
    })
  })
})
