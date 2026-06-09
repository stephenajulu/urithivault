'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Shield, 
  Users, 
  FileText, 
  Loader2, 
  LogOut, 
  User, 
  ShieldAlert, 
  Clock, 
  Check, 
  X,
  Search,
  Key
} from 'lucide-react';
import styles from './admin.module.css';

interface UserRecord {
  id: string;
  email: string;
  role: string;
  subscriptionTier: string;
  subscriptionStatus: string;
  createdAt: string;
}

interface ClaimRecord {
  id: string;
  userId: string;
  user?: { email: string };
  claimantId: string;
  claimant?: { email: string };
  status: string;
  proofDocumentUrl: string | null;
  cooldownStarts: string;
  cooldownEnds: string;
  createdAt: string;
}

export default function AdminDashboard() {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [claims, setClaims] = useState<ClaimRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [adminUser, setAdminUser] = useState<any>(null);
  
  // Override console states
  const [targetEmail, setTargetEmail] = useState('');
  const [proofUrl, setProofUrl] = useState('');
  const [overrideLoading, setOverrideLoading] = useState(false);
  const [overrideError, setOverrideError] = useState('');
  const [overrideSuccess, setOverrideSuccess] = useState('');

  // Action loaders
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});

  const router = useRouter();

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (!res.ok) throw new Error('Unauthorized');
      const data = await res.json();
      
      if (data.user.role !== 'admin') {
        router.push('/dashboard');
        return;
      }
      
      setAdminUser(data.user);
      await Promise.all([fetchUsers(), fetchClaims()]);
    } catch (err) {
      router.push('/login');
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/admin/users');
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchClaims = async () => {
    try {
      const res = await fetch('/api/claims/list');
      if (res.ok) {
        const data = await res.json();
        setClaims(data.claims || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
    } catch (err) {
      console.error(err);
    }
  };

  const handleAdminVerify = async (claimId: string, action: 'approve' | 'reject') => {
    setActionLoading(prev => ({ ...prev, [claimId]: true }));
    try {
      const res = await fetch('/api/claims/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ claimId, action }),
      });
      if (res.ok) {
        await fetchClaims();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to verify claim');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(prev => ({ ...prev, [claimId]: false }));
    }
  };

  const handleTriggerOverride = async (e: React.FormEvent) => {
    e.preventDefault();
    setOverrideError('');
    setOverrideSuccess('');
    setOverrideLoading(true);

    try {
      const res = await fetch('/api/claims/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ownerEmail: targetEmail,
          proofDocumentUrl: proofUrl || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to trigger override');

      setOverrideSuccess(`Admin Override triggered for ${targetEmail}. Cooldown starts immediately.`);
      setTargetEmail('');
      setProofUrl('');
      await fetchClaims();
    } catch (err: any) {
      setOverrideError(err.message);
    } finally {
      setOverrideLoading(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <Loader2 className="animate-spin" size={36} style={{ color: 'var(--accent-gold)' }} />
        <span style={{ marginTop: '16px', color: 'var(--text-secondary)' }}>Decrypting Admin Core...</span>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.nav}>
          <div className={styles.logo}>
            <Shield className={styles.logoIcon} size={24} />
            <span>Urithi<span style={{ color: 'var(--accent-gold)' }}>Vault</span></span>
          </div>

          <div className={styles.userInfo}>
            <div className={styles.userBadge}>
              <User size={14} />
              <span>{adminUser?.email}</span>
              <span className={styles.roleLabel}>System Admin</span>
            </div>
            <button className={styles.logoutBtn} onClick={handleLogout}>
              <LogOut size={16} />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      <main className={styles.main}>
        {/* Welcome Section */}
        <section className={styles.adminHeader}>
          <div className={`${styles.adminStatsCard} glass`}>
            <div style={{ textAlign: 'left' }}>
              <span className={styles.levelBadge}>Admin Operations Console</span>
              <h2 className={styles.statsTitle}>UrithiVault Registry</h2>
              <p className={styles.statsDesc} style={{ margin: 0 }}>
                Manage user vaults, audit claims verification, and coordinate recovery actions.
              </p>
            </div>
          </div>
        </section>

        {/* Console Grid */}
        <div className={styles.adminGrid}>
          
          {/* User management and metrics */}
          <div className="glass" style={{ padding: '24px', borderRadius: '12px', border: '1px solid var(--border-color)', textAlign: 'left' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Users size={20} style={{ color: 'var(--accent-gold)' }} />
              <span>Active User Registry</span>
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '450px', overflowY: 'auto' }}>
              {users.map((user) => (
                <div key={user.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', borderRadius: '6px' }}>
                  <div>
                    <span style={{ fontSize: '0.85rem', fontWeight: 'bold', display: 'block', color: '#fff' }}>{user.email}</span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Registered: {new Date(user.createdAt).toLocaleDateString()}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.65rem', background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)', padding: '2px 6px', borderRadius: '4px' }}>
                      {user.role}
                    </span>
                    <span style={{ fontSize: '0.65rem', background: user.subscriptionTier === 'enterprise' ? 'rgba(197,160,89,0.1)' : 'rgba(255,255,255,0.03)', color: user.subscriptionTier === 'enterprise' ? 'var(--accent-gold)' : 'var(--text-secondary)', padding: '2px 6px', borderRadius: '4px', textTransform: 'uppercase' }}>
                      {user.subscriptionTier}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Admin Override Console */}
          <div className="glass" style={{ padding: '24px', borderRadius: '12px', border: '1px solid var(--border-color)', textAlign: 'left', height: 'fit-content' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShieldAlert size={20} style={{ color: 'var(--accent-danger)' }} />
              <span>Admin Override Recovery console</span>
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
              Decrypt the master recovery envelope to initiate a vault override claim. This automatically triggers a 14-day escrow warning cooldown for the owner.
            </p>

            {overrideError && (
              <div className={styles.alertError} style={{ marginBottom: '16px' }}>
                <span>{overrideError}</span>
              </div>
            )}

            {overrideSuccess && (
              <div style={{ padding: '12px', background: 'rgba(16,185,129,0.06)', border: '1px solid #10b981', color: '#10b981', borderRadius: '4px', fontSize: '0.8rem', marginBottom: '16px' }}>
                <span>{overrideSuccess}</span>
              </div>
            )}

            <form onSubmit={handleTriggerOverride} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div className="form-group">
                <label className="form-label">Vault Owner Email</label>
                <input
                  type="email"
                  value={targetEmail}
                  onChange={(e) => setTargetEmail(e.target.value)}
                  placeholder="user@domain.com"
                  required
                  style={{ width: '100%' }}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Proof of Override Request (e.g. Court Order Scan Link)</label>
                <input
                  type="text"
                  value={proofUrl}
                  onChange={(e) => setProofUrl(e.target.value)}
                  placeholder="https://docs.domain.com/court-order.pdf"
                  style={{ width: '100%' }}
                />
              </div>

              <button type="submit" className={styles.btnGold} disabled={overrideLoading} style={{ background: 'var(--accent-danger)', borderColor: 'var(--accent-danger)', color: '#fff', justifyContent: 'center', marginTop: '12px' }}>
                {overrideLoading ? <Loader2 className="animate-spin" size={18} /> : 'Decrypt & Trigger Vault Override'}
              </button>
            </form>
          </div>
        </div>

        {/* Global Vault Claims section */}
        <section className="glass" style={{ padding: '24px', borderRadius: '12px', border: '1px solid var(--border-color)', marginTop: '24px', textAlign: 'left' }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Clock size={20} style={{ color: 'var(--accent-gold)' }} />
            <span>Submitted Inheritance Claims</span>
          </h3>

          {claims.length === 0 ? (
            <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--text-muted)' }}>
              <FileText size={40} style={{ margin: '0 auto 12px auto', opacity: 0.15 }} />
              <p style={{ margin: 0 }}>No active vault claims logged.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {claims.map((claim) => (
                <div key={claim.id} style={{ padding: '16px', border: '1px solid var(--border-color)', borderRadius: '6px', background: 'rgba(255,255,255,0.01)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                  <div>
                    <strong style={{ fontSize: '0.9rem', color: '#fff', display: 'block' }}>Vault Owner: {claim.user?.email}</strong>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Filer: {claim.claimant?.email}</span>
                    <span style={{ fontSize: '0.75rem', display: 'block', color: 'var(--text-muted)', marginTop: '4px' }}>
                      Cooldown ends: {new Date(claim.cooldownEnds).toLocaleString()}
                    </span>
                  </div>

                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <span className={styles.roleLabel} style={{ background: claim.status === 'pending' ? 'var(--accent-gold)' : claim.status === 'approved' ? '#10b981' : 'var(--accent-danger)', color: '#000', fontSize: '0.65rem' }}>
                      {claim.status}
                    </span>

                    {claim.status === 'pending' && (
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          onClick={() => handleAdminVerify(claim.id, 'approve')}
                          disabled={actionLoading[claim.id]}
                          className={styles.btnGold}
                          style={{ padding: '6px 12px', fontSize: '0.75rem', background: '#10b981', borderColor: '#10b981', color: '#fff' }}
                        >
                          {actionLoading[claim.id] ? <Loader2 className="animate-spin" size={12} /> : 'Approve'}
                        </button>
                        <button
                          onClick={() => handleAdminVerify(claim.id, 'reject')}
                          disabled={actionLoading[claim.id]}
                          className={styles.btnCancel}
                          style={{ padding: '6px 12px', fontSize: '0.75rem', color: 'var(--accent-danger)', borderColor: 'var(--accent-danger)' }}
                        >
                          Reject
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
