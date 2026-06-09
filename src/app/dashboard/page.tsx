'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Shield, 
  ShieldCheck, 
  ShieldAlert, 
  Loader2, 
  LogOut, 
  User, 
  Users, 
  Video, 
  History,
  Building,
  Landmark,
  FileCheck,
  CheckCircle2,
  Lock,
  Plus,
  X,
  FileText,
  Coins,
  AlertCircle,
  VideoOff,
  Upload,
  UserPlus,
  Link2,
  Search,
  Download,
  AlertTriangle,
  Key,
  Check
} from 'lucide-react';
import { 
  generateVdk, 
  generateSalt, 
  deriveKeyFromPassword, 
  encryptPayload, 
  decryptPayload 
} from '@/lib/crypto';
import styles from './dashboard.module.css';

interface UserProfile {
  id: string;
  email: string;
  role: string;
  mfaEnabled: boolean;
  encryptedVdk: string | null;
  vdkSalt: string | null;
  subscriptionTier: string;
  subscriptionStatus: string;
  createdAt: string;
}

interface AssetRecord {
  id: string;
  category: string;
  metadataTags: string;
  encryptedPayload: string;
  createdAt: string;
}

interface BeneficiaryRecord {
  id: string;
  email: string;
  phone: string;
  relationship: string;
  accesses: Array<{
    assetId: string;
    encryptedShareKey: string;
  }>;
}

