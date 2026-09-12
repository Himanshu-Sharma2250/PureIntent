# PureIntent (v4.0.0)

**Begin your journey into focus.**

PureIntent is an editorial-grade, minimalist offline Todo application built with Expo and React Native. It is designed to provide a serene and focused experience for managing your personal intentions and tasks with 100% privacy and zero external network dependencies.

## What's New in v4.0.0 ⏱️

- **Time Logging (JIRA-style Log Work):** Tasks now support 100% offline work session time tracking, stored locally in SQLite with aggregate time calculation, backdating support, and automatic cascade deletion.
- **Notes → Comments Unification:** Renamed Notes to Comments across all database tables, repositories, reactive hooks, components, and UI copy with an automated, safe SQLite migration preserving all existing data.
- **Dedicated Time Tracking UI:** Minimalist `TimeLogCard` components, slide-up `TimeLogModal` with hours/minutes inputs, quick duration chips (`+15m`, `+30m`, `+1h`, `+2h`), custom calendar selector, and real-time total duration indicators.
- **Full-Screen Task Detail Screen (v3.0.0):** Dedicated full-screen task inspection view showing intent title, status toggle, description, exact due datetime, time logs, comments, creation timestamp, and actions.
- **Per-Task Exact-Time Notification Control (v2.1.0):** Each task supports its own independent notification time scheduled locally via `expo-notifications` using exact-datetime triggers.

## Core Features

- **100% Offline-First Architecture:** Powered by `expo-sqlite` and local device notification triggers — no internet connection required.
- **Editorial Design System:** A highly intentional, premium minimalist UI featuring the *Instrument Serif* font and carefully crafted micro-interactions.
- **Dynamic Physics-Based Theming:** Seamless Light and Dark mode support with smooth sun and moon transition physics.
- **Task & Intention Management:** Create, edit, complete, reschedule, and delete intentions with fluid modal sheets.
- **Search & Filter:** Instantly filter intentions by status (*All*, *Pending*, *Completed*) or search query.

## Tech Stack

This project is built using modern offline React Native and Expo infrastructure:

- **React Native** (v0.86.2) & **Expo** (SDK 57)
- **React Navigation** (v7) stack navigator with native screens integration
- **TypeScript** for strict type safety
- **expo-sqlite** for local SQLite database storage & schema migrations
- **expo-notifications** for local scheduled notifications
- **lucide-react-native** for minimalist iconography
- **expo-font** with `@expo-google-fonts/instrument-serif`
- **react-native-safe-area-context** for edge-to-edge layout safety

## Getting Started

### Prerequisites

Ensure you have [Node.js](https://nodejs.org/) installed along with an Expo-compatible environment (iOS Simulator, Android Emulator, or a physical device with a dev client build).

### Installation

1. Clone or download this repository:
   ```bash
   git clone https://github.com/Himanshu-Sharma2250/PureIntent.git
   cd PureIntent
   ```
2. Install dependencies:
   ```bash
   npm install
   ```

### Running the App Locally

Start the development server:
```bash
npm start
```
From the Expo CLI, you can press:
- `a` to open on an Android emulator.
- `i` to open on an iOS simulator.
- `w` to run it in a web browser.

### Building a Standalone Android APK

To build a standalone Android APK using EAS:
```bash
npx eas-cli build -p android --profile preview
```

## Project Structure
 
 ```
 ├── assets/              # App branding assets & icons
 ├── components/          # Reusable UI components (TaskCard, CommentCard, CommentModal, TimeLogCard, TimeLogModal, IntentModal, ThemeContext)
 ├── db/                  # SQLite schema, migrations, Task, Comment & TimeLog repositories (db.ts, taskRepository.ts, commentRepository.ts, timeLogRepository.ts)
 ├── hooks/               # Custom hooks (useIntents for tasks/notifications, useComments for comments, useTimeLogs for time logs)
 ├── services/            # Offline notification service (notificationService.ts)
 ├── screens/             # Primary application screens (HomeScreen, TaskDetailScreen)
 ├── CHANGELOG.md         # Full version history and feature changelog
 ├── app.json             # Expo project configuration (v4.0.0)
 └── package.json         # Dependencies and scripts (v4.0.0)
 ```

## Philosophy

*Silence.* The mind is free of scheduled intentions.
PureIntent embraces simplicity. It avoids overwhelming clutter in favor of a quiet, beautiful interface that helps you focus on what truly matters.
