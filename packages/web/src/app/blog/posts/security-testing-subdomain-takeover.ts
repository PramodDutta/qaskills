import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Security Testing Subdomain Takeover: DNS Claims, Probes, and Regression Guards',
  description: 'Master security testing subdomain takeover with DNS inventory, dangling CNAME detection, HTTP oracles, and CI probes that catch reclaimable hostnames before attackers do.',
  date: '2026-08-08',
  category: 'Guide',
  content: `
# Security Testing Subdomain Takeover: DNS Claims, Probes, and Regression Guards

Security testing subdomain takeover is the practice of finding hostnames that still resolve (or still appear in certificates and configs) but no longer point at infrastructure your organization controls. When a DNS record remains after a SaaS project, cloud bucket, CDN distribution, or PaaS app is deleted, an attacker can claim the empty resource under the same third-party service and serve content under your trusted subdomain.

QA and security automation engineers should treat takeover risk as a continuous inventory problem, not a one-off pen-test checkbox. The workflow is: enumerate candidate names, classify the DNS answer, probe HTTP and TLS behavior, match fingerprints of claimable platforms, file tickets with evidence, and re-scan after every environment teardown. This guide gives concrete Node, dig-style, and CI-friendly checks you can run in staging and production-adjacent pipelines without inventing proprietary scanner magic.

A takeover is not the same as a generic open redirect or a misconfigured CORS header. The trust model is different: browsers, SSO cookies scoped to parent domains, OAuth redirect URI allowlists, email links, and mobile deep links may already treat \`staging.example.com\` as part of your brand. If that name becomes attacker-controlled content, phishing and token leakage get a first-party-looking host. Pair this work with identity-layer tests such as the [JWT algorithm confusion testing guide](/blog/security-testing-jwt-algorithm-confusion) when stolen cookies or forged tokens matter, and with [JWT key rotation and JWKS cache testing](/blog/testing-jwt-key-rotation-jwks-cache) when auth endpoints live on subdomains that must stay under your control.

## Map the subdomain surface your product actually exposes

Before you write probes, build a living inventory. Attackers do not limit themselves to the three environments listed in your runbook. They mine certificate transparency logs, historical DNS, marketing microsites, forgotten preview environments, partner CNAMEs, and old SaaS integrations that still appear in DNS.

| Source of names | What you extract | Why it matters for takeover | How often to refresh |
|---|---|---|---|
| Authoritative DNS zone export | A, AAAA, CNAME, MX, TXT, NS | Primary truth for dangling records | On every zone change plus daily |
| Certificate Transparency | SANs and CN values | Names that once needed TLS may linger in DNS | Daily or weekly |
| Cloud account inventories | Load balancers, buckets, CDN hostnames | Resource deleted while CNAME remains is classic | On destroy pipelines |
| CI preview host patterns | \`pr-123.preview.example.com\` | Ephemeral systems often leave wildcards or stale CNAMEs | Per merge + weekly sweep |
| SaaS admin consoles | Custom domain attachments | Vendor claims the name only while subscription is active | Quarterly + offboarding |
| Historical backups of configs | Hardcoded host strings | Detect names nobody renews | On major releases |

Write the inventory as structured data, not a wiki page. A minimal JSON shape is enough for automation:

\`\`\`json
{
  "domain": "example.com",
  "hosts": [
    {
      "name": "assets.example.com",
      "owner_team": "platform",
      "expected_provider": "cloudfront",
      "expected_targets": ["d111111abcdef8.cloudfront.net"],
      "criticality": "high",
      "notes": "static assets and download links"
    },
    {
      "name": "status.example.com",
      "owner_team": "sre",
      "expected_provider": "statuspage",
      "expected_targets": ["example.statuspage.io"],
      "criticality": "medium",
      "notes": "public status page"
    }
  ]
}
\`\`\`

Criticality should reflect abuse impact, not pageviews alone. A low-traffic \`auth-callback.example.com\` used only by an old mobile app can still be high risk if it appears in redirect allowlists. Mark hosts that sit on cookie parent domains, that appear in CSP or CORS allowlists, or that receive email verification links as high even if marketing never promotes them.

## Understand the DNS states that create reclaim risk

Subdomain takeover testing is DNS-first. HTTP fingerprints only make sense after you know what the name resolves to and whether that resolution still points at something claimable.

| DNS observation | Typical meaning | Takeover hypothesis | First QA action |
|---|---|---|---|
| CNAME to third-party hostname, NXDOMAIN at target | Dangling CNAME | High: resource may be claimable | Confirm provider fingerprint and claim path in lab |
| CNAME to third-party, HTTP 404 with provider page | Resource gone, domain still attached in DNS | High if provider allows re-registration | Capture body signature and ticket with dig evidence |
| A/AAAA to unallocated or wrong cloud IP | Stale address record | Medium: depends on IP ownership | Check cloud account for released elastic IPs |
| NXDOMAIN for the subdomain | Name not published | Usually low, unless wildcard covers it | Confirm no wildcard parent; keep CT monitoring |
| SERVFAIL or intermittent answers | Misconfigured zone or split horizon | Investigate reliability separately | Do not mark safe solely because HTTP fails |
| CNAME chain longer than one hop | Nested vendor or CDN setup | Medium: any hop can dangle | Resolve full chain and validate final target |

People get wrong the idea that "it returns 404 so it is safe." A 404 from a claimable platform often means the custom domain is still pointed at that platform, but the project no longer exists. That is exactly the state an attacker wants: DNS already aims at the platform, so claiming a new empty project with the same custom domain can put their content on your hostname.

Another wrong assumption is that only CNAMEs matter. Stale A records to decommissioned load balancers, forgotten NS delegations for a subdomain zone, and leftover ACME challenge CNAMEs can all produce trust problems. NS delegation takeover is rarer in day-to-day SaaS cleanup but higher impact when it happens, because the attacker controls the whole zone.

## Build a resolution and fingerprint pipeline in Node

Use public resolvers carefully and prefer your authoritative view for truth, but also query a public resolver to see what the world sees. Differences between internal and public answers are themselves findings (split-horizon surprises).

The following Node script resolves CNAME chains, records addresses, and fetches a short HTTP body for fingerprinting. It does not attempt to claim anything. It only produces evidence for humans.

\`\`\`js
import { promises as dns } from "node:dns";
import { request as httpsRequest } from "node:https";
import { request as httpRequest } from "node:http";

const resolver = new dns.Resolver();
resolver.setServers(["1.1.1.1", "8.8.8.8"]);

async function resolveChain(hostname, depth = 0, seen = new Set()) {
  if (depth > 8 || seen.has(hostname)) {
    return { hostname, error: "loop_or_depth", chain: [...seen] };
  }
  seen.add(hostname);
  try {
    const cnames = await resolver.resolveCname(hostname);
    if (cnames.length > 0) {
      const next = cnames[0].replace(/\\.$/, "");
      const nested = await resolveChain(next, depth + 1, seen);
      // Do not spread nested over this host: it would overwrite hostname and
      // cname with the far end of the chain. Keep it as a nested field instead.
      return {
        hostname,
        cname: next,
        resolved: nested,
        chain: [hostname, next, ...(nested.chain ?? []).filter((h) => h !== hostname && h !== next)],
      };
    }
  } catch (error) {
    if (error.code !== "ENODATA" && error.code !== "ENOTFOUND") {
      return { hostname, error: error.code || String(error), chain: [...seen] };
    }
  }

  const result = { hostname, chain: [...seen], addresses: { a: [], aaaa: [] } };
  try {
    result.addresses.a = await resolver.resolve4(hostname);
  } catch (error) {
    result.aError = error.code || String(error);
  }
  try {
    result.addresses.aaaa = await resolver.resolve6(hostname);
  } catch (error) {
    result.aaaaError = error.code || String(error);
  }
  // A bare NXDOMAIN shows up as ENOTFOUND on both address lookups, never as
  // result.error, so surface it explicitly for the callers that check for it.
  if (result.aError === "ENOTFOUND" && result.aaaaError === "ENOTFOUND") {
    result.error = "ENOTFOUND";
  }
  return result;
}

function fetchHead(url, timeoutMs = 8000) {
  return new Promise((resolve) => {
    const lib = url.startsWith("https:") ? httpsRequest : httpRequest;
    const req = lib(url, { method: "GET", timeout: timeoutMs, headers: { "user-agent": "qa-subdomain-takeover-probe/1.0" } }, (res) => {
      const chunks = [];
      res.on("data", (c) => {
        if (Buffer.concat(chunks).length < 4096) chunks.push(c);
      });
      res.on("end", () => {
        resolve({
          url,
          status: res.statusCode,
          headers: res.headers,
          bodySample: Buffer.concat(chunks).toString("utf8"),
        });
      });
    });
    req.on("error", (error) => resolve({ url, error: String(error.message || error) }));
    req.on("timeout", () => {
      req.destroy();
      resolve({ url, error: "timeout" });
    });
    req.end();
  });
}

const FINGERPRINTS = [
  { id: "github-pages", regex: /There isn't a GitHub Pages site here/i, provider: "GitHub Pages" },
  { id: "heroku", regex: /No such app/i, provider: "Heroku" },
  { id: "shopify", regex: /Sorry, this shop is currently unavailable/i, provider: "Shopify" },
  { id: "aws-s3", regex: /NoSuchBucket|The specified bucket does not exist/i, provider: "AWS S3" },
  { id: "azure", regex: /404 Web Site not found/i, provider: "Azure App Service" },
];

function matchFingerprints(body = "") {
  return FINGERPRINTS.filter((f) => f.regex.test(body)).map((f) => f.id);
}

export async function probeHost(name) {
  const dnsResult = await resolveChain(name);
  const httpResult = await fetchHead(\`http://\${name}/\`);
  const httpsResult = await fetchHead(\`https://\${name}/\`);
  const body = \`\${httpResult.bodySample || ""}\\n\${httpsResult.bodySample || ""}\`;
  return {
    name,
    dns: dnsResult,
    http: httpResult,
    https: httpsResult,
    fingerprints: matchFingerprints(body),
    riskHints: classifyRisk(dnsResult, httpResult, httpsResult, matchFingerprints(body)),
  };
}

function classifyRisk(dnsResult, httpResult, httpsResult, fingerprints) {
  const hints = [];
  if (dnsResult.cname && (dnsResult.aError === "ENOTFOUND" || dnsResult.aaaaError === "ENOTFOUND")) {
    hints.push("cname_present_target_may_be_missing");
  }
  if (fingerprints.length) {
    hints.push(\`provider_fingerprint:\${fingerprints.join(",")}\`);
  }
  if (httpResult.status === 404 || httpsResult.status === 404) {
    hints.push("http_404_review_provider_claim_rules");
  }
  if (dnsResult.error === "ENOTFOUND" && !dnsResult.cname) {
    hints.push("nxdomain_publicly");
  }
  return hints;
}
\`\`\`

Keep fingerprint lists conservative. Vendor error pages change. Prefer exact phrases published by your security team after validation, and version the list in git so false positives are reviewable. Never auto-claim a domain from CI. The pipeline's job is detection and evidence, not exploitation.

## Run dig and certificate evidence for tickets

Engineers who only paste a screenshot of a 404 page force security reviewers to re-run the investigation. Attach resolution evidence, the CNAME target, the HTTP status, and a short body hash or excerpt.

\`\`\`bash
# Capture public resolution for a candidate host
HOST="assets.example.com"

echo "=== dig CNAME ==="
dig +noall +answer "\${HOST}" CNAME @1.1.1.1

echo "=== dig A/AAAA ==="
dig +noall +answer "\${HOST}" A @1.1.1.1
dig +noall +answer "\${HOST}" AAAA @1.1.1.1

echo "=== follow CNAME chain with +trace (noisy; use carefully) ==="
# dig "\${HOST}" +trace

echo "=== TLS certificate SANs if HTTPS answers ==="
echo | openssl s_client -servername "\${HOST}" -connect "\${HOST}:443" 2>/dev/null \\
  | openssl x509 -noout -subject -ext subjectAltName 2>/dev/null || true
\`\`\`

When the CNAME target itself returns NXDOMAIN, state that clearly in the ticket title, for example: "Dangling CNAME: assets.example.com -> missing.vendor.example." Include the time of observation in UTC and the resolver used. DNS caches and multi-region differences can confuse responders if you omit those fields.

## Design HTTP oracles that distinguish "broken" from "claimable"

Not every 404 is a takeover. Distinguish:

1. **Your application 404** on infrastructure you still operate (safe-ish, product issue).
2. **Provider default 404** for an unclaimed or deleted project (takeover candidate).
3. **Parked domain or registrar page** (different ownership problem).
4. **TLS handshake failure** with name mismatch (may still be dangerous if HTTP works or if cert later becomes claimable).

A practical oracle table for QA:

| Signal bundle | Likely class | Severity if confirmed | Suggested next step |
|---|---|---|---|
| CNAME to SaaS + provider "no such app" body | Classic dangling custom domain | High | Remove DNS or re-attach resource; open Sev ticket |
| CNAME to CDN + origin missing | CDN still online, origin dead | Medium to high | Confirm whether CDN endpoint can be recreated by others |
| Only NXDOMAIN | Name unused | Low (monitor CT) | Ensure no leftover cookies/auth allowlists still trust it |
| Resolves to your LB + app 404 | Product missing route | Low for takeover | Hand to product; keep DNS ownership checks green |
| Wildcard DNS covers random labels | Broad exposure surface | Medium | Inventory which labels are intentional |

Automate classification with allowlists of "our" response headers and HTML markers. If the body contains your standard error layout and \`server\` header matches your edge, treat it as owned infrastructure even when the path is missing. If the body matches a vendor template and the CNAME target is that vendor, treat it as a takeover candidate until proven otherwise.

## Walk through a realistic failure mode and diagnosis

**Failure mode:** A team decommissions a Heroku staging app used for partner demos. Terraform destroys the app. The CNAME \`partners-demo.example.com -> ancient-demo.herokuapp.com\` remains because DNS lived in a different repository. Three months later, certificate transparency still shows the name from an old cert. An external report claims the page shows "No such app." Marketing is embarrassed; security is alarmed.

**Diagnosis path:**

1. Confirm public CNAME still points at Heroku.
2. Confirm \`ancient-demo.herokuapp.com\` is not in any team account.
3. Capture HTTP body matching the known Heroku missing-app page.
4. Check whether the parent domain cookie scope (\`Domain=.example.com\`) could make a phishing page more effective.
5. Search code and IdP configs for \`partners-demo.example.com\` in redirect URIs.
6. Remove or retarget the DNS record, then re-run probes until NXDOMAIN or owned content appears.
7. Add a destroy-time checklist: every app teardown must open a PR against the DNS inventory.

**What people get wrong:** deleting the application first and "cleaning DNS later." DNS is the control plane for takeover risk. Prefer: detach custom domain in the vendor UI, remove DNS, wait for TTL, then destroy the resource. If destroy must come first, the DNS PR should be prepared and merged in the same change window.

## Write regression tests that fail when a host becomes dangling

Unit-style tests cannot fully prove internet DNS, but you can gate merges that change infrastructure, and you can run scheduled jobs against production names. Separate **policy tests** (inventory completeness) from **live probes** (resolution and fingerprints).

\`\`\`js
import { describe, it, expect } from "vitest";
import inventory from "./subdomain-inventory.json" with { type: "json" };
import { probeHost } from "./probe.js";

describe("subdomain inventory policy", () => {
  it("requires owner and expected provider for every high criticality host", () => {
    for (const host of inventory.hosts) {
      if (host.criticality !== "high") continue;
      expect(host.owner_team, host.name).toBeTruthy();
      expect(host.expected_provider, host.name).toBeTruthy();
      expect(Array.isArray(host.expected_targets), host.name).toBe(true);
      expect(host.expected_targets.length, host.name).toBeGreaterThan(0);
    }
  });

  it("forbids overlapping ownership ambiguity on the same name", () => {
    const names = inventory.hosts.map((h) => h.name);
    expect(new Set(names).size).toBe(names.length);
  });
});

describe("live takeover probes", () => {
  it(
    "does not report provider fingerprints on owned high-criticality hosts",
    async () => {
      const highs = inventory.hosts.filter((h) => h.criticality === "high");
      for (const host of highs) {
        const result = await probeHost(host.name);
        expect(result.fingerprints, JSON.stringify(result)).toEqual([]);
        if (result.dns.cname) {
          const normalized = result.dns.cname.replace(/\\.$/, "").toLowerCase();
          const allowed = host.expected_targets.map((t) => t.toLowerCase());
          // t.endsWith(normalized) must not be here: it would accept the bare vendor
          // apex (statuspage.io) where example.statuspage.io was expected.
          expect(allowed.some((t) => normalized === t || normalized.endsWith("." + t))).toBe(true);
        }
      }
    },
    60_000
  );
});
\`\`\`

Run live probes on a schedule (nightly) rather than on every PR unless the PR touches DNS or inventory files. Live DNS in PR CI is useful when Terraform plans change records; it is noisy when public resolvers rate-limit or when dual-stack differs by region.

## Integrate with destroy pipelines and infrastructure reviews

Treat subdomain takeover testing as a companion to infrastructure as code reviews. When a PR removes a cloud resource that had a public hostname, require a linked DNS change or an inventory update marking the name retired.

Example GitHub Actions job sketch for a nightly scan (illustrative structure; adjust secrets and notify steps to your org):

\`\`\`yaml
name: subdomain-takeover-probes
on:
  schedule:
    - cron: "17 6 * * *"
  workflow_dispatch:

jobs:
  probe:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      issues: write
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "22"
      - name: Install and run probes
        run: |
          npm ci
          node scripts/run-subdomain-probes.mjs --inventory config/subdomain-inventory.json --out artifacts/probe-report.json
      - name: Fail on high-risk hints
        run: node scripts/assert-no-high-risk.mjs artifacts/probe-report.json
      - name: Upload report
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: subdomain-probe-report
          path: artifacts/probe-report.json
\`\`\`

The assert script should exit non-zero when risk hints include provider fingerprints on production hosts, or when expected CNAME targets drift. Wire notifications to the owning team from the inventory file, not to a generic security inbox only. Ownership latency is how dangling records age into real incidents.

## Cover wildcards, multi-level names, and delegated zones

Wildcards (\`*.preview.example.com\`) complicate takeover testing. A wildcard CNAME to a PaaS means any label under that zone may resolve to the provider. Your inventory should list the wildcard intentionally, and probes should sample random labels plus known labels.

\`\`\`js
import { randomBytes } from "node:crypto";

export function sampleWildcardLabels(base = "preview.example.com", count = 3) {
  const samples = ["canary", "docs", "legacy"];
  for (let i = 0; i < count; i += 1) {
    samples.push(\`probe-\${randomBytes(4).toString("hex")}\`);
  }
  return samples.map((label) => \`\${label}.\${base}\`);
}
\`\`\`

For delegated zones (\`NS\` records for \`corp.example.com\`), verify that name servers still belong to you. A forgotten child zone at a registrar or cloud DNS product is a high-impact variant of takeover. Testing looks different: check NS set membership against an allowlist rather than HTTP fingerprints alone.

## Tie subdomain trust to authentication boundaries

Subdomains are not only content hosts. They appear in:

- Cookie \`Domain\` attributes
- OAuth redirect URI allowlists
- CORS \`Access-Control-Allow-Origin\` reflection or lists
- CSP \`frame-ancestors\` and script sources
- Mobile associated domains / asset links
- Webhook callback URLs

A reclaimable subdomain that remains in an OAuth redirect allowlist is a credential phishing primitive even if the marketing site never linked to it. When you retire a host, search identity configs in the same change. That is why this topic sits next to JWT and JWKS testing: the hostname is part of the trust fabric, not only the DNS spreadsheet.

If your agents install ready-made QA skills from qaskills.sh with the qaskills CLI, prefer skills that encode inventory-plus-probe workflows over skills that only curl a homepage. The durable value is the closed loop from DNS truth to ticket evidence to destroy-time guards.

## Write clear severity language for reports

Avoid vague "possible takeover" titles. Security and platform teams triage faster with explicit claims:

\`\`\`text
Title: High: dangling CNAME partners-demo.example.com -> ancient-demo.herokuapp.com (provider fingerprint)

Evidence:
- dig @1.1.1.1 CNAME partners-demo.example.com => ancient-demo.herokuapp.com
- GET https://partners-demo.example.com/ => 404 body matches Heroku "No such app"
- Inventory owner: growth-eng; criticality: high (legacy partner OAuth redirect URI still listed)
- First seen: 2026-08-08T06:17:00Z

Recommended fix:
1) Remove OAuth redirect URI if unused
2) Delete DNS CNAME after vendor custom domain detach
3) Re-run probe until NXDOMAIN or owned content
4) Add destroy pipeline checklist item for DNS PR
\`\`\`

Severity depends on claimability and trust reuse. If the provider no longer allows custom domain claims for that product tier, severity may drop, but stale DNS is still hygiene debt. If the name is on a cookie parent domain and still listed in auth allowlists, keep severity high even when content is "only" a provider 404.

## Expand the payload of automation without becoming a scanner vendor

Your job as a QA engineer is not to maintain a full competitive takeover scanner. Focus on:

1. **Authoritative inventory completeness** for names you claim to operate.
2. **Expected target drift** when CNAMEs change without inventory updates.
3. **Fingerprint hits** on a vetted, small set of providers your company actually uses.
4. **Destroy-time coupling** so teardowns cannot strand DNS.
5. **Identity config greps** for retired hostnames.

Leave broad internet-wide discovery (all CT names for the registrable domain) to security engineering if that function exists, but still consume their findings into the same inventory format. Unified data beats parallel spreadsheets.

## CI noise control and false positive handling

False positives destroy trust in takeover jobs. Common causes:

- Temporary provider outages mimicking "no such app"
- Regional differences in anycast content
- WAF challenge pages that look like generic errors
- Inventory expected targets that use alternate CDN hostnames
- IPv6-only failures when your probe network is IPv4-only

Mitigations:

| Problem | Mitigation |
|---|---|
| Transient provider pages | Require two failing probes spaced 15+ minutes apart before paging |
| CDN hostname aliases | Store multiple allowed targets per inventory row |
| WAF interstitials | Detect challenge markers and classify as "inconclusive," not takeover |
| Dual-stack asymmetry | Record A and AAAA separately; alert on mixed ownership signals |
| Rate limits | Backoff, cache DNS for the job duration, shard by zone |

\`\`\`js
export function shouldOpenTicket(results) {
  // results: array of probe snapshots over time for one host
  if (results.length < 2) return false;
  const lastTwo = results.slice(-2);
  return lastTwo.every((r) => r.fingerprints.length > 0 && r.riskHints.includes("http_404_review_provider_claim_rules"));
}
\`\`\`

## Operational playbooks for the three most common cloud cleanups

**Static bucket or object storage website:** Custom domain CNAME remains after bucket deletion. Fix by removing DNS, or recreating bucket only if still needed, with block public access policies that match intent. Confirm no public ACL surprises when recreating names that attackers might race.

**CDN distribution:** Distribution disabled or deleted while customer domain still points at it. Confirm whether distribution IDs or alternate domain names can be associated by another account (provider-specific). Prefer removing DNS first when retiring brands.

**PaaS web app:** App deleted, CNAME remains. Detach domain in vendor UI when possible, remove DNS, then destroy. Search logs for residual traffic that might indicate partners still using the hostname.

Each playbook should end with the same acceptance checks: inventory updated, live probe green, auth allowlists cleaned, monitoring alerts adjusted.

## How AI coding agents should help without inventing DNS

Agents are good at grepping repos for host strings, generating inventory JSON from Terraform modules, and writing assert scripts. They are bad at inventing provider claim procedures or guessing that a fingerprint string still exists. Constrain agents with:

- A checked-in list of providers your company uses
- A forbid list: no domain registration, no vendor signup automation, no production DNS mutation from the agent
- Required evidence fields in any ticket they draft
- Tests that run against a local fake DNS and HTTP stack in unit mode

Local fakes make development fast:

\`\`\`js
import { createServer } from "node:http";

// Local oracle for unit tests: simulates a provider missing-app page
export function startFakeProvider(port = 0) {
  const server = createServer((req, res) => {
    res.writeHead(404, { "content-type": "text/html" });
    res.end("<html><body>No such app</body></html>");
  });
  return new Promise((resolve) => {
    server.listen(port, "127.0.0.1", () => {
      const address = server.address();
      resolve({ server, port: address.port });
    });
  });
}
\`\`\`

Unit-test your fingerprint matcher and risk classifier against these fakes. Reserve real DNS for scheduled integration jobs with clear ownership.

## Measure program health, not vanity scan counts

Track a small set of operational metrics (illustrative targets, tune to your org):

| Metric | Why it matters | Unhealthy signal |
|---|---|---|
| % of public hosts with owner_team set | Accountability | Many unowned names |
| Mean time from dangling detection to DNS fix | Risk window | Days of open dangling CNAMEs |
| Inventory drift rate (probe target != expected) | Change control | Frequent silent CDN renames |
| Destroy PRs missing DNS checklist | Process coupling | Teardowns without DNS links |
| False positive ticket rate | Trust in automation | Teams ignoring the job |

If mean time to fix is high, invest in automated DNS PRs or self-service runbooks before adding more fingerprint vendors.

## Close the loop after remediation

After DNS changes, wait for TTL, then re-probe from public resolvers. Confirm:

1. Old CNAME is gone or points at owned targets.
2. HTTP/HTTPS show owned content or expected NXDOMAIN.
3. Certificates no longer need the retired name (or are reissued without it).
4. Auth and CORS allowlists no longer mention it.
5. Inventory marks the name \`retired\` with a date rather than deleting history.

Historical rows help when CT or old emails resurface questions months later.

## Putting it together as a weekly QA rhythm

Monday: review nightly probe failures and assign owners from inventory.  
Wednesday: sample CT for new names under your registrable domains and diff against inventory.  
Friday: audit destroy PRs merged that week for DNS checklist compliance.  
Monthly: refresh fingerprint strings against a lab claim exercise owned by security (not CI).  
Quarterly: tabletop a phishing scenario that uses a reclaimable host on your cookie domain.

This rhythm keeps security testing subdomain takeover concrete: names, records, evidence, fixes, and regression guards. It is not a single scanner flag. It is a product of inventory discipline and destroy-time hygiene.

## Frequently Asked Questions

### Is a 404 on a subdomain enough evidence of subdomain takeover?

No. A 404 only shows that the HTTP resource is missing. Takeover risk appears when DNS still points at a third-party platform where someone else can attach your hostname, often with a provider-specific error page. Confirm the CNAME or alias target, match a vetted fingerprint, and verify the resource is not still in your accounts. Your own application 404 on infrastructure you control is usually a product defect, not a reclaimable DNS state. Always attach dig output and the provider target in tickets so responders can distinguish the cases quickly.

### Should takeover probes run on every pull request?

Usually no. Run inventory policy tests on every PR that touches DNS, Terraform, or the inventory file. Run live public DNS and HTTP probes on a schedule, and additionally on changes that modify host records. Live probes are sensitive to rate limits, regional variance, and transient provider pages. Nightly jobs with two-phase confirmation reduce false pages. Feature branches that only change application code rarely need full public resolution checks unless they introduce new external hostnames.

### How do wildcard DNS records change the testing strategy?

A wildcard that CNAMEs to a SaaS or PaaS expands the set of labels that can resolve to claimable infrastructure. Inventory the wildcard itself, sample both known labels and random labels, and ensure destroy processes cannot leave the wildcard aimed at a deleted shared project. Random probes catch unexpected provider pages under labels nobody documented. Also verify that authentication allowlists never use overly broad redirect patterns that would trust arbitrary labels under the wildcard zone.

### What should developers do before deleting a cloud app with a custom domain?

Detach the custom domain in the vendor console when the product supports it, open a DNS change to remove or retarget the record, search auth and CORS configs for the hostname, update the subdomain inventory row to retired, and only then destroy the app. After TTL expiry, re-run public probes until results match the intended end state. Document the order in your destroy pipeline so DNS and identity cleanup cannot lag months behind infrastructure deletion, which is the usual root cause of dangling CNAMEs.
`,
};
