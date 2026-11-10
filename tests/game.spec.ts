import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";
import { missions, missionFor } from "../src/game";
import type { SystemId } from "../src/systemModels";

const errors = new WeakMap<Page, string[]>();
test.beforeEach(async ({ page }) => {
  const list: string[] = [];
  errors.set(page, list);
  page.on("pageerror", (e) => list.push(e.message));
  await page.goto("/");
});
test.afterEach(async ({ page }) => expect(errors.get(page)).toEqual([]));
const launch = async (page: Page, id: SystemId) => {
  await page
    .getByRole("button", {
      name: `Start mission: ${missionFor(id).title}`,
      exact: true,
    })
    .click();
  await expect(page.locator(".game-hud")).toHaveAttribute(
    "data-status",
    "playing",
  );
};
async function station(page: Page, id: SystemId, index: number) {
  const objective = missionFor(id).objectives[index];
  await page
    .getByRole("button", { name: "Navigate to objective", exact: true })
    .click();
  const interact = page.getByRole("button", {
    name: "Interact with objective",
    exact: true,
  });
  await expect(interact).toBeEnabled({ timeout: 30000 });
  await interact.click();
  await expect(page.getByLabel("Mission station console")).toBeVisible();
  if (!objective.capacity) {
    const answer =
      objective.choices?.find((c) => c.id === objective.correct)?.label ||
      objective.action;
    await page.getByRole("button", { name: answer, exact: true }).click();
  }
}

