import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  X,
  Sparkles,
  Image as ImageIcon,
  Printer,
  Compass,
  Code2,
  FileSearch,
  BookOpen,
  ChevronRight,
  ShieldCheck,
  Zap,
  Layers,
} from 'lucide-react';
import { ThemeToggle } from '../common/ThemeToggle';

const DESKTOP_NAV_LINKS = [
  { to: '/', label: 'Home' },
  { to: '/photo-size', label: 'Photo Size' },
  { to: '/photo-print', label: 'Photo Print' },
  { to: '/converters', label: 'All Tools' },
  { to: '/analyzer', label: 'File Inspector' },
  { to: '/how-it-works', label: 'How It Works' },
];

const MOBILE_STUDIO_LINKS = [
  {
    to: '/',
    label: 'Universal Converter',
    desc: 'Instant client-side multi-format converter',
    icon: <Zap size={18} className="text-primary" />,
    badge: 'Popular',
  },
  {
    to: '/photo-size',
    label: 'Photo Size Studio',
    desc: 'Exact KB/MB target limits, DPI & dimensions',
    icon: <ImageIcon size={18} className="text-accent" />,
    badge: 'Hot',
  },
  {
    to: '/photo-print',
    label: 'Photo Printout Studio',
    desc: '300 DPI Passport & grid photo layouts',
    icon: <Printer size={18} className="text-success" />,
    badge: '300 DPI',
  },
  {
    to: '/converters',
    label: 'All 25+ Tools Catalog',
    desc: 'PDF, Images, Office, Code & Data tools',
    icon: <Compass size={18} className="text-warning" />,
  },
  {
    to: '/analyzer',
    label: 'File Inspector & Magic Bytes',
    desc: 'Deep binary inspection & metadata tool',
    icon: <FileSearch size={18} className="text-info" />,
  },
  {
    to: '/latex',
    label: 'LaTeX & Math Studio',
    desc: 'Live TeX compiler & formula renderer',
    icon: <Sparkles size={18} className="text-primary" />,
  },
  {
    to: '/code-pdf',
    label: 'Code to PDF Studio',
    desc: 'Syntax-highlighted printable code docs',
    icon: <Code2 size={18} className="text-accent" />,
  },
];

const MOBILE_INFO_LINKS = [
  {
    to: '/how-it-works',
    label: 'How It Works',
    icon: <BookOpen size={16} />,
  },
  {
    to: '/formats',
    label: 'Supported Formats',
    icon: <Layers size={16} />,
  },
  {
    to: '/security',
    label: 'Security & Privacy',
    icon: <ShieldCheck size={16} />,
  },
];

export function Header() {
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  // Close menu on route change & unlock scroll
  useEffect(() => {
    setMenuOpen(false);
    document.body.style.overflow = '';
  }, [location.pathname]);

  // Lock body scroll when mobile drawer is open
  const handleToggleMenu = () => {
    const nextState = !menuOpen;
    setMenuOpen(nextState);
    if (nextState) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
  };

  const handleCloseMenu = () => {
    setMenuOpen(false);
    document.body.style.overflow = '';
  };

  return (
    <>
      <header className={`header ${scrolled ? 'header-scrolled' : ''}`} role="banner">
        <div className="container">
          <nav className="header-nav" aria-label="Main navigation">
            <Link to="/" className="header-logo" aria-label="Any-DoC Home">
              <div className="logo-icon">
                <img src="/multitask-icon.png" alt="Any-DoC Icon" className="logo-multitask-img" />
              </div>
              <span className="logo-text">Any-DoC</span>
            </Link>

            <ul className="nav-links hide-mobile" role="list">
              {DESKTOP_NAV_LINKS.map((link) => (
                <li key={link.to}>
                  <Link
                    to={link.to}
                    className={`nav-link ${location.pathname === link.to ? 'nav-link-active' : ''}`}
                    aria-current={location.pathname === link.to ? 'page' : undefined}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>

            <div className="header-right">
              <ThemeToggle showLabel />
              <Link to="/photo-size" className="btn btn-primary btn-sm hide-mobile">
                Photo Resizer
              </Link>
              
              {/* 3-Line Animated Hamburger Button */}
              <button
                className={`mobile-hamburger-btn ${menuOpen ? 'open' : ''}`}
                onClick={handleToggleMenu}
                aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
                aria-expanded={menuOpen}
              >
                <span className="bar bar-1" />
                <span className="bar bar-2" />
                <span className="bar bar-3" />
              </button>
            </div>
          </nav>
        </div>
      </header>

      {/* ─── Mobile Glassmorphism Navigation Drawer Sheet ─── */}
      <div className={`mobile-drawer-overlay ${menuOpen ? 'active' : ''}`} onClick={handleCloseMenu}>
        <aside
          className={`mobile-drawer-sheet ${menuOpen ? 'active' : ''}`}
          role="dialog"
          aria-label="Mobile Navigation"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Drawer Header */}
          <div className="drawer-header">
            <Link to="/" className="header-logo" onClick={handleCloseMenu}>
              <div className="logo-icon">
                <img src="/multitask-icon.png" alt="Any-DoC Icon" className="logo-multitask-img" />
              </div>
              <span className="logo-text">Any-DoC</span>
            </Link>
            <button
              className="drawer-close-btn"
              onClick={handleCloseMenu}
              aria-label="Close menu"
            >
              <X size={20} />
            </button>
          </div>

          {/* Drawer Body Links */}
          <div className="drawer-body">
            <div className="drawer-section-label">Studios & Tools</div>
            <div className="drawer-links-grid">
              {MOBILE_STUDIO_LINKS.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`drawer-link-card ${location.pathname === item.to ? 'active' : ''}`}
                  onClick={handleCloseMenu}
                >
                  <div className="drawer-card-icon-box">
                    {item.icon}
                  </div>
                  <div className="drawer-card-text">
                    <div className="drawer-card-title-row">
                      <span className="drawer-card-title">{item.label}</span>
                      {item.badge && (
                        <span className="drawer-card-badge">{item.badge}</span>
                      )}
                    </div>
                    <span className="drawer-card-desc">{item.desc}</span>
                  </div>
                  <ChevronRight size={16} className="drawer-card-arrow" />
                </Link>
              ))}
            </div>

            <div className="drawer-section-label mt-4">Resources & Guides</div>
            <div className="drawer-info-list">
              {MOBILE_INFO_LINKS.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`drawer-info-row ${location.pathname === item.to ? 'active' : ''}`}
                  onClick={handleCloseMenu}
                >
                  <span className="drawer-info-icon">{item.icon}</span>
                  <span className="drawer-info-label">{item.label}</span>
                  <ChevronRight size={14} className="drawer-info-arrow" />
                </Link>
              ))}
            </div>
          </div>

          {/* Drawer Footer Actions */}
          <div className="drawer-footer">
            <div className="drawer-theme-box">
              <span className="drawer-theme-title">Theme Mode</span>
              <ThemeToggle showLabel />
            </div>
            <Link
              to="/photo-size"
              className="btn btn-primary w-full"
              style={{ justifyContent: 'center', fontWeight: 700, padding: '12px' }}
              onClick={handleCloseMenu}
            >
              <Sparkles size={16} />
              <span>Open Photo Size Studio</span>
            </Link>
          </div>
        </aside>
      </div>
    </>
  );
}
