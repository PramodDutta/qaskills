import type { BlogPost } from "./index";

export const post: BlogPost = {
  title: "Factory Boy post_generation for Many-to-Many Test Data",
  description:
    "Use Factory Boy post_generation for Django many-to-many test data with explicit related objects, safe defaults, through models, batching, and isolated assertions.",
  date: "2026-07-13",
  category: "Tutorial",
  content: `
# Factory Boy post_generation for Many-to-Many Test Data

A Django \`ManyToManyField\` cannot be populated until its owning model has a primary key. That is why assigning a list in a Factory Boy model declaration fails, and why \`post_generation\` is the right lifecycle hook for attaching existing related objects after creation.

## The save boundary dictates the hook

Factory Boy builds declarations, instantiates the model, saves it under the create strategy, then runs post-generation declarations. At that point Django's many-to-many manager can write rows to the join table.

| Factory phase | Owner has database PK? | Safe many-to-many action |
|---|---:|---|
| Attribute evaluation | No | Prepare related inputs only |
| Model construction | No | Do not call relation manager |
| Initial save under \`create()\` | Yes | Join rows not added yet |
| \`post_generation\` | Yes | Call \`.add()\` or create through rows |
| \`build()\` strategy | No persisted owner | Skip database relation |

This sequence explains the standard guard: return when \`create\` is false. A built Django object has no persistent join table to modify.

## Start with an explicit extracted-value hook

Suppose an article can have many tags:

\`\`\`python
# app/models.py
from django.db import models

class Tag(models.Model):
    name = models.CharField(max_length=80, unique=True)

class Article(models.Model):
    title = models.CharField(max_length=200)
    tags = models.ManyToManyField(Tag, related_name="articles")
\`\`\`

The factory accepts \`tags=[tag_a, tag_b]\` as an extracted post-generation value:

\`\`\`python
# tests/factories.py
import factory
from app.models import Article, Tag

class TagFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Tag

    name = factory.Sequence(lambda n: f"tag-{n}")

class ArticleFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Article

    title = factory.Sequence(lambda n: f"Article {n}")

    @factory.post_generation
    def tags(self, create, extracted, **kwargs):
        if not create or not extracted:
            return
        self.tags.add(*extracted)
\`\`\`

\`extracted\` is the value passed using the declaration name. The related objects are explicit, and omitting \`tags\` creates no hidden rows. That quiet default is usually the safest factory behavior.

## Prove both attachment and absence of shared state

Test the factory itself when its hook carries meaningful behavior. Refresh queries through Django instead of trusting an in-memory manager cache.

\`\`\`python
import pytest
from tests.factories import ArticleFactory, TagFactory

pytestmark = pytest.mark.django_db

def test_article_factory_attaches_supplied_tags():
    security = TagFactory(name="security")
    api = TagFactory(name="api")

    article = ArticleFactory(tags=[security, api])

    assert set(article.tags.values_list("name", flat=True)) == {"security", "api"}

def test_articles_do_not_share_implicit_tag_collections():
    first = ArticleFactory()
    second = ArticleFactory()
    tag = TagFactory()
    first.tags.add(tag)

    assert second.tags.count() == 0
\`\`\`

The second test guards against a mutable default or factory helper that reuses related objects unintentionally. The [Factory Boy test-data guide](/blog/factory-boy-test-data-guide-2026) covers sequences, subfactories, and Django integration around this hook.

## Decide what omission should mean

There are three legitimate defaults, but choose one intentionally.

| Caller input | Conservative factory | Convenience factory | Required-relation factory |
|---|---|---|---|
| No \`tags\` argument | No tags | Create default tag(s) | Raise or create required relation |
| \`tags=[]\` | No tags | No tags | Reject empty input |
| Existing objects | Attach them | Attach them | Attach and validate count |

Distinguishing omitted from an empty iterable can matter. The basic decorator passes \`extracted=None\` when omitted, while an empty list is falsey. If the factory must distinguish them, check \`extracted is None\` rather than \`not extracted\`.

A convenience variant can create defaults only on omission:

\`\`\`python
    @factory.post_generation
    def tags(self, create, extracted, **kwargs):
        if not create:
            return
        if extracted is None:
            self.tags.add(TagFactory())
        else:
            self.tags.add(*extracted)
\`\`\`

This behavior is concise for tests that nearly always need a tag, but it adds database work and may hide irrelevant setup. Prefer traits for optional scenarios.

## Use traits to name relationship shapes

Traits turn a vague boolean into a domain scenario. A \`published\` article might need editorial categories, while the default draft needs none.

\`\`\`python
class ArticleFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Article

    title = factory.Sequence(lambda n: f"Article {n}")

    class Params:
        categorized = factory.Trait(
            tags=factory.RelatedFactoryList(
                TagFactory,
                size=2,
            ),
        )

    @factory.post_generation
    def tags(self, create, extracted, **kwargs):
        if create and extracted:
            self.tags.add(*extracted)
\`\`\`

Before adopting this exact combination, check the installed Factory Boy version and whether \`RelatedFactoryList\` output is the desired extracted value in your declaration. A simpler and highly readable approach is a factory helper that creates tags explicitly, then calls \`ArticleFactory(tags=tags)\`.

## Through models require rows, not manager add alone

When the relationship has metadata, model it explicitly:

\`\`\`python
class Team(models.Model):
    name = models.CharField(max_length=100)
    members = models.ManyToManyField("auth.User", through="Membership")

class Membership(models.Model):
    team = models.ForeignKey(Team, on_delete=models.CASCADE)
    user = models.ForeignKey("auth.User", on_delete=models.CASCADE)
    role = models.CharField(max_length=30)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["team", "user"], name="unique_team_member")
        ]
\`\`\`

Pass structured membership specifications and create through rows:

\`\`\`python
class TeamFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Team

    name = factory.Sequence(lambda n: f"Team {n}")

    @factory.post_generation
    def memberships(self, create, extracted, **kwargs):
        if not create or extracted is None:
            return
        for membership in extracted:
            Membership.objects.create(
                team=self,
                user=membership["user"],
                role=membership.get("role", "member"),
            )
\`\`\`

Usage remains explicit:

\`\`\`python
owner = UserFactory()
reviewer = UserFactory()
team = TeamFactory(
    memberships=[
        {"user": owner, "role": "owner"},
        {"user": reviewer, "role": "reviewer"},
    ]
)
assert team.membership_set.get(user=owner).role == "owner"
\`\`\`

Do not pass unsaved users. Database constraints should remain enabled so duplicate membership and invalid role tests reflect production.

## RelatedFactory addresses the reverse direction

\`post_generation\` is natural when the owner factory receives existing related objects. \`RelatedFactory\` creates another factory after the base object and passes the base object into it, which is well suited to reverse foreign keys or through-model rows.

| Need | Factory Boy mechanism | Example |
|---|---|---|
| Attach existing tags to article | \`post_generation\` | \`ArticleFactory(tags=[tag])\` |
| Create one profile for user | \`RelatedFactory\` | Profile receives created user |
| Create several reverse children | \`RelatedFactoryList\` | Order with line items |
| Supply one forward dependency | \`SubFactory\` | Article author |
| Store metadata on M2M link | Through-model factory or hook | Membership role |

Choose based on ownership and caller readability, not an attempt to use one declaration everywhere.

## Avoid mutable defaults in helper APIs

Never write \`def article_with_tags(tags=[])\`. That list is shared across calls. Use \`None\` and allocate within the function:

\`\`\`python
def article_with_tags(*, tag_names=None, **article_fields):
    names = ["general"] if tag_names is None else list(tag_names)
    tags = [TagFactory(name=name) for name in names]
    return ArticleFactory(tags=tags, **article_fields)
\`\`\`

Copy iterables if the helper might mutate them. Factory-generated model instances are also shared if declared once at module import, so create them inside fixtures or factory calls.

The broader [test-data management strategies article](/blog/test-data-management-strategies) explains when factories, builders, snapshots, and seeded reference data fit.

## Respect database uniqueness and reference data

For unique tags, a plain factory creates a fresh name by sequence. If tests need canonical names such as “security,” repeatedly calling \`TagFactory(name='security')\` can violate the constraint. Use \`django_get_or_create = ('name',)\` only when shared reference identity is intentional.

Shared reference rows are not shared mutable collections, but they can still leak changes. A test that renames a canonical tag changes it for every article in that transaction. Prefer immutable reference semantics or isolated factories for mutation tests.

| Data type | Suggested approach |
|---|---|
| Unique disposable tag | Sequence-generated \`TagFactory\` |
| Immutable canonical category | Seed or intentional get-or-create |
| Relationship mutation target | Fresh row per test |
| Large taxonomy | Small fixture dataset, attach selected rows |

## Keep query cost visible

Post-generation hooks can hide N+1 inserts. \`self.tags.add(*objects)\` is generally better than calling \`.add()\` in a loop. A through model with many rows can use \`bulk_create\` when signals, custom save logic, and generated primary keys are not required.

Do not optimize tiny unit fixtures prematurely, but measure factories used to create hundreds of objects. Factory Boy's \`create_batch\` invokes post-generation per owner, so a batch of 100 articles with three new tags each creates at least 300 related rows plus join rows.

If the test only needs query results, seed the minimal graph. Rich “realistic” defaults increase runtime and make failures harder to interpret.

## Signals and duplicate saves can surprise hooks

Django factories may interact with signals that create relations automatically. A post-generation hook adding the same relation can then duplicate work or violate through-model uniqueness. Mute signals in targeted factories when the signal is not under test, or assert the combined behavior intentionally.

Older Factory Boy patterns sometimes performed an extra save after post-generation declarations. Current behavior and deprecations depend on version and factory options. Do not add a second \`self.save()\` reflexively. A standard many-to-many \`.add()\` writes the join table without needing to resave the owner.

## Diagnose common failures

| Failure | Cause | Fix |
|---|---|---|
| “needs a value for field id” | Relation manager used during build or before save | Guard on \`create\` and use post-generation |
| Extracted list is \`None\` | Caller omitted the named declaration | Decide on empty or default behavior |
| Related rows appear in other test | Module-level objects or shared reference mutation | Create fresh objects and use DB isolation |
| Through metadata missing | Direct M2M attachment ignored domain fields | Create through-model rows |
| Batch is unexpectedly slow | Hook creates relations one at a time | Pass objects to one add or consider safe bulk creation |
| Hook never executes as expected | Argument name differs from declaration | Call \`Factory(declaration_name=value)\` |

Inspect SQL queries and the through table when debugging. Looking only at \`article.tags.all()\` can hide which metadata or duplicate row was written.

## A maintainable relationship-factory policy

Keep the default factory graph minimal. Accept existing objects through extracted values. Name richer graphs with traits or helpers. Put relationship metadata in the through model, respect the build strategy, and cover factory behavior with a few direct tests. Application tests should then assert domain behavior, not repeatedly verify that Factory Boy attached a tag.

## Exercise relationship changes, not only initial creation

Factories establish initial state, while many application defects occur during replacement and removal. Create an article with two tags, call the service that replaces them, and query the join table afterward. Assert removed links disappear, retained tags are not duplicated, and unrelated articles keep their links. This is an application test that uses the factory, not another test of \`post_generation\`.

Ordering requires an explicit through model with a position field because a normal many-to-many relation has no guaranteed order. The hook can enumerate extracted specifications and create positions, but tests should query using the model's defined ordering. Never infer insertion order from an un-ordered join-table query.

Soft-deleted related objects need a policy. A custom manager may hide them from \`article.tags.all()\` while the join rows still exist. Factories that attach a soft-deleted tag can exercise restoration or filtering, but name that scenario explicitly. A default factory should generally create active relations.

Transactions affect visibility. pytest-django's normal database fixture wraps a test for rollback, while code running in another thread or process may need a transaction-capable fixture to observe committed data. If a relationship test starts a live server, make sure the data lifecycle matches that server's connection. A correct post-generation hook can appear broken when the consumer cannot see an uncommitted transaction.

For symmetrical self-relations such as friends, clarify whether adding A to B automatically creates the reverse relationship. Django's \`symmetrical\` option and through-model design control that behavior. A hook named \`friends\` should not manually add reverse links when Django already supplies them.

Generic relations are not many-to-many managers and require different factories. Likewise, a reverse foreign-key collection may look many-to-many in domain language but is populated with child rows. Pick \`RelatedFactory\` or explicit child creation based on the actual Django model, not the UI label.

Validate caller errors early when helpful. If the hook expects model instances but receives dictionaries, a clear \`TypeError\` can be more useful than a later manager error. Do not overbuild a schema for a test helper, but fail close to misuse. Through-model specifications especially benefit from a small typed data class or named structure.

Database routers and multiple databases add another parameter. Factory Boy's Django factory metadata can select a database, and all related instances must be compatible with the router. A relation between objects created in different databases is normally invalid. Integration tests for routing should state the database alias and avoid hidden defaults.

Finally, expose expensive graph creation in names. \`TeamFactory(with_twenty_members=True)\` or a dedicated scenario helper tells reviewers why many rows exist. A silent default that creates users, permissions, groups, and audit records slows every test and increases cleanup complexity. Minimal factories make many-to-many behavior easier to see.

Async Django tests still cross the synchronous ORM unless the project supplies an async-safe wrapper. Do not call a normal factory directly in an async context and blame the hook for Django's safety error. Create data before the async assertion or use the established sync-to-async boundary.

Custom related managers may hide soft-deleted rows. Assert the through table when testing attachment mechanics and the public manager when testing application visibility. Those are different contracts.

Bulk creation can bypass model \`save()\` behavior and signals. An optimization that reduces queries may therefore suppress domain events. Use it only where callbacks are irrelevant or invoked explicitly through a service.

Factory inheritance complicates hooks. A subclass that declares another \`tags\` hook changes inherited behavior, so prefer traits or helper composition when variants merely supply different relations. Deep inheritance obscures which rows are created.

For large graphs, assert membership and cardinality. Set equality hides duplicates when a through model allows them, while count alone misses wrong users. Query related identifiers, raw through-row count, and important metadata constraints.

Passing a QuerySet as the extracted value is lazy. If the hook mutates related data before iteration, the eventual members can differ from what the caller saw. Materialize it with \`list()\` at the boundary when stable membership is expected, and document the extra query.

Post-generation keyword arguments can configure a declaration through names such as \`memberships__role\`, depending on how the hook interprets \`kwargs\`. Avoid inventing a mini-language without tests. Explicit structured specifications are easier to type, validate, and review for through models.

Application cleanup should delete owners and let declared database cascades handle join rows. Tests that manually clear every relation can hide an incorrect \`on_delete\` design. Add one focused deletion test to prove the through-table lifecycle, then rely on transaction rollback for normal factory isolation.

When factories are exposed as shared test utilities, treat their call signatures as internal APIs. Changing omission from “no tags” to “one default tag” can alter hundreds of tests without obvious failures. Version the behavior through a new trait or helper and migrate callers deliberately.

## Frequently Asked Questions

### Why cannot I assign a list directly to a Django ManyToManyField in the factory?

Django requires the owner to be saved before its join-table manager can add rows. \`post_generation\` runs after that save under the create strategy.

### What is the extracted argument in a post_generation method?

It is the value supplied under the declaration's name, such as \`ArticleFactory(tags=[tag])\`. When the caller omits that argument, it is normally \`None\`.

### Should the hook create default related objects?

Only if that is a deliberate domain default. Empty defaults keep fixtures smaller and clearer; traits or helpers can name scenarios that need a relation graph.

### How should I handle extra fields on the relationship?

Define a Django through model and create its rows, either in the hook or with a dedicated through-model factory. Assert fields such as role or ordering on those rows.

### Does self.tags.add require another self.save call?

No. The many-to-many manager writes to the join table directly. Avoid extra saves unless another documented model behavior specifically requires one.
`,
};