export default function Dashboard() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [assets, setAssets] = useState<AssetRecord[]>([]);
  const [beneficiaries, setBeneficiaries] = useState<BeneficiaryRecord[]>([]);
  const [decryptedAssets, setDecryptedAssets] = useState<Record<string, any>>({});
  const [claims, setClaims] = useState<any[]>([]);
  const [claimsLoading, setClaimsLoading] = useState(true);
  
  // Auth & Keys States
  const [loading, setLoading] = useState(true);
  const [mfaLoading, setMfaLoading] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [mfaSecret, setMfaSecret] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const [mfaError, setMfaError] = useState('');
  const [mfaSuccess, setMfaSuccess] = useState('');
  const [setupMode, setSetupMode] = useState(false);

  // Security Lock PIN states
  const [pinInput, setPinInput] = useState('');
  const [decryptedVdk, setDecryptedVdk] = useState('');
  const [pinError, setPinError] = useState('');
  const [vdkLoading, setVdkLoading] = useState(false);
  const [billingLoading, setBillingLoading] = useState(false);
  const [auditModalOpen, setAuditModalOpen] = useState(false);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loadingAudit, setLoadingAudit] = useState(false);
  const [isPurging, setIsPurging] = useState(false);

  // Asset Form Wizard states
  const [modalOpen, setModalOpen] = useState(false);
  const [modalCategory, setModalCategory] = useState<'financial' | 'land' | 'sacco' | 'document'>('financial');
  const [wizardStep, setWizardStep] = useState(1);
  const [formError, setFormError] = useState('');
  
  // Form Field States
  const [metadataTags, setMetadataTags] = useState('');
  
  // Bank fields
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [branch, setBranch] = useState('');
  const [currency, setCurrency] = useState('KES');
  
  // Land fields
  const [titleDeedNumber, setTitleDeedNumber] = useState('');
  const [parcelSize, setParcelSize] = useState('');
  const [registryOffice, setRegistryOffice] = useState('');
  const [physicalLocation, setPhysicalLocation] = useState('');

  // Sacco / Chama fields
  const [chamaName, setChamaName] = useState('');
  const [shareAmount, setShareAmount] = useState('');
  const [chamaAccount, setChamaAccount] = useState('');
  const [leaderContact, setLeaderContact] = useState('');

  // Wills / Docs fields
  const [docType, setDocType] = useState('will');
  const [hardcopyLocation, setHardcopyLocation] = useState('');
  const [lawyerName, setLawyerName] = useState('');
  const [lawyerContact, setLawyerContact] = useState('');

  // Beneficiary Management States
  const [beneficiaryModalOpen, setBeneficiaryModalOpen] = useState(false);
  const [beneficiaryEmail, setBeneficiaryEmail] = useState('');
  const [beneficiaryPhone, setBeneficiaryPhone] = useState('');
  const [beneficiaryRelationship, setBeneficiaryRelationship] = useState('');
  const [beneficiaryAccessCode, setBeneficiaryAccessCode] = useState('');
  const [selectedAssetIds, setSelectedAssetIds] = useState<string[]>([]);
  const [beneficiaryError, setBeneficiaryError] = useState('');

  // Video Message / File legacy states
  const [mediaModalOpen, setMediaModalOpen] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [recordedChunks, setRecordedChunks] = useState<Blob[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState('');
  const [legacyFile, setLegacyFile] = useState<File | null>(null);
  const [mediaError, setMediaError] = useState('');
  const [mediaUploadLoading, setMediaUploadLoading] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Gamification & Celebration states
  const [celebrate, setCelebrate] = useState(false);
  const [confettiElements, setConfettiElements] = useState<number[]>([]);

  const router = useRouter();

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (!res.ok) {
        throw new Error('Unauthorized');
      }
      const data = await res.json();
      setUser(data.user);
      
      if (data.user.role === 'owner') {
        fetchOwnerClaims();
      }

      // If VDK is already unlocked, refresh assets list & beneficiaries
      if (decryptedVdk) {
        fetchAssets();
        fetchBeneficiaries();
      }
    } catch (error) {
      router.push('/login');
    } finally {
      setLoading(false);
    }
  };

  const fetchOwnerClaims = async () => {
    try {
      const res = await fetch('/api/claims/list');
      if (res.ok) {
        const data = await res.json();
        setClaims(data.claims || []);
      }
    } catch (error) {
      console.error('Error fetching owner claims:', error);
    } finally {
      setClaimsLoading(false);
    }
  };

  const handleCancelClaim = async (claimId: string) => {
    try {
      setVdkLoading(true);
      const res = await fetch('/api/claims/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ claimId })
      });
      if (res.ok) {
        triggerCelebration();
        fetchOwnerClaims();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to cancel claim');
      }
    } catch (error) {
      console.error('Error cancelling claim:', error);
    } finally {
      setVdkLoading(false);
    }
  };

  const handleUpgradeSubscription = async (targetPlan: string) => {
    try {
      setBillingLoading(true);
      const res = await fetch('/api/billing/initialize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: targetPlan })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to initialize subscription');

      // Redirect to Paystack page (or mock handler URL)
      window.location.href = data.authorization_url;
    } catch (err: any) {
      alert("Upgrade Error: " + err.message);
    } finally {
      setBillingLoading(false);
    }
  };

  const fetchAuditLogs = async () => {
    try {
      setLoadingAudit(true);
      const res = await fetch('/api/audit-logs');
      if (res.ok) {
        const data = await res.json();
        setAuditLogs(data.auditLogs || []);
      }
    } catch (error) {
      console.error('Error fetching audit logs:', error);
    } finally {
      setLoadingAudit(false);
    }
  };

  const handlePurgeAccount = async () => {
    const doubleConfirm = confirm(
      "⚠️ WARNING: This action will instantly delete your account and all mapped assets. Under our zero-knowledge architecture, your Vault Data Key (VDK) is permanently destroyed (shredded) from our servers, rendering all data unrecoverable. Do you wish to continue?"
    );
    if (!doubleConfirm) return;

    try {
      setIsPurging(true);
      const res = await fetch('/api/auth/purge', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        alert("Success: Vault shredded and account purged.");
        router.push('/register');
      } else {
        alert(data.error || 'Failed to purge account');
      }
    } catch (error) {
      console.error('Purge error:', error);
    } finally {
      setIsPurging(false);
    }
  };

  const exportOwnerVaultData = () => {
    try {
      if (!decryptedVdk) {
        alert("Please unlock the vault first to export decrypted data.");
        return;
      }
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(decryptedAssets, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `urithivault-export-${user?.email}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      triggerCelebration();
    } catch (error) {
      alert("Failed to export vault data.");
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('payment_success') === 'true') {
        triggerCelebration();
        // Clean URL query params
        window.history.replaceState({}, document.title, window.location.pathname);
        // Refresh profile to update tier in UI
        fetchProfile();
      }
    }
  }, []);

  const fetchAssets = async () => {
    try {
      const res = await fetch('/api/assets/list');
      if (res.ok) {
        const data = await res.json();
        setAssets(data.assets);
      }
    } catch (error) {
      console.error('Error fetching assets:', error);
    }
  };

  const fetchBeneficiaries = async () => {
    try {
      const res = await fetch('/api/beneficiaries/list');
      if (res.ok) {
        const data = await res.json();
        setBeneficiaries(data.beneficiaries);
      }
    } catch (error) {
      console.error('Error fetching heirs:', error);
    }
  };

  // Trigger decryptions once assets and decryptedVdk are available
  useEffect(() => {
    if (assets.length > 0 && decryptedVdk) {
      decryptAllAssets();
    }
  }, [assets, decryptedVdk]);

  const decryptAllAssets = async () => {
    const decrypted: Record<string, any> = {};
    for (const asset of assets) {
      try {
        const decryptedStr = await decryptPayload(asset.encryptedPayload, decryptedVdk);
        decrypted[asset.id] = JSON.parse(decryptedStr);
      } catch (error) {
        console.error('Decryption failed for asset ID:', asset.id, error);
        decrypted[asset.id] = { error: 'Failed to decrypt' };
      }
    }
    setDecryptedAssets(decrypted);
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleSetupMfa = async () => {
    setMfaError('');
    setMfaSuccess('');
    setMfaLoading(true);
    try {
      const res = await fetch('/api/auth/mfa/setup', { method: 'POST' });
      if (!res.ok) throw new Error('Failed to generate MFA setup code');
      const data = await res.json();
      setQrCodeUrl(data.qrCodeUrl);
      setMfaSecret(data.secret);
      setSetupMode(true);
    } catch (error: any) {
      setMfaError(error.message);
    } finally {
      setMfaLoading(false);
    }
  };

  const handleVerifyMfa = async (e: React.FormEvent) => {
    e.preventDefault();
    setMfaError('');
    setMfaSuccess('');
    setMfaLoading(true);

    try {
      const res = await fetch('/api/auth/mfa/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code: mfaCode }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'MFA activation failed');

      setMfaSuccess('Multi-Factor Authentication enabled successfully!');
      setSetupMode(false);
      setQrCodeUrl('');
      setMfaSecret('');
      setMfaCode('');
      
      triggerCelebration();
      await fetchProfile();
    } catch (error: any) {
      setMfaError(error.message);
    } finally {
      setMfaLoading(false);
    }
  };

  // Gamification: Trigger micro-confetti reward
  const triggerCelebration = () => {
    setCelebrate(true);
    const elements = Array.from({ length: 40 }, (_, i) => i);
    setConfettiElements(elements);
    setTimeout(() => {
      setCelebrate(false);
      setConfettiElements([]);
    }, 2800);
  };

  // Setup Vault Password PIN (1st onboarding step)
  const handleSetupVdk = async (e: React.FormEvent) => {
    e.preventDefault();
    setPinError('');
    setVdkLoading(true);

    if (pinInput.length < 6) {
      setPinError('Security PIN must be exactly 6 digits.');
      setVdkLoading(false);
      return;
    }

    try {
      const salt = generateSalt();
      const derivedKey = await deriveKeyFromPassword(pinInput, salt);
      const vdk = generateVdk();
      const encryptedVdk = await encryptPayload(vdk, derivedKey);
      
      const res = await fetch('/api/auth/vdk/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ encryptedVdk, vdkSalt: salt }),
      });

      if (!res.ok) {
        throw new Error('Failed to initialize security shield. Try again.');
      }

      setDecryptedVdk(vdk);
      triggerCelebration();
      await fetchProfile();
      setPinInput('');
    } catch (err: any) {
      setPinError(err.message);
    } finally {
      setVdkLoading(false);
    }
  };

  // Unlock Vault using PIN
  const handleUnlockVdk = async (e: React.FormEvent) => {
    e.preventDefault();
    setPinError('');
    setVdkLoading(true);

    if (!user?.encryptedVdk || !user?.vdkSalt) {
      setPinError('Vault keys not initialized.');
      setVdkLoading(false);
      return;
    }

    try {
      const derivedKey = await deriveKeyFromPassword(pinInput, user.vdkSalt);
      const vdk = await decryptPayload(user.encryptedVdk, derivedKey);
      
      setDecryptedVdk(vdk);
      setPinInput('');
      
      // Fetch assets and beneficiaries immediately
      const resAssets = await fetch('/api/assets/list');
      if (resAssets.ok) {
        const data = await resAssets.json();
        setAssets(data.assets);
      }
      const resHeirs = await fetch('/api/beneficiaries/list');
      if (resHeirs.ok) {
        const data = await resHeirs.json();
        setBeneficiaries(data.beneficiaries);
      }
    } catch (err) {
      setPinError('Incorrect Security PIN. Decryption failed.');
    } finally {
      setVdkLoading(false);
    }
  };

  // Slide-over modals opening
  const openAssetModal = (category: typeof modalCategory) => {
    setModalCategory(category);
    setWizardStep(1);
    setFormError('');
    setMetadataTags('');
    
    // Clear form inputs
    setBankName(''); setAccountNumber(''); setBranch(''); setCurrency('KES');
    setTitleDeedNumber(''); setParcelSize(''); setRegistryOffice(''); setPhysicalLocation('');
    setChamaName(''); setShareAmount(''); setChamaAccount(''); setLeaderContact('');
    setDocType('will'); setHardcopyLocation(''); setLawyerName(''); setLawyerContact('');
    
    setModalOpen(true);
  };

  // Save asset (Zero-Knowledge, browser encrypts first)
  const handleSaveAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setVdkLoading(true);

    if (!decryptedVdk) {
      setFormError('Vault is locked. Unlock before writing.');
      setVdkLoading(false);
      return;
    }

    try {
      let payloadObj = {};
      if (modalCategory === 'financial') {
        payloadObj = { bankName, accountNumber, branch, currency };
      } else if (modalCategory === 'land') {
        payloadObj = { titleDeedNumber, parcelSize, registryOffice, physicalLocation };
      } else if (modalCategory === 'sacco') {
        payloadObj = { chamaName, shareAmount, chamaAccount, leaderContact };
      } else if (modalCategory === 'document') {
        payloadObj = { docType, hardcopyLocation, lawyerName, lawyerContact };
      }

      // 1. Encrypt payload client-side in browser before posting
      const encryptedPayload = await encryptPayload(JSON.stringify(payloadObj), decryptedVdk);

      // 2. Save via API
      const res = await fetch('/api/assets/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: modalCategory,
          metadataTags,
          encryptedPayload
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save asset record');

      setModalOpen(false);
      triggerCelebration();
      fetchAssets();
    } catch (error: any) {
      setFormError(error.message);
    } finally {
      setVdkLoading(false);
    }
  };

  // Nominate Beneficiary (Step-by-Step, Encrypting VDK with access code)
  const handleNominateBeneficiary = async (e: React.FormEvent) => {
    e.preventDefault();
    setBeneficiaryError('');
    setVdkLoading(true);

    if (!decryptedVdk) {
      setBeneficiaryError('Vault is locked. Unlock first.');
      setVdkLoading(false);
      return;
    }

    if (selectedAssetIds.length === 0) {
      setBeneficiaryError('Please select at least one asset to map to this heir.');
      setVdkLoading(false);
      return;
    }

    try {
      // 1. Derive key from the access code chosen for this beneficiary
      const beneficiarySalt = generateSalt();
      const derivedKey = await deriveKeyFromPassword(beneficiaryAccessCode, beneficiarySalt);

      // 2. Encrypt our master decrypted VDK using this derived key
      // We prefix the salt in plaintext so the heir can derive the decryption key client-side.
      const rawEncryptedShare = await encryptPayload(`${beneficiarySalt}:${decryptedVdk}`, derivedKey);
      const encryptedShareKey = `${beneficiarySalt}:${rawEncryptedShare}`;

      // 3. Save to API
      const res = await fetch('/api/beneficiaries/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: beneficiaryEmail,
          phone: beneficiaryPhone,
          relationship: beneficiaryRelationship,
          assetIds: selectedAssetIds,
          encryptedShareKey
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to register heir');

      setBeneficiaryModalOpen(false);
      setBeneficiaryEmail(''); setBeneficiaryPhone(''); setBeneficiaryRelationship(''); setBeneficiaryAccessCode('');
      setSelectedAssetIds([]);
      
      triggerCelebration();
      fetchBeneficiaries();
    } catch (err: any) {
      setBeneficiaryError(err.message);
    } finally {
      setVdkLoading(false);
    }
  };

  // Media Capture & Upload logic
  const startCamera = async () => {
    setMediaError('');
    setRecordedChunks([]);
    setVideoPreviewUrl('');
    try {
      const userStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setStream(userStream);
      if (videoRef.current) {
        videoRef.current.srcObject = userStream;
      }

      const recorder = new MediaRecorder(userStream, { mimeType: 'video/webm' });
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          setRecordedChunks((prev) => [...prev, e.data]);
        }
      };
      setMediaRecorder(recorder);
    } catch (err: any) {
      setMediaError('Failed to access camera/mic: ' + err.message);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  const startRecording = () => {
    if (mediaRecorder && mediaRecorder.state === 'inactive') {
      setRecordedChunks([]);
      mediaRecorder.start();
      setIsRecording(true);
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.stop();
      setIsRecording(false);
      stopCamera();
    }
  };

  useEffect(() => {
    if (recordedChunks.length > 0 && !isRecording) {
      const blob = new Blob(recordedChunks, { type: 'video/webm' });
      setVideoPreviewUrl(URL.createObjectURL(blob));
    }
  }, [recordedChunks, isRecording]);

  const handleSaveMedia = async (e: React.FormEvent) => {
    e.preventDefault();
    setMediaError('');
    setMediaUploadLoading(true);

    if (!decryptedVdk) {
      setMediaError('Vault is locked.');
      setMediaUploadLoading(false);
      return;
    }

    try {
      let fileData: ArrayBuffer;
      let filename = 'legacy-media';

      if (videoPreviewUrl && recordedChunks.length > 0) {
        const blob = new Blob(recordedChunks, { type: 'video/webm' });
        fileData = await blob.arrayBuffer();
        filename = 'video-message.webm';
      } else if (legacyFile) {
        fileData = await legacyFile.arrayBuffer();
        filename = legacyFile.name;
      } else {
        throw new Error('Please record a video or choose a file to upload.');
      }

      // Convert ArrayBuffer to Uint8Array for encryption
      const rawBytes = new Uint8Array(fileData);
      
      // Encrypt file bytes in the browser using VDK (AES-256-GCM)
      // Pack file metadata with the raw encrypted payload
      const fileBytesBase64 = btoa(
        Array.from(rawBytes)
          .map(val => String.fromCharCode(val))
          .join('')
      );
      
      const encryptedFilePayload = await encryptPayload(
        JSON.stringify({ filename, bytes: fileBytesBase64 }),
        decryptedVdk
      );

      // Upload encrypted payload as a file
      const encryptedBlob = new Blob([encryptedFilePayload], { type: 'application/octet-stream' });
      const formData = new FormData();
      formData.append('file', encryptedBlob, `${filename}.enc`);

      const uploadRes = await fetch('/api/storage/upload', {
        method: 'POST',
        body: formData,
      });

      const uploadData = await uploadRes.json();
      if (!uploadRes.ok) throw new Error(uploadData.error || 'Upload failed');

      // Save as Asset record in database
      const category = videoPreviewUrl ? 'video' : 'document';
      const metaTags = videoPreviewUrl ? 'Legacy Video Message' : `Encrypted Document: ${filename}`;

      const res = await fetch('/api/assets/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category,
          metadataTags: metaTags,
          encryptedPayload: await encryptPayload(
            JSON.stringify({ fileUrl: uploadData.fileUrl, filename }),
            decryptedVdk
          )
        }),
      });

      if (!res.ok) throw new Error('Failed to log asset payload');

      setMediaModalOpen(false);
      setRecordedChunks([]);
      setVideoPreviewUrl('');
      setLegacyFile(null);
      
      triggerCelebration();
      fetchAssets();
    } catch (err: any) {
      setMediaError(err.message);
    } finally {
      setMediaUploadLoading(false);
    }
  };

  // Toggle selection for checklist checkboxes
  const handleToggleAssetSelection = (id: string) => {
    setSelectedAssetIds((prev) => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  // Gamification: Calculate Legacy Completion Score
  const getLegacyScore = () => {
    let score = 0;
    if (user?.mfaEnabled) score += 15;
    if (user?.encryptedVdk) score += 15;
    
    // Count unique categories logged
    const uniqueCategories = new Set(assets.map(a => a.category));
    if (uniqueCategories.has('financial')) score += 20;
    if (uniqueCategories.has('land')) score += 20;
    
    // Check if recorded video or uploaded document messages exist
    const hasMedia = assets.some(a => a.category === 'video' || (a.category === 'document' && a.metadataTags.includes('Encrypted Document')));
    if (hasMedia) score += 10;

    // Check if heirs mapped
    if (beneficiaries.length > 0) score += 20;
    
    return Math.min(score, 100);
  };

  const legacyScore = getLegacyScore();

  // Get dynamic milestone title
  const getLegacyLevel = () => {
    if (legacyScore >= 100) return 'Legacy Architect (Grand Shield)';
    if (legacyScore >= 80) return 'Vault Guarded (Level 4)';
    if (legacyScore >= 50) return 'Vault Secured (Level 3)';
    if (legacyScore >= 30) return 'Shield Initiated (Level 2)';
    return 'Novice Guardian (Level 1)';
  };

  const getCategoryCount = (category: string) => {
    return assets.filter(a => a.category === category).length;
  };

  // Loading Screen
  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <Loader2 className="animate-spin" size={36} style={{ color: 'var(--accent-gold)' }} />
        <span style={{ marginTop: '16px', color: 'var(--text-secondary)' }}>Unlocking Security Layers...</span>
      </div>
    );
  }

  // Intercept other roles
  if (user && user.role === 'beneficiary') {
    return (
      <BeneficiaryDashboard 
        user={user} 
        handleLogout={handleLogout} 
        triggerCelebration={triggerCelebration} 
        celebrate={celebrate} 
        confettiElements={confettiElements} 
      />
    );
  }

  if (user && user.role === 'trustee') {
    return (
      <TrusteeDashboard 
        user={user} 
        handleLogout={handleLogout} 
        triggerCelebration={triggerCelebration} 
        celebrate={celebrate} 
        confettiElements={confettiElements} 
      />
    );
  }

  // --- CRYPTO INTERFACE 1: SETUP VAULT SECURITY KEY ---
  if (user && !user.encryptedVdk) {
    return (
      <div className={styles.unlockOverlay}>
        <div className={`${styles.unlockCard} glass`}>
          <div className={styles.header} style={{ marginBottom: '20px' }}>
            <div className={styles.logo}>
              <Shield className={styles.logoIcon} size={28} />
              <span>Urithi<span style={{ color: 'var(--accent-gold)' }}>Vault</span></span>
            </div>
            <h2 className={styles.title}>Initiate Vault Shield</h2>
            <p className={styles.sub}>Set a 6-digit Security PIN to wrap your Zero-Knowledge keys</p>
          </div>

          <div style={{ margin: '20px 0', background: 'rgba(197,160,89,0.06)', border: '1px dashed var(--accent-gold)', padding: '16px', borderRadius: '8px', fontSize: '0.85rem', color: 'var(--accent-gold)', display: 'flex', gap: '10px', alignItems: 'flex-start', textAlign: 'left' }}>
            <Lock size={20} style={{ flexShrink: 0, marginTop: '2px' }} />
            <span>
              <strong>Zero-Knowledge Rule:</strong> Your PIN is used browser-side to derive your vault encryption keys. We never store this PIN on the server. If lost, recovery requires designated Trustees or Admin Overrides.
            </span>
          </div>

          {pinError && (
            <div className={styles.alertError} style={{ margin: '12px auto', maxWidth: '100%' }}>
              <AlertCircle size={16} />
              <span>{pinError}</span>
            </div>
          )}

          <form onSubmit={handleSetupVdk} className={styles.form}>
            <div className="form-group" style={{ alignItems: 'center' }}>
              <label className="form-label" style={{ fontSize: '0.8rem' }}>Choose Security PIN</label>
              <input
                type="password"
                pattern="[0-9]*"
                inputMode="numeric"
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="••••••"
                required
                disabled={vdkLoading}
                style={{
                  textAlign: 'center',
                  fontSize: '2rem',
                  letterSpacing: '0.4em',
                  maxWidth: '220px',
                  padding: '10px',
                }}
              />
            </div>

            <button type="submit" className={styles.btnGold} style={{ width: '100%', justifyContent: 'center' }} disabled={vdkLoading || pinInput.length !== 6}>
              {vdkLoading ? <Loader2 className="animate-spin" size={18} /> : 'Initialize Vault Key'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // --- CRYPTO INTERFACE 2: UNLOCK VAULT ON LOGIN ---
  if (user && user.encryptedVdk && !decryptedVdk) {
    return (
      <div className={styles.unlockOverlay}>
        <div className={`${styles.unlockCard} glass`}>
          <div className={styles.header} style={{ marginBottom: '20px' }}>
            <div className={styles.logo}>
              <Shield className={styles.logoIcon} size={28} />
              <span>Urithi<span style={{ color: 'var(--accent-gold)' }}>Vault</span></span>
            </div>
            <h2 className={styles.title}>Unlock Heritage Vault</h2>
            <p className={styles.sub}>Enter your 6-digit Security PIN to decrypt client-side files</p>
          </div>

          {pinError && (
            <div className={styles.alertError} style={{ margin: '12px auto', maxWidth: '100%' }}>
              <AlertCircle size={16} />
              <span>{pinError}</span>
            </div>
          )}

          <form onSubmit={handleUnlockVdk} className={styles.form}>
            <div className="form-group" style={{ alignItems: 'center' }}>
              <label className="form-label">Unlock PIN</label>
              <input
                type="password"
                pattern="[0-9]*"
                inputMode="numeric"
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="••••••"
                required
                disabled={vdkLoading}
                style={{
                  textAlign: 'center',
                  fontSize: '2rem',
                  letterSpacing: '0.4em',
                  maxWidth: '220px',
                  padding: '10px',
                }}
              />
            </div>

            <button type="submit" className={styles.btnGold} style={{ width: '100%', justifyContent: 'center' }} disabled={vdkLoading || pinInput.length !== 6}>
              {vdkLoading ? <Loader2 className="animate-spin" size={18} /> : 'Unlock Keys'}
            </button>
          </form>

          <div style={{ marginTop: '24px' }}>
            <button onClick={handleLogout} className={styles.btnCancel} style={{ fontSize: '0.8rem', padding: '6px 12px' }}>
              Exit & Return
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- STANDARD LOGGED IN INTERFACE ---
  return (
    <div className={styles.container}>
      {/* Celebration Confetti */}
      {celebrate && (
        <div className={styles.confettiContainer}>
          {confettiElements.map((el) => {
            const left = Math.random() * 100;
            const delay = Math.random() * 2;
            const duration = 1.5 + Math.random() * 1.5;
            return (
              <div 
                key={el} 
                className={styles.confetti} 
                style={{ 
                  left: `${left}%`, 
                  animationDelay: `${delay}s`,
                  animationDuration: `${duration}s`
                }} 
              />
            );
          })}
        </div>
      )}

      {/* Navigation Header */}
      <header className={styles.header}>
        <div className={styles.nav}>
          <div className={styles.logo}>
            <Shield className={styles.logoIcon} size={24} />
            <span>Urithi<span style={{ color: 'var(--accent-gold)' }}>Vault</span></span>
          </div>

          <div className={styles.userInfo}>
            <div className={styles.userBadge}>
              <User size={14} />
              <span>{user?.email}</span>
              <span className={styles.roleLabel}>{user?.role}</span>
            </div>
            <button className={styles.logoutBtn} onClick={handleLogout}>
              <LogOut size={16} />
              <span>Lock & Exit</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Panel Content */}
      <main className={styles.main}>
        {/* Active Claim Warning Banner */}
        {claims.filter(c => c.status === 'pending').map((claim) => (
          <div key={claim.id} className={styles.alertError} style={{ marginBottom: '24px', padding: '20px', flexDirection: 'column', alignItems: 'flex-start', gap: '12px', background: 'rgba(244, 63, 94, 0.05)', borderColor: 'rgba(244, 63, 94, 0.2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontWeight: 'bold', fontSize: '1rem', color: 'var(--accent-danger)' }}>
              <AlertTriangle size={20} className="animate-pulse" />
              <span>Active Vault Claim Warning</span>
            </div>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)', textAlign: 'left' }}>
              A claim has been filed against your vault by <strong>{claim.claimant?.email || 'a beneficiary'}</strong>. The 14-day escrow cooldown period is currently running. If you are alive and this claim is unauthorized, cancel it immediately to confirm your <strong>Proof of Life</strong>.
            </p>
            <div style={{ display: 'flex', gap: '12px', fontSize: '0.8rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>Cooldown Ends: {new Date(claim.cooldownEnds).toLocaleString()}</span>
            </div>
            <button 
              onClick={() => handleCancelClaim(claim.id)} 
              disabled={vdkLoading}
              className={styles.btnGold}
              style={{ padding: '8px 16px', background: 'var(--accent-danger)', borderColor: 'var(--accent-danger)', color: 'white', display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              {vdkLoading ? <Loader2 className="animate-spin" size={16} /> : 'Cancel Claim & Verify Proof of Life'}
            </button>
          </div>
        ))}

        {/* Onboarding Gamified Section */}
        <section className={styles.onboardingHeader}>
          {/* Legacy Score progress card */}
          <div className={`${styles.gamifiedStats} glass`}>
            <div className={styles.legacyScoreCircle}>
              <svg className={styles.scoreSvg}>
                <circle className={styles.scoreCircleBg} cx="50" cy="50" r="40" />
                <circle 
                  className={styles.scoreCircleVal} 
                  cx="50" 
                  cy="50" 
                  r="40" 
                  strokeDasharray="251.2"
                  strokeDashoffset={251.2 - (251.2 * legacyScore) / 100}
                />
              </svg>
              <span className={styles.scoreText}>{legacyScore}%</span>
            </div>

            <div className={styles.statsMeta}>
              <span className={styles.levelBadge}>{getLegacyLevel()}</span>
              <h2 className={styles.statsTitle}>Legacy Vault Progress</h2>
              <p className={styles.statsDesc}>
                {legacyScore < 60 
                  ? 'Complete your vault checklist to double-secure your digital legacy.' 
                  : 'Great progress! Your legacy has strong shielding. Complete the final fields to unlock the Grand Architect status.'}
              </p>
            </div>
          </div>

          {/* Gamified Checklist */}
          <div className={`${styles.milestonesList} glass`}>
            <h4 className={styles.milestoneHeader}>Legacy Shield Checklist</h4>
            
            <div className={styles.milestoneItem}>
              <div className={styles.milestoneLabel}>
                <CheckCircle2 size={16} className={user?.mfaEnabled ? styles.checkActive : styles.checkInactive} />
                <span className={user?.mfaEnabled ? styles.milestoneLabelCompleted : ''}>Enable Multi-Factor Security</span>
              </div>
              <span className={user?.mfaEnabled ? styles.milestonePointsActive : styles.milestonePoints}>+15%</span>
            </div>

            <div className={styles.milestoneItem}>
              <div className={styles.milestoneLabel}>
                <CheckCircle2 size={16} className={user?.encryptedVdk ? styles.checkActive : styles.checkInactive} />
                <span className={user?.encryptedVdk ? styles.milestoneLabelCompleted : ''}>Setup Security Encryption PIN</span>
              </div>
              <span className={user?.encryptedVdk ? styles.milestonePointsActive : styles.milestonePoints}>+15%</span>
            </div>

            <div className={styles.milestoneItem}>
              <div className={styles.milestoneLabel}>
                <CheckCircle2 size={16} className={getCategoryCount('financial') > 0 ? styles.checkActive : styles.checkInactive} />
                <span className={getCategoryCount('financial') > 0 ? styles.milestoneLabelCompleted : ''}>Log Financial Asset Details</span>
              </div>
              <span className={getCategoryCount('financial') > 0 ? styles.milestonePointsActive : styles.milestonePoints}>+20%</span>
            </div>

            <div className={styles.milestoneItem}>
              <div className={styles.milestoneLabel}>
                <CheckCircle2 size={16} className={getCategoryCount('land') > 0 ? styles.checkActive : styles.checkInactive} />
                <span className={getCategoryCount('land') > 0 ? styles.milestoneLabelCompleted : ''}>Log Properties or Land coordinates</span>
              </div>
              <span className={getCategoryCount('land') > 0 ? styles.milestonePointsActive : styles.milestonePoints}>+20%</span>
            </div>

            <div className={styles.milestoneItem}>
              <div className={styles.milestoneLabel}>
                <CheckCircle2 size={16} className={assets.some(a => a.category === 'video' || a.metadataTags.includes('Encrypted Document')) ? styles.checkActive : styles.checkInactive} />
                <span className={assets.some(a => a.category === 'video' || a.metadataTags.includes('Encrypted Document')) ? styles.milestoneLabelCompleted : ''}>Record Video or Document Messages</span>
              </div>
              <span className={assets.some(a => a.category === 'video' || a.metadataTags.includes('Encrypted Document')) ? styles.milestonePointsActive : styles.milestonePoints}>+10%</span>
            </div>

            <div className={styles.milestoneItem}>
              <div className={styles.milestoneLabel}>
                <CheckCircle2 size={16} className={beneficiaries.length > 0 ? styles.checkActive : styles.checkInactive} />
                <span className={beneficiaries.length > 0 ? styles.milestoneLabelCompleted : ''}>Nominate Beneficiaries & Heirs</span>
              </div>
              <span className={beneficiaries.length > 0 ? styles.milestonePointsActive : styles.milestonePoints}>+20%</span>
            </div>
          </div>
        </section>

        {/* Security Settings Section */}
        <section className={`${styles.securityCard} glass`}>
          <div className={styles.cardHeader}>
            <div className={styles.cardTitleBox}>
              {user?.mfaEnabled ? (
                <ShieldCheck size={24} className={styles.iconEnabled} />
              ) : (
                <ShieldAlert size={24} className={styles.iconDisabled} />
              )}
              <div>
                <h3 className={styles.cardTitle}>Account Security (MFA)</h3>
                <p className={styles.cardSub}>
                  {user?.mfaEnabled 
                    ? 'Your account is secured with two-factor authentication.' 
                    : 'Enable Multi-Factor Authentication to double-lock your sensitive legacy records.'}
                </p>
              </div>
            </div>
            {!user?.mfaEnabled && !setupMode && (
              <button className={styles.btnGold} onClick={handleSetupMfa} disabled={mfaLoading}>
                {mfaLoading ? <Loader2 className="animate-spin" size={16} /> : 'Setup Authenticator'}
              </button>
            )}
          </div>

          {setupMode && (
            <div className={styles.mfaSetupBox}>
              <h4 className={styles.setupTitle}>1. Scan QR Code</h4>
              <p className={styles.setupDesc}>Scan this QR code with Google Authenticator or Microsoft Authenticator app:</p>
              
              <div className={styles.qrCodeContainer}>
                {qrCodeUrl && (
                  <img src={qrCodeUrl} alt="Authenticator QR Code" className={styles.qrCodeImg} />
                )}
                <div style={{ marginTop: '12px', textAlign: 'center' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Manual key entry:</span>
                  <div className={styles.secretText}>{mfaSecret}</div>
                </div>
              </div>

              <h4 className={styles.setupTitle} style={{ marginTop: '24px' }}>2. Enter Verification Code</h4>
              <p className={styles.setupDesc}>Input the 6-digit code shown in your app to activate MFA:</p>
              
              <form onSubmit={handleVerifyMfa} style={{ marginTop: '16px', display: 'flex', gap: '12px', alignItems: 'center' }}>
                <input
                  type="text"
                  value={mfaCode}
                  onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  required
                  style={{ maxWidth: '160px', textAlign: 'center', letterSpacing: '0.15em', fontSize: '1.2rem' }}
                />
                <button type="submit" className={styles.btnGold} disabled={mfaLoading || mfaCode.length !== 6}>
                  {mfaLoading ? <Loader2 className="animate-spin" size={16} /> : 'Activate MFA'}
                </button>
                <button type="button" className={styles.btnCancel} onClick={() => setSetupMode(false)}>Cancel</button>
              </form>

              {mfaError && (
                <div className={styles.alertError} style={{ marginTop: '16px' }}>
                  <span>{mfaError}</span>
                </div>
              )}
            </div>
          )}

          {mfaSuccess && (
            <div className={styles.alertSuccess} style={{ marginTop: '16px' }}>
              <span>{mfaSuccess}</span>
            </div>
          )}
        </section>

        {/* Dashboard Grid */}
        <div className={styles.dashboardGrid}>
          {/* Main Vault Panel */}
          <div className={styles.vaultPanel}>
            <div className={styles.gridHeader}>
              <h2 className={styles.gridTitle}>Your Legacy Vault</h2>
              <span className={styles.gridSub}>Client-Side Encrypted Database</span>
            </div>

            <div className={styles.assetsGrid}>
              {/* Card 1: Bank */}
              <div className={`${styles.assetCard} glass`} onClick={() => openAssetModal('financial')}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Landmark size={24} style={{ color: 'var(--accent-gold)' }} />
                  <span className={styles.levelBadge}>{getCategoryCount('financial')} logged</span>
                </div>
                <h4>Financial Accounts</h4>
                <p>Banks, SACCO shares, mobile money accounts.</p>
                <button className={styles.btnGold} style={{ marginTop: '8px', alignSelf: 'flex-start', padding: '6px 12px', fontSize: '0.8rem' }}>
                  <Plus size={14} /> Add Record
                </button>
              </div>

              {/* Card 2: Land */}
              <div className={`${styles.assetCard} glass`} onClick={() => openAssetModal('land')}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Building size={24} style={{ color: 'var(--accent-gold)' }} />
                  <span className={styles.levelBadge}>{getCategoryCount('land')} logged</span>
                </div>
                <h4>Properties & Land</h4>
                <p>Deeds, parcel boundaries, valuations.</p>
                <button className={styles.btnGold} style={{ marginTop: '8px', alignSelf: 'flex-start', padding: '6px 12px', fontSize: '0.8rem' }}>
                  <Plus size={14} /> Add Record
                </button>
              </div>

              {/* Card 3: SACCO / Chama */}
              <div className={`${styles.assetCard} glass`} onClick={() => openAssetModal('sacco')}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Coins size={24} style={{ color: 'var(--accent-gold)' }} />
                  <span className={styles.levelBadge}>{getCategoryCount('sacco')} logged</span>
                </div>
                <h4>SACCOs & Chamas</h4>
                <p>Investment pools, contributions, contacts.</p>
                <button className={styles.btnGold} style={{ marginTop: '8px', alignSelf: 'flex-start', padding: '6px 12px', fontSize: '0.8rem' }}>
                  <Plus size={14} /> Add Record
                </button>
              </div>

              {/* Card 4: Documents */}
              <div className={`${styles.assetCard} glass`} onClick={() => openAssetModal('document')}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <FileCheck size={24} style={{ color: 'var(--accent-gold)' }} />
                  <span className={styles.levelBadge}>{getCategoryCount('document')} logged</span>
                </div>
                <h4>Wills & Documents</h4>
                <p>Digital copies, lawyers, executor contacts.</p>
                <button className={styles.btnGold} style={{ marginTop: '8px', alignSelf: 'flex-start', padding: '6px 12px', fontSize: '0.8rem' }}>
                  <Plus size={14} /> Add Record
                </button>
              </div>
            </div>

            {/* List of Decrypted Asset Logs */}
            {assets.length > 0 && (
              <div style={{ marginTop: '32px' }}>
                <h3 className={styles.cardTitle} style={{ marginBottom: '16px' }}>Decrypted Vault Log</h3>
                <div className={styles.assetListContainer}>
                  {assets.map((asset) => {
                    const decrypted = decryptedAssets[asset.id];
                    return (
                      <div key={asset.id} className={styles.assetListItem}>
                        <div className={styles.assetItemMeta}>
                          <h5>
                            {asset.category === 'financial' && `Bank Account: ${decrypted?.bankName || 'Decrypting...'}`}
                            {asset.category === 'land' && `Land Deed: ${decrypted?.titleDeedNumber || 'Decrypting...'}`}
                            {asset.category === 'sacco' && `Chama/SACCO: ${decrypted?.chamaName || 'Decrypting...'}`}
                            {asset.category === 'document' && !asset.metadataTags.includes('Encrypted Document') && `Document: ${decrypted?.docType?.toUpperCase() || 'Decrypting...'}`}
                            {asset.category === 'document' && asset.metadataTags.includes('Encrypted Document') && `Uploaded File: ${decrypted?.filename || 'Decrypting...'}`}
                            {asset.category === 'video' && `Video Message: ${decrypted?.filename || 'Decrypting...'}`}
                          </h5>
                          <p>
                            {asset.category === 'financial' && `Account No: ${decrypted?.accountNumber || '****'} (${decrypted?.currency || 'KES'})`}
                            {asset.category === 'land' && `Location: ${decrypted?.physicalLocation || '****'} (${decrypted?.parcelSize || '****'})`}
                            {asset.category === 'sacco' && `Contribution: ${decrypted?.shareAmount || '****'} KES`}
                            {asset.category === 'document' && !asset.metadataTags.includes('Encrypted Document') && `Hardcopy at: ${decrypted?.hardcopyLocation || '****'}`}
                            {asset.category === 'document' && asset.metadataTags.includes('Encrypted Document') && `Download Path: ${decrypted?.fileUrl || '****'}`}
                            {asset.category === 'video' && `Playback Path: ${decrypted?.fileUrl || '****'}`}
                          </p>
                        </div>
                        <span className={styles.assetItemBadge}>{asset.category}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Quick Actions Panel */}
          <div className={styles.sidebarPanel}>
            {/* Beneficiaries Mapping Action Card */}
            <div className={`${styles.sidebarCard} glass`}>
              <h3 className={styles.sidebarTitle}>Beneficiary Mappings</h3>
              <p className={styles.sidebarText}>
                {beneficiaries.length > 0 
                  ? `You have nominated ${beneficiaries.length} heirs. Map their permissions to specific folders.`
                  : 'Designate who inherits specific folders when the vault is triggered.'}
              </p>
              
              {beneficiaries.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', margin: '10px 0' }}>
                  {beneficiaries.map((b) => (
                    <div key={b.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', background: 'rgba(255,255,255,0.02)', padding: '6px 10px', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
                      <span>{b.email}</span>
                      <span style={{ color: 'var(--accent-gold)' }}>({b.relationship})</span>
                    </div>
                  ))}
                </div>
              )}
              
              <button className={styles.btnGold} style={{ width: '100%', justifyContent: 'center' }} onClick={() => setBeneficiaryModalOpen(true)}>
                <UserPlus size={16} />
                <span>Nominate Heir</span>
              </button>
            </div>

            {/* Video message capture card */}
            <div className={`${styles.sidebarCard} glass`}>
              <h3 className={styles.sidebarTitle}>Personal Legacy Media</h3>
              <p className={styles.sidebarText}>Record video or audio messages that release only after cooldown completion.</p>
              
              {assets.filter(a => a.category === 'video').length > 0 && (
                <div style={{ margin: '8px 0', fontSize: '0.75rem', color: 'var(--accent-emerald)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <CheckCircle2 size={12} />
                  <span>{assets.filter(a => a.category === 'video').length} video messages encrypted.</span>
                </div>
              )}
              
              <button className={styles.btnGold} style={{ width: '100%', justifyContent: 'center' }} onClick={() => setMediaModalOpen(true)}>
                <Video size={16} />
                <span>Record Message</span>
              </button>
            </div>

            {/* Subscription Upgrade Card */}
            <div className={`${styles.sidebarCard} glass`}>
              <h3 className={styles.sidebarTitle}>Vault Subscription</h3>
              <p className={styles.sidebarText} style={{ margin: 0 }}>
                Current Protection Tier: <strong style={{ color: 'var(--accent-gold)', textTransform: 'uppercase' }}>{user?.subscriptionTier}</strong>
              </p>
              
              {user?.subscriptionTier === 'basic' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px' }}>
                  <button 
                    disabled={billingLoading} 
                    onClick={() => handleUpgradeSubscription('premium')} 
                    className={styles.btnGold} 
                    style={{ width: '100%', justifyContent: 'center' }}
                  >
                    {billingLoading ? <Loader2 className="animate-spin" size={14} /> : 'Upgrade to Premium (1,000 KES)'}
                  </button>
                  <button 
                    disabled={billingLoading} 
                    onClick={() => handleUpgradeSubscription('enterprise')} 
                    className={styles.btnSecondary} 
                    style={{ width: '100%', justifyContent: 'center', fontSize: '0.8rem' }}
                  >
                    {billingLoading ? <Loader2 className="animate-spin" size={14} /> : 'Upgrade to Enterprise (5,000 KES)'}
                  </button>
                </div>
              )}

              {user?.subscriptionTier === 'premium' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px' }}>
                  <button 
                    disabled={billingLoading} 
                    onClick={() => handleUpgradeSubscription('enterprise')} 
                    className={styles.btnGold} 
                    style={{ width: '100%', justifyContent: 'center' }}
                  >
                    {billingLoading ? <Loader2 className="animate-spin" size={14} /> : 'Upgrade to Enterprise (5,000 KES)'}
                  </button>
                </div>
              )}

              {user?.subscriptionTier === 'enterprise' && (
                <p style={{ fontSize: '0.75rem', color: '#10b981', marginTop: '8px', margin: '8px 0 0 0', fontWeight: 'bold' }}>
                  ✓ Ultimate protection active.
                </p>
              )}
            </div>

            <div className={`${styles.sidebarCard} glass`}>
              <h3 className={styles.sidebarTitle}>Activity Audit Trail</h3>
              <p className={styles.sidebarText}>Immutable history of vault actions, edits, and access verification requests.</p>
              <button 
                className={styles.btnGold} 
                style={{ width: '100%', justifyContent: 'center' }} 
                onClick={() => { setAuditModalOpen(true); fetchAuditLogs(); }}
              >
                <History size={16} />
                <span>View Compliance Logs</span>
              </button>
            </div>

            <div className={`${styles.sidebarCard} glass`}>
              <h3 className={styles.sidebarTitle}>Compliance Tools</h3>
              <p className={styles.sidebarText}>GDPR/KDPA Rights: Download backup or permanently delete records.</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px' }}>
                <button 
                  onClick={exportOwnerVaultData} 
                  className={styles.btnSecondary} 
                  style={{ width: '100%', justifyContent: 'center', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <Download size={14} /> 
                  <span>Export Vault (JSON)</span>
                </button>
                <button 
                  onClick={handlePurgeAccount} 
                  disabled={isPurging}
                  className={styles.btnCancel} 
                  style={{ width: '100%', justifyContent: 'center', fontSize: '0.8rem', borderColor: 'var(--accent-danger)', color: 'var(--accent-danger)', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  {isPurging ? <Loader2 className="animate-spin" size={14} /> : (
                    <>
                      <X size={14} />
                      <span>Wipe & Shred Vault</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* --- AUDIT LOGS MODAL --- */}
      {auditModalOpen && (
        <div className={styles.modalOverlay} onClick={() => setAuditModalOpen(false)}>
          <div className={styles.slideOver} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div>
                <span className={styles.levelBadge} style={{ marginBottom: '8px' }}>Security Audit</span>
                <h3 className={styles.modalTitle}>Vault Compliance Logs</h3>
                <p className={styles.modalSub}>Immutable record of actions taken on your zero-knowledge vault</p>
              </div>
              <button className={styles.btnClose} onClick={() => setAuditModalOpen(false)}>
                <X size={16} />
              </button>
            </div>

            <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '12px', textAlign: 'left' }}>
              {loadingAudit ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}>
                  <Loader2 className="animate-spin" size={24} style={{ color: 'var(--accent-gold)' }} />
                </div>
              ) : auditLogs.length === 0 ? (
                <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--text-muted)' }}>
                  <History size={36} style={{ margin: '0 auto 12px auto', opacity: 0.15 }} />
                  <p style={{ fontSize: '0.85rem' }}>No audit logs recorded yet.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '70vh', overflowY: 'auto', paddingRight: '4px' }}>
                  {auditLogs.map((log) => (
                    <div key={log.id} style={{ padding: '12px', border: '1px solid var(--border-color)', borderRadius: '6px', background: 'rgba(255,255,255,0.01)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: 'var(--accent-gold)' }}>
                        <strong style={{ textTransform: 'uppercase' }}>{log.action}</strong>
                        <span>{new Date(log.createdAt).toLocaleString()}</span>
                      </div>
                      <p style={{ margin: '6px 0 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{log.details}</p>
                      {log.ipAddress && (
                        <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', display: 'block', marginTop: '4px' }}>IP: {log.ipAddress}</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* --- FORM MODAL SLIDE-OVER WIZARD (ASSETS) --- */}
      {modalOpen && (
        <div className={styles.modalOverlay} onClick={() => setModalOpen(false)}>
          <div className={styles.slideOver} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div>
                <span className={styles.levelBadge} style={{ marginBottom: '8px' }}>Asset Onboarding</span>
                <h3 className={styles.modalTitle}>
                  {modalCategory === 'financial' && 'Log Financial Asset'}
                  {modalCategory === 'land' && 'Log Property & Land'}
                  {modalCategory === 'sacco' && 'Log SACCO & Chama'}
                  {modalCategory === 'document' && 'Log Wills & Successions'}
                </h3>
                <p className={styles.modalSub}>Fields will be encrypted locally before database commit</p>
              </div>
              <button className={styles.btnClose} onClick={() => setModalOpen(false)}>
                <X size={16} />
              </button>
            </div>

            <div className={styles.wizardSteps}>
              <div className={`${styles.wizardStep} ${wizardStep >= 1 ? styles.wizardStepActive : ''}`} />
              <div className={`${styles.wizardStep} ${wizardStep >= 2 ? styles.wizardStepActive : ''}`} />
            </div>

            {formError && (
              <div className={styles.alertError} style={{ marginBottom: '20px' }}>
                <AlertCircle size={16} />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSaveAsset} className={styles.form}>
              {wizardStep === 1 ? (
                <>
                  <div className="form-group">
                    <label className="form-label">Asset Tags / Labels</label>
                    <input
                      type="text"
                      value={metadataTags}
                      onChange={(e) => setMetadataTags(e.target.value)}
                      placeholder="e.g. Primary Bank, Family Plot, Chama, Wills"
                      required
                    />
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      Note: These search tags are NOT encrypted to allow quick sorting, but remain completely private to you.
                    </span>
                  </div>

                  <button 
                    type="button" 
                    className={styles.btnGold} 
                    style={{ marginTop: '20px', justifyContent: 'center' }}
                    onClick={() => setWizardStep(2)}
                  >
                    Next Step: Secure Encrypted Info
                  </button>
                </>
              ) : (
                <>
                  {modalCategory === 'financial' && (
                    <>
                      <div className="form-group">
                        <label className="form-label">Bank Name</label>
                        <input
                          type="text"
                          value={bankName}
                          onChange={(e) => setBankName(e.target.value)}
                          placeholder="e.g. Kenya Commercial Bank"
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Account Number</label>
                        <input
                          type="text"
                          value={accountNumber}
                          onChange={(e) => setAccountNumber(e.target.value)}
                          placeholder="e.g. 1109482759"
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Branch & Details</label>
                        <input
                          type="text"
                          value={branch}
                          onChange={(e) => setBranch(e.target.value)}
                          placeholder="e.g. Moi Avenue Branch"
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Currency</label>
                        <select value={currency} onChange={(e) => setCurrency(e.target.value)}>
                          <option value="KES">KES - Kenyan Shilling</option>
                          <option value="USD">USD - US Dollar</option>
                          <option value="GBP">GBP - British Pound</option>
                        </select>
                      </div>
                    </>
                  )}

                  {modalCategory === 'land' && (
                    <>
                      <div className="form-group">
                        <label className="form-label">Title Deed Number (Parcel ID)</label>
                        <input
                          type="text"
                          value={titleDeedNumber}
                          onChange={(e) => setTitleDeedNumber(e.target.value)}
                          placeholder="e.g. LR NO 1234/56"
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Parcel Size (Acres/Square Meters)</label>
                        <input
                          type="text"
                          value={parcelSize}
                          onChange={(e) => setParcelSize(e.target.value)}
                          placeholder="e.g. 0.5 Acres"
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Lands Registry Office</label>
                        <input
                          type="text"
                          value={registryOffice}
                          onChange={(e) => setRegistryOffice(e.target.value)}
                          placeholder="e.g. Kajiado Land Office"
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Physical Address / Description</label>
                        <textarea
                          value={physicalLocation}
                          onChange={(e) => setPhysicalLocation(e.target.value)}
                          placeholder="e.g. Behind Ngong Hills Substation, Kajiado County"
                          rows={3}
                          required
                        />
                      </div>
                    </>
                  )}

                  {modalCategory === 'sacco' && (
                    <>
                      <div className="form-group">
                        <label className="form-label">Chama or SACCO Name</label>
                        <input
                          type="text"
                          value={chamaName}
                          onChange={(e) => setChamaName(e.target.value)}
                          placeholder="e.g. Safaricom Investment Co-op"
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Account or Member ID</label>
                        <input
                          type="text"
                          value={chamaAccount}
                          onChange={(e) => setChamaAccount(e.target.value)}
                          placeholder="e.g. M-10928"
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Shareholding / Contribution Balance (KES)</label>
                        <input
                          type="number"
                          value={shareAmount}
                          onChange={(e) => setShareAmount(e.target.value)}
                          placeholder="e.g. 500000"
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Leader or Contact Representative</label>
                        <input
                          type="text"
                          value={leaderContact}
                          onChange={(e) => setLeaderContact(e.target.value)}
                          placeholder="e.g. John Doe (+254 700 000000)"
                        />
                      </div>
                    </>
                  )}

                  {modalCategory === 'document' && (
                    <>
                      <div className="form-group">
                        <label className="form-label">Document Type</label>
                        <select value={docType} onChange={(e) => setDocType(e.target.value)}>
                          <option value="will">Last Will & Testament</option>
                          <option value="trust">Trust Agreement deed</option>
                          <option value="pension">Pension Payslips/Inheritance Log</option>
                          <option value="insurance">Insurance Policy certificate</option>
                        </select>
                      </div>
                      <div className="form-group">
                        <label className="form-label">Physical Location of Hardcopy</label>
                        <input
                          type="text"
                          value={hardcopyLocation}
                          onChange={(e) => setHardcopyLocation(e.target.value)}
                          placeholder="e.g. Safe in KCB Westlands, Safe Box #49"
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Custodian / Lawyer Name</label>
                        <input
                          type="text"
                          value={lawyerName}
                          onChange={(e) => setLawyerName(e.target.value)}
                          placeholder="e.g. Advocate Mercy Wanjiku"
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Custodian / Lawyer Contact Phone</label>
                        <input
                          type="text"
                          value={lawyerContact}
                          onChange={(e) => setLawyerContact(e.target.value)}
                          placeholder="e.g. +254 711 222333"
                        />
                      </div>
                    </>
                  )}

                  <div style={{ display: 'flex', gap: '16px', marginTop: '28px' }}>
                    <button 
                      type="button" 
                      className={styles.btnCancel} 
                      onClick={() => setWizardStep(1)}
                      style={{ flexGrow: 1 }}
                    >
                      Back
                    </button>
                    <button 
                      type="submit" 
                      className={styles.btnGold}
                      disabled={vdkLoading}
                      style={{ flexGrow: 2, justifyContent: 'center' }}
                    >
                      {vdkLoading ? <Loader2 className="animate-spin" size={18} /> : 'Save & Secure Asset'}
                    </button>
                  </div>
                </>
              )}
            </form>
          </div>
        </div>
      )}

      {/* --- FORM MODAL SLIDE-OVER WIZARD (BENEFICIARIES) --- */}
      {beneficiaryModalOpen && (
        <div className={styles.modalOverlay} onClick={() => setBeneficiaryModalOpen(false)}>
          <div className={styles.slideOver} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div>
                <span className={styles.levelBadge} style={{ marginBottom: '8px' }}>Heritage Mapping</span>
                <h3 className={styles.modalTitle}>Nominate Vault Heir</h3>
                <p className={styles.modalSub}>Encrypt key permissions for a designated beneficiary</p>
              </div>
              <button className={styles.btnClose} onClick={() => setBeneficiaryModalOpen(false)}>
                <X size={16} />
              </button>
            </div>

            {beneficiaryError && (
              <div className={styles.alertError} style={{ marginBottom: '20px' }}>
                <AlertCircle size={16} />
                <span>{beneficiaryError}</span>
              </div>
            )}

            <form onSubmit={handleNominateBeneficiary} className={styles.form}>
              <div className="form-group">
                <label className="form-label">Heir Email Address</label>
                <input
                  type="email"
                  value={beneficiaryEmail}
                  onChange={(e) => setBeneficiaryEmail(e.target.value)}
                  placeholder="heir@domain.com"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Phone Contact (SMS Alerts)</label>
                <input
                  type="text"
                  value={beneficiaryPhone}
                  onChange={(e) => setBeneficiaryPhone(e.target.value)}
                  placeholder="e.g. +254 700 000000"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Family Relationship</label>
                <input
                  type="text"
                  value={beneficiaryRelationship}
                  onChange={(e) => setBeneficiaryRelationship(e.target.value)}
                  placeholder="e.g. Spouse, Eldest Son, Executor, Lawyer"
                  required
                />
              </div>

              {/* Asset Checkboxes Selection */}
              <div className="form-group">
                <label className="form-label">Grant Access to Mapped Assets</label>
                {assets.length === 0 ? (
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>No asset records logged yet. Add assets first.</span>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '180px', overflowY: 'auto', background: 'rgba(0,0,0,0.2)', padding: '10px', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
                    {assets.map((asset) => {
                      const decrypted = decryptedAssets[asset.id];
                      const label = asset.category === 'financial' 
                        ? `Bank: ${decrypted?.bankName || '...'}`
                        : asset.category === 'land'
                        ? `Land Deed: ${decrypted?.titleDeedNumber || '...'}`
                        : asset.category === 'sacco'
                        ? `Chama: ${decrypted?.chamaName || '...'}`
                        : `Will/Doc: ${decrypted?.docType || '...'}`;
                      
                      return (
                        <label key={asset.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.85rem', cursor: 'pointer', padding: '4px 0' }}>
                          <input
                            type="checkbox"
                            checked={selectedAssetIds.includes(asset.id)}
                            onChange={() => handleToggleAssetSelection(asset.id)}
                            style={{ width: 'auto', cursor: 'pointer' }}
                          />
                          <span>{label} ({asset.category})</span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">Set Heir Access Passcode</label>
                <input
                  type="password"
                  value={beneficiaryAccessCode}
                  onChange={(e) => setBeneficiaryAccessCode(e.target.value)}
                  placeholder="Create a password for this heir"
                  required
                />
                <span style={{ fontSize: '0.75rem', color: 'var(--accent-gold)' }}>
                  ⚠️ Write this passcode down. Your VDK is encrypted with it. The heir will require it to decrypt mapped assets upon trigger verification.
                </span>
              </div>

              <button type="submit" className={styles.btnGold} disabled={vdkLoading} style={{ marginTop: '16px', justifyContent: 'center' }}>
                {vdkLoading ? <Loader2 className="animate-spin" size={18} /> : 'Save Nominated Beneficiary'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* --- FORM MODAL SLIDE-OVER WIZARD (MEDIA MESSAGES) --- */}
      {mediaModalOpen && (
        <div className={styles.modalOverlay} onClick={() => { stopCamera(); setMediaModalOpen(false); }}>
          <div className={styles.slideOver} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div>
                <span className={styles.levelBadge} style={{ marginBottom: '8px' }}>Legacy Media</span>
                <h3 className={styles.modalTitle}>Record or Upload Message</h3>
                <p className={styles.modalSub}>Encrypted video/document released only after verified triggers</p>
              </div>
              <button className={styles.btnClose} onClick={() => { stopCamera(); setMediaModalOpen(false); }}>
                <X size={16} />
              </button>
            </div>

            {mediaError && (
              <div className={styles.alertError} style={{ marginBottom: '20px' }}>
                <AlertCircle size={16} />
                <span>{mediaError}</span>
              </div>
            )}

            <form onSubmit={handleSaveMedia} className={styles.form}>
              <div className="form-group">
                <label className="form-label">Option A: Record Video Message</label>
                
                {/* Video Cam recorder frame */}
                <div style={{ width: '100%', aspectRatio: '16/9', background: 'black', borderRadius: '8px', overflow: 'hidden', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border-color)' }}>
                  {stream ? (
                    <video ref={videoRef} autoPlay playsInline muted style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : videoPreviewUrl ? (
                    <video src={videoPreviewUrl} controls style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                      <VideoOff size={32} />
                      <span style={{ fontSize: '0.8rem' }}>Webcam is offline</span>
                    </div>
                  )}
                  {isRecording && (
                    <div style={{ position: 'absolute', top: '12px', left: '12px', display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(0,0,0,0.6)', padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem', color: 'red', fontWeight: 'bold' }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'red', display: 'inline-block', animation: 'pulseGlow 1s infinite' }} />
                      REC
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                  {!stream && !videoPreviewUrl && (
                    <button type="button" className={styles.btnSecondary} onClick={startCamera} style={{ flexGrow: 1, fontSize: '0.8rem' }}>
                      Activate Camera
                    </button>
                  )}
                  {stream && !isRecording && (
                    <button type="button" className={styles.btnGold} onClick={startRecording} style={{ flexGrow: 1, fontSize: '0.8rem' }}>
                      Start Recording
                    </button>
                  )}
                  {isRecording && (
                    <button type="button" className={styles.btnCancel} onClick={stopRecording} style={{ flexGrow: 1, fontSize: '0.8rem', borderColor: 'red', color: 'red' }}>
                      Stop Recording
                    </button>
                  )}
                  {(stream || videoPreviewUrl) && (
                    <button type="button" className={styles.btnCancel} onClick={() => { stopCamera(); setVideoPreviewUrl(''); setRecordedChunks([]); }} style={{ fontSize: '0.8rem' }}>
                      Reset
                    </button>
                  )}
                </div>
              </div>

              <div style={{ alignSelf: 'center', color: 'var(--text-muted)', fontSize: '0.8rem', textAlign: 'center', margin: '10px 0' }}>— OR —</div>

              <div className="form-group">
                <label className="form-label">Option B: Upload Legacy File</label>
                <div style={{ position: 'relative', border: '2px dashed var(--border-color)', borderRadius: '8px', padding: '24px', textAlign: 'center', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                  <Upload size={24} style={{ color: 'var(--accent-gold)' }} />
                  <span style={{ fontSize: '0.85rem' }}>
                    {legacyFile ? `Selected: ${legacyFile.name}` : 'Choose file to encrypt & upload'}
                  </span>
                  <input
                    type="file"
                    onChange={(e) => {
                      if (e.target.files && e.target.files.length > 0) {
                        setVideoPreviewUrl('');
                        setRecordedChunks([]);
                        setLegacyFile(e.target.files[0]);
                      }
                    }}
                    style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 0, cursor: 'pointer' }}
                  />
                </div>
              </div>

              <button type="submit" className={styles.btnGold} disabled={mediaUploadLoading || (!videoPreviewUrl && !legacyFile)} style={{ marginTop: '20px', width: '100%', justifyContent: 'center' }}>
                {mediaUploadLoading ? <Loader2 className="animate-spin" size={18} /> : 'Encrypt & Upload Legacy'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ==========================================
// HEIR / BENEFICIARY DASHBOARD COMPONENT
// ==========================================
interface BeneficiaryDashboardProps {
  user: UserProfile;
  handleLogout: () => void;
  triggerCelebration: () => void;
  celebrate: boolean;
  confettiElements: number[];
}

function BeneficiaryDashboard({
  user,
  handleLogout,
  triggerCelebration,
  celebrate,
  confettiElements,
}: BeneficiaryDashboardProps) {
  const [claims, setClaims] = useState<any[]>([]);
  const [assets, setAssets] = useState<any[]>([]);
  const [decryptedAssets, setDecryptedAssets] = useState<Record<string, any>>({});
  const [masterVdks, setMasterVdks] = useState<Record<string, string>>({});
  
  // Search & Claim filing states
  const [searchEmail, setSearchEmail] = useState('');
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [claimError, setClaimError] = useState('');
  const [claimSuccess, setClaimSuccess] = useState('');
  const [loadingClaims, setLoadingClaims] = useState(true);

  // Asset decryption state
  const [passcode, setPasscode] = useState('');
  const [unlockError, setUnlockError] = useState('');
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [vdkDecryptLoading, setVdkDecryptLoading] = useState(false);

  // Media decryption states
  const [decryptingMediaId, setDecryptingMediaId] = useState<string | null>(null);
  const [decryptedMediaUrls, setDecryptedMediaUrls] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchClaims();
    fetchAssets();
  }, []);

  const fetchClaims = async () => {
    try {
      const res = await fetch('/api/claims/list');
      if (res.ok) {
        const data = await res.json();
        setClaims(data.claims || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingClaims(false);
    }
  };

  const fetchAssets = async () => {
    try {
      const res = await fetch('/api/claims/assets');
      if (res.ok) {
        const data = await res.json();
        setAssets(data.assets || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setProofFile(e.target.files[0]);
    }
  };

  const handleFileClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    setClaimError('');
    setClaimSuccess('');
    setUploadLoading(true);

    try {
      let fileUrl = '';
      if (proofFile) {
        const formData = new FormData();
        formData.append('file', proofFile);
        const uploadRes = await fetch('/api/storage/upload', {
          method: 'POST',
          body: formData,
        });
        const uploadData = await uploadRes.json();
        if (!uploadRes.ok) throw new Error(uploadData.error || 'Proof document upload failed');
        fileUrl = uploadData.fileUrl;
      }

      const claimRes = await fetch('/api/claims/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ownerEmail: searchEmail,
          proofDocumentUrl: fileUrl,
        }),
      });

      const claimData = await claimRes.json();
      if (!claimRes.ok) throw new Error(claimData.error || 'Claim creation failed');

      setClaimSuccess('Claim successfully filed! The 14-day escrow cooldown period has started.');
      setSearchEmail('');
      setProofFile(null);
      triggerCelebration();
      fetchClaims();
    } catch (err: any) {
      setClaimError(err.message);
    } finally {
      setUploadLoading(false);
    }
  };

  const handleDecryptVdk = async (e: React.FormEvent) => {
    e.preventDefault();
    setUnlockError('');
    setVdkDecryptLoading(true);

    if (assets.length === 0) {
      setUnlockError('No assets mapped or claim not approved yet.');
      setVdkDecryptLoading(false);
      return;
    }

    try {
      const decrypted: Record<string, any> = {};
      const vdks: Record<string, string> = {};
      let unlockedAny = false;

      for (const asset of assets) {
        const shareKey = asset.encryptedShareKey;
        const parts = shareKey.split(':');
        if (parts.length < 3) {
          decrypted[asset.assetId] = { error: 'Invalid share key layout' };
          continue;
        }

        const salt = parts[0];
        const encryptedKeyStr = parts.slice(1).join(':');

        try {
          // Derive the key from the beneficiary's passcode
          const derivedKey = await deriveKeyFromPassword(passcode, salt);
          // Decrypt the share key to get `${beneficiarySalt}:${decryptedVdk}`
          const decryptedShare = await decryptPayload(encryptedKeyStr, derivedKey);
          
          const shareParts = decryptedShare.split(':');
          if (shareParts.length < 2) {
            decrypted[asset.assetId] = { error: 'Malformed decrypted VDK payload' };
            continue;
          }

          const masterVdk = shareParts[1];
          vdks[asset.assetId] = masterVdk;

          // Decrypt the asset payload using the recovered masterVdk
          const assetStr = await decryptPayload(asset.encryptedPayload, masterVdk);
          decrypted[asset.assetId] = JSON.parse(assetStr);
          unlockedAny = true;
        } catch (err) {
          console.error("Decryption failed for asset:", asset.assetId, err);
          decrypted[asset.assetId] = { error: 'Incorrect passcode or decryption error' };
        }
      }

      setDecryptedAssets(decrypted);
      setMasterVdks(vdks);

      if (unlockedAny) {
        setIsUnlocked(true);
        triggerCelebration();
      } else {
        setUnlockError('Failed to decrypt. Verify your access passcode.');
      }
    } catch (err: any) {
      setUnlockError(err.message);
    } finally {
      setVdkDecryptLoading(false);
    }
  };

  const decryptMediaFile = async (assetId: string, encryptedFileUrl: string, originalFilename: string) => {
    try {
      setDecryptingMediaId(assetId);
      const masterVdk = masterVdks[assetId];
      if (!masterVdk) throw new Error("Vault is not unlocked or VDK is missing.");

      // Fetch the encrypted file from the URL (stored in public/uploads/...)
      const fileRes = await fetch(encryptedFileUrl);
      if (!fileRes.ok) throw new Error("Failed to fetch encrypted media from server.");
      const encryptedData = await fileRes.text();

      // Decrypt the payload
      const decryptedFileStr = await decryptPayload(encryptedData, masterVdk);
      const fileObj = JSON.parse(decryptedFileStr); // { filename, bytes: base64 }

      // Convert base64 to Blob url
      const binaryString = atob(fileObj.bytes);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: originalFilename.endsWith('.webm') ? 'video/webm' : 'application/octet-stream' });
      const blobUrl = URL.createObjectURL(blob);

      setDecryptedMediaUrls(prev => ({ ...prev, [assetId]: blobUrl }));

      // If it is not a video, auto download it
      if (!originalFilename.endsWith('.webm')) {
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = originalFilename;
        document.body.appendChild(a);
        a.click();
        a.remove();
      }
    } catch (err: any) {
      alert("Media decryption failed: " + err.message);
    } finally {
      setDecryptingMediaId(null);
    }
  };

  const downloadBackup = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(decryptedAssets, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `urithivault-decrypted-backup-${user.email}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className={styles.container}>
      {celebrate && (
        <div className={styles.confettiContainer}>
          {confettiElements.map((el) => {
            const left = Math.random() * 100;
            const delay = Math.random() * 2;
            const duration = 1.5 + Math.random() * 1.5;
            return (
              <div 
                key={el} 
                className={styles.confetti} 
                style={{ 
                  left: `${left}%`, 
                  animationDelay: `${delay}s`,
                  animationDuration: `${duration}s`
                }} 
              />
            );
          })}
        </div>
      )}

      <header className={styles.header}>
        <div className={styles.nav}>
          <div className={styles.logo}>
            <Shield className={styles.logoIcon} size={24} />
            <span>Urithi<span style={{ color: 'var(--accent-gold)' }}>Vault</span></span>
          </div>

          <div className={styles.userInfo}>
            <div className={styles.userBadge}>
              <User size={14} />
              <span>{user.email}</span>
              <span className={styles.roleLabel} style={{ background: '#10b981', color: '#fff' }}>Heir</span>
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
        <section className={styles.onboardingHeader} style={{ gridTemplateColumns: '1fr' }}>
          <div className={`${styles.gamifiedStats} glass`} style={{ padding: '24px', flexWrap: 'wrap', gap: '20px' }}>
            <div style={{ flexGrow: 1, textAlign: 'left' }}>
              <span className={styles.levelBadge} style={{ background: '#10b981' }}>Beneficiary Portal</span>
              <h2 className={styles.statsTitle} style={{ marginTop: '6px' }}>Heritage Claimant Center</h2>
              <p className={styles.statsDesc} style={{ margin: 0 }}>
                Access and secure the assets left by your loved ones under strict cryptographic integrity.
              </p>
            </div>
          </div>
        </section>

        {/* Claim filing and listing grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.8fr', gap: '24px', marginTop: '24px' }}>
          
          {/* File a claim form */}
          <div className="glass" style={{ padding: '24px', borderRadius: '8px', border: '1px solid var(--border-color)', height: 'fit-content' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <FileCheck size={20} style={{ color: 'var(--accent-gold)' }} />
              <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Initiate Claim Request</h3>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '18px', textAlign: 'left' }}>
              File a death or incapacitation claim against an owner's vault. This starts the 14-day escrow cooldown period.
            </p>

            {claimError && (
              <div className={styles.alertError} style={{ marginBottom: '16px' }}>
                <AlertCircle size={16} />
                <span>{claimError}</span>
              </div>
            )}

            {claimSuccess && (
              <div style={{ padding: '12px', background: 'rgba(16,185,129,0.06)', border: '1px solid #10b981', color: '#10b981', borderRadius: '4px', fontSize: '0.8rem', marginBottom: '16px', display: 'flex', gap: '8px', alignItems: 'flex-start', textAlign: 'left' }}>
                <Check size={18} style={{ flexShrink: 0 }} />
                <span>{claimSuccess}</span>
              </div>
            )}

            <form onSubmit={handleFileClaim} className={styles.form}>
              <div className="form-group">
                <label className="form-label">Owner Email Address</label>
                <input
                  type="email"
                  value={searchEmail}
                  onChange={(e) => setSearchEmail(e.target.value)}
                  placeholder="owner@domain.com"
                  required
                  style={{ width: '100%' }}
                />
              </div>

              <div className="form-group" style={{ marginTop: '12px' }}>
                <label className="form-label">Proof of Event Document</label>
                <div style={{ position: 'relative', border: '2px dashed var(--border-color)', borderRadius: '8px', padding: '16px', textAlign: 'center', cursor: 'pointer' }}>
                  <Upload size={20} style={{ color: 'var(--accent-gold)', marginBottom: '6px' }} />
                  <span style={{ fontSize: '0.75rem', display: 'block' }}>
                    {proofFile ? proofFile.name : 'Upload Certificate scan (PDF/Image)'}
                  </span>
                  <input
                    type="file"
                    onChange={handleFileChange}
                    required
                    style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 0, cursor: 'pointer' }}
                  />
                </div>
              </div>

              <button type="submit" className={styles.btnGold} disabled={uploadLoading} style={{ marginTop: '20px', width: '100%', justifyContent: 'center' }}>
                {uploadLoading ? <Loader2 className="animate-spin" size={18} /> : 'Submit Claim & Start Escrow'}
              </button>
            </form>
          </div>

          {/* Active claims lists */}
          <div className="glass" style={{ padding: '24px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '1.1rem', textAlign: 'left' }}>Your Filed Vault Claims</h3>
            
            {loadingClaims ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}>
                <Loader2 className="animate-spin" size={24} style={{ color: 'var(--accent-gold)' }} />
              </div>
            ) : claims.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
                <FileText size={36} style={{ margin: '0 auto 12px auto', opacity: 0.3 }} />
                <p style={{ margin: 0, fontSize: '0.9rem' }}>No claims filed yet.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {claims.map((claim) => {
                  const cooldownEnds = new Date(claim.cooldownEnds);
                  const isPending = claim.status === 'pending';
                  const isApproved = claim.status === 'approved';
                  const isCancelled = claim.status === 'cancelled';
                  
                  // Calculate remaining days
                  const now = new Date();
                  const diffTime = cooldownEnds.getTime() - now.getTime();
                  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                  const progressPct = isApproved ? 100 : isCancelled ? 0 : Math.max(0, Math.min(100, ((14 - diffDays) / 14) * 100));

                  return (
                    <div key={claim.id} style={{ border: '1px solid var(--border-color)', borderRadius: '6px', padding: '16px', background: 'rgba(0,0,0,0.15)', textAlign: 'left' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                        <div>
                          <strong style={{ fontSize: '0.9rem', color: '#fff' }}>Vault Owner: {claim.user?.email || 'Vault Owner'}</strong>
                          <span style={{ fontSize: '0.75rem', display: 'block', color: 'var(--text-muted)', marginTop: '2px' }}>
                            Filed: {new Date(claim.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <span 
                          className={styles.roleLabel} 
                          style={{ 
                            background: isApproved ? '#10b981' : isCancelled ? 'var(--accent-danger)' : 'var(--accent-gold)', 
                            color: '#000',
                            fontSize: '0.65rem'
                          }}
                        >
                          {claim.status}
                        </span>
                      </div>

                      {/* Cooldown progress bar */}
                      <div style={{ marginTop: '16px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                          <span>14-Day Cooldown Escrow</span>
                          <span>{isApproved ? 'Unlock Approved' : isCancelled ? 'Claim Disputed' : `${diffDays} days remaining`}</span>
                        </div>
                        <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', overflow: 'hidden' }}>
                          <div style={{ width: `${progressPct}%`, height: '100%', background: isApproved ? '#10b981' : isCancelled ? 'var(--accent-danger)' : 'var(--accent-gold)', transition: 'width 0.4s ease' }} />
                        </div>
                      </div>

                      {isPending && (
                        <p style={{ margin: '12px 0 0 0', fontSize: '0.75rem', color: 'var(--accent-gold)' }}>
                          ⚠️ Cooldown Active: If the owner does not click "Proof of Life" warnings within 14 days, the vault will self-unlock.
                        </p>
                      )}
                      
                      {isCancelled && (
                        <p style={{ margin: '12px 0 0 0', fontSize: '0.75rem', color: 'var(--accent-danger)' }}>
                          🚫 Disputed: Owner verified their Proof of Life. The claim has been rejected.
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Unlocked Assets view */}
        <section style={{ marginTop: '40px' }}>
          <div className="glass" style={{ padding: '28px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Lock size={24} style={{ color: isUnlocked ? '#10b981' : 'var(--accent-gold)' }} />
                <div style={{ textAlign: 'left' }}>
                  <h3 style={{ margin: 0, fontSize: '1.25rem' }}>Decrypted Vault Holdings</h3>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    Inherited documents and items mapped specifically to your email
                  </p>
                </div>
              </div>
              {isUnlocked && (
                <button className={styles.btnGold} onClick={downloadBackup} style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Download size={16} />
                  <span>Download Backup JSON</span>
                </button>
              )}
            </div>

            {assets.length === 0 ? (
              <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--text-muted)' }}>
                <Key size={48} style={{ margin: '0 auto 12px auto', opacity: 0.15 }} />
                <p style={{ margin: 0, fontSize: '0.95rem' }}>No unlocked assets available.</p>
                <span style={{ fontSize: '0.8rem' }}>Assets are only displayed here once a filed claim cooldown completes or gets trustee approval.</span>
              </div>
            ) : !isUnlocked ? (
              /* Unlock Screen */
              <div style={{ maxWidth: '440px', margin: '0 auto', textAlign: 'center', padding: '20px 0' }}>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '20px' }}>
                  Enter the **Heir Access Passcode** given to you by the owner to decrypt their VDK and read your designated assets.
                </p>

                {unlockError && (
                  <div className={styles.alertError} style={{ marginBottom: '16px' }}>
                    <AlertCircle size={16} />
                    <span>{unlockError}</span>
                  </div>
                )}

                <form onSubmit={handleDecryptVdk} className={styles.form} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div className="form-group">
                    <input
                      type="password"
                      value={passcode}
                      onChange={(e) => setPasscode(e.target.value)}
                      placeholder="Enter Heir Passcode"
                      required
                      style={{ textAlign: 'center', padding: '12px', fontSize: '1.1rem' }}
                    />
                  </div>
                  <button type="submit" className={styles.btnGold} disabled={vdkDecryptLoading} style={{ justifyContent: 'center', padding: '12px' }}>
                    {vdkDecryptLoading ? <Loader2 className="animate-spin" size={18} /> : 'Decrypt Heritage Vault'}
                  </button>
                </form>
              </div>
            ) : (
              /* Decrypted Assets Display */
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px', textAlign: 'left' }}>
                {assets.map((asset) => {
                  const data = decryptedAssets[asset.assetId];
                  const hasError = data?.error;

                  return (
                    <div 
                      key={asset.assetId} 
                      style={{ 
                        border: '1px solid var(--border-color)', 
                        borderRadius: '8px', 
                        padding: '20px', 
                        background: 'rgba(255,255,255,0.01)',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between'
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                          <span 
                            className={styles.levelBadge} 
                            style={{ 
                              background: asset.category === 'financial' ? 'rgba(197,160,89,0.1)' : 'rgba(16,185,129,0.1)', 
                              color: asset.category === 'financial' ? 'var(--accent-gold)' : '#10b981' 
                            }}
                          >
                            {asset.category.toUpperCase()}
                          </span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>From: {asset.ownerEmail}</span>
                        </div>

                        {hasError ? (
                          <div style={{ fontSize: '0.8rem', color: 'var(--accent-danger)' }}>{data.error}</div>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {asset.category === 'financial' && (
                              <>
                                <h4 style={{ margin: 0, fontSize: '1.1rem', color: '#fff' }}>{data.bankName}</h4>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                  <div style={{ padding: '4px 0' }}><strong>Account:</strong> {data.accountNumber}</div>
                                  <div style={{ padding: '4px 0' }}><strong>Branch:</strong> {data.branch}</div>
                                  <div style={{ padding: '4px 0' }}><strong>Currency:</strong> {data.currency}</div>
                                </div>
                              </>
                            )}

                            {asset.category === 'land' && (
                              <>
                                <h4 style={{ margin: 0, fontSize: '1.1rem', color: '#fff' }}>Title deed: {data.titleDeedNumber}</h4>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                  <div style={{ padding: '4px 0' }}><strong>Size:</strong> {data.parcelSize}</div>
                                  <div style={{ padding: '4px 0' }}><strong>Location:</strong> {data.physicalLocation}</div>
                                  <div style={{ padding: '4px 0' }}><strong>Registry:</strong> {data.registryOffice}</div>
                                </div>
                              </>
                            )}

                            {asset.category === 'sacco' && (
                              <>
                                <h4 style={{ margin: 0, fontSize: '1.1rem', color: '#fff' }}>{data.chamaName}</h4>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                  <div style={{ padding: '4px 0' }}><strong>Shares:</strong> {data.shareAmount} KES</div>
                                  <div style={{ padding: '4px 0' }}><strong>Account:</strong> {data.chamaAccount}</div>
                                  <div style={{ padding: '4px 0' }}><strong>Leader:</strong> {data.leaderContact}</div>
                                </div>
                              </>
                            )}

                            {asset.category === 'document' && !data.fileUrl && (
                              <>
                                <h4 style={{ margin: 0, fontSize: '1.1rem', color: '#fff' }}>{data.docType?.toUpperCase()}</h4>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                  <div style={{ padding: '4px 0' }}><strong>Hardcopy Location:</strong> {data.hardcopyLocation}</div>
                                  <div style={{ padding: '4px 0' }}><strong>Lawyer:</strong> {data.lawyerName} ({data.lawyerContact})</div>
                                </div>
                              </>
                            )}

                            {/* Legacy Decrypted Files or Videos */}
                            {(asset.category === 'video' || (asset.category === 'document' && data.fileUrl)) && (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  {asset.category === 'video' ? <Video size={18} style={{ color: 'var(--accent-gold)' }} /> : <FileText size={18} style={{ color: '#10b981' }} />}
                                  <span style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>{data.filename || 'Legacy attachment'}</span>
                                </div>

                                {decryptedMediaUrls[asset.assetId] ? (
                                  asset.category === 'video' ? (
                                    <video src={decryptedMediaUrls[asset.assetId]} controls style={{ width: '100%', borderRadius: '4px', border: '1px solid var(--border-color)', maxHeight: '180px' }} />
                                  ) : (
                                    <span style={{ fontSize: '0.75rem', color: '#10b981' }}>✓ Decrypted and Downloaded!</span>
                                  )
                                ) : (
                                  <button
                                    onClick={() => decryptMediaFile(asset.assetId, data.fileUrl, data.filename || 'legacy-file.enc')}
                                    disabled={decryptingMediaId === asset.assetId}
                                    className={styles.btnGold}
                                    style={{ fontSize: '0.8rem', padding: '6px 12px', justifyContent: 'center' }}
                                  >
                                    {decryptingMediaId === asset.assetId ? (
                                      <Loader2 className="animate-spin" size={14} />
                                    ) : (
                                      <>
                                        <Lock size={12} style={{ marginRight: '6px' }} />
                                        Decrypt {asset.category === 'video' ? 'Video Message' : 'Document File'}
                                      </>
                                    )}
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

// ==========================================
// TRUSTEE / VERIFIER DASHBOARD COMPONENT
// ==========================================
interface TrusteeDashboardProps {
  user: UserProfile;
  handleLogout: () => void;
  triggerCelebration: () => void;
  celebrate: boolean;
  confettiElements: number[];
}

function TrusteeDashboard({
  user,
  handleLogout,
  triggerCelebration,
  celebrate,
  confettiElements,
}: TrusteeDashboardProps) {
  const [claims, setClaims] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchClaims();
  }, []);

  const fetchClaims = async () => {
    try {
      const res = await fetch('/api/claims/list');
      if (res.ok) {
        const data = await res.json();
        setClaims(data.claims || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyClaim = async (claimId: string, action: 'approve' | 'reject') => {
    setError('');
    setSuccess('');
    setActionLoading(prev => ({ ...prev, [claimId]: true }));

    try {
      const res = await fetch('/api/claims/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ claimId, action }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Claim resolution failed');

      setSuccess(`Claim successfully ${action === 'approve' ? 'approved' : 'rejected'}!`);
      triggerCelebration();
      fetchClaims();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(prev => ({ ...prev, [claimId]: false }));
    }
  };

  return (
    <div className={styles.container}>
      {celebrate && (
        <div className={styles.confettiContainer}>
          {confettiElements.map((el) => {
            const left = Math.random() * 100;
            const delay = Math.random() * 2;
            const duration = 1.5 + Math.random() * 1.5;
            return (
              <div 
                key={el} 
                className={styles.confetti} 
                style={{ 
                  left: `${left}%`, 
                  animationDelay: `${delay}s`,
                  animationDuration: `${duration}s`
                }} 
              />
            );
          })}
        </div>
      )}

      <header className={styles.header}>
        <div className={styles.nav}>
          <div className={styles.logo}>
            <Shield className={styles.logoIcon} size={24} />
            <span>Urithi<span style={{ color: 'var(--accent-gold)' }}>Vault</span></span>
          </div>

          <div className={styles.userInfo}>
            <div className={styles.userBadge}>
              <User size={14} />
              <span>{user.email}</span>
              <span className={styles.roleLabel} style={{ background: '#f59e0b', color: '#000' }}>Trustee</span>
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
        <section className={styles.onboardingHeader} style={{ gridTemplateColumns: '1fr' }}>
          <div className={`${styles.gamifiedStats} glass`} style={{ padding: '24px', flexWrap: 'wrap', gap: '20px' }}>
            <div style={{ flexGrow: 1, textAlign: 'left' }}>
              <span className={styles.levelBadge} style={{ background: '#f59e0b', color: '#000' }}>Verification Portal</span>
              <h2 className={styles.statsTitle} style={{ marginTop: '6px' }}>Vault Verification Center</h2>
              <p className={styles.statsDesc} style={{ margin: 0 }}>
                Review, confirm, and verify submitted claims against registered heritage vaults.
              </p>
            </div>
          </div>
        </section>

        {/* Action Panel */}
        <div className="glass" style={{ padding: '24px', borderRadius: '12px', border: '1px solid var(--border-color)', marginTop: '24px', textAlign: 'left' }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '1.2rem' }}>Claims Awaiting Verification</h3>

          {error && (
            <div className={styles.alertError} style={{ marginBottom: '16px' }}>
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div style={{ padding: '12px', background: 'rgba(16,185,129,0.06)', border: '1px solid #10b981', color: '#10b981', borderRadius: '4px', fontSize: '0.8rem', marginBottom: '16px', display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
              <Check size={18} style={{ flexShrink: 0 }} />
              <span>{success}</span>
            </div>
          )}

          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
              <Loader2 className="animate-spin" size={28} style={{ color: 'var(--accent-gold)' }} />
            </div>
          ) : claims.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
              <FileCheck size={48} style={{ margin: '0 auto 16px auto', opacity: 0.15 }} />
              <p style={{ margin: 0, fontSize: '0.95rem' }}>No active claims submitted for verification.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {claims.map((claim) => (
                <div 
                  key={claim.id} 
                  style={{ 
                    border: '1px solid var(--border-color)', 
                    borderRadius: '8px', 
                    padding: '20px', 
                    background: 'rgba(255,255,255,0.01)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '16px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                    <div>
                      <h4 style={{ margin: 0, fontSize: '1rem', color: '#fff' }}>Claim against: {claim.user?.email}</h4>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Filer: {claim.claimant?.email}</span>
                    </div>
                    <span 
                      className={styles.roleLabel} 
                      style={{ 
                        background: claim.status === 'pending' ? 'var(--accent-gold)' : claim.status === 'approved' ? '#10b981' : 'var(--accent-danger)', 
                        color: '#000',
                        fontSize: '0.65rem'
                      }}
                    >
                      {claim.status}
                    </span>
                  </div>

                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    <div><strong>Submitted On:</strong> {new Date(claim.createdAt).toLocaleString()}</div>
                    <div style={{ marginTop: '4px' }}>
                      <strong>Proof Document:</strong>{' '}
                      {claim.proofDocumentUrl ? (
                        <a 
                          href={claim.proofDocumentUrl} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          style={{ color: 'var(--accent-gold)', textDecoration: 'underline' }}
                        >
                          View Document Scan
                        </a>
                      ) : (
                        'No document uploaded'
                      )}
                    </div>
                  </div>

                  {claim.status === 'pending' && (
                    <div style={{ display: 'flex', gap: '12px', marginTop: '4px' }}>
                      <button
                        onClick={() => handleVerifyClaim(claim.id, 'approve')}
                        disabled={actionLoading[claim.id]}
                        className={styles.btnGold}
                        style={{ padding: '8px 16px', background: '#10b981', borderColor: '#10b981', color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}
                      >
                        {actionLoading[claim.id] ? <Loader2 className="animate-spin" size={16} /> : 'Approve claim (Unlock)'}
                      </button>
                      <button
                        onClick={() => handleVerifyClaim(claim.id, 'reject')}
                        disabled={actionLoading[claim.id]}
                        className={styles.btnCancel}
                        style={{ padding: '8px 16px', color: 'var(--accent-danger)', borderColor: 'var(--accent-danger)' }}
                      >
                        Reject Claim
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
