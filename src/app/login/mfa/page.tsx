'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, AlertCircle, Loader2, KeyRound } from 'lucide-react';
import styles from '../../auth.module.css';

export default function MfaLogin() {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/mfa/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Verification failed');
      }

      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'An error occurred during MFA verification');
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
          <h2 className={styles.title}>Secure Login</h2>
          <p className={styles.sub}>Enter the 6-digit code from your authenticator app</p>
        </div>

        {error && (
          <div className={styles.alertError} style={{ marginBottom: '20px' }}>
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <form className={styles.form} onSubmit={handleSubmit}>
          <div className="form-group" style={{ alignItems: 'center' }}>
            <KeyRound size={32} style={{ color: 'var(--accent-gold)', marginBottom: '10px' }} />
            <label className="form-label" style={{ textAlign: 'center' }}>Verification Code</label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000 000"
              required
              disabled={loading}
              style={{
                textAlign: 'center',
                fontSize: '1.5rem',
                letterSpacing: '0.3em',
                maxWidth: '240px',
                padding: '12px',
              }}
            />
          </div>

          <button type="submit" className={styles.submitBtn} disabled={loading || code.length !== 6}>
            {loading ? (
              <>
                <Loader2 className="animate-spin" size={18} />
                Verifying Code...
              </>
            ) : (
              'Verify & Open Vault'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
