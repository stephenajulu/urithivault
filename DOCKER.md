# UrithiVault: Docker Deployment Guide

This document describes how to containerize and run the **UrithiVault** application and database services using **Docker** and **Docker Compose**.

---

## 1. Prerequisites

Make sure you have the following installed on your machine:
* **Docker Desktop** (Mac/Windows/Linux)
* **Docker Compose** (included with Docker Desktop)

---

## 2. Docker Architecture

The project features a multi-container architecture containing:
1. **`web` Service:** Next.js application built from a lightweight alpine base. Outputs standalone Node bundles for optimized performance.
2. **`db` Service:** PostgreSQL database service containerized using Alpine. Features automatic health checks using `pg_isready` before starting the web application.

---

## 3. Step-by-Step running Instructions

To build, configure, and start the application stack, execute the following commands in your shell:

1. **Verify Root Config Files:**
   Ensure [`Dockerfile`](./Dockerfile) and [`docker-compose.yml`](./docker-compose.yml) are present in the project root.

2. **Build and Start Containers:**
   Run the following command to compile the codebase and spin up the database/web server:
   ```bash
   docker-compose up --build -d
   ```
   *The `-d` flag runs the containers in detached (background) mode.*

3. **Check Container Status:**
   Verify that all services are healthy and running:
   ```bash
   docker-compose ps
   ```

4. **Synchronize the Database Schema (Prisma):**
   Since the database is running inside the container network, run Prisma schema migrations within the active `web` container context:
   ```bash
   docker-compose exec web npx prisma db push
   ```

5. **Access the Application:**
   Open your browser and navigate to **`http://localhost:3000`**.

---

## 4. Environment Variables Configuration

You can configure environment variables directly inside the [`docker-compose.yml`](./docker-compose.yml) file or link a `.env` file using the `env_file` parameter.

```yaml
services:
  web:
    environment:
      - DATABASE_URL=postgresql://postgres:postgrespassword@db:5432/urithivault?sslmode=disable
      - JWT_SECRET=change-this-to-something-secure-for-production
      - CRON_SECRET=custom-cron-authorization-secret
      - NODE_ENV=production
```

---

## 5. Docker CLI Command Cheat Sheet

| Command | Action |
| :--- | :--- |
| `docker-compose up -d` | Start containers in the background |
| `docker-compose down` | Stop and remove active containers |
| `docker-compose down -v` | Stop containers and **delete database volumes** (cleans database) |
| `docker-compose logs -f` | Tail active logging outputs for debugging |
| `docker-compose logs -f web` | Tail only web container logs |
| `docker-compose exec web sh` | Open a shell interface inside the running Next.js container |
