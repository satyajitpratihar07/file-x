import { generateJobId, generateStorageFileName, generateRequestId } from '../../src/utils/idGenerator';

describe('generateJobId', () => {
  it('generates a string starting with job_', () => {
    const id = generateJobId();
    expect(id).toMatch(/^job_[a-f0-9]{32}$/);
  });

  it('generates unique IDs', () => {
    const ids = new Set(Array.from({ length: 100 }, () => generateJobId()));
    expect(ids.size).toBe(100);
  });
});

describe('generateStorageFileName', () => {
  it('generates a filename with the given extension', () => {
    const name = generateStorageFileName('pdf');
    expect(name).toMatch(/^[a-f0-9]{32}\.pdf$/);
  });

  it('handles extension with leading dot', () => {
    const name = generateStorageFileName('.jpg');
    expect(name).toMatch(/\.jpg$/);
  });

  it('generates unique filenames', () => {
    const names = new Set(Array.from({ length: 100 }, () => generateStorageFileName('pdf')));
    expect(names.size).toBe(100);
  });
});

describe('generateRequestId', () => {
  it('generates an 8-character hex string', () => {
    const id = generateRequestId();
    expect(id).toMatch(/^[a-f0-9]{8}$/);
  });
});
