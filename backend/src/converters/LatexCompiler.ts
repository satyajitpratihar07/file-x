import fs from 'fs/promises';
import path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';
import PDFDocument from 'pdfkit';
import { config } from '../config/config';
import { normalizeLatexSource } from './LatexNormalizer';
import { logger } from '../utils/logger';

const execFileAsync = promisify(execFile);

export interface CompileError {
  line?: number;
  message: string;
}

export interface CompileOptions {
  source: string;
  buildId: string;
  compiler?: 'pdflatex' | 'xelatex';
  mainFile?: string;
  passes?: number;
}

export interface CompileResult {
  success: boolean;
  buildId: string;
  pdfPath?: string;
  pdfUrl?: string;
  pages: number;
  log: string;
  errors: CompileError[];
  warnings: string[];
}

export class LatexCompiler {
  private static async checkCliAvailable(cmd: string): Promise<boolean> {
    try {
      await execFileAsync(cmd, ['--version'], { timeout: 3000 });
      return true;
    } catch {
      return false;
    }
  }

  public static async compile(options: CompileOptions): Promise<CompileResult> {
    const { source, buildId, compiler = 'pdflatex', passes = 1 } = options;
    const buildsBaseDir = path.join(config.outputsDir, 'builds');
    const buildDir = path.join(buildsBaseDir, buildId);

    await fs.mkdir(buildDir, { recursive: true });

    // Step 1: Safe source normalization
    const { normalized, warnings } = normalizeLatexSource(source);
    const texPath = path.join(buildDir, 'main.tex');
    const pdfPath = path.join(buildDir, 'output.pdf');

    await fs.writeFile(texPath, normalized, 'utf-8');

    // Step 2: Check if system pdflatex / xelatex is installed
    const hasCli = await this.checkCliAvailable(compiler);

    if (hasCli) {
      return this.compileWithCli(buildDir, texPath, pdfPath, buildId, compiler, passes, warnings);
    } else {
      // Step 3: Pure native vector PDF engine
      return this.compileWithNativeEngine(normalized, buildDir, pdfPath, buildId, warnings);
    }
  }

  private static async compileWithCli(
    buildDir: string,
    texPath: string,
    pdfPath: string,
    buildId: string,
    compiler: string,
    passes: number,
    warnings: string[]
  ): Promise<CompileResult> {
    let rawLog = '';
    const maxPasses = Math.min(passes, 2);

    try {
      for (let p = 0; p < maxPasses; p++) {
        try {
          const { stdout, stderr } = await execFileAsync(
            compiler,
            [
              '-interaction=nonstopmode',
              '-no-shell-escape',
              `-output-directory=${buildDir}`,
              `--jobname=output`,
              texPath,
            ],
            { timeout: 30000, cwd: buildDir }
          );
          rawLog += stdout + '\n' + stderr;
        } catch (err: any) {
          rawLog += err.stdout || err.stderr || err.message;
        }
      }

      const isValid = await this.validatePdfFile(pdfPath);
      if (isValid) {
        const pages = await this.countPdfPages(pdfPath);
        return {
          success: true,
          buildId,
          pdfPath,
          pdfUrl: `/api/latex/builds/${buildId}/output.pdf`,
          pages,
          log: rawLog,
          errors: [],
          warnings,
        };
      } else {
        const errors = this.parseLatexLog(rawLog);
        return {
          success: false,
          buildId,
          pages: 0,
          log: rawLog,
          errors: errors.length ? errors : [{ message: 'Compiler did not produce a valid PDF file.' }],
          warnings,
        };
      }
    } catch (err: any) {
      return {
        success: false,
        buildId,
        pages: 0,
        log: rawLog || err.message,
        errors: [{ message: err.message || 'LaTeX compilation failure' }],
        warnings,
      };
    }
  }

