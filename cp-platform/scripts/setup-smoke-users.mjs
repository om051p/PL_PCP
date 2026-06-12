import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CONFIG_PATH = '/home/rworld_pop/.config/configstore/firebase-tools.json';
const PROJECT_ID = 'rworld-pcp-pl';

// Standard client ID for Firebase CLI
const CLIENT_ID = '563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com';

export async function getAccessToken() {
  if (!fs.existsSync(CONFIG_PATH)) {
    throw new Error(`Firebase tools config not found at ${CONFIG_PATH}`);
  }
  const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
  const tokens = config.tokens;
  if (!tokens) {
    throw new Error('No tokens found in firebase-tools.json');
  }

  // If token is expired or close to it, refresh it
  const now = Date.now();
  if (tokens.expires_at && now >= tokens.expires_at - 60000) {
    console.log('Access token is expired or expiring soon. Refreshing...');
    const refreshResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: CLIENT_ID,
        grant_type: 'refresh_token',
        refresh_token: tokens.refresh_token,
      }),
    });

    if (!refreshResponse.ok) {
      const errText = await refreshResponse.text();
      throw new Error(`Failed to refresh token: ${refreshResponse.statusText} - ${errText}`);
    }

    const refreshData = await refreshResponse.json();
    tokens.access_token = refreshData.access_token;
    tokens.expires_at = Date.now() + (refreshData.expires_in * 1000);
    
    // Save updated token back to config
    config.tokens = tokens;
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, '\t'), 'utf8');
    console.log('Access token refreshed successfully and saved.');
  }

  return tokens.access_token;
}

export async function lookupUser(email, token) {
  const url = `https://identitytoolkit.googleapis.com/v1/projects/${PROJECT_ID}/accounts:lookup`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email: [email] }),
  });

  if (!response.ok) return null;
  const data = await response.json();
  return data.users ? data.users[0] : null;
}

export async function deleteUser(uid, token) {
  const url = `https://identitytoolkit.googleapis.com/v1/projects/${PROJECT_ID}/accounts:delete`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ localId: uid }),
  });

  if (!response.ok) {
    console.warn(`Warning: failed to delete Auth user ${uid}: ${response.statusText}`);
  }
}

export async function deleteFirestoreUserDoc(uid, token) {
  const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/users/${uid}`;
  const response = await fetch(url, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` },
  });
  if (!response.ok && response.status !== 404) {
    console.warn(`Warning: failed to delete Firestore user document ${uid}: ${response.statusText}`);
  }
}

export async function createAuthUser(email, password, token) {
  const url = `https://identitytoolkit.googleapis.com/v1/projects/${PROJECT_ID}/accounts`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email,
      password,
      emailVerified: true,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Failed to create Auth user: ${response.statusText} - ${errText}`);
  }

  const data = await response.json();
  return data.localId;
}

export async function createFirestoreAdminDoc(uid, email, token) {
  const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/users/${uid}`;
  const nowStr = new Date().toISOString();
  
  const body = {
    fields: {
      uid: { stringValue: uid },
      email: { stringValue: email },
      displayName: { stringValue: 'Smoke Test Admin' },
      organizationId: { stringValue: 'ikk' },
      role: { stringValue: 'admin' },
      approved: { booleanValue: true },
      status: { stringValue: 'active' },
      active: { booleanValue: true },
      createdAt: { stringValue: nowStr },
      approvedBy: { stringValue: 'system_bootstrap' },
      approvedAt: { stringValue: nowStr },
    }
  };

  const response = await fetch(url, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Failed to create Firestore admin doc: ${response.statusText} - ${errText}`);
  }
}

export async function cleanAll(token) {
  console.log('Cleaning up old test users...');
  for (const email of ['smoke.admin@ikkgroup.com', 'smoke.engineer@ikkgroup.com']) {
    const user = await lookupUser(email, token);
    if (user) {
      console.log(`Found existing user ${email} (UID: ${user.localId}). Deleting...`);
      await deleteUser(user.localId, token);
      await deleteFirestoreUserDoc(user.localId, token);
    }
  }
}

async function run() {
  console.log('Starting RAXA smoke test user initialization...');
  const token = await getAccessToken();
  
  await cleanAll(token);
  
  console.log('Creating smoke test admin account (smoke.admin@ikkgroup.com)...');
  const adminUid = await createAuthUser('smoke.admin@ikkgroup.com', 'SmokeAdmin2026!', token);
  console.log(`Created Auth account. UID: ${adminUid}`);
  
  await createFirestoreAdminDoc(adminUid, 'smoke.admin@ikkgroup.com', token);
  console.log('Created Firestore user document for Admin.');
  console.log('Successfully prepared database for production smoke test!');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  run().catch(err => {
    console.error('Error bootstrapping test users:', err);
    process.exit(1);
  });
}
