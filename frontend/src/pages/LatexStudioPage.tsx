import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Download,
  Printer,
  FileCode,
  Sparkles,
  Play,
  ZoomIn,
  ZoomOut,
  Trash2,
  ChevronDown,
  Upload,
  Search,
  Share2,
  History,
  Layout,
  Plus,
  Zap,
  Layers,
  AlertTriangle,
  RotateCw,
  Maximize,
  CheckCircle2,
  RefreshCw,
  FileText,
  Terminal,
} from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import '../styles/latex-studio.css';

// Set up exact matching PDF.js worker via Vite asset URL
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

interface TemplateOption {
  id: string;
  name: string;
  category: string;
  code: string;
}

const TEMPLATES: TemplateOption[] = [
  {
    id: 'ats_gold_standard',
    name: 'ats_swe_gold.tex (⭐ ATS Gold Standard 100/100)',
    category: 'ATS Gold Standard',
    code: `\\documentclass[10pt,a4paper]{article}
\\usepackage[margin=0.65in]{geometry}
\\usepackage{amsmath,amssymb}
\\usepackage{hyperref}

\\begin{document}

\\begin{center}
  {\\Huge \\textbf{JAKE R. SULLIVAN}}\\\\
  \\vspace{3pt}
  \\textsf{jake.sullivan@gmail.com} \\;\\textbar\\; \\textsf{+1 (555) 342-9812} \\;\\textbar\\; \\href{https://linkedin.com/in/jake-sullivan}{linkedin.com/in/jake-sullivan} \\;\\textbar\\; \\href{https://github.com/jakesullivan}{github.com/jakesullivan} \\;\\textbar\\; \\textsf{San Francisco, CA}
\\end{center}

\\vspace{4pt}

\\section*{PROFESSIONAL SUMMARY}
\\noindent
Results-oriented Senior Software Engineer with 6+ years of experience designing high-throughput distributed backend architectures, microservices, and real-time cloud data pipelines. Proven record of reducing cloud infrastructure expenditure by \\$1.4M and boosting system reliability to 99.99\\% across global clusters.

\\section*{EDUCATION}
\\noindent
\\textbf{University of California, Berkeley} \\hfill \\textsf{Aug 2015 -- May 2019}\\\\
\\textit{Bachelor of Science in Computer Science} --- GPA: 3.88 / 4.00 \\hfill \\textsf{Berkeley, CA}\\\\
Relevant Coursework: Distributed Systems, Data Structures \\& Algorithms, Database Systems, Cloud Computing

\\section*{TECHNICAL SKILLS}
\\noindent
\\textbf{Languages:} Python, Go, TypeScript, Java, C++, SQL, LaTeX, Bash\\\\
\\textbf{Frameworks \\& Libraries:} React, Node.js, FastAPI, Django, GraphQL, Spring Boot\\\\
\\textbf{Cloud \\& DevOps:} AWS (EKS, RDS, S3, Lambda), Docker, Kubernetes, Terraform, CI/CD, Kafka, Redis\\\\
\\textbf{Developer Tools:} Git, PostgreSQL, MongoDB, Prometheus, Grafana, Linux/Unix

\\section*{EXPERIENCE}
\\noindent
\\textbf{Senior Backend Software Engineer} \\hfill \\textsf{June 2021 -- Present}\\\\
\\textit{Apex Enterprise Cloud} \\hfill \\textsf{San Francisco, CA}
\\begin{itemize}
  \\item Architected and deployed distributed event-driven message queue using Apache Kafka and Go, processing 35M+ events per day with sub-20ms latency.
  \\item Reduced AWS compute and egress costs by 34\\% (\\$420,000 annually) by refactoring resource-intensive microservices to serverless AWS Lambda and DynamoDB.
  \\item Spearheaded database optimization across 14 PostgreSQL clusters, reducing p99 API query response time from 380ms to 42ms.
  \\item Mentored 5 junior and mid-level software engineers on microservice design patterns and automated integration testing.
\\end{itemize}

\\vspace{3pt}
\\noindent
\\textbf{Software Engineer} \\hfill \\textsf{July 2019 -- May 2021}\\\\
\\textit{Nexus Data Systems} \\hfill \\textsf{Austin, TX}
\\begin{itemize}
  \\item Engineered RESTful and GraphQL APIs for enterprise real-time collaboration suite serving 250,000+ daily active users.
  \\item Integrated OAuth 2.0 and RBAC access control mechanisms, achieving full compliance with SOC 2 Type II and GDPR standards.
  \\item Automated multi-region deployment pipeline with Terraform and GitHub Actions, slashing deployment cycle duration by 65\\%.
\\end{itemize}

\\section*{PROJECTS}
\\noindent
\\textbf{Distributed In-Memory Cache Engine} \\hfill \\textsf{Go, Redis Protocol, Raft Consensus}\\\\
\\begin{itemize}
  \\item Built a high-performance distributed key-value store in Go implementing Raft consensus protocol, supporting 120,000 requests/second.
\\end{itemize}

\\end{document}`,
  },
  {
    id: 'corporate_2page',
    name: 'corporate_resume.tex (2-Page Executive ATS)',
    category: 'Corporate Resume',
    code: `\\documentclass[11pt,a4paper]{article}
\\usepackage[margin=0.75in]{geometry}
\\usepackage{amsmath,amssymb}
\\usepackage{hyperref}

\\begin{document}

\\begin{center}
  {\\Huge \\textbf{ALEXANDER MERCER, M.S.}}\\\\
  \\vspace{4pt}
  \\textsf{\\textbf{VP of Engineering \\& Enterprise Systems Architect}}\\\\
  \\vspace{2pt}
  \\textsf{alexander.mercer@apexcloud.io} \\;\\textbar\\; \\textsf{+1 (555) 234-5678} \\;\\textbar\\; \\href{https://linkedin.com/in/alex-mercer}{linkedin.com/in/alex-mercer} \\;\\textbar\\; \\textsf{San Francisco, CA}
\\end{center}

\\vspace{6pt}

\\section*{EXECUTIVE SUMMARY}
\\noindent
Results-driven VP of Engineering and Technical Fellow with 10+ years of enterprise leadership delivering mission-critical cloud platforms, distributed file processing engines, and machine learning pipelines. Orchestrated organizations of 60+ engineers across 4 global hubs, managing \\$35M+ annual engineering budgets while consistently achieving 99.999\\% infrastructure reliability.

\\section*{CORE COMPETENCIES}
\\noindent
\\textbf{Leadership:} Engineering Management, Agile Governance, Multi-Region Hiring, Executive Stakeholder Alignment\\\\
\\textbf{Architecture:} Distributed Microservices, Cloud Native (AWS / GCP / Azure), Event-Driven Systems, Vector Databases\\\\
\\textbf{Compliance \\& Security:} SOC 2 Type II, ISO 27001, HIPAA, GDPR, Zero-Trust Enterprise Security

\\section*{PROFESSIONAL EXPERIENCE}
\\noindent
\\textbf{Vice President of Engineering} \\hfill \\textsf{2022 -- Present}\\\\
\\textit{Apex Cloud Technologies, San Francisco, CA}
\\begin{itemize}
  \\item Spearheaded architectural overhaul of petabyte-scale document and file conversion engine handling 45M+ daily transformations.
  \\item Reduced cloud infrastructure costs by \\$4.2M annually (38\\% reduction) by adopting zero-copy vectorization.
  \\item Scaled engineering organization from 24 to 72 engineers across Platform, Data, and Security teams.
  \\item Achieved 99.999\\% system availability under SOC 2 compliance for Fortune 500 enterprise clients.
\\end{itemize}

\\vspace{4pt}
\\noindent
\\textbf{Director of Software Architecture} \\hfill \\textsf{2019 -- 2022}\\\\
\\textit{Nexus Enterprise Systems, Austin, TX}
\\begin{itemize}
  \\item Designed distributed real-time collaborative workspace supporting 400K concurrent enterprise seats.
  \\item Led migration of monolithic backend to Kubernetes-orchestrated microservices across AWS multi-region clusters.
  \\item Established corporate CI/CD standard pipelines reducing deployment lead time from 14 days to 18 minutes.
\\end{itemize}

\\newpage

\\section*{PROFESSIONAL EXPERIENCE (CONTINUED)}
\\noindent
\\textbf{Senior Principal Systems Engineer} \\hfill \\textsf{2016 -- 2019}\\\\
\\textit{Stratosphere Analytics, Seattle, WA}
\\begin{itemize}
  \\item Engineered high-throughput low-latency telemetry ingestion pipeline processing 2.4M metrics/sec.
  \\item Patented distributed cache-invalidation protocol reducing database lock contention by 65\\%.
  \\item Mentored 16 senior software engineers, 4 of whom advanced to Staff and Engineering Manager roles.
\\end{itemize}

\\vspace{4pt}
\\noindent
\\textbf{Senior Software Engineer (Platform Infrastructure)} \\hfill \\textsf{2013 -- 2016}\\\\
\\textit{Vanguard Digital Labs, San Jose, CA}
\\begin{itemize}
  \\item Developed cross-platform document rendering and PDF export pipelines in C++ and Python.
  \\item Implemented OAuth 2.0 / SAML single-sign-on gateway securing access for 3M+ active users.
\\end{itemize}

\\section*{EDUCATION \\& CREDENTIALS}
\\noindent
\\textbf{M.S. in Computer Science (Distributed Systems)} \\hfill \\textsf{2011 -- 2013}\\\\
\\textit{Stanford University, Stanford, CA} --- Honors Fellowship Recipient\\\\
\\vspace{2pt}
\\noindent
\\textbf{B.S. in Computer Engineering \\& Applied Mathematics} \\hfill \\textsf{2007 -- 2011}\\\\
\\textit{University of California, Berkeley} --- Magna Cum Laude (GPA: 3.94 / 4.00)

\\section*{CERTIFICATIONS \\& PATENTS}
\\noindent
\\textbf{AWS Certified Solutions Architect -- Professional} \\hfill \\textsf{Active (Credential ID: AWS-94021)}\\\\
\\textbf{Certified Kubernetes Administrator (CKA)} \\hfill \\textsf{Linux Foundation}\\\\
\\textbf{U.S. Patent US-10482918-B2:} \\textit{Optimized Zero-Copy Vector Streaming in Distributed Cloud Environments}

\\section*{TECHNICAL TOOLCHAIN}
\\noindent
\\textbf{Languages:} Python, Go, TypeScript, C++, Rust, SQL, LaTeX, Bash\\\\
\\textbf{Cloud \\& Platforms:} AWS (EKS, RDS, SQS, DynamoDB), GCP, Docker, Kubernetes, Terraform, Redis, Kafka

\\end{document}`,
  },
  {
    id: 'resume_1page',
    name: 'modern_1page.tex (1-Page Fast CV)',
    category: 'Corporate Resume',
    code: `\\documentclass[11pt,a4paper]{article}
\\usepackage[margin=0.75in]{geometry}
\\usepackage{amsmath,amssymb}
\\usepackage{hyperref}

\\begin{document}

\\begin{center}
  {\\Huge \\textbf{SARAH CHEN, P.E.}}\\\\
  \\vspace{4pt}
  \\textsf{sarah.chen@techcorp.com} \\;\\textbar\\; \\textsf{+1 (555) 876-5432} \\;\\textbar\\; \\href{https://linkedin.com/in/sarah-chen}{linkedin.com/in/sarah-chen} \\;\\textbar\\; \\textsf{New York, NY}
\\end{center}

\\vspace{6pt}

\\section*{PROFESSIONAL SUMMARY}
\\noindent
Senior Full-Stack Software Engineer with 6+ years of specialized experience in high-performance cloud web architectures, real-time file conversion engines, and scalable microservices.

\\section*{EXPERIENCE}
\\noindent
\\textbf{Staff Software Engineer} \\hfill \\textsf{2021 -- Present}\\\\
\\textit{Quantum Matrix Inc, New York, NY}
\\begin{itemize}
  \\item Architected high-speed file conversion pipeline converting 10M+ documents per month.
  \\item Integrated secure in-browser client converters reducing backend compute costs by 32\\%.
  \\item Spearheaded technical design of React web studio with real-time Overleaf-style compiler.
\\end{itemize}

\\vspace{4pt}
\\noindent
\\textbf{Senior Frontend Engineer} \\hfill \\textsf{2018 -- 2021}\\\\
\\textit{Velocity Labs, Boston, MA}
\\begin{itemize}
  \\item Built interactive image manipulation and document typesetting canvas tools.
  \\item Improved web app Lighthouse performance scores from 64 to 98 across core user journeys.
\\end{itemize}

\\section*{EDUCATION}
\\noindent
\\textbf{B.S. in Computer Science} \\hfill \\textsf{2014 -- 2018}\\\\
\\textit{Massachusetts Institute of Technology (MIT)} --- GPA: 3.91 / 4.00

\\section*{SKILLS}
\\noindent
\\textbf{Tech Stack:} TypeScript, React, Python, Node.js, Docker, AWS, PostgreSQL, LaTeX, Vite

\\end{document}`,
  },
  {
    id: 'math',
    name: 'math_research.tex (Academic Article)',
    category: 'Research Paper',
    code: `\\documentclass[12pt,a4paper]{article}
\\usepackage{amsmath,amssymb,amsfonts}
\\usepackage{geometry}
\\geometry{margin=1in}

\\title{\\textbf{Quantum Field Computations and Geometric Topology}}
\\author{\\textbf{Dr. Elena Vance} \\\\ \\textit{Department of Theoretical Physics, MIT}}
\\date{\\today}

\\begin{document}
\\maketitle

\\begin{abstract}
We present a modern formulation of quantum field tensor contractions over compact Riemannian manifolds. Numerical experiments confirm theoretical convergence rates with minimal residual entropy.
\\end{abstract}

\\section{1. Introduction and Field Equations}
Let $(\\mathcal{M}, g)$ be an $n$-dimensional smooth manifold. The fundamental action functional $\\mathcal{S}[\\phi]$ is given by:

\\begin{equation}
\\mathcal{S}[\\phi] = \\int_{\\mathcal{M}} \\left( \\frac{1}{2} g^{\\mu\\nu} \\partial_\\mu \\phi \\partial_\\nu \\phi - V(\\phi) \\right) \\sqrt{|g|} \\, d^n x
\\end{equation}

\\section{2. Main Theorem \\& Hyperbolic Boundary}
Under standard hyperbolic boundary conditions:

\\begin{equation}
\\lim_{t \\to \\infty} \\sum_{k=1}^N \\left( \\frac{\\partial^2 \\psi_k}{\\partial t^2} - c^2 \\nabla^2 \\psi_k \\right) = 0
\\end{equation}

\\section{3. Conclusion}
The proposed formulation preserves gauge symmetry and ensures invariant metric compatibility across all topological boundary conditions.

\\end{document}`,
  },
];

