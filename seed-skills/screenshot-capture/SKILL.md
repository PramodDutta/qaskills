---
name: "Screenshot Capture Testing"
description: "Cross-platform desktop and application screenshot capture for visual testing, UI verification, and automated visual comparison across macOS, Linux, and Windows."
version: 1.0.0
author: openai
license: MIT
tags: [screenshot, visual, capture, desktop, cross-platform]
testingTypes: [visual, e2e]
frameworks: []
languages: [python, typescript, javascript]
domains: [web, desktop]
agents: [claude-code, cursor, github-copilot, windsurf, codex, aider, continue, cline, zed, bolt]
---

# Screenshot Capture Testing

Cross-platform screenshot capture for visual testing, UI verification, and automated comparison. Supports full screen, specific app/window, and pixel region captures.

## Tool Priority

- Prefer tool-specific screenshot capabilities when available (Playwright for browsers, Figma MCP for designs)
- Use this skill for whole-system desktop captures or when tool-specific capture cannot get what you need
- Default for desktop apps without a better-integrated capture tool

## macOS Capture

### Full screen

```bash
screencapture -x output/screen.png
```

### Pixel region (x,y,w,h)

```bash
screencapture -x -R100,200,800,600 output/region.png
```

### Specific window by ID

```bash
screencapture -x -l12345 output/window.png
```

### Interactive selection

```bash
screencapture -x -i output/interactive.png
```

## Linux Capture

### Using scrot

```bash
# Full screen
scrot output/screen.png

# Pixel region
scrot -a 100,200,800,600 output/region.png

# Active window
scrot -u output/window.png
```

### Using gnome-screenshot

```bash
gnome-screenshot -f output/screen.png
gnome-screenshot -w -f output/window.png
```

### Using ImageMagick

```bash
import -window root output/screen.png
import -window root -crop 800x600+100+200 output/region.png
```

## Windows Capture (PowerShell)

```powershell
# Full screen
powershell -ExecutionPolicy Bypass -File take_screenshot.ps1

# Pixel region
powershell -ExecutionPolicy Bypass -File take_screenshot.ps1 -Region 100,200,800,600

# Active window
powershell -ExecutionPolicy Bypass -File take_screenshot.ps1 -ActiveWindow
```

## Visual Testing Workflow

1. **Capture baseline** — Take reference screenshots of correct UI state
2. **Capture current** — Take screenshots of current UI state after changes
3. **Compare** — Diff the screenshots to detect visual regressions
4. **Report** — Generate visual diff reports with highlighted changes

## Multi-Display Behavior

- **macOS:** Full-screen captures save one file per display with multiple monitors
- **Linux/Windows:** Full-screen captures use virtual desktop (all monitors in one image)
- Use `--region` to isolate a single display when needed

## Error Handling

- On macOS, check Screen Recording permission before window/app capture
- On Linux, verify tool availability: `command -v scrot`, `command -v gnome-screenshot`
- If saving fails with permission errors, check directory permissions
- Always report the saved file path in the response

## Best Practices

- Use consistent viewport sizes for comparable screenshots
- Mask dynamic content (timestamps, animations) before comparison
- Set appropriate diff thresholds for anti-aliasing tolerance
- Store baseline screenshots in version control
- Run visual tests in consistent environments (same OS, resolution, DPI)
