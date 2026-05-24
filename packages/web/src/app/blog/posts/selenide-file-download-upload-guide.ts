import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Selenide File Download and Upload — Complete Guide 2026',
  description:
    'Master Selenide file downloads and uploads. download(), uploadFile(), uploadFromClasspath, FileDownloadMode, proxy, and CI/CD patterns.',
  date: '2026-05-11',
  category: 'Guide',
  content: `
# Selenide File Download and Upload Complete Guide

File uploads and downloads are notoriously fiddly in raw Selenium WebDriver. Chrome's headless mode handles downloads differently than headed mode, file dialogs are OS-native (and thus untestable via WebDriver), and verifying that a downloaded file is correct requires careful coordination between the browser and the test runner. Selenide solves all of this with a clean, cross-browser API: \`uploadFile()\` for inputs, \`uploadFromClasspath()\` for resource files, and \`download()\` for capturing downloads via proxy or browser interception.

This guide is a comprehensive walkthrough of Selenide's file handling APIs in 2026. We cover upload methods, download modes (HTTPGET, PROXY, FOLDER, CDP), proxy configuration for cross-browser downloads, custom timeouts, content verification, and the integration patterns for headless CI environments. Every code sample is working Java with Selenide 7+ and JUnit 5.

---

## Key Takeaways

- **uploadFile()** and **uploadFromClasspath()** handle file inputs without OS dialogs
- **download()** captures the file the browser is downloading
- **FileDownloadMode** controls how downloads are intercepted: \`HTTPGET\`, \`PROXY\`, \`FOLDER\`, \`CDP\`
- **PROXY mode** works for any browser and HTTPS, with cookie forwarding
- **FOLDER mode** uses the browser's download directory (simplest)
- **CDP mode** (Chrome only) uses Chrome DevTools Protocol for native interception

---

## File Upload Basics

\`\`\`java
import com.codeborne.selenide.SelenideElement;
import java.io.File;
import static com.codeborne.selenide.Selenide.$;

@Test
void uploadsAvatar() {
    open("/profile");
    File avatar = new File("src/test/resources/avatar.png");
    $("#avatar-input").uploadFile(avatar);

    $("#submit").click();
    $(".avatar-preview").shouldBe(visible);
}
\`\`\`

\`uploadFile()\` sets the value on a \`<input type="file">\` directly, bypassing the OS file dialog. Works in all browsers.

---

## Upload from Classpath

For files bundled in your test resources:

\`\`\`java
@Test
void uploadsDocument() {
    open("/upload");
    $("#doc-input").uploadFromClasspath("samples/test.pdf");
    $("#submit").click();
}
\`\`\`

The path is relative to \`src/test/resources/\`. Much cleaner than absolute paths.

---

## Multi-File Upload

For inputs that accept multiple files (\`<input type="file" multiple>\`):

\`\`\`java
$("#files-input").uploadFile(
    new File("src/test/resources/a.txt"),
    new File("src/test/resources/b.txt"),
    new File("src/test/resources/c.txt")
);
\`\`\`

Or from classpath:

\`\`\`java
$("#files-input").uploadFromClasspath("a.txt", "b.txt", "c.txt");
\`\`\`

---

## Drag-and-Drop Upload

For drag-and-drop upload zones (common in modern apps):

\`\`\`java
import org.openqa.selenium.Keys;
import static com.codeborne.selenide.Selenide.executeJavaScript;

// Simulate drag-and-drop by directly setting the input value behind the dropzone
$(".dropzone input[type=file]").uploadFromClasspath("photo.jpg");
\`\`\`

Most drag-and-drop zones have a hidden file input that you can target directly.

---

## File Download Basics

\`\`\`java
@Test
void downloadsInvoice() throws Exception {
    open("/invoices/123");
    File downloaded = $("a.download-invoice").download();

    assertTrue(downloaded.exists());
    assertEquals("invoice-123.pdf", downloaded.getName());
}
\`\`\`

\`download()\` clicks the link and returns the downloaded file as a Java File.

---

## FileDownloadMode

Selenide supports four modes for capturing downloads:

| Mode | How it works | Browser support |
|---|---|---|
| \`HTTPGET\` | Re-fetches the href URL with the browser's cookies | Any |
| \`PROXY\` | Routes browser traffic through a local proxy | Any |
| \`FOLDER\` | Uses browser's download directory | Any |
| \`CDP\` | Chrome DevTools Protocol native interception | Chrome/Edge |

Configure:

\`\`\`java
import com.codeborne.selenide.FileDownloadMode;
Configuration.fileDownload = FileDownloadMode.PROXY;
\`\`\`

---

## HTTPGET Mode

The default. Simplest but limited:

- Only works if the link has a direct href
- Doesn't handle POST-based downloads
- May trigger duplicate server requests

\`\`\`java
Configuration.fileDownload = FileDownloadMode.HTTPGET;
\`\`\`

---

## PROXY Mode

Robust mode that works for any download, including POST forms, AJAX, and dynamic URLs:

\`\`\`java
Configuration.proxyEnabled = true;
Configuration.fileDownload = FileDownloadMode.PROXY;
\`\`\`

Selenide starts a BrowserMob proxy, configures the browser to use it, and captures responses. Cookies and headers are forwarded.

Drawback: requires the proxy library on classpath:

\`\`\`xml
<dependency>
  <groupId>com.codeborne</groupId>
  <artifactId>selenide-proxy</artifactId>
  <version>7.5.0</version>
  <scope>test</scope>
</dependency>
\`\`\`

---

## FOLDER Mode

Uses the browser's actual download directory:

\`\`\`java
Configuration.fileDownload = FileDownloadMode.FOLDER;
\`\`\`

Selenide configures Chrome to download to a managed temp folder and polls it for new files.

Pros: simplest, doesn't need proxy.
Cons: doesn't work with all browsers identically. Race conditions if multiple downloads happen.

---

## CDP Mode (Chrome)

Chrome DevTools Protocol native interception. Fastest and most reliable for Chrome:

\`\`\`java
Configuration.fileDownload = FileDownloadMode.CDP;
Configuration.browser = "chrome";
\`\`\`

CDP is Selenide's recommended mode for Chrome and Edge in 2026.

---

## Download Timeout

By default, downloads wait \`Configuration.timeout\` (default 4000ms). For large files, increase:

\`\`\`java
File big = $("a.big-file").download(Duration.ofSeconds(60));
\`\`\`

Or globally:

\`\`\`java
Configuration.downloadsFolder = "build/downloads";
Configuration.timeout = 60_000;
\`\`\`

---

## Verifying Content

\`\`\`java
@Test
void downloadIsCorrectPdf() throws Exception {
    File pdf = $("a.report").download();

    // Verify it's a real PDF
    byte[] bytes = Files.readAllBytes(pdf.toPath());
    assertTrue(new String(bytes, 0, 4).equals("%PDF"));

    // Verify content with a PDF library
    try (PDDocument doc = PDDocument.load(pdf)) {
        String text = new PDFTextStripper().getText(doc);
        assertTrue(text.contains("Invoice #123"));
    }
}
\`\`\`

---

## Excel/CSV Download Verification

\`\`\`java
@Test
void exportsCsv() throws Exception {
    File csv = $("button.export").download();

    List<String> lines = Files.readAllLines(csv.toPath());
    assertEquals("Name,Email", lines.get(0));
    assertTrue(lines.get(1).startsWith("Alice,"));
}
\`\`\`

For Excel:

\`\`\`java
try (XSSFWorkbook wb = new XSSFWorkbook(new FileInputStream(xlsx))) {
    Sheet sheet = wb.getSheetAt(0);
    assertEquals("Header", sheet.getRow(0).getCell(0).getStringCellValue());
}
\`\`\`

---

## Headless Chrome Downloads

In headless mode, the default download directory differs. Configure:

\`\`\`java
Configuration.headless = true;
Configuration.downloadsFolder = "build/downloads";
Configuration.fileDownload = FileDownloadMode.CDP;
\`\`\`

CDP mode is reliable in headless. PROXY also works. FOLDER mode can be flaky in headless.

---

## Custom Download Folder

\`\`\`java
Configuration.downloadsFolder = "target/test-downloads";
\`\`\`

Files are saved here and the path is returned from \`download()\`.

---

## CI Patterns

In CI, ensure the downloads folder is created and cleaned between runs:

\`\`\`yaml
- name: Clean downloads
  run: rm -rf build/downloads target/test-downloads
- name: Run tests
  run: ./mvnw test
- name: Upload downloads on failure
  if: failure()
  uses: actions/upload-artifact@v4
  with:
    name: downloads
    path: build/downloads/
\`\`\`

Uploading the downloads folder on failure helps debug download issues.

---

## File Input Without Type=File

Some pages use custom UI elements (buttons that open file dialogs via JS). Find the underlying \`<input type="file">\` even if hidden:

\`\`\`java
$("input[type=file]").uploadFromClasspath("photo.jpg");
\`\`\`

If the input is genuinely missing (uses File System Access API), you'll need to skip the test in headless or use a custom workaround.

---

## Common Pitfalls

**Pitfall 1: Wrong file path.** \`uploadFile\` requires an existing File object. Use \`File.getAbsoluteFile()\` and \`exists()\` checks before upload.

**Pitfall 2: Stale download file.** If the same test downloads multiple times, the second call might pick up the first file. Clean the downloads folder between calls.

**Pitfall 3: Download mode mismatch.** PROXY mode requires the proxy library. CDP mode requires Chrome. Pick the right mode for your test environment.

**Pitfall 4: Headless download timing.** Headless Chrome downloads can be slower. Increase timeouts.

**Pitfall 5: Multi-platform paths.** Use \`File.separator\` or forward slashes — never hardcode \`\\\`.

---

## Reference Card

| Action | Selenide |
|---|---|
| Upload from file | \`$.uploadFile(new File(...))\` |
| Upload from classpath | \`$.uploadFromClasspath("name")\` |
| Upload multiple files | \`uploadFile(f1, f2, f3)\` |
| Download | \`$.download()\` |
| Download with timeout | \`$.download(Duration.ofSeconds(60))\` |
| Set download mode | \`Configuration.fileDownload = ...\` |
| Set download folder | \`Configuration.downloadsFolder = ...\` |

---

## Conclusion

Selenide turns file uploads and downloads from a Selenium pain point into a one-line operation. Pick CDP mode for Chrome-only environments, PROXY for cross-browser robustness, and FOLDER for simplest setup. Use \`uploadFromClasspath\` for test resources, and verify downloaded content with appropriate libraries. With proper CI artifact upload, debugging download issues becomes trivial.

For complementary patterns, see our [headless Chromium guide](/blog/selenide-headless-chromium-firefox-guide) and [screenshot on failure guide](/blog/selenide-screenshot-on-failure-guide).

Browse the [QA skills directory](/skills) for related browser testing patterns.
`,
};
