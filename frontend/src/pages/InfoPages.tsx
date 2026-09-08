import { Shield, Lock, Trash2, Eye, Server, AlertTriangle } from 'lucide-react';

export function PrivacyPage() {
  return (
    <main className="page">
      <div className="page-header">
        <h1>Privacy Policy</h1>
        <p>We take your privacy seriously. Here's exactly what happens to your files.</p>
      </div>
      <div className="container-sm prose-page">
        <div className="prose-section card">
          <div className="prose-icon text-success"><Trash2 size={24} /></div>
          <h2>File Retention</h2>
          <p>
            All uploaded files and converted outputs are <strong>automatically and permanently deleted
            from our servers after 60 minutes</strong>. You can also delete your files immediately
            after downloading using the "Delete Files" button. We do not retain, backup, or archive
            your files.
          </p>
        </div>

        <div className="prose-section card">
          <div className="prose-icon text-primary"><Lock size={24} /></div>
          <h2>What We Collect</h2>
          <p>
            For anonymous conversions (no account required), we collect:
          </p>
          <ul>
            <li>Temporary files you upload (stored with random names, deleted after 60 minutes)</li>
            <li>Standard server logs (request timestamps, IP addresses, HTTP status codes) for security and abuse prevention</li>
            <li>Conversion metadata (file type, size, duration) for service monitoring — not linked to your identity</li>
          </ul>
          <p>We do <strong>not</strong> collect: email addresses, names, browsing history, or file contents for any purpose other than conversion.</p>
        </div>

        <div className="prose-section card">
          <div className="prose-icon text-warning"><Eye size={24} /></div>
          <h2>File Access</h2>
          <p>
            Your files are stored in isolated temporary directories with cryptographically random names.
            No human reads your files. Conversion is performed by automated software only.
            Files are never shared with third parties.
          </p>
        </div>

        <div className="prose-section card">
          <div className="prose-icon text-primary"><Server size={24} /></div>
          <h2>Infrastructure</h2>
          <p>
            Any-DoC runs on secure, high-performance infrastructure. All data is processed in-memory or
            in temporary local storage. We do not use cloud object storage for temporary conversion files.
            File transmission is secured with HTTPS/TLS.
          </p>
        </div>

        <div className="prose-section card">
          <div className="prose-icon text-error"><AlertTriangle size={24} /></div>
          <h2>Your Rights</h2>
          <p>
            You can delete your conversion job and all associated files at any time using the
            "Delete Files" button in the interface. Since we don't require registration,
            there is no account data to request or erase. Server logs are retained for
            security purposes for up to 30 days.
          </p>
        </div>

        <p className="text-sm text-muted mt-8">Last updated: September 2026</p>
      </div>
    </main>
  );
}

export function TermsPage() {
  return (
    <main className="page">
      <div className="page-header">
        <h1>Terms of Service</h1>
        <p>By using Any-DoC, you agree to these terms.</p>
      </div>
      <div className="container-sm prose-page">
        <div className="prose-section card">
          <h2>Acceptable Use</h2>
          <p>You may use Any-DoC to convert files you own or have permission to convert. You may not:</p>
          <ul>
            <li>Upload malicious files, malware, viruses, or exploit code</li>
            <li>Attempt to circumvent security measures or rate limits</li>
            <li>Use automated scripts to abuse the service at scale</li>
            <li>Upload files containing illegal content</li>
            <li>Attempt to access other users' conversion jobs</li>
          </ul>
        </div>
        <div className="prose-section card">
          <h2>Limitations</h2>
          <p>Any-DoC is provided "as is." We do not guarantee 100% uptime or perfect conversion quality for all files. Complex, password-protected, or corrupt files may not convert successfully. We are not responsible for data loss — always keep original copies of your files.</p>
        </div>
        <div className="prose-section card">
          <h2>Service Changes</h2>
          <p>We may modify or discontinue features at any time. Rate limits and file size limits may change to ensure fair use for all users.</p>
        </div>
        <p className="text-sm text-muted mt-8">Last updated: September 2026</p>
      </div>
    </main>
  );
}

