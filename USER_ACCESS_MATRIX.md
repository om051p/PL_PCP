# RAXA Platform — User Access & Authorization Matrix

This document defines the roles, hierarchical permissions, and multi-tenant isolation rules governing user access on the RAXA Platform.

---

## 1. Role Hierarchy & Definitions

Users are assigned exactly one role representing their authority bounds:

```text
       Admin (Platform Control & System Logs)
         ↓
      Manager (Scenario Approvals & Deletion)
         ↓
     Engineer (Pipeline / Station Modifications)
         ↓
     Reviewer (Audit & Calculations Inspection)
         ↓
      Viewer  (Read-only Dashboards & Reports)
```

1.  **Admin**: Manages system configurations, approves new registrations, updates user roles, suspends/disables accounts, and reads system audit logs.
2.  **Manager**: Responsible for project-level actions (creation, editing, final deletion, scenario archiving, and locking reports).
3.  **Engineer**: Performs day-to-day calculations, edits station parameters, and runs engineering validations.
4.  **Reviewer**: Inspects calculation details, audits formulas, and generates reports. Has zero edit capabilities.
5.  **Viewer**: Read-only access to dashboards, reports, and calculations.

---

## 2. Feature-by-Feature Permission Matrix

| Feature / Operation | Viewer | Reviewer | Engineer | Manager | Admin |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Access Selection Hub** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **View Dashboards & Setup** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Inspect Calculations Trace**| ✅ | ✅ | ✅ | ✅ | ✅ |
| **Download PDF/Excel Reports**| ✅ | ✅ | ✅ | ✅ | ✅ |
| **Edit Pipeline Geometry** | ❌ | ❌ | ✅ | ✅ | ✅ |
| **Run Calculations** | ❌ | ❌ | ✅ | ✅ | ✅ |
| **Delete Projects / Stations**| ❌ | ❌ | ❌ | ✅ | ✅ |
| **Manage Users Registry** | ❌ | ❌ | ❌ | ❌ | ✅ |
| **Read System Audit Logs** | ❌ | ❌ | ❌ | ❌ | ✅ |

---

## 3. Logical Tenant Isolation (`organizationId`)

Multi-tenancy is enforced logically at the database and application layer using an `organizationId` parameter (e.g. `"ikk"`, `"aramco"`).

1.  **Profile Constraint**: Every user document in Firestore `/users/{uid}` contains an `organizationId`.
2.  **Data Isolation**: All projects contain an `organizationId` property. Users can only query, read, or write to records matching their user profile `organizationId`.
3.  **Security Rule Guards**: Firestore Security Rules enforce tenant containment by cross-checking the requesting user's `organizationId` from `/users/{request.auth.uid}` with the document's resource fields on every read or write.

---

## 4. Account Lifecycle & Approval Workflows

```text
Register (Self-Service)
  │
  ▼
Verify Email (sendEmailVerification)
  │
  ▼
Pending Approval (status: "pending", approved: false)
  │
  ▼
Admin Approval (User Management Console)
  │
  ▼
Access Granted (status: "active", approved: true)
```

1.  **Registration**: Self-service registration is restricted to `@ikkgroup.com` emails. Creating an account automatically triggers a verification email, writes an unapproved (`approved: false`) pending record, and signs out.
2.  **Email Verification**: The login screen blocks users whose emails are unverified (`emailVerified === false`).
3.  **Administrative Approval**: Admins review verified pending users in the console and toggle them to `Active`.
4.  **Account Suspensions**: Admins can suspend or disable active users. Suspended sessions are immediately terminated upon their next Firestore transaction (enforced by rules and session initialization checks).
