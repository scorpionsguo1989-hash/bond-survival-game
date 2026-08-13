import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (file) => readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');

describe('gaozhai.bond migration', () => {
  it('publishes the game under the new canonical domain', () => {
    const html = read('index.html');
    expect(html).toContain('<link rel="canonical" href="https://gaozhai.bond/game/">');
    expect(html).toContain('<meta property="og:url" content="https://gaozhai.bond/game/">');
    expect(html).not.toContain('gaozhai-bond.com');
  });

  it('allows both origins until legacy clients are retired', () => {
    const config = read('api/ecosystem.config.cjs');
    expect(config).toContain(
      "ALLOWED_ORIGINS: 'https://gaozhai.bond,https://gaozhai-bond.com'",
    );
  });
});
