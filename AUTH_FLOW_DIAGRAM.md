# RAXA Platform — Authentication Flow Diagram

This document details the authentication and authorization flow, routing guards, and database registry checks for the RAXA platform.

---

## Authentication & Authorization Sequence

```mermaid
sequenceDiagram
    autonumber
    actor User as Engineer / User
    participant App as React SPA (Vite)
    participant Guard as ProtectedRoute / Router
    participant Store as authStore (Zustand)
    participant Auth as Firebase Auth
    participant DB as Firestore (/users collection)

    %% Initialization on Load
    Note over App, Auth: App Initialization (On Mount)
    App->>Store: initialize()
    Store->>Auth: onAuthStateChanged() listener registered
    activate Auth
    alt Firebase Auth responds within 3 seconds
        Auth-->>Store: returns firebaseUser or null
    else Firebase Auth hangs (Adblock / Network offline)
        Note over Store: Safety Timeout Fires (3s)
        Store-->>App: Forces loading = false
    end
    deactivate Auth
    
    %% Navigation Check
    Note over App, Guard: Page Navigation
    App->>Guard: Navigates to Route (e.g., /dashboard)
    alt user is null
        Guard-->>App: Redirects to /login
    else user exists (Simulation or Auth Session)
        alt activeWorkspace is null
            Guard-->>App: Redirects to /workspace
        else activeWorkspace selected
            Guard-->>App: Renders Workspace Component
        end
    end

    %% Login Process
    Note over User, DB: User Login Flow
    User->>App: Submits credentials (email, password)
    App->>Store: login(email, password)
    Store->>Auth: signInWithEmailAndPassword()
    activate Auth
    Auth-->>Store: UserCredential (firebaseUser)
    deactivate Auth

    %% Domain Validation
    Store->>Store: validateUserDomain(firebaseUser)
    alt Domain is NOT allowed (Not @ikkgroup.com)
        Store->>Auth: signOut()
        Store-->>App: Access Denied (Domain Restriction error)
    else Domain is allowed (@ikkgroup.com)
        
        %% Database User Registry Lookup
        Store->>DB: fetchUserProfile(email) (getDoc /users/{email})
        activate DB
        alt Firestore responds within 2 seconds
            DB-->>Store: userDoc (active, role, name)
        else Firestore hangs or fails
            Note over Store: Promise.race Timeout Fires (2s)
            Store->>Store: Fallback to local usersRegistry
        end
        deactivate DB

        %% Registry Verification
        alt User not found in Firestore or local registry fallback
            Store->>Auth: signOut()
            Store-->>App: Access Denied (Not in Approved Users error)
        else User found in Registry
            alt isActive is false
                Store->>Auth: signOut()
                Store-->>App: Access Denied (Deactivated User error)
            else isActive is true
                Store->>Store: setUser(mappedUser + role)
                Store-->>App: Login Success
                App-->>Guard: Navigates to /workspace
            end
        end
    end
```

---

## Flow Summary

1. **Authentication Guard**: Intercepts unauthenticated routes, guiding users to `/login`.
2. **Safety Timeout (3s)**: Prevents slow network requests from freezing the page on "Verifying authentication…".
3. **Domain Verification**: Verifies email domain conforms to `@ikkgroup.com`.
4. **Registry Verification**: Looks up user profile in Firestore (under document ID `{email}`).
5. **Database Timeout (2s)**: If Firestore hangs, falls back to local in-memory registry to verify mock logins.
6. **Active State Verification**: Checks if `active === true` before granting access.
7. **Workspace Routing**: Validates `activeWorkspace` is selected before allowing access to engineering calculations.
