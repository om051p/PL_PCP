# Authentication & Authorization Policy

## Overview

CP Designer restricts access to users with approved email domains and enforces role-based access control. Only authenticated users with an `@ikkgroup.com` email address may access the application.

## Configuration

Domain policy is centralized in `src/config/authPolicy.js`:

```js
export const AUTH_ALLOWED_DOMAINS = [
  'ikkgroup.com',
]
```

**All domain checks go through this module** — no hardcoded domains elsewhere.

## How It Works

### Login Flow

1. User enters email/password on LoginPage
2. Firebase authenticates the credentials
3. `authStore.login()` calls `validateUserDomain(user)`
4. If domain is NOT allowed:
   - User is immediately signed out via `signOut(auth)`
   - Error message: "Access restricted to IKK Group users."
   - Error displayed on LoginPage
5. If domain IS allowed:
   - User is set in store
   - Redirected to `/project`

### Session Restore Flow

1. Browser loads app, `onAuthStateChanged` fires
2. `authStore.initialize()` validates email domain
3. If domain is NOT allowed:
   - User is signed out
   - Error state set
   - ProtectedRoute shows "Access Denied" screen

### Route Protection

- `ProtectedRoute` checks for domain restriction errors
- If error contains `DOMAIN_RESTRICTION_MESSAGE`, shows Access Denied screen
- Otherwise redirects to `/login`

## Supported Email Patterns

| Pattern | Allowed |
|---------|---------|
| `user@ikkgroup.com` | ✅ Yes |
| `User@IKKGROUP.COM` | ✅ Yes (case-insensitive) |
| `user@gmail.com` | ❌ No |
| `user@sub.ikkgroup.com` | ❌ No (subdomains not allowed) |
| `user@ikkgroup.com.br` | ❌ No (exact domain match required) |

## Adding New Domains

To allow additional domains, edit `src/config/authPolicy.js`:

```js
export const AUTH_ALLOWED_DOMAINS = [
  'ikkgroup.com',
  'partner-company.com',
]
```

No other code changes needed — all checks use this config.

## User Roles

### Role Hierarchy

| Role | Level | Permissions |
|------|-------|-------------|
| `admin` | 3 (highest) | Full access: create, read, update, delete projects, manage users, manage settings |
| `engineer` | 2 | Create, read, update projects, run calculations, generate reports and BOM |
| `viewer` | 1 (lowest) | Read-only: view projects and reports |

### Role Configuration

Roles are defined in `src/config/authPolicy.js`:

```js
export const USER_ROLES = {
  ADMIN: 'admin',
  ENGINEER: 'engineer',
  VIEWER: 'viewer',
}

export const DEFAULT_ROLE = USER_ROLES.ENGINEER
```

### How Roles Work

1. **On login**: User profile is fetched from Firestore (`users/{uid}`)
2. **Role assignment**: If no profile exists, `DEFAULT_ROLE` (engineer) is used
3. **Role checks**: `RoleRoute` component validates user's role against required role
4. **Hierarchy**: Admin has all engineer permissions, engineer has all viewer permissions

### Setting User Roles

Create/update user document in Firestore:

```
collection: users
document: {uid}
{
  role: 'admin' | 'engineer' | 'viewer',
  isActive: true | false
}
```

### Route Protection with Roles

Wrap routes with `RoleRoute` to require specific roles:

```jsx
import { RoleRoute } from './components/ProtectedRoute.jsx'
import { USER_ROLES } from './config/authPolicy.js'

<Route path="/settings" element={
  <RoleRoute requiredRole={USER_ROLES.ADMIN}>
    <PageSettings />
  </RoleRoute>
} />
```

### Checking Permissions in Components

```js
import { hasRole, hasPermission } from '../config/authPolicy.js'
import { useAuthStore } from '../store/authStore.js'

const user = useAuthStore((s) => s.user)

// Check role
if (hasRole(user, USER_ROLES.ENGINEER)) {
  // Show calculation button
}

// Check specific permission
if (hasPermission(user, 'projects.delete')) {
  // Show delete button
}
```

## User Activation/Deactivation

| Feature | Status | Implementation |
|---------|--------|----------------|
| Multiple domains | ✅ Supported | Add to `AUTH_ALLOWED_DOMAINS` array |
| User roles | ✅ Implemented | USER_ROLES + Firestore + RoleRoute |
| User activation/deactivation | ✅ Implemented | isActive field in Firestore user doc |
| Project permissions | 🔜 Future | Tie roles to project access |

## Security Notes

- Domain validation happens **after** Firebase authentication
- Unauthorized users are **immediately signed out**
- Domain check runs on **both login and session restore**
- Error messages do NOT reveal whether an email exists in Firebase
- All domain logic is in one file — easy to audit

## Testing

Run domain policy tests:

```bash
npx vitest run src/config/__tests__/authPolicy.test.js
```

Tests cover:
- Valid company email
- Invalid external email
- Missing/null/undefined email
- Mixed-case email addresses
- Subdomain rejection
- Multiple @ signs
- Domain extraction

## Files

| File | Purpose |
|------|---------|
| `src/config/authPolicy.js` | Domain policy, roles, permissions, validation |
| `src/store/authStore.js` | Domain validation, role fetching, activation checks |
| `src/components/ProtectedRoute.jsx` | Access Denied UI, RoleRoute component |
| `src/pages/LoginPage.jsx` | Shows allowed domains in footer |
| `src/config/__tests__/authPolicy.test.js` | 56 unit tests (domain + role) |
