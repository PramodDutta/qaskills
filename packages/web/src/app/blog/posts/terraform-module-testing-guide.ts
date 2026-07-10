import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Terraform Module Testing Guide',
  description:
    'Terraform module testing guide for validating plans, module contracts, and policy checks before infrastructure changes reach production environments.',
  date: '2026-07-10',
  category: 'Guide',
  content: `
# Terraform Module Testing Guide

The module plan says it will replace a database subnet group because one input default changed. The pull request title says refactor variable names. The reviewer sees green unit tests in the application repo and no signal about the infrastructure blast radius. That gap is exactly where Terraform module testing belongs.

Testing Terraform modules means checking the module contract before it is used by live environments. The contract includes variables, outputs, resource shape, provider behavior, plan safety, policy constraints, and upgrade compatibility. It is not enough to run terraform fmt and hope plan review catches everything.

This guide focuses on Terraform's native test workflow, plan assertions, static checks, and policy gates for reusable modules. For larger delivery strategy, see [the DevOps testing strategy guide](/blog/devops-testing-strategy-guide). For container-heavy environments that feed infrastructure tests, [the Docker testing strategies guide](/blog/docker-testing-strategies-guide) gives the adjacent runtime layer.

## The module contract is more than variables

A Terraform module presents a public interface to environment code. Variables and outputs are the visible part, but behavior also includes naming, tagging, count and for_each logic, lifecycle rules, provider assumptions, and whether a plan can destroy existing resources.

| Contract area | Example failure | Test approach |
|---|---|---|
| Variable validation | Empty environment name creates invalid resource names | terraform validate and native test assertions |
| Resource topology | Optional alarm creates duplicate resources | Plan assertion with specific inputs |
| Outputs | Module stops exposing subnet ids used downstream | Output assertions |
| Tags and naming | Cost tags disappear from one resource type | Policy check on plan JSON |
| Upgrade behavior | Minor version causes replacement | Fixture plan against previous state |

Treat the module as a library. A change to variable defaults can be a breaking change. A renamed output can break consumers even if apply succeeds in the module's own fixture.

## Native Terraform tests for module behavior

Terraform test files use the .tftest.hcl extension and run blocks. They let you execute plan or apply for a module fixture and assert conditions. Plan mode is the default choice for pull requests because it is fast and does not create real infrastructure. Apply mode is useful for modules that need provider-calculated values or real cloud validation, but it requires isolated test accounts and cleanup discipline.

Here is a module test for an S3 bucket module that validates naming and required tags during plan.

\`\`\`hcl
# tests/basic.tftest.hcl
run "plans_bucket_with_required_tags" {
  command = plan

  variables {
    name        = "qa-artifacts"
    environment = "test"
    tags = {
      Owner      = "qa-platform"
      CostCenter = "eng-quality"
    }
  }

  assert {
    condition     = aws_s3_bucket.this.bucket == "test-qa-artifacts"
    error_message = "Bucket name must include the environment prefix."
  }

  assert {
    condition     = aws_s3_bucket.this.tags["Owner"] == "qa-platform"
    error_message = "Owner tag must be propagated to the bucket."
  }
}
\`\`\`

That test checks module behavior without needing to apply. It also makes the naming contract executable. A reviewer no longer has to infer the rule from locals.tf.

## Testing validation failures

Negative module tests are important. If a module requires an environment, restricts CIDR ranges, or disallows public access, test the invalid input path. A module that accepts bad inputs and fails later in a provider call gives consumers a worse experience.

\`\`\`hcl
# tests/validation.tftest.hcl
run "rejects_public_database_subnet" {
  command = plan

  variables {
    name              = "orders"
    environment       = "prod"
    database_subnets  = ["0.0.0.0/0"]
    deletion_protection = true
  }

  expect_failures = [
    var.database_subnets,
  ]
}
\`\`\`

This uses Terraform's test expectation for validation failures. The exact validation rule lives in the module variable definition, but the test documents the consumer-facing behavior: public database subnet input is rejected at plan time.

## Plan JSON checks for cross-resource policy

Some rules are awkward to express in native tests because they span many resource types. For example, every taggable resource must have Owner and CostCenter, public ingress must be limited, and database deletion protection must be enabled in production. For those, generate a plan file and inspect the JSON with a policy tool or a small script.

Terraform can produce machine-readable plan JSON with terraform show -json after creating a plan. In CI, run the plan against a fixture, export JSON, then evaluate it.

\`\`\`rego
# policy/tags.rego
package terraform.tags

deny[msg] {
  resource := input.resource_changes[_]
  resource.mode == "managed"
  after := resource.change.after
  tags := after.tags
  not tags.Owner
  msg := sprintf("%s is missing Owner tag", [resource.address])
}

deny[msg] {
  resource := input.resource_changes[_]
  resource.mode == "managed"
  after := resource.change.after
  tags := after.tags
  not tags.CostCenter
  msg := sprintf("%s is missing CostCenter tag", [resource.address])
}
\`\`\`

This Rego policy is intentionally narrow. It checks tag presence in plan JSON. A production policy set would handle resources without tags, provider-specific tag locations, and module exceptions. Start with rules that have clear ownership and few exceptions.

## Fixture modules for realistic inputs

Do not test only the module root with one happy input. Create fixture directories that represent how consumers use the module: minimal, production, multi-region, feature enabled, feature disabled, migration from previous version. Each fixture should have a clear purpose.

| Fixture | Purpose | Common assertions |
|---|---|---|
| minimal | Lowest valid input set | Defaults, required resources, basic outputs |
| production | Hardened configuration | Encryption, deletion protection, alarms |
| feature-enabled | Optional path works | Extra resources and outputs |
| feature-disabled | Optional path does not leak resources | Count and output null behavior |
| upgrade | Previous state compatibility | No replacement for stable resources |

Keep fixtures small. A fixture that creates half your platform will be slow, expensive, and hard to review. Module tests should isolate the module contract, not recreate every environment.

## Provider mocking and local speed

Terraform's test workflow can use provider behavior in plan mode without applying resources, but some values remain unknown until apply. Design assertions around values known during plan when possible: names, tags, counts, references, and variable validation. For provider-computed fields, either use apply in an isolated test project or assert that the output is known after apply in a nightly job.

Local speed matters. Developers should be able to run formatting, validation, and plan tests before pushing. Reserve cloud apply tests for a smaller set of critical modules or scheduled jobs. If every pull request needs to create real cloud resources, developers will avoid running tests locally.

## Testing destructive change risk

Reusable modules need upgrade tests. A harmless refactor can force replacement if resource addresses change, for_each keys change, or a provider argument becomes ForceNew. To catch this, keep a fixture with a prior state or run a plan against a known deployed test workspace before releasing the module.

The signal you want is not zero changes forever. Some upgrades intentionally replace resources. The signal is visibility: replacements must be deliberate, documented, and reviewed by someone who understands the environment impact.

You can parse plan JSON for actions that include delete or replace. In policy, block destructive actions for production fixtures unless an explicit override file is present. For lower environments, warn instead of block if the module is still under active design.

## Static checks that complement tests

Terraform fmt and validate are table stakes. Add tflint for provider-specific issues and naming conventions. Add tfsec, Checkov, or similar scanners if your organization uses them, but tune the rules. A scanner with hundreds of unactionable warnings trains reviewers to ignore infrastructure findings.

| Check | Catches | Does not catch |
|---|---|---|
| terraform fmt | Style drift | Runtime behavior |
| terraform validate | Syntax and basic configuration validity | Cross-resource policy |
| terraform test | Module assertions and validation paths | Every organization rule |
| tflint | Provider and convention issues | Full plan blast radius |
| Plan policy | Destructive actions and compliance | Intent behind approved exceptions |

The best pipelines combine these checks with clear failure messages. A developer should know whether to edit HCL, update a fixture, request an exception, or document a breaking change.

## CI layout for module repositories

A practical CI path for modules:

1. Run terraform fmt -check.
2. Run terraform init without backend for test fixtures.
3. Run terraform validate.
4. Run terraform test for native module tests.
5. Generate plan JSON for important fixtures.
6. Run policy checks against plan JSON.
7. Run apply tests only for selected modules or protected branches.

Cache plugins carefully but do not let caches hide provider upgrades. Pin provider versions in required_providers and update intentionally. When provider versions change, run the module test suite as if it were a code dependency upgrade.

## Variable validation as executable documentation

Terraform variable validation blocks are the first line of defense for module consumers. They should reject invalid shapes before a provider returns a vague API error. Tests should cover those validation rules because they are part of the module's user experience.

Good validation tests cover boundary values, not just obviously bad values. If a retention period must be between 7 and 365 days, test 7, 365, 6, and 366. If an environment must be dev, test, stage, or prod, test case sensitivity and unexpected values. If a CIDR list must not include public ranges, include a realistic private subnet and an invalid public range.

Validation messages matter. A consumer should know how to fix the input. Prefer messages such as environment must be one of dev, test, stage, prod over invalid environment. Native tests that expect failures prove the rule fires, but a code review should still inspect the message. For high-use modules, add a lightweight test around the variable block or documentation examples so error guidance stays accurate.

## Output contracts for downstream modules

Outputs are often treated as convenience, but downstream modules and environment stacks depend on them. Removing or renaming an output is a breaking change. Changing an output from a list to a map is a breaking change. Changing null behavior can be a breaking change for consumers that pass the value into another module.

Test important outputs in native Terraform tests. For a VPC module, assert that subnet ids output contains the expected number of entries for the fixture. For an IAM role module, assert the role name and ARN output are present after apply in an isolated test if the ARN is provider-computed. For a feature-disabled fixture, assert whether the output is null, empty list, or omitted according to the documented contract.

Keep output names boring and stable. If you need a new shape, add a new output and deprecate the old one before removal. Contract tests should cover both during the migration window.

## Testing modules with count and for_each

Conditional resources are a frequent source of module bugs. A feature flag changes count from 0 to 1, but an output still indexes [0]. A for_each key changes from name to id and Terraform plans replacement. A null input flows into a dynamic block and produces invalid provider configuration.

Create paired fixtures for enabled and disabled states. In the disabled fixture, assert that optional resources are absent and outputs have the documented empty behavior. In the enabled fixture, assert resource count, key names, and dependent outputs. When for_each keys are part of resource identity, treat key changes as breaking unless you have a state migration plan.

Plan JSON is useful here because it exposes addresses. A policy or script can check that aws_cloudwatch_metric_alarm.this["latency"] still uses the expected key rather than an index or a generated label. Stable addresses reduce upgrade pain.

## State migration tests

When a module refactor changes resource addresses, moved blocks can preserve state. Test them. A moved block that looks correct in code can still miss one resource variant from a feature fixture. Without a migration test, consumers discover the mistake when Terraform proposes destroy and create.

Use a controlled fixture that represents the old address shape. Initialize state with the old module version or a small state fixture in a sandbox, upgrade to the candidate module, and run plan. The expected result should avoid replacement for resources that are supposed to be preserved. This can live in a slower release workflow if it is too heavy for every pull request.

Document moved blocks in release notes. The test proves the technical migration works for covered fixtures, but consumers still need to know which versions are safe to upgrade from.

## Apply tests and cleanup discipline

Apply tests are valuable for modules that interact with real cloud APIs: IAM policies, networking, DNS, managed databases, and anything where provider validation is incomplete at plan time. They are also expensive and risky if cleanup is weak.

Run apply tests in isolated accounts, projects, or subscriptions with strict naming prefixes and TTL cleanup. Use unique names per run. Always run destroy in a finally-style cleanup step in CI. Add a scheduled janitor for resources with the test prefix because CI can be canceled between apply and destroy.

Limit apply tests to behaviors that plan cannot prove. Do not create a real database just to check tag merging if plan already shows tags. Do create a real IAM role if the cloud provider accepts the policy at plan time but rejects it at apply due to service-specific constraints.

## Documentation examples as tests

Module READMEs often contain examples that drift. Treat examples as fixtures when possible. Copy the README example into a test fixture or generate the README snippet from a tested fixture. This prevents the common failure where the module works but the documented quickstart does not.

Documentation tests are especially useful for public or platform modules used by many teams. The first example a consumer copies should pass terraform validate and plan. If it requires provider credentials, keep it in a plan-only fixture and make any required variables obvious.

When documentation examples change, reviewers should see the fixture change too. That pairing prevents a README from promising inputs, outputs, or defaults that the tested module no longer supports.

For platform modules, this single practice prevents many support tickets because consumers copy examples before reading the rest of the reference material.

It also makes version upgrade reviews concrete.

## Frequently Asked Questions

### Should Terraform module tests run plan or apply?

Use plan for pull requests whenever possible. It is faster and avoids cloud cleanup. Use apply for modules where provider-computed values, actual permissions, or cloud-side validation are the behavior under test. Apply tests need isolated accounts or projects.

### What belongs in a .tftest.hcl file?

Put module-level examples and assertions there: valid inputs, invalid inputs, output contracts, naming, tags, and optional resource behavior. Keep broad organization policy in a separate plan JSON policy layer so it can apply consistently across modules.

### How do I test that a module upgrade will not replace resources?

Run a plan against a fixture that represents previous state or against a controlled deployed test workspace. Inspect plan actions for delete and replace. Make destructive actions explicit in release notes when they are intentional.

### Are policy scanners enough?

No. Scanners catch known patterns, but they do not understand every module contract. Pair scanners with native tests for module behavior and plan policies for organization-specific rules.

### How should modules handle exceptions to policy?

Exceptions should be explicit, reviewed, and narrow. Use variables or metadata that policy checks can read, not hidden comments. Test the normal path and the exception path so the exception does not become a silent bypass for every consumer.
`,
};
