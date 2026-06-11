# RAXA Authentication & Access Setup

## Overview

RAXA uses Firebase Authentication for user identity management combined with a Cloud Firestore approved user registry to enforce role-based access control (RBAC) and logical tenant isolation.

---

## 1. Environment Variables

All Firebase credentials are stored in `cp-platform/.env` (never committed to git):

```bash
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-auth-domain.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-storage-bucket.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your-messaging-sender-id
VITE_FIREBASE_APP_ID=your-app-id
```

---

## 2. Hardened Access Flow

RAXA enforces a 5-step access validation workflow on register and login to ensure engineering platform security:

```text
Firebase Login
      ↓
Email Verified? ──────[No]──► Access Denied (Please verify email)
      ↓ [Yes]
User Record Exists? ──[No]──► Access Denied (Record missing)
      ↓ [Yes]
Approved? ────────────[No]──► Account Pending Approval
      ↓ [Yes]
Status Active? ───────[No]──► Account Disabled / Suspended
      ↓ [Yes]
Initialize RAXA Session
```

---

## 3. Firestore Schemas

### Users Collection (`/users/{uid}`)
Keyed by the user's Firebase Auth `uid`:

```json
{
  "uid": "fb-auth-uid-12345",
  "email": "engineer@ikkgroup.com",
  "displayName": "Eyad Engineer",
  "role": "engineer",
  "approved": false,
  "status": "pending",
  "organizationId": "ikk",
  "createdAt": "2026-06-11T16:00:00Z"
}
```

### Audit Logs Collection (`/audit_logs/{logId}`)
Write-only log index tracking system activities:

```json
{
  "action": "USER_APPROVED",
  "targetUser": "engineer@ikkgroup.com",
  "performedBy": "rahul.panchal@ikkgroup.com",
  "timestamp": "2026-06-11T19:00:00Z",
  "details": {},
  "organizationId": "ikk"
}
```

---

## 4. Administrative Controls & Bootstrap

### Admin Console (`UserManagementPage.jsx`)
Administrators manage access via the User Management Console:
*   **Pending Queue**: Review pending registrations; Approve or Reject users.
*   **Managed Users**: View active users, modify roles, Suspend, Disable, or trigger password resets.

### Cold-Start Bootstrapping
When the system is first initialized, if administrator `rahul.panchal@ikkgroup.com` logs in and their Firestore user document does not exist, the auth store automatically bootstraps their approved `Admin` document:

```json
{
  "uid": "rahul-uid",
  "email": "rahul.panchal@ikkgroup.com",
  "displayName": "Rahul Panchal",
  "role": "admin",
  "approved": true,
  "status": "active",
  "organizationId": "ikk"
}
```

---

## 5. Security & Isolation Rules

Tenant isolation is enforced via Firestore Security Rules, verifying that:
*   Users can only query/write documents matching their profile `organizationId`.
*   Audit logs are write-only for users once created (immutable) and read-only for admins.
*   Self-registration enforces default unapproved `engineer` parameters to prevent privilege escalation.
