import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Selenide Page Object Pattern — Best Practices 2026',
  description:
    'Build maintainable Selenide page objects. Class structure, locator strategies, return types, fluent API, components, and team conventions.',
  date: '2026-05-09',
  category: 'Tutorial',
  content: `
# Selenide Page Object Pattern Best Practices

The Page Object pattern is the most important design pattern for browser test code. Done right, it isolates locator details behind expressive class APIs, makes tests read like user stories, and confines maintenance to a handful of files when the UI changes. Done wrong, it creates a parallel UI in test code that doubles your maintenance burden. Selenide's syntax — \`$\`, \`$$\`, \`should\`, \`shouldHave\` — makes Page Objects especially clean, but only if you follow the patterns this guide describes.

This guide is a hands-on walkthrough of Page Object best practices in Selenide for 2026. We cover class structure, naming conventions, locator strategies, return types, fluent APIs, component patterns for reusable UI sections, page initialization, navigation methods, and the team conventions that scale across hundreds of tests. Every example is working Java code using Selenide 7+ and JUnit 5.

---

## Key Takeaways

- **One Page Object per page** — not per feature, not per workflow
- **Use SelenideElement fields**, not WebElement, to keep retry/wait behavior
- **Methods return the next page** (or this) to enable fluent chaining
- **No assertions in Page Objects** — assertions belong in tests
- **Use \`@FindBy\` only when necessary** — \`$\` lookups are clearer for most cases
- **Components for reusable sections** like headers, navbars, modals

---

## Anti-Pattern: Raw WebDriver in Tests

This is what we're trying to avoid:

\`\`\`java
@Test
void loginTest() {
    driver.get("/login");
    driver.findElement(By.id("email")).sendKeys("alice@example.com");
    driver.findElement(By.id("password")).sendKeys("secret");
    driver.findElement(By.id("submit")).click();
    new WebDriverWait(driver, Duration.ofSeconds(10))
        .until(d -> d.findElement(By.id("dashboard")).isDisplayed());
    assertTrue(driver.findElement(By.id("user-name")).getText().contains("alice"));
}
\`\`\`

Locators are scattered everywhere. Waits are manual. When the login form changes, you edit five test files.

---

## Pattern: Simple Page Object

The minimum viable Page Object:

\`\`\`java
import com.codeborne.selenide.SelenideElement;
import static com.codeborne.selenide.Selenide.$;

public class LoginPage {
    private final SelenideElement emailField = $("#email");
    private final SelenideElement passwordField = $("#password");
    private final SelenideElement submitButton = $("#submit");

    public LoginPage typeEmail(String email) {
        emailField.setValue(email);
        return this;
    }

    public LoginPage typePassword(String password) {
        passwordField.setValue(password);
        return this;
    }

    public DashboardPage submit() {
        submitButton.click();
        return new DashboardPage();
    }
}
\`\`\`

And the test becomes:

\`\`\`java
@Test
void loginTest() {
    Selenide.open("/login");
    new LoginPage()
        .typeEmail("alice@example.com")
        .typePassword("secret")
        .submit();
    new DashboardPage().assertWelcomes("alice");
}
\`\`\`

The test reads like a sentence.

---

## Rule: Return the Next Page

Methods that navigate should return a Page Object of the destination:

\`\`\`java
public DashboardPage submit() {
    submitButton.click();
    return new DashboardPage();
}
\`\`\`

Methods that stay on the same page return \`this\`:

\`\`\`java
public LoginPage typeEmail(String email) {
    emailField.setValue(email);
    return this;
}
\`\`\`

This enables fluent chaining.

---

## Rule: No Assertions Inside Page Objects

Page Objects model the UI, not test logic. Assertions belong in tests:

\`\`\`java
// Bad
public class DashboardPage {
    public void assertLoggedIn(String name) {
        $("#user-name").shouldHave(text(name));
    }
}

// Good
public class DashboardPage {
    public SelenideElement userName() {
        return $("#user-name");
    }
}

// In test:
new DashboardPage().userName().shouldHave(text("alice"));
\`\`\`

Or expose query methods that return values, never assertions:

\`\`\`java
public String getUserName() {
    return $("#user-name").getText();
}
\`\`\`

Exception: a single \`isLoaded()\` method per page is OK to assert the page has rendered:

\`\`\`java
public class DashboardPage {
    public DashboardPage shouldBeLoaded() {
        $("#dashboard").shouldBe(visible);
        return this;
    }
}
\`\`\`

This is acceptable because it's part of navigation, not test logic.

---

## Rule: Use SelenideElement, Not WebElement

\`\`\`java
// Bad
private WebElement submit = driver.findElement(By.id("submit"));

// Good
private final SelenideElement submit = $("#submit");
\`\`\`

\`SelenideElement\` is lazy (evaluates when accessed) and retry-aware. \`WebElement\` becomes stale on DOM changes.

---

## Locator Strategy

| Locator | When to use |
|---|---|
| \`$("#id")\` | Stable IDs (best) |
| \`$("[data-testid='foo']")\` | Test-only data attributes (also great) |
| \`$(".class.modifier")\` | When IDs unavailable |
| \`$("xpath://...")\` | Complex hierarchy navigation |
| \`$$("selector").findBy(text(...))\` | Find by visible text |

Prefer \`data-testid\` attributes added by developers specifically for testing. They're the most stable.

---

## Pattern: Page Components

For reusable sections like headers and modals, extract Component classes:

\`\`\`java
public class Navbar {
    private final SelenideElement self;

    public Navbar(SelenideElement root) { this.self = root; }

    public ProfilePage clickProfile() {
        self.$(".profile-link").click();
        return new ProfilePage();
    }

    public Navbar openMenu() {
        self.$(".menu-toggle").click();
        return this;
    }
}

public class DashboardPage {
    private final Navbar navbar = new Navbar($(".navbar"));

    public Navbar navbar() { return navbar; }
}

// Use in test:
new DashboardPage().navbar().clickProfile();
\`\`\`

Components are scoped to a root element, so locators inside are relative.

---

## Pattern: Lazy Element Initialization

Avoid initializing elements in constructors — they may not exist yet when the Page Object is created. Use fields:

\`\`\`java
public class LoginPage {
    private final SelenideElement email = $("#email"); // lazy: resolves on access
    // ...
}
\`\`\`

Selenide's \`$\` is lazy by default. Field initialization stores the locator, not the actual element.

---

## Pattern: Navigation

\`\`\`java
public class LoginPage {
    public static LoginPage open() {
        Selenide.open("/login");
        return new LoginPage();
    }
}
\`\`\`

Then in tests:

\`\`\`java
@Test
void test() {
    LoginPage.open()
        .typeEmail("a@b.com")
        .typePassword("secret")
        .submit();
}
\`\`\`

---

## Pattern: Form Data Objects

For pages with many fields, accept a data object:

\`\`\`java
public class SignupPage {
    public SignupPage fill(SignupForm form) {
        $("#name").setValue(form.name);
        $("#email").setValue(form.email);
        $("#password").setValue(form.password);
        $("#country").selectOption(form.country);
        $("#tos").shouldBe(visible).click();
        return this;
    }
}

public record SignupForm(String name, String email, String password, String country) { }
\`\`\`

Then tests:

\`\`\`java
new SignupPage().fill(new SignupForm("Alice", "a@b.com", "secret123", "USA")).submit();
\`\`\`

---

## Pattern: Conditional Methods

For modals or panels that may or may not be present:

\`\`\`java
public class HomePage {
    public HomePage dismissCookieBannerIfPresent() {
        if ($("#cookie-banner").is(visible)) {
            $("#cookie-banner .dismiss").click();
        }
        return this;
    }
}
\`\`\`

Use \`is()\` (which returns immediately) for conditional checks, not \`should\` (which waits).

---

## Pattern: Multi-Element Operations

\`\`\`java
public class ProductsPage {
    public ProductsPage assertProductsShown(List<String> names) {
        $$(".product .name").shouldHave(exactTexts(names.toArray(new String[0])));
        return this;
    }
}
\`\`\`

This is one of the few cases where having a "should" method in a Page Object is acceptable — when the assertion is part of the page's contract.

---

## Project Structure

\`\`\`
src/test/java/
  pages/
    LoginPage.java
    DashboardPage.java
    SignupPage.java
    components/
      Navbar.java
      Footer.java
      Modal.java
  tests/
    LoginTest.java
    SignupTest.java
  config/
    SelenideConfig.java
\`\`\`

---

## Naming Conventions

| What | Convention | Example |
|---|---|---|
| Page class | NounPage | LoginPage |
| Component class | Noun | Navbar |
| Action method | verb | submit(), clickProfile() |
| Query method | get/is/has prefix | getUserName(), isLoaded() |
| Element field | nounOrAdjective | submitButton, errorMessage |
| Test method | verb_should_outcome | login_shouldRedirectToDashboard |

---

## Common Mistakes

| Mistake | Fix |
|---|---|
| Assertions in Page Objects | Move to tests |
| Returning void from action methods | Return next Page Object or this |
| Storing WebElement instead of SelenideElement | Use SelenideElement |
| Initializing elements with findElement() in constructor | Use field initializers with \`$\` |
| One mega-page for the whole app | Split per page |
| Tests directly using \`$\` | Encapsulate in Page Objects |
| Reusing the same Page Object across pages | One class per page |
| Reading state with \`getText()\` then asserting | Expose element, assert in test |

---

## Test Example

\`\`\`java
class CheckoutTest {

    @Test
    void completePurchase() {
        ProductsPage products = HomePage.open()
            .navbar()
            .clickProducts();

        products
            .filter("electronics")
            .add("laptop-pro")
            .add("usb-c-cable")
            .openCart()
            .applyCoupon("SAVE10")
            .checkout()
            .fillShipping(testShipping())
            .fillPayment(testPayment())
            .placeOrder()
            .orderConfirmation()
            .shouldHave(text("Order placed"));
    }
}
\`\`\`

The test reads like a user story. Locators are nowhere in sight.

---

## Conclusion

Page Objects done right are the difference between a 100-test suite you can maintain and a 100-test suite that drowns your team. Encapsulate locators, return Page Objects from actions, keep assertions in tests, use Components for reusable sections, and follow consistent naming. Combined with Selenide's expressive condition DSL, the result is browser tests that read like spec documentation.

For deeper coverage, see our [Selenide Condition cheatsheet](/blog/selenide-condition-cheatsheet-2026) and [Collection reference](/blog/selenide-collection-shouldhave-reference).

Explore the [QA skills directory](/skills) for related browser automation patterns.
`,
};
