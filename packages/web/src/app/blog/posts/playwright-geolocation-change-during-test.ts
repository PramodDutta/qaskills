import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Change Browser Geolocation During a Playwright Test',
  description:
    'Change browser geolocation during a Playwright test and verify live location updates, permission loss, accuracy handling, and location-aware network calls.',
  date: '2026-07-13',
  category: 'Tutorial',
  content: `
# Change Browser Geolocation During a Playwright Test

The courier marker begins in Bengaluru, crosses a delivery-zone boundary, and the checkout page must recalculate availability without a reload. Creating a second browser context at the destination cannot test that transition. It discards the active watch, page state, and requests that make live-location defects difficult.

Playwright exposes browserContext.setGeolocation, and it can be called after navigation. Pages in that context receive the new coordinates through the browser's Geolocation API. With the geolocation permission granted, a test can keep one session alive, move it between positions, and assert both watchPosition-driven UI changes and downstream API calls.

## Start with the event model your application actually uses

getCurrentPosition is a one-time read. watchPosition subscribes to updates until clearWatch removes the subscription. A page that reads once during startup will not react merely because the context's emulated coordinates change. Before writing the test, identify whether the requirement is initial location, continuous tracking, or an explicit Refresh my location action.

| Product behavior | Browser API pattern | Useful Playwright action | Observable consequence |
| --- | --- | --- | --- |
| Choose nearby store on load | getCurrentPosition once | Set initial geolocation before goto | First store query uses starting point |
| Track a courier | watchPosition | Call setGeolocation repeatedly | Marker and distance update in same page |
| Refresh delivery eligibility | getCurrentPosition on button click | Change location, then click Refresh | New zone request uses destination |
| Handle lost position | Error callback | Pass null to setGeolocation | Error guidance replaces stale certainty |
| Display precision warning | Read coords.accuracy | Change accuracy with same coordinates | Confidence indicator changes |

Do not demand live movement from a page designed for a one-time read. That would be a new feature, not a test. Conversely, reloading a watchPosition page avoids verifying the subscription and can hide the exact regression users encounter.

## Grant permission and set the starting coordinates before navigation

Geolocation needs two inputs: permission and a position. Grant geolocation for the application origin, then set the initial latitude, longitude, and optional accuracy on the context. Setting it before goto prevents a startup request from racing the fixture.

The following end-to-end test keeps a dashboard open while moving a courier from Bengaluru to a second coordinate. The application renders coordinates received from watchPosition and sends them to its tracking endpoint.

\`\`\`typescript
import { expect, test } from '@playwright/test';

test('updates an active location watch without reloading', async ({ context, page }) => {
  const origin = 'https://dispatch.example.test';
  await context.grantPermissions(['geolocation'], { origin });
  await context.setGeolocation({
    latitude: 12.9716,
    longitude: 77.5946,
    accuracy: 15,
  });

  const updates: Array<{ latitude: number; longitude: number }> = [];
  await page.route('**/api/couriers/me/position', async (route) => {
    const body = route.request().postDataJSON() as {
      latitude: number;
      longitude: number;
    };
    updates.push(body);
    await route.fulfill({ status: 202, json: { accepted: true } });
  });

  await page.goto(origin + '/route');
  await expect(page.getByTestId('current-coordinates')).toHaveText(
    '12.97160, 77.59460',
  );

  await context.setGeolocation({
    latitude: 12.9352,
    longitude: 77.6245,
    accuracy: 8,
  });

  await expect(page.getByTestId('current-coordinates')).toHaveText(
    '12.93520, 77.62450',
  );
  await expect.poll(() => updates.at(-1)).toEqual({
    latitude: 12.9352,
    longitude: 77.6245,
  });
});
\`\`\`

There is no page.reload and no second context. The test proves an existing subscription observed the update. The route assertion verifies the location left the browser in the expected domain shape, while the visible assertion verifies the user saw it.

Use coordinates reserved for tests, not a staff member's real home or current GPS trace. Named public landmarks can make scenarios understandable, but avoid implying street-level accuracy when the emulated accuracy says otherwise.

## Synchronize on location effects, not arbitrary pauses

setGeolocation resolves when Playwright has changed the emulated position, not when every application callback, state update, reverse-geocoding request, and map animation has completed. Wait for a consequence that belongs to the requirement.

For a location-aware API call, register page.waitForRequest before changing the context, then await it. For a watchPosition label, use an auto-retrying locator assertion. For a map, prefer an accessible place name, coordinate readout, or application state marker over pixel comparisons of moving tiles.

\`\`\`typescript
test('requests restaurants for the new position', async ({ context, page }) => {
  const origin = 'https://food.example.test';
  await context.grantPermissions(['geolocation'], { origin });
  await context.setGeolocation({ latitude: 40.7128, longitude: -74.006 });
  await page.goto(origin + '/nearby');

  const nextSearch = page.waitForRequest((request) => {
    const url = new URL(request.url());
    return (
      url.pathname === '/api/restaurants' &&
      url.searchParams.get('lat') === '40.73061' &&
      url.searchParams.get('lng') === '-73.935242'
    );
  });

  await context.setGeolocation({
    latitude: 40.73061,
    longitude: -73.935242,
    accuracy: 25,
  });

  await nextSearch;
  await expect(page.getByRole('heading', { name: 'Restaurants near Queens' })).toBeVisible();
});
\`\`\`

If the application rounds coordinates or sends a geohash, assert that public representation instead of copying internal floating-point calculations. Longitude and latitude are easy to reverse. Name variables and compare query keys explicitly so a transposition cannot produce a deceptively plausible location.

## Exercise zone boundaries with points chosen from domain fixtures

The highest-value changes often cross a business boundary: inside to outside a delivery polygon, permitted to restricted jurisdiction, or one tax region to another. Pick points from the same versioned fixture that defines the test environment's zones. Random points near a real border create uncertainty when map data changes.

A boundary suite needs more than “near” and “far.” Cover a comfortably inside point, a comfortably outside point, and any documented boundary convention. Geometry libraries differ on whether an edge counts as contained. That decision should be captured in the service contract, then observed through the browser.

| Transition | Starting condition | Destination condition | Product assertion |
| --- | --- | --- | --- |
| Serviceable to unsupported | Point well inside polygon | Point well outside | Add-to-cart becomes unavailable with explanation |
| Zone A to Zone B | Stable interior of A | Stable interior of B | Fee and promised window change |
| Same coordinates, lower confidence | Accuracy 10 m | Accuracy 5,000 m | Product asks user to confirm address |
| Valid fix to unavailable | Position object | null | Stale eligibility is not presented as current |
| Outside to inside after retry | null or outside point | Valid interior point | Recovery removes error and refreshes offer |

Keep price and tax expectations in seeded backend data. Browser geolocation supplies coordinates, but it does not stub reverse geocoding, routing, or zone services. Route those dependencies only when the test is about client behavior; leave a smaller set of deployed integration tests to verify the real service chain.

## Treat accuracy as input, not decorative metadata

The accuracy field is a non-negative number, conventionally interpreted in meters by the Web Geolocation API. Playwright defaults it to zero if omitted, which can imply impossible precision. Applications that gate sensitive actions based on confidence should receive realistic accuracy values.

Test accuracy independently from movement. Keep latitude and longitude fixed, change accuracy from 20 to 3,000, and assert the application changes confidence or requests an address confirmation. This catches code that reads only the coordinates and ignores uncertainty.

Do not test altitude, heading, or speed through setGeolocation because Playwright's context method accepts latitude, longitude, and accuracy. Inventing unsupported fields in a fixture makes the code look comprehensive while the browser ignores the fantasy. If the product consumes richer mobile sensor data, cover that layer through its native platform harness or an injectable location provider.

Coordinate validation also belongs at the boundary. Playwright requires latitude between -90 and 90, longitude between -180 and 180, and non-negative accuracy. A test expecting the web application to handle latitude 200 will fail in the automation layer before the page receives it. Validate malformed coordinates in the application's API or unit layer instead.

## Simulate unavailable position and recovery in the same session

Passing null to browserContext.setGeolocation emulates an unavailable position. This is different from removing permission. The first represents a granted consumer that cannot obtain a fix; the second represents authorization state. Product messages and recovery paths should distinguish them where the browser exposes enough information.

\`\`\`typescript
test('recovers after the current position becomes unavailable', async ({ context, page }) => {
  const origin = 'https://weather.example.test';
  await context.grantPermissions(['geolocation'], { origin });
  await context.setGeolocation({ latitude: 51.5072, longitude: -0.1276, accuracy: 30 });
  await page.goto(origin + '/local');
  await expect(page.getByRole('heading', { name: /London weather/i })).toBeVisible();

  await context.setGeolocation(null);
  await expect(page.getByRole('alert')).toContainText('Current location is unavailable');
  await expect(page.getByTestId('observation-age')).toContainText('Last known');

  await context.setGeolocation({ latitude: 51.4545, longitude: -2.5879, accuracy: 40 });
  await expect(page.getByRole('heading', { name: /Bristol weather/i })).toBeVisible();
  await expect(page.getByRole('alert')).toBeHidden();
});
\`\`\`

Whether the last known result remains visible is a product decision. Safety-sensitive workflows may need to hide it. Weather software may label it stale. Assert timestamps and language that prevent users from mistaking old coordinates for a current fix.

If null does not trigger an update in the supported engine for a particular application pattern, test the error callback through a narrow provider seam and keep a browser case for valid-to-valid movement. Do not silently convert unavailable into permission denied; they lead users to different remedies.

## Permission changes are a separate transition

context.clearPermissions removes overrides from the BrowserContext. The page's reaction to permission loss depends on browser behavior, the Permissions API, and whether a location request is already active. That is not equivalent to setGeolocation(null).

Design permission scenarios around what the product promises. If a settings screen watches permission state, clear the override and assert its guidance in a pinned browser project. If the page only asks for location after a click, begin without a grant and test the prompt-compatible user journey where CI supports it. Automated browser permission prompts are less portable than pre-granted positive paths.

Scope grants to the exact origin. A tenant redirect from app.example.test to north.app.example.test changes the origin, even if the parent domain looks familiar. When debugging, record page.url, window.isSecureContext, and navigator.permissions query state where supported. The [geolocation and permissions guide](/blog/playwright-emulation-geolocation-permissions-guide) covers those setup combinations in detail.

## Avoid rebuilding the context when movement is the requirement

Project-level use.geolocation is excellent for a fixed starting position. It is insufficient by itself when the test must move. Access the injected context fixture and call setGeolocation during the scenario. Recreating a context loses storage, service workers, WebSocket connections, map state, and the location watch whose behavior you intended to exercise.

BrowserContext remains the correct scope because geolocation affects every page in it. If two tabs represent the same signed-in courier, both can observe the update. That may be useful for a dispatcher-and-detail-page test, but it can surprise a suite that assumes page-local coordinates. Use separate contexts for actors that must occupy different places.

| Test topology | Context arrangement | Reason |
| --- | --- | --- |
| One page tracks movement | One context, repeated setGeolocation | Preserves subscription and session |
| Two tabs for one device | One context, two pages | Both share permission and position |
| Driver and customer in different cities | Two contexts | Each actor needs independent emulation |
| Fixed locale smoke suite | Project use.geolocation | Simple immutable starting condition |
| Permission-isolation check | Separate fresh contexts | Prevent override leakage |

The [Playwright browser context guide](/blog/playwright-browser-context-guide-2026) is the right companion when a location scenario includes multiple users. Remember that locale and timezone do not change automatically with coordinates. Moving from London to Tokyo leaves the configured locale and timezone untouched unless the test context was created differently. That is useful for a traveler scenario, but it must be intentional.

## Debug the location pipeline from browser event to rendered decision

A failed update can occur at several hops: context emulation, Geolocation callback, state store, debounce or throttle, backend request, reverse-geocoder response, or rendering. Capture evidence at those seams without turning production code inside out.

Expose a test-visible coordinate label in diagnostic builds if the map otherwise hides raw state. Record only synthetic coordinates in request logs. Listen for page console errors. Use route capture to show what the browser sent. If an update is throttled, control its documented timer with Playwright's clock in a separate focused case rather than mixing movement and complex time travel immediately.

Map tiles are a poor primary oracle. They arrive asynchronously, may be cached, and can change styling. Assert stable domain outputs such as zone name, delivery fee, distance band, or marker coordinates available through an accessible label. Use a visual check only when cartographic placement itself is the risk.

Finally, pin the Playwright browser versions in CI and run the movement case on every engine the product supports. Permission implementations differ, but setGeolocation plus a granted permission is designed for this use. A browser-specific failure should produce a documented compatibility decision, not a broad try/catch around the entire assertion.

## Test races between reverse-geocoding responses

The browser can deliver a new fix before an API request derived from the old fix completes. If the application does not abort or supersede the first lookup, a slower old response can overwrite the new address. Location movement tests should include this race whenever coordinates feed an asynchronous service.

Route the reverse-geocode endpoint and hold the response for the starting coordinates. After the request is observed, call \`context.setGeolocation()\` with the destination. Return the destination lookup immediately, assert the new locality, then release the starting response. The displayed locality must remain the destination. This proves latest-fix ownership without assuming that the implementation uses \`AbortController\`.

Assert request coordinates at the precision the product intentionally transmits. Exact floating-point strings couple the test to serialization details and may reward sending more location precision than the feature needs. Parse numeric query parameters, compare with a documented tolerance, and independently verify any rounding or geohash privacy rule.

If the product chooses to abort stale lookups, a focused test can observe the failed old request. Keep the UI assertion anyway. Transport cancellation is an implementation mechanism; preventing stale state is the lasting user contract.

## Represent a journey without inventing physics

Playwright supplies discrete fixes. It does not interpolate a route, calculate heading, or manufacture speed between calls. Build a journey fixture as an ordered list of named coordinates and expected domain transitions. A transit app might move from \`outsideStation\` to \`entrance\` to \`platform\`; a delivery app might cross the service polygon once.

Apply each fix only after the previous observable effect settles. This prevents a fast loop from coalescing callbacks and accidentally testing only the final point. If coalescing itself is a requirement, create a different stress scenario with an explicit allowed outcome.

Keep timestamps under separate control when the application derives velocity from distance over time. Advance browser time and coordinates together according to a declared trace, then assert the derived speed band rather than an unrealistic exact decimal. Confirm first that the application calculates speed locally. If it expects a native \`coords.speed\` value, \`setGeolocation()\` may not provide the input needed for that claim.

Journey fixtures should live near the zone or routing data they exercise. Include units, coordinate order, and why each point was selected. Swapped latitude and longitude can still be numerically valid and send a test thousands of kilometers away, so validate fixture ranges and give failures geographic meaning.

When a map clusters markers or snaps them to roads, avoid pixel comparisons as the only oracle. Assert the application's selected entity, coordinate payload, or accessible marker label, then reserve a small visual check for rendering. Tile-provider updates and font changes should not make a geolocation subscription test fail when the underlying location decision is correct.

## Frequently Asked Questions

### Can I call setGeolocation after the page has already loaded?

Yes. Calling browserContext.setGeolocation during the test changes the emulated position for pages in that context. A page using watchPosition can receive the update without reload; a page that called getCurrentPosition only once needs an explicit new read.

### Why did the coordinates change but the interface stay the same?

The application may not subscribe to changes, may throttle updates, or may be waiting on reverse geocoding. Verify the Geolocation API pattern, then synchronize on the relevant request or visible state rather than adding a timeout.

### Does changing geolocation also change timezone or locale?

No. Coordinates, timezone, and locale are separate context settings. A mid-test location change does not rebuild the context or automatically adopt destination regional settings.

### How do I represent a lost GPS fix without revoking permission?

Pass null to context.setGeolocation and assert the product's unavailable-position behavior. Use clearPermissions only for a distinct authorization scenario because the two conditions require different user guidance.

### Can two pages in one context have different emulated positions?

No. Geolocation is configured on BrowserContext, so pages in that context share it. Create separate contexts when two actors or devices must be in different locations.
`,
};
