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

  it('shows the production ICP filing on every game state', () => {
    const html = read('index.html');
    const css = read('css/style.css');
    expect(html).toContain('class="site-compliance"');
    expect(html).toContain('https://beian.miit.gov.cn/');
    expect(html).toContain('鄂ICP备2026021516号-6');
    expect(css).toContain('.site-compliance');
  });

  it('allows both origins until legacy clients are retired', () => {
    const config = read('api/ecosystem.config.cjs');
    expect(config).toContain(
      "ALLOWED_ORIGINS: 'https://gaozhai.bond,https://gaozhai-bond.com'",
    );
  });
});