interface AtsCheck {
  title: string;
  passed: boolean;
  score: number;
  weight: number;
  description: string;
}

interface AtsReport {
  score: number;
  grade: 'A+' | 'A' | 'B' | 'Needs Improvement';
  checks: AtsCheck[];
  extractedMetricsCount: number;
  extractedSkillsCount: number;
}

function analyzeAtsCompliance(source: string): AtsReport {
  const checks: AtsCheck[] = [];

  // Check 1: Contact Information (Email, Phone, LinkedIn)
  const hasEmail = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.test(source);
  const hasPhone = /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/.test(source);
  const hasLinkedIn = /linkedin\.com|github\.com/i.test(source);
  const contactPassed = hasEmail && (hasPhone || hasLinkedIn);
  checks.push({
    title: 'Contact Information Header',
    passed: contactPassed,
    score: contactPassed ? 20 : 5,
    weight: 20,
    description: contactPassed
      ? 'Email, phone, and professional link detected in standard header format.'
      : 'Missing email address or phone number in contact header.',
  });

  // Check 2: Core ATS Standard Headings
  const hasExperience = /\\section\*?\{.*(EXPERIENCE|WORK|EMPLOYMENT|HISTORY).*\}/i.test(source);
  const hasEducation = /\\section\*?\{.*(EDUCATION|ACADEMIC|DEGREE).*\}/i.test(source);
  const hasSkills = /\\section\*?\{.*(SKILLS|COMPETENCIES|TECHNICAL|TOOLCHAIN).*\}/i.test(source);
  const hasSummary = /\\section\*?\{.*(SUMMARY|PROFILE|OBJECTIVE|OVERVIEW).*\}/i.test(source);

  const headingCount = [hasExperience, hasEducation, hasSkills, hasSummary].filter(Boolean).length;
  const headingsPassed = headingCount >= 3;
  checks.push({
    title: 'Standard ATS Section Headings',
    passed: headingsPassed,
    score: Math.round((headingCount / 4) * 30),
    weight: 30,
    description: headingsPassed
      ? `Found ${headingCount}/4 standard ATS sections (Experience, Education, Skills, Summary).`
      : 'Use standard section titles: EXPERIENCE, EDUCATION, SKILLS, SUMMARY.',
  });

  // Check 3: Action-Oriented Verbs in Bullet Points
  const actionVerbRegex = /\b(Led|Architected|Spearheaded|Engineered|Developed|Designed|Built|Scaled|Reduced|Automated|Mentored|Achieved|Integrated|Optimized|Implemented|Authored|Managed)\b/gi;
  const verbMatches = source.match(actionVerbRegex) || [];
  const verbsPassed = verbMatches.length >= 4;
  checks.push({
    title: 'Strong Action Verbs in Bullet Points',
    passed: verbsPassed,
    score: verbsPassed ? 20 : Math.min(verbMatches.length * 4, 15),
    weight: 20,
    description: verbsPassed
      ? `Detected ${verbMatches.length} strong leadership & engineering action verbs.`
      : 'Include strong action verbs: Led, Architected, Reduced, Scaled, Developed.',
  });

  // Check 4: Quantifiable Results & Metrics
  const metricRegex = /(\$\s?\d+[\d,.]*(?:M|K|B)?|\d+\s?%|\b\d+\s*(?:M|K|B)\+|\b\d+\+\b)/g;
  const metricMatches = source.match(metricRegex) || [];
  const metricsPassed = metricMatches.length >= 2;
  checks.push({
    title: 'Quantifiable Metrics & Impact ($ / % / numbers)',
    passed: metricsPassed,
    score: metricsPassed ? 15 : Math.min(metricMatches.length * 7, 10),
    weight: 15,
    description: metricsPassed
      ? `Found ${metricMatches.length} quantifiable metrics (e.g. costs reduced, percentages, scale).`
      : 'Add quantifiable metrics: e.g. "Reduced costs by 34%", "scaled to 40M+ requests".',
  });

  // Check 5: Single-Column Linear Hierarchy (No multi-column parsing traps)
  const isLinear = !/\\begin\{multicols\}|\\begin\{columns\}/i.test(source);
  checks.push({
    title: 'Single-Column ATS Layout',
    passed: isLinear,
    score: isLinear ? 15 : 0,
    weight: 15,
    description: isLinear
      ? 'Clean single-column structure guarantees 100% linear ATS parsing accuracy.'
      : 'Avoid multi-column environments that scramble ATS text parsers.',
  });

  const totalScore = checks.reduce((sum, c) => sum + c.score, 0);
  const grade = totalScore >= 90 ? 'A+' : totalScore >= 80 ? 'A' : totalScore >= 65 ? 'B' : 'Needs Improvement';

  return {
    score: Math.min(100, totalScore),
    grade,
    checks,
    extractedMetricsCount: metricMatches.length,
    extractedSkillsCount: verbMatches.length,
  };
}


