import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs/promises';
import { createReadStream, existsSync } from 'fs';
import { config } from '../../config/config';
import { LatexCompiler } from '../../converters/LatexCompiler';
import { logger } from '../../utils/logger';

const router = Router();

/**
 * POST /api/latex/compile
 * Compile pure LaTeX source into binary PDF.
 */
router.post('/compile', async (req: Request, res: Response) => {
  const { source, files, mainFile = 'main.tex', compiler = 'pdflatex' } = req.body;

  let latexSource = source;
  if (!latexSource && Array.isArray(files) && files.length > 0) {
    const main = files.find((f: any) => f.path === mainFile) || files[0];
    latexSource = main.content || '';
  }

  if (!latexSource || typeof latexSource !== 'string') {
    return res.status(400).json({
      success: false,
      error: 'LaTeX source content is required',
    });
  }

  const buildId = uuidv4();

  try {
    const result = await LatexCompiler.compile({
      source: latexSource,
      buildId,
      compiler: compiler === 'xelatex' ? 'xelatex' : 'pdflatex',
      mainFile,
    });

    return res.json(result);
  } catch (err: any) {
    logger.error(`LaTeX compilation error for build ${buildId}:`, err);
    return res.status(500).json({
      success: false,
      buildId,
      error: err.message || 'Internal LaTeX compilation error',
    });
  }
});

/**
 * GET /api/latex/builds/:buildId/output.pdf
 * Serve pure binary PDF file for PDF.js and downloads.
 */
router.get('/builds/:buildId/output.pdf', async (req: Request, res: Response) => {
  const { buildId } = req.params;

  // Sanitize buildId to prevent directory traversal
  const cleanBuildId = buildId.replace(/[^a-zA-Z0-9_-]/g, '');
  const pdfPath = path.join(config.outputsDir, 'builds', cleanBuildId, 'output.pdf');

  if (!existsSync(pdfPath)) {
    return res.status(404).json({
      success: false,
      error: 'Compiled PDF not found or build expired',
    });
  }

  try {
    const stat = await fs.stat(pdfPath);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Length', stat.size);
    res.setHeader('Content-Disposition', 'inline; filename="document.pdf"');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.setHeader('Accept-Ranges', 'bytes');

    const stream = createReadStream(pdfPath);
    stream.pipe(res);
  } catch (err: any) {
    logger.error(`Error streaming PDF for build ${buildId}:`, err);
    return res.status(500).json({ success: false, error: 'Could not stream PDF file' });
  }
});

/**
 * DELETE /api/latex/builds/:buildId
 * Delete cached build files.
 */
router.delete('/builds/:buildId', async (req: Request, res: Response) => {
  const { buildId } = req.params;
  const cleanBuildId = buildId.replace(/[^a-zA-Z0-9_-]/g, '');
  const buildDir = path.join(config.outputsDir, 'builds', cleanBuildId);

  try {
    if (existsSync(buildDir)) {
      await fs.rm(buildDir, { recursive: true, force: true });
    }
    return res.json({ success: true, message: 'Build cache cleared' });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
