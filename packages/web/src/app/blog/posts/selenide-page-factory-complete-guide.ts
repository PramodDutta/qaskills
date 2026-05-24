import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Selenide Page Factory — Complete Guide 2026',
  description:
    'Master Selenide page factory pattern with page() method, @FindBy, ElementsContainer, lazy initialization, and Selenide PageFactory examples.',
  date: '2026-05-10',
  category: 'Tutorial',
  content: `
# Selenide Page Factory Complete Guide

The Page Factory pattern emerged in Selenium WebDriver as a way to initialize Page Object fields declaratively using \`@FindBy\` annotations and the \`PageFactory.initElements\` method. Selenide adopted and improved this pattern with the \`page()\` method, deep \`ElementsContainer\` support, and lazy SelenideElement fields that don't require initialization. In 2026, knowing both the traditional Selenium PageFactory and Selenide's enhanced version is essential for Java teams maintaining mixed codebases or migrating between the two.

This guide walks through every Page Factory pattern available in Selenide. We cover the \`page()\` method, \`@FindBy\` annotations with Selenide locators, \`ElementsContainer\` for reusable components, lazy initialization semantics, parameterized Page Objects, and migration patterns from raw Selenium PageFactory. Every code sample is working Java with Selenide 7+ and JUnit 5.

---

## Key Takeaways

- **Selenide.page(MyPage.class)** is the modern Selenide way to instantiate Page Objects
- **@FindBy** still works with SelenideElement fields for declarative locators
- **ElementsContainer** is Selenide's component superclass for nested page sections
- **Lazy fields** (SelenideElement) don't need PageFactory.initElements
- **Constructor-based** initialization is preferred when you need parameters
- **Migration is straightforward** from Selenium PageFactory to Selenide

---

## Method 1: Manual Field Initialization (Simplest)

The simplest Selenide pattern doesn't need Page Factory at all:

\`\`\`java
import com.codeborne.selenide.SelenideElement;
import static com.codeborne.selenide.Selenide.$;

public class LoginPage {
    private final SelenideElement email = $("#email");
    private final SelenideElement password = $("#password");
    private final SelenideElement submit = $("button[type=submit]");

    public DashboardPage login(String e, String p) {
        email.setValue(e);
        password.setValue(p);
        submit.click();
        return new DashboardPage();
    }
}

// Usage:
LoginPage page = new LoginPage();
page.login("a@b.com", "secret");
\`\`\`

Selenide's \`$\` returns lazy SelenideElement instances, so no initialization is needed.

---

## Method 2: Selenide.page() Factory

\`Selenide.page(MyPage.class)\` returns a Page Object instance with all Selenide annotations processed:

\`\`\`java
import static com.codeborne.selenide.Selenide.page;

public class LoginPage {
    @FindBy(id = "email")
    public SelenideElement email;

    @FindBy(id = "password")
    public SelenideElement password;

    @FindBy(css = "button[type=submit]")
    public SelenideElement submit;
}

// Usage:
LoginPage login = page(LoginPage.class);
login.email.setValue("a@b.com");
\`\`\`

The fields are public (or have setters) and annotated with \`@FindBy\`. \`page()\` reflects on the class and wires up the fields.

---

## @FindBy Locator Types

| Annotation | Example |
|---|---|
| \`@FindBy(id = "x")\` | By ID |
| \`@FindBy(css = ".btn")\` | By CSS selector |
| \`@FindBy(xpath = "//div")\` | By XPath |
| \`@FindBy(name = "email")\` | By name attribute |
| \`@FindBy(tagName = "h1")\` | By tag |
| \`@FindBy(linkText = "Click")\` | By link text |
| \`@FindBy(partialLinkText = "Click")\` | Partial link text |
| \`@FindBy(className = "btn")\` | By CSS class |

You can combine annotations using \`@FindAll\` or \`@FindBys\`:

\`\`\`java
@FindAll({
    @FindBy(css = ".error"),
    @FindBy(css = ".warning")
})
public SelenideElement issueMessage;
\`\`\`

This matches any element that satisfies either locator.

---

## Lazy Field Initialization

Selenide's \`SelenideElement\` is lazy by default — it stores the locator and resolves on access. Unlike Selenium PageFactory's \`WebElement\` which can become stale, SelenideElement always re-fetches:

\`\`\`java
public class HomePage {
    @FindBy(id = "user-name")
    public SelenideElement userName;
}

HomePage home = page(HomePage.class);
home.userName.shouldHave(text("Alice")); // resolves now
// later, after some action
home.userName.shouldHave(text("Bob")); // re-resolves
\`\`\`

This is the key difference from traditional Selenium PageFactory: SelenideElement avoids the StaleElementReferenceException trap entirely.

---

## ElementsContainer: Reusable Components

For sections like navbars and modals that appear on multiple pages, use \`ElementsContainer\`:

\`\`\`java
import com.codeborne.selenide.ElementsContainer;

public class Navbar extends ElementsContainer {
    @FindBy(css = ".profile-link")
    public SelenideElement profileLink;

    @FindBy(css = ".logout")
    public SelenideElement logoutButton;

    public ProfilePage clickProfile() {
        profileLink.click();
        return page(ProfilePage.class);
    }
}

public class DashboardPage {
    @FindBy(css = ".navbar")
    public Navbar navbar;

    @FindBy(id = "main")
    public SelenideElement main;
}

// Usage:
DashboardPage dash = page(DashboardPage.class);
dash.navbar.clickProfile();
\`\`\`

The Navbar's locators are relative to \`.navbar\`. Inside Navbar, \`profileLink\` means \`.navbar .profile-link\`.

---

## ElementsContainer Lists

For collections of components like rows in a table:

\`\`\`java
public class UserRow extends ElementsContainer {
    @FindBy(css = ".name")
    public SelenideElement name;

    @FindBy(css = ".email")
    public SelenideElement email;

    @FindBy(css = ".edit-btn")
    public SelenideElement editButton;
}

public class UsersTablePage {
    @FindBy(css = "table.users tbody tr")
    public List<UserRow> rows;
}

// Usage:
UsersTablePage users = page(UsersTablePage.class);
users.rows.get(0).name.shouldHave(text("Alice"));
users.rows.get(0).editButton.click();
\`\`\`

Each row is a UserRow instance with its own scoped locators.

---

## Selenide.page() Variants

| Method | Use |
|---|---|
| \`page(MyPage.class)\` | Standard |
| \`page(myInstance)\` | Wire existing instance |
| Selenide.\\$(...).as(MyComponent.class) | Component from an element |

Example with \`as()\`:

\`\`\`java
Navbar navbar = $(".navbar").as(Navbar.class);
\`\`\`

---

## Constructor-Based Initialization (For Parameters)

If your Page Object needs parameters, define a constructor and call PageFactory manually:

\`\`\`java
public class ProductPage {
    @FindBy(css = ".product-name")
    public SelenideElement name;

    private final String productId;

    public ProductPage(String productId) {
        this.productId = productId;
        com.codeborne.selenide.junit5.PageFactory.initElements(this);
    }
}
\`\`\`

For most cases, prefer the parameterless pattern.

---

## Migration from Selenium PageFactory

Old Selenium PageFactory code:

\`\`\`java
public class LoginPage {
    @FindBy(id = "email")
    public WebElement email;

    public LoginPage(WebDriver driver) {
        PageFactory.initElements(driver, this);
    }
}
\`\`\`

Selenide equivalent:

\`\`\`java
public class LoginPage {
    @FindBy(id = "email")
    public SelenideElement email;
    // No constructor needed
}

LoginPage page = Selenide.page(LoginPage.class);
\`\`\`

Changes:
1. \`WebElement\` becomes \`SelenideElement\`
2. Drop the WebDriver-taking constructor
3. Use \`Selenide.page()\` instead of \`PageFactory.initElements\`

---

## Initialization Order

Selenide initializes fields in declaration order. If one field depends on another (rare), define them in the right order:

\`\`\`java
public class FormPage {
    @FindBy(css = "form")
    public SelenideElement form;

    @FindBy(css = "form input[type=email]")
    public SelenideElement email;
}
\`\`\`

In practice this rarely matters because lookups are lazy.

---

## Parameterized Locators

For locators that depend on runtime values, don't use \`@FindBy\`. Use methods:

\`\`\`java
public class UsersPage {
    public SelenideElement userRow(String name) {
        return $$("table.users tr").findBy(text(name));
    }
}

// Usage:
new UsersPage().userRow("Alice").$(".edit-btn").click();
\`\`\`

---

## Best Practices Summary

| Practice | Why |
|---|---|
| Prefer manual \`$\` over @FindBy | Less magic, easier to debug |
| Use ElementsContainer for components | Scoped locators, reusable |
| Make fields \`final\` when manual | Defensive coding |
| Initialize via Selenide.page() | Consistent across team |
| Use SelenideElement, never WebElement | Lazy + retry-aware |
| Don't mix Selenium and Selenide PageFactory | Stick to one |

---

## Anti-Patterns

**Anti-pattern 1: PageFactory.initElements from Selenium.** Use \`Selenide.page()\` instead — it handles SelenideElement correctly.

**Anti-pattern 2: WebDriver-taking constructors.** Selenide manages the WebDriver implicitly; the constructor parameter is unnecessary.

**Anti-pattern 3: Storing element values in constructors.** Lookups happen lazily; don't try to capture state in the constructor.

**Anti-pattern 4: WebElement fields with Selenide locators.** Always use SelenideElement.

---

## Conclusion

Selenide's enhanced Page Factory pattern is a major step up from traditional Selenium PageFactory. Lazy SelenideElement fields, ElementsContainer for components, list-of-components support, and the simple \`Selenide.page()\` method combine to make Page Objects clean and maintainable. For most code, prefer the manual \`$\` pattern; reach for \`@FindBy\` only when you want declarative locator definitions.

For complementary patterns, see our [Selenide Page Object best practices](/blog/selenide-page-object-pattern-best-practices) and [Selenide Condition cheatsheet](/blog/selenide-condition-cheatsheet-2026).

Browse the [QA skills directory](/skills) for related Java browser automation patterns.
`,
};
