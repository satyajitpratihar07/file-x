import { Link, useLocation } from 'react-router-dom';
import { Zap, Shield, Heart } from 'lucide-react';

export function Footer() {
  const location = useLocation();
  const year = new Date().getFullYear();

  // Hide footer on full-screen Photo Studio
  if (location.pathname === '/photo-print') {
    return null;
  }

  return (
    <footer className="footer" role="contentinfo">
      <div className="container">
        <div className="footer-grid">
          <div className="footer-brand">
            <Link to="/" className="header-logo" aria-label="ConvertX Home">
              <div className="logo-icon"><Zap size={18} fill="currentColor" /></div>
              <span className="logo-text">ConvertX</span>
            </Link>
            <p className="footer-tagline">
              Universal file conversion — fast, secure, and free.
              Your files are automatically deleted after 60 minutes.
            </p>
            <div className="footer-badges">
              <span className="footer-badge"><Shield size={12} /> Secure</span>
              <span className="footer-badge"><Heart size={12} /> Privacy-first</span>
            </div>
          </div>

          <div className="footer-links-group">
            <h4>Convert</h4>
            <ul>
              <li><Link to="/convert">Start Converting</Link></li>
              <li><Link to="/formats">Supported Formats</Link></li>
              <li><Link to="/how-it-works">How It Works</Link></li>
            </ul>
          </div>

          <div className="footer-links-group">
            <h4>Legal</h4>
            <ul>
              <li><Link to="/privacy">Privacy Policy</Link></li>
              <li><Link to="/terms">Terms of Service</Link></li>
              <li><Link to="/security">Security</Link></li>
            </ul>
          </div>

          <div className="footer-links-group">
            <h4>Support</h4>
            <ul>
              <li><Link to="/contact">Contact Us</Link></li>
              <li><Link to="/how-it-works#faq">FAQ</Link></li>
            </ul>
          </div>
        </div>

        <div className="footer-bottom">
          <span>© {year} ConvertX. All rights reserved.</span>
          <span className="footer-bottom-note">
            Files are processed securely and deleted automatically.
            We never store your documents permanently.
          </span>
        </div>
      </div>
    </footer>
  );
}
