import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Serenity Screenplay Pattern Guide',
  description:
    'Serenity Screenplay pattern guide for maintainable BDD: model actors, abilities, tasks, questions, reports, and step glue without brittle tests.',
  date: '2026-07-10',
  category: 'BDD',
  content: `# Serenity Screenplay Pattern Guide

A failing checkout scenario reads differently when the report says that Alice tried to pay with an expired card, asked for the displayed error, and saw the decline reason. That is the promise of Serenity Screenplay: test code organized around actors and intentions rather than page objects stuffed with imperative clicks. The pattern is especially useful when BDD scenarios have become readable at the feature-file level but chaotic underneath.

Serenity does not remove the need for good locators, disciplined assertions, or stable test data. It gives you a vocabulary for placing those concerns. Actors perform tasks. Actors answer questions. Abilities describe what an actor can use, such as browsing the web or calling an API. When that model is applied consistently, reports become closer to executable narratives and less like stack traces with screenshots attached. For a broader Serenity introduction, read [Serenity BDD testing guide](/blog/serenity-bdd-testing-guide). For framework selection context, compare it with other approaches in [BDD frameworks comparison 2026](/blog/bdd-frameworks-comparison-2026).

## Screenplay vocabulary in Serenity, with boundaries that matter

The Screenplay pattern is simple on paper. The hard part is keeping responsibilities from sliding back into procedural code. A task should describe an action at the level a stakeholder would recognize. A question should return information the actor can observe. An ability should wire the actor to an interface, such as a browser session, API client, or domain service. Interactions are lower-level building blocks used inside tasks.

If a class both clicks elements and decides business rules, it is doing too much. If a step definition knows CSS selectors, the Screenplay layer is being bypassed. If a question mutates state, reports become misleading because an assertion changed the system while pretending to observe it.

| Screenplay element | Serenity role | Healthy example | Warning sign |
|---|---|---|---|
| Actor | Persona executing the scenario | \`theActorCalled("Priya")\` | Static utility methods replacing actor memory |
| Ability | Capability attached to actor | Browse the Web, Call an API | Browser setup hidden in step definitions |
| Task | Meaningful action | Add a product to the basket | A task named ClickSubmitButton |
| Question | Observable result | The basket total shown on screen | A question that creates test data |
| Interaction | Low-level operation | Click, Enter, SelectFromOptions | Business assertions inside interactions |

## Modeling actors as test participants, not global state

Serenity actors carry abilities and memory. That is useful only when the actor represents a participant in the scenario. Do not create one global actor for every test because it is convenient. If a scenario has a shopper and an approver, use two actors. If a scenario is only an API integration check, the actor can still exist, but its ability may be API-focused rather than browser-focused.

The actor model is also a guard against hidden coupling. When data is remembered by the actor, the test tells you who knows what. That is better than stashing values in static fields or thread locals, which become hazardous under parallel execution.

Here is a minimal JUnit 5 Serenity Screenplay web test using the real Screenplay APIs from Serenity. The task and question names are intentionally business-readable.

\`\`\`java
import net.serenitybdd.junit5.SerenityJUnit5Extension;
import net.serenitybdd.screenplay.Actor;
import net.serenitybdd.screenplay.abilities.BrowseTheWeb;
import net.serenitybdd.screenplay.actions.Open;
import net.serenitybdd.screenplay.actions.Enter;
import net.serenitybdd.screenplay.actions.Click;
import net.serenitybdd.screenplay.questions.Text;
import net.serenitybdd.screenplay.targets.Target;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.openqa.selenium.By;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.chrome.ChromeDriver;

import static net.serenitybdd.screenplay.GivenWhenThen.seeThat;
import static org.hamcrest.Matchers.containsString;

@ExtendWith(SerenityJUnit5Extension.class)
class PasswordResetStory {
    private final WebDriver browser = new ChromeDriver();

    private static final Target EMAIL =
        Target.the("email field").located(By.id("email"));
    private static final Target SUBMIT =
        Target.the("reset password button").located(By.cssSelector("button[type='submit']"));
    private static final Target NOTICE =
        Target.the("confirmation notice").located(By.cssSelector("[role='status']"));

    @Test
    void customer_requests_a_reset_link() {
        Actor maya = Actor.named("Maya").whoCan(BrowseTheWeb.with(browser));

        maya.attemptsTo(
            Open.url("https://example.test/forgot-password"),
            Enter.theValue("maya@example.test").into(EMAIL),
            Click.on(SUBMIT)
        );

        maya.should(
            seeThat(Text.of(NOTICE), containsString("Check your email"))
        );
    }
}
\`\`\`

In production code, the browser is normally managed by Serenity configuration rather than manually creating a ChromeDriver in the test. The example keeps the wiring visible so the roles are clear: the actor has the browser ability, performs actions, and asks a question about the notice.

## Turning repeated intent into Tasks

The first refactor in a Screenplay suite is usually extracting tasks. Do it when several scenarios repeat the same meaningful activity, not merely because three lines of code look similar. A good task name reads like a phrase in the report: request a password reset, search for a product, approve a transfer, revoke an API token.

Tasks should accept domain data. Avoid tasks that know too much about fixture construction. If the task needs an email address, pass an email address. If the test needs a registered customer, create that customer in a fixture layer and let the actor use the resulting identity.

\`\`\`java
import net.serenitybdd.screenplay.Performable;
import net.serenitybdd.screenplay.Task;
import net.serenitybdd.screenplay.actions.Click;
import net.serenitybdd.screenplay.actions.Enter;
import net.serenitybdd.screenplay.targets.Target;
import org.openqa.selenium.By;

public class RequestPasswordReset {
    private static final Target EMAIL =
        Target.the("email field").located(By.id("email"));
    private static final Target SUBMIT =
        Target.the("reset password button").located(By.cssSelector("button[type='submit']"));

    public static Performable forEmail(String email) {
        return Task.where("{0} requests a password reset for " + email,
            Enter.theValue(email).into(EMAIL),
            Click.on(SUBMIT)
        );
    }
}
\`\`\`

The \`Task.where\` description appears in Serenity reports. That means sloppy wording becomes visible. Treat it as test documentation, not a throwaway string.

## Questions should observe, not orchestrate

Questions are where many Screenplay suites become muddy. A question should ask the system for a fact: the visible heading, the account balance, the status returned by an API, the text in an audit row. It should not set up data, retry a workflow, or click a hidden control to make the assertion easier.

For UI tests, Serenity provides questions such as \`Text.of(target)\`, \`Value.of(target)\`, and other Screenplay WebDriver questions depending on the module in use. You can also create custom questions when the domain needs a better phrase. Keep them side-effect free.

For API checks, an actor can have an ability to call an API, then questions can read the latest response or query a known endpoint. The same discipline applies: a question should not perform the workflow under test. It should inspect the result of a workflow already performed.

## Cucumber step definitions stay thin

Serenity and Cucumber work well together when step definitions translate Gherkin into Screenplay calls. The step should not know locators. It should not contain WebDriver waits. It should not decide how a transfer is approved. That belongs in tasks and questions.

| Gherkin phrase | Step definition should call | Code that should not be in the step |
|---|---|---|
| When Maya requests a password reset | \`maya.attemptsTo(RequestPasswordReset.forEmail(email))\` | \`driver.findElement(By.id("email"))\` |
| Then the reset notice is shown | \`maya.should(seeThat(TheResetNotice.text(), ...))\` | Raw CSS selectors and sleeps |
| When an approver accepts the payment | \`approver.attemptsTo(ApprovePayment.called(reference))\` | SQL updates that skip the workflow |
| Then the audit entry is recorded | \`auditor.should(seeThat(AuditTrail.entryFor(reference), ...))\` | Assertions spread across multiple glue classes |

Thin steps make feature files safer to edit. When wording changes, the step still maps to stable tasks. When UI mechanics change, the task changes without rewriting the scenario language.

## Screenplay with APIs and non-browser workflows

Screenplay is not only a browser pattern. Serenity has modules for REST interactions, and teams often use actors to represent service clients. This works well when a test crosses channels: one actor creates data through an API, another actor verifies it in the UI, and a third actor checks an audit endpoint. The actor names make the flow more understandable in reports.

Do not force every API test through a dramatic persona. For narrow contract tests, a plain API test may be clearer. Screenplay earns its place when the test benefits from explicit participants, remembered facts, and report narration.

The key is naming. \`BackOfficeUser\` is less helpful than \`Nina the operations analyst\` when a scenario genuinely models a business role. For low-level service checks, \`Inventory API client\` may be honest enough.

## Waiting, synchronization, and target design

Screenplay does not magically fix flaky locators. Targets still need stable attributes. Waits still need to match application behavior. The improvement is that waits can be expressed inside tasks or interactions where they belong, instead of being pasted into every step.

Use targets with names a report reader can understand. \`Target.the("checkout total")\` is better than \`Target.the("div:nth-child(3)")\`. The locator can be technical, but the target name is part of the test language.

Synchronization should follow the user-visible condition. After submitting a transfer, wait for the confirmation reference or the status row, not for an arbitrary timeout. If the application emits asynchronous events, consider asking an API or audit log question rather than stretching browser waits beyond reason.

## Reporting as a design feedback loop

Serenity reports are not just after-the-fact evidence. They show whether your Screenplay model is understandable. If the report reads as "Click, Click, Enter, Click, Text", the suite is still interaction-heavy. If it reads as "Maya requests a password reset" and "Maya should see the confirmation notice", the model is doing its job.

Review reports during code review. They expose poor task names, missing actor intent, and assertions that are too technical. A green test with a confusing report is still expensive to maintain because the next failure will require archaeology.

## When Screenplay is the wrong abstraction

Screenplay has overhead. A two-test utility package does not need actors, abilities, and tasks. A microservice contract suite may be more direct with Pact or REST Assured. A component test may be clearer with Testing Library and plain assertions. Use Screenplay when scenarios involve workflows, roles, reportable behavior, and repeated domain actions.

The pattern is also easy to over-abstract. If every click becomes its own task, the report becomes noisy. If every page section becomes a question class, navigation becomes indirect. Senior SDETs should push for the smallest Screenplay model that makes the behavior clearer.

## Package structure for a growing Screenplay suite

Screenplay code becomes maintainable when readers can predict where behavior lives. A common structure is to group by domain capability rather than by Selenium mechanics. For example, \`tasks.checkout\`, \`questions.checkout\`, and \`ui.checkout\` are usually easier to navigate than one large \`pages\` package containing every locator in the product.

Targets can live near the tasks that use them when the area is small. Once several tasks and questions share the same screen elements, move targets into a named UI map. Keep that UI map descriptive and boring. It should define elements, not behavior. A class called \`CheckoutPage\` that exposes \`PLACE_ORDER\` and \`TOTAL\` targets is fine. A class that also approves payment, creates accounts, and asserts tax rules has drifted back into a Page Object.

Tasks should be organized by user intention. \`ApplyCoupon\`, \`ChooseShippingMethod\`, and \`PlaceOrder\` tell the reader what the actor is trying to do. Questions should be organized by observable outcomes. \`TheDisplayedTotal\`, \`TheOrderReference\`, and \`ThePaymentError\` are better than utility names such as \`GetText\`.

This structure also helps code review. A reviewer can see whether a change modifies locators, actor workflow, or assertions. When those concerns are mixed in one file, review becomes slow and misses the exact coupling Screenplay was chosen to avoid.

## Data setup without corrupting the story

BDD scenarios often need data that would be tedious to create through the UI. Serenity Screenplay does not require every fixture to be created by an actor clicking through screens. It does require honesty about what is part of the story and what is test setup.

If a customer must already exist before a password reset scenario, create that customer in a fixture or API helper before the actor starts the workflow. Do not hide the setup inside the task named \`RequestPasswordReset\`, because the report will imply the actor created state that was actually injected. If the scenario is about onboarding, then the actor should perform onboarding. If the scenario is about reset behavior, setup can be technical.

Actor memory is useful for values discovered during the story, such as an order reference shown after checkout. It is less useful for global fixture state that every scenario needs. Overusing memory makes tests feel magical because values appear without a visible source.

| Data need | Better placement | Why it helps reports |
|---|---|---|
| Existing registered user | Before scenario fixture | The story starts at the intended behavior |
| Order reference generated on screen | Actor remembers after task | Later questions can name what the actor observed |
| Provider sandbox token | Test infrastructure configuration | Sensitive setup stays out of narrative steps |
| Product catalog seed | Environment fixture | UI tasks stay focused on customer action |

## Reviewing Screenplay pull requests

A Screenplay PR should be reviewed at two levels. First, read the generated report or at least the task names in order. Does it tell a coherent story? Second, inspect the implementation for misplaced responsibilities. A task that directly asserts a final state is suspicious. A question that clicks a tab before reading text is suspicious. A Cucumber step that imports Selenium \`By\` is a clear boundary violation.

Ask whether a future product change would require editing the feature file, step definition, task, question, or target. The ideal answer depends on the change. A wording change in the UI might touch only a target or question. A new business rule might touch a task and assertion. If every change touches every layer, the abstraction is not paying rent.

Reports should be part of review culture. Serenity makes narrative evidence visible, and ignoring that evidence wastes one of the framework's strongest features.

## Frequently Asked Questions

### Is Screenplay a replacement for Page Objects in Serenity?

It replaces many Page Object responsibilities, but not the need for locator organization. Targets and interactions still need structure. The difference is that business workflows move into tasks and observations move into questions, instead of living as methods on page classes.

### How large should a Serenity Task be?

A task should represent one meaningful user intention. "Request password reset" is a task. "Click the blue button" is usually an interaction. If a task hides multiple business outcomes, split it before the report becomes vague.

### Can one actor use both UI and API abilities?

Yes, but use that deliberately. It is valid when the same participant really uses both channels, such as an admin UI plus an API token. If the API is only test setup, keep that outside the actor workflow or use a separate technical actor.

### Why do my Screenplay reports still look procedural?

Most likely the suite is calling low-level interactions directly from steps or tests. Extract repeated intent into named tasks and use questions with domain names. The report usually improves immediately when the model is honest.

### Should Cucumber steps contain assertions?

They can call assertions, but they should not build them from raw Selenium or REST calls. Let the step delegate to \`actor.should(seeThat(...))\` with a question that describes the observed result.
`,
};
