---
name: Mobile Performance Testing
description: Mobile application performance testing including app launch time, frame rendering, memory profiling, battery consumption, network throttling, and crash analytics using Appium, XCTest, and Espresso with real device testing.
version: 1.0.0
author: thetestingacademy
license: MIT
tags: [mobile-performance, app-launch-time, frame-rendering, memory-profiling, battery-testing, network-throttling, appium, espresso, xctest, crash-analytics]
testingTypes: [performance, mobile, e2e, integration]
frameworks: [appium, espresso, xctest, detox]
languages: [typescript, javascript, kotlin, swift]
domains: [mobile, performance, ios, android]
agents: [claude-code, cursor, github-copilot, windsurf, codex, aider, continue, cline, zed, bolt, gemini-cli, amp]
---

# Mobile Performance Testing Skill

You are an expert in mobile application performance testing. When the user asks you to test mobile app performance, measure launch times, profile memory usage, test under network conditions, or set up mobile performance monitoring, follow these detailed instructions.

## Core Principles

1. **Real device testing over emulators** -- Performance measurements on emulators do not represent real-world behavior. Always validate on real devices with representative hardware.
2. **Cold start and warm start measurement** -- Measure both cold start (app loaded from scratch) and warm start (app resumed from background) times. Users experience both.
3. **Frame rendering performance** -- Target 60fps (16.6ms per frame) for smooth UI. Measure jank frames, frozen frames, and total frame drop percentage.
4. **Memory profiling under load** -- Monitor memory allocation, peak usage, and garbage collection frequency during typical and stress scenarios.
5. **Network-aware performance** -- Test on 2G, 3G, 4G, and WiFi conditions. Many users operate on slow or unreliable connections.
6. **Battery consumption measurement** -- Track CPU wake locks, network activity, GPS usage, and background processing that drain battery.
7. **Baseline comparison** -- Every performance test must compare against a baseline from the previous release to detect regressions.

## Project Structure

```
mobile-perf-tests/
  android/
    launch-time/
      cold-start.test.ts
      warm-start.test.ts
      deep-link-start.test.ts
    rendering/
      frame-rate.test.ts
      scroll-performance.test.ts
      animation-jank.test.ts
    memory/
      memory-leak-detection.test.ts
      large-list-memory.test.ts
      image-cache-memory.test.ts
    network/
      slow-network.test.ts
      offline-mode.test.ts
      large-payload.test.ts
    battery/
      background-drain.test.ts
      location-tracking-drain.test.ts
  ios/
    launch-time/
      cold-start.test.ts
      warm-start.test.ts
    rendering/
      frame-rate.test.ts
      scroll-performance.test.ts
    memory/
      memory-warnings.test.ts
      image-cache.test.ts
  helpers/
    performance-collector.ts
    adb-helper.ts
    network-throttler.ts
    metrics-reporter.ts
  baselines/
    android-baseline.json
    ios-baseline.json
  config/
    device-profiles.ts
    performance-thresholds.ts
  reports/
    .gitkeep
```

## App Launch Time Testing

