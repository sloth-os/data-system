import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";
import { createHash } from "node:crypto";
const errors = new WeakMap<Page, string[]>();
const open = async (page: Page, name: string) =>
  page.getByRole("button", { name: `Open ${name} tool`, exact: true }).click();
test.beforeEach(async ({ page }) => {
  const list: string[] = [];
  errors.set(page, list);
  page.on("pageerror", (e) => list.push(e.message));
  await page.goto("/");
  await expect(page.locator(".fusion-webgl")).toBeVisible();
});
test.afterEach(async ({ page }) => expect(errors.get(page)).toEqual([]));

test("scale lenses change the shared world while preserving its current phase", async ({
  page,
}) => {
  await page.getByRole("button", { name: "Stage 3: Log", exact: true }).click();
  const canvas = await page.locator(".fusion-webgl").elementHandle();
  await open(page, "Scale");
  const snapshots: string[] = [];
  for (const [label, id] of [
    ["CPU", "cpu"],
    ["Server", "server"],
    ["Cluster", "cluster"],
    ["Multi-cloud", "multicloud"],
  ]) {
    await page
      .locator(".scale-panel .workspace-choice-grid")
      .getByRole("button", { name: new RegExp(`^${label}`) })
      .click();
    await expect(page.locator(".fusion-world")).toHaveAttribute(
      "data-scale",
      id,
    );
    await expect(page.locator(".fusion-world")).toHaveAttribute(
      "data-phase",
      "2",
    );
    expect(
      await canvas!.evaluate(
        (el) => el === document.querySelector(".fusion-webgl"),
      ),
    ).toBe(true);
    snapshots.push(
      createHash("sha256")
        .update(await page.locator(".fusion-webgl").screenshot())
        .digest("hex"),
    );
  }
  expect(new Set(snapshots).size).toBe(4);
});

test("capacity controls reach 10 PB and update the same scene and comparison model", async ({
  page,
}) => {
  const original = await page.locator(".fusion-webgl").elementHandle();
  await open(page, "Capacity");
  await page.getByLabel("Average record").selectOption("100000");
  await expect(page.locator(".workspace-results")).toContainText("10 PB");
  await expect(page.locator(".workspace-results")).toContainText("15 PB");
  await expect(page.locator(".workspace-world-metrics")).toContainText("10 PB");
  await page.getByLabel("Replicas", { exact: true }).selectOption("5");
  await expect(page.locator(".workspace-results")).toContainText("25 PB");
  await page.getByLabel("Worker count").focus();
  await page.keyboard.press("End");
  await expect(page.locator(".fusion-world")).toHaveAttribute(
    "data-workers",
    "128",
  );
  await page.getByRole("button", { name: "Scale up", exact: true }).click();
  await expect(page.locator(".fusion-world")).toHaveAttribute(
    "data-scale",
    "server",
  );
  await expect(page.getByLabel("Worker count")).toBeDisabled();
  await expect(page.locator(".fusion-world")).toHaveAttribute(
    "data-workers",
    "1",
  );
  await page.getByRole("button", { name: "Scale out", exact: true }).click();
  await page.getByLabel("Network per worker").selectOption("1");
  await expect(page.locator(".capacity-panel")).toContainText(
    "Network-bound under these assumptions.",
  );
  expect(
    await original!.evaluate(
      (el) => el === document.querySelector(".fusion-webgl"),
    ),
  ).toBe(true);
  await open(page, "Inspector");
  await open(page, "Capacity");
  await expect(page.getByLabel("Replicas", { exact: true })).toHaveValue("5");
  await expect(page.getByLabel("Average record")).toHaveValue("100000");
});

test("transaction, query and streaming journeys drive the operation instead of opening pages", async ({
  page,
}) => {
  await open(page, "Data paths");
  for (const [name, system] of [
    ["Transactional write", "relational"],
    ["Analytical exchange", "lakehouse"],
    ["Stateful event stream", "stream"],
  ]) {
    await page
      .locator(".workspace-journeys")
      .getByRole("button", { name: new RegExp(name) })
      .click();
    await expect(page.locator(".fusion-world")).toHaveAttribute(
      "data-system",
      system,
    );
    for (let step = 0; step < 5; step++) {
      await page.locator(".workspace-step-list>button").nth(step).click();
      await expect(page.locator(".fusion-world")).toHaveAttribute(
        "data-phase",
        String(step),
      );
      await expect(
        page.locator(".workspace-step-list>button").nth(step),
      ).toHaveAttribute("aria-current", "step");
    }
    await expect(page.locator("canvas")).toHaveCount(1);
  }
  await page
    .getByRole("button", {
      name: "Inspect exchange: commit checkpoint",
      exact: true,
    })
    .click();
  await expect(page.locator(".workspace-inspector-heading")).toContainText(
    "Operation inspector",
  );
  await expect(page.locator(".fusion-payload pre")).toContainText(
    "Checkpoint store",
  );
});

