# UrithiVault: Local Development Guide

This document contains step-by-step instructions for running, testing, and verifying the **UrithiVault** application locally.

---

## 1. Prerequisites

Before running the application, make sure you have the following installed:
* **Node.js:** v18.x or v20.x
* **NPM:** v9.x or higher
* **PostgreSQL:** Local server running (e.g., via Docker, Homebrew, or pgAdmin)

---

## 2. Configuration & Secrets Setup

1. **Create Environment Configuration:**
   Verify or create a `.env` file in the project root:
   ```env
   # PostgreSQL database url (swap user, password, host, port, and database name as needed)
   DATABASE_URL="postgresql://postgres:postgrespassword@localhost:5432/urithivault"

   # Session secret (any secure 32+ character string)
   JWT_SECRET="local-development-session-jwt-signing-secret"

   # Cron endpoint authorization token (arbitrary bypass string for testing)
   CRON_SECRET="local-cron-bypass-key"

   # Paystack Keys (optional: if omitted, billing automatically operates in mock sandbox mode)
   PAYSTACK_SECRET_KEY=""
   PAYSTACK_PUBLIC_KEY=""
   ```

2. **Generate Database Schema & Prisma Client:**
   Run the following commands to synchronize the PostgreSQL database and compile type declarations locally:
   ```bash
   # Push schema to database
   npx prisma db push

   # Generate Prisma client declarations offline
   npx prisma generate
   ```

---

## 3. Running the Dev Server

Start the Next.js development server:
```bash
npm run dev
```

Navigate your browser to **`http://localhost:3000`**.

---

## 4. Local Integration Testing Workflow

To verify all components (Zero-Knowledge setups, claimants, cooldowns, and overrides), perform the following testing sequence:

### Step A: Initialize Owner Vault
1. Go to `/register` and sign up as an **Owner** (e.g., `test-owner@vault.com`).
2. Set a **6-digit Security PIN** (e.g., `123456`). This PIN derives the Vault Data Key (VDK) client-side and is never sent to the server.
3. Log in and enter the PIN to open your vault.
4. Add sample assets:
   * **Financial Accounts:** NCBA Bank.
   * **Properties & Land:** Title deed coordinates.
5. Upgrade to Premium: Click *Upgrade to Premium* (since no Paystack keys are set, it completes automatically).
6. Upload a secure file/video: Click *Record Message* and upload a dummy file. It is encrypted in the browser and stored.

### Step B: Nominate Heir
1. Click **Nominate Heir** in the sidebar.
2. Enter email: `test-heir@vault.com`.
3. Set passcode: `heirpass123`.
4. Check the boxes to map NCBA Bank and your uploaded file. Submit.

### Step C: Initiate Claim (Heir Portal)
1. Go to `/register` and register as a **Beneficiary** with the email `test-heir@vault.com`.
2. Go to the dashboard. You will see the **Claimant Portal**.
3. Under *Initiate Claim Request*, enter the owner's email `test-owner@vault.com` and upload a dummy PDF document. Submit.
4. The **14-day Escrow Cooldown** begins counting down.

### Step D: Proof of Life (Cancellation)
* To test the owner's capability to disprove claims:
  1. Log back in as `test-owner@vault.com` (Owner).
  2. Notice the prominent warning alert banner.
  3. Click **Cancel Claim & Verify Proof of Life**. The claim status becomes `cancelled`.

### Step E: Trustee/Admin Approval
* To test bypassing the cooldown as a verifier:
  1. Re-submit the claim under `test-heir@vault.com` (Heir) to start the timer.
  2. Register a new user as `admin@vault.com` and change their role directly in the PostgreSQL database `User` table to `admin`.
  3. Go to `http://localhost:3000/admin`.
  4. Under *Submitted Inheritance Claims*, click **Approve claim (Unlock)**.

### Step F: Recover Assets
1. Log back in as `test-heir@vault.com` (Heir).
2. The claim status now displays as `approved`.
3. Enter `heirpass123` passcode. Click **Decrypt Heritage Vault**.
4. The system derives the keys, decrypts the VDK share, and displays the decrypted NCBA Bank details.
5. Click **Decrypt Document File** next to the uploaded attachment. The client fetches the encrypted block, decrypts it locally, and prompts a download.
