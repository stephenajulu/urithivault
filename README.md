# UrithiVault: Zero-Knowledge Digital Inheritance & Legacy Continuity Registry

UrithiVault is a secure, legally compliant digital inheritance registry and continuity vault. It ensures that critical assets (bank accounts, land parcel coordinates, SACCO listings, investment Chamas) and personal video messages are safely transferred to designated heirs upon verified triggers (death, disability, or incapacitation).

Designed on **Zero-Knowledge Multi-Key Enveloped Cryptography**, the server never learns the owner's master password, security PIN, or the unencrypted vault data.

---

## ── Key Features ──

* **Zero-Knowledge Client-Side Encryption:** All vault holdings are encrypted in the owner's browser using AES-256-GCM.
* **14-Day Escrow Cooldown (Proof of Life):** When a claim is filed, the owner receives daily automated SMS, email, and voice calls. The owner can cancel the claim with a single-tap "Proof of Life" button. If the timer expires without a response, the specific keys unlock for designated heirs.
* **Kenya-Specific Form Wizards:** Custom cataloging for financial assets, title deeds (with registry coordinates), SACCO shares (e.g., Stima, Harambee), investment Chamas, M-Pesa records, and wills.
* **Legacy Media Storage:** Record custom video messages or upload deeds/wills. Files are encrypted browser-side and streamed to storage, decrypting only after claim approval.
* **Paystack Subscription Gating:** Subscription tiers (Basic, Premium, Enterprise) integrated via Paystack checkout and verified webhook processes.
* **Trustee Verification Portal:** Designated verifiers (doctors, lawyers) can review submitted claims and manually approve/reject them.
* **GDPR/KDPA Compliance Tools:** One-click decrypted JSON vault export and absolute account purging (cryptographic VDK shredding).

---

## ── Technology Stack ──

* **Core Framework:** Next.js App Router (React, serverless API endpoints, edge proxies).
* **Database & ORM:** PostgreSQL Database and Prisma ORM.
* **Storage:** AWS S3 / Cloudflare R2 (S3-compatible API).
* **Payment Processing:** Paystack API & Webhooks.
* **Security & Auth:** Web Crypto API (PBKDF2 key derivation & AES-GCM), JWT session cookies, and TOTP Multi-Factor Authentication.
* **Styling:** Vanilla CSS modules (dark-gold theme, glassmorphic grids, responsive tables).

---

## ── Project Documentation Portal ──

To configure, run, and deploy UrithiVault, select the appropriate guide:

### ⚙️ [Local Development Guide](./DEVELOPMENT.md)
*Local setup, local database configuration, and step-by-step testing workflows.*

### 🐳 [Docker Containerization Guide](./DOCKER.md)
*Spin up UrithiVault and PostgreSQL services in isolated Docker containers with automated health checks.*

### 🚀 [Production Deployment Guide](./PRODUCTION.md)
*AWS S3 buckets setup, S3 CORS regulations, managed database connections, Nginx SSL reverse proxies, and Vercel Cron schedulers.*
