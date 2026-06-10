# Firebase Setup Guide

## Overview

CP Designer uses Firebase for authentication, Firestore for data storage, and Cloud Storage for file uploads. This document covers installation, configuration, and AI-assisted development setup.

## 1. Firebase CLI Installation

### Install Firebase CLI

```bash
npm install -g firebase-tools
```

### Verify Installation

```bash
firebase --version
# Expected: 15.x.x or later
```

### Authenticate

```bash
firebase login
```

This opens a browser for Google authentication. After login, verify:

```bash
firebase projects:list
```

### Select Project

```bash
firebase use rworld-pcp-pl
```

Or set as default in `.firebaserc`:

```json
{
  "projects": {
    "default": "rworld-pcp-pl"
  }
}
```

## 2. Environment Variables

### Required Variables

Create `cp-platform/.env`:

```bash
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=rworld-pcp-pl.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=rworld-pcp-pl
VITE_FIREBASE_STORAGE_BUCKET=rworld-pcp-pl.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=980127856479
VITE_FIREBASE_APP_ID=1:980127856479:web:6bf14d2f81d885ad9028ea
```

### Optional Variables

```bash
# Firebase Auth Emulator (for local development)
VITE_FIREBASE_AUTH_EMULATOR=http://localhost:9099
```

### Security

- **Never commit `.env`** — It's in `.gitignore`
- **Restrict API key** — In Firebase Console → Project Settings → General → Web API Key

## 3. Firebase Services Configuration

### Authentication

1. Go to Firebase Console → Authentication → Sign-in method
2. Enable **Email/Password** provider
3. Add authorized domains (localhost for dev, your production domain)

### Firestore

1. Go to Firebase Console → Firestore Database → Create database
2. Start in **production mode** (security rules applied)
3. Choose a location closest to your users

### Cloud Storage

1. Go to Firebase Console → Storage → Get started
2. Start in **production mode**
3. Choose same location as Firestore

## 4. MCP Integration for AI Agents

### What is MCP?

Model Context Protocol (MCP) allows AI assistants (Cursor, Claude, VS Code Copilot) to interact directly with your Firebase project.

### Configuration for Cursor

Create `.cursor/mcp.json` in project root:

```json
{
  "mcpServers": {
    "firebase": {
      "command": "npx",
      "args": ["-y", "firebase-tools@latest", "mcp"]
    }
  }
}
```

### Configuration for Claude Desktop

Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "firebase": {
      "command": "npx",
      "args": ["-y", "firebase-tools@latest", "mcp"]
    }
  }
}
```

### Configuration for VS Code

Add to `.vscode/mcp.json`:

```json
{
  "servers": {
    "firebase": {
      "command": "npx",
      "args": ["-y", "firebase-tools@latest", "mcp"]
    }
  }
}
```

### Available MCP Tools

#### Authentication Tools

| Tool | Description |
|------|-------------|
| `auth_get_users` | Retrieve users by UID or email |
| `auth_update_user` | Enable/disable accounts, set custom claims |
| `auth_set_sms_region_policy` | Manage SMS restriction policies |

#### Firestore Tools

| Tool | Description |
|------|-------------|
| `firestore_get_document` | Retrieve a document |
| `firestore_add_document` | Create a document |
| `firestore_update_document` | Update a document |
| `firestore_delete_document` | Delete a document |
| `firestore_list_documents` | List documents in a collection |
| `firestore_query_collection` | Query with filters |
| `firestore_create_index` | Create composite index |
| `firestore_generate_security_rules` | Generate secure rules |

#### Storage Tools

| Tool | Description |
|------|-------------|
| `storage_get_object_download_url` | Get download URL for files |
| `storage_generate_security_rules` | Generate secure storage rules |

#### Core Tools

| Tool | Description |
|------|-------------|
| `firebase_init` | Initialize Firebase services |
| `firebase_validate_security_rules` | Validate rules |
| `firebase_deploy` | Deploy to Firebase |

### Using MCP with AI Agents

Once configured, you can ask your AI assistant:

- "Create a Firestore document for this project"
- "Generate security rules for user data"
- "List all users in Firebase Auth"
- "Deploy the hosting site"

## 5. Project Structure

```
cp-platform/
├── firebase.json              # Firebase project config
├── .firebaserc                # Project aliases
├── firestore.rules            # Firestore security rules
├── firestore.indexes.json     # Firestore indexes
├── storage.rules              # Storage security rules
├── src/
│   └── firebase/
│       └── config.js          # Firebase initialization
└── .env                       # Environment variables (not committed)
```

## 6. Security Rules

### Firestore Rules

- Users can only access their own projects
- Project subcollections (stations, revisions) inherit parent permissions
- All operations require authentication

### Storage Rules

- Users can only access their own upload directory
- Project files accessible to all authenticated users
- All operations require authentication

## 7. Development Workflow

### Local Development

```bash
# Start dev server
cd cp-platform
npm run dev

# Optional: Start Firebase Emulator
firebase emulators:start --only auth,firestore
```

### Deploy to Firebase

```bash
# Build the app
npm run build

# Deploy hosting
firebase deploy --only hosting

# Deploy Firestore rules
firebase deploy --only firestore:rules

# Deploy all
firebase deploy
```

## 8. Troubleshooting

### "Firebase: No Firebase App has been created"

- Ensure `.env` file exists with all 6 variables
- Restart dev server after creating/modifying `.env`

### "auth/invalid-api-key"

- Check `VITE_FIREBASE_API_KEY` in `.env`
- Ensure no extra spaces or quotes around values

### "Permission denied" on Firestore

- Check Firestore security rules
- Ensure user is authenticated
- Verify user owns the document

### MCP not working

- Ensure Firebase CLI is installed: `npm install -g firebase-tools`
- Ensure you're logged in: `firebase login`
- Check MCP config file location

## 9. Next Steps

1. **Enable Firebase App Check** — Prevent API key abuse
2. **Configure CORS** — For production file uploads
3. **Set up Cloud Functions** — For server-side logic
4. **Enable Analytics** — Track user behavior
5. **Configure Monitoring** — Set up alerts and dashboards
