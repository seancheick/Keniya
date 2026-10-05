// eslint-disable-next-line @typescript-eslint/no-require-imports -- plain Node test script, Playwright path is configurable
const { chromium } = require(process.env.PLAYWRIGHT_PATH ?? "playwright");
const S = process.env.SHOTS_DIR ?? "/tmp";
const BASE = "http://localhost:3000";
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  page.setDefaultTimeout(120000);
  page.setDefaultNavigationTimeout(180000);
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const step = (m) => console.log("✓", m);
  const shot = (n) => page.screenshot({ path: `${S}/${n}.png`, fullPage: true });

  await page.goto(`${BASE}/admin/products`);
  if (!page.url().includes("/admin/login")) throw new Error("not gated");
  await page.fill("#name", "Tester");
  await page.fill("#password", "wrong");
  await page.click("button[type=submit]");
  await page.getByText("Wrong password.").waitFor();
  step("wrong password rejected");
  await page.fill("#password", process.env.ADMIN_PASSWORD);
  await page.click("button[type=submit]");
  await page.waitForURL(/\/admin\/products/);
  step("login → back to /admin/products (next param)");

  for (const p of ["/admin", "/admin/products", "/admin/inventory", "/admin/boxes", "/admin/boxes/heart", "/admin/orders", "/admin/purchasing", "/admin/customers", "/admin/reports", "/admin/settings", "/admin/inventory/recall", "/admin/products/new"]) {
    const r = await page.goto(BASE + p);
    const body = await page.locator("body").innerText();
    if (r.status() !== 200 || /Application error|Unhandled Runtime Error|Error:/.test(body.slice(0, 400))) throw new Error(`${p} → ${r.status()} ${body.slice(0, 300)}`);
    step(`${p} 200`);
  }
  await page.goto(`${BASE}/admin`); await shot("dashboard");

  // Product detail
  await page.goto(`${BASE}/admin/products`);
  await page.getByRole("link", { name: /BOOMCHICKAPOP/ }).first().click();
  await page.waitForURL(/\/admin\/products\/[0-9a-f-]{36}$/);
  await page.getByText("Box fit").waitFor();
  await shot("product");
  step("product detail");

  // Log a purchase: 24 units for $11.99
  await page.goto(`${BASE}/admin/inventory/log`);
  await page.getByPlaceholder(/search by name/).fill("boomchickapop");
  await page.locator("ul button").first().click();
  await page.locator("input[name=vendor]").fill("Costco");
  await page.locator("input[name=qty]").fill("24");
  await page.locator("input[name=total]").fill("11.99");
  const unit = await page.getByText("/unit").first().innerText();
  if (!unit.includes("$0.50")) throw new Error("unit cost preview " + unit);
  step("unit preview " + unit);
  await shot("log-purchase");
  await page.getByRole("button", { name: "Log purchase" }).last().click();
  await page.getByText("Logged 24 units of").waitFor();
  await shot("log-done");
  step("purchase logged: " + (await page.getByText(/\/unit$/).first().innerText()));

  // Boxes optimizer
  await page.goto(`${BASE}/admin/boxes/heart`);
  await page.getByRole("button", { name: "Suggest lineup" }).click();
  await page.waitForTimeout(800);
  const badge = await page.getByText(/READY|FIX ·/).first().innerText();
  step("optimizer heart → " + badge);
  await shot("box-heart");

  // Orders: plan → pack → label
  await page.goto(`${BASE}/admin/orders?tab=todo`);
  await page.getByRole("button", { name: "Plan" }).first().click();
  await page.waitForTimeout(1500);
  await page.goto(`${BASE}/admin/orders?tab=planned`);
  await page.getByRole("link", { name: /KEN-/ }).first().click();
  await page.waitForURL(/\/admin\/orders\/[0-9a-f-]{36}$/);
  const note = await page.locator("p.bg-amber-50").first().innerText().catch(() => "(no avoid note)");
  step("planned shipment; note: " + note);
  await page.getByRole("button", { name: /Mark packed/ }).click();
  await page.getByRole("button", { name: /Unpack/ }).waitFor({ timeout: 15000 });
  step("packed");
  await page.locator("input[name=label_cost]").fill("8.14");
  await page.locator("input[name=tracking]").fill("9400111899223344556677");
  await page.locator("input[name=zone]").fill("4");
  await page.getByRole("button", { name: "Save label" }).click();
  await page.getByText("Mark delivered").waitFor({ timeout: 15000 });
  await page.reload();
  await shot("shipment");
  step("shipped; P&L: " + (await page.getByText("Profit").locator("..").innerText()).replace(/\n/g, " "));

  // Recall
  await page.goto(`${BASE}/admin/inventory`);
  await page.getByRole("link", { name: /^EARLY-/ }).first().click().catch(() => {});
  await page.waitForTimeout(800);
  step("recall: " + (await page.locator("body").innerText()).match(/Shipments\s*\n?\s*\d+/)?.[0]);
  await shot("recall");

  // Mobile log purchase
  const m = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true });
  await m.context().addCookies(await page.context().cookies());
  await m.goto(`${BASE}/admin/inventory/log`);
  await m.screenshot({ path: `${S}/mobile-log.png`, fullPage: true });
  await m.goto(`${BASE}/admin`);
  await m.screenshot({ path: `${S}/mobile-dashboard.png`, fullPage: true });
  step("mobile screenshots");

  console.log("page errors:", errors.length ? errors : "none");
  await browser.close();
})().catch((e) => { console.error("FAIL", e.message); process.exit(1); });
