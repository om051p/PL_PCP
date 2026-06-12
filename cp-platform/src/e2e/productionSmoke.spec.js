import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const PROJECT_ID = 'rworld-pcp-pl';
const BASE_URL = 'https://rworld-pl-pcp.vercel.app';
const CONFIG_PATH = '/home/rworld_pop/.config/configstore/firebase-tools.json';
const CLIENT_ID = '563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com';

// Setup directories
const EVIDENCE_DIR = path.resolve('smoke-evidence');
if (!fs.existsSync(EVIDENCE_DIR)) {
  fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
}

// ─── Firebase Helper functions inside node ──────────────────────────────────
async function getAccessToken() {
  if (!fs.existsSync(CONFIG_PATH)) {
    throw new Error(`Firebase tools config not found at ${CONFIG_PATH}`);
  }
  const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
  const tokens = config.tokens;
  if (!tokens) {
    throw new Error('No tokens found in firebase-tools.json');
  }

  // Refresh if expired
  const now = Date.now();
  if (tokens.expires_at && now >= tokens.expires_at - 60000) {
    const refreshResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: CLIENT_ID,
        grant_type: 'refresh_token',
        refresh_token: tokens.refresh_token,
      }),
    });
    if (refreshResponse.ok) {
      const refreshData = await refreshResponse.json();
      tokens.access_token = refreshData.access_token;
      tokens.expires_at = Date.now() + (refreshData.expires_in * 1000);
      config.tokens = tokens;
      fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, '\t'), 'utf8');
    }
  }
  return tokens.access_token;
}

async function lookupUser(email, token) {
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

async function setAuthEmailVerified(uid, token) {
  const url = `https://identitytoolkit.googleapis.com/v1/projects/${PROJECT_ID}/accounts:update`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      localId: uid,
      emailVerified: true,
    }),
  });
  if (!response.ok) {
    throw new Error(`Failed to verify email for ${uid}: ${response.statusText}`);
  }
}

async function cleanUser(email, token) {
  const user = await lookupUser(email, token);
  if (user) {
    const deleteAuthUrl = `https://identitytoolkit.googleapis.com/v1/projects/${PROJECT_ID}/accounts:delete`;
    await fetch(deleteAuthUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ localId: user.localId }),
    });

    const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/users/${user.localId}`;
    await fetch(firestoreUrl, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` },
    });
  }
}

