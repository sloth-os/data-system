import { test, expect } from "@playwright/test";
import { createHash } from "node:crypto";
import type { Page } from "@playwright/test";
const errors = new WeakMap<Page, string[]>();
test.beforeEach(async ({ page }) => {
  const list: string[] = [];
  errors.set(page, list);
  page.on("pageerror", (e) => list.push(e.message));
  await page.goto("/");
  await page
    .getByRole("button", { name: "Open Inspector tool", exact: true })
    .click();

  await expect(page.locator(".fusion-stage-heading h2")).toHaveText(
    "Relational database",
  );
});
test.afterEach(async ({ page }) => {
  expect(errors.get(page)).toEqual([]);
});

test("one persistent canvas and operation survive every contextual tool", async ({
  page,
}) => {
  await expect(page.locator("canvas")).toHaveCount(1);
  await expect(
    page.getByRole("navigation", { name: "Main navigation" }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Stage 3: Log", exact: true }).click();
  const original = await page.locator(".fusion-webgl").elementHandle();
  const image = await page.locator(".fusion-webgl").screenshot();
  const digest = (bytes: Buffer) =>
    createHash("sha256").update(bytes).digest("hex");
  for (const name of [
    "Scale",
    "Data paths",
    "Capacity",
    "Projects",
    "Challenges",
    "Recovery",
    "Sources",
    "Inspector",
  ]) {
    await page
      .getByRole("button", { name: `Open ${name} tool`, exact: true })
      .click();
    await expect(page.locator("canvas")).toHaveCount(1);
    expect(
      await original!.evaluate(
        (el) => el === document.querySelector(".fusion-webgl"),
      ),
    ).toBe(true);
    await expect(page.locator(".fusion-world")).toHaveAttribute(
      "data-phase",
      "2",
    );
    expect(
      digest(await page.locator(".fusion-webgl").screenshot()),
      `${name} should retain the camera and scene`,
    ).toBe(digest(image));
  }
});

test("all twelve architectures and sixty stages remain interactive in the same workspace", async ({
  page,
}) => {
  test.setTimeout(75000);
  const tabs = page
    .getByRole("tablist", { name: "System architecture" })
    .getByRole("tab");
  await expect(tabs).toHaveCount(12);
  for (let i = 0; i < 12; i++) {
    await tabs.nth(i).click();
    await expect(tabs.nth(i)).toHaveAttribute("aria-selected", "true");
    const canvas = page.locator(".fusion-webgl");
    await expect(canvas).toBeVisible();
    expect(
      await canvas.evaluate((el) => {
        const gl = (el as HTMLCanvasElement).getContext("webgl2");
        return !!gl && !gl.isContextLost();
      }),
    ).toBe(true);
    for (let step = 0; step < 5; step++) {
      await page.locator(".fusion-timeline>button").nth(step).click();
      await expect(page.locator(".fusion-world")).toHaveAttribute(
        "data-phase",
        String(step),
      );
      await expect(
        page.locator(".fusion-timeline>button").nth(step),
      ).toHaveAttribute("aria-current", "step");
      expect(
        (await page.locator(".fusion-inspector-story p").textContent())!.length,
      ).toBeGreaterThan(75);
      expect(await page.locator(".fusion-flow-label").count()).toBeGreaterThan(
        0,
      );
    }
  }
});

test("components, exchanges, camera controls and fullscreen keep the contextual tools available", async ({
  page,
}) => {
  await page
    .getByRole("button", { name: "Inspect B-tree index", exact: true })
    .click();
  await expect(page.locator(".fusion-inspector-story h3")).toHaveText(
    "B-tree index",
  );
  await page.getByRole("button", { name: "Inspect in close-up" }).click();
  await expect(page.getByLabel("Immersive camera mode")).toHaveValue("follow");
  await page.getByLabel("Immersive camera mode").selectOption("orbit");
  await page.getByRole("button", { name: "Reset immersive camera" }).click();
  await page
    .getByRole("button", { name: "Stage 4: Replicate", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Inspect exchange: durable ACK", exact: true })
    .click();
  await expect(page.locator(".fusion-payload pre")).toContainText("Standby");
  await page.getByRole("button", { name: "Explode architecture" }).click();
  await expect(page.locator(".fusion-world")).toHaveAttribute(
    "data-exploded",
    "true",
  );
  await page.getByRole("button", { name: "Show data packets" }).click();
  await expect(
    page.getByRole("button", { name: "Show data packets" }),
  ).toHaveAttribute("aria-pressed", "false");
  await page
    .getByRole("button", { name: "Enter immersive focus", exact: true })
    .click();
  await expect
    .poll(() => page.evaluate(() => !!document.fullscreenElement))
    .toBe(true);
  await page
    .getByRole("button", { name: "Open Capacity tool", exact: true })
    .click();
  await expect(page.getByLabel("Average record")).toBeVisible();
  await expect(
    page.getByRole("tablist", { name: "System architecture" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Exit immersive focus", exact: true })
    .click();
  await expect
    .poll(() => page.evaluate(() => !!document.fullscreenElement))
    .toBe(false);
});

test("real WebGL motion pauses and the operation clock advances correctly", async ({
  page,
}) => {
  const canvas = page.locator(".fusion-webgl");
  const digest = async () =>
    createHash("sha256")
      .update(await canvas.screenshot())
      .digest("hex");
  const before = await digest();
  await page
    .getByRole("button", { name: "Play immersive animation", exact: true })
    .click();
  await page.getByLabel("Immersive animation speed").selectOption("2");
  await expect.poll(digest).not.toBe(before);
  await expect(page.locator(".fusion-world")).toHaveAttribute(
    "data-phase",
    "1",
    { timeout: 12000 },
  );
  await page
    .getByRole("button", { name: "Pause immersive animation", exact: true })
    .click();
  let last = await digest();
  await expect
    .poll(async () => {
      const next = await digest();
      const same = next === last;
      last = next;
      return same;
    })
    .toBe(true);
  const paused = await digest();
  await expect.poll(digest).toBe(paused);
});

test("keyboard system selection and WebGL fallback preserve every tool", async ({
  page,
}) => {
  const tabs = page
    .getByRole("tablist", { name: "System architecture" })
    .getByRole("tab");
  await tabs.first().focus();
  await page.keyboard.press("ArrowRight");
  await expect(tabs.nth(1)).toBeFocused();
  await page.keyboard.press("End");
  await expect(tabs.last()).toHaveAttribute("aria-selected", "true");
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    Object.defineProperty(HTMLCanvasElement.prototype, "getContext", {
      value(this: HTMLCanvasElement, type: string, ...args: unknown[]) {
        return type.includes("webgl")
          ? null
          : Reflect.apply(original, this, [type, ...args]);
      },
    });
  });
  await page.reload();
  await page
    .getByRole("button", { name: "Open Inspector tool", exact: true })
    .click();
  await expect(page.locator(".fusion-fallback-message")).toContainText(
    "3D is unavailable",
  );
  await page.getByLabel("Inspect architecture component").selectOption("index");
  await expect(page.locator(".fusion-inspector-story h3")).toHaveText(
    "B-tree index",
  );
  await page
    .getByRole("button", { name: "Open Capacity tool", exact: true })
    .click();
  await page.getByLabel("Average record").selectOption("100000");
  await expect(page.locator(".workspace-world-metrics")).toContainText("10 PB");
  await page
    .getByRole("button", { name: "Open Sources tool", exact: true })
    .click();
  expect(await page.locator(".workspace-source").count()).toBeGreaterThan(20);
});
