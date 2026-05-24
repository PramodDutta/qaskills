import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Karma to Jest Migration Guide for 2026',
  description:
    'Migrate Karma test runner suites to Jest in 2026. Angular and AngularJS patterns, config translation, jsdom replacement, debugging, and rollout plan.',
  date: '2026-05-11',
  category: 'Migration',
  content: `
# Karma to Jest Migration Guide for 2026

Karma was Google's test runner of choice for AngularJS, and later, the default runner for Angular CLI projects through Angular 15. It was unique in spinning up a real browser to execute tests, which gave true DOM fidelity but at a significant performance cost. In 2023 the Angular team deprecated Karma in favor of modern runners, and as of 2026 Karma is in maintenance mode with no active feature work.

Most Angular and AngularJS teams have either migrated or scoped a migration. The two natural targets are Jest (mature, broad ecosystem) and Vitest (faster, ESM-native, increasingly popular). This guide focuses on Karma to Jest. For Karma to Vitest, the mapping is nearly identical; substitute \`vi\` for \`jest\` and check the Vitest guides on [the blog](/blog).

For broader testing references, browse [the blog index](/blog). For Angular testing skills, see the [QA Skills directory](/skills).

## Why migrate from Karma to Jest

Speed is the headline. A typical Karma run launches a Chrome instance, loads the SystemJS bundle, and executes specs in the browser. Each step adds latency. A 500-spec Angular suite that takes 90 seconds in Karma often runs in 25 seconds in Jest with jsdom.

The second reason is maintenance. Karma has not received significant updates in two years. New browser versions occasionally break Karma plugins; community support is dwindling. The third reason is parity with the broader JavaScript ecosystem. Jest's API, watch mode, mocking, and snapshot testing are familiar to anyone joining from a React or Node project.

## Conceptual model: real browser vs jsdom

Karma runs tests in a real browser. This was its key value proposition: you tested in the exact engine that would run your code in production, including subtle differences in CSS, layout, and DOM APIs.

Jest runs tests in Node with jsdom (or happy-dom) emulating the DOM. This is faster but has fidelity caveats: jsdom does not implement CSS layout, does not paint pixels, and lags real browsers on some newer DOM features. For 95% of component tests, jsdom is sufficient. For visual regression or layout-sensitive tests, run them as E2E tests in Playwright, not as unit tests.

## API mapping table

### Test syntax

Karma uses Jasmine by default. Jest's API is heavily Jasmine-inspired, so the migration is mostly mechanical.

| Karma + Jasmine | Jest | Notes |
|---|---|---|
| \`describe(name, fn)\` | \`describe(name, fn)\` | Identical |
| \`it(name, fn)\` | \`it(name, fn)\` or \`test(name, fn)\` | Both work |
| \`beforeEach(fn)\` | \`beforeEach(fn)\` | Identical |
| \`expect(x).toBe(y)\` | \`expect(x).toBe(y)\` | Identical |
| \`expect(x).toEqual(y)\` | \`expect(x).toEqual(y)\` | Identical |
| \`expect(x).toBeTruthy()\` | \`expect(x).toBeTruthy()\` | Identical |
| \`spyOn(obj, 'method')\` | \`jest.spyOn(obj, 'method')\` | Slight name change |
| \`jasmine.createSpy()\` | \`jest.fn()\` | Different name, same idea |
| \`jasmine.clock().install()\` | \`jest.useFakeTimers()\` | Different API |
| \`jasmine.clock().tick(ms)\` | \`jest.advanceTimersByTime(ms)\` | Different name |
| \`expect(fn).toThrow()\` | \`expect(fn).toThrow()\` | Identical |
| \`fdescribe\` / \`fit\` | \`describe.only\` / \`it.only\` | Different syntax |
| \`xdescribe\` / \`xit\` | \`describe.skip\` / \`it.skip\` | Different syntax |

### Angular-specific imports

| Karma | Jest with jest-preset-angular |
|---|---|
| \`TestBed.configureTestingModule(...)\` | Same; works in Jest |
| \`ComponentFixture\` | Same; works in Jest |
| \`fakeAsync\` / \`tick\` | Same; works in Jest |
| \`HttpTestingController\` | Same; works in Jest |
| \`BrowserAnimationsModule\` | \`NoopAnimationsModule\` (recommended) |

## Step-by-step migration plan (Angular)

1. **Day 1** - Install \`jest\`, \`jest-preset-angular\`, \`@types/jest\`.
2. **Day 2** - Create \`jest.config.js\` and \`setup-jest.ts\`.
3. **Day 3** - Update \`tsconfig.spec.json\` to use Jest types.
4. **Days 4 to 5** - Run \`jest\`; fix import and TestBed issues.
5. **Days 6 to 8** - Translate \`spyOn\` and timer mocks.
6. **Day 9** - Update Angular CLI test command to use Jest.
7. **Day 10** - Remove Karma plugins and Jasmine.

## Before and after: a real Angular component test

**Karma + Jasmine (before)**

\`\`\`typescript
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LoginComponent } from './login.component';
import { AuthService } from './auth.service';

describe('LoginComponent', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;
  let authService: jasmine.SpyObj<AuthService>;

  beforeEach(() => {
    const spy = jasmine.createSpyObj('AuthService', ['login']);
    TestBed.configureTestingModule({
      declarations: [LoginComponent],
      providers: [{ provide: AuthService, useValue: spy }],
    });
    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    authService = TestBed.inject(AuthService) as jasmine.SpyObj<AuthService>;
  });

  it('calls login on submit', async () => {
    authService.login.and.resolveTo({ id: 1 });
    component.email = 'a@b.com';
    component.password = 'secret';
    await component.submit();
    expect(authService.login).toHaveBeenCalledWith('a@b.com', 'secret');
  });
});
\`\`\`

**Jest (after)**

\`\`\`typescript
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LoginComponent } from './login.component';
import { AuthService } from './auth.service';

describe('LoginComponent', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;
  let authService: jest.Mocked<AuthService>;

  beforeEach(() => {
    const mockAuth = { login: jest.fn() } as unknown as jest.Mocked<AuthService>;
    TestBed.configureTestingModule({
      declarations: [LoginComponent],
      providers: [{ provide: AuthService, useValue: mockAuth }],
    });
    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    authService = TestBed.inject(AuthService) as jest.Mocked<AuthService>;
  });

  it('calls login on submit', async () => {
    authService.login.mockResolvedValue({ id: 1 });
    component.email = 'a@b.com';
    component.password = 'secret';
    await component.submit();
    expect(authService.login).toHaveBeenCalledWith('a@b.com', 'secret');
  });
});
\`\`\`

The diff is small: \`jasmine.createSpyObj\` becomes \`jest.fn()\`, \`.and.resolveTo\` becomes \`.mockResolvedValue\`, and types shift from \`SpyObj\` to \`jest.Mocked\`.

## Configuration

A minimal \`jest.config.js\` for Angular:

\`\`\`javascript
module.exports = {
  preset: 'jest-preset-angular',
  setupFilesAfterEach: ['<rootDir>/setup-jest.ts'],
  testEnvironment: 'jsdom',
  collectCoverageFrom: ['src/**/*.ts'],
  coverageThreshold: {
    global: { branches: 75, functions: 80, lines: 80, statements: 80 },
  },
  transform: {
    '^.+\\\\.(ts|js|html|svg)$': 'jest-preset-angular',
  },
};
\`\`\`

And \`setup-jest.ts\`:

\`\`\`typescript
import 'jest-preset-angular/setup-jest';
\`\`\`

Update \`tsconfig.spec.json\` types:

\`\`\`json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "outDir": "./out-tsc/spec",
    "types": ["jest", "node"]
  },
  "include": ["src/**/*.spec.ts", "src/**/*.d.ts"]
}
\`\`\`

## Angular CLI integration

If you use Angular CLI, swap the test builder:

\`\`\`json
// angular.json
"test": {
  "builder": "@angular-builders/jest:run",
  "options": {}
}
\`\`\`

Or run Jest directly with \`npx jest\` and remove the test builder.

## fakeAsync and tick

Angular's \`fakeAsync\`/\`tick\`/\`flush\` work identically in Jest. You do not need Jest's \`useFakeTimers\` for Angular code; use Angular's own helpers.

\`\`\`typescript
it('debounces input', fakeAsync(() => {
  component.search('abc');
  tick(300);
  expect(component.results).toEqual(['abc']);
}));
\`\`\`

## HttpTestingController

The \`HttpClientTestingModule\` and \`HttpTestingController\` work in Jest identically to Karma. No changes needed.

\`\`\`typescript
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';

beforeEach(() => {
  TestBed.configureTestingModule({
    imports: [HttpClientTestingModule],
  });
  httpMock = TestBed.inject(HttpTestingController);
});
\`\`\`

## Snapshot testing

Jest supports snapshot testing out of the box. For Angular components, snapshot the rendered HTML:

\`\`\`typescript
it('renders correctly', () => {
  fixture.detectChanges();
  expect(fixture.nativeElement.innerHTML).toMatchSnapshot();
});
\`\`\`

## CI changes

Replace the Karma command with Jest in package.json:

\`\`\`json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:cov": "jest --coverage"
  }
}
\`\`\`

In GitHub Actions:

\`\`\`yaml
- run: npm ci
- run: npm test -- --coverage --ci
- uses: codecov/codecov-action@v4
\`\`\`

## Gotchas and breaking changes

1. **\`spyOn\` becomes \`jest.spyOn\`.** Identical semantics; different name.
2. **\`SpyObj\` becomes \`jest.Mocked\`.** Type-only change.
3. **\`fdescribe\`/\`fit\` become \`describe.only\`/\`it.only\`.** Easy find-and-replace.
4. **Karma plugins do not transfer.** Coverage, reporters, browser launchers all use the Jest equivalents.
5. **\`jasmine.clock\` becomes \`jest.useFakeTimers\`.** Different API surface.
6. **No real browser.** If you rely on actual layout, paint, or browser APIs, those tests belong in Playwright.
7. **\`done\` callbacks still work.** Prefer async/await.
8. **Angular animations may break.** Use \`NoopAnimationsModule\` in tests.
9. **\`@testing-library/angular\` integrates with Jest.** Consider it alongside the migration.
10. **Watch mode is faster.** Jest's interactive watch is a UX upgrade over Karma's auto-watch.

## Migration checklist

- [ ] Install \`jest\`, \`jest-preset-angular\`, \`@types/jest\`.
- [ ] Create \`jest.config.js\` and \`setup-jest.ts\`.
- [ ] Update \`tsconfig.spec.json\` to use Jest types.
- [ ] Translate \`jasmine.createSpy\` to \`jest.fn\`.
- [ ] Translate \`jasmine.clock\` to \`jest.useFakeTimers\`.
- [ ] Update Angular CLI builder or run \`jest\` directly.
- [ ] Configure coverage thresholds.
- [ ] Wire CI for Jest.
- [ ] Remove Karma and Jasmine dependencies.
- [ ] Train team on Jest's watch mode.
- [ ] Update onboarding docs and the [QA Skills directory](/skills).

## When not to migrate

If your suite is small (under 100 specs), runs reliably, and your team is productive, the ROI is low. If you depend on a Karma plugin with no Jest equivalent, audit the cost. Consider Vitest as an alternative target; for many projects it is a better choice than Jest in 2026.

## Conclusion and next steps

The Karma-to-Jest migration is one of the cleanest framework migrations in Angular today. The Jasmine-to-Jest translation is mostly mechanical, Angular's testing utilities work identically in both runners, and the speedups are significant. A two-person team can move a 1,000-spec suite in two weeks.

Start with one component. Establish the patterns. Bulk port from there. Train the team on the watch mode last; it sells the migration on its own.

Next read: explore the [QA Skills directory](/skills) for Angular testing skills, and the [blog index](/blog) for Vitest and Jest deep dives.
`,
};
