import { Router, Request, Response } from 'express';
import { getAllSupportedFormats } from '../../converters/registry';

const router = Router();

/**
 * GET /api/formats
 * Returns all supported input/output format combinations.
 */
router.get('/', (req: Request, res: Response) => {
  const formats = getAllSupportedFormats();

  // Group by category
  const grouped = formats.reduce((acc, fmt) => {
    if (!acc[fmt.category]) acc[fmt.category] = [];
    acc[fmt.category].push(fmt);
    return acc;
  }, {} as Record<string, typeof formats>);

  res.json({
    success: true,
    data: {
      formats,
      grouped,
      outputFormats: ['pdf', 'jpg', 'png'],
      totalFormats: formats.length,
    },
  });
});

export default router;
