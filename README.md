# Any-DoC — Universal File Conversion Platform

A production-quality full-stack web application for converting documents, images, spreadsheets, presentations, code, and text files to **PDF, JPG, PNG, or WebP**.

---

## ✨ Features

- **36+ input formats**: DOCX, XLSX, PPTX, PDF, JPG, PNG, SVG, TXT, MD, JSON, YAML, CSV, Python, JS, TS, SQL, and more
- **3 output formats**: PDF, JPG, PNG
- **Batch processing**: Upload up to 20 files simultaneously
- **Real-time progress**: Server-Sent Events (SSE) for live conversion status
- **ZIP download**: Download all converted files in one archive
- **Security-first**: Magic byte validation, path traversal prevention, safe CLI calls
- **Auto-cleanup**: Files deleted after 60 minutes
- **No registration**: Convert instantly without an account
- **Responsive UI**: Works on desktop, tablet, and mobile

---

## 🏗️ Architecture

```
convertx/
├── frontend/       # React 18 + Vite + TypeScript SPA
└── backend/        # Node.js + Express + TypeScript API
    ├── converters/ # Modular conversion engines
    │   ├── ImageConverter.ts       (Sharp)
    │   ├── TextToPdfConverter.ts   (PDFKit: TXT/MD/JSON/CSV/Code)
    │   ├── OfficeToPdfConverter.ts (LibreOffice headless)
    │   └── PdfToImageConverter.ts  (pdftoppm)
    ├── jobs/       # Job management + async worker
    ├── storage/    # File storage + cleanup scheduler
    ├── validation/ # Magic byte file validation
    ├── security/   # Filename sanitization + path safety
    └── api/        # Express routes + middleware
```

### Conversion Engines

| Input | Engine | Notes |
|---|---|---|
| JPG, PNG, WEBP, SVG, GIF, BMP, TIFF, ICO | Sharp | Fast, high-quality |
| TXT, MD, JSON, YAML, CSV, Python, JS, TS, SQL, ... | PDFKit | Formatted output, line numbers for code |
| DOCX, DOC, ODT, RTF, XLSX, XLS, ODS, PPTX, PPT, ODP | LibreOffice headless | Requires Docker or system LibreOffice |
| PDF | pdftoppm | Requires poppler-utils |

---

## 🚀 Quick Start (Development)

### Prerequisites
- Node.js 20+

### 1. Install Backend Dependencies
```bash
cd backend
npm install
npm approve-scripts sharp
```

### 2. Configure Environment
```bash
cp .env.example .env   # Edit as needed
```

### 3. Start Backend
```bash
cd backend
npm run dev       # Development with hot reload
# or
node dist/server.js  # Production (after npm run build)
```

### 4. Install Frontend Dependencies
```bash
cd frontend
npm install
```

### 5. Start Frontend
```bash
cd frontend
npm run dev
```

### 6. Open the App
- Frontend: http://localhost:5173
- Backend API: http://localhost:3001
- Health check: http://localhost:3001/health

---

## 🐳 Docker (Recommended for Full Format Support)

The Docker image includes LibreOffice and poppler-utils for complete format support.

```bash
docker-compose up --build
```

- Frontend: http://localhost:5173
- Backend: http://localhost:3001

---

## 📡 API Reference

| Endpoint | Method | Description |
|---|---|---|
| `/api/upload` | POST | Upload files, create job |
| `/api/jobs/:jobId` | GET | Get job status (polling) |
| `/api/jobs/:jobId/events` | GET | SSE progress stream |
| `/api/jobs/:jobId` | DELETE | Delete job and files |
| `/api/download/:jobId/:fileId` | GET | Download single file |
| `/api/download/:jobId/zip` | GET | Download all as ZIP |
| `/api/formats` | GET | List supported formats |
| `/health` | GET | Health check |
| `/ready` | GET | Readiness check |

### Upload Example
```bash
curl -X POST http://localhost:3001/api/upload \
  -F "files=@document.docx" \
  -F "outputFormat=pdf"
```

---

## 🔒 Security Features

- **Magic byte validation** — never trusts filename extensions
- **Filename sanitization** — strips path components, dangerous characters
- **Isolated job directories** — each job has its own UUID-named dir
- **Safe CLI calls** — argument arrays, never shell string concatenation
- **Path traversal prevention** — all paths validated before access
- **ZIP safety** — archive paths validated before inclusion
- **Rate limiting** — 30 requests/minute for API endpoints
- **No file execution** — source code files treated as text data only

---

## 🧪 Testing

```bash
cd backend

# Unit tests
npm test

# All tests
npm run test:unit
npm run test:integration
```

---

## ⚙️ Environment Variables

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3001` | API server port |
| `FRONTEND_URL` | `http://localhost:5173` | CORS allowed origin |
| `MAX_FILE_SIZE_MB` | `50` | Max upload size per file |
| `MAX_FILES_PER_BATCH` | `20` | Max files per upload |
| `JOB_EXPIRY_MINUTES` | `60` | Auto-cleanup after N minutes |
| `LIBRE_OFFICE_ENABLED` | `true` | Enable LibreOffice converter |
| `LIBRE_OFFICE_PATH` | `libreoffice` | Path to LibreOffice binary |
| `PLAYWRIGHT_ENABLED` | `false` | Enable HTML→PDF via Playwright |
| `RATE_LIMIT_MAX` | `30` | API requests per minute |
| `LOG_LEVEL` | `info` | Logging level |

---

## 📁 Adding a New Converter

1. Create `backend/src/converters/MyConverter.ts`
2. Implement the `ConversionEngine` interface
3. Register it in `backend/src/converters/registry.ts`

That's it! The router automatically picks it up.

---

## 📄 License

MIT

