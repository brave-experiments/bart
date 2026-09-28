---
name: brave-clawperator-orientation
description: Orient Android Brave or Chromium testing through Clawperator, including channel identity, internal pages, transient video controls and native fullscreen evidence.
---

# Brave through Clawperator

Select the device, browser package and Operator explicitly. Browser channels can
coexist. URL intents may open the default browser; launch the selected package
and navigate through its observed address field when channel identity matters.
Focus the field before typing. Clawperator 0.12.4 distinguishes text entry from
submission; observe the destination before claiming navigation succeeded.
Preserve app and account data unless reset is authorized.

Inspect `brave://version` or `chrome://version` for browser/Chromium versions,
revision and command-line flags. Inspect relevant flags and study assignments
separately. Relaunch after changing flags, then recheck configuration. Neither a
study assignment nor a configured flag proves the feature ran. When build
identity matters, compare installed APK bytes with the selected build. Keep
containing-release provenance distinct from exact source-head coverage.

## Transient controls

Visible WebView controls may lack usable accessibility nodes. Inspect a bounded
query or complete snapshot, then a screenshot when needed. Do not invent a
selector or treat a missing node as proof the visible control is absent.
Convert resized preview coordinates using the original screenshot dimensions
and top-left origin returned by Clawperator. Refresh after rotation or layout
changes. Coordinates from another run are not permanent targets.

A screenshot round trip between reveal and tap can outlast player controls.
When evidence establishes both targets in the current layout, send one bounded
`exec` sequence: reveal hidden controls, sleep 300 ms, tap the observed fullscreen
icon, then observe the result. This delay is a tested starting value, not a
universal timeout. A reveal tap can hide controls that are already visible.
End the sequence at the transition. Retain individual results and partial effects
on failure; never automatically replay a sequence. BART provides a
[bounded sequence contract](../../../docs/workflow-development.md) with click
budgets and a special `gear` kind for the timed test action.

## Native fullscreen and evidence

Screen-filling video alone does not prove native fullscreen. Check browser chrome,
orientation and native evidence such as the fullscreen exit message. Reacquire
landscape controls and the gear before tapping. Start continuous capture before
entry and retain the prescribed observation window and final hold. Inspect the
finalized original across rotation; a complete manifest does not prove readable
or correct behavior. Do not rescue timed attempts with Back, retaps or forced
rotation.

Retain preparation, site/account state, coordinates and observations under the
case run. Clawperator 0.12.3 improves full snapshot transport; 0.12.4 adds screenshot
geometry and submission outcomes. Check actual errors, completeness and state
rather than assuming an upgrade resolves every failure. Screenshot `persistedAt`
is host write time, not the instant the device image was captured.