```typescript
// android/launch-time/cold-start.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';

interface LaunchMetrics {
  coldStartMs: number;
  timeToFirstFrameMs: number;
  timeToInteractiveMs: number;
  totalDrawnFrames: number;
}

describe('Android Cold Start Performance', () => {
  const APP_PACKAGE = 'com.example.app';
  const LAUNCH_ACTIVITY = '.MainActivity';
  const ITERATIONS = 10;
  const THRESHOLD_MS = 2000;

  it('should launch within threshold on average', async () => {
    const measurements: number[] = [];

    for (let i = 0; i < ITERATIONS; i++) {
      // Force stop the app
      await execAdb(`shell am force-stop ${APP_PACKAGE}`);
      await sleep(2000);

      // Clear app from memory
      await execAdb(`shell pm clear ${APP_PACKAGE}`);
      await sleep(1000);

      // Measure cold start
      const output = await execAdb(
        `shell am start-activity -W -n ${APP_PACKAGE}/${LAUNCH_ACTIVITY}`
      );

      const totalTime = parseLaunchTime(output);
      measurements.push(totalTime);
    }

    const average = measurements.reduce((a, b) => a + b, 0) / measurements.length;
    const p95 = measurements.sort((a, b) => a - b)[Math.floor(measurements.length * 0.95)];
    const max = Math.max(...measurements);

    console.log(`Cold start: avg=${average.toFixed(0)}ms, p95=${p95}ms, max=${max}ms`);

    expect(average).toBeLessThan(THRESHOLD_MS);
    expect(p95).toBeLessThan(THRESHOLD_MS * 1.5);
  });

  it('should render first frame within 1 second', async () => {
    await execAdb(`shell am force-stop ${APP_PACKAGE}`);
    await sleep(2000);

    const startTime = Date.now();
    await execAdb(`shell am start-activity -W -n ${APP_PACKAGE}/${LAUNCH_ACTIVITY}`);

    const output = await execAdb('shell dumpsys gfxinfo ' + APP_PACKAGE);
    const firstFrameTime = parseFirstFrameTime(output);

    expect(firstFrameTime).toBeLessThan(1000);
  });

  it('should show improvement over baseline', async () => {
    const baseline = await loadBaseline('cold-start');
    const current = await measureColdStart();

    const regression = ((current - baseline) / baseline) * 100;
    console.log(`Baseline: ${baseline}ms, Current: ${current}ms, Change: ${regression.toFixed(1)}%`);

    expect(regression).toBeLessThan(10); // Allow up to 10% regression
  });
});

async function execAdb(command: string): Promise<string> {
  const { execSync } = await import('child_process');
  return execSync(`adb ${command}`, { encoding: 'utf-8' });
}

function parseLaunchTime(output: string): number {
  const match = output.match(/TotalTime:\s*(\d+)/);
  return match ? parseInt(match[1], 10) : 0;
}

function parseFirstFrameTime(output: string): number {
  const match = output.match(/Janky frames:\s*\d+.*?(\d+)ms/);
  return match ? parseInt(match[1], 10) : 0;
}

async function loadBaseline(metric: string): Promise<number> {
  const { readFileSync } = await import('fs');
  const baselines = JSON.parse(readFileSync('baselines/android-baseline.json', 'utf-8'));
  return baselines[metric] || 0;
}

async function measureColdStart(): Promise<number> {
  const APP_PACKAGE = 'com.example.app';
  const LAUNCH_ACTIVITY = '.MainActivity';
  await execAdb(`shell am force-stop ${APP_PACKAGE}`);
  await sleep(2000);
  const output = await execAdb(`shell am start-activity -W -n ${APP_PACKAGE}/${LAUNCH_ACTIVITY}`);
  return parseLaunchTime(output);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
```

## Memory Profiling

```typescript
// android/memory/memory-leak-detection.test.ts
import { describe, it, expect } from 'vitest';

describe('Memory Leak Detection', () => {
  const APP_PACKAGE = 'com.example.app';
  const THRESHOLD_MB = 200;

  it('should not leak memory during navigation cycles', async () => {
    const initialMemory = await getAppMemory(APP_PACKAGE);
    const memorySnapshots: number[] = [initialMemory];

    // Simulate 20 navigation cycles
    for (let i = 0; i < 20; i++) {
      await navigateToScreen('home');
      await navigateToScreen('profile');
      await navigateToScreen('settings');
      await navigateToScreen('home');

      const memory = await getAppMemory(APP_PACKAGE);
      memorySnapshots.push(memory);
    }

    // Force garbage collection
    await execAdb(`shell am dumpheap ${APP_PACKAGE} /dev/null`);
    await sleep(3000);

    const finalMemory = await getAppMemory(APP_PACKAGE);
    const memoryGrowth = finalMemory - initialMemory;

    console.log(`Memory: initial=${initialMemory}MB, final=${finalMemory}MB, growth=${memoryGrowth}MB`);

    // Memory should not grow linearly
    expect(finalMemory).toBeLessThan(THRESHOLD_MB);

    // Check for linear growth pattern (indicates leak)
    const isLinearGrowth = checkLinearGrowth(memorySnapshots);
    expect(isLinearGrowth).toBe(false);
  });

  it('should handle large image lists without OOM', async () => {
    await navigateToScreen('image-gallery');

    // Scroll through 100 images
    for (let i = 0; i < 20; i++) {
      await scrollDown();
      await sleep(500);
    }

    const memory = await getAppMemory(APP_PACKAGE);
    expect(memory).toBeLessThan(THRESHOLD_MB);

    // Check for OOM crashes
    const crashes = await getRecentCrashes(APP_PACKAGE);
    expect(crashes.filter((c: string) => c.includes('OutOfMemoryError'))).toHaveLength(0);
  });
});

async function getAppMemory(packageName: string): Promise<number> {
  const output = await execAdb(`shell dumpsys meminfo ${packageName}`);
  const match = output.match(/TOTAL\s+(\d+)/);
  return match ? parseInt(match[1], 10) / 1024 : 0; // Convert KB to MB
}

function checkLinearGrowth(snapshots: number[]): boolean {
  if (snapshots.length < 5) return false;
  const diffs = snapshots.slice(1).map((v, i) => v - snapshots[i]);
  const avgDiff = diffs.reduce((a, b) => a + b, 0) / diffs.length;
  return avgDiff > 2 && diffs.every((d) => d > 0); // Consistent positive growth
}

async function navigateToScreen(screen: string): Promise<void> {
  // Use Appium or ADB to navigate
}

async function scrollDown(): Promise<void> {
  await execAdb('shell input swipe 500 1500 500 500 300');
}

async function getRecentCrashes(packageName: string): Promise<string[]> {
  const output = await execAdb(`shell logcat -d -s AndroidRuntime:E | grep ${packageName}`);
  return output.split('\n').filter(Boolean);
}

async function execAdb(command: string): Promise<string> {
  const { execSync } = await import('child_process');
  return execSync(`adb ${command}`, { encoding: 'utf-8' });
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
```

