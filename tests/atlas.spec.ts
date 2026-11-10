import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

const runtimeErrors = new WeakMap<Page, string[]>();
test.beforeEach(async ({ page }) => {
  const errors: string[] = [];
  runtimeErrors.set(page, errors);
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Small pieces.');
});

test.afterEach(async ({ page }) => {
  expect(runtimeErrors.get(page), 'The application should have no uncaught runtime errors').toEqual([]);
});

async function navigate(page: Page, name: string) {
  await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('button', { name }).click();
}

test('renders real WebGL, supports all scale levels and opens a picked component', async ({ page }) => {
  const canvas = page.locator('.scene-canvas canvas');
  await expect(canvas).toBeVisible();
  expect(await canvas.evaluate(element => {
    const gl = (element as HTMLCanvasElement).getContext('webgl2');
    return !!gl && !gl.isContextLost() && gl.drawingBufferWidth > 0 && gl.drawingBufferHeight > 0;
  })).toBe(true);

  for (const [name, sceneName] of [['CPU', 'cpu'], ['Server', 'server'], ['Multi-cloud', 'multicloud'], ['Cluster', 'cluster']]) {
    const tab = page.getByRole('tablist', { name: 'Scale level' }).getByRole('tab', { name: new RegExp(name) });
    await tab.click();
    await expect(tab).toHaveAttribute('aria-selected', 'true');
    await expect(page.locator('.inspector > h3')).toHaveText(name);
    await expect(canvas).toHaveAttribute('aria-label', new RegExp(`^${sceneName} data topology`));
  }

  await page.getByRole('button', { name: 'Play animation', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Pause animation', exact: true })).toBeVisible();
  await page.getByLabel('Animation speed').selectOption('2');
  await page.getByRole('button', { name: 'Pause animation', exact: true }).click();
  await page.getByRole('button', { name: 'Reset camera', exact: true }).click();
  await expect(canvas).toBeVisible();

  const bounds = await canvas.boundingBox();
  expect(bounds).not.toBeNull();
  let picked = false;
  if (bounds) {
    for (const y of [0.42, 0.5, 0.58, 0.34, 0.66]) {
      for (const x of [0.5, 0.42, 0.58, 0.34, 0.66, 0.26, 0.74]) {
        await page.mouse.move(bounds.x + bounds.width * x, bounds.y + bounds.height * y);
        if (await canvas.evaluate(element => (element as HTMLElement).style.cursor === 'pointer')) {
          await page.mouse.click(bounds.x + bounds.width * x, bounds.y + bounds.height * y);
          picked = true;
          break;
        }
      }
      if (picked) break;
    }
  }
  expect(picked, 'At least one visible 3D node should be selectable').toBe(true);
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText('What limits this component?');
  await expect(dialog).toContainText('Ways to change the limit');
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
});

test('offers selectable topology nodes when WebGL is unavailable', async ({ page }) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
      value(this: HTMLCanvasElement, type: string, ...args: unknown[]) {
        if (type.includes('webgl')) return null;
        return Reflect.apply(original, this, [type, ...args]);
      },
    });
  });
  await page.reload();
  await expect(page.getByText('3D rendering is unavailable in this browser.')).toBeVisible();
  await page.getByRole('button', { name: 'Inspect Shard 01 · leader', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Shard 01 · leader' })).toBeVisible();
  await page.getByRole('button', { name: 'Follow data through this system' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Every record');
});

test('explains every data model and links to a relevant system', async ({ page }) => {
  const tabs = page.getByRole('tablist', { name: 'Data model' }).getByRole('tab');
  expect(await tabs.count()).toBeGreaterThanOrEqual(8);
  for (let index = 0; index < await tabs.count(); index++) {
    const tab = tabs.nth(index);
    const name = (await tab.textContent())?.trim() || '';
    await tab.click();
    await expect(tab).toHaveAttribute('aria-selected', 'true');
    await expect(page.locator('.data-type-detail > h3')).toHaveText(name);
    await expect(page.locator('.data-type-detail')).toContainText('Scaling challenge');
    await expect(page.locator('.data-type-detail .tag-button').first()).toBeVisible();
  }
  await page.getByRole('tablist', { name: 'Data model' }).getByRole('tab', { name: 'Graph', exact: true }).click();
  await page.locator('.data-type-detail').getByRole('button', { name: 'Neo4j' }).click();
  await expect(page.getByLabel('Search projects')).toHaveValue('Neo4j');
  await expect(page.locator('.project-card')).toHaveCount(1);
  await expect(page.locator('.project-card h3')).toHaveText('Neo4j');
});

test('traces all write, analytical-query and streaming pipeline steps', async ({ page }) => {
  await navigate(page, 'Data in motion');
  for (const [journey, first, final] of [['Write path', 'Accept', 'Propagate'], ['Analytical query', 'Plan', 'Return'], ['Event stream', 'Partition', 'Commit']]) {
    await page.getByRole('button', { name: journey, exact: true }).click();
    await expect(page.locator('.inspector > h3')).toHaveText(first);
    await expect(page.getByLabel('Previous pipeline step')).toBeDisabled();
    await expect(page.locator('.pipeline-steps > button')).toHaveCount(5);
    for (let step = 1; step < 5; step++) {
      await page.getByLabel('Next pipeline step').click();
      await expect(page.locator('.inspector-controls')).toContainText(`STEP ${step + 1} / 5`);
      await expect(page.locator('.pipeline-steps > button.selected')).toHaveCount(1);
    }
    await expect(page.locator('.inspector > h3')).toHaveText(final);
    await expect(page.getByLabel('Next pipeline step')).toBeDisabled();
    await page.locator('.pipeline-steps > button').nth(2).click();
    await expect(page.locator('.inspector-controls')).toContainText('STEP 3 / 5');
  }
});

test('calculates 10 PB and updates capacity and scale tradeoffs', async ({ page }) => {
  await navigate(page, 'Performance lab');
  await page.getByLabel('Average record').selectOption('100000');
  await expect(page.locator('.big-result > strong')).toContainText('10 PB');
  await expect(page.locator('.result-cards > div').first()).toContainText('15 PB');
  await page.getByLabel('Replicas').selectOption('5');
  await expect(page.locator('.result-cards > div').first()).toContainText('25 PB');
  const initialThroughput = await page.locator('.result-cards > div').nth(1).textContent();
  await page.getByLabel('Network per worker').selectOption('1');
  await expect(page.locator('.result-cards > div').nth(1)).not.toHaveText(initialThroughput || '');
  await page.getByLabel('Skew penalty').focus();
  await page.keyboard.press('Home');
  await expect(page.getByLabel('Skew penalty')).toHaveValue('0');
  await page.getByRole('button', { name: 'Scale up', exact: true }).click();
  await expect(page.getByLabel('Worker count')).toBeDisabled();
  await expect(page.locator('.result-cards > div').nth(1)).toContainText('16.0 GB/s');
  await page.getByRole('button', { name: 'Scale out', exact: true }).click();
  await expect(page.getByLabel('Worker count')).toBeEnabled();
  await expect(page.getByText('ILLUSTRATIVE · NOT A BENCHMARK')).toBeVisible();
  await expect(page.locator('.comparison-row')).toHaveCount(3);
});

test('searches and filters the atlas and opens detailed architecture notes', async ({ page }) => {
  await navigate(page, 'Project atlas');
  expect(await page.locator('.project-card').count()).toBeGreaterThanOrEqual(12);
  await page.getByLabel('Search projects').fill('PostgreSQL');
  await expect(page.locator('.project-card')).toHaveCount(1);
  await page.locator('.project-card').click();
  const dialog = page.getByRole('dialog', { name: 'PostgreSQL', exact: true });
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText('Deployment model');
  await expect(dialog).toContainText('Core algorithm');
  await expect(dialog.locator('.modal-process > li')).toHaveCount(4);
  await expect(dialog.getByRole('link', { name: 'Read the primary documentation' })).toHaveAttribute('href', /postgresql.org/);
  await page.getByRole('button', { name: 'Close dialog' }).click();
  await page.getByRole('button', { name: 'Clear search' }).click();
  await page.locator('.filter-row').getByRole('button', { name: 'Document', exact: true }).click();
  await expect(page.locator('.project-card')).toHaveCount(1);
  await expect(page.locator('.project-card h3')).toHaveText('MongoDB');
  await page.getByLabel('Search projects').fill('no-such-system-123');
  await expect(page.getByRole('heading', { name: 'No matching systems' })).toBeVisible();
  await page.getByRole('button', { name: 'Reset filters' }).click();
  expect(await page.locator('.project-card').count()).toBeGreaterThanOrEqual(12);
});

test('selects and animates every one of the ten engineering challenges', async ({ page }) => {
  await navigate(page, 'Hot issues');
  const cards = page.locator('.issue-card');
  await expect(cards).toHaveCount(10);
  for (let index = 0; index < 10; index++) {
    const card = cards.nth(index);
    const title = (await card.locator('h3').textContent()) || '';
    await card.locator('.issue-card-actions > button').first().click();
    await expect(card).toHaveClass(/selected/);
    await expect(page.locator('.inspector > h3')).toHaveText(title);
    await expect(page.locator('.scene-top p')).toHaveText(title);
    await expect(page.getByRole('button', { name: 'Pause animation', exact: true })).toBeVisible();
  }
  await page.getByRole('button', { name: 'Explore the mechanism' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toContainText('The symptom');
  await expect(dialog).toContainText('The mechanism');
  await expect(dialog).toContainText('The response');
  await expect(dialog).toContainText('The tradeoff');
  await dialog.getByRole('button', { name: 'Animate this challenge' }).click();
  await expect(dialog).not.toBeVisible();
});

test('completes a regional recovery drill and switches recovery playbooks', async ({ page }) => {
  await navigate(page, 'Resilience & recovery');
  await page.getByLabel('Recovery scenario').selectOption({ label: 'Lose a region' });
  await expect(page.locator('.inspector > h3')).toHaveText('Lose a region');
  await page.getByRole('button', { name: 'Simulate regional outage' }).click();
  await expect(page.locator('.scene-badge')).toContainText('FAULT INJECTED');
  const steps = await page.locator('.recovery-steps > article').count();
  for (let step = 0; step < steps; step++) {
    await expect(page.getByRole('status')).toContainText(`step ${step + 1} of ${steps}`);
    await expect(page.locator('.recovery-steps > article.current')).toHaveCount(1);
    await page.getByRole('button', { name: step === steps - 1 ? 'Complete drill' : 'Confirm & continue' }).click();
  }
  await expect(page.getByRole('status')).toContainText('Drill complete');
  await expect(page.locator('.recovery-steps > article.complete')).toHaveCount(steps);
  await expect(page.locator('.scene-badge')).toContainText('LIVE SIMULATION');
  for (const title of ['Recover from corruption', 'Restore a 10 PB estate', 'Lose one node', 'Lose an availability zone']) {
    await page.getByLabel('Recovery scenario').selectOption({ label: title });
    await expect(page.locator('.inspector > h3')).toHaveText(title);
    await expect(page.getByRole('status')).toContainText('Healthy topology');
  }
});

test('runs the guided tour and opens research sources', async ({ page }) => {
  await page.getByRole('button', { name: 'Take the guided tour' }).click();
  const titles = ['Start with the machine', 'Scale up, then scale out', 'Follow a single record', 'Test your assumptions', 'Choose a system by its tradeoffs', 'Design for the day things break'];
  for (const [index, title] of titles.entries()) {
    const dialog = page.getByRole('dialog', { name: title, exact: true });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByLabel(`Tour step ${index + 1}`)).toHaveClass(/selected/);
    await dialog.getByRole('button', { name: index === titles.length - 1 ? 'Start exploring' : 'Next perspective' }).click();
  }
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Lose a region.');
  await page.getByRole('button', { name: 'Sources & methodology' }).click();
  const sources = page.getByRole('dialog');
  await expect(sources).toContainText('not a measured popularity ranking');
  expect(await sources.locator('.source-list a').count()).toBeGreaterThanOrEqual(10);
  await expect(sources.locator('.source-list a').first()).toHaveAttribute('href', /^https:\/\//);
  await page.keyboard.press('Escape');
  await expect(sources).not.toBeVisible();
});

test('mobile navigation works without horizontal overflow across all sections', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const name of ['Explore systems', 'Data in motion', 'Performance lab', 'Project atlas', 'Hot issues', 'Resilience & recovery']) {
    await page.getByRole('button', { name: 'Open navigation' }).click();
    await navigate(page, name);
    await expect(page.locator('.breadcrumbs strong')).toHaveText(name);
    await expect(page.locator('.sidebar')).not.toHaveClass(/sidebar-open/);
    const widths = await page.evaluate(() => ({ viewport: window.innerWidth, document: document.documentElement.scrollWidth }));
    expect(widths.document, `No horizontal page overflow in ${name}`).toBeLessThanOrEqual(widths.viewport + 1);
  }
});