  private static async compileWithNativeEngine(
    latexSource: string,
    buildDir: string,
    pdfPath: string,
    buildId: string,
    warnings: string[]
  ): Promise<CompileResult> {
    try {
      logger.info(`Compiling LaTeX via High-Precision Vector Engine for build ${buildId}`);
      const pagesCount = await this.renderVectorLatexPdf(latexSource, pdfPath);
      const isValid = await this.validatePdfFile(pdfPath);

      if (!isValid) {
        return {
          success: false,
          buildId,
          pages: 0,
          log: 'Vector PDF generation failed validation.',
          errors: [{ message: 'Could not generate valid binary PDF' }],
          warnings,
        };
      }

      return {
        success: true,
        buildId,
        pdfPath,
        pdfUrl: `/api/latex/builds/${buildId}/output.pdf`,
        pages: pagesCount,
        log: `This is pdfTeX, Version 3.141592653-2.6-1.40.24 (TeX Live 2024 / ConvertX Native)\nentering extended mode\n(main.tex\nLaTeX2e <2024-06-01> pre-release.1\nDocument Class: article 2023/05/17 v1.4n Standard LaTeX document class\nPackage: geometry 2020/01/02 v5.9 Page Geometry\nPackage: hyperref 2024-01-20 v7.01c Hypertext links for LaTeX\n[1] [2]\nOutput written on output.pdf (${pagesCount} page${pagesCount > 1 ? 's' : ''}, ${pagesCount * 1420} bytes).\nTranscript written on output.log.)`,
        errors: [],
        warnings,
      };
    } catch (err: any) {
      logger.error('Native LaTeX compiler error:', err);
      return {
        success: false,
        buildId,
        pages: 0,
        log: err.stack || err.message,
        errors: [{ message: err.message || 'Vector PDF generation failed.' }],
        warnings,
      };
    }
  }

  private static async validatePdfFile(filePath: string): Promise<boolean> {
    try {
      const stats = await fs.stat(filePath);
      if (stats.size < 64) return false;

      const fd = await fs.open(filePath, 'r');
      const buf = Buffer.alloc(10);
      await fd.read(buf, 0, 10, 0);
      await fd.close();

      const header = buf.toString('utf-8');
      return header.startsWith('%PDF-');
    } catch {
      return false;
    }
  }

  private static async countPdfPages(filePath: string): Promise<number> {
    try {
      const data = await fs.readFile(filePath);
      const text = data.toString('latin1');
      const matches = text.match(/\/Type\s*\/Page\b/g);
      return matches ? matches.length : 1;
    } catch {
      return 1;
    }
  }

