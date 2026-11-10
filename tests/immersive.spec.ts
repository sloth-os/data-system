import { test, expect } from "@playwright/test";
import { createHash } from "node:crypto";

test.beforeEach(async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  (page as typeof page & { appErrors: string[] }).appErrors = errors;
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Step inside",
  );
});
test.afterEach(async ({ page }) => {
  expect((page as typeof page & { appErrors: string[] }).appErrors).toEqual([]);
});

test("twelve different 3D architectures execute all sixty explainable stages", async ({
  page,
}) => {
  const systems = page
    .getByRole("tablist", { name: "System architecture" })
    .getByRole("tab");
  await expect(systems).toHaveCount(12);
  for (let system = 0; system < 12; system++) {
    await systems.nth(system).click();
    await expect(systems.nth(system)).toHaveAttribute("aria-selected", "true");
    const canvas = page.locator(".fusion-webgl");
    await expect(canvas).toBeVisible();
    expect(
      await canvas.evaluate((el) => {
        const gl = (el as HTMLCanvasElement).getContext("webgl2");
        return gl && !gl.isContextLost() && gl.drawingBufferWidth > 0;
      }),
    ).toBe(true);
    for (let phase = 0; phase < 5; phase++) {
      await page.locator(".fusion-timeline > button").nth(phase).click();
      await expect(page.locator(".fusion-world")).toHaveAttribute(
        "data-phase",
        String(phase),
      );
      await expect(
        page.locator(".fusion-timeline > button").nth(phase),
      ).toHaveAttribute("aria-current", "step");
      expect(
        (await page.locator(".fusion-inspector-story p").textContent())!.length,
      ).toBeGreaterThan(75);
      expect(await page.locator(".fusion-flow-label").count()).toBeGreaterThan(
        0,
      );
      await expect(page.locator(".fusion-payload pre")).not.toBeEmpty();
      await expect(page.locator(".fusion-transform strong")).not.toBeEmpty();
    }
  }
});

