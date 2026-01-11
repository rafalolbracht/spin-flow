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

#### Common Pitfalls

- Don't use fragile CSS selectors for framework components
- Don't assume single element with text matchers
- Don't skip waitForLoadState with Angular/Astro SSR
- Don't create tests without Page Objects
- Don't test implementation details (CSS classes)