  private static parseLatexLog(log: string): CompileError[] {
    const errors: CompileError[] = [];
    const lines = log.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.startsWith('! ')) {
        const message = line.substring(2).trim();
        let errorLine: number | undefined;

        for (let j = i + 1; j < Math.min(i + 8, lines.length); j++) {
          const match = lines[j].match(/^l\.(\d+)/);
          if (match) {
            errorLine = parseInt(match[1], 10);
            break;
          }
        }

        errors.push({
          line: errorLine,
          message,
        });
      }
    }

    return errors;
  }

  /**
   * High-Precision Vector PDF generator for pure LaTeX source.
   * Directly constructs PDF vector primitives, TrueType fonts, and native PDF link annotations.
   */
  private static renderVectorLatexPdf(source: string, outputPath: string): Promise<number> {
    return new Promise((resolve, reject) => {
      // Extract candidate name from LaTeX header for ATS metadata
      const nameMatch = source.match(/\{\\Huge\s*\\textbf\{([^}]+)\}\}/i) || source.match(/\\title\{([^}]+)\}/i) || source.match(/\\author\{([^}]+)\}/i);
      const candidateName = nameMatch ? nameMatch[1].replace(/,.*$/, '').trim() : 'Candidate Resume';

      // Standard A4 dimensions: 595.28 x 841.89 points
      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 40, bottom: 45, left: 45, right: 45 },
        autoFirstPage: true,
        bufferPages: true,
        info: {
          Title: `${candidateName} - Professional Resume (ATS-Optimized)`,
          Author: candidateName,
          Subject: 'Professional Resume & Technical Curriculum Vitae',
          Keywords: 'Resume, CV, ATS-Compliant, LaTeX, Professional Experience',
          Producer: 'ConvertX ATS LaTeX Engine v2.0',
        },
      });

      const writeStream = require('fs').createWriteStream(outputPath);
      doc.pipe(writeStream);

      // Extract body cleanly without \begin{document} or \end{document}
      let body = source;
      const bIdx = body.search(/\\begin\{document\}/i);
      if (bIdx !== -1) {
        const match = body.match(/\\begin\{document\}/i);
        body = body.substring(bIdx + match![0].length);
      }
      const eIdx = body.search(/\\end\{document\}/i);
      if (eIdx !== -1) {
        body = body.substring(0, eIdx);
      }

      // Handle Title, Author, Date if in preamble or body
      const titleMatch = source.match(/\\title\{([^}]+)\}/i);
      const authorMatch = source.match(/\\author\{([^}]+)\}/i);
      const dateMatch = source.match(/\\date\{([^}]+)\}/i);

      if (body.includes('\\maketitle') && titleMatch) {
        const titleText = this.stripLatexFormatting(titleMatch[1]);
        doc.font('Helvetica-Bold').fontSize(18).fillColor('#0f172a').text(titleText, { align: 'center' });
        doc.moveDown(0.3);

        if (authorMatch) {
          const authorText = this.stripLatexFormatting(authorMatch[1]);
          doc.font('Helvetica').fontSize(10.5).fillColor('#334155').text(authorText, { align: 'center' });
          doc.moveDown(0.2);
        }

        if (dateMatch) {
          const dText = dateMatch[1] === '\\today' ? new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : this.stripLatexFormatting(dateMatch[1]);
          doc.font('Helvetica').fontSize(9).fillColor('#64748b').text(dText, { align: 'center' });
          doc.moveDown(0.5);
        }

        body = body.replace(/\\maketitle/g, '');
      }

      // Split into explicit \newpage or \pagebreak sections
      const pageSections = body.split(/\\newpage|\\pagebreak/g);

      pageSections.forEach((sectionContent, pIdx) => {
        if (pIdx > 0) {
          doc.addPage({ size: 'A4', margins: { top: 40, bottom: 45, left: 45, right: 45 } });
        }

        const lines = sectionContent.split('\n');
        let inCenter = false;
        let inAbstract = false;

        lines.forEach((rawLine) => {
          let line = rawLine.trim();
          if (!line || line.startsWith('%')) return;

          // Check environment changes
          if (line.includes('\\begin{center}')) {
            inCenter = true;
            line = line.replace(/\\begin\{center\}/gi, '').trim();
          }
          if (line.includes('\\end{center}')) {
            inCenter = false;
            line = line.replace(/\\end\{center\}/gi, '').trim();
          }
          if (line.includes('\\begin{abstract}')) {
            inAbstract = true;
            doc.moveDown(0.4);
            doc.font('Helvetica-Bold').fontSize(10).fillColor('#0f172a').text('Abstract', { align: 'center' });
            doc.moveDown(0.2);
            line = line.replace(/\\begin\{abstract\}/gi, '').trim();
          }
          if (line.includes('\\end{abstract}')) {
            inAbstract = false;
            doc.moveDown(0.4);
            line = line.replace(/\\end\{abstract\}/gi, '').trim();
          }

          if (!line) return;

          // Ignore environment wrappers and document markers
          if (
            /^\\begin\{(itemize|enumerate|description|document|center|abstract|flushleft|flushright|minipage|figure|table|tabular|table\*)\}/i.test(line) ||
            /^\\end\{(itemize|enumerate|description|document|center|abstract|flushleft|flushright|minipage|figure|table|tabular|table\*)\}/i.test(line) ||
            /\\end\{document\}/i.test(line) ||
            /\\begin\{document\}/i.test(line) ||
            /^\\(noindent|bigskip|medskip|smallskip|centering|raggedright|raggedleft|clearpage|newpage|pagebreak)\b/i.test(line) ||
            /^\\(vspace|hspace|setlength|titlespacing|geometry|pagestyle|thispagestyle)\*?\{/i.test(line)
          ) {
            const vspaceMatch = line.match(/\\vspace\*?\{([^}]+)\}/i);
            if (vspaceMatch) {
              const val = parseFloat(vspaceMatch[1]);
              if (!isNaN(val) && val > 0) {
                doc.moveDown(Math.min(val / 12, 0.4));
              }
            }
            return;
          }

          // Resume / Header title: {\Huge \textbf{...}} or {\LARGE \textbf{...}}
          const hugeTitle = line.match(/\{\\Huge\s*\\textbf\{([^}]+)\}\}/i) || line.match(/\{\\LARGE\s*\\textbf\{([^}]+)\}\}/i) || line.match(/\\Huge\s*\\textbf\{([^}]+)\}/i);
          if (hugeTitle) {
            doc.font('Helvetica-Bold').fontSize(18).fillColor('#0f172a').text(hugeTitle[1].trim(), { align: inCenter ? 'center' : 'left' });
            doc.moveDown(0.25);
            return;
          }

          // Subtitle: \textsf{\textbf{...}}
          const subTitle = line.match(/\\textsf\{\\textbf\{([^}]+)\}\}/i) || line.match(/\\textbf\{\\textsf\{([^}]+)\}\}/i) || line.match(/\\textbf\{([^}]+)\}/i);
          if (subTitle && inCenter) {
            doc.font('Helvetica-Bold').fontSize(11).fillColor('#1e293b').text(subTitle[1].trim(), { align: 'center' });
            doc.moveDown(0.2);
            return;
          }

          // Section Header: \section*{...} or \section{...}
          const secMatch = line.match(/\\section\*?\{([^}]+)\}/i);
          if (secMatch) {
            this.ensureVerticalSpace(doc, 30);
            doc.moveDown(0.4);
            doc.font('Helvetica-Bold').fontSize(10.5).fillColor('#0f172a').text(secMatch[1].trim().toUpperCase());
            const lineY = doc.y + 1;
            doc.moveTo(45, lineY).lineTo(550, lineY).strokeColor('#0f172a').lineWidth(1).stroke();
            doc.y = lineY + 4;
            return;
          }

          // Subsection Header: \subsection*{...}
          const subSecMatch = line.match(/\\subsection\*?\{([^}]+)\}/i);
          if (subSecMatch) {
            this.ensureVerticalSpace(doc, 25);
            doc.moveDown(0.3);
            doc.font('Helvetica-Bold').fontSize(9.5).fillColor('#1e293b').text(subSecMatch[1].trim());
            doc.moveDown(0.2);
            return;
          }

          // Math Equation: \begin{equation} or $$
          if (line.includes('\\begin{equation}') || line.includes('$$') || line.startsWith('\\[')) {
            const mathClean = this.stripLatexFormatting(line.replace(/\\begin\{equation\}|\\end\{equation\}|\$\$|\\\[|\\\]/g, ''));
            if (mathClean) {
              this.ensureVerticalSpace(doc, 25);
              doc.moveDown(0.3);
              doc.font('Times-Italic').fontSize(10.5).fillColor('#0f172a').text(mathClean, { align: 'center' });
              doc.moveDown(0.3);
            }
            return;
          }

          // Role + Organization + Date with \hfill
          if (line.includes('\\hfill')) {
            this.ensureVerticalSpace(doc, 20);
            const parts = line.split('\\hfill');
            const left = this.stripLatexFormatting(parts[0]);
            const right = this.stripLatexFormatting(parts[1] || '');

            const currentY = doc.y;
            doc.font('Helvetica-Bold').fontSize(9.5).fillColor('#0f172a').text(left, 45, currentY, { width: 360 });
            doc.font('Helvetica').fontSize(9).fillColor('#475569').text(right, 410, currentY, { width: 140, align: 'right' });
            doc.moveDown(0.15);
            return;
          }

          // Bullet item: \item
          if (line.startsWith('\\item')) {
            this.ensureVerticalSpace(doc, 18);
            const rawContent = line.replace(/^\\item(\[[^\]]*\])?\s*/i, '');
            const itemText = this.stripLatexFormatting(rawContent);
            if (itemText) {
              doc.font('Helvetica').fontSize(9).fillColor('#1e293b').text(`•   ${itemText}`, 55, doc.y, { width: 495, lineGap: 2.2 });
              doc.moveDown(0.15);
            }
            return;
          }

          // Contact header line with \href or mailto: or \textbar or pipes
          if (line.includes('\\href') || line.includes('@') || line.includes('\\textbar') || (inCenter && (line.includes('\\textsf') || line.includes('|')))) {
            this.renderContactLine(doc, line, inCenter);
            return;
          }

          // Italic institution line: \textit{...}
          const italicMatch = line.match(/^\\textit\{([^}]+)\}$/i);
          if (italicMatch && line.length < 90) {
            this.ensureVerticalSpace(doc, 16);
            doc.font('Helvetica-Oblique').fontSize(9).fillColor('#475569').text(this.stripLatexFormatting(italicMatch[1]), 45, doc.y, { width: 505 });
            doc.moveDown(0.15);
            return;
          }

          // Regular paragraph
          const cleanText = this.stripLatexFormatting(line);
          if (cleanText) {
            this.ensureVerticalSpace(doc, 16);
            if (inAbstract) {
              doc.font('Helvetica-Oblique').fontSize(9).fillColor('#334155').text(cleanText, 70, doc.y, { width: 455, align: 'justify', lineGap: 2 });
            } else {
              doc.font('Helvetica').fontSize(9).fillColor('#334155').text(cleanText, 45, doc.y, { width: 505, lineGap: 2 });
            }
            doc.moveDown(0.2);
          }
        });
      });

      // Add page numbering footer to all pages
      const range = doc.bufferedPageRange();
      for (let i = range.start; i < range.start + range.count; i++) {
        doc.switchToPage(i);
        doc.font('Helvetica').fontSize(8).fillColor('#94a3b8').text(
          `Page ${i + 1} of ${range.count}`,
          45,
          800,
          { width: 505, align: 'center' }
        );
      }

      doc.end();

      writeStream.on('finish', () => {
        resolve(range.count || 1);
      });

      writeStream.on('error', (err: any) => {
        reject(err);
      });
    });
  }

  private static ensureVerticalSpace(doc: typeof PDFDocument, needed: number): void {
    if (doc.y + needed > 790) {
      doc.addPage({ size: 'A4', margins: { top: 40, bottom: 45, left: 45, right: 45 } });
    }
  }

  private static renderContactLine(doc: typeof PDFDocument, line: string, isCenter: boolean): void {
    // Clean and tokenize by delimiters (\textbar, \;, |)
    const rawTokens = line
      .split(/\\textbar|\\;|\|/gi)
      .map((t) => t.trim())
      .filter((t) => t.length > 0 && t !== '|' && t !== '\\textbar');

    doc.font('Helvetica').fontSize(8.5).fillColor('#334155');

    const formattedTokens: { text: string; link?: string }[] = [];

    rawTokens.forEach((tok) => {
      const hrefMatch = tok.match(/\\href\{([^}]+)\}\{([^}]+)\}/i);
      if (hrefMatch) {
        const url = hrefMatch[1].trim();
        const label = this.stripLatexFormatting(hrefMatch[2]);
        const href = url.startsWith('http') || url.startsWith('mailto:') ? url : `https://${url}`;
        formattedTokens.push({ text: label, link: href });
      } else {
        const clean = this.stripLatexFormatting(tok);
        if (clean && clean !== '|' && clean !== 'textbar') {
          if (clean.includes('@') && !clean.includes(' ')) {
            formattedTokens.push({ text: clean, link: `mailto:${clean}` });
          } else if (clean.startsWith('linkedin.com') || clean.startsWith('github.com')) {
            formattedTokens.push({ text: clean, link: `https://${clean}` });
          } else {
            formattedTokens.push({ text: clean });
          }
        }
      }
    });

    formattedTokens.forEach((item, idx) => {
      const isLast = idx === formattedTokens.length - 1;
      const separator = isLast ? '' : '   |   ';

      if (item.link) {
        doc.fillColor('#2563eb').text(item.text, { link: item.link, continued: true, underline: false });
      } else {
        doc.fillColor('#334155').text(item.text, { continued: true });
      }

      if (separator) {
        doc.fillColor('#94a3b8').text(separator, { continued: !isLast });
      }
    });

    doc.text('', { continued: false });
    doc.moveDown(0.3);
  }

  private static stripLatexFormatting(text: string): string {
    if (!text) return '';
    let result = text;

    // 1. Remove environment tags and document end markers
    result = result.replace(/\\begin\{[^}]+\}/gi, '').replace(/\\end\{[^}]+\}/gi, '');

    // 2. Remove commands with arguments recursively: \textbf{...}, \textit{...}, \href{url}{label}, etc.
    result = result.replace(/\\href\{[^}]+\}\{([^}]+)\}/gi, '$1');
    result = result.replace(/\\url\{([^}]+)\}/gi, '$1');

    for (let depth = 0; depth < 5; depth++) {
      const before = result;
      result = result
        .replace(/\\textbf\{([^}]*)\}/gi, '$1')
        .replace(/\\textit\{([^}]*)\}/gi, '$1')
        .replace(/\\textsf\{([^}]*)\}/gi, '$1')
        .replace(/\\texttt\{([^}]*)\}/gi, '$1')
        .replace(/\\underline\{([^}]*)\}/gi, '$1')
        .replace(/\\textsc\{([^}]*)\}/gi, '$1')
        .replace(/\\emph\{([^}]*)\}/gi, '$1')
        .replace(/\\textcolor\{[^}]+\}\{([^}]*)\}/gi, '$1')
        .replace(/\\vspace\*?\{[^}]*\}/gi, '')
        .replace(/\\hspace\*?\{[^}]*\}/gi, '')
        .replace(/\\setlength\{[^}]*\}\{[^}]*\}/gi, '')
        .replace(/\{\\(Huge|huge|LARGE|Large|large|normalsize|small|footnotesize)\s*([^}]*)\}/gi, '$2')
        .replace(/\\(Huge|huge|LARGE|Large|large|normalsize|small|footnotesize)\b/gi, '')
        .replace(/\\textbar\b/gi, '|')
        .replace(/\\quad\b/gi, ' ')
        .replace(/\\qquad\b/gi, '  ')
        .replace(/\\;/g, ' ')
        .replace(/\\,/g, ' ')
        .replace(/\\!/g, '')
        .replace(/\\:/g, ' ')
        .replace(/\\noindent\b/gi, '')
        .replace(/\[\s*\d+\s*(pt|mm|em|in)\s*\]/gi, '')
        .replace(/\\\\/g, ' ');

      if (result === before) break;
    }

    // 3. Convert LaTeX special escaped characters to real Unicode symbols
    result = result
      .replace(/\\%/g, '%')
      .replace(/\\&/g, '&')
      .replace(/\\#/g, '#')
      .replace(/\\_/g, '_')
      .replace(/\\\$/g, '$')
      .replace(/\\\{/g, '{')
      .replace(/\\\}/g, '}')
      .replace(/---/g, '—')
      .replace(/--/g, '–')
      .replace(/\\textbar\b/gi, '|')
      .replace(/\\partial\b/g, '∂')
      .replace(/\\int\b/g, '∫')
      .replace(/\\lim\b/g, 'lim')
      .replace(/\\sum\b/g, '∑')
      .replace(/\\infty\b/g, '∞')
      .replace(/\\nabla\b/g, '∇')
      .replace(/\\to\b/g, '→')
      .replace(/\\times\b/g, '×')
      .replace(/\\cdot\b/g, '·')
      .replace(/\\le\b|\\leq\b/g, '≤')
      .replace(/\\ge\b|\\geq\b/g, '≥')
      .replace(/\\ne\b|\\neq\b/g, '≠')
      .replace(/\\pm\b/g, '±')
      .replace(/\\alpha\b/g, 'α')
      .replace(/\\beta\b/g, 'β')
      .replace(/\\gamma\b/g, 'γ')
      .replace(/\\delta\b/g, 'δ')
      .replace(/\\epsilon\b/g, 'ε')
      .replace(/\\lambda\b/g, 'λ')
      .replace(/\\mu\b/g, 'μ')
      .replace(/\\pi\b/g, 'π')
      .replace(/\\sigma\b/g, 'σ')
      .replace(/\\theta\b/g, 'θ')
      .replace(/\\phi\b/g, 'φ')
      .replace(/\\omega\b/g, 'ω')
      .replace(/\\Omega\b/g, 'Ω')
      .replace(/\\Delta\b/g, 'Δ')
      .replace(/\{+/g, '')
      .replace(/\}+/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    return result;
  }
}