## Network Throttling Tests

```typescript
// android/network/slow-network.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';

describe('Slow Network Performance', () => {
  const networkProfiles = {
    '3G': { download: 750, upload: 250, latency: 100 },
    '2G': { download: 50, upload: 25, latency: 300 },
    'slow-wifi': { download: 2000, upload: 1000, latency: 50 },
    'lossy': { download: 5000, upload: 2000, latency: 200 },
  };

  afterAll(async () => {
    await disableNetworkThrottling();
  });

  it('should load main feed within 5s on 3G', async () => {
    await setNetworkProfile(networkProfiles['3G']);

    const startTime = Date.now();
    await navigateToScreen('feed');
    await waitForContentLoaded();
    const loadTime = Date.now() - startTime;

    console.log(`Feed load on 3G: ${loadTime}ms`);
    expect(loadTime).toBeLessThan(5000);
  });

  it('should show loading indicator on slow connections', async () => {
    await setNetworkProfile(networkProfiles['2G']);
    await navigateToScreen('feed');

    // Check that loading indicator is shown
    const hasLoadingIndicator = await checkElementVisible('loading-spinner');
    expect(hasLoadingIndicator).toBe(true);
  });

  it('should gracefully handle offline mode', async () => {
    await setAirplaneMode(true);
    await navigateToScreen('feed');

    const hasOfflineMessage = await checkElementVisible('offline-message');
    expect(hasOfflineMessage).toBe(true);

    await setAirplaneMode(false);
  });

  it('should retry failed requests on connection recovery', async () => {
    await setAirplaneMode(true);
    await navigateToScreen('feed');

    await setAirplaneMode(false);
    await sleep(5000);

    const hasContent = await checkElementVisible('feed-content');
    expect(hasContent).toBe(true);
  });
});

async function setNetworkProfile(profile: { download: number; upload: number; latency: number }): Promise<void> {
  // Use ADB network emulation or proxy tool
  console.log(`Setting network: ${profile.download}kbps down, ${profile.upload}kbps up, ${profile.latency}ms latency`);
}

async function disableNetworkThrottling(): Promise<void> {
  console.log('Disabling network throttling');
}

async function setAirplaneMode(enabled: boolean): Promise<void> {
  const { execSync } = await import('child_process');
  execSync(`adb shell settings put global airplane_mode_on ${enabled ? 1 : 0}`);
  execSync(`adb shell am broadcast -a android.intent.action.AIRPLANE_MODE`);
}

async function navigateToScreen(screen: string): Promise<void> {}
async function waitForContentLoaded(): Promise<void> { await sleep(100); }
async function checkElementVisible(id: string): Promise<boolean> { return true; }
function sleep(ms: number): Promise<void> { return new Promise((r) => setTimeout(r, ms)); }
```

## Frame Rate Performance Testing

