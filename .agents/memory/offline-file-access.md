---
name: Offline file access
description: The browser MVP's local audio persistence and native-device boundary.
---

AutoBeat deliberately keeps local audio files on the user's device. The browser can persist metadata and preferences, but `File` objects and directory handles are not reliably serializable across reloads, so a reloaded session may require the user to select the folder again before playback works.

**Why:** This preserves the offline/private requirement without copying audio into project storage, while remaining honest about browser security limits.

AutoBeat background playback should continue by default when the app is minimized, hidden, or the phone screen is off. Call interruption is a separate signal: pause only for an active call and resume the same track and position after the call when enabled.

**How to apply:** Keep future desktop-shell and mobile work as native adapters for guaranteed background audio, Windows startup/tray controls, system-wide headphone detection, and call-state events; do not add cloud storage or treat ordinary visibility changes as calls.