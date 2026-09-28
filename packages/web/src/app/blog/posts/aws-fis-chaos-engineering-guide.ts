import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'AWS Fault Injection Service (FIS): Chaos Testing on AWS',
  description: 'aws fis guide for QA teams: design safe AWS chaos experiments with templates, stop conditions, IAM roles, CLI runs, CI gates, and failure triage.',
  date: '2026-09-28',
  category: 'Guide',
  content: `
# AWS Fault Injection Service (FIS): Chaos Testing on AWS

AWS Fault Injection Service, usually shortened to AWS FIS, is the managed AWS service for running controlled fault injection experiments against AWS workloads. It is active, documented, and integrated with current AWS services. The current AWS docs use the name AWS Fault Injection Service, although some AWS CLI pages and older examples still contain the historical "Fault Injection Simulator" wording. Treat FIS as the current product and the fis AWS CLI namespace as the current command surface.

The direct answer for QA teams is this: use aws fis when the failure you need to test is inside AWS infrastructure, when you want native IAM-scoped actions, and when CloudWatch alarms should stop the experiment automatically. Do not use it as a generic chaos scheduler. A good FIS experiment is a small AWS-native test with named targets, an explicit action, a CloudWatch stop condition, a blast-radius tag policy, and a rollback or recovery expectation you can verify from application telemetry.

FIS is different from writing a shell script that stops instances. It resolves targets at the start of the experiment, runs named AWS actions such as aws:ec2:stop-instances, aws:ecs:stop-task, aws:eks:pod-network-latency, or aws:ssm:send-command, records experiment state, and can stop when a CloudWatch alarm breaches. If your broader program needs a practice model before tool selection, start with [chaos engineering resilience testing](/blog/chaos-engineering-resilience-testing), then compare this AWS-native path with vendor platforms such as [Gremlin chaos engineering tutorial 2026](/blog/gremlin-chaos-engineering-tutorial-2026).

## Current Product And Safety Baseline

AWS FIS is not discontinued, renamed away from FIS, or replaced by another AWS service. The official user guide describes experiment templates made from actions, targets, stop conditions, an experiment role, optional experiment reports, experiment options, and tags. The official pricing page charges by action-minute and by the number of accounts included in an experiment, with a higher published rate for AWS GovCloud regions. That pricing model matters because parallel actions are not just operationally riskier, they can also multiply cost.

The first mistake people make with aws fis is treating "managed" as "safe by default." Managed means AWS runs the control plane and gives you documented actions. It does not mean the selected resources are harmless, that a stopped workload will recover, or that your alarms describe customer pain. Safety comes from four layers: limited targets, least-privilege experiment roles, CloudWatch stop conditions, and human review before production runs.

| Decision | Safe default | Risk if skipped |
| --- | --- | --- |
| Targeting | Use resource tags plus COUNT(1) or PERCENT with a small value | FIS may affect every matching resource selected at experiment start |
| Stop condition | CloudWatch alarm tied to user-facing SLO or saturation | Experiment continues while the app is already unhealthy |
| IAM role | Action-specific permissions plus tag conditions where possible | Experiment role can run unrelated destructive actions |
| Experiment duration | Short ISO 8601 duration such as PT2M or PT5M | Fault lasts beyond the observation window |
| Production approval | Manual approval, change ticket, or protected workflow environment | A CI retry can become a real outage trigger |

AWS FIS identifies all targets at the start of an experiment and uses that resolved set for the whole run. If no targets are found, the experiment fails. That is useful for reproducibility, but it also means a late scale-out event is not automatically included. For QA engineers, this shapes the assertion: verify the selected resources and the system response, not an imagined dynamic population.

## How FIS Experiment Templates Work

An experiment template is the reusable definition. Starting an experiment creates a run from that template. The core fields are description, targets, actions, stopConditions, roleArn, optional experimentReportConfiguration, optional experimentOptions, and tags. Actions can run in parallel, or an action can use startAfter to wait for another action to complete.

This minimal template stops one tagged EC2 instance and asks FIS to restart it after two minutes. It uses a CloudWatch alarm stop condition instead of source none because source none is appropriate only for local rehearsal or deliberately harmless non-production experiments.

\`\`\`json
{
  "description": "Stop one web instance in staging and verify ALB recovery",
  "targets": {
    "stagingWebInstance": {
      "resourceType": "aws:ec2:instance",
      "resourceTags": {
        "Service": "checkout-web",
        "Environment": "staging",
        "FisReady": "true"
      },
      "filters": [
        {
          "path": "State.Name",
          "values": ["running"]
        }
      ],
      "selectionMode": "COUNT(1)"
    }
  },
  "actions": {
    "stopOneInstance": {
      "actionId": "aws:ec2:stop-instances",
      "description": "Stop one instance and restart it after two minutes",
      "parameters": {
        "startInstancesAfterDuration": "PT2M"
      },
      "targets": {
        "Instances": "stagingWebInstance"
      }
    }
  },
  "stopConditions": [
    {
      "source": "aws:cloudwatch:alarm",
      "value": "arn:aws:cloudwatch:us-east-1:123456789012:alarm:checkout-5xx-high"
    }
  ],
  "roleArn": "arn:aws:iam::123456789012:role/fis-checkout-staging",
  "tags": {
    "Owner": "qa-platform",
    "Service": "checkout",
    "Environment": "staging"
  }
}
\`\`\`

For test automation, keep templates in source control even if you create them through the console. The console is good for discovering action parameters, but code review is where you catch a target moving from staging to production, source none sneaking into a serious test, or COUNT(1) becoming ALL.

| Template field | What QA should review | Example defect |
| --- | --- | --- |
| description | Plain-language hypothesis and scope | "test outage" gives no recovery expectation |
| targets | Resource type, tags, filters, selectionMode | Tags match blue and green environments |
| actions | actionId, parameters, startAfter order | Stop action runs before wait action but no readiness probe follows |
| stopConditions | Alarm ARN and alarm semantics | Alarm detects host CPU but customer errors are rising |
| roleArn | Permissions and trust policy | Role can terminate instances when the template only needs stop |
| tags | Ownership and environment | No owner tag, so incident review cannot find the team |

The most useful review question is not "does this break something?" It is "what exactly should stay true while this is broken?" If the answer is load balancer health, assert target count and error rate. If the answer is queue durability, assert no message loss and no poison-message storm. If the answer is failover, assert both the failover event and the user-visible behavior after failover.

## Action Families Worth Testing First

FIS action coverage is broad. The official action reference includes AWS service actions across EC2, ECS, EKS, DynamoDB, EBS, RDS, S3, Lambda, Direct Connect, Systems Manager, network actions, and more. Start with actions that map to already-known incidents. QA teams get more value from reproducing a real availability risk than from checking off a random catalog item.

| Workload type | FIS action family | Good first experiment | Watch-outs |
| --- | --- | --- | --- |
| EC2 service | aws:ec2:stop-instances or reboot actions | Stop one instance behind an ALB and confirm capacity absorbs it | Encrypted EBS restart can require KMS permissions |
| ECS service | aws:ecs:stop-task or task network actions | Stop one task or add latency to egress for a dependency | Some task network actions rely on ECS fault injection endpoints or SSM documents |
| EKS service | aws:eks:pod-delete or pod network actions | Delete one pod and assert service endpoints recover | EKS pod actions have namespace, service account, and ephemeral-container requirements |
| EC2 host fault | aws:ssm:send-command with AWSFIS documents | CPU, memory, I/O, disk, or network impairment | SSM Agent, instance profile, and OS support must be ready |
| API client resilience | aws:fis:inject-api-throttle-error | Inject throttling for selected AWS API calls by target IAM role | Application retries can hide errors while latency grows |

The EC2 stop action runs the EC2 StopInstances API against targets and can optionally start the instance again after an ISO 8601 duration such as PT1M. ECS task actions include stop-task plus stress and network actions. EKS pod actions include pod delete, CPU, memory, I/O, network blackhole, network latency, and packet loss. For most EKS pod actions, AWS uses ephemeral containers, while pod-delete is the exception. The docs also state current limitations, including unsupported network actions on Fargate and a minimum supported EKS version of 1.30 for those EKS pod actions.

## IAM Roles And Blast Radius

Every FIS experiment needs an experiment role. That role grants FIS permission to perform service actions on your behalf. In practice, role design is where QA, SRE, and cloud security need to meet. A template is not safe if the role can do much more than the template needs.

This illustrative role policy is intentionally narrow for a staging EC2 stop test. Adapt resource ARNs and conditions to your account, then have cloud security review it before use.

\`\`\`json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowDescribeForTargetResolution",
      "Effect": "Allow",
      "Action": [
        "ec2:DescribeInstances",
        "tag:GetResources"
      ],
      "Resource": "*"
    },
    {
      "Sid": "AllowStopStartOnlyForFisReadyInstances",
      "Effect": "Allow",
      "Action": [
        "ec2:StopInstances",
        "ec2:StartInstances"
      ],
      "Resource": "arn:aws:ec2:us-east-1:123456789012:instance/*",
      "Condition": {
        "StringEquals": {
          "aws:ResourceTag/FisReady": "true",
          "aws:ResourceTag/Environment": "staging"
        }
      }
    }
  ]
}
\`\`\`

The matching trust policy should allow the FIS service to assume the role. Keep the trust policy separate in review so agents do not mix it with permissions policy JSON and produce invalid infrastructure code.

\`\`\`json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "fis.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
\`\`\`

AI coding agents are useful for drafting IAM, but they tend to over-broaden policies when a command fails. Give the agent a rule: add only the permission named by the AWS FIS action reference for the selected action, then rerun the smallest validation command. For EC2 stop tests, that means StopInstances, StartInstances, DescribeInstances where needed, and KMS grant handling if encrypted volumes must be restarted.

## Stop Conditions That Actually Stop The Right Thing

Stop conditions are CloudWatch alarms. When a stop condition triggers during a run, FIS stops the experiment. Manual stop is also available, but it should be a backup, not the primary safety mechanism. The alarm must represent the unacceptable condition for the workload, not just a convenient infrastructure metric.

| Experiment | Weak stop alarm | Better stop alarm |
| --- | --- | --- |
| Stop one web instance | Instance CPU above 80 percent | ALB 5xx rate or target response time above SLO |
| Add network latency to dependency calls | Container CPU high | Checkout success rate drops below threshold |
| Fill disk on one worker | Disk utilization high | Queue age or failed job count breaches |
| Inject API throttling | SDK retry count nonzero | Request latency and error budget burn exceed limit |

Here is a CloudWatch CLI pattern for creating a simple ALB 5xx alarm. The metric dimensions are illustrative, so replace them with the exact values from your load balancer metrics.

\`\`\`bash
aws cloudwatch put-metric-alarm \\
  --alarm-name checkout-5xx-high \\
  --metric-name HTTPCode_Target_5XX_Count \\
  --namespace AWS/ApplicationELB \\
  --statistic Sum \\
  --period 60 \\
  --evaluation-periods 1 \\
  --threshold 5 \\
  --comparison-operator GreaterThanOrEqualToThreshold \\
  --dimensions Name=LoadBalancer,Value=app/checkout/abc123 \\
  --treat-missing-data notBreaching
\`\`\`

Do not use a stop condition as your only assertion. A stopped experiment means the guardrail fired. It does not prove recovery. A completed experiment means the fault action completed. It does not prove users were safe. The QA report should include both FIS state and application evidence.

## AWS CLI Workflow For Repeatable Runs

The AWS CLI gives you a repeatable path for code-reviewed templates. The create-experiment-template command accepts cli-input-json or cli-input-yaml. The start-experiment command requires an experiment template ID and supports experiment-options, including actionsMode skip-all or run-all. That actionsMode value is useful for a control-plane rehearsal because skip-all starts a run without executing actions.

\`\`\`bash
aws fis create-experiment-template \\
  --cli-input-json file://fis-checkout-stop-instance.json \\
  --region us-east-1

aws fis start-experiment \\
  --experiment-template-id EXT123abc456def \\
  --experiment-options actionsMode=skip-all \\
  --tags RunType=dry-control-plane,Owner=qa-platform \\
  --region us-east-1

aws fis start-experiment \\
  --experiment-template-id EXT123abc456def \\
  --experiment-options actionsMode=run-all \\
  --tags RunType=staging-chaos,Owner=qa-platform \\
  --region us-east-1
\`\`\`

After the run starts, poll get-experiment and inspect both experiment state and action state. The state values include pending, initiating, running, completed, stopping, stopped, failed, and cancelled at the experiment level. Actions have similar status values plus skipped.

\`\`\`bash
EXPERIMENT_ID="EXPabc123def456"

aws fis get-experiment \\
  --id "\${EXPERIMENT_ID}" \\
  --query "experiment.{status:state.status,reason:state.reason,actions:actions}" \\
  --output json \\
  --region us-east-1
\`\`\`

A useful post-run script should not assert only that status is completed. It should also fetch the CloudWatch metrics or application events that prove the system absorbed the failure. For example, assert the ALB target group returned to its original healthy target count, no stop condition alarm remained in ALARM, and synthetic user checks passed after recovery.

## CI Integration Without Turning CI Into A Blunt Instrument

Most teams should not run real FIS actions on every pull request. The safer pattern is three tiers: lint and schema checks on every PR, skip-all control-plane checks in a protected staging workflow, and run-all experiments manually or on a planned resilience schedule. Put production runs behind protected GitHub environments, service-owner approval, and a calendar window.

\`\`\`yaml
name: fis-staging-experiment

on:
  workflow_dispatch:
    inputs:
      template_id:
        description: "FIS experiment template ID"
        required: true
      actions_mode:
        description: "skip-all or run-all"
        required: true
        default: "skip-all"

jobs:
  run-fis:
    runs-on: ubuntu-latest
    environment: staging-chaos
    permissions:
      id-token: write
      contents: read
    steps:
      - uses: actions/checkout@v7

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v6
        with:
          role-to-assume: arn:aws:iam::123456789012:role/github-fis-runner
          aws-region: us-east-1

      - name: Start experiment
        run: |
          aws fis start-experiment \\
            --experiment-template-id "\${{ inputs.template_id }}" \\
            --experiment-options "actionsMode=\${{ inputs.actions_mode }}" \\
            --tags "RunId=\${{ github.run_id }},Owner=qa-platform"
\`\`\`

The role used by CI should be separate from the FIS experiment role. The CI role starts experiments. The FIS experiment role performs the fault actions. That separation makes review easier and prevents a workflow identity from gaining direct permissions to stop instances, delete pods, or inject API throttling outside FIS.

## Observability And Assertions For QA Engineers

FIS tells you whether the experiment machinery completed. Your product telemetry tells you whether users were protected. Build your report around both.

| Evidence | Source | QA assertion |
| --- | --- | --- |
| Experiment state | aws fis get-experiment | Experiment ended completed, stopped by expected alarm, or failed for a known setup issue |
| Action state | FIS action details | The intended action ran on the intended target count |
| Target health | ELB, ECS, EKS, EC2, or application probes | Healthy capacity returned within the recovery objective |
| User signal | Synthetic tests, canaries, API checks | Critical workflows stayed within error and latency thresholds |
| Stop alarm | CloudWatch alarm history | Alarm did not breach, or breached and stopped the experiment as designed |
| Incident notes | Change ticket or resilience log | Follow-up work is linked to a real response gap |

What people get wrong is confusing chaos with outage theater. A stop instance experiment that creates a visible outage and a dramatic incident call is not automatically valuable. The valuable result is a narrow answer: "When one checkout-web instance stops, the ALB removes it, autoscaling replaces it, checkout payment authorization remains below 2 percent 5xx, and recovery completes inside six minutes." That sentence is testable.

## Failure Mode: Experiment Fails Before The Fault Starts

A common FIS failure is "target cannot be found" or an action failure before the fault begins. Diagnosis should start with target resolution, not application code. Because FIS resolves targets at experiment start, missing tags, wrong Region, stopped instances, or unsupported resource parameters can fail the run before any useful resilience signal exists.

Use this checklist:

1. Confirm the AWS Region used by the CLI and template.
2. List resources with the exact tags in the template.
3. Confirm the target resource type matches the selected action.
4. For EKS pod actions, verify namespace, service account, RBAC, EKS version, and pod security context.
5. For SSM-based actions, verify SSM Agent, instance profile, supported OS, and document parameters.
6. Inspect the FIS experiment state reason and action state reason before changing IAM.

\`\`\`bash
aws ec2 describe-instances \\
  --filters "Name=tag:Service,Values=checkout-web" \\
            "Name=tag:Environment,Values=staging" \\
            "Name=tag:FisReady,Values=true" \\
            "Name=instance-state-name,Values=running" \\
  --query "Reservations[].Instances[].{id:InstanceId,az:Placement.AvailabilityZone,state:State.Name}" \\
  --output table \\
  --region us-east-1
\`\`\`

If the target list is empty, do not broaden selectionMode to ALL. Fix the tag or filter mismatch. If the target list is correct but the action fails, then move to action-specific IAM and prerequisites.

## Using SSM Documents For Host And Network Faults

The aws:ssm:send-command action lets FIS run Systems Manager documents on managed instances. AWS provides public preconfigured documents with names beginning AWSFIS-, including CPU stress, disk fill, I/O stress, kill process, memory stress, network blackhole, network latency, and packet loss variants. These are powerful because they test the failure modes your process experiences inside the host, not only cloud control-plane events.

They also have sharp edges. AWS documents note OS support for the preconfigured SSM documents, EC2-only support for those documents, SSM Agent requirements, and instance profile requirements. Some documents have both FIS action duration and document parameters such as DurationSeconds. If the document keeps running after the FIS action duration has elapsed, your experiment report may say the action completed while the host still feels the fault.

For disk-fill tests, be especially conservative. AWS documentation warns that canceling the SSM document can fail if the disk becomes completely full. Set Percent below the point where Systems Manager itself loses the ability to cancel or report, and run the first test on a disposable staging instance.

## Choosing FIS Versus Other Chaos Tools

FIS is strongest when the target is AWS and the control surface should stay inside AWS IAM, CloudWatch, and service APIs. It is weaker when you need a cross-cloud experiment language, rich experiment scheduling across many platforms, or a vendor dashboard for non-AWS systems. That does not make it better or worse, it narrows where it belongs.

| Need | Prefer AWS FIS | Prefer another tool |
| --- | --- | --- |
| EC2, ECS, EKS, RDS, DynamoDB, AWS API faults | Yes, native actions and IAM | Only if you need cross-platform orchestration |
| Strong AWS account governance | Yes, use IAM roles, CloudWatch, CloudTrail, tags | Vendor tool must integrate with governance |
| Kubernetes outside AWS | No | Use Kubernetes-native or open-source chaos tooling |
| Declarative experiments in git across many providers | Possible but AWS-specific | Chaos Toolkit or similar fits better |
| Production game days with AWS stop alarms | Yes | Add external tool only if workflow needs it |

One practical pattern is to keep FIS templates for AWS-native destructive actions and use your normal test framework for assertions. FIS creates the fault. Playwright, k6, pytest, synthetic checks, or service-level probes verify the customer journey.

## Frequently Asked Questions

### Is AWS FIS safe to run in production?

It can be, but only after staging proof, narrow targeting, reviewed IAM, CloudWatch stop conditions, and production approval. The unsafe version is source none, ALL targets, broad permissions, and no user-facing telemetry. Start with one non-critical target, verify recovery, then expand only when the previous experiment produced evidence. Production FIS should look like a controlled change, not an ad hoc test command.

### How is aws fis priced?

AWS pricing is based on active action-minutes and the number of accounts included in the experiment. The official pricing page currently lists a standard regional price per action-minute, plus an additional per action-minute charge for each additional account, with separate GovCloud pricing. Charges are the same regardless of action type or affected resource count, so parallel actions and multi-account experiments deserve explicit cost review.

### Should QA engineers use source none for stop conditions?

Use source none only for harmless rehearsal, sandbox work, or a deliberate case where an external control is already stopping the run. For real resilience tests, define a CloudWatch alarm that represents unacceptable service behavior. A good stop condition is not the same as a good assertion, but it limits damage when the hypothesis is wrong.

### Can AI coding agents write FIS templates reliably?

They can draft useful templates, IAM snippets, and CI workflows, but require guardrails. Give the agent the exact action ID, target resource type, tags, stop alarm ARN, and allowed permissions. Then require validation through AWS CLI inspection and code review. Agents often over-broaden IAM or target filters after an error, so review diffs for blast-radius expansion before running anything.
`,
};
