# PureIntent

**Begin your journey into focus.**

PureIntent is an editorial-grade, minimalist offline Todo application built with Expo and React Native. It is designed to provide a serene and focused experience for managing your personal intentions and tasks.

## Features

- **Offline-First:** Fully functional without an internet connection, powered by `expo-sqlite`.
- **Editorial Design:** A highly intentional, premium minimalist UI featuring the *Instrument Serif* font and carefully crafted micro-interactions.
- **Dynamic Theming:** Seamless Light and Dark mode support with physics-based sun and moon transition animations.
- **Task Management:** Create, edit, complete, and delete your intentions with intuitive modals.
- **Search & Filtering:** Quickly find and organize your tasks using search and status filters (All, Pending, Completed).
- **Smooth Animations:** Fluid UI movements, including animated loading spinners and scaling interactions on button presses.

## Tech Stack

This project was built using modern tools and libraries:

- **React Native** (v0.86.2) & **Expo** (SDK 57)
- **TypeScript** for robust typing
- **expo-sqlite** for local offline data storage
- **lucide-react-native** for minimalist iconography
- **expo-font** using `@expo-google-fonts/instrument-serif`
- **react-native-safe-area-context** for handling modern device notches and edges

## Getting Started

### Prerequisites

Ensure you have [Node.js](https://nodejs.org/) installed along with an Expo-compatible environment (iOS Simulator, Android Emulator, or Expo Go on a physical device).

### Installation

1. Clone or download this repository.
2. Install dependencies:
   ```bash
   npm install
   ```

### Running the App

Start the development server:
```bash
npm start
```
From the Expo CLI, you can press:
- `a` to open on an Android emulator.
- `i` to open on an iOS simulator.
- `w` to run it in a web browser (if web is configured).

## Project Structure

```
├── components/          # Reusable UI components (TaskCard, ActionModal, etc.)
├── db/                  # SQLite database configuration and Task Repository
├── hooks/               # Custom React hooks (useIntents)
├── screens/             # Application screens (HomeScreen)
└── package.json         # Project metadata and dependencies
```

## Philosophy

*Silence.* The mind is free of scheduled intentions.
PureIntent embraces simplicity. It avoids overwhelming features in favor of a quiet, beautiful interface that helps you focus on what truly matters.
