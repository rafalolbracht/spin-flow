## TESTING

### Guidelines for E2E

#### PLAYWRIGHT

- Initialize configuration only with Chromium/Desktop Chrome browser
- Use browser contexts for isolating test environments
- Implement the Page Object Model for maintainable tests
- Use locators for resilient element selection
- Leverage API testing for backend validation
- Implement visual comparison with expect(page).toHaveScreenshot()
- Use the codegen tool for test recording
- Leverage trace viewer for debugging test failures
- Implement test hooks for setup and teardown
- Use expect assertions with specific matchers
- Leverage parallel execution for faster test runs

---

### Project-Specific Guidelines (Spin Flow)

#### Configuration

- Auto-start dev server with webServer config in playwright.config.ts
- Polish locale and Europe/Warsaw timezone
- Screenshots and videos on failure only
- Retry on CI only

#### Locator Selection

**Priority (most to least resilient):**

1. Role-based: `getByRole('button', { name: 'Text' })`
2. Text-based: `getByText('exact text')`
3. Alt text: `getByAltText('Logo')`
4. Test IDs: `getByTestId('id')`
5. CSS selectors: `locator('.class')` - use as last resort

#### Critical Issues & Solutions

**Multiple elements error:**

- Problem: "strict mode violation: resolved to 2 elements"
- Solution: Use `exact: true` or differentiate by full text

**Angular/PrimeNG components:**

- Always wait for `networkidle` after navigation (Angular hydration)
- Use `getByRole()` for PrimeNG buttons (not CSS like `p-button`)
- Avoid CSS selectors for framework components

**Visual regression:**

- Wait for `networkidle` before screenshots
- Use `maxDiffPixels: 200` tolerance for animations
- First run creates baseline, subsequent runs compare

#### Best Practices

- Always use Page Object Model pattern
- Test on mobile/tablet/desktop viewports for responsive
- Use Polish test names for project consistency
- Focus E2E on critical user flows (10% of all tests)
- Test both UI and API endpoints in separate describe blocks
- Use UI mode (`npm run test:e2e:ui`) for debugging

#### Authentication & Test Mode (UPDATED 2026-01-12)

**Real Test Database Approach (Current):**

- Import test from `./fixtures/auth.fixture` instead of `@playwright/test`
- Auth fixture automatically adds `x-test-mode: true` header
- Middleware detects header and uses **service role client** (bypass RLS)
- Test user: Real UUID from `TEST_USER_ID` in `.env`
- **Global setup/teardown** - automatic cleanup via Project Dependencies

**Required Setup:**

1. Add to `.env`:

```bash
TEST_USER_ID=your-uuid-from-database
TEST_USER_EMAIL=your-email@example.com
```

2. Use auth fixture in tests:

```typescript
// ✅ CORRECT - Authenticated tests with real database
import { test, expect } from "./fixtures/auth.fixture";

test("authenticated test", async ({ page }) => {
  await page.goto("/matches/create");
  // User is automatically authenticated via service role client
});
```

```typescript
// ❌ WRONG - Will fail with authentication error
import { test, expect } from "@playwright/test";
```

**When NOT to use auth fixture:**

- Public pages (landing, auth page)
- Testing OAuth flow itself (UI only)
- API tests without UI

**Best Practices for Stable Tests:**

1. **Use `waitForResponse()` before clicking:**

   ```typescript
   const responsePromise = page.waitForResponse((r) =>
     r.url().includes("/api/...")
   );
   await button.click();
   await responsePromise;
   ```

2. **AI report polling (max 60 min):**

   ```typescript
   // Poll every 3s like frontend does
   while (true) {
     const spinner = page.locator("p-progressSpinner");
     if (!(await spinner.isVisible())) break;
     await page.waitForTimeout(3000);
   }
   ```

3. **PrimeNG component selectors:**

   ```typescript
   // ✅ GOOD - role-based
   page.getByRole("dialog", { name: "Zakończ mecz" });
   page.getByRole("button", { name: "Zapisz", exact: true });

   // ❌ BAD - CSS selectors for PrimeNG
   page.locator('p-button:has-text("Zapisz")');
   ```

**Recent Improvements (2026-01-12):**

- ✅ `full-match-flow.spec.ts` fully stable - all tests passing (2/2)
- ✅ Set transitions stabilized with `waitForResponse()` instead of fixed timeout
- ✅ Redirect to `/summary` fixed (frontend store now updates match status)
- ✅ AI report polling strategy implemented (max 60 minutes)
- ✅ PrimeNG component locators improved (role-based + CSS classes)
- ✅ Global setup/teardown implemented via Project Dependencies

#### Global Setup & Teardown (Project Dependencies)

**Use Project Dependencies approach (recommended by Playwright):**

```typescript
// playwright.config.ts
projects: [
  {
    name: "setup",
    testMatch: /global\.setup\.ts/,
    teardown: "cleanup",
  },
  {
    name: "cleanup",
    testMatch: /global\.teardown\.ts/,
  },
  {
    name: "chromium",
    use: { ...devices["Desktop Chrome"] },
    dependencies: ["setup"],
  },
];
```

**Benefits over globalSetup config option:**

- ✅ Visible in HTML reports as separate projects
- ✅ Full trace recording and screenshots
- ✅ Supports Playwright fixtures
- ✅ Better error handling and logging

**Implementation:**

- `tests/e2e/global.setup.ts` - runs BEFORE all tests (cleanup)
- `tests/e2e/global.teardown.ts` - runs AFTER all tests (cleanup)
- Both use `cleanupTestData()` from `tests/setup/cleanup.ts`

**In tests - no manual cleanup needed:**

```typescript
// ✅ CORRECT - Cleanup happens automatically
import { test, expect } from "./fixtures/auth.fixture";

test("my test", async ({ page }) => {
  // Test runs with clean database
});

// ❌ DEPRECATED - Don't do manual cleanup
// test.beforeEach(async () => {
//   await cleanupTestData();
// });
```

#### Common Pitfalls

- Don't use fragile CSS selectors for framework components
- Don't assume single element with text matchers
- Don't skip waitForLoadState with Angular/Astro SSR
- Don't create tests without Page Objects
- Don't test implementation details (CSS classes)
- Don't import from `@playwright/test` if test requires authentication
- Don't use manual cleanup in beforeEach/afterEach - use global setup/teardown
