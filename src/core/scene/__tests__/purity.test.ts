import * as fs from 'fs';
import * as path from 'path';

const FORBIDDEN = /(?:from|import)\s+['"](react|react-native|react-dom|fs|net|http|https)(\/[^'"]*)?['"]/;

function tsSourcesUnder(dir: string): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory() && entry.name !== '__tests__') {
      out.push(...tsSourcesUnder(p));
    } else if (entry.isFile() && /\.tsx?$/.test(entry.name)) {
      out.push(p);
    }
  }
  return out;
}

test('AC-13: src/core sources import no React, React Native, or IO modules', () => {
  const coreRoot = path.resolve(__dirname, '..', '..');
  expect(path.basename(coreRoot)).toBe('core');
  const sources = tsSourcesUnder(coreRoot);
  expect(sources.length).toBeGreaterThan(0);
  const offenders = sources.filter(f =>
    FORBIDDEN.test(fs.readFileSync(f, 'utf8')),
  );
  expect(offenders).toEqual([]);
});
