import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Header } from './components/layout/Header';
import { Footer } from './components/layout/Footer';
import { ToastContainer } from './components/ui/Toast';
import { HomePage } from './pages/HomePage';
import { ConvertPage } from './pages/ConvertPage';
import { SupportedFormatsPage } from './pages/SupportedFormatsPage';
import {
  PrivacyPage,
  TermsPage,
  SecurityPage,
  ContactPage,
  HowItWorksPage,
} from './pages/InfoPages';
import { AllConvertersPage } from './pages/AllConvertersPage';
import { FileAnalyzerPage } from './pages/FileAnalyzerPage';
import { DynamicToolPage } from './pages/DynamicToolPage';
import { PhotoPrintPage } from './pages/PhotoPrintPage';
import { LatexStudioPage } from './pages/LatexStudioPage';
import { PhotoSizePage } from './pages/PhotoSizePage';
import { ScrollToTop } from './components/common/ScrollToTop';
import './styles/globals.css';
import './styles/components.css';

function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <Header />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/photo-size" element={<PhotoSizePage />} />
        <Route path="/resize" element={<PhotoSizePage />} />
        <Route path="/photo-resize" element={<PhotoSizePage />} />
        <Route path="/convert" element={<ConvertPage />} />
        <Route path="/convert/:slug" element={<DynamicToolPage />} />
        <Route path="/latex" element={<LatexStudioPage />} />
        <Route path="/latex-studio" element={<LatexStudioPage />} />
        <Route path="/code-pdf" element={<LatexStudioPage />} />
        <Route path="/photo-print" element={<PhotoPrintPage />} />
        <Route path="/converters" element={<AllConvertersPage />} />
        <Route path="/analyzer" element={<FileAnalyzerPage />} />
        <Route path="/formats" element={<SupportedFormatsPage />} />
        <Route path="/how-it-works" element={<HowItWorksPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/security" element={<SecurityPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="*" element={
          <main className="page text-center">
            <div className="page-header">
              <h1>404 — Page Not Found</h1>
              <p>The page you're looking for doesn't exist.</p>
            </div>
          </main>
        } />
      </Routes>
      <Footer />
      <ToastContainer />
    </BrowserRouter>
  );
}

export default App;
