import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'mobile permission state matrix testing',
  description:
    'mobile permission state matrix testing: use repo fixtures, edge cases, and CI assertions to expose failures and protect the intended test contract.',
  date: '2026-07-25',
  updated: '2026-07-25',
  category: 'Tutorial',
  primaryKeyword: 'mobile permission state matrix testing',
  keywords: [
    'mobile permission state matrix testing',
    'mobile permission state matrix',
    'permission denied permanently test',
    'app settings permission recovery',
    'runtime permission revocation',
    'mobile permission prompt automation',
  ],
  relatedSlugs: [
    'mobile-testing-automation-guide',
    'appium-mobile-testing-complete-guide',
    'mobile-accessibility-testing-guide',
    'detox-vs-appium-2026',
  ],
  sources: [
    'https://developer.android.com/training/permissions/requesting',
    'https://developer.android.com/training/app-links/deep-linking',
  ],
  repoEvidence: [
    'seed-skills/appium-mobile/SKILL.md',
    'seed-skills/mobile-performance-testing/SKILL.md',
  ],
  content: `Mobile permission state matrix testing covers the first request, grant, denial, permanent denial, settings recovery, and later loss as distinct states. A sound suite makes each state on its own, starts one guarded app feature, and checks OS status, prompt presence, fallback screen, feature access, relaunch result, and cleanup.

The main risk is a hidden past. A test can look right while an earlier run granted access, used a prompt, or left app data behind. Each case needs a stated start, one user act, a shown result, an OS check, and a reset result.

The repo gives clear parts without claiming a full state suite. \`seed-skills/appium-mobile/SKILL.md\` shows options, access dialog work, app state controls, and the need to reset state. \`seed-skills/mobile-performance-testing/SKILL.md\` adds real-phone checks, set test data, repeat runs, crash proof, and cleanup ideas that fit access cases.

Treat those files as code proof and the grid below as a test plan. Start with the [mobile test guide](/blog/mobile-testing-automation-guide), then browse [phone QA skills](/skills) when the team needs an agent-ready flow. Mobile permission state matrix testing should prove app results, not just show that a tool clicked an OS button.

## What Does Mobile Permission State Matrix Testing Verify?

Mobile permission state matrix testing checks that one guarded feature acts as planned as access moves through each known state. The best contract joins OS access status, prompt result, app help, feature access, settings return, relaunch state, and cleanup instead of one good tap.

The repo facts are more narrow and need clear labels. The Appium skill shows Android auto-grant, iOS auto-accept, clear dialog steps, app start and stop, and reset help. It also warns that ignored access and tests tied to old state can fail for causes outside the feature.

The speed skill calls for real phones when a sim may act in a new way, fixed base runs, named phone sets, and saved logs. Those rules support a state grid, but that file does not set permanent denial rules. OS rules must come from OS docs and the tested OS build.

Android's [runtime access flow](https://developer.android.com/training/permissions/requesting) says an app should check access when the guarded task runs, handle denial without blocking the whole screen, and not guess how the OS will act. It also notes repeat denial for current Android rules. Do not copy that fact into an iOS rule without its own proof.

The app owns the shown result after each call back. The OS owns whether a prompt shows, how choices are named, and when the next request may start. A clear fault report states which owner split first, since a lost prompt and a bad fallback screen need new fixes.

Review the broad [Appium test guide](/blog/appium-mobile-testing-complete-guide) for session setup and selectors. This page keeps its scope at access changes, state proof, and repeatable return.

## How Do You Build a Mobile Permission State Matrix?

A mobile permission state matrix begins with a clean install and one guarded feature, such as taking a photo. Use one app build, package ID, access name, phone set, OS build, and locale for the base run. Change only the access step shown by the current row.

Set state through an OS query before opening the feature. Labels such as \`notDetermined\`, \`granted\`, \`denied\`, \`blocked\`, and \`revoked\` are test terms, not a claim that each OS gives the same values. Store the raw OS result by the mapped label so a map bug stays clear.

The first good case should install the app, check that access is not set, open the photo entry point, grant the request, and check that the view works. It should relaunch the app and prove access still works without a new prompt. That pair catches apps that handle the call back but fail at normal start.

The split has three parts. Phone split gives one sim or phone to the case, app split clears package data or installs again, and account split avoids server flags that skip first use. A unique run ID should join screen shots, OS output, and app logs without putting user data in the report.

Do not make auto-grant the only good case. The option in \`seed-skills/appium-mobile/SKILL.md\` helps tests that need access, but it skips the first-request screen. Keep one clear prompt test while most feature tests use set access for speed.

End setup by checking that the guarded feature does not work at first. If it works, stop before the user act since the test data is not clean. The [phone access guide](/blog/mobile-accessibility-testing-guide) also helps check that reason, denial, and settings controls keep clear names.

Cleanup should stop the app, restore the chosen access base, clear owned data, and check the reset. Record a cleanup fault apart from the app result. A red cleanup result keeps the next grid row from taking an unknown state.

## What Breaks a Permission Denied Permanently Test?

A permission denied permanently test breaks when it infers a blocked state from one lost prompt. The prompt may be gone because access is granted, a request did not reach the OS, the app is in back, a sim acts in a new way, or an earlier case used the request path.

On Android, repeat denial can stop later access dialogs in known cases. That rule can change by OS build and app past, so the test must store raw access flags and the exact steps. It should not use a fixed click count as the sole proof of permanent denial.

Prompt text is also a weak selector. Words can change by OS, locale, access group, and phone brand. Prefer OS test hooks where the driver has them, then check the app call back through a stable app-owned item.

Order dependence is especially damaging. A case that passes only after the grant test may actually be revoking existing access, while a case that passes only first may rely on fresh installation. Randomize row order during a diagnostic run and require every row to create its own declared start.

App data and access data may have new reset commands. Clearing storage can remove first use while it keeps an OS choice, or install rules may differ by phone policy. Check the state after cleanup instead of trusting the command exit code.

A phone or runner fault shows before the app result. Cases include an OS command that reports an unknown task, a dialog outside the active test view, or a session that ends on reset. An app fault starts after OS state and call back are known, such as showing the photo view after denial.

Use [Detox and Appium facts](/blog/detox-vs-appium-2026) to choose the right control layer, but keep the same state rule. Mobile permission state matrix testing should give the same app rules even when the driver uses new OS commands.

## App Settings Permission Recovery Fixtures and Controls

App settings permission recovery needs test data that starts in a known blocked state and cannot show a new in-app OS request. Start the feature, check that the app explains lost access, open the set path, grant access, go back, and prove the feature works without a new install.

The good control grants access from settings and expects the feature to work. The bad control comes back without a change and expects the fallback to stay. A bound check puts the app in back on the settings screen long enough to run normal state hooks, then wakes it through the same path.

Keep route proof apart from access proof. Android's [deep link guide](https://developer.android.com/training/app-links/deep-linking) shows URI routes into app pages, not proof that OS access changed. A good route or settings launch cannot replace the OS status query and guarded feature check.

The return may occur on wake, after a clear retry, or after a fresh feature act. Choose the planned app rule and check that exact point. Avoid a long poll that lets any late return pass, since it hides a missed state event.

Repeat the row at least twice on the same phone after full cleanup. The next run finds set paths that worked only because the first run left a screen, task, or access flag ready. It also tests if the cleanup command did restore the blocked state.

Record the app build, phone ID alias, OS build, access name, mapped state, raw state, route used, and first shown app result. Save only the small screen area or text needed to find the fault. Do not save photos, exact place, contacts, or other guarded user data.

The [phone test guide](/blog/mobile-testing-automation-guide) covers broad state work. Here, the key rule is direct proof at each bound: blocked before settings, granted after settings, usable after return, and reset after cleanup.

## How Should Runtime Permission Revocation Be Asserted?

Runtime permission revocation should be checked as a state change, not a good command. Start with known access and a working feature, revoke through a known OS control, wake or relaunch as the app rules state, then check OS state, app help, feature denial, and later return.

Use exact match for mapped access state and stable app labels. Use a part order for event proof when OS and state hooks may land close at hand, with access loss before a guarded task starts. Use time bounds only for the known return span, with times around each check.

Feature result is the key app rule. A photo view should not still work after photo access is lost, and a map should not show fresh guarded data. A stale saved screen needs its own app rule, since shown old data is not the same as new guarded access.

Prompt presence has set terms. Access loss may allow a new request, need settings, or use the next OS path. List allowed results by phone set and OS build, then make the app choose a fit fallback for the seen state.

Relaunch checks catch saved grants. Stop the app after access loss, start it again, and open the feature without a change to OS state. If access comes back only after relaunch, save both states because the app may cache the old grant.

Reject success-only checks such as a done revoke command, a shown settings page, or no crash. None proves the guarded task stopped. The test passes only when OS state and app result match the row rule.

Use [phone test help](/blog) to compare this state test with speed and access checks. Keep their reports apart so a slow OS dialog cannot look like wrong access work.

## Mobile Permission Prompt Automation in CI

Mobile permission prompt automation needs a small, stated phone pool. Pin the app build, test driver, OS build, locale, phone set, and access name. Run a fast Android sim grid on pull requests, then plan key real-phone rows for acts that differ from the sim.

Book phones by job and reset them before the first row. A shared phone can hold the next worker's access choice, settings screen, account, or app task. If the booking is not sure, fail setup instead of retrying an unknown state.

Write one JSON row for each state change. Include case ID, start state, act, raw OS result, mapped state, prompt status, app item status, feature result, relaunch result, and cleanup status. Mask keys and guarded data before adding screen shots or logs.

The CI gate should report the first split state. For example, \`expected=denied actual=granted after=platformRevoke\` gives more help than \`permission test failed\`. Add phone facts and the command result, but do not dump the full phone log unless a safe debug job asks for it.

Retries must rebuild the fixture. Repeating only the final click can turn a real first-request defect into a pass because the first attempt changed permission history. Count an infrastructure retry separately and retain both setup records.

The speed skill's focus on apt phone gear and cleanup supports this gate. Its fixed checks are not access rules, but its same-phone pairs cut noise. The Appium skill gives state and prompt controls while this grid gives the state rule.

Show the final sum in a short CI file and link the failed row to the matching proof path. Teams can read [the project FAQ](/faq) for site use, then add the focused flow to [listed QA skills](/skills).

## Mobile Permission State Matrix Testing Comparison Matrix

The matrix below states application expectations while allowing platform-specific setup commands. Run each row from its own verified baseline. A failure signal should name the first disagreement rather than marking every later observation as another defect.

| Scenario | Controlled setup | Expected observation | Failure signal | Evidence source |
|---|---|---|---|---|
| Permission not determined on first launch | Clean install with camera state verified as undecided. | Feature action opens one system request, and the app waits for its result. | Feature runs early, prompt never becomes eligible, or setup was not clean. | \`seed-skills/appium-mobile/SKILL.md\` and Android permission guidance. |
| Grant from the first prompt | Same build and device, with the grant choice selected. | System state becomes granted, feature works, and relaunch does not prompt again. | Callback, feature result, or relaunch state disagrees with the grant. | \`seed-skills/appium-mobile/SKILL.md\`. |
| Deny and request again | Fresh state followed by one controlled denial. | App shows its fallback and follows the supported next-request path. | App blocks all use, hides guidance, or accesses the feature. | Android permission guidance. |
| Permanent denial followed by settings recovery | Confirmed blocked state, then one settings change. | Fallback points to recovery, grant is observed, and feature access returns. | Navigation works but state or protected behavior never changes. | \`seed-skills/mobile-performance-testing/SKILL.md\`. |
| Permission revoked after a grant | Working feature followed by platform-controlled revocation. | App removes protected access, explains the state, and remains correct after relaunch. | Cached access survives, app crashes, or cleanup leaves access granted. | Both repository skills. |

Treat the evidence column as the reason for setup patterns, not proof of every platform result. The repository does not define one permanent-denial model for all systems. The Android source supports its current workflow, while another platform needs its own approved documentation.

Add a row when the product supports limited photo access, approximate location, one-time grants, or managed-device policy. Do not overload \`denied\` with those meanings. A new platform state deserves a new setup, raw observation, app response, and cleanup check.

Mobile permission state matrix testing remains reviewable when rows use the same evidence fields. Compare the matrix with the [Appium guide](/blog/appium-mobile-testing-complete-guide) before adding driver-specific commands.

## How Do You Implement Mobile Permission State Matrix Testing?

Implement mobile permission state matrix testing from state control outward. First prove that setup can create and inspect each baseline, then prove the app response. Fault injection comes only after the positive transition and cleanup both pass.

1. Read \`seed-skills/appium-mobile/SKILL.md\` and \`seed-skills/mobile-performance-testing/SKILL.md\`, then record supported controls, inputs, outputs, and cleanup duties.
2. Create a clean install with platform-controlled camera or location state, and verify the raw state before launching the feature.
3. Run the grant case first, capturing system state, prompt presence, fallback interface, feature behavior, settings path, and relaunch state.
4. Inject one condition per case, including denial, blocked access, settings recovery, revocation, stale data, and a deliberately contaminated baseline.
5. Compare the result with the five matrix rows, then report the first state or value that differs from the declared contract.
6. Run the matrix in CI, retain safe evidence, restore device state, and fail cleanup independently when the reset cannot be proved.

The first example makes state and observations explicit. The adapter methods represent platform controls supplied by the chosen Appium setup, while app selectors remain owned by the product.

\`\`\`typescript
type PermissionState = 'notDetermined' | 'granted' | 'denied' | 'blocked';

type PermissionCase = {
  id: string;
  start: PermissionState;
  choice?: 'grant' | 'deny';
  expected: PermissionState;
  expectsFeature: boolean;
};

const cases: PermissionCase[] = [
  {
    id: 'first-grant',
    start: 'notDetermined',
    choice: 'grant',
    expected: 'granted',
    expectsFeature: true,
  },
  {
    id: 'blocked-fallback',
    start: 'blocked',
    expected: 'blocked',
    expectsFeature: false,
  },
];

for (const testCase of cases) {
  await permission.prepare(testCase.start);
  expect(await permission.read()).toBe(testCase.start);

  await app.openCamera();
  if (testCase.choice) await systemPrompt.choose(testCase.choice);

  expect(await permission.read()).toBe(testCase.expected);
  expect(await app.cameraIsUsable()).toBe(testCase.expectsFeature);
  await permission.resetAndVerify();
}
\`\`\`

This code adapts the dialog and lifecycle ideas from \`seed-skills/appium-mobile/SKILL.md\`. A production adapter should reject unsupported transitions rather than pretending a generic command worked. Save its raw command, status, and normalized mapping for failed rows.

The second example records a revocation case and always attempts cleanup. It follows the performance skill's preference for named device data and explicit reset evidence.

\`\`\`typescript
const evidence = {
  caseId: 'camera-revoked-after-grant',
  device: process.env.DEVICE_PROFILE,
  before: '',
  after: '',
  featureVisible: false,
  cleanup: 'not-run',
};

try {
  await permission.prepare('granted');
  evidence.before = await permission.readRaw();
  expect(await app.cameraIsUsable()).toBe(true);

  await permission.revoke();
  await app.relaunch();
  evidence.after = await permission.readRaw();
  evidence.featureVisible = await app.cameraIsUsable();

  expect(evidence.after).toContain('denied');
  expect(evidence.featureVisible).toBe(false);
} finally {
  evidence.cleanup = await permission.resetAndVerify();
  await artifacts.writeSafeJson(evidence);
}
\`\`\`

Run the deliberately contaminated case last. Prepare a grant while the row declares undecided access, and require setup to stop before opening the feature. That negative control proves the harness detects its own invalid baseline.

Keep commands in platform adapters and expectations in shared case data. This split lets Android and iOS use different state controls while preserving the product contract. Review results through the [mobile automation guide](/blog/mobile-testing-automation-guide), then publish the focused workflow in [the skills directory](/skills).

## Frequently Asked Questions

### How can a mobile suite cover first request, denial, permanent denial, settings recovery, and revoked permission states?

Create every state from a verified clean baseline, then trigger the same protected feature once. Compare raw system status, normalized status, prompt presence, application fallback, feature access, relaunch behavior, and cleanup. Keep platform-specific transitions in adapters so shared expectations do not invent one universal permission model.

### What should a mobile permission state matrix fixture record?

Record build, package, device profile, system version, permission, starting state, user action, raw platform result, normalized result, app observation, feature result, and cleanup status. Add timestamps around lifecycle changes. Avoid protected user content, secrets, full device logs, or screenshots that do not explain the first difference.

### Which failure proves a permission denied permanently test is broken?

The clearest harness failure is a declared blocked baseline whose raw platform state is granted or undecided before the feature opens. A missing prompt alone is not enough. The runner must also show the request occurred, the active context was correct, and prior app data did not shape the outcome.

### How do teams isolate app settings permission recovery?

Reserve one device, create blocked access directly, terminate unrelated processes, and verify the starting state. Open only the supported settings path, change one permission, return through the declared lifecycle path, and inspect access again. Cleanup must restore blocked access before another worker can reserve that device.

### Which assertion is strongest for runtime permission revocation?

Use a joined transition assertion: access works before revocation, the raw state changes afterward, protected behavior stops, fallback guidance appears, and relaunch preserves denial. A successful platform command is only setup evidence. The application result proves that cached authorization and stale lifecycle state did not bypass the new restriction.

### How should CI report mobile permission prompt automation failures?

Report the case ID, starting state, action, first differing observation, expected and actual values, device profile, system version, driver version, and cleanup status. Link a small redacted artifact to the row. Keep infrastructure retries separate, because repeating a click can change permission history and hide the original defect.

## Conclusion

Mobile permission state matrix testing proves permission behavior through explicit starting states, one controlled transition, joined system and application observations, relaunch checks, and verified cleanup. It separates platform prompt rules from the product's duty to grant, degrade, recover, or stop protected behavior safely.

Add the five-row matrix to the next device run and reject any case whose baseline cannot be proved. Review the [mobile testing automation guide](/blog/mobile-testing-automation-guide), then open [QA skills](/skills) and implement the mobile permission state matrix testing matrix in the next test run.`,
};
