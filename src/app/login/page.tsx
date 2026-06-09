'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Shield, AlertCircle, Loader2 } from 'lucide-react';
import styles from '../auth.module.css';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Login failed');
      }

      if (data.mfaRequired) {
        router.push('/login/mfa');
      } else {
        router.push('/dashboard');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={`${styles.authCard} glass`}>
        <div className={styles.header}>
          <div className={styles.logo}>
            <Shield className={styles.logoIcon} size={28} />
            <span>Urithi<span style={{ color: 'var(--accent-gold)' }}>Vault</span></span>
          </div>
          <h2 className={styles.title}>Welcome Back</h2>
          <p className={styles.sub}>Enter your credentials to access your vault</p>
        </div>

        {error && (
          <div className={styles.alertError} style={{ marginBottom: '20px' }}>
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <form className={styles.form} onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@domain.com"
              required
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              disabled={loading}
            />
          </div>

          <button type="submit" className={styles.submitBtn} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="animate-spin" size={18} />
                Accessing Vault...
              </>
            ) : (
              'Unlock Vault'
            )}
          </button>
        </form>

        <div className={styles.footer}>
          New to UrithiVault?{' '}
          <Link href="/register" className={styles.link}>
            Create Vault
          </Link>
        </div>
      </div>
    </div>
  );
}