```typescript
// android/rendering/frame-rate.test.ts
import { describe, it, expect } from 'vitest';

interface FrameStats {
  totalFrames: number;
  jankFrames: number;
  frozenFrames: number;
  p50RenderTimeMs: number;
  p95RenderTimeMs: number;
  p99RenderTimeMs: number;
  fps: number;
}

describe('Frame Rate Performance', () => {
  const APP_PACKAGE = 'com.example.app';
  const TARGET_FPS = 60;
  const MAX_JANK_PERCENTAGE = 5;

  it('should maintain 60fps during list scrolling', async () => {
    await resetFrameStats(APP_PACKAGE);
    await navigateToScreen('product-list');

    // Scroll through the list for 10 seconds
    for (let i = 0; i < 20; i++) {
      await execAdb('shell input swipe 500 1500 500 300 200');
      await sleep(500);
    }

    const stats = await getFrameStats(APP_PACKAGE);

    console.log(`FPS: ${stats.fps}, Jank: ${stats.jankFrames}/${stats.totalFrames}`);
    console.log(`Render times: p50=${stats.p50RenderTimeMs}ms, p95=${stats.p95RenderTimeMs}ms, p99=${stats.p99RenderTimeMs}ms`);

    expect(stats.fps).toBeGreaterThanOrEqual(TARGET_FPS * 0.9); // Allow 10% margin
    const jankPercentage = (stats.jankFrames / stats.totalFrames) * 100;
    expect(jankPercentage).toBeLessThan(MAX_JANK_PERCENTAGE);
  });

  it('should not have frozen frames during navigation', async () => {
    await resetFrameStats(APP_PACKAGE);

    // Navigate between screens
    const screens = ['home', 'search', 'profile', 'settings', 'home'];
    for (const screen of screens) {
      await navigateToScreen(screen);
      await sleep(1000);
    }

    const stats = await getFrameStats(APP_PACKAGE);
    expect(stats.frozenFrames).toBe(0);
  });

  it('should maintain frame rate during animations', async () => {
    await resetFrameStats(APP_PACKAGE);
    await navigateToScreen('animations-demo');

    // Trigger multiple animations
    await execAdb('shell input tap 500 500'); // Trigger animation
    await sleep(2000);
    await execAdb('shell input tap 500 800'); // Another animation
    await sleep(2000);

    const stats = await getFrameStats(APP_PACKAGE);
    expect(stats.p95RenderTimeMs).toBeLessThan(16.67); // Must be under one frame budget
  });
});

async function resetFrameStats(packageName: string): Promise<void> {
  await execAdb(\`shell dumpsys gfxinfo \${packageName} reset\`);
}

async function getFrameStats(packageName: string): Promise<FrameStats> {
  const output = await execAdb(\`shell dumpsys gfxinfo \${packageName}\`);

  const totalMatch = output.match(/Total frames rendered: (\\d+)/);
  const jankMatch = output.match(/Janky frames: (\\d+)/);
  const frozenMatch = output.match(/Number Missed Vsync: (\\d+)/);

  const totalFrames = totalMatch ? parseInt(totalMatch[1], 10) : 0;
  const jankFrames = jankMatch ? parseInt(jankMatch[1], 10) : 0;
  const frozenFrames = frozenMatch ? parseInt(frozenMatch[1], 10) : 0;

  // Parse frame timing histogram
  const renderTimes = parseFrameTimings(output);
  renderTimes.sort((a, b) => a - b);

  return {
    totalFrames,
    jankFrames,
    frozenFrames,
    p50RenderTimeMs: percentile(renderTimes, 50),
    p95RenderTimeMs: percentile(renderTimes, 95),
    p99RenderTimeMs: percentile(renderTimes, 99),
    fps: totalFrames > 0 ? Math.round(totalFrames / 10) : 0,
  };
}

function parseFrameTimings(output: string): number[] {
  const lines = output.split('\\n');
  const timings: number[] = [];
  let inHistogram = false;

  for (const line of lines) {
    if (line.includes('HISTOGRAM')) inHistogram = true;
    if (inHistogram && line.match(/^\\d/)) {
      const parts = line.trim().split(/\\s+/);
      if (parts.length >= 2) {
        timings.push(parseFloat(parts[0]));
      }
    }
  }

  return timings;
}

function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const index = Math.ceil(values.length * (p / 100)) - 1;
  return values[Math.max(0, index)];
}

async function execAdb(command: string): Promise<string> {
  const { execSync } = await import('child_process');
  return execSync(\`adb \${command}\`, { encoding: 'utf-8' });
}
async function navigateToScreen(screen: string): Promise<void> {}
function sleep(ms: number): Promise<void> { return new Promise((r) => setTimeout(r, ms)); }
```

## Battery Consumption Testing