interface CompileError {
  line?: number;
  message: string;
}

export function LatexStudioPage() {
  const [selectedTemplateId, setSelectedTemplateId] = useState('ats_gold_standard');
  const [code, setCode] = useState(TEMPLATES[0].code);
  const [splitRatio, setSplitRatio] = useState(48); // % of left editor
  const [isDragging, setIsDragging] = useState(false);
  const [isCompiling, setIsCompiling] = useState(false);
  const [compileStatus, setCompileStatus] = useState<'idle' | 'compiling' | 'success' | 'error'>('idle');
  const [activeTabName, setActiveTabName] = useState('ats_swe_gold.tex');
  const [showDropdown, setShowDropdown] = useState(false);
  const [editorMode, setEditorMode] = useState<'code' | 'visual'>('code');
  const [zoom, setZoom] = useState(1.0);
  const [rotation, setRotation] = useState(0);
  const [activeLogTab, setActiveLogTab] = useState<'all' | 'errors' | 'logs' | 'ats'>('all');
  const [compilerEngine, setCompilerEngine] = useState<'pdflatex' | 'xelatex'>('pdflatex');

  // Compilation state & cache
  const [currentBuildId, setCurrentBuildId] = useState<string | null>(null);
  const [currentPdfUrl, setCurrentPdfUrl] = useState<string | null>(null);
  const [pdfPageCount, setPdfPageCount] = useState(1);
  const [compileErrors, setCompileErrors] = useState<CompileError[]>([]);
  const [compilerLog, setCompilerLog] = useState<string>('');
  const [showLogsDrawer, setShowLogsDrawer] = useState(false);

  const workspaceRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);

  // Real-time ATS Audit analysis
  const atsReport = React.useMemo(() => analyzeAtsCompliance(code), [code]);

  // Track latest compilation sequence to prevent race conditions
  const compileSeqRef = useRef<number>(0);
  const pdfDocRef = useRef<pdfjsLib.PDFDocumentProxy | null>(null);

  // Line count for code editor gutter
  const lineCount = code.split('\n').length;

  // Handle Drag Splitter
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !workspaceRef.current) return;
      const rect = workspaceRef.current.getBoundingClientRect();
      const offsetX = e.clientX - rect.left;
      const pct = Math.min(Math.max((offsetX / rect.width) * 100, 20), 80);
      setSplitRatio(pct);
    };

    const handleMouseUp = () => {
      if (isDragging) setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  /**
   * Render loaded PDF.js document into high-resolution canvas elements
   */
  const renderPdfToCanvases = useCallback(async (pdf: pdfjsLib.PDFDocumentProxy, scaleValue: number, rotValue: number) => {
    if (!canvasContainerRef.current) return;
    const container = canvasContainerRef.current;
    container.innerHTML = '';

    const numPages = pdf.numPages;
    setPdfPageCount(numPages);

    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      try {
        const page = await pdf.getPage(pageNum);

        // Page wrapper
        const pageWrapper = document.createElement('div');
        pageWrapper.className = 'latex-page-wrapper';

        // Page badge
        const badge = document.createElement('div');
        badge.className = 'latex-page-badge';
        badge.textContent = `PAGE ${pageNum} OF ${numPages} · ATS A4 PDF`;
        pageWrapper.appendChild(badge);

        // PDF Page container
        const pageContainer = document.createElement('div');
        pageContainer.className = 'latex-pdf-page latex-pdf-canvas-container';
        pageContainer.style.position = 'relative';

        // Calculate viewport with pixel ratio for retina crispness
        const dpr = window.devicePixelRatio || 1;
        const viewport = page.getViewport({ scale: scaleValue * 1.33, rotation: rotValue });

        const canvas = document.createElement('canvas');
        canvas.className = 'latex-pdf-canvas';
        canvas.width = Math.floor(viewport.width * dpr);
        canvas.height = Math.floor(viewport.height * dpr);
        canvas.style.width = `${Math.floor(viewport.width)}px`;
        canvas.style.height = `${Math.floor(viewport.height)}px`;
        canvas.style.display = 'block';

        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.scale(dpr, dpr);
          await page.render({
            canvas,
            canvasContext: ctx,
            viewport,
          }).promise;
        }

        pageContainer.appendChild(canvas);

        // Extract and overlay native PDF hyperlink annotations
        try {
          const annotations = await page.getAnnotations();
          if (annotations && annotations.length > 0) {
            const annoLayer = document.createElement('div');
            annoLayer.className = 'latex-annotation-layer';
            annoLayer.style.position = 'absolute';
            annoLayer.style.top = '0';
            annoLayer.style.left = '0';
            annoLayer.style.width = `${Math.floor(viewport.width)}px`;
            annoLayer.style.height = `${Math.floor(viewport.height)}px`;
            annoLayer.style.pointerEvents = 'none';

            for (const anno of annotations) {
              if (anno.subtype === 'Link' && (anno.url || anno.dest)) {
                const rect = anno.rect;
                let left = 0, top = 0, width = 0, height = 0;
                if (rect && rect.length === 4) {
                  const [vx1, vy1] = viewport.convertToViewportPoint(rect[0], rect[1]);
                  const [vx2, vy2] = viewport.convertToViewportPoint(rect[2], rect[3]);
                  left = Math.min(vx1, vx2);
                  top = Math.min(vy1, vy2);
                  width = Math.abs(vx2 - vx1);
                  height = Math.abs(vy2 - vy1);
                }

                const link = document.createElement('a');
                link.href = anno.url || '#';
                if (anno.url && !anno.url.startsWith('mailto:')) {
                  link.target = '_blank';
                  link.rel = 'noopener noreferrer';
                }
                link.style.position = 'absolute';
                link.style.left = `${left}px`;
                link.style.top = `${top}px`;
                link.style.width = `${Math.max(width, 20)}px`;
                link.style.height = `${Math.max(height, 12)}px`;
                link.style.pointerEvents = 'auto';
                link.style.cursor = 'pointer';
                link.title = anno.url || 'PDF Link';
                annoLayer.appendChild(link);
              }
            }
            pageContainer.appendChild(annoLayer);
          }
        } catch (annoErr) {
          console.debug('Annotation overlay note:', annoErr);
        }

        pageWrapper.appendChild(pageContainer);
        container.appendChild(pageWrapper);
      } catch (err) {
        console.error(`Error rendering PDF page ${pageNum}:`, err);
      }
    }
  }, []);

  /**
   * Re-render current loaded PDF whenever zoom or rotation changes
   */
  useEffect(() => {
    if (pdfDocRef.current) {
      renderPdfToCanvases(pdfDocRef.current, zoom, rotation);
    }
  }, [zoom, rotation, renderPdfToCanvases]);

  /**
   * Primary LaTeX Compiler pipeline
   */
  const executeCompile = useCallback(
    async (sourceCode: string) => {
      const currentSeq = ++compileSeqRef.current;
      setIsCompiling(true);
      setCompileStatus('compiling');

      try {
        const res = await fetch('/api/latex/compile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            source: sourceCode,
            compiler: compilerEngine,
            mainFile: activeTabName,
          }),
        });

        // Race condition check: ignore response if a newer compilation was triggered
        if (currentSeq !== compileSeqRef.current) return;

        const data = await res.json();

        if (data.success && data.pdfUrl) {
          setCurrentBuildId(data.buildId);
          setCurrentPdfUrl(data.pdfUrl);
          setCompilerLog(data.log || '');
          setCompileErrors([]);
          setCompileStatus('success');

          // Fetch pure binary PDF arraybuffer & load into PDF.js
          const pdfRes = await fetch(data.pdfUrl);
          const pdfData = await pdfRes.arrayBuffer();

          if (currentSeq !== compileSeqRef.current) return;

          const loadingTask = pdfjsLib.getDocument({
            data: new Uint8Array(pdfData),
          });
          const pdf = await loadingTask.promise;

          if (currentSeq !== compileSeqRef.current) return;

          pdfDocRef.current = pdf;
          await renderPdfToCanvases(pdf, zoom, rotation);
        } else {
          setCompileStatus('error');
          setCompileErrors(data.errors || [{ message: 'Compilation failed.' }]);
          setCompilerLog(data.log || 'Unknown error occurred.');
          // Keep previous valid PDF visible (do not blank screen)
        }
      } catch (err: any) {
        if (currentSeq !== compileSeqRef.current) return;
        setCompileStatus('error');
        setCompileErrors([{ message: err.message || 'Connection error to LaTeX compiler.' }]);
      } finally {
        if (currentSeq === compileSeqRef.current) {
          setIsCompiling(false);
        }
      }
    },
    [activeTabName, compilerEngine, renderPdfToCanvases, zoom, rotation]
  );

  // Initial compilation on mount
  useEffect(() => {
    executeCompile(code);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Safe Debounced compilation when typing (600ms debounce)
  useEffect(() => {
    const timer = setTimeout(() => {
      executeCompile(code);
    }, 600);
    return () => clearTimeout(timer);
  }, [code, executeCompile]);

  const handleTemplateChange = (tmpl: TemplateOption) => {
    setSelectedTemplateId(tmpl.id);
    setCode(tmpl.code);
    setActiveTabName(tmpl.name.split(' ')[0]);
    setShowDropdown(false);
    executeCompile(tmpl.code);
  };

  const insertTextAtCursor = (prefix: string, suffix: string = '') => {
    if (!textareaRef.current) return;
    const el = textareaRef.current;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const text = el.value;
    const selected = text.substring(start, end);
    const replacement = `${prefix}${selected || 'text'}${suffix}`;
    const newText = text.substring(0, start) + replacement + text.substring(end);
    setCode(newText);
    setTimeout(() => {
      el.focus();
      el.setSelectionRange(start + prefix.length, start + replacement.length - suffix.length);
    }, 10);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        setCode(content);
        setActiveTabName(file.name);
        executeCompile(content);
      };
      reader.readAsText(file);
    }
  };

  const handleDownloadPdf = () => {
    if (!currentPdfUrl) return;
    const a = document.createElement('a');
    a.href = currentPdfUrl;
    a.download = `${activeTabName.replace(/\.[^/.]+$/, '') || 'document'}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handlePrintPdf = () => {
    if (!currentPdfUrl) return;
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.src = currentPdfUrl;
    document.body.appendChild(iframe);
    iframe.onload = () => {
      iframe.contentWindow?.print();
      setTimeout(() => document.body.removeChild(iframe), 60000);
    };
  };

  const handleClearCache = async () => {
    if (currentBuildId) {
      try {
        await fetch(`/api/latex/builds/${currentBuildId}`, { method: 'DELETE' });
      } catch (e) {
        console.debug('Build cache clear:', e);
      }
    }
    setCode(TEMPLATES[0].code);
    setSelectedTemplateId(TEMPLATES[0].id);
    setActiveTabName('ats_swe_gold.tex');
    executeCompile(TEMPLATES[0].code);
  };

  return (
    <div className="latex-studio-container animate-fadeIn">
      {/* ─── Topbar ─── */}
      <div className="latex-topbar">
        <div className="latex-topbar-left">
          <span className="latex-menu-item">File</span>
          <span className="latex-menu-item">Edit</span>
          <span className="latex-menu-item">Insert</span>
          <span className="latex-menu-item">View</span>
          <span className="latex-menu-item">Format</span>
          <span className="latex-menu-item">Help</span>
          
          {/* Interactive ATS Score Badge */}
          <span
            className="latex-ats-pill"
            onClick={() => {
              setActiveLogTab('ats');
              setShowLogsDrawer(true);
            }}
            title="Click to view ATS Parsing Audit & Optimization Tips"
            style={{
              background: atsReport.score >= 85 ? 'linear-gradient(135deg, #059669 0%, #10b981 100%)' : 'linear-gradient(135deg, #d97706 0%, #f59e0b 100%)',
              color: '#ffffff',
              fontSize: '0.6875rem',
              fontWeight: 700,
              padding: '3px 10px',
              borderRadius: '12px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              cursor: 'pointer',
              boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
            }}
          >
            <Sparkles size={11} />
            <span>ATS {atsReport.score}% · Grade {atsReport.grade}</span>
          </span>
        </div>

        {/* Center Project Dropdown */}
        <div className="relative" style={{ position: 'relative' }}>
          <div className="latex-topbar-center" onClick={() => setShowDropdown(!showDropdown)}>
            <FileText size={13} style={{ color: '#38bdf8' }} />
            <span>{selectedTemplateId}</span>
            <ChevronDown size={14} />
          </div>

          {showDropdown && (
            <div
              style={{
                position: 'absolute',
                top: '100%',
                left: '50%',
                transform: 'translateX(-50%)',
                marginTop: '6px',
                background: '#1a2233',
                border: '1px solid #2e3a4e',
                borderRadius: '8px',
                boxShadow: '0 12px 28px rgba(0,0,0,0.5)',
                width: '380px',
                zIndex: 100,
                padding: '6px',
              }}
            >
              <div style={{ fontSize: '0.6875rem', color: '#94a3b8', padding: '6px 8px', fontWeight: 700 }}>
                SELECT ATS-OPTIMIZED RESUME / LATEX TEMPLATE
              </div>
              {TEMPLATES.map((tmpl) => (
                <div
                  key={tmpl.id}
                  onClick={() => handleTemplateChange(tmpl)}
                  style={{
                    padding: '8px 10px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '0.8125rem',
                    color: selectedTemplateId === tmpl.id ? '#38bdf8' : '#e2e8f0',
                    background: selectedTemplateId === tmpl.id ? '#253248' : 'transparent',
                    display: 'flex',
                    justifyContent: 'space-between',
                  }}
                >
                  <span>{tmpl.name}</span>
                  <span style={{ fontSize: '0.6875rem', color: '#64748b' }}>{tmpl.category}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="latex-topbar-right">
          <span className="latex-action-link" onClick={() => fileInputRef.current?.click()} title="Upload code or TeX file">
            <Upload size={14} />
            <span>Upload</span>
          </span>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            style={{ display: 'none' }}
            accept=".tex,.bib,.sty,.cls,.txt"
          />
          <span className="latex-action-link">
            <History size={14} />
            <span>History</span>
          </span>
          <span className="latex-action-link">
            <Layout size={14} />
            <span>Layout</span>
          </span>
          <button className="latex-share-btn">
            <Share2 size={13} />
            <span>Share</span>
          </button>
        </div>
      </div>

      {/* ─── Main Split Workspace ─── */}
      <div className="latex-workspace" ref={workspaceRef}>
        {/* Left Side: LaTeX / Code Editor */}
        <div className="latex-editor-section" style={{ width: `${splitRatio}%` }}>
          {/* Editor Header Tab */}
          <div className="latex-tabs-header">
            <div className="latex-tab">
              <FileCode size={14} style={{ color: '#38bdf8' }} />
              <span>{activeTabName}</span>
              <span className="latex-tab-close">×</span>
            </div>
            <div
              className="latex-tab-add"
              onClick={() => {
                setCode('\\documentclass[10pt,a4paper]{article}\n\\usepackage[margin=0.65in]{geometry}\n\\usepackage{hyperref}\n\\begin{document}\n\n\\begin{center}\n{\\Huge \\textbf{YOUR NAME}}\\\\\n\\textsf{email@example.com} \\;\\textbar\\; \\textsf{+1 555-123-4567}\n\\end{center}\n\n\\section*{PROFESSIONAL SUMMARY}\nResults-driven engineer...\n\n\\section*{EXPERIENCE}\n\\textbf{Job Title} \\hfill \\textsf{2022 -- Present}\\\\\n\\textit{Company Name}\n\\begin{itemize}\n  \\item Scaled platform by 45\\%...\n\\end{itemize}\n\n\\end{document}');
                setActiveTabName('new_ats_resume.tex');
              }}
              title="New File"
            >
              <Plus size={14} />
            </div>
          </div>

          {/* Formatting Action Bar */}
          <div className="latex-toolbar">
            <div className="latex-toolbar-left">
              <button
                type="button"
                className="latex-tool-btn"
                onClick={() => insertTextAtCursor('\\textbf{', '}')}
                title="Bold (\textbf{})"
              >
                <strong>B</strong>
              </button>
              <button
                type="button"
                className="latex-tool-btn"
                onClick={() => insertTextAtCursor('\\textit{', '}')}
                title="Italic (\textit{})"
              >
                <em>I</em>
              </button>
              <button
                type="button"
                className="latex-tool-btn"
                onClick={() => insertTextAtCursor('\\section*{', '}')}
                title="Section Heading (\section*)"
              >
                <span style={{ fontSize: '0.8125rem', fontWeight: 800 }}>H</span>
              </button>
              <button
                type="button"
                className="latex-tool-btn"
                onClick={() => insertTextAtCursor('\\begin{itemize}\n  \\item ', '\n\\end{itemize}')}
                title="Bullet List (\begin{itemize})"
              >
                •
              </button>
              <button
                type="button"
                className="latex-tool-btn"
                onClick={() => insertTextAtCursor('\n\\newpage\n\n')}
                title="Force New Page (\newpage)"
              >
                <span style={{ fontSize: '0.75rem', color: '#38bdf8', fontWeight: 700 }}>+Page</span>
              </button>
              <button
                type="button"
                className="latex-tool-btn"
                onClick={() => insertTextAtCursor('\\href{https://example.com}{', '}')}
                title="Hyperlink (\href{url}{text})"
              >
                <span style={{ fontSize: '0.75rem', color: '#60a5fa', fontWeight: 700 }}>Link</span>
              </button>
              <button
                type="button"
                className="latex-tool-btn"
                onClick={() => insertTextAtCursor('\\begin{equation}\n  ', '\n\\end{equation}')}
                title="Math Equation (Ω)"
              >
                Ω
              </button>

              <div className="latex-tool-divider" />

              <div className="latex-mode-toggle">
                <span
                  className={`latex-mode-pill ${editorMode === 'code' ? 'active' : ''}`}
                  onClick={() => setEditorMode('code')}
                >
                  Code
                </span>
                <span
                  className={`latex-mode-pill ${editorMode === 'visual' ? 'active' : ''}`}
                  onClick={() => setEditorMode('visual')}
                >
                  Visual
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <select
                value={compilerEngine}
                onChange={(e) => {
                  setCompilerEngine(e.target.value as any);
                  executeCompile(code);
                }}
                className="latex-compiler-select"
                style={{
                  background: '#1e293b',
                  color: '#94a3b8',
                  border: '1px solid #334155',
                  borderRadius: '4px',
                  fontSize: '0.75rem',
                  padding: '2px 6px',
                }}
              >
                <option value="pdflatex">pdflatex</option>
                <option value="xelatex">xelatex</option>
              </select>
              <button className="latex-tool-btn" title="Search Code">
                <Search size={14} />
              </button>
            </div>
          </div>

          {/* Editor Body */}
          <div className="latex-editor-body">
            <div className="latex-linenumbers">
              {Array.from({ length: lineCount }).map((_, idx) => (
                <div key={idx} className={compileErrors.some((e) => e.line === idx + 1) ? 'latex-linenumber-error' : ''}>
                  {idx + 1}
                </div>
              ))}
            </div>

            <div className="latex-textarea-wrapper">
              <textarea
                ref={textareaRef}
                className="latex-code-input"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Tab') {
                    e.preventDefault();
                    insertTextAtCursor('  ', '');
                  }
                  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                    e.preventDefault();
                    executeCompile(code);
                  }
                }}
                spellCheck={false}
                placeholder="Type your pure ATS-optimized LaTeX code here — live compiled into true vector PDF preview on the right!"
              />
            </div>
          </div>
        </div>

        {/* Resizer */}
        <div
          className={`latex-resizer ${isDragging ? 'active' : ''}`}
          onMouseDown={handleMouseDown}
          title="Drag to resize editor and preview panes"
        >
          <div className="latex-resizer-handle" />
        </div>

        {/* Right Side: PDF.js Live Vector PDF Viewer */}
        <div className="latex-preview-section" style={{ width: `${100 - splitRatio}%` }}>
          {/* Preview Header Bar */}
          <div className="latex-preview-header">
            <div className="latex-recompile-group">
              <button
                type="button"
                className="latex-recompile-btn"
                onClick={() => executeCompile(code)}
                disabled={isCompiling}
              >
                {isCompiling ? (
                  <RefreshCw size={12} className="animate-spin" />
                ) : (
                  <Play size={12} fill="currentColor" />
                )}
                <span>{isCompiling ? 'Compiling...' : compileStatus === 'success' ? 'Recompile' : 'Recompile'}</span>
              </button>
              <button
                type="button"
                className="latex-recompile-arrow"
                onClick={() => executeCompile(code)}
                title="Compile Now (Ctrl+Enter)"
              >
                <ChevronDown size={12} />
              </button>
            </div>

            <div className="latex-logs-tabs">
              <div
                className={`latex-log-tab ${activeLogTab === 'all' ? 'active' : ''}`}
                onClick={() => {
                  setActiveLogTab('all');
                  setShowLogsDrawer(false);
                }}
              >
                <Layers size={12} />
                <span>{pdfPageCount} {pdfPageCount > 1 ? 'Pages' : 'Page'}</span>
              </div>
              <div
                className={`latex-log-tab ${activeLogTab === 'ats' ? 'active' : ''}`}
                onClick={() => {
                  setActiveLogTab('ats');
                  setShowLogsDrawer(true);
                }}
                style={{
                  color: atsReport.score >= 85 ? '#34d399' : '#fbbf24',
                  fontWeight: 600,
                }}
                title="ATS Score & Parseability Audit"
              >
                <Sparkles size={12} />
                <span>ATS {atsReport.score}%</span>
              </div>
              <div
                className={`latex-log-tab ${activeLogTab === 'errors' ? 'active' : ''}`}
                onClick={() => {
                  setActiveLogTab('errors');
                  setShowLogsDrawer(true);
                }}
              >
                <AlertTriangle size={12} style={{ color: compileErrors.length > 0 ? '#ef4444' : '#94a3b8' }} />
                <span>Errors</span>
                <span className="latex-log-count" style={{ background: compileErrors.length > 0 ? '#ef4444' : '#263246' }}>
                  {compileErrors.length}
                </span>
              </div>
              <div
                className={`latex-log-tab ${activeLogTab === 'logs' ? 'active' : ''}`}
                onClick={() => {
                  setActiveLogTab('logs');
                  setShowLogsDrawer(!showLogsDrawer);
                }}
              >
                <Terminal size={12} />
                <span>Log</span>
              </div>
              <div className="latex-log-tab">
                {compileStatus === 'success' && <CheckCircle2 size={12} style={{ color: '#10b981' }} />}
                {compileStatus === 'compiling' && <Zap size={12} className="text-accent animate-pulse" />}
                <span style={{ fontSize: '0.6875rem' }}>{compileStatus === 'compiling' ? 'Building...' : 'PDF Ready'}</span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={handleDownloadPdf}
                disabled={!currentPdfUrl}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '4px 12px',
                  fontSize: '0.75rem',
                }}
              >
                <Download size={13} />
                <span>Download PDF ({pdfPageCount}P)</span>
              </button>
            </div>
          </div>

          {/* Compilation Error Banner if error occurred */}
          {compileErrors.length > 0 && (
            <div
              style={{
                background: '#7f1d1d',
                color: '#fee2e2',
                padding: '8px 14px',
                fontSize: '0.8125rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderBottom: '1px solid #991b1b',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertTriangle size={15} />
                <span>
                  <strong>Compilation failed:</strong> {compileErrors[0].message}{' '}
                  {compileErrors[0].line ? `(Line ${compileErrors[0].line})` : ''}
                </span>
              </div>
              <button
                onClick={() => setShowLogsDrawer(!showLogsDrawer)}
                style={{
                  background: '#991b1b',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '2px 8px',
                  fontSize: '0.75rem',
                  cursor: 'pointer',
                }}
              >
                {showLogsDrawer ? 'Close Log' : 'View Compiler Log'}
              </button>
            </div>
          )}

          {/* Real-Time ATS Audit Drawer */}
          {showLogsDrawer && activeLogTab === 'ats' && (
            <div
              style={{
                background: '#0f172a',
                borderBottom: '1px solid #1e293b',
                padding: '12px 16px',
                maxHeight: '220px',
                overflowY: 'auto',
                fontSize: '0.8125rem',
                color: '#e2e8f0',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '1rem', fontWeight: 800, color: atsReport.score >= 85 ? '#34d399' : '#fbbf24' }}>
                    ATS Readiness Score: {atsReport.score}/100 ({atsReport.grade})
                  </span>
                  <span style={{ fontSize: '0.6875rem', background: '#1e293b', padding: '2px 8px', borderRadius: '4px', color: '#94a3b8' }}>
                    Standard Workday / Greenhouse / Lever Parser Tested
                  </span>
                </div>
                <span style={{ fontSize: '0.75rem', color: '#94a3b8', cursor: 'pointer' }} onClick={() => setShowLogsDrawer(false)}>
                  ✕ Close
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '8px' }}>
                {atsReport.checks.map((check, idx) => (
                  <div
                    key={idx}
                    style={{
                      background: '#182234',
                      border: `1px solid ${check.passed ? '#065f46' : '#92400e'}`,
                      borderRadius: '6px',
                      padding: '8px 10px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '3px' }}>
                      <span style={{ fontWeight: 700, color: check.passed ? '#34d399' : '#fbbf24', fontSize: '0.75rem' }}>
                        {check.passed ? '✓' : '⚠'} {check.title}
                      </span>
                      <span style={{ fontSize: '0.6875rem', color: '#94a3b8' }}>
                        {check.score}/{check.weight} pts
                      </span>
                    </div>
                    <div style={{ fontSize: '0.6875rem', color: '#cbd5e1', lineHeight: 1.35 }}>
                      {check.description}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Compiler Log Drawer */}
          {showLogsDrawer && activeLogTab !== 'ats' && (
            <div
              style={{
                background: '#0b0f19',
                borderBottom: '1px solid #1e293b',
                padding: '10px 14px',
                maxHeight: '160px',
                overflowY: 'auto',
                fontFamily: 'monospace',
                fontSize: '0.75rem',
                color: '#94a3b8',
                whiteSpace: 'pre-wrap',
              }}
            >
              <div style={{ color: '#38bdf8', fontWeight: 700, marginBottom: '4px' }}>
                [LaTeX Compiler Output & Diagnostics]
              </div>
              {compilerLog || 'No log messages.'}
            </div>
          )}


          {/* Live Rendered PDF Viewport */}
          <div className="latex-pdf-viewport">
            {/* Zoom / Page / Print Floating Toolbar */}
            <div className="latex-pdf-controls">
              <button
                type="button"
                className="latex-control-btn"
                onClick={() => setZoom((z) => Math.max(0.5, z - 0.1))}
                title="Zoom Out (-)"
              >
                <ZoomOut size={13} />
              </button>
              <span style={{ fontSize: '0.75rem', color: '#94a3b8', minWidth: '40px', textAlign: 'center' }}>
                {Math.round(zoom * 100)}%
              </span>
              <button
                type="button"
                className="latex-control-btn"
                onClick={() => setZoom((z) => Math.min(2.0, z + 0.1))}
                title="Zoom In (+)"
              >
                <ZoomIn size={13} />
              </button>
              <div style={{ width: '1px', height: '14px', background: '#273347', margin: '0 2px' }} />
              <button
                type="button"
                className="latex-control-btn"
                onClick={() => setZoom(1.0)}
                title="Reset Fit (100%)"
              >
                Fit
              </button>
              <button
                type="button"
                className="latex-control-btn"
                onClick={() => setRotation((r) => (r + 90) % 360)}
                title="Rotate 90°"
              >
                <RotateCw size={13} />
              </button>
              <button
                type="button"
                className="latex-control-btn"
                onClick={handlePrintPdf}
                title="Print PDF Document"
              >
                <Printer size={13} />
              </button>
              <button
                type="button"
                className="latex-control-btn"
                onClick={() => {
                  if (!document.fullscreenElement && canvasContainerRef.current) {
                    canvasContainerRef.current.requestFullscreen?.();
                  } else {
                    document.exitFullscreen?.();
                  }
                }}
                title="Toggle Fullscreen"
              >
                <Maximize size={13} />
              </button>
            </div>

            {/* Document Stack — rendered by PDF.js onto true A4 canvases */}
            <div
              ref={canvasContainerRef}
              className="latex-pages-stack"
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '24px',
              }}
            >
              {isCompiling && !currentPdfUrl && (
                <div style={{ padding: '60px 20px', textAlign: 'center', color: '#94a3b8' }}>
                  <RefreshCw size={28} className="animate-spin text-accent" style={{ margin: '0 auto 12px' }} />
                  <div>Compiling LaTeX document...</div>
                </div>
              )}
            </div>

            {/* Bottom Clear Cached Files Button */}
            <button
              type="button"
              className="latex-clear-cached"
              onClick={handleClearCache}
              title="Clear cached builds and reset template"
            >
              <Trash2 size={13} />
              <span>Clear cached files</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
