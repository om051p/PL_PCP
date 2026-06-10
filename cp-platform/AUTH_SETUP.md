# Firebase Authentication Setup

## Overview

CP Designer uses Firebase Authentication for user management. The app requires a Firebase project with Email/Password authentication enabled.

## Environment Variables

All Firebase credentials are stored in `cp-platform/.env` (never committed to git):

```
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

## Firebase Console Setup

1. **Create Firebase Project:**
   - Go to [console.firebase.google.com](https://console.firebase.google.com)
   - Click "Add project"
   - Enter project name (e.g., "rworld-pcp-pl")
   - Follow prompts to complete setup

2. **Enable Authentication:**
   - In Firebase Console, go to **Authentication** → **Sign-in method**
   - Enable **Email/Password** provider
   - Save changes

3. **Create User Accounts:**
   - Go to **Authentication** → **Users**
   - Click "Add user"
   - Enter email and password
   - Repeat for each engineer who needs access

4. **Get Config Values:**
   - Go to **Project Settings** (gear icon) → **General** tab
   - Scroll to "Your apps" section
   - Click Web icon (`</>`) to register a web app
   - Copy the config values to your `.env` file

## Architecture

### Files Modified

| File | Purpose |
|------|---------|
| `src/firebase/config.js` | Firebase initialization, exports `app` and `auth` |
| `src/store/authStore.js` | Zustand store for auth state, login/logout/initialize |
| `src/components/ProtectedRoute.jsx` | Route guards for authenticated/public routes |
| `src/pages/LoginPage.jsx` | Login form UI |
| `src/components/layout.jsx` | TopBar with user profile display and logout |

### Auth Flow

```
App Load
  ↓
ProtectedRoute calls initialize()
  ↓
authStore.initialize() subscribes to onAuthStateChanged
  ↓
┌─────────────────────────────────────────┐
│ User logged in?                         │
│   YES → setUser(firebaseUser) → App     │
│   NO  → setUser(null) → Redirect /login │
└─────────────────────────────────────────┘
```

### Session Persistence

Firebase Auth persists sessions automatically using IndexedDB. Users remain logged in across browser sessions until they explicitly sign out.

### Route Protection

- **ProtectedRoute**: Wraps all app routes except `/login`. Redirects to `/login` if no user.
- **PublicRoute**: Wraps `/login`. Redirects to `/project` if user is already authenticated.

## Development

### Local Development

For local development without Firebase:

```bash
# Option 1: Use Firebase Emulator
# Uncomment in .env:
VITE_FIREBASE_AUTH_EMULATOR=http://localhost:9099

# Then start emulator:
firebase emulators:start --only auth
```

### Testing

Tests use mocked Firebase auth. No real credentials needed for unit tests.

## Security Notes

- **Never commit `.env`** — It's in `.gitignore`
- **Restrict API key** — In Firebase Console, go to **Project Settings** → **General** → **Web API Key** → Restrict to your domain
- **Enable App Check** — For production, enable Firebase App Check to prevent abuse
- **Use Firebase Security Rules** — When adding Firestore/Storage later

## Troubleshooting

### "Firebase: No Firebase App has been created"

- Ensure `.env` file exists with all 6 variables
- Restart dev server after creating/modifying `.env`

### "auth/invalid-api-key"

- Check `VITE_FIREBASE_API_KEY` in `.env`
- Ensure no extra spaces or quotes around values

### "auth/user-not-found"

- User doesn't exist in Firebase
- Create user in Firebase Console → Authentication → Users

### "auth/wrong-password"

- Password doesn't match
- Reset password in Firebase Console if needed

## Production Deployment

1. Ensure `.env` is set in your hosting environment (Vercel, Netlify, etc.)
2. Build: `npm run build`
3. Deploy `dist/` folder
4. Configure Firebase authorized domains in Console → Authentication → Settings → Authorized domains
