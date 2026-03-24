import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Karma and Jasmine: Angular Testing Complete Guide',
  description:
    'Master Angular testing with Karma and Jasmine. Learn TestBed configuration, component testing, service testing, pipe testing, HTTP mocking, and best practices for building reliable Angular test suites.',
  date: '2026-03-24',
  category: 'Tutorial',
  content: `
## Introduction to Angular Testing with Karma and Jasmine

Angular ships with a robust testing infrastructure built on two tools: Karma as the test runner and Jasmine as the testing framework. Together they provide everything you need to write and execute unit tests, integration tests, and component tests for Angular applications.

While newer alternatives like Jest and Web Test Runner have gained popularity, Karma and Jasmine remain the default testing stack in Angular projects generated with the Angular CLI. Understanding them deeply is essential for any Angular developer maintaining existing applications or working within teams that use the standard toolchain.

This guide covers the complete Angular testing workflow, from basic Jasmine syntax to advanced TestBed patterns.

## Karma: The Test Runner

### What Karma Does

Karma is a test runner created by the Angular team at Google. Its job is to launch real browsers, execute your tests inside them, and report the results back to your terminal. Unlike tools that simulate a browser environment, Karma runs tests in actual Chrome, Firefox, or Safari instances, ensuring your code works in real browser engines.

### How Karma Works

When you run \`ng test\`, the Angular CLI invokes Karma, which does the following:

1. Starts a local web server
2. Compiles your TypeScript tests using webpack
3. Launches one or more browsers
4. Serves the compiled test bundle to each browser
5. Collects results and displays them in the terminal
6. Watches for file changes and re-runs affected tests

### Karma Configuration

The \`karma.conf.js\` file at your project root controls Karma's behavior:

\`\`\`javascript
module.exports = function (config) {
  config.set({
    basePath: '',
    frameworks: ['jasmine', '@angular-devkit/build-angular'],
    plugins: [
      require('karma-jasmine'),
      require('karma-chrome-launcher'),
      require('karma-jasmine-html-reporter'),
      require('karma-coverage'),
    ],
    client: {
      jasmine: {
        random: true,
        seed: '',
      },
      clearContext: false,
    },
    coverageReporter: {
      dir: require('path').join(__dirname, './coverage'),
      subdir: '.',
      reporters: [
        { type: 'html' },
        { type: 'text-summary' },
        { type: 'lcov' },
      ],
    },
    reporters: ['progress', 'kjhtml'],
    port: 9876,
    colors: true,
    logLevel: config.LOG_INFO,
    autoWatch: true,
    browsers: ['Chrome'],
    singleRun: false,
    restartOnFileChange: true,
  });
};
\`\`\`

### Headless Chrome for CI

For CI/CD pipelines, run Chrome in headless mode:

\`\`\`javascript
browsers: ['ChromeHeadless'],
singleRun: true,
\`\`\`

Or define a custom launcher:

\`\`\`javascript
customLaunchers: {
  ChromeHeadlessCI: {
    base: 'ChromeHeadless',
    flags: ['--no-sandbox', '--disable-gpu'],
  },
},
browsers: ['ChromeHeadlessCI'],
\`\`\`

## Jasmine: The Testing Framework

### Jasmine Basics

Jasmine provides the syntax for writing test specifications. Tests are organized with \`describe\` blocks and individual test cases are defined with \`it\` blocks:

\`\`\`typescript
describe('Calculator', () => {
  let calculator: Calculator;

  beforeEach(() => {
    calculator = new Calculator();
  });

  describe('add', () => {
    it('should add two positive numbers', () => {
      expect(calculator.add(2, 3)).toBe(5);
    });

    it('should handle negative numbers', () => {
      expect(calculator.add(-1, -2)).toBe(-3);
    });

    it('should handle zero', () => {
      expect(calculator.add(0, 5)).toBe(5);
    });
  });

  describe('divide', () => {
    it('should divide two numbers', () => {
      expect(calculator.divide(10, 2)).toBe(5);
    });

    it('should throw on division by zero', () => {
      expect(() => calculator.divide(10, 0)).toThrowError('Division by zero');
    });
  });
});
\`\`\`

### Jasmine Matchers

Jasmine includes a rich set of built-in matchers:

\`\`\`typescript
// Equality
expect(value).toBe(expected);          // Strict equality (===)
expect(value).toEqual(expected);       // Deep equality
expect(value).toBeCloseTo(3.14, 2);    // Floating point

// Truthiness
expect(value).toBeTruthy();
expect(value).toBeFalsy();
expect(value).toBeNull();
expect(value).toBeUndefined();
expect(value).toBeDefined();

// Comparison
expect(value).toBeGreaterThan(3);
expect(value).toBeLessThanOrEqual(10);

// Strings
expect(str).toContain('hello');
expect(str).toMatch(/pattern/);

// Arrays
expect(arr).toContain(item);
expect(arr).toHaveSize(3);

// Objects
expect(obj).toEqual(jasmine.objectContaining({ key: 'value' }));

// Exceptions
expect(() => fn()).toThrow();
expect(() => fn()).toThrowError('message');

// Spies
expect(spy).toHaveBeenCalled();
expect(spy).toHaveBeenCalledWith('arg1', 'arg2');
expect(spy).toHaveBeenCalledTimes(3);
\`\`\`

### Setup and Teardown

Jasmine provides lifecycle hooks at every nesting level:

\`\`\`typescript
describe('UserService', () => {
  beforeAll(() => {
    // Run once before all tests in this describe block
  });

  beforeEach(() => {
    // Run before each test
  });

  afterEach(() => {
    // Run after each test
  });

  afterAll(() => {
    // Run once after all tests in this describe block
  });
});
\`\`\`

### Spies

Jasmine spies let you track function calls and control return values:

\`\`\`typescript
describe('OrderService', () => {
  it('should call the payment gateway', () => {
    const gateway = new PaymentGateway();
    const spy = spyOn(gateway, 'charge').and.returnValue(
      Promise.resolve({ success: true })
    );

    const service = new OrderService(gateway);
    service.processOrder({ amount: 99.99 });

    expect(spy).toHaveBeenCalledWith(99.99);
  });
});
\`\`\`

Spy strategies:

\`\`\`typescript
spyOn(obj, 'method').and.returnValue(42);
spyOn(obj, 'method').and.callThrough();     // Call the real method
spyOn(obj, 'method').and.callFake((x) => x * 2);
spyOn(obj, 'method').and.throwError('fail');
spyOn(obj, 'method').and.returnValues(1, 2, 3);  // Different per call
\`\`\`

## Angular TestBed

The TestBed is Angular's primary utility for configuring and initializing a testing module. It creates an isolated Angular module for each test, allowing you to declare components, provide services, and import modules just like a real Angular module.

### Basic TestBed Setup

\`\`\`typescript
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HeaderComponent } from './header.component';

describe('HeaderComponent', () => {
  let component: HeaderComponent;
  let fixture: ComponentFixture<HeaderComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [HeaderComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(HeaderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display the app title', () => {
    component.title = 'My App';
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent).toContain('My App');
  });
});
\`\`\`

### Standalone Components (Angular 14+)

For standalone components, the setup is slightly different:

\`\`\`typescript
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { UserCardComponent } from './user-card.component';

describe('UserCardComponent', () => {
  let fixture: ComponentFixture<UserCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UserCardComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(UserCardComponent);
  });

  it('should render user name', () => {
    fixture.componentInstance.user = { name: 'Alice', email: 'alice@example.com' };
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.user-name')?.textContent).toBe('Alice');
  });
});
\`\`\`

## Component Testing

### Testing Inputs and Outputs

\`\`\`typescript
@Component({
  selector: 'app-counter',
  template: \\\`
    <span class="count">{{ count }}</span>
    <button (click)="increment()">+</button>
  \\\`,
})
class CounterComponent {
  @Input() count = 0;
  @Output() countChange = new EventEmitter<number>();

  increment(): void {
    this.count++;
    this.countChange.emit(this.count);
  }
}

describe('CounterComponent', () => {
  let fixture: ComponentFixture<CounterComponent>;
  let component: CounterComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [CounterComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(CounterComponent);
    component = fixture.componentInstance;
  });

  it('should display the initial count', () => {
    component.count = 5;
    fixture.detectChanges();

    const el = fixture.nativeElement.querySelector('.count');
    expect(el.textContent).toBe('5');
  });

  it('should emit countChange when incremented', () => {
    spyOn(component.countChange, 'emit');
    component.count = 10;

    component.increment();

    expect(component.count).toBe(11);
    expect(component.countChange.emit).toHaveBeenCalledWith(11);
  });

  it('should increment on button click', () => {
    component.count = 0;
    fixture.detectChanges();

    const button = fixture.nativeElement.querySelector('button');
    button.click();
    fixture.detectChanges();

    const el = fixture.nativeElement.querySelector('.count');
    expect(el.textContent).toBe('1');
  });
});
\`\`\`

### Testing with Dependencies

When a component depends on services, provide mocks in the TestBed:

\`\`\`typescript
describe('UserListComponent', () => {
  let fixture: ComponentFixture<UserListComponent>;
  let mockUserService: jasmine.SpyObj<UserService>;

  beforeEach(async () => {
    mockUserService = jasmine.createSpyObj('UserService', ['getUsers']);
    mockUserService.getUsers.and.returnValue(
      of([
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Bob' },
      ])
    );

    await TestBed.configureTestingModule({
      declarations: [UserListComponent],
      providers: [{ provide: UserService, useValue: mockUserService }],
    }).compileComponents();

    fixture = TestBed.createComponent(UserListComponent);
    fixture.detectChanges();
  });

  it('should display users from the service', () => {
    const items = fixture.nativeElement.querySelectorAll('.user-item');
    expect(items.length).toBe(2);
    expect(items[0].textContent).toContain('Alice');
    expect(items[1].textContent).toContain('Bob');
  });

  it('should call getUsers on init', () => {
    expect(mockUserService.getUsers).toHaveBeenCalled();
  });
});
\`\`\`

### Testing Router Navigation

\`\`\`typescript
import { RouterTestingModule } from '@angular/router/testing';
import { Router } from '@angular/router';

describe('NavComponent', () => {
  let router: Router;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        RouterTestingModule.withRoutes([
          { path: 'dashboard', component: DashboardComponent },
          { path: 'settings', component: SettingsComponent },
        ]),
      ],
      declarations: [NavComponent],
    }).compileComponents();

    router = TestBed.inject(Router);
  });

  it('should navigate to dashboard', async () => {
    const fixture = TestBed.createComponent(NavComponent);
    fixture.detectChanges();

    const link = fixture.nativeElement.querySelector('[data-testid="nav-dashboard"]');
    link.click();

    await fixture.whenStable();
    expect(router.url).toBe('/dashboard');
  });
});
\`\`\`

## Service Testing

Services are the easiest Angular constructs to test because they are plain TypeScript classes.

### Simple Service

\`\`\`typescript
describe('MathService', () => {
  let service: MathService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(MathService);
  });

  it('should calculate fibonacci', () => {
    expect(service.fibonacci(0)).toBe(0);
    expect(service.fibonacci(1)).toBe(1);
    expect(service.fibonacci(10)).toBe(55);
  });
});
\`\`\`

### Service with HTTP Dependencies

Use \`HttpClientTestingModule\` to intercept and mock HTTP requests:

\`\`\`typescript
import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';

describe('ApiService', () => {
  let service: ApiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [ApiService],
    });

    service = TestBed.inject(ApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify(); // Ensure no outstanding requests
  });

  it('should fetch users', () => {
    const mockUsers = [
      { id: 1, name: 'Alice' },
      { id: 2, name: 'Bob' },
    ];

    service.getUsers().subscribe((users) => {
      expect(users.length).toBe(2);
      expect(users[0].name).toBe('Alice');
    });

    const req = httpMock.expectOne('/api/users');
    expect(req.request.method).toBe('GET');
    req.flush(mockUsers);
  });

  it('should handle errors', () => {
    service.getUsers().subscribe({
      next: () => fail('Expected an error'),
      error: (error) => {
        expect(error.status).toBe(500);
      },
    });

    const req = httpMock.expectOne('/api/users');
    req.flush('Server Error', {
      status: 500,
      statusText: 'Internal Server Error',
    });
  });

  it('should send POST with body', () => {
    const newUser = { name: 'Charlie', email: 'charlie@example.com' };

    service.createUser(newUser).subscribe((user) => {
      expect(user.id).toBe(3);
    });

    const req = httpMock.expectOne('/api/users');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(newUser);
    req.flush({ id: 3, ...newUser });
  });
});
\`\`\`

### Service with Other Service Dependencies

\`\`\`typescript
describe('AuthService', () => {
  let service: AuthService;
  let mockStorage: jasmine.SpyObj<StorageService>;
  let mockApi: jasmine.SpyObj<ApiService>;

  beforeEach(() => {
    mockStorage = jasmine.createSpyObj('StorageService', ['get', 'set', 'remove']);
    mockApi = jasmine.createSpyObj('ApiService', ['post']);

    TestBed.configureTestingModule({
      providers: [
        AuthService,
        { provide: StorageService, useValue: mockStorage },
        { provide: ApiService, useValue: mockApi },
      ],
    });

    service = TestBed.inject(AuthService);
  });

  it('should store token on login', () => {
    mockApi.post.and.returnValue(of({ token: 'abc123' }));

    service.login('user@test.com', 'password').subscribe(() => {
      expect(mockStorage.set).toHaveBeenCalledWith('auth_token', 'abc123');
    });
  });

  it('should clear token on logout', () => {
    service.logout();
    expect(mockStorage.remove).toHaveBeenCalledWith('auth_token');
  });
});
\`\`\`

## Pipe Testing

Pipes are pure functions wrapped in an Angular decorator, making them straightforward to test:

\`\`\`typescript
import { TruncatePipe } from './truncate.pipe';

describe('TruncatePipe', () => {
  let pipe: TruncatePipe;

  beforeEach(() => {
    pipe = new TruncatePipe();
  });

  it('should truncate long strings', () => {
    const result = pipe.transform('Hello World, this is a long string', 10);
    expect(result).toBe('Hello Worl...');
  });

  it('should not truncate short strings', () => {
    const result = pipe.transform('Hello', 10);
    expect(result).toBe('Hello');
  });

  it('should handle empty strings', () => {
    const result = pipe.transform('', 10);
    expect(result).toBe('');
  });

  it('should handle null values', () => {
    const result = pipe.transform(null as any, 10);
    expect(result).toBe('');
  });

  it('should use default limit of 50', () => {
    const longText = 'a'.repeat(60);
    const result = pipe.transform(longText);
    expect(result.length).toBe(53); // 50 + '...'
  });
});
\`\`\`

### Testing Async Pipes

For pipes that work with observables:

\`\`\`typescript
describe('TimeAgoPipe', () => {
  let pipe: TimeAgoPipe;

  beforeEach(() => {
    jasmine.clock().install();
    jasmine.clock().mockDate(new Date('2026-03-24T12:00:00Z'));
    pipe = new TimeAgoPipe();
  });

  afterEach(() => {
    jasmine.clock().uninstall();
  });

  it('should show "just now" for recent dates', () => {
    const date = new Date('2026-03-24T11:59:30Z');
    expect(pipe.transform(date)).toBe('just now');
  });

  it('should show minutes ago', () => {
    const date = new Date('2026-03-24T11:55:00Z');
    expect(pipe.transform(date)).toBe('5 minutes ago');
  });

  it('should show hours ago', () => {
    const date = new Date('2026-03-24T09:00:00Z');
    expect(pipe.transform(date)).toBe('3 hours ago');
  });
});
\`\`\`

## HTTP Mocking Patterns

### Interceptor Testing

\`\`\`typescript
describe('AuthInterceptor', () => {
  let httpMock: HttpTestingController;
  let httpClient: HttpClient;
  let mockAuth: jasmine.SpyObj<AuthService>;

  beforeEach(() => {
    mockAuth = jasmine.createSpyObj('AuthService', ['getToken']);
    mockAuth.getToken.and.returnValue('test-token-123');

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        { provide: AuthService, useValue: mockAuth },
        {
          provide: HTTP_INTERCEPTORS,
          useClass: AuthInterceptor,
          multi: true,
        },
      ],
    });

    httpClient = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
  });

  it('should add Authorization header', () => {
    httpClient.get('/api/data').subscribe();

    const req = httpMock.expectOne('/api/data');
    expect(req.request.headers.get('Authorization')).toBe('Bearer test-token-123');
    req.flush({});
  });

  it('should skip auth header for public endpoints', () => {
    httpClient.get('/api/public/health').subscribe();

    const req = httpMock.expectOne('/api/public/health');
    expect(req.request.headers.has('Authorization')).toBeFalse();
    req.flush({});
  });
});
\`\`\`

### Testing Error Handling

\`\`\`typescript
it('should retry on 503', fakeAsync(() => {
  let attempts = 0;

  service.fetchWithRetry('/api/data').subscribe((data) => {
    expect(data).toEqual({ result: 'ok' });
    expect(attempts).toBe(3);
  });

  // First two attempts fail
  for (let i = 0; i < 2; i++) {
    tick(1000 * i); // Retry delay
    const req = httpMock.expectOne('/api/data');
    attempts++;
    req.flush('Service Unavailable', { status: 503, statusText: 'Service Unavailable' });
  }

  // Third attempt succeeds
  tick(2000);
  const finalReq = httpMock.expectOne('/api/data');
  attempts++;
  finalReq.flush({ result: 'ok' });
}));
\`\`\`

## Best Practices

### Test Organization

Follow the Angular CLI convention of placing test files next to the source:

\`\`\`
src/
  app/
    components/
      header/
        header.component.ts
        header.component.spec.ts
    services/
      auth/
        auth.service.ts
        auth.service.spec.ts
    pipes/
      truncate/
        truncate.pipe.ts
        truncate.pipe.spec.ts
\`\`\`

### Use data-testid Attributes

Avoid coupling tests to CSS classes or element structure. Use dedicated test attributes:

\`\`\`html
<button data-testid="submit-form" class="btn btn-primary">Submit</button>
\`\`\`

\`\`\`typescript
const button = fixture.nativeElement.querySelector('[data-testid="submit-form"]');
\`\`\`

### Keep Tests Focused

Each test should verify one behavior. Use descriptive names that read as specifications:

\`\`\`typescript
it('should disable the submit button when the form is invalid', () => { });
it('should show validation error when email is empty', () => { });
it('should redirect to dashboard after successful login', () => { });
\`\`\`

### Prefer TestBed.inject Over Direct Instantiation

For services, always use \`TestBed.inject()\` to ensure Angular's dependency injection is involved:

\`\`\`typescript
// Preferred
const service = TestBed.inject(MyService);

// Avoid for DI-dependent services
const service = new MyService();
\`\`\`

### Clean Up After Async Operations

Always call \`httpMock.verify()\` in \`afterEach\` to catch unexpected HTTP requests:

\`\`\`typescript
afterEach(() => {
  httpMock.verify();
});
\`\`\`

## Running Tests in CI

### GitHub Actions Example

\`\`\`yaml
name: Angular Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run tests
        run: npx ng test --watch=false --browsers=ChromeHeadless --code-coverage

      - name: Upload coverage
        uses: codecov/codecov-action@v4
        with:
          file: ./coverage/lcov.info
\`\`\`

## Conclusion

Karma and Jasmine provide a mature, well-integrated testing stack for Angular applications. While the ecosystem is evolving and newer tools offer alternative approaches, the fundamentals covered in this guide apply regardless of which runner you use. The TestBed patterns, component testing strategies, service mocking techniques, and HTTP testing approaches are core Angular testing knowledge.

Start by testing your services and pipes, which are the simplest to test. Then move to component testing with mocked dependencies. As your confidence grows, add integration tests that verify how multiple components work together. The goal is a test suite that gives you confidence to refactor and ship features without fear of regressions.
`,
};