test("physical movement, camera reset, research pause and resume share one renderer", async ({
  page,
}) => {
  await expect(
    page.getByRole("button", { name: /^Start mission:/ }),
  ).toHaveCount(12);
  await launch(page, "relational");
  const canvas = await page.locator(".fusion-webgl").elementHandle();
  const hud = page.locator(".game-hud");
  const x = await hud.getAttribute("data-player-x"),
    z = await hud.getAttribute("data-player-z");
  await page.keyboard.down("KeyD");
  await expect.poll(() => hud.getAttribute("data-player-x")).not.toBe(x);
  await page.keyboard.up("KeyD");
  await page
    .getByRole("button", { name: "Pause mission", exact: true })
    .first()
    .click();
  await expect(hud).toHaveAttribute("data-status", "paused");
  const paused = await hud.getAttribute("data-player-x");
  await page
    .getByRole("button", { name: "Reset immersive camera", exact: true })
    .click();
  await expect
    .poll(async () =>
      Math.abs(
        Number(await hud.getAttribute("data-player-x")) - Number(paused),
      ),
    )
    .toBeLessThan(0.05);
  expect(
    await canvas!.evaluate(
      (el) => el === document.querySelector(".fusion-webgl"),
    ),
  ).toBe(true);
  await page
    .getByRole("button", { name: "Resume mission", exact: true })
    .first()
    .click();
  await page
    .getByRole("button", { name: "Open Sources tool", exact: true })
    .click();
  await expect(hud).toHaveAttribute("data-status", "paused");
  await expect(page.locator(".workspace-source").first()).toBeVisible();
  await page
    .getByRole("button", { name: "Open Mission tool", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Resume mission", exact: true })
    .first()
    .click();
  await expect(hud).toHaveAttribute("data-status", "playing");
  expect(z).toBeTruthy();
  await expect(page.locator("canvas")).toHaveCount(1);
});

test("a complete transaction route awards and persists a certification", async ({
  page,
}) => {
  test.setTimeout(180000);
  await launch(page, "relational");
  for (let i = 0; i < missionFor("relational").objectives.length; i++)
    await station(page, "relational", i);
  await expect(page.locator(".game-hud")).toHaveAttribute("data-status", "won");
  await expect(page.locator(".game-outcome")).toContainText(
    "System certified.",
  );
  await expect(page.locator(".game-pilot-record")).toContainText(
    "1 / 12 certifications",
  );
  const score = await page.locator(".game-pilot-record > b").textContent();
  await page.reload();
  await expect(page.locator(".game-pilot-record")).toContainText(
    "1 / 12 certifications",
  );
  await expect(page.locator(".game-pilot-record > b")).toHaveText(score!);
  await expect(
    page
      .locator(".game-campaign-list article")
      .first()
      .getByLabel("3 of 3 stars"),
  ).toBeVisible();
});

test("wrong engineering decisions exhaust a run and retry restores its resources", async ({
  page,
}) => {
  test.setTimeout(90000);
  await launch(page, "relational");
  await station(page, "relational", 0);
  await page
    .getByRole("button", { name: "Navigate to objective", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Interact with objective", exact: true }),
  ).toBeEnabled({ timeout: 30000 });
  await page
    .getByRole("button", { name: "Interact with objective", exact: true })
    .click();
  for (let i = 0; i < 6; i++)
    await page
      .getByRole("button", { name: "Scan every row", exact: true })
      .click();
  await expect(page.locator(".game-hud")).toHaveAttribute(
    "data-status",
    "lost",
  );
  await expect(page.locator(".game-pilot-record")).toContainText(
    "0 / 12 certifications",
  );
  await page
    .getByRole("button", { name: "Retry this contract", exact: true })
    .click();
  await expect(
    page.getByRole("progressbar", { name: "Training integrity" }),
  ).toHaveAttribute("aria-valuenow", "100");
  await expect(page.locator(".game-current-objective")).toContainText(
    "Collect the transaction",
  );
});

test("10 PB contract uses the shared capacity controls and validates the modeled plan", async ({
  page,
}) => {
  test.setTimeout(180000);
  await launch(page, "lakehouse");
  for (let i = 0; i < 4; i++) await station(page, "lakehouse", i);
  await page
    .getByRole("button", { name: "Validate the capacity plan", exact: true })
    .click();
  await expect(page.locator(".game-answer-feedback")).toContainText(
    "misses a contract constraint",
  );
  const canvas = await page.locator(".fusion-webgl").elementHandle();
  await page
    .getByRole("button", { name: "Open Capacity controls", exact: true })
    .click();
  await page.getByLabel("Compression", { exact: true }).selectOption("4");
  await page.getByLabel("Network per worker").selectOption("25");
  const workers = page.getByLabel("Worker count");
  await workers.focus();
  await page.keyboard.press("Home");
  for (let i = 0; i < 15; i++) await page.keyboard.press("ArrowRight");
  const skew = page.getByLabel("Skew penalty");
  await skew.focus();
  await page.keyboard.press("Home");
  await expect(page.locator(".workspace-results")).toContainText("10 PB");
  await page
    .getByRole("button", { name: "Open Mission tool", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Validate the capacity plan", exact: true })
    .click();
  await expect(page.locator(".game-hud")).toHaveAttribute(
    "data-status",
    "playing",
  );
  expect(
    await canvas!.evaluate(
      (el) => el === document.querySelector(".fusion-webgl"),
    ),
  ).toBe(true);
  for (let i = 4; i < 6; i++) await station(page, "lakehouse", i);
  await expect(page.locator(".game-hud")).toHaveAttribute("data-status", "won");
});

test("mobile direction pad and mission console work without page overflow", async ({
  page,
}) => {
  test.setTimeout(90000);
  await page.setViewportSize({ width: 390, height: 844 });
  await launch(page, "relational");
  const hud = page.locator(".game-hud"),
    x = await hud.getAttribute("data-player-x");
  const button = page.getByRole("button", { name: "Move right", exact: true });
  const box = (await button.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await expect.poll(() => hud.getAttribute("data-player-x")).not.toBe(x);
  await page.mouse.up();
  await station(page, "relational", 0);
  await expect(page.locator(".game-hud")).toHaveAttribute(
    "data-status",
    "playing",
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("sector-map fallback retains physical mission navigation without WebGL", async ({
  page,
}) => {
  test.setTimeout(90000);
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
  await launch(page, "relational");
  await expect(page.locator(".fusion-fallback-message")).toContainText(
    "Sector-map mode",
  );
  await expect(page.locator("canvas")).toHaveCount(0);
  await station(page, "relational", 0);
  await expect(page.locator(".game-current-objective")).toContainText(
    missions[0].objectives[1].title,
  );
});
