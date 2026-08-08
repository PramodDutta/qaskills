import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Accessibility Testing Video Captions Audio: A Complete QA Workflow',
  description: 'Apply accessibility testing video captions audio workflows to verify accurate text tracks, transcripts, audio description, controls, and playback states.',
  date: '2026-08-08',
  category: 'Guide',
  content: `
# Accessibility Testing Video Captions Audio: A Complete QA Workflow

Accessibility testing for video captions and audio means verifying that people can obtain the important spoken, sound, and visual information without depending on one sense. For prerecorded synchronized video, test accurate synchronized captions and the required alternative for meaningful visual content. At WCAG 2.2 Level AA, prerecorded synchronized video also requires audio description when the visuals convey information that the main audio does not already communicate.

The reliable workflow starts with a media inventory, not a DOM scanner. Classify each asset as prerecorded or live, audio-only, video-only, or synchronized audio and video. Then review content semantics, inspect track delivery, operate the player with keyboard and assistive technology, verify captions across playback states and layouts, and confirm that audio description or a complete media alternative communicates the visual information. Automation can catch missing files, malformed WebVTT, wrong labels, unreachable tracks, and broken controls. Human review is still required for accuracy, timing, speaker identification, and equivalence.

This guide turns that workflow into testable acceptance criteria with HTML, WebVTT, Node, shell, and Playwright examples. It distinguishes captions from subtitles, transcripts from synchronized alternatives, and metadata presence from genuine accessibility, then shows how to diagnose a failure that passes automated checks but blocks real users.

## Classify the media before choosing assertions

The applicable requirement depends on what the media contains and whether it is live. A silent product animation, a prerecorded webinar, a live town hall, and an audio podcast need different alternatives. Do not apply one checklist to every \`video\` or \`audio\` element.

| Media type | Information channels | Primary accessibility work | Testing focus |
|---|---|---|---|
| Prerecorded synchronized video | Speech, sounds, visuals | Captions plus access to meaningful visual information | Accuracy, timing, description, controls |
| Live synchronized video | Live speech and visuals | Live captions at the applicable conformance level | Availability, latency, correction, resilience |
| Prerecorded audio-only | Speech and sounds | Equivalent time-based media alternative, commonly a transcript | Completeness, reading order, identification |
| Prerecorded video-only | Visual action or instruction | Text alternative for time-based media or audio track | Equivalent sequence and visual meaning |
| Decorative silent motion | No information or function | Hide appropriately and prevent disruption | No misleading alternative, motion behavior |
| Media alternative for existing text | Restates nearby text and is labeled | Exception may apply under defined criteria | Label and true equivalence to source text |

WCAG 2.2 Guideline 1.2 is the standards anchor. Captions for prerecorded synchronized media are covered by Success Criterion 1.2.2 at Level A. Success Criterion 1.2.3 at Level A permits an alternative for time-based media or audio description for prerecorded video content in synchronized media. At Level AA, Success Criterion 1.2.5 requires audio description for prerecorded video content in synchronized media. If all meaningful visual information is already conveyed by the main audio, additional audio description is not necessary. Official requirements and explanations are available at https://www.w3.org/TR/WCAG22/ and https://www.w3.org/WAI/WCAG22/Understanding/time-based-media.html.

Write an asset-level decision record. State the media type, target conformance level, spoken language, whether visual-only information exists, which alternatives are supplied, player technology, owner, and review date. If a training video says "click the green button" while showing three unlabeled controls, note that the visual state carries essential information. If the narrator says "Select Export in the upper-right corner" and the screen merely demonstrates that instruction, separate description may add no new meaning.

An accessibility inventory should include embedded third-party players and videos loaded after consent. The application team still needs an acceptance decision even when another platform hosts the file. Test the actual integrated experience, because captions can exist on the vendor page yet be unavailable in the embed configuration.

## Define a semantic oracle for every media alternative

Presence is not equivalence. A \`track\` element can point to an empty file. A transcript can omit demonstrations. Auto-generated captions can misrecognize product names and negation. An audio-description toggle can reload the same undescribed audio. Define what a qualified reviewer must hear or read.

For captions, the oracle includes all meaningful speech, speaker identification when the speaker is not visually obvious, relevant non-speech sound, meaningful music cues, correct language, readable segmentation, and synchronization close enough to associate text with the event. Do not invent a universal timing tolerance as a conformance rule. Establish an operational threshold for your product, then combine it with human judgment about comprehension.

For audio description, list visual facts required to understand or operate the content: actions, scene changes, expressions when meaningful, identities, on-screen text, chart changes, cursor location, and demonstrated steps. Description should fit without obscuring important dialogue or sounds. If pauses are insufficient, production may need an extended described version or a more complete alternative, depending on the conformance target and content.

| Alternative | Must communicate | Does not automatically satisfy |
|---|---|---|
| Captions | Speech plus relevant audio information in time | Meaningful visual-only actions |
| Subtitles | Dialogue translation or transcription for language access | Full caption needs for sound effects and speaker cues |
| Basic transcript | Spoken words and meaningful sounds in document form | Synchronized caption requirement for video |
| Descriptive transcript | Auditory and visual information in sequence | Level AA audio-description requirement for prerecorded synchronized video |
| Audio description | Important visual information through narration | Captions for spoken and non-speech audio |
| Text \`descriptions\` track | Timed visual descriptions for supporting user agents | A reliably exposed recorded audio-description option in every player |

What people get wrong is treating a transcript as a universal replacement for captions. A transcript is valuable and may satisfy requirements for audio-only content or serve as a media alternative in specific cases, but it is not synchronized with a video's changing context. Users who need captions must be able to associate text with the corresponding speaker, action, and sound during playback.

Record source truth before review. Give the reviewer the final edited video, script, terminology list, speaker names, and description plan. A preproduction script alone is not sufficient if editing changed words, sequence, demonstrations, or on-screen text.

## Inspect the player markup and track contract

Native HTML media semantics provide a strong baseline. A \`track\` element associates an external timed text resource with video. The \`kind\` distinguishes captions, subtitles, descriptions, chapters, and metadata. Captions include dialogue and relevant audio information, while subtitles primarily address language understanding. The current HTML media specification is at https://html.spec.whatwg.org/multipage/media.html.

This example exposes English captions, Spanish subtitles, and text descriptions. It also provides links to a transcript and a separately produced described version, which is often more reliably usable than assuming every browser will synthesize a descriptions track.

\`\`\`html
<figure>
  <video controls preload="metadata" width="960" poster="lesson-poster.jpg">
    <source src="lesson.mp4" type="video/mp4" />
    <track
      kind="captions"
      src="lesson.en.vtt"
      srclang="en"
      label="English captions"
      default
    />
    <track
      kind="subtitles"
      src="lesson.es.vtt"
      srclang="es"
      label="Español"
    />
    <track
      kind="descriptions"
      src="lesson.descriptions.en.vtt"
      srclang="en"
      label="English text descriptions"
    />
    Your browser does not support HTML video.
  </video>
  <figcaption>
    Configure an automated test in the sample application.
    <a href="lesson-transcript.html">Read the descriptive transcript</a>.
    <a href="lesson-described.mp4">Play the audio-described version</a>.
  </figcaption>
</figure>
\`\`\`

The captions label should be understandable in the player's menu, particularly when several languages or variants exist. \`srclang\` identifies the track language. Use \`default\` deliberately because it influences the initially enabled track, and verify the behavior against user preferences and product requirements. Do not put \`autoplay\` on media with sound unless the experience meets applicable controls and user expectations.

Inspect the actual network response for every track. It should return successfully, contain the intended version, and use an appropriate media type such as \`text/vtt\`. Cross-origin media delivery may require correct CORS configuration. A DOM element with a broken \`src\` is not an available caption.

If a custom player replaces native controls, inspect accessible names, roles, states, focus order, keyboard behavior, visible focus, and announcements for play, pause, mute, volume, timeline, captions, language, description, speed, picture-in-picture, and fullscreen features that exist. The exact control set varies, but every offered control must be operable and expose its state.

Tie this work to the page's wider [focus order testing workflow](/blog/accessibility-testing-focus-order-guide). Media controls are often where otherwise sound page-level keyboard order breaks down, especially when menus open in portals or controls disappear visually.

## Validate WebVTT structure before reviewing language

WebVTT is a timed text format used for captions, subtitles, descriptions, chapters, and metadata. A file begins with \`WEBVTT\`, then contains cues with start and end timestamps. Structural validation catches empty files, reversed intervals, overlapping mistakes under your editorial policy, and cues outside media duration. It cannot decide whether the words are correct.

Here is a small captions file for a product lesson:

\`\`\`vtt
WEBVTT

00:00:00.800 --> 00:00:03.400
NARRATOR: Open the project settings.

00:00:03.900 --> 00:00:06.700
[keyboard typing]

00:00:07.100 --> 00:00:11.200
Enter the base URL, then select Save.

00:00:11.600 --> 00:00:14.500
[confirmation tone]
The connection is ready.
\`\`\`

The \`WEBVTT\` signature and cue timing syntax are defined by the WebVTT specification at https://www.w3.org/TR/webvtt/. Serve the file as UTF-8. Review rendering in the supported browsers because line wrapping, cue positioning, and player overlays can affect readability even when syntax is valid.

The following dependency-free Node script performs a deliberately narrow structural check. It accepts standard \`hh:mm:ss.mmm\` cue timings, requires increasing times, and rejects empty cue payloads. Save it as \`validate-vtt.mjs\` and pass one or more VTT paths.

\`\`\`js
import { readFile } from "node:fs/promises";

function milliseconds(timestamp) {
  const parts = timestamp.split(":");
  if (parts.length !== 3) throw new Error(\`Unsupported timestamp: \${timestamp}\`);
  const hours = Number(parts[0]);
  const minutes = Number(parts[1]);
  const seconds = Number(parts[2]);
  if (![hours, minutes, seconds].every(Number.isFinite)) {
    throw new Error(\`Invalid timestamp: \${timestamp}\`);
  }
  return ((hours * 60 + minutes) * 60 + seconds) * 1000;
}

async function validate(path) {
  const text = await readFile(path, "utf8");
  const normalized = text.replaceAll("\\r\\n", "\\n");
  if (!normalized.startsWith("WEBVTT")) throw new Error(\`\${path}: missing WEBVTT header\`);

  const blocks = normalized.split("\\n\\n").slice(1).filter((block) => block.trim() !== "");
  let cues = 0;
  for (const block of blocks) {
    const lines = block.split("\\n");
    const timingIndex = lines.findIndex((line) => line.includes(" --> "));
    if (timingIndex < 0) continue;
    const [start, endWithSettings] = lines[timingIndex].split(" --> ");
    const end = endWithSettings.split(" ")[0];
    if (milliseconds(start) >= milliseconds(end)) throw new Error(\`\${path}: cue does not advance\`);
    if (lines.slice(timingIndex + 1).join(" ").trim() === "") throw new Error(\`\${path}: empty cue\`);
    cues += 1;
  }
  if (cues === 0) throw new Error(\`\${path}: no cues found\`);
  console.log(\`\${path}: \${cues} cues\`);
}

for (const path of process.argv.slice(2)) await validate(path);
\`\`\`

Run it over the committed tracks:

\`\`\`bash
node validate-vtt.mjs lesson.en.vtt lesson.es.vtt lesson.descriptions.en.vtt
\`\`\`

This script is a project guard, not a complete WebVTT conformance checker. It intentionally supports a constrained timestamp convention. Use a standards-aware validator if your files use cue identifiers, regions, notes, styles, vertical text, or other advanced features. A narrow check is useful only when its supported subset is explicit.

## Review caption accuracy as timed content

Caption QA needs two synchronized views: the video and an editable cue list. Review from beginning to end at normal playback speed, then revisit dense passages, overlapping speech, terminology, and scene changes. Check the final encoded asset, not only the vendor's caption document.

Use a content review table that produces specific defects:

| Review dimension | Pass condition | Example defect |
|---|---|---|
| Speech accuracy | Meaning, names, numbers, and negation match audio | "can" appears where speaker says "cannot" |
| Speaker identity | Changes are clear when voice is not obvious | Two off-screen speakers share unlabeled cues |
| Non-speech audio | Relevant sounds and music are represented | Error tone that changes the task is omitted |
| Synchronization | Text appears with the corresponding event | Solution caption appears before the question |
| Segmentation | Phrases break at natural boundaries | Product name split across unrelated cues |
| Reading opportunity | Viewers can read without losing next content | Dense paragraph flashes briefly |
| Visual placement | Captions avoid essential on-screen information | Cue covers a command and its keyboard shortcut |
| Language | Track, labels, and content language agree | English track contains untranslated sections |

Prioritize semantic errors over cosmetic preferences. Wrong medication dosage, negation, code, account number, or speaker attribution can reverse meaning. For technical training, maintain a glossary of API names, commands, acronyms, and product terminology. Human editors should correct speech-recognition output against that glossary.

Caption sound cues should explain relevant audio, not narrate every noise. An alarm that causes a character to leave is meaningful. Air-conditioning hum is probably not, unless the content discusses it. Music descriptions should convey information or mood that matters, without subjective embellishment unsupported by the audio.

Test at responsive widths and zoom levels supported by the product. Captions must remain readable and should not be clipped by custom controls, cookie banners, picture-in-picture affordances, or mobile safe areas. Change playback speed and seek backward or forward. Captions should resume at the correct cue after seeking and should not duplicate or disappear.

## Verify audio description against the visual information map

Audio description QA starts with a list of visual-only facts, not with whether an alternative audio file exists. Watch the video muted and note every action, label, chart, facial response, scene change, and demonstrated step required for comprehension. Then listen without looking at the screen. If the described version supplies those facts in the right sequence without masking important program audio, it is doing the required job.

For a software tutorial, descriptions may need to convey a selected tab, an error badge, a cursor moving to an unlabeled icon, or a result that appears without narration. A better production script often integrates this information into the main narration: "Select Run in the upper-right corner" is useful to everyone and may remove the need for a separate phrase. Still evaluate the finished asset to confirm no other visual information remains unspoken.

| Description question | Evidence | Failure example |
|---|---|---|
| Are essential actions conveyed? | Muted visual map compared with described audio | Character silently locks the door, never described |
| Is on-screen text available? | Titles, warnings, names, chart labels | Error code appears only visually |
| Is timing meaningful? | Description occurs before the resulting dialogue or action | Identity revealed after it matters |
| Is program audio preserved? | Listen to dialogue, cues, and description together | Narration covers a critical announcement |
| Can users discover and select it? | Keyboard and screen-reader operation | Described version link has no useful name |
| Does state persist appropriately? | Navigate, reload, and return | Player silently switches back to main audio |

Do not require description of information already communicated in the audio. Redundant narration can make the experience harder to follow. Also avoid describing appearance, identity, or emotion beyond what the visuals support. The objective is equivalent access to meaningful content, not a running inventory of pixels.

If description is supplied as a separate video, verify parity: same program version, language, duration behavior, captions availability, chapter structure when offered, and surrounding functionality. A described file that is one release behind can contain obsolete safety steps. Put media pairs under version control or content governance so publishing one triggers verification of the other.

For text description tracks, test in the actual supported user-agent and assistive-technology matrix. The HTML specification defines \`kind="descriptions"\`, but product support and exposure can vary. Do not claim accessibility from markup alone. A clearly discoverable audio-described version or player-supported alternate audio track may offer more dependable access, depending on the platform.

## Test transcripts for completeness and usable structure

A transcript should be easy to find near the media, identify which asset it belongs to, follow the same sequence, distinguish speakers, include meaningful sounds, and include visual descriptions when it serves as a descriptive transcript. It should use real headings, paragraphs, lists, tables, links, and code semantics where the source content warrants them.

This transcript excerpt uses ordinary HTML structure and includes a visual event that the narrator did not speak:

\`\`\`html
<article aria-labelledby="transcript-title">
  <h1 id="transcript-title">Transcript: Configure the sample application</h1>
  <p><strong>Narrator:</strong> Open the project settings.</p>
  <p><em>[The Settings panel opens. Connection is selected in the left navigation.]</em></p>
  <p><strong>Narrator:</strong> Enter the base URL, then select Save.</p>
  <p><em>[A green check appears beside Connection.]</em></p>
  <p><strong>Narrator:</strong> The connection is ready.</p>
</article>
\`\`\`

Avoid placing the entire transcript in an inaccessible custom accordion. If it is collapsible, the control needs an accessible name and expanded state, and keyboard users must be able to operate it. Search, copy, selection, and reflow are important benefits of text. A transcript baked into an image or offered only as an untagged PDF undermines those benefits.

Compare transcript revision and media revision. A simple content identifier in both publishing records can catch mismatches. Automated text comparison can flag large drift between caption and transcript dialogue, but it should allow descriptive passages and editorial formatting. Human review decides whether the two alternatives remain equivalent.

## Automate structural and player-state checks with Playwright

Browser automation can verify discovery, track metadata, keyboard paths, menu state, and persistence. It cannot approve caption meaning or audio-description quality. Keep automated assertions focused on observable contracts.

The first test checks that the media page exposes one English captions track, that its resource loads, and that the transcript link has a useful accessible name. Set \`MEDIA_PAGE_URL\` to the test page or use the default local URL.

\`\`\`ts
import { test, expect } from "@playwright/test";

const mediaPage = process.env.MEDIA_PAGE_URL ?? "http://127.0.0.1:4173/training";

test("video exposes a reachable English captions track", async ({ page, request }) => {
  await page.goto(mediaPage);

  const video = page.locator("video");
  await expect(video).toHaveCount(1);

  const captions = video.locator('track[kind="captions"][srclang="en"]');
  await expect(captions).toHaveCount(1);
  await expect(captions).toHaveAttribute("label", /English/i);

  const source = await captions.getAttribute("src");
  expect(source).not.toBeNull();
  const trackUrl = new URL(source as string, page.url()).toString();
  const response = await request.get(trackUrl);
  expect(response.ok()).toBeTruthy();
  expect(await response.text()).toMatch(/^WEBVTT/);

  await expect(page.getByRole("link", { name: /transcript/i })).toBeVisible();
});
\`\`\`

The second test checks a custom player's captions button. Adapt the accessible name to the product's actual UI. The test uses roles and state rather than implementation classes.

\`\`\`ts
import { test, expect } from "@playwright/test";

const playerPage = process.env.MEDIA_PAGE_URL ?? "http://127.0.0.1:4173/training";

test("keyboard user can enable captions", async ({ page }) => {
  await page.goto(playerPage);

  const captionsButton = page.getByRole("button", { name: /captions/i });
  await captionsButton.focus();
  await expect(captionsButton).toBeFocused();
  await page.keyboard.press("Enter");

  await expect(captionsButton).toHaveAttribute("aria-pressed", "true");
  const modes = await page.locator("video").evaluate((element: HTMLVideoElement) =>
    Array.from(element.textTracks)
      .filter((track) => track.kind === "captions")
      .map((track) => track.mode),
  );
  expect(modes).toContain("showing");
});
\`\`\`

If the control opens a menu instead of toggling directly, assert \`aria-expanded\`, focus movement, option selection, Escape behavior, and return focus. Do not force the component into a toggle assertion that conflicts with its real interaction pattern.

Different JavaScript testing stacks can implement these contracts, but browser media behavior needs a real rendering engine. The [JavaScript testing frameworks guide](/blog/javascript-testing-frameworks-complete-guide-2026) can help position unit, component, and browser checks without pretending they offer identical coverage.

## Inspect encoded assets and delivery, not only page markup

Track and player checks should be paired with media-file inspection. FFmpeg's \`ffprobe\` can report audio, video, and subtitle streams in a local asset. Stream presence does not prove quality or discoverability, but it catches publishing errors such as a missing alternate audio stream or wrong language metadata.

\`\`\`bash
set -eu

media_file="lesson-described.mp4"
test -f "$media_file"

ffprobe -v error -show_entries stream=index,codec_type,codec_name:stream_tags=language,title -of json "$media_file"
\`\`\`

Review the output rather than assuming the second audio stream is description. Check language and title metadata, then play the stream. If the site uses separate described files, compare duration and content revision in the media pipeline. Small duration differences can be legitimate when extended description pauses the video, so make any numeric threshold an explicit product rule rather than a supposed universal WCAG limit.

Test CDN and caching behavior. A fixed VTT filename can retain stale captions after the video changes. Verify cache invalidation or content-addressed URLs, and load the public asset in a clean browser context. Ensure authentication or signed URLs do not expire midway through ordinary playback. Captions that work only for the publishing account are not delivered to users.

Check errors gracefully. If a caption track fails, the player should not falsely show captions as enabled. Monitoring can record track-load failures without collecting sensitive viewing data. The content operation should alert on missing alternatives before publication, not wait for a user complaint.

## Diagnose the failure automation commonly misses

Consider a twelve-minute training video with an English captions track. The DOM test finds the track, the HTTP response is 200, the VTT parser reports 96 valid cues, and the captions button sets \`aria-pressed="true"\`. The release gate passes. During manual review, captions stop at minute eight because the video was re-edited after caption delivery.

The diagnosis starts by comparing the last cue end time with media duration. That reveals a four-minute coverage gap. Next, compare revision identifiers and publishing timestamps. The MP4 is revision 7 while the VTT came from revision 6. Finally, review the missing segment and find a new deployment instruction with no caption or transcript equivalent.

The fix is not to relax the structural test or add an arbitrary cue count. Add a duration-coverage check with a project-defined tolerance, bind caption and video assets to the same content revision, and require human review of changed time ranges. Keep the existing browser checks because they cover different failures.

| Passing signal | Hidden defect | Added evidence |
|---|---|---|
| Track element exists | Source returns 404 | Network status and content type |
| VTT parses | Cues cover only part of video | Last cue compared with media duration |
| Words match script | Final edit changed dialogue | Review final encoded asset |
| Captions toggle changes state | Cues render behind controls | Visual checks across viewports |
| Described file exists | Audio is identical to main version | Listen against visual information map |
| Transcript link works | Transcript omits silent demonstration | Sequence-level semantic review |

This failure illustrates the central testing lesson: metadata, delivery, structure, control operation, coverage, and meaning are separate layers. No single tool can collapse them into a truthful accessibility score.

## Build a release workflow around content and code ownership

Assign ownership at the right layer. Content producers own accurate scripts, captions, descriptions, and revision alignment. Front-end engineers own player semantics, controls, responsive presentation, and state. Platform teams own asset delivery, MIME types, CORS, caching, and monitoring. QA owns the risk model, evidence, regression suite, and the handoff when a failure crosses layers.

A practical release sequence is:

1. Classify the media and record the target conformance level.
2. Create the caption, transcript, and description plan before final editing.
3. Validate VTT and encoded-stream structure in the content pipeline.
4. Compare every alternative with the final media revision.
5. Review captions and description from beginning to end with qualified humans.
6. Run keyboard, screen-reader, responsive, seek, speed, and persistence tests on the integrated player.
7. Run browser automation for track delivery and control-state contracts.
8. Publish with revision-safe URLs and monitor asset failures.

For live events, rehearse caption provider connection, fallback communication, reconnect behavior, and post-event caption correction. Live caption latency and accuracy need observable operational targets, but avoid presenting one illustrative number as a universal compliance threshold. Confirm the archived recording receives reviewed prerecorded captions and any required description after the event.

Ready-made QA skills install from qaskills.sh with the qaskills CLI if your coding agent needs a repeatable accessibility workflow. Keep content-specific meaning maps, supported browser and assistive-technology combinations, and organizational conformance decisions in the project itself.

The release report should name the media assets tested, revisions, languages, player version, browsers, assistive technologies, automated checks, human reviewers, uncovered limitations, and defects. "Accessibility scanner passed" is not an adequate claim for time-based media.

## Frequently Asked Questions

### What is the practical difference between captions and subtitles?

Subtitles generally transcribe or translate dialogue for viewers who can hear the audio but do not understand its language. Captions are intended for situations where sound is unavailable or not clearly audible, so they include dialogue plus relevant speaker identification, sound effects, and musical information. Player menus and HTML track kinds should reflect that distinction. A subtitle file may be a useful language alternative, but it should not be counted as a caption track unless it also conveys the meaningful non-speech audio needed to understand the program.

### Can automated tests determine whether captions are WCAG-conformant?

Automation can verify that a track is declared, reachable, parseable, labeled, and selectable. It can compare cue coverage with duration, flag empty cues, and detect obvious state failures. It cannot reliably decide whether speech is transcribed accurately, sound cues are meaningful, timing supports comprehension, speaker changes are clear, or text blocks essential visuals. Use automation as a fast structural gate and change detector, then require human review of the final media. Both layers should retain evidence tied to the exact asset revision.

### When is separate audio description unnecessary?

Additional audio description is unnecessary when the main audio already communicates all important information in the video track. A well-scripted tutorial might narrate every demonstrated step, control name, result, and meaningful state change. Verify this by creating a visual information map and listening without watching. Do not assume a talker's continuous narration covers slides, charts, expressions, or silent actions. At WCAG 2.2 Level AA, prerecorded synchronized video requires audio description for visual information not already conveyed by the program audio.

### Should a transcript be placed directly on the page or offered as a download?

Either can work if users can discover and access it, but structured HTML near the media is often easier to search, reflow, copy, translate, and navigate with assistive technology. A download must use an accessible format and a clear link name, and it must stay version-aligned with the media. If the transcript is collapsed, the disclosure control needs correct keyboard behavior, naming, and expanded state. Test the actual published experience, including authentication and mobile layout, rather than treating the existence of a document as sufficient.
`,
};
