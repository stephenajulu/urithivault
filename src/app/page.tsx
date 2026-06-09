import Link from 'next/link';
import { 
  Shield, 
  Key, 
  Users, 
  CheckCircle2, 
  Clock, 
  Video, 
  Lock, 
  FileText, 
  FileCheck,
  Building,
  Smartphone,
  ChevronRight
} from 'lucide-react';
import styles from './page.module.css';

export default function Home() {
  return (
    <div className={styles.container}>
      {/* Navigation Header */}
      <header className={styles.header}>
        <div className={styles.nav}>
          <div className={styles.logo}>
            <Shield className={styles.logoIcon} size={24} />
            <span>Urithi<span style={{ color: 'var(--accent-gold)' }}>Vault</span></span>
          </div>
          
          <nav className={styles.navLinks}>
            <a href="#features" className={styles.navLink}>Features</a>
            <a href="#workflow" className={styles.navLink}>How it Works</a>
            <a href="#pricing" className={styles.navLink}>Pricing</a>
            <a href="#compliance" className={styles.navLink}>Compliance</a>
          </nav>

          <div className={styles.authButtons}>
            <Link href="/login" className={styles.btnText}>Log In</Link>
            <Link href="/register" className={styles.btnPrimary}>Create Vault</Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main>
        {/* Hero Section */}
        <section className={styles.hero}>
          <div className={styles.badge}>
            <Lock size={12} />
            <span>Zero-Knowledge Digital Inheritance Vault</span>
          </div>
          <h1 className={`${styles.heroTitle} animate-fade-in`}>
            Secure Your <span className="gradient-text">Legacy</span>. Protect Your Family's <span className="gradient-text">Future</span>.
          </h1>
          <p className={styles.heroSub}>
            Store your critical assets, bank accounts, land records, SACCO shares, and encrypted legacy video messages. Ensure they are automatically and securely transferred to your designated heirs upon verified events.
          </p>
          <div className={styles.heroCtas}>
            <Link href="/register" className={styles.btnPrimary} style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
              Create Your Vault <ChevronRight size={16} />
            </Link>
            <a href="#workflow" className={styles.btnSecondary}>
              How it Works
            </a>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className={styles.featuresSection}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Built for Absolute Security & Local Context</h2>
            <p className={styles.sectionSub}>UrithiVault protects your digital and physical assets with zero-knowledge encryption tailored specifically for your needs.</p>
          </div>

          <div className={styles.featuresGrid}>
            {/* Feature 1: Zero-Knowledge */}
            <div className={`${styles.featureCard} glass`}>
              <div className={styles.featureIcon}>
                <Key size={24} />
              </div>
              <h3 className={styles.featureTitle}>Zero-Knowledge Client Encryption</h3>
              <p className={styles.featureDesc}>
                Your vault is encrypted directly in your browser using AES-256-GCM. We never store your master password or unencrypted vault keys, keeping your data visible only to you.
              </p>
            </div>

            {/* Feature 2: Localized Asset Templates */}
            <div className={`${styles.featureCard} glass`}>
              <div className={styles.featureIcon}>
                <Building size={24} />
              </div>
              <h3 className={styles.featureTitle}>Kenya-Specific Forms</h3>
              <p className={styles.featureDesc}>
                Log accounts with pre-made templates for SACCOs (e.g. Stima, Harambee), investment Chamas, land registry parcel coordinates, mobile wallets (M-Pesa details), and insurance.
              </p>
            </div>

            {/* Feature 3: Passive Escrow Countdown */}
            <div className={`${styles.featureCard} glass`}>
              <div className={styles.featureIcon}>
                <Clock size={24} />
              </div>
              <h3 className={styles.featureTitle}>14-Day Escrow Cooldown</h3>
              <p className={styles.featureDesc}>
                If a beneficiary files a claim, the system alerts you daily via SMS, Email, and robocall. If you are active, cancel the claim in a single tap; if inactive, keys release safely.
              </p>
            </div>

            {/* Feature 4: Legacy Video Messages */}
            <div className={`${styles.featureCard} glass`}>
              <div className={styles.featureIcon}>
                <Video size={24} />
              </div>
              <h3 className={styles.featureTitle}>Encrypted Video Messages</h3>
              <p className={styles.featureDesc}>
                Record secure personal video messages, family instructions, or detailed will summaries that will only be decrypted and shared after the vault unlocks.
              </p>
            </div>

            {/* Feature 5: Multi-Key Override */}
            <div className={`${styles.featureCard} glass`}>
              <div className={styles.featureIcon}>
                <Users size={24} />
              </div>
              <h3 className={styles.featureTitle}>Trustee Key Recovery</h3>
              <p className={styles.featureDesc}>
                Assign trusted lawyers, family members, or doctors as verifiers. They can verify claims or initiate recovery with multi-key decryption rules.
              </p>
            </div>

            {/* Feature 6: Metadata & File Attachments */}
            <div className={`${styles.featureCard} glass`}>
              <div className={styles.featureIcon}>
                <FileText size={24} />
              </div>
              <h3 className={styles.featureTitle}>Encrypted Document Storage</h3>
              <p className={styles.featureDesc}>
                Upload title deeds, pension payslips, share certificates, and wills. Files are encrypted client-side before S3 upload, keeping files 100% private.
              </p>
            </div>
          </div>
        </section>

        {/* Workflow Section */}
        <section id="workflow" className={styles.workflowSection}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>How UrithiVault Works</h2>
            <p className={styles.sectionSub}>A simple, set-and-forget safeguard that takes less than 30 minutes to configure.</p>
          </div>

          <div className={styles.workflowSteps}>
            <div className={styles.stepCard}>
              <span className={styles.stepNumber}>01</span>
              <h4 className={styles.stepTitle}>Catalog Your Assets</h4>
              <p className={styles.stepDesc}>Log accounts, upload deeds/certificates, and map where your land, investments, SACCOs, and digital accounts reside.</p>
            </div>

            <div className={styles.stepCard}>
              <span className={styles.stepNumber}>02</span>
              <h4 className={styles.stepTitle}>Assign Beneficiaries</h4>
              <p className={styles.stepDesc}>Link specific assets to specific loved ones. Heirs only get access to the specific folders you designate for them.</p>
            </div>

            <div className={styles.stepCard}>
              <span className={styles.stepNumber}>03</span>
              <h4 className={styles.stepTitle}>Passive Protection</h4>
              <p className={styles.stepDesc}>You don't need to check in. The system remains completely silent and private until a claim trigger is initialized.</p>
            </div>

            <div className={styles.stepCard}>
              <span className={styles.stepNumber}>04</span>
              <h4 className={styles.stepTitle}>Secure Transfer</h4>
              <p className={styles.stepDesc}>Upon verified claims and a completed 14-day escrow warning countdown, the specific assets unlock for your heirs.</p>
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section id="pricing" className={styles.pricingSection}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Flexible Protection Tiers</h2>
            <p className={styles.sectionSub}>Choose the level of legacy planning suited for you and your family.</p>
          </div>

          <div className={styles.pricingGrid}>
            {/* Basic Tier */}
            <div className={`${styles.pricingCard} glass`}>
              <h3 className={styles.tierName}>Basic Tier</h3>
              <p className={styles.tierDesc}>Perfect for securing core accounts and details.</p>
              <div className={styles.priceBox}>
                <span className={styles.currency}>KES</span>
                <span className={styles.amount}>2,500</span>
                <span className={styles.period}>/year</span>
              </div>
              <ul className={styles.featureList}>
                <li className={styles.featureItem}><CheckCircle2 className={styles.featureCheck} size={16} /> 3 Asset Categories</li>
                <li className={styles.featureItem}><CheckCircle2 className={styles.featureCheck} size={16} /> 1 Beneficiary Mapping</li>
                <li className={styles.featureItem}><CheckCircle2 className={styles.featureCheck} size={16} /> 50MB Encrypted Storage</li>
                <li className={styles.featureItem}><CheckCircle2 className={styles.featureCheck} size={16} /> 14-day Escrow Trigger</li>
                <li className={styles.featureItem} style={{ color: 'var(--text-muted)' }}>❌ Legacy Video Messages</li>
              </ul>
              <Link href="/register" className={styles.btnSecondary} style={{ textAlign: 'center' }}>Get Basic</Link>
            </div>

            {/* Premium Tier */}
            <div className={`${styles.pricingCard} ${styles.pricingCardFeatured} glass`}>
              <span className={styles.featuredBadge}>Recommended</span>
              <h3 className={styles.tierName}>Premium Tier</h3>
              <p className={styles.tierDesc}>Ideal for individuals with diverse assets and family sizes.</p>
              <div className={styles.priceBox}>
                <span className={styles.currency}>KES</span>
                <span className={styles.amount}>6,000</span>
                <span className={styles.period}>/year</span>
              </div>
              <ul className={styles.featureList}>
                <li className={styles.featureItem}><CheckCircle2 className={styles.featureCheck} size={16} /> Unlimited Asset Records</li>
                <li className={styles.featureItem}><CheckCircle2 className={styles.featureCheck} size={16} /> 5 Beneficiary Mappings</li>
                <li className={styles.featureItem}><CheckCircle2 className={styles.featureCheck} size={16} /> 5GB Encrypted Storage</li>
                <li className={styles.featureItem}><CheckCircle2 className={styles.featureCheck} size={16} /> 14-day Escrow Trigger</li>
                <li className={styles.featureItem}><CheckCircle2 className={styles.featureCheck} size={16} /> 1 Custom Video Message</li>
                <li className={styles.featureItem}><CheckCircle2 className={styles.featureCheck} size={16} /> SMS & Email Alerts</li>
              </ul>
              <Link href="/register" className={styles.btnPrimary} style={{ textAlign: 'center' }}>Get Premium</Link>
            </div>

            {/* Enterprise Tier */}
            <div className={`${styles.pricingCard} glass`}>
              <h3 className={styles.tierName}>Enterprise Tier</h3>
              <p className={styles.tierDesc}>For comprehensive estate protection and trusts.</p>
              <div className={styles.priceBox}>
                <span className={styles.currency}>KES</span>
                <span className={styles.amount}>15,000</span>
                <span className={styles.period}>/year</span>
              </div>
              <ul className={styles.featureList}>
                <li className={styles.featureItem}><CheckCircle2 className={styles.featureCheck} size={16} /> Unlimited Asset Records</li>
                <li className={styles.featureItem}><CheckCircle2 className={styles.featureCheck} size={16} /> Unlimited Beneficiaries</li>
                <li className={styles.featureItem}><CheckCircle2 className={styles.featureCheck} size={16} /> 25GB Encrypted Storage</li>
                <li className={styles.featureItem}><CheckCircle2 className={styles.featureCheck} size={16} /> 14-day Escrow Trigger</li>
                <li className={styles.featureItem}><CheckCircle2 className={styles.featureCheck} size={16} /> 5 Custom Video Messages</li>
                <li className={styles.featureItem}><CheckCircle2 className={styles.featureCheck} size={16} /> Dedicated Trustee Portal</li>
                <li className={styles.featureItem}><CheckCircle2 className={styles.featureCheck} size={16} /> Lawyer/Doctor Verification API</li>
              </ul>
              <Link href="/register" className={styles.btnSecondary} style={{ textAlign: 'center' }}>Get Enterprise</Link>
            </div>
          </div>
        </section>

        {/* Compliance & Trust Banner */}
        <section id="compliance" className={styles.complianceSection}>
          <div className={`${styles.complianceBox} glass`}>
            <h3 className={styles.tierName} style={{ marginBottom: '10px' }}>Secure, Compliant & Legal</h3>
            <p className={styles.tierDesc} style={{ maxWidth: '650px', margin: '0 auto 20px auto' }}>
              UrithiVault is designed in alignment with data protection regulations, keeping your local assets legally and digitally compliant.
            </p>
            <div className={styles.complianceLogos}>
              <div className={styles.complianceItem}>
                <FileCheck className={styles.complianceIcon} size={20} />
                <span>Kenya Data Protection Act (KDPA) Compliant</span>
              </div>
              <div className={styles.complianceItem}>
                <Shield className={styles.complianceIcon} size={20} />
                <span>GDPR Data Privacy Standard</span>
              </div>
              <div className={styles.complianceItem}>
                <Smartphone className={styles.complianceIcon} size={20} />
                <span>Secure SMS & Robocall Verification</span>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className={styles.footer}>
        <div className={styles.footerContent}>
          <div className={styles.logo}>
            <Shield className={styles.logoIcon} size={20} />
            <span style={{ fontSize: '1.2rem' }}>Urithi<span style={{ color: 'var(--accent-gold)' }}>Vault</span></span>
          </div>
          <p className={styles.footerText}>
            © {new Date().getFullYear()} UrithiVault. All rights reserved. Secure inheritance registry.
          </p>
          <div className={styles.footerLinks}>
            <a href="#" className={styles.footerLink}>Terms of Service</a>
            <a href="#" className={styles.footerLink}>Privacy Policy</a>
            <a href="#" className={styles.footerLink}>Consent Manager</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
