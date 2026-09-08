import { sanitizeDisplayName, buildOutputDisplayName, isPathWithinDir } from '../../src/security/sanitize';

describe('sanitizeDisplayName', () => {
  it('removes path components', () => {
    expect(sanitizeDisplayName('../../../etc/passwd')).toBe('passwd');
    expect(sanitizeDisplayName('/root/secret.txt')).toBe('secret.txt');
  });

  it('sanitizes dangerous characters', () => {
    const result = sanitizeDisplayName('file<>:"/\\|?*.txt');
    expect(result).not.toMatch(/[<>:"/\\|?*]/);
  });

  it('preserves normal filenames', () => {
    expect(sanitizeDisplayName('my_document.pdf')).toBe('my_document.pdf');
    expect(sanitizeDisplayName('report 2024.docx')).toBe('report 2024.docx');
  });

  it('limits filename length', () => {
    const longName = 'a'.repeat(200) + '.pdf';
    const result = sanitizeDisplayName(longName);
    expect(result.length).toBeLessThanOrEqual(105); // 100 chars + .pdf
  });

  it('handles empty input', () => {
    const result = sanitizeDisplayName('');
    expect(typeof result).toBe('string');
  });
});

describe('buildOutputDisplayName', () => {
  it('replaces extension with output format', () => {
    expect(buildOutputDisplayName('document.docx', 'pdf')).toBe('document.pdf');
    expect(buildOutputDisplayName('image.png', 'jpg')).toBe('image.jpg');
  });

  it('handles files without extension', () => {
    const result = buildOutputDisplayName('README', 'pdf');
    expect(result).toContain('.pdf');
  });
});

describe('isPathWithinDir', () => {
  it('accepts paths within base dir', () => {
    expect(isPathWithinDir('/tmp/jobs/abc123/output.pdf', '/tmp/jobs/abc123')).toBe(true);
  });

  it('rejects path traversal', () => {
    expect(isPathWithinDir('/tmp/jobs/abc123/../../etc/passwd', '/tmp/jobs/abc123')).toBe(false);
  });
});