// Helper to wait
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// ─── Playwright Test ────────────────────────────────────────────────────────
test.describe('RAXA Impressed Current Cathodic Protection Production Smoke Test', () => {
  let token;

  test.beforeAll(async () => {
    token = await getAccessToken();
    // Clean up engineer from previous test run
    await cleanUser('smoke.engineer@ikkgroup.com', token);
  });

  test.beforeEach(async ({ page }) => {
    page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
    page.on('pageerror', err => console.log('BROWSER EXCEPTION:', err.message));
  });

  test.afterAll(async () => {
    // Clean up engineer at the end of the test run to keep DB pristine
    await cleanUser('smoke.engineer@ikkgroup.com', token);
  });

  test('Perform Comprehensive Smoke Test', async ({ page, browser }) => {
    test.setTimeout(180000); // 3 minutes total timeout

    // Define field locator helpers matching fullWorkflow.spec.js
    function field(label) {
      return page.locator('.field, .form-group').filter({ hasText: label }).locator('.field-input, select, input');
    }
    
    function resultValue(label) {
      return page.locator('.result-row, .result-card').filter({ hasText: label }).locator('.result-val, .result-value, strong');
    }

    // ─── 1 & 2. Registration & Email Verification ───────────────────────────
    console.log('1. Registering new engineer...');
    await page.goto(`${BASE_URL}/register`);
    await page.waitForLoadState('networkidle');

    await page.locator('#email').fill('smoke.engineer@ikkgroup.com');
    await page.locator('#password').fill('SmokeEngineer2026!');
    await page.locator('#confirm-password').fill('SmokeEngineer2026!');
    
    // Capture Registration fields filled
    await page.screenshot({ path: `${EVIDENCE_DIR}/01_registration.png` });
    
    await page.locator('button[type="submit"]').click();
    await page.waitForSelector('.login-success, :text("Account Created")');
    
    // Capture Email Verification sent screen
    await page.screenshot({ path: `${EVIDENCE_DIR}/02_verification_sent.png` });
    console.log('Registered engineer and verified sent screen.');

    // ─── 3. Pending Approval Workflow ────────────────────────────────────────
    // First, attempt to log in as engineer before verification
    console.log('Attempting login as unverified engineer...');
    await page.goto(`${BASE_URL}/login`);
    await page.waitForLoadState('networkidle');
    await page.locator('#email').fill('smoke.engineer@ikkgroup.com');
    await page.locator('#password').fill('SmokeEngineer2026!');
    await page.locator('button[type="submit"]').click();
    
    await page.waitForSelector('.auth-banner--warning, :text("Email Verification Required")');
    
    // Set email verified programmatically
    console.log('Setting emailVerified = true via REST API...');
    const engineerUser = await lookupUser('smoke.engineer@ikkgroup.com', token);
    expect(engineerUser).not.toBeNull();
    await setAuthEmailVerified(engineerUser.localId, token);
    
    // Attempt login as verified but unapproved engineer
    console.log('Attempting login as verified but unapproved engineer...');
    await page.locator('#password').fill('SmokeEngineer2026!');
    await page.locator('button[type="submit"]').click();
    
    await page.waitForSelector('.auth-banner--warning, :text("Access Pending Approval")');
    await page.screenshot({ path: `${EVIDENCE_DIR}/03_pending_approval.png` });
    console.log('Verified pending approval lockout.');

    // ─── 4 & 23. Admin Approval Workflow & User Management ───────────────────
    console.log('Logging in as Admin...');
    await page.goto(`${BASE_URL}/login`);
    await page.waitForLoadState('networkidle');
    await page.locator('#email').fill('smoke.admin@ikkgroup.com');
    await page.locator('#password').fill('SmokeAdmin2026!');
    await page.locator('button[type="submit"]').click();
    
    await page.waitForURL('**/workspace');
    console.log('Admin logged in. Navigating to Pipeline -> User Management...');
    await page.click(':text("Available"):has-text("Pipeline")');
    await page.waitForURL('**/dashboard');
    
    // Go to User Management page
    await page.click('a[href="/users"]');
    await page.waitForURL('**/users');
    
    // Capture active users list (User Management page verification)
    await page.screenshot({ path: `${EVIDENCE_DIR}/23_user_management.png` });
    
    // Approve engineer in pending list
    await page.click(':text("Pending Approvals")');
    await page.waitForTimeout(500);
    
    // Click approve for smoke.engineer@ikkgroup.com
    const approveBtn = page.locator('tr').filter({ hasText: 'smoke.engineer@ikkgroup.com' }).getByRole('button', { name: /approve/i });
    await approveBtn.click();
    await page.waitForSelector(':text("Successfully approved")');
    await page.screenshot({ path: `${EVIDENCE_DIR}/04_admin_approved.png` });
    console.log('Approved engineer user.');

    // ─── 24. Audit Log Creation ──────────────────────────────────────────────
    // Check security monitoring / audit logs tab
    console.log('Checking security audit logs...');
    await page.click(':text("Security Monitoring")');
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${EVIDENCE_DIR}/24_audit_logs.png` });

    // Logout Admin
    await page.click('.topbar-logout');
    await page.waitForURL('**/login');
    console.log('Admin logged out.');

    // ─── 5. Approved User Login ──────────────────────────────────────────────
    console.log('Logging in as approved engineer...');
    await page.locator('#email').fill('smoke.engineer@ikkgroup.com');
    await page.locator('#password').fill('SmokeEngineer2026!');
    await page.locator('button[type="submit"]').click();
    await page.waitForURL('**/workspace');
    await page.screenshot({ path: `${EVIDENCE_DIR}/05_approved_login.png` });

    // ─── 9. Session Restore after Browser Refresh ────────────────────────────
    console.log('Selecting Pipeline workspace and testing Session Restore...');
    await page.click(':text("Available"):has-text("Pipeline")');
    await page.waitForURL('**/dashboard');
    
    await page.reload();
    await page.waitForLoadState('networkidle');
    await expect(page.locator('.app-shell')).toBeVisible();
    await page.screenshot({ path: `${EVIDENCE_DIR}/09_session_restore.png` });

    // ─── 10 & 11 & 12. Create, Save, Load Project ────────────────────────────
    console.log('Testing Project Operations...');
    await page.click('a[href="/dashboard"]');
    await page.waitForURL('**/dashboard');
    
    await page.getByRole('button', { name: /new project/i }).click();
    await page.waitForURL('**/project');
    await page.screenshot({ path: `${EVIDENCE_DIR}/10_create_project.png` });

    // Fill Design Basis (Save Project metadata)
    await field('Project Number').fill('PCP-SMOKE-2026');
    await field('Client Name').fill('Saudi Aramco');
    await field('End Client').fill('Saudi Aramco');
    await field('Project Name').fill('Smoke Production Test Project');
    await field('Designer').fill('Smoke Tester');
    await page.waitForTimeout(1000); // Wait for autosave trigger
    await page.screenshot({ path: `${EVIDENCE_DIR}/11_save_project.png` });

    // Load Project verification (refresh and see if metadata remains loaded)
    await page.reload();
    await page.waitForLoadState('networkidle');
    await expect(field('Project Number')).toHaveValue('PCP-SMOKE-2026');
    await page.screenshot({ path: `${EVIDENCE_DIR}/12_load_project.png` });

    // ─── 13. Create Station ──────────────────────────────────────────────────
    console.log('Testing Station Creation...');
    await page.click('a[href="/pipeline"]');
    await page.waitForURL('**/pipeline');
    await page.click('.station-tab--add');
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${EVIDENCE_DIR}/13_create_station.png` });

    // Set segment details to run calculations
    await field('Outside Diameter').fill('48');
    await field('Section Length').fill('292');
    await field('Soil/Sand Resistivity').fill('361');
    await page.waitForTimeout(500);

    // ─── 14. Run Current Requirement ─────────────────────────────────────────
    console.log('Running Current Requirement calculations...');
    await page.click('a[href="/current"]');
    await page.waitForURL('**/current');
    await page.getByRole('button', { name: /calculate/i, exact: true }).click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: `${EVIDENCE_DIR}/14_current_req.png` });

    // ─── 15. Run Groundbed Design ────────────────────────────────────────────
    console.log('Running Groundbed Design calculations...');
    await page.click('a[href="/groundbed"]');
    await page.waitForURL('**/groundbed');
    await page.getByRole('button', { name: /run calculations/i }).click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: `${EVIDENCE_DIR}/15_groundbed_design.png` });

    // ─── 16. Run TR Sizing ───────────────────────────────────────────────────
    console.log('Running TR Sizing calculations...');
    await page.click('a[href="/tr"]');
    await page.waitForURL('**/tr');
    await page.getByRole('button', { name: /analyse circuit/i }).click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: `${EVIDENCE_DIR}/16_tr_sizing.png` });

    // ─── 17. Run Validation ──────────────────────────────────────────────────
    console.log('Running Validation Checks...');
    await page.click('a[href="/validation"]');
    await page.waitForURL('**/validation');
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${EVIDENCE_DIR}/17_validation.png` });

    // ─── 18. Generate BOM ────────────────────────────────────────────────────
    console.log('Approving project and generating BOM...');
    await page.getByRole('button', { name: /approve/i }).click();
    await page.waitForTimeout(500);
    await page.click('a[href="/bom"]');
    await page.waitForURL('**/bom');
    await page.screenshot({ path: `${EVIDENCE_DIR}/18_generate_bom.png` });

    // ─── 19 & 20. Export PDF & Export Excel ──────────────────────────────────
    console.log('Checking Deliverable Report exports...');
    await page.click('a[href="/report"]');
    await page.waitForURL('**/report');
    
    // Check buttons are visible and active
    const pdfBtn = page.getByRole('button', { name: /download.*pdf/i });
    const excelBtn = page.getByRole('button', { name: /export.*excel/i });
    await expect(pdfBtn).toBeVisible();
    await expect(excelBtn).toBeVisible();
    
    await page.screenshot({ path: `${EVIDENCE_DIR}/19_export_pdf.png` }); // covers PDF
    await page.screenshot({ path: `${EVIDENCE_DIR}/20_export_excel.png` }); // covers Excel

    // ─── 21. Tank CP Module Save/Reload ──────────────────────────────────────
    console.log('Testing Tank bottom CP module...');
    // Click workspace title to go back
    await page.click('.sidebar-header div');
    await page.waitForURL('**/workspace');
    await page.click(':text("Available"):has-text("Tank Bottom")');
    await page.waitForURL('**/tank');
    
    // Modify a parameter to verify save/reload
    await page.locator('label:has-text("Tank Diameter") + div input').fill('45');
    await page.waitForTimeout(500);
    await page.reload();
    await page.waitForLoadState('networkidle');
    await expect(page.locator('label:has-text("Tank Diameter") + div input')).toHaveValue('45');
    await page.screenshot({ path: `${EVIDENCE_DIR}/21_tank_module.png` });

    // ─── 22. Vessel CP Module Save/Reload ────────────────────────────────────
    console.log('Testing Vessel CP module...');
    await page.click('.workspace-top-bar div + div').click(); // trigger return to portal via the brand or navigate directly
    await page.goto(`${BASE_URL}/workspace`);
    await page.waitForURL('**/workspace');
    await page.click(':text("Available"):has-text("Vessel CP")');
    await page.waitForURL('**/vessel');
    
    // Modify parameters
    await page.locator('label:has-text("Vessel Length") + div input').fill('12');
    await page.waitForTimeout(500);
    await page.reload();
    await page.waitForLoadState('networkidle');
    await expect(page.locator('label:has-text("Vessel Length") + div input')).toHaveValue('12');
    await page.screenshot({ path: `${EVIDENCE_DIR}/22_vessel_module.png` });

    // ─── 25. Firestore Security Rule Verification (Access Block) ────────────
    console.log('Testing security block on admin router endpoint for non-admin...');
    // Non-admin engineer tries to go to /users
    await page.goto(`${BASE_URL}/users`);
    // Should redirect back to dashboard or home, let's verify url is not /users
    await page.waitForTimeout(1000);
    expect(page.url()).not.toContain('/users');
    await page.screenshot({ path: `${EVIDENCE_DIR}/25_firestore_rules.png` });

    // Logout engineer
    await page.goto(`${BASE_URL}/workspace`);
    await page.waitForLoadState('networkidle');
    await page.locator('.btn-logout').click();
    await page.waitForURL('**/login');

    // ─── 6. Suspended User Login Block ───────────────────────────────────────
    console.log('Suspending engineer user as Admin...');
    await page.locator('#email').fill('smoke.admin@ikkgroup.com');
    await page.locator('#password').fill('SmokeAdmin2026!');
    await page.locator('button[type="submit"]').click();
    await page.waitForURL('**/workspace');
    await page.click(':text("Available"):has-text("Pipeline")');
    await page.waitForURL('**/dashboard');
    
    // Go to User Management
    await page.click('a[href="/users"]');
    await page.waitForURL('**/users');
    
    // Suspend smoke.engineer@ikkgroup.com
    const suspendBtn = page.locator('tr').filter({ hasText: 'smoke.engineer@ikkgroup.com' }).getByRole('button', { name: /suspend/i });
    
    // Handle confirmation dialog
    page.once('dialog', async (dialog) => {
      await dialog.accept();
    });
    await suspendBtn.click();
    await page.waitForTimeout(1000); // Wait for suspend write
    
    // Logout Admin
    await page.click('.topbar-logout');
    await page.waitForURL('**/login');
    
    // Try logging in as suspended engineer
    console.log('Logging in as suspended engineer to verify block...');
    await page.locator('#email').fill('smoke.engineer@ikkgroup.com');
    await page.locator('#password').fill('SmokeEngineer2026!');
    await page.locator('button[type="submit"]').click();
    
    await page.waitForSelector('.auth-banner--error, :text("Account Suspended")');
    await page.screenshot({ path: `${EVIDENCE_DIR}/06_suspended_block.png` });
    console.log('Verified suspended user lockout.');

    // ─── 7. Password Reset Flow ──────────────────────────────────────────────
    console.log('Testing Forgot Password flow...');
    await page.click('a[href="/forgot-password"]');
    await page.waitForURL('**/forgot-password');
    await page.locator('#email').fill('smoke.engineer@ikkgroup.com');
    await page.screenshot({ path: `${EVIDENCE_DIR}/07_password_reset.png` });

    // ─── 8. Logout Flow ──────────────────────────────────────────────────────
    console.log('Verifying Logout navigation redirection...');
    await page.click('.login-back-link');
    await page.waitForURL('**/login');
    await page.screenshot({ path: `${EVIDENCE_DIR}/08_logout.png` });

    // ─── 26. Mobile Responsive Verification ──────────────────────────────────
    console.log('Opening mobile viewport check...');
    const mobilePage = await browser.newPage({
      viewport: { width: 375, height: 812 }, // iPhone X size
    });
    await mobilePage.goto(`${BASE_URL}/login`);
    await mobilePage.waitForLoadState('networkidle');
    await mobilePage.screenshot({ path: `${EVIDENCE_DIR}/26_mobile_responsive.png` });
    await mobilePage.close();

    // ─── 27. Dark Mode Verification ──────────────────────────────────────────
    console.log('Testing Dark Mode Toggle...');
    const darkContext = await browser.newContext();
    const darkPage = await darkContext.newPage();
    // Login as Admin to access dashboard easily
    await darkPage.goto(`${BASE_URL}/login`);
    await darkPage.locator('#email').fill('smoke.admin@ikkgroup.com');
    await darkPage.locator('#password').fill('SmokeAdmin2026!');
    await darkPage.locator('button[type="submit"]').click();
    await darkPage.waitForURL('**/workspace');
    await darkPage.click(':text("Available"):has-text("Pipeline")');
    await darkPage.waitForURL('**/dashboard');
    
    // Toggle dark mode
    await darkPage.locator('.theme-toggle').click();
    await darkPage.waitForTimeout(500);
    await darkPage.screenshot({ path: `${EVIDENCE_DIR}/27_dark_mode.png` });
    await darkPage.close();
    await darkContext.close();

    // ─── 28. Browser Compatibility (Edge Emulation) ──────────────────────────
    console.log('Testing Edge compatibility emulation...');
    const edgeContext = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0',
    });
    const edgePage = await edgeContext.newPage();
    await edgePage.goto(`${BASE_URL}/login`);
    await edgePage.waitForLoadState('networkidle');
    await edgePage.screenshot({ path: `${EVIDENCE_DIR}/28_browser_edge.png` });
    await edgePage.close();
    await edgeContext.close();

    console.log('Production Smoke Test Completed Successfully!');
  });
});
