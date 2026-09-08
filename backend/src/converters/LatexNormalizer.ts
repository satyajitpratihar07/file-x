/**
 * LaTeX Source Normalizer and Security Validator
 * Safely inspects and prepares pure LaTeX source for compilation
 * without ever injecting HTML attributes or corrupting macros.
 */

export interface NormalizationResult {
  normalized: string;
  hasRepairs: boolean;
  warnings: string[];
  docClassDetected: boolean;
  hasDocumentEnv: boolean;
}

export function normalizeLatexSource(rawSource: string): NormalizationResult {
  const warnings: string[] = [];
  let hasRepairs = false;

  // 1. Normalize line endings
  let text = rawSource.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // 2. Security Check: block dangerous shell escapes
  if (/\\write18\b/i.test(text) || /\\input\|/i.test(text)) {
    warnings.push('Dangerous command \\write18 or shell pipe was neutralized for security.');
    text = text.replace(/\\write18/gi, '% [BLOCKED WRITE18]');
    text = text.replace(/\\input\|/gi, '% [BLOCKED INPUT PIPE]');
    hasRepairs = true;
  }

  // 3. Document environment detection
  const docClassMatch = text.match(/\\documentclass(\[[^\]]*\])?\{[^}]+\}/i);
  const docClassDetected = !!docClassMatch;

  const beginDocRegex = /\\begin\{document\}/gi;
  const endDocRegex = /\\end\{document\}/gi;

  const beginMatches = [...text.matchAll(beginDocRegex)];
  const endMatches = [...text.matchAll(endDocRegex)];

  // If user pasted duplicate \begin{document}
  if (beginMatches.length > 1) {
    warnings.push(`Detected ${beginMatches.length} \\begin{document} declarations. Normalized to exactly one.`);
    hasRepairs = true;

    // Keep everything before the first \begin{document} as preamble,
    // and concatenate all body segments between the begin and end tags
    const firstBeginIndex = beginMatches[0].index!;
    const preamble = text.substring(0, firstBeginIndex);

    // Remove all \begin{document} and \end{document} from the body
    let body = text.substring(firstBeginIndex);
    body = body.replace(/\\begin\{document\}/gi, '');
    body = body.replace(/\\end\{document\}/gi, '');

    text = `${preamble.trim()}\n\n\\begin{document}\n${body.trim()}\n\\end{document}\n`;
  } else if (beginMatches.length === 1 && endMatches.length === 0) {
    warnings.push('Added missing \\end{document} at end of file.');
    hasRepairs = true;
    text = text.trim() + '\n\n\\end{document}\n';
  } else if (!docClassDetected && beginMatches.length === 0) {
    // If user provided only body snippet without document wrapper, wrap it safely
    warnings.push('Document preamble automatically provided.');
    hasRepairs = true;
    text = `\\documentclass[11pt,a4paper]{article}
\\usepackage[a4paper,margin=0.75in]{geometry}
\\usepackage{amsmath,amssymb}
\\usepackage{xcolor}
\\usepackage[hidelinks]{hyperref}

\\begin{document}
${text.trim()}
\\end{document}
`;
  }

  // 4. Ensure hyperref is present if \href or \url is used in document and not in preamble
  if (
    (/\\href\{/i.test(text) || /\\url\{/i.test(text)) &&
    !/\\usepackage(\[[^\]]*\])?\{hyperref\}/i.test(text)
  ) {
    const docClassIndex = text.indexOf('\\documentclass');
    if (docClassIndex !== -1) {
      const lineEnd = text.indexOf('\n', docClassIndex);
      if (lineEnd !== -1) {
        text =
          text.substring(0, lineEnd + 1) +
          '\\usepackage[hidelinks]{hyperref}\n\\usepackage{xcolor}\n' +
          text.substring(lineEnd + 1);
        hasRepairs = true;
      }
    }
  }

  return {
    normalized: text,
    hasRepairs,
    warnings,
    docClassDetected,
    hasDocumentEnv: text.includes('\\begin{document}'),
  };
}
