# Vercel Deployment Diagnostics

**Project:** rworld-pl-pcp
**URL:** https://rworld-pl-pcp.vercel.app/
**Status:** 404 NOT_FOUND on all paths
**Date:** June 10, 2026

---

## Root Cause

**Vercel cannot find `package.json` at the repository root.**

The repository structure is:

```
PL_PCP/                          ← Git repo root (Vercel clones here)
├── package.json                 ← MISSING (Vercel expects this here)
├── cp-platform/                 ← Actual app lives here
│   ├── package.json             ← EXISTS (build scripts here)
│   ├── vite.config.js
│   ├── vercel.json              ← EXISTS but ignored (not at root)
│   └── src/
```

Vercel clones the repository, looks for `package.json` at the root, finds none, and either:
1. Fails to build (silently marks deployment as "Ready" with empty output)
2. Or builds but serves nothing

**Evidence:**
- `curl https://rworld-pl-pcp.vercel.app/` → `404 NOT_FOUND`
- `curl https://rworld-pl-pcp.vercel.app/login` → `404 NOT_FOUND`
- `curl https://rworld-pl-pcp.vercel.app/dashboard` → `404 NOT_FOUND`
- No `package.json` at repository root
- `cp-platform/vercel.json` exists but is ignored (Vercel only reads `vercel.json` at root)

---

## Vercel Configuration Audit

### 1. Repository Structure

| Check | Status | Evidence |
|-------|--------|----------|
| `package.json` at root | ❌ FAIL | Does not exist at `PL_PCP/package.json` |
| `package.json` in cp-platform | ✅ PASS | Exists at `PL_PCP/cp-platform/package.json` |
| `vercel.json` at root | ❌ FAIL | Does not exist at `PL_PCP/vercel.json` |
| `vercel.json` in cp-platform | ⚠️ IGNORED | Exists but Vercel doesn't read it from subdirectory |

### 2. Build Configuration

| Setting | Expected | Actual | Status |
|---------|----------|--------|--------|
| Root Directory | `cp-platform` | Not set | ❌ FAIL |
| Build Command | `npm run build` | Not configured | ❌ FAIL |
| Output Directory | `dist` | Not configured | ❌ FAIL |
| Install Command | `npm install` | Not configured | ⚠️ DEFAULT |

### 3. Vite Configuration

| Setting | Value | Status |
|---------|-------|--------|
| `outDir` | `dist` | ✅ Correct |
| `base` | `./` | ✅ Correct for SPA |
| Build command | `vite build` | ✅ In package.json |

### 4. SPA Routing

| Check | Status | Evidence |
|-------|--------|----------|
| `vercel.json` rewrites | ⚠️ EXISTS in cp-platform | `{"rewrites": [{"source": "/(.*)", "destination": "/index.html"}]}` |
| `vercel.json` at root | ❌ MISSING | Vercel doesn't read cp-platform/vercel.json |
| Vite SPA config | ✅ Correct | React Router handles client-side routing |

### 5. Firebase Environment Variables

| Check | Status | Evidence |
|-------|--------|----------|
| `.env` file | ✅ EXISTS | `cp-platform/.env` with all 6 vars |
| Vercel env vars | ❌ NOT CONFIGURED | Environment variables not set in Vercel dashboard |
| Firebase config | ✅ Correct | `rworld-pcp-pl` project |

### 6. Firebase Authorized Domains

| Domain | Status | Notes |
|--------|--------|-------|
| `rworld-pl-pcp.vercel.app` | ❌ NOT ADDED | Must add in Firebase Console |
| `localhost` | ✅ Works locally | For development |

---

## The Fix

### Option A: Create `vercel.json` at Repository Root (Recommended)

Create `PL_PCP/vercel.json`:

```json
{
  "rootDirectory": "cp-platform",
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "installCommand": "npm install",
  "rewrites": [
    { "source": "/((?!assets/).*)", "destination": "/index.html" }
  ]
}
```

### Option B: Set Root Directory in Vercel Dashboard

1. Go to Vercel Dashboard → rworld-pl-pcp → Settings → General
2. Set **Root Directory** to `cp-platform`
3. Set **Build Command** to `npm run build`
4. Set **Output Directory** to `dist`
5. Redeploy

### Option C: Move package.json to Root (Not Recommended)

This would break the project structure and is not recommended.

---

## After Fixing Root Directory

### Add Environment Variables in Vercel

1. Go to Vercel Dashboard → rworld-pl-pcp → Settings → Environment Variables
2. Add all 6 Firebase variables:
   - `VITE_FIREBASE_API_KEY`
   - `VITE_FIREBASE_AUTH_DOMAIN`
   - `VITE_FIREBASE_PROJECT_ID`
   - `VITE_FIREBASE_STORAGE_BUCKET`
   - `VITE_FIREBASE_MESSAGING_SENDER_ID`
   - `VITE_FIREBASE_APP_ID`
3. Set scope to **Production**, **Preview**, and **Development**

### Add Authorized Domain in Firebase

1. Go to Firebase Console → Authentication → Settings → Authorized domains
2. Add `rworld-pl-pcp.vercel.app`
3. Save

### Redeploy

```bash
cd cp-platform
vercel --prod
```

Or push to git to trigger automatic deployment.

---

## Verification Checklist

After applying the fix:

| Check | Command | Expected |
|-------|---------|----------|
| Build succeeds | `npm run build` | `dist/index.html` exists |
| Root returns 200 | `curl -o /dev/null -w '%{http_code}' https://rworld-pl-pcp.vercel.app/` | `200` |
| /login returns 200 | `curl -o /dev/null -w '%{http_code}' https://rworld-pl-pcp.vercel.app/login` | `200` |
| /dashboard returns 200 | `curl -o /dev/null -w '%{http_code}' https://rworld-pl-pcp.vercel.app/dashboard` | `200` |
| Firebase loads | Open browser console | No `auth/invalid-api-key` errors |
| Login works | Enter valid credentials | Redirects to /project |

---

## Summary

| Issue | Root Cause | Fix |
|-------|-----------|-----|
| 404 on all paths | No `package.json` at repo root | Set Root Directory to `cp-platform` in Vercel |
| SPA routing broken | `vercel.json` in wrong location | Create `vercel.json` at repo root with rewrites |
| Firebase not configured | Env vars not set in Vercel | Add all 6 `VITE_FIREBASE_*` variables |
| Auth may fail | Domain not authorized | Add `rworld-pl-pcp.vercel.app` to Firebase |

**The primary fix is setting the Vercel Root Directory to `cp-platform`.** Everything else follows from that.
