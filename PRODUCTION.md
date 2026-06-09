# UrithiVault: Production Deployment Guide

This document details the configuration requirements, cloud infrastructure provisioning, and deployment pathways for launching **UrithiVault** into production.

---

## 1. Cloud Infrastructure Provisioning

Verify the following services are active before beginning deployment:

### A. Managed PostgreSQL Database
* **Recommended Options:** AWS RDS PostgreSQL, Supabase (Paid/Pro tier), Neon Serverless PostgreSQL, or Google Cloud SQL.
* **Security:** Enforce SSL connection (`sslmode=require`). Enable data-at-rest encryption (KMS).

### B. Object Storage (S3-compatible)
* **Recommended Options:** AWS S3 Bucket, Cloudflare R2 (recommended for zero-egress video streaming), or Supabase Storage.
* **Security:** Private bucket. Disable all public access rules.

### C. Paystack Payments Account
* **Prerequisites:** Register a verified Paystack merchant account.
* **Mode:** Switch environment key configuration from Test keys to Live keys.

---

## 2. Environment Variables reference

Configure the following variables in your hosting provider's admin panel:

| Key | Purpose | Format / Example |
| :--- | :--- | :--- |
| `DATABASE_URL` | Pooled connection string to production PostgreSQL | `postgresql://user:pass@host:5432/db?sslmode=require` |
| `JWT_SECRET` | 32+ character high-entropy key for session JWTs | Generate via `openssl rand -hex 32` |
| `CRON_SECRET` | Secret token to secure `/api/cron/escrow` endpoint | Custom secure string |
| `PAYSTACK_SECRET_KEY` | Paystack Live Secret API Key | `sk_live_...` |
| `PAYSTACK_PUBLIC_KEY` | Paystack Live Public API Key | `pk_live_...` |
| `AWS_ACCESS_KEY_ID` | IAM User access key with S3 PutObject / GetObject rights | `AKIA...` |
| `AWS_SECRET_ACCESS_KEY` | IAM User secret key | `wJalrXUtn...` |
| `AWS_REGION` | AWS Bucket Region | `eu-west-1` (or `auto` for Cloudflare R2) |
| `AWS_S3_BUCKET_NAME` | Storage bucket name | `urithivault-production-storage` |
| `NODE_ENV` | Mode of runtime | `production` |

---

## 3. Database Deployment Pipeline

Do **not** use `prisma db push` in production. Always run the migration deployment runner to keep schema migrations synchronized without data loss risks.

Add this command to your deployment pre-build phase:
```bash
npx prisma migrate deploy
```

---

## 4. AWS S3 CORS Configuration

Because document uploads and video recordings are encrypted directly in the owner's browser before being sent to your bucket, you must configure Cross-Origin Resource Sharing (CORS) rules.

In the **S3 Bucket Properties > Permissions > CORS**, paste:

```json
[
  {
    "AllowedHeaders": [
      "*"
    ],
    "AllowedMethods": [
      "PUT",
      "POST",
      "GET"
    ],
    "AllowedOrigins": [
      "https://urithivault.com",
      "https://www.urithivault.com"
    ],
    "ExposeHeaders": [
      "ETag"
    ],
    "MaxAgeSeconds": 3000
  }
]
```

---

## 5. Deployment Options

### Option A: Deployment to Vercel (Recommended)

Vercel provides native optimizations for Next.js App Router applications.

1. Install Vercel CLI and run login:
   ```bash
   npm install -g vercel
   vercel login
   ```
2. Link your repository and provision the environment:
   ```bash
   vercel
   ```
3. Set your production domain in the dashboard settings and route CNAME/A records through your registrar.

### Option B: Deployment to VPS (Nginx, PM2, SSL)

For private servers (AWS EC2, DigitalOcean, Linode):

1. **Build the Standalone Next.js Bundle:**
   Ensure `output: "standalone"` is configured in `next.config.ts` (configured by default).
2. **Build and Run Application:**
   ```bash
   npm ci
   npx prisma generate
   npx prisma migrate deploy
   npm run build
   pm2 start npm --name "urithivault" -- run start
   pm2 save
   ```
3. **Configure Nginx Site Config (`/etc/nginx/sites-available/urithivault`):**
   ```nginx
   server {
       listen 80;
       server_name urithivault.com www.urithivault.com;

       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded-for;
           proxy_set_header X-Forwarded-Proto $scheme;
       }
   }
   ```
4. **Link Configuration & Apply SSL via Certbot:**
   ```bash
   sudo ln -s /etc/nginx/sites-available/urithivault /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl restart nginx
   sudo apt install -y certbot python3-certbot-nginx
   sudo certbot --nginx -d urithivault.com -d www.urithivault.com
   ```

---

## 6. Automated Escrow Warning Cron Setup

UrithiVault features a secure automatic check to warning-route claims and process cooldown completions:

1. **Config Vercel Cron:** The system includes a [`vercel.json`](./vercel.json) file that maps the escrow cron API endpoint `/api/cron/escrow` to a daily run schedule (`0 0 * * *`).
2. **Secure webhook:** Ensure `CRON_SECRET` is added to your environment variables. Vercel automatically passes `Authorization: Bearer ${CRON_SECRET}` during cron invocation, preventing public abuse of the API.
3. **Webhook Callback URL (Paystack):** Add `https://yourdomain.com/api/billing/webhook` to the Paystack dashboard webhook list.

---

## 7. Security Hardening & Regulatory Audits

* **HSTS Configuration:** Force strict HTTPS redirection and configure HSTS response headers in the server config.
* **Zero-Knowledge Cryptographic Shredding:** To satisfy GDPR/KDPA "Right to Erasure" requirements, our `/api/auth/purge` endpoint deletes the owner's `encryptedVdk` key wrapping. Because the database records are encrypted client-side using a key derived from this master PIN/VDK combination, deleting this metadata guarantees absolute unrecoverability.
* **Rate Limiting:** Protect registration, login, and claims routes from brute-forcing by configuring rate limiting filters (via Cloudflare proxies or Edge middleware routing).