test("inspects components and exchanges; separates layers and changes camera views", async ({
  page,
}) => {
  await page
    .getByRole("button", { name: "Inspect B-tree index", exact: true })
    .click();
  await expect(page.locator(".fusion-inspector-story h3")).toHaveText(
    "B-tree index",
  );
  await expect(page.locator(".fusion-payload pre")).toContainText(
    "root → branch",
  );
  await expect(
    page.getByRole("button", { name: "Play immersive animation" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Inspect in close-up" }).click();
  await expect(page.getByLabel("Immersive camera mode")).toHaveValue("follow");
  await page
    .getByRole("button", { name: "Return to stage explanation" })
    .click();
  await page.getByLabel("Immersive camera mode").selectOption("orbit");
  await page.getByRole("button", { name: "Reset immersive camera" }).click();
  await page
    .getByRole("button", { name: "Stage 4: Replicate", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Inspect exchange: durable ACK", exact: true })
    .click();
  await expect(page.locator(".fusion-inspector")).toContainText(
    "EXCHANGE INSPECTOR",
  );
  await expect(page.locator(".fusion-payload pre")).toContainText("Standby");
  await expect(page.locator(".fusion-payload pre")).toContainText(
    "Write-ahead log",
  );
  await page.getByRole("button", { name: "Explode architecture" }).click();
  await expect(page.locator(".fusion-world")).toHaveAttribute(
    "data-exploded",
    "true",
  );
  await page.getByRole("button", { name: "Show all component labels" }).click();
  await expect(
    page.getByRole("button", { name: "Show all component labels" }),
  ).toHaveAttribute("aria-pressed", "false");
  await page.getByRole("button", { name: "Show data packets" }).click();
  await expect(
    page.getByRole("button", { name: "Show data packets" }),
  ).toHaveAttribute("aria-pressed", "false");
  await page.getByLabel("Immersive camera mode").selectOption("top");
  await expect(page.locator(".fusion-view-caption")).toContainText("Plan view");
  await page
    .getByRole("button", { name: "Enter immersive focus", exact: true })
    .click();
  await expect
    .poll(() => page.evaluate(() => Boolean(document.fullscreenElement)))
    .toBe(true);
  await page
    .getByRole("button", { name: "Exit immersive focus", exact: true })
    .click();
  await expect
    .poll(() => page.evaluate(() => Boolean(document.fullscreenElement)))
    .toBe(false);
});

test("animates real WebGL, pauses it, and advances the synchronized operation", async ({
  page,
}) => {
  const canvas = page.locator(".fusion-webgl");
  await expect(canvas).toBeVisible();
  const digest = async () =>
    createHash("sha256")
      .update(await canvas.screenshot())
      .digest("hex");
  const before = await digest();
  await page.getByRole("button", { name: "Play immersive animation" }).click();
  await page.getByLabel("Immersive animation speed").selectOption("2");
  await expect.poll(digest).not.toBe(before);
  await expect(page.locator(".fusion-world")).toHaveAttribute(
    "data-phase",
    "1",
    { timeout: 12000 },
  );
  await expect(page.locator(".fusion-inspector-story h3")).toHaveText(
    "Create a new row version",
  );
  await page.getByRole("button", { name: "Pause immersive animation" }).click();
  // The last in-flight render may finish after the click; require consecutive
  // rendered frames to settle to the same image rather than capturing that race.
  let previous = await digest();
  await expect
    .poll(async () => {
      const current = await digest();
      const stable = current === previous;
      previous = current;
      return stable;
    })
    .toBe(true);
  const paused = await digest();
  await expect.poll(digest).toBe(paused);
  await page.getByRole("button", { name: "Replay operation" }).click();
  await expect(page.locator(".fusion-world")).toHaveAttribute(
    "data-phase",
    "0",
  );
  await expect(
    page.getByRole("button", { name: "Pause immersive animation" }),
  ).toBeVisible();
});

test("faults isolate the relevant component for every architecture and reset cleanly", async ({
  page,
}) => {
  const tabs = page
    .getByRole("tablist", { name: "System architecture" })
    .getByRole("tab");
  for (let i = 0; i < 12; i++) {
    await tabs.nth(i).click();
    await page.locator(".fusion-fault-button").click();
    await expect(page.locator(".fusion-fault-chip")).toHaveText(
      "FAULT INJECTED",
    );
    await expect(
      page.locator('.fusion-node-label[data-failed="true"]'),
    ).toHaveCount(1);
    await expect(page.locator(".fusion-fault-detail")).toContainText(
      "Recovery response",
    );
    await expect(page.getByLabel("Next immersive stage")).toBeDisabled();
    await expect(page.locator(".fusion-transform strong")).toHaveText(
      "Blocked · no completed output",
    );
    const blockedPhase = Number(
      await page.locator(".fusion-world").getAttribute("data-phase"),
    );
    for (let downstream = blockedPhase + 1; downstream < 5; downstream++)
      await expect(
        page.locator(".fusion-timeline > button").nth(downstream),
      ).toBeDisabled();
    await expect(
      page.locator('.fusion-flow-label[data-blocked="true"]').first(),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Restore the healthy path" })
      .click();
    await expect(page.locator(".fusion-fault-detail")).toHaveCount(0);
    await expect(
      page.locator('.fusion-node-label[data-failed="true"]'),
    ).toHaveCount(0);
    if (blockedPhase < 4)
      await expect(page.getByLabel("Next immersive stage")).toBeEnabled();
  }
});

test("supports keyboard system selection, help, and project exploration", async ({
  page,
}) => {
  const tabs = page
    .getByRole("tablist", { name: "System architecture" })
    .getByRole("tab");
  await tabs.first().focus();
  await page.keyboard.press("ArrowRight");
  await expect(tabs.nth(1)).toHaveAttribute("aria-selected", "true");
  await expect(tabs.nth(1)).toBeFocused();
  await page.keyboard.press("End");
  await expect(tabs.last()).toHaveAttribute("aria-selected", "true");
  await page.keyboard.press("Home");
  await expect(tabs.first()).toHaveAttribute("aria-selected", "true");
  await page.getByRole("button", { name: "How to explore the 3D lab" }).click();
  await expect(page.locator(".fusion-help")).toContainText(
    "Packets show direction and data representation",
  );
  await page.getByRole("button", { name: "Close 3D help" }).click();
  await page
    .locator(".fusion-project-links")
    .getByRole("button", { name: "PostgreSQL" })
    .click();
  await expect(page.getByLabel("Search projects")).toHaveValue("PostgreSQL");
  await expect(page.locator(".project-card")).toHaveCount(1);
});

test("keeps all systems and component details usable without WebGL", async ({
  page,
}) => {
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
  await expect(page.locator(".fusion-fallback-message")).toContainText(
    "3D is unavailable",
  );
  await page.getByRole("tab", { name: "Vector", exact: false }).click();
  await page.getByLabel("Inspect architecture component").selectOption("index");
  await expect(page.locator(".fusion-inspector-story h3")).toHaveText(
    "ANN space",
  );
  await page
    .getByRole("button", { name: "Stage 4: Rerank", exact: true })
    .click();
  await expect(page.locator(".fusion-inspector-story h3")).toHaveText(
    "Score the candidate shortlist",
  );
});

test("connects data models and project profiles to the matching immersive family", async ({
  page,
}) => {
  const nav = page.getByRole("navigation", { name: "Main navigation" });
  await nav
    .getByRole("button", { name: "Explore systems", exact: true })
    .click();
  await page
    .getByRole("tablist", { name: "Data model" })
    .getByRole("tab", { name: "Graph", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Explore this data model in 3D" })
    .click();
  await expect(page.locator(".fusion-world")).toHaveAttribute(
    "data-system",
    "graph",
  );
  await page
    .locator(".fusion-project-links")
    .getByRole("button", { name: "Neo4j" })
    .click();
  await page.locator(".project-card").click();
  await page
    .getByRole("button", { name: "Explore this system family in 3D" })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.locator(".fusion-stage-heading h2")).toHaveText(
    "Graph database",
  );
  await nav
    .getByRole("button", { name: "Performance lab", exact: true })
    .click();
  await nav.getByRole("button", { name: "Immersive lab", exact: true }).click();
  await expect(page.locator(".fusion-world")).toHaveAttribute(
    "data-system",
    "graph",
  );
});

test("mobile lab fits the viewport and exposes large component and motion controls", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const tabs = page
    .getByRole("tablist", { name: "System architecture" })
    .getByRole("tab");
  for (let i = 0; i < 12; i++) {
    await tabs.nth(i).click();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await expect(page.locator(".fusion-stage-heading h2")).toBeVisible();
    await page.locator(".fusion-viewport").scrollIntoViewIfNeeded();
    await expect
      .poll(() =>
        page
          .locator(".fusion-node-label, .fusion-flow-label")
          .evaluateAll((elements) => {
            const rects = elements
              .filter(
                (el) =>
                  getComputedStyle(el).visibility === "visible" &&
                  +getComputedStyle(el).opacity > 0.9,
              )
              .map((el) => el.getBoundingClientRect());
            let overlaps = 0;
            for (let a = 0; a < rects.length; a++)
              for (let b = a + 1; b < rects.length; b++) {
                const x = rects[a],
                  y = rects[b];
                if (
                  x.left < y.right &&
                  x.right > y.left &&
                  x.top < y.bottom &&
                  x.bottom > y.top
                )
                  overlaps++;
              }
            return overlaps;
          }),
      )
      .toBe(0);
  }
  await page.getByLabel("Inspect architecture component").selectOption("exact");
  await expect(page.locator(".fusion-inspector-story h3")).toHaveText(
    "Exact predicate",
  );
  await page
    .getByRole("button", { name: "Stage 5: Return", exact: true })
    .click();
  await expect(page.getByLabel("Next immersive stage")).toBeDisabled();
  await page.getByRole("button", { name: "Open navigation" }).click();
  await page
    .getByRole("navigation", { name: "Main navigation" })
    .getByRole("button", { name: "Performance lab", exact: true })
    .click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "More machines",
  );
});
