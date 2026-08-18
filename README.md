# PureIntent (v2.0.0)

**Begin your journey into focus.**

PureIntent is an editorial-grade, minimalist offline Todo application built with Expo and React Native. It is designed to provide a serene and focused experience for managing your personal intentions and tasks with 100% privacy and zero external network dependencies.

## What's New in v2.0.0 🔔

- **Offline Local Notifications:** Schedule on-device reminders for tasks with due dates using `expo-notifications`. Works 100% offline with zero push servers or tracking.
- **Global & Contextual Notification Controls:** Quickly toggle all notifications globally using the header bell control (`Bell` / `BellOff`), or allow automatic reminder scheduling when setting due dates.
- **Auto-Reconciliation Engine:** On application launch, scheduled OS notifications are reconciled against your SQLite database to eliminate drift, stale reminders, or orphan alerts.
- **Visual Status Badges:** Tasks with active reminders display a minimalist indicator badge matching the app's Instrument Serif aesthetic.

## Core Features

- **100% Offline-First Architecture:** Powered by `expo-sqlite` and local device notification triggers — no internet connection required.
- **Editorial Design System:** A highly intentional, premium minimalist UI featuring the *Instrument Serif* font and carefully crafted micro-interactions.
- **Dynamic Physics-Based Theming:** Seamless Light and Dark mode support with smooth sun and moon transition physics.
- **Task & Intention Management:** Create, edit, complete, reschedule, and delete intentions with fluid modal sheets.
- **Search & Filter:** Instantly filter intentions by status (*All*, *Pending*, *Completed*) or search query.

## Tech Stack

This project is built using modern offline React Native and Expo infrastructure:

- **React Native** (v0.86.2) & **Expo** (SDK 57)
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

### Building an Standalone Android APK (v2.0.0)

To build a standalone Android APK using EAS:
```bash
npx eas-cli build -p android --profile preview
```

## Project Structure

```
├── assets/              # App branding assets & icons
├── components/          # Reusable UI components (TaskCard, IntentModal, ActionModal, ThemeContext)
├── db/                  # SQLite schema setup, migrations, and Task Repository layer
├── hooks/               # Custom hooks (useIntents for state & notification lifecycle)
├── services/            # Offline notification service (notificationService.ts)
├── screens/             # Primary application screens (HomeScreen)
├── CHANGELOG.md         # Full version history and feature changelog
├── app.json             # Expo project configuration (v2.0.0)
└── package.json         # Dependencies and scripts
```

## Philosophy

*Silence.* The mind is free of scheduled intentions.
PureIntent embraces simplicity. It avoids overwhelming clutter in favor of a quiet, beautiful interface that helps you focus on what truly matters.