export function SecurityPage() {
  const MEASURES = [
    { icon: <Shield size={20} />, title: 'Magic Byte Validation', desc: 'We validate actual file signatures (magic bytes), not just filename extensions. You cannot upload a malicious file by renaming it.' },
    { icon: <Lock size={20} />, title: 'Isolated Job Directories', desc: 'Each conversion job gets its own randomly-named directory. Jobs cannot access each other\'s files.' },
    { icon: <Server size={20} />, title: 'Safe Command Execution', desc: 'External tools like LibreOffice are called with argument arrays, never shell string concatenation. Command injection is not possible.' },
    { icon: <Eye size={20} />, title: 'No File Execution', desc: 'Uploaded files are treated as data only. Source code files (Python, JS, etc.) are rendered as text — never executed.' },
    { icon: <AlertTriangle size={20} />, title: 'ZIP Path Safety', desc: 'ZIP archives are created with path traversal protection. All file paths are validated before inclusion.' },
    { icon: <Trash2 size={20} />, title: 'Automatic Cleanup', desc: 'A cleanup scheduler runs every 15 minutes to delete expired jobs and their files. Nothing lingers.' },
  ];

  return (
    <main className="page">
      <div className="page-header">
        <h1>Security</h1>
        <p>Security is not an afterthought — it's built into every layer of Any-DoC.</p>
      </div>
      <div className="container">
        <div className="security-grid">
          {MEASURES.map((m) => (
            <div key={m.title} className="security-card card">
              <div className="security-icon text-primary">{m.icon}</div>
              <h3>{m.title}</h3>
              <p className="text-sm">{m.desc}</p>
            </div>
          ))}
        </div>
        <div className="prose-section card mt-8 container-sm">
          <h2>Responsible Disclosure</h2>
          <p>If you discover a security vulnerability, please report it via our contact page. We take all reports seriously and respond within 48 hours.</p>
        </div>
      </div>
    </main>
  );
}

export function ContactPage() {
  return (
    <main className="page">
      <div className="page-header">
        <h1>Contact & Feedback</h1>
        <p>Questions, issues, or feature requests? We'd love to hear from you.</p>
      </div>
      <div className="container-sm">
        <div className="card" style={{ padding: '2rem' }}>
          <form className="contact-form" onSubmit={(e) => e.preventDefault()}>
            <div className="form-group">
              <label htmlFor="contact-name">Name</label>
              <input id="contact-name" type="text" className="form-input" placeholder="Your name" />
            </div>
            <div className="form-group">
              <label htmlFor="contact-email">Email</label>
              <input id="contact-email" type="email" className="form-input" placeholder="your@email.com" />
            </div>
            <div className="form-group">
              <label htmlFor="contact-type">Type</label>
              <select id="contact-type" className="form-input">
                <option>Bug Report</option>
                <option>Feature Request</option>
                <option>Question</option>
                <option>Other</option>
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="contact-message">Message</label>
              <textarea id="contact-message" className="form-input" rows={5} placeholder="Describe your issue or feedback..." />
            </div>
            <button type="submit" className="btn btn-primary w-full">Send Message</button>
          </form>
        </div>
      </div>
    </main>
  );
}

export function HowItWorksPage() {
  return (
    <main className="page">
      <div className="page-header">
        <h1>How It Works</h1>
        <p>A transparent look at Any-DoC's conversion process.</p>
      </div>
      <div className="container-sm prose-page">
        <div className="prose-section card">
          <h2>1. Upload & Validate</h2>
          <p>When you select files, they're uploaded securely to an isolated temporary directory. The server validates the actual file signature (magic bytes) — not just the extension — to ensure the file type is supported and safe.</p>
        </div>
        <div className="prose-section card">
          <h2>2. Conversion Routing</h2>
          <p>The conversion registry automatically selects the right engine:</p>
          <ul>
            <li><strong>Images</strong> → Sharp library (fast, high-quality)</li>
            <li><strong>Office documents</strong> → LibreOffice headless</li>
            <li><strong>Text, code, Markdown, JSON, CSV</strong> → PDFKit (custom formatted output)</li>
            <li><strong>PDF → Image</strong> → pdftoppm (poppler-utils)</li>
          </ul>
        </div>
        <div className="prose-section card">
          <h2>3. Real-time Progress</h2>
          <p>Progress updates are streamed to your browser via Server-Sent Events (SSE). You see live progress without polling — and if you have multiple files, each converts in parallel.</p>
        </div>
        <div className="prose-section card">
          <h2>4. Download & Cleanup</h2>
          <p>Download files individually or as a ZIP. Files are automatically deleted after 60 minutes. You can also delete immediately with the "Delete Files" button.</p>
        </div>
      </div>
    </main>
  );
}
