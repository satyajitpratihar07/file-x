const http = require('http');
const fs = require('fs');
const path = require('path');

// Create a small test text file
const testContent = '# Hello ConvertX\n\nThis is a **Markdown** test file.\n\n- Item 1\n- Item 2\n\n```js\nconsole.log("hello world");\n```\n';
const testFile = path.join(__dirname, 'test-sample.md');
fs.writeFileSync(testFile, testContent);

const boundary = '----ConvertXBoundary123';
const CRLF = '\r\n';

let bodyParts = [];
// outputFormat field
bodyParts.push(Buffer.from(
  '--' + boundary + CRLF +
  'Content-Disposition: form-data; name="outputFormat"' + CRLF + CRLF +
  'pdf' + CRLF
));
// file field
bodyParts.push(Buffer.from(
  '--' + boundary + CRLF +
  'Content-Disposition: form-data; name="files"; filename="test-sample.md"' + CRLF +
  'Content-Type: text/plain' + CRLF + CRLF
));
bodyParts.push(Buffer.from(testContent));
bodyParts.push(Buffer.from(CRLF + '--' + boundary + '--' + CRLF));

const buf = Buffer.concat(bodyParts);

const opts = {
  hostname: 'localhost',
  port: 3001,
  path: '/api/upload',
  method: 'POST',
  headers: {
    'Content-Type': 'multipart/form-data; boundary=' + boundary,
    'Content-Length': buf.length,
  },
};

const req = http.request(opts, (r) => {
  let d = '';
  r.on('data', (c) => (d += c));
  r.on('end', () => {
    try {
      const resp = JSON.parse(d);
      console.log('Upload success:', resp.success);
      if (resp.data) {
        console.log('Job ID:', resp.data.jobId);
        console.log('Files:', resp.data.files ? resp.data.files.length : 0);
        const jobId = resp.data.jobId;
        if (jobId) {
          setTimeout(() => {
            http.get('http://localhost:3001/api/jobs/' + jobId, (r2) => {
              let d2 = '';
              r2.on('data', (c) => (d2 += c));
              r2.on('end', () => {
                const job = JSON.parse(d2);
                console.log('Job status:', job.data && job.data.status);
                if (job.data && job.data.files && job.data.files[0]) {
                  const f = job.data.files[0];
                  console.log('File status:', f.status);
                  console.log('Output name:', f.outputName || 'N/A');
                  console.log('Output size:', f.outputSizeBytes || 'N/A');
                  console.log('Error:', f.errorMessage || 'none');
                }
                fs.unlinkSync(testFile);
                process.exit(0);
              });
            }).on('error', (e) => console.error('Poll error:', e.message));
          }, 3000);
        }
      } else {
        console.log('Error:', resp.error);
        fs.unlinkSync(testFile);
      }
    } catch (e) {
      console.error('Parse error:', e.message, '\nRaw:', d.slice(0, 200));
      fs.unlinkSync(testFile);
    }
  });
});

req.on('error', (e) => console.error('Request error:', e.message));
req.write(buf);
req.end();
