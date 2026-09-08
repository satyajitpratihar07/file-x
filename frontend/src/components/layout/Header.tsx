import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Zap, Menu, X } from 'lucide-react';
import { ThemeToggle } from '../common/ThemeToggle';

const NAV_LINKS = [
  { to: '/', label: 'Home' },
  { to: '/photo-print', label: 'Photo Print' },
  { to: '/converters', label: 'All Tools' },
  { to: '/analyzer', label: 'File Inspector' },
  { to: '/convert', label: 'Convert' },
  { to: '/formats', label: 'Formats' },
  { to: '/how-it-works', label: 'How It Works' },
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

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  return (
    <header className={`header ${scrolled ? 'header-scrolled' : ''}`} role="banner">
      <div className="container">
        <nav className="header-nav" aria-label="Main navigation">
          <Link to="/" className="header-logo" aria-label="ConvertX Home">
            <div className="logo-icon">
              <Zap size={20} fill="currentColor" />
            </div>
            <span className="logo-text">ConvertX</span>
          </Link>

          <ul className="nav-links hide-mobile" role="list">
            {NAV_LINKS.map((link) => (
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
            <Link to="/convert" className="btn btn-primary btn-sm hide-mobile">
              Start Converting
            </Link>
            <button
              className="mobile-menu-btn btn btn-ghost btn-icon"
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={menuOpen}
            >
              {menuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </nav>

        {menuOpen && (
          <div className="mobile-menu" role="dialog" aria-label="Mobile navigation">
            <ul role="list">
              {NAV_LINKS.map((link) => (
                <li key={link.to}>
                  <Link
                    to={link.to}
                    className={`mobile-nav-link ${location.pathname === link.to ? 'nav-link-active' : ''}`}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
              <li style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text-2)' }}>
                  Theme Mode
                </span>
                <ThemeToggle showLabel />
              </li>
              <li>
                <Link to="/convert" className="btn btn-primary w-full mt-4">
                  Start Converting
                </Link>
              </li>
            </ul>
          </div>
        )}
      </div>
    </header>
  );
}
