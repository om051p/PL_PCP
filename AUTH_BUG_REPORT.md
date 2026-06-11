# RAXA Platform — Authentication System Audit & Bug Report

This audit identifies the exact failure points preventing both the real-user login of `rahul.panchal@ikkgroup.com` and the local Simulation Mode quick sign-in.

---

## 1. Summary of Findings

1.  **Missing Approved Registry Record (Primary Login Failure)**:
    While `rahul.panchal@ikkgroup.com` successfully authenticated against Firebase Authentication and passed the `@ikkgroup.com` domain validation, the login failed with **"Access Denied: You are not in the approved users list"**. This is because the application requires every user to exist in the database approved registry. There was no matching document for `rahul.panchal@ikkgroup.com` in Firestore or the local hardcoded fallback registry.
2.  **Authentication Initialization Lock (Simulation Buttons Failure)**:
    The simulation buttons were blocked because the application was hanging indefinitely on a full-screen loading spinner (`Verifying authentication...`). Firebase Authentication and Firestore fetches had no timeouts. When connection requests were delayed, blocked by browser extensions, or unconfigured, the app remained stuck in a `loading = true` state, rendering the login screen inaccessible.

---

## 2. Investigation Details

### 1. Is Firebase Auth working?
**Yes.** Firebase Authentication is successfully loaded, and credentials checked via the client SDK successfully resolve.

### 2. Is `signInWithEmailAndPassword` being called?
**Yes.** The submit handler in [LoginPage.jsx](file:///home/rworld_pop/projects/PL%20PCP/cp-platform/src/pages/LoginPage.jsx) correctly invokes `login(email, password)` which calls the Firebase SDK's `signInWithEmailAndPassword` function.

### 3. Is Firebase initialization successful?
**Yes.** The configuration in [config.js](file:///home/rworld_pop/projects/PL%20PCP/cp-platform/src/firebase/config.js) successfully calls `initializeApp(firebaseConfig)` and `getAuth(app)`. If it fails, it logs an error to the console, and the auth store falls back to local simulation immediately.

### 4. Are environment variables loaded in production?
**Yes.** The production bundle compiled on Vercel resolves `import.meta.env.VITE_FIREBASE_*` properties correctly. If credentials were missing, the SDK would have thrown initialization errors, triggering the fallback.

### 5. Is Firestore `users` collection required?
**Yes, for production/non-simulation users.** Any user logging in with real credentials must exist in the `users` collection to resolve their role and active status. If Firestore is offline or unconfigured, the app attempts to fall back to the hardcoded `usersRegistry` in [authStore.js](file:///home/rworld_pop/projects/PL%20PCP/cp-platform/src/store/authStore.js).

### 6. Does the application require `users/{uid}`, `role`, `active`, and `permissions`?
*   **Document Path**: No, the application queries using the **email address** as the document ID: `/users/{email.toLowerCase()}` (not `{uid}`).
*   **Required Fields**:
    *   `role` (string) — Must be `'admin'`, `'manager'`, `'engineer'`, `'reviewer'`, or `'viewer'`.
    *   `active` / `isActive` (boolean) — Must be `true`.
    *   `name` (string, optional) — Displays the user's name (defaults to the email prefix if missing).
*   **Permissions**: No `permissions` array is required in Firestore. Permissions are automatically mapped from the `role` using the hierarchy configuration in [authPolicy.js](file:///home/rworld_pop/projects/PL%20PCP/cp-platform/src/config/authPolicy.js).

### 7. Check browser console errors & network requests
If the browser console contains CORS or network blocks (e.g. from an ad blocker blocking `googleapis.com`), the Firebase SDK `onAuthStateChanged` and Firestore `getDoc` calls hang, causing the initialization to lock up.

### 8. Check route protection logic & authStore initialization
The `ProtectedRoute` and `PublicRoute` wrappers render the loading spinner when `loading === true`. Because `authStore.js` initialized `loading: true` and had no safety timeouts, any network delay or Firestore query hang locked the client on the loading screen, rendering the simulation login buttons unreachable.

---

## 3. Exact Failure Points

### Failure Point A: Missing Approved User Registry Document
When `rahul.panchal@ikkgroup.com` logs in:
1.  Firebase Auth signs in the user.
2.  The application verifies the domain `@ikkgroup.com` is valid.
3.  The app queries Firestore at `/users/rahul.panchal@ikkgroup.com`.
4.  If the document does not exist, it searches the fallback `usersRegistry` list.
5.  Since the email is not in the database and not in the fallback registry list (which only contains `admin@ikkgroup.com`, etc.), `profile` resolves to `null`.
6.  The app immediately signs out the user and throws: `"Access Denied. You are not in the approved users list."`

### Failure Point B: Indefinite Loading Hang
On page load, the router checks the loading state:
1.  The app mounts `ProtectedRoute` or `PublicRoute`.
2.  Both call `initialize()` on the auth store.
3.  `initialize()` registers `onAuthStateChanged` and remains waiting.
4.  If the Firebase server connection hangs, the callback never fires, `loading` stays `true`, and the screen displays the loading spinner forever, locking out the simulation buttons.

---

## 4. Resolution Actions Taken

### 1. Fixed the Loading Hang (Completed)
We added robust timeouts to prevent initialization hangs:
*   **Firestore Fetch Timeout**: Wrapped the Firestore `getDoc` call in a `Promise.race` with a **2-second timeout**. If Firestore is unresponsive or blocked, the query times out and falls back to the local `usersRegistry`, preventing the UI from freezing.
*   **Auth State Safety Timeout**: Implemented a **3-second safety timeout** in `initialize()`. If Firebase Auth fails to resolve the session within 3 seconds, the store forces `loading = false`, loading the Login page and making the Simulation Mode buttons fully functional.

### 2. Resolving the Login Failure for `rahul.panchal@ikkgroup.com` (Pending Database Entry)
To allow the user to log in successfully, you must create a document in your Firestore database representing their approved account.

#### Required Firestore Configuration:
*   **Database Type**: Cloud Firestore (in Native Mode)
*   **Collection Name**: `users`
*   **Document ID**: `rahul.panchal@ikkgroup.com` (must be lowercase)
*   **Document Fields**:
    ```json
    {
      "name": "Rahul Panchal",
      "role": "engineer",
      "active": true
    }
    ```

Once this record is added to Firestore, the application will successfully validate the user profile upon login and grant access to the RAXA Pipeline engineering workspace.