test("project profiles stay in scene and retain search and family context", async ({
  page,
}) => {
  await open(page, "Projects");
  await expect(page.locator(".workspace-project-list>button")).toHaveCount(16);
  await page.getByLabel("Search projects").fill("Neo4j");
  await page.locator(".workspace-project-list>button").click();
  await expect(page.locator(".fusion-world")).toHaveAttribute(
    "data-system",
    "graph",
  );
  await expect(page.locator(".workspace-profile")).toContainText(
    "Core algorithm",
  );
  await expect(page.locator(".workspace-profile")).toContainText("Deployment");
  await page
    .getByRole("button", { name: "Open stage inspector", exact: true })
    .click();
  await page.getByLabel("Inspect architecture component").selectOption("graph");
  await expect(page.locator(".fusion-inspector-story h3")).toHaveText(
    "Neighborhood",
  );
  await open(page, "Projects");
  await expect(page.getByLabel("Search projects")).toHaveValue("Neo4j");
  await page.getByLabel("Search projects").fill("no-matching-project");
  await expect(page.getByRole("status")).toContainText("No matching projects");
  await page.getByLabel("Search projects").fill("");
  await page.getByLabel("Project category").selectOption("Document");
  await expect(page.locator(".workspace-project-list>button")).toHaveCount(1);
  await page.locator(".workspace-project-list>button").click();
  await expect(page.locator(".fusion-world")).toHaveAttribute(
    "data-system",
    "document",
  );
  await page
    .getByRole("button", { name: "Trace this family's operation" })
    .click();
  await expect(page.locator(".paths-panel")).toBeVisible();
});

test("ten engineering challenges add mechanisms to the world and can be cleared in place", async ({
  page,
}) => {
  test.setTimeout(75000);
  await open(page, "Challenges");
  const buttons = page.locator(".workspace-issue-list>button");
  await expect(buttons).toHaveCount(10);
  for (let i = 0; i < 10; i++) {
    await buttons.nth(i).click();
    await expect(buttons.nth(i)).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator(".workspace-active-issue")).toBeVisible();
    await expect(page.locator(".fusion-world")).not.toHaveAttribute(
      "data-issue",
      "",
    );
    await expect(page.locator(".workspace-profile")).toContainText(
      "The mechanism",
    );
    await expect(page.locator("canvas")).toHaveCount(1);
  }
  const family = await page
    .locator(".fusion-world")
    .getAttribute("data-system");
  await page.getByRole("button", { name: "Clear the challenge" }).click();
  await expect(page.locator(".fusion-world")).toHaveAttribute("data-issue", "");
  await expect(page.locator(".fusion-world")).toHaveAttribute(
    "data-system",
    family!,
  );
});

test("all five recovery drills gate the same operation until the runbook is complete", async ({
  page,
}) => {
  test.setTimeout(75000);
  await open(page, "Recovery");
  for (let scenario = 0; scenario < 5; scenario++) {
    await page.getByLabel("Recovery scenario").selectOption(String(scenario));
    const canvas = await page.locator(".fusion-webgl").elementHandle();
    await page
      .getByRole("button", { name: "Start recovery drill", exact: true })
      .click();
    await expect(page.getByLabel("Next immersive stage")).toBeDisabled();
    await expect(page.getByLabel("Replay operation")).toBeDisabled();
    await expect(page.locator(".fusion-transform strong")).toHaveText(
      "Blocked · no completed output",
    );
    await expect(
      page
        .getByRole("tablist", { name: "System architecture" })
        .getByRole("tab")
        .first(),
    ).toBeDisabled();
    if (scenario === 3)
      await expect(page.locator(".fusion-world")).toHaveAttribute(
        "data-phase",
        "0",
      );
    if (scenario === 4)
      await expect(page.locator(".workspace-world-metrics")).toContainText(
        "10 PB",
      );
    await open(page, "Capacity");
    await expect(page.getByLabel("Average record")).toBeDisabled();
    await open(page, "Inspector");
    await page
      .getByRole("button", { name: "Continue the recovery drill" })
      .click();
    const steps = await page.locator(".workspace-runbook>li").count();
    for (let step = 0; step < steps; step++) {
      await expect(page.locator(".workspace-drill-status")).toContainText(
        `step ${step + 1} of ${steps}`,
      );
      await page
        .getByRole("button", {
          name: step === steps - 1 ? "Complete recovery" : "Confirm & continue",
          exact: true,
        })
        .click();
    }
    await expect(page.locator(".workspace-drill-status")).toContainText(
      "Drill complete",
    );
    await expect(page.locator(".fusion-world")).toHaveAttribute(
      "data-recovery",
      "",
    );
    await expect(page.getByLabel("Replay operation")).toBeEnabled();
    expect(
      await canvas!.evaluate(
        (el) => el === document.querySelector(".fusion-webgl"),
      ),
    ).toBe(true);
  }
});

test("mobile tools are contextual sheets over the same world, including repeat header requests", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const original = await page.locator(".fusion-webgl").elementHandle();
  await expect(
    page.getByRole("complementary", { name: "Contextual scene inspector" }),
  ).not.toBeVisible();
  for (const tool of [
    "Scale",
    "Data paths",
    "Capacity",
    "Projects",
    "Challenges",
    "Recovery",
    "Sources",
    "Inspector",
  ]) {
    await open(page, tool);
    await expect(
      page.getByRole("complementary", { name: "Contextual scene inspector" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Close scene inspector" }).click();
    await expect(
      page.getByRole("complementary", { name: "Contextual scene inspector" }),
    ).not.toBeVisible();
    expect(
      await original!.evaluate(
        (el) => el === document.querySelector(".fusion-webgl"),
      ),
    ).toBe(true);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  await page
    .getByRole("button", { name: "Sources and methodology", exact: true })
    .click();
  await expect(page.locator(".sources-panel")).toBeVisible();
  await page.getByRole("button", { name: "Close scene inspector" }).click();
  await page
    .getByRole("button", { name: "Sources and methodology", exact: true })
    .click();
  await expect(page.locator(".sources-panel")).toBeVisible();
  await page.getByRole("button", { name: "Close scene inspector" }).click();
  await page
    .getByRole("button", { name: "Open stage inspector", exact: true })
    .click();
  await page.getByLabel("Inspect architecture component").selectOption("index");
  await expect(page.locator(".fusion-inspector-story h3")).toHaveText(
    "B-tree index",
  );
});