```typescript
// android/battery/background-drain.test.ts
import { describe, it, expect } from 'vitest';

describe('Battery Consumption', () => {
  const APP_PACKAGE = 'com.example.app';

  it('should not drain more than 2% battery in 30 minutes of background', async () => {
    const initialBattery = await getBatteryLevel();

    // Launch app and send to background
    await execAdb(\`shell am start -n \${APP_PACKAGE}/.MainActivity\`);
    await sleep(5000);
    await execAdb('shell input keyevent KEYCODE_HOME'); // Send to background

    // Wait 30 minutes (or simulated time)
    await sleep(30 * 60 * 1000);

    const finalBattery = await getBatteryLevel();
    const drain = initialBattery - finalBattery;

    console.log(\`Battery drain: \${drain}% over 30 minutes\`);
    expect(drain).toBeLessThanOrEqual(2);
  });

  it('should release wake locks when backgrounded', async () => {
    await execAdb(\`shell am start -n \${APP_PACKAGE}/.MainActivity\`);
    await sleep(5000);
    await execAdb('shell input keyevent KEYCODE_HOME');
    await sleep(10000);

    const wakeLocks = await getAppWakeLocks(APP_PACKAGE);
    expect(wakeLocks).toBe(0);
  });
});

async function getBatteryLevel(): Promise<number> {
  const output = await execAdb('shell dumpsys battery');
  const match = output.match(/level: (\\d+)/);
  return match ? parseInt(match[1], 10) : 0;
}

async function getAppWakeLocks(packageName: string): Promise<number> {
  const output = await execAdb(\`shell dumpsys power | grep \${packageName}\`);
  return (output.match(/PARTIAL_WAKE_LOCK/g) || []).length;
}

async function execAdb(command: string): Promise<string> {
  const { execSync } = await import('child_process');
  return execSync(\`adb \${command}\`, { encoding: 'utf-8' });
}
function sleep(ms: number): Promise<void> { return new Promise((r) => setTimeout(r, ms)); }
```

## App Size Monitoring

```typescript
// monitoring/app-size.ts
export interface AppSizeReport {
  totalSizeMB: number;
  downloadSizeMB: number;
  installSizeMB: number;
  components: Array<{
    name: string;
    sizeMB: number;
    percentage: number;
  }>;
  thresholdStatus: 'pass' | 'warning' | 'fail';
}

export function analyzeApkSize(apkPath: string): AppSizeReport {
  // Analyze APK/AAB components
  return {
    totalSizeMB: 0,
    downloadSizeMB: 0,
    installSizeMB: 0,
    components: [],
    thresholdStatus: 'pass',
  };
}

export const APP_SIZE_THRESHOLDS = {
  totalMB: { warning: 50, critical: 100 },
  downloadMB: { warning: 30, critical: 60 },
  dexFilesMB: { warning: 10, critical: 20 },
  nativeLibsMB: { warning: 15, critical: 30 },
  resourcesMB: { warning: 20, critical: 40 },
};
```

## Best Practices

1. **Test on real devices with representative hardware** -- Low-end and mid-range devices represent the majority of users. Do not only test on flagship phones.
2. **Measure cold and warm start separately** -- Users experience both scenarios. Cold start matters for first impressions; warm start matters for daily usage.
3. **Run performance tests multiple times** -- A single measurement is noisy. Run at least 10 iterations and report median and p95 values.
4. **Test under realistic network conditions** -- Use network throttling to simulate 3G, 4G, and lossy WiFi connections.
5. **Monitor memory across the entire user session** -- Brief memory spikes are acceptable. Continuous growth indicates leaks.
6. **Establish baselines and track regressions** -- Store performance baselines per release and fail tests when regressions exceed thresholds.
7. **Test with realistic data volumes** -- Empty lists and single items do not stress the app. Use hundreds of items with images and complex layouts.
8. **Include battery impact in performance criteria** -- An app that drains 10% battery per hour will get uninstalled regardless of feature quality.
9. **Automate performance tests in CI** -- Run performance tests on every release branch, not just manually before launch.
10. **Profile before optimizing** -- Use Android Profiler and Xcode Instruments to identify actual bottlenecks instead of guessing.

## Anti-Patterns

1. **Only testing on emulators** -- Emulator performance does not represent real device behavior. GPU rendering, memory management, and CPU throttling differ significantly.
2. **Measuring performance once** -- Single measurements are unreliable due to JIT compilation, background processes, and thermal throttling. Always aggregate multiple runs.
3. **Ignoring low-end devices** -- Most users do not have flagship phones. Test on devices with 2-3GB RAM and mid-range processors.
4. **Not testing offline scenarios** -- Users frequently lose connectivity. Apps that crash or hang without network are unusable.
5. **Skipping scroll performance testing** -- Janky scrolling is the most user-visible performance issue. Always measure frame rates during scroll.
6. **Testing only on WiFi** -- WiFi performance masks network-dependent bottlenecks. Always include 3G and 4G testing.
7. **Not monitoring memory during long sessions** -- Memory leaks may not appear in 30-second tests. Simulate 5-10 minute user sessions.
8. **Ignoring app size** -- Large APK/IPA files increase download time, storage usage, and initial launch time. Monitor and set size budgets.
9. **Not testing background behavior** -- Apps that consume CPU and network in the background drain battery and may be killed by the OS.
10. **Comparing performance across different device models** -- Always compare same-device measurements across versions, not different devices in the same run.
