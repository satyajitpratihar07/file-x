import { useLocation } from 'react-router-dom';

export function Footer() {
  const location = useLocation();

  // Hide footer on full-screen Photo Studio & LaTeX Studio
  const isFullScreen =
    location.pathname === '/photo-print' ||
    location.pathname === '/latex' ||
    location.pathname === '/latex-studio' ||
    location.pathname === '/code-pdf' ||
    location.pathname.startsWith('/convert/code-to-pdf') ||
    location.pathname.startsWith('/convert/latex-to-pdf') ||
    location.pathname.startsWith('/convert/tex-to-pdf');

  if (isFullScreen) {
    return null;
  }

  return (
    <footer className="footer" role="contentinfo">
      <div className="container">
        {/* ─── Big Size Developer Showcase Banner ─── */}
        <div className="developer-showcase-card">
          <div className="developer-showcase-content">
            <div className="developer-tag">
              <img src="/multitask-icon.png" alt="Developer Icon" className="developer-tag-icon-img" />
              <span>Lead Developer & Creator</span>
            </div>
            <h2 className="developer-big-text">
              Developed by <span className="developer-name-gradient">Satyajit Pratihar</span>
            </h2>
            <p className="developer-subtext">
              Built with precision, performance, and modern web architecture.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
