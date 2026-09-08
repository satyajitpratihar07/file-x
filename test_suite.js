const fs = require('fs');
const path = require('path');
const http = require('http');
const sharp = require('./backend/node_modules/sharp');

async function runTestSuite() {
  console.log('====================================================');
  console.log('   CONVERTX COMPREHENSIVE CONVERSION TEST SUITE     ');
  console.log('====================================================\n');

  // Prepare test assets
  const pngBuffer = await sharp({
    create: { width: 100, height: 100, channels: 4, background: { r: 0, g: 255, b: 0, alpha: 1 } }
  }).png().toBuffer();

  const jpgBuffer = await sharp({
    create: { width: 100, height: 100, channels: 3, background: { r: 255, g: 0, b: 0 } }
  }).jpeg().toBuffer();

  const webpBuffer = await sharp({
    create: { width: 100, height: 100, channels: 4, background: { r: 0, g: 0, b: 255, alpha: 1 } }
  }).webp().toBuffer();

  const gifBuffer = await sharp({
    create: { width: 50, height: 50, channels: 4, background: { r: 255, g: 128, b: 0, alpha: 1 } }
  }).gif().toBuffer();

  const tiffBuffer = await sharp({
    create: { width: 50, height: 50, channels: 3, background: { r: 0, g: 255, b: 255 } }
  }).tiff().toBuffer();

  const txtBuffer = Buffer.from('Hello World! This is plain text content for testing text-to-pdf conversion.');
  const pyBuffer = Buffer.from('def hello_world():\n    print("Hello from Python script!")\n');
  const jsonBuffer = Buffer.from(JSON.stringify({ title: "ConvertX Test", success: true, count: 42 }, null, 2));
  const csvBuffer = Buffer.from('id,name,role\n1,Alice,Admin\n2,Bob,User\n3,Charlie,Tester\n');

  const testCases = [
    { name: '5.Python Keywords.devtools (PNG binary)', buffer: pngBuffer, outputFormat: 'jpg', expectedCategory: 'IMAGE', expectedMime: 'image/png' },
    { name: 'sample.png', buffer: pngBuffer, outputFormat: 'jpg', expectedCategory: 'IMAGE', expectedMime: 'image/png' },
    { name: 'sample.jpg', buffer: jpgBuffer, outputFormat: 'png', expectedCategory: 'IMAGE', expectedMime: 'image/jpeg' },
    { name: 'sample.png', buffer: pngBuffer, outputFormat: 'pdf', expectedCategory: 'IMAGE', expectedMime: 'image/png' },
    { name: 'sample.jpg', buffer: jpgBuffer, outputFormat: 'pdf', expectedCategory: 'IMAGE', expectedMime: 'image/jpeg' },
    { name: 'sample.webp', buffer: webpBuffer, outputFormat: 'jpg', expectedCategory: 'IMAGE', expectedMime: 'image/webp' },
    { name: 'sample.gif', buffer: gifBuffer, outputFormat: 'jpg', expectedCategory: 'IMAGE', expectedMime: 'image/gif' },
    { name: 'sample.tiff', buffer: tiffBuffer, outputFormat: 'jpg', expectedCategory: 'IMAGE', expectedMime: 'image/tiff' },
    { name: 'document.txt', buffer: txtBuffer, outputFormat: 'pdf', expectedCategory: 'TEXT', expectedMime: 'text/plain' },
    { name: 'script.py', buffer: pyBuffer, outputFormat: 'pdf', expectedCategory: 'CODE', expectedMime: 'text/plain' },
    { name: 'data.json', buffer: jsonBuffer, outputFormat: 'pdf', expectedCategory: 'CODE', expectedMime: 'application/json' },
    { name: 'table.csv', buffer: csvBuffer, outputFormat: 'pdf', expectedCategory: 'TEXT', expectedMime: 'text/csv' },
  ];

  let passed = 0;
  let failed = 0;

  for (const tc of testCases) {
    const testFilePath = path.join(__dirname, 'scratch', tc.name);
    fs.mkdirSync(path.dirname(testFilePath), { recursive: true });
    fs.writeFileSync(testFilePath, tc.buffer);

    try {
      console.log(`[TEST RUN] ${tc.name} → ${tc.outputFormat}`);
      const formData = await createFormData(testFilePath, tc.name, tc.outputFormat);
      const uploadRes = await makeRequest('POST', 'http://localhost:3001/api/upload', formData.headers, formData.body);
      const uploadData = JSON.parse(uploadRes.toString());

      if (!uploadData.success) {
        throw new Error(`Upload rejected: ${uploadData.error}`);
      }

      const jobId = uploadData.data.jobId;
      const fileId = uploadData.data.files[0].fileId;
      const detectedMime = uploadData.data.files[0].detectedMimeType;

      console.log(`  -> Uploaded. Job: ${jobId}, Detected MIME: ${detectedMime}`);

      // Poll until completion
      let status = 'queued';
      let pollData = null;
      for (let i = 0; i < 20; i++) {
        await new Promise(r => setTimeout(r, 400));
        const statusRes = await makeRequest('GET', `http://localhost:3001/api/jobs/${jobId}`, {}, null);
        pollData = JSON.parse(statusRes.toString());
        const file = pollData.data.files.find(f => f.fileId === fileId);
        status = file.status;
        if (status === 'completed' || status === 'failed') break;
      }

      if (status !== 'completed') {
        const fileErr = pollData.data.files[0].errorMessage || 'Unknown failure';
        throw new Error(`Job ended with status '${status}': ${fileErr}`);
      }

      // Download and validate output
      const downloadBuffer = await makeRequest('GET', `http://localhost:3001/api/download/${jobId}/${fileId}`, {}, null);
      if (downloadBuffer.length === 0) {
        throw new Error('Downloaded file is empty (0 bytes)!');
      }

      if (tc.outputFormat === 'jpg' || tc.outputFormat === 'png') {
        const meta = await sharp(downloadBuffer).metadata();
        console.log(`  -> Downloaded output (${downloadBuffer.length} bytes), Format: ${meta.format}, Size: ${meta.width}x${meta.height}`);
      } else if (tc.outputFormat === 'pdf') {
        const pdfHeader = downloadBuffer.slice(0, 5).toString('ascii');
        if (pdfHeader !== '%PDF-') {
          throw new Error(`PDF validation failed. Header starts with '${pdfHeader}' instead of '%PDF-'`);
        }
        console.log(`  -> Downloaded output (${downloadBuffer.length} bytes), Valid PDF header (%PDF-) verified.`);
      }

      console.log(`  [PASS] ${tc.name} → ${tc.outputFormat}\n`);
      passed++;
    } catch (err) {
      console.error(`  [FAIL] ${tc.name} → ${tc.outputFormat}: ${err.message}\n`);
      failed++;
    } finally {
      if (fs.existsSync(testFilePath)) fs.unlinkSync(testFilePath);
    }
  }

  console.log('====================================================');
  console.log(` SUMMARY: ${passed} PASSED, ${failed} FAILED out of ${testCases.length} tests`);
  console.log('====================================================');

  if (failed > 0) process.exit(1);
}

function makeRequest(method, urlStr, headers, body) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlStr);
    const req = http.request({
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: headers
    }, (res) => {
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => resolve(Buffer.concat(chunks)));
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

async function createFormData(filePath, filename, outputFormat) {
  const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
  const fileBuffer = fs.readFileSync(filePath);
  
  const parts = [];
  parts.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="outputFormat"\r\n\r\n${outputFormat}\r\n`));
  parts.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="files"; filename="${filename}"\r\nContent-Type: application/octet-stream\r\n\r\n`));
  parts.push(fileBuffer);
  parts.push(Buffer.from(`\r\n--${boundary}--\r\n`));
  
  const body = Buffer.concat(parts);
  return {
    headers: {
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
      'Content-Length': body.length
    },
    body
  };
}

runTestSuite().catch(err => {
  console.error('[SUITE ERROR]', err);
  process.exit(1);
});
