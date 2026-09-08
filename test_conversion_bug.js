const fs = require('fs');
const path = require('path');
const http = require('http');
const sharp = require('./backend/node_modules/sharp');

async function runTest() {
  console.log('=== RUNNING CONVERSION PIPELINE TEST ===');
  
  // 1. Create a sample PNG binary buffer with red/blue gradient
  const width = 200;
  const height = 150;
  const testPngBuffer = await sharp({
    create: {
      width,
      height,
      channels: 4,
      background: { r: 255, g: 0, b: 128, alpha: 1 }
    }
  })
  .png()
  .toBuffer();

  console.log(`[TEST] Generated test PNG binary buffer (${testPngBuffer.length} bytes), Magic bytes: ${testPngBuffer.slice(0, 8).toString('hex')}`);

  // Save temporary test file named "5.Python Keywords.devtools"
  const testFilePath = path.join(__dirname, '5.Python Keywords.devtools');
  fs.writeFileSync(testFilePath, testPngBuffer);
  console.log(`[TEST] Saved test file: ${testFilePath}`);

  // 2. Upload test file via multipart/form-data to http://localhost:3001/api/upload
  const formData = await createFormData(testFilePath, '5.Python Keywords.devtools', 'jpg');
  
  const uploadRes = await makeRequest('POST', 'http://localhost:3001/api/upload', formData.headers, formData.body);
  const uploadData = JSON.parse(uploadRes.toString());
  console.log('[TEST] Upload Response:', JSON.stringify(uploadData, null, 2));

  if (!uploadData.success) {
    throw new Error(`Upload failed: ${uploadData.error}`);
  }

  const jobId = uploadData.data.jobId;
  const fileId = uploadData.data.files[0].fileId;
  console.log(`[TEST] Job created: ${jobId}, FileId: ${fileId}`);

  // 3. Poll job status until completed
  let status = 'queued';
  let pollResult = null;
  for (let i = 0; i < 20; i++) {
    await new Promise(r => setTimeout(r, 500));
    const statusRes = await makeRequest('GET', `http://localhost:3001/api/jobs/${jobId}`, {}, null);
    pollResult = JSON.parse(statusRes.toString());
    console.log('[TEST POLL RESULT]:', JSON.stringify(pollResult));
    const jobData = pollResult.data && pollResult.data.files ? pollResult.data : pollResult;
    const files = jobData.files || (jobData.data && jobData.data.files);
    const file = files.find(f => f.fileId === fileId);
    status = file.status;
    console.log(`[TEST] Poll #${i+1}: status=${status}, progress=${file.progress}%`);
    if (status === 'completed' || status === 'failed') break;
  }

  if (status !== 'completed') {
    throw new Error(`Job failed to complete. Final state: ${JSON.stringify(pollResult)}`);
  }

  const completedFile = (pollResult.data || pollResult).files.find(f => f.fileId === fileId);
  console.log(`[TEST] Detected MIME Type: ${completedFile.detectedMimeType}`);
  console.log(`[TEST] Output Name: ${completedFile.outputName}`);

  // 4. Download output file
  const downloadBuffer = await makeRequest('GET', `http://localhost:3001/api/download/${jobId}/${fileId}`, {}, null);
  console.log(`[TEST] Downloaded file size: ${downloadBuffer.length} bytes`);

  // 5. Verify the downloaded file is a REAL JPEG using Sharp
  const metadata = await sharp(downloadBuffer).metadata();
  console.log('[TEST] Output Image Metadata:', metadata);

  if (metadata.format !== 'jpeg') {
    throw new Error(`Expected output format 'jpeg', got '${metadata.format}'`);
  }

  if (metadata.width !== width || metadata.height !== height) {
    throw new Error(`Expected image dimensions ${width}x${height}, got ${metadata.width}x${metadata.height}`);
  }

  // 6. Verify output buffer does NOT contain raw text garbage from UTF-8 decoding
  const bufferString = downloadBuffer.toString('binary');
  if (bufferString.includes('IHDR') || bufferString.includes('IDAT')) {
    throw new Error('FAILED! Downloaded file contains raw PNG chunk text garbage');
  }

  console.log('=== TEST SUCCESSFUL! THE BUG IS FULLY FIXED ===');

  // Clean up
  if (fs.existsSync(testFilePath)) fs.unlinkSync(testFilePath);
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

runTest().catch(err => {
  console.error('[TEST ERROR]', err);
  process.exit(1);
});
