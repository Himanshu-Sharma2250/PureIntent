# Changelog

All notable changes to PureIntent will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [3.0.0] - 2026-08-22

### Added
- **Full-Screen Task Detail Screen (`screens/TaskDetailScreen.tsx`)**: Replaced direct modal editing on card tap with navigation to a dedicated full-screen task detail view displaying intent title, description, exact datetime, creation timestamp, and actions.
- **Notes Feature (100% Offline)**: Tasks now support nested notes for breaking intents down into steps, thoughts, and sub-items, stored locally in SQLite with zero network dependencies.
- **Notes SQLite Schema & Cascade Deletion (`db/db.ts`)**: Added `notes` table with `FOREIGN KEY (task_id) REFERENCES intents(id) ON DELETE CASCADE` and `PRAGMA foreign_keys = ON;` to ensure notes automatically delete with their parent task without leaving orphaned rows.
- **Dedicated Note Repository (`db/noteRepository.ts`)**: Encapsulated CRUD methods (`createNote`, `getNotesByTaskId`, `updateNote`, `deleteNote`) interacting with SQLite database.
- **Reactive Notes Hook (`hooks/useNotes.ts`)**: Reactive state hook for note CRUD operations with optimistic state updates and error handling.
- **Editorial Note Components (`components/NoteCard.tsx`, `components/NoteModal.tsx`)**: Minimalist note cards with timestamp and action buttons, and slide-up modal with single multiline text input and empty-submission validation.
- **React Navigation Stack Architecture**: Configured React Navigation Native Stack (`@react-navigation/native` & `@react-navigation/native-stack`) with typed routes (`Home`, `TaskDetail`) and custom transitions.

### Changed
- Tapping a task card on the Home screen now smoothly navigates to `TaskDetailScreen`.
- Long-pressing a task card remains available for the bottom-sheet quick action menu.
- Reused existing `IntentModal` component within `TaskDetailScreen` for editing tasks directly from the detail view.

---

## [2.1.0] - 2026-08-22

### Added
- **Per-Task Exact-Time Notification Control**: Each task now supports its own independent notification time scheduled locally via `expo-notifications` using exact-datetime triggers, working 100% offline with zero external network dependencies.
- **Editorial Time Picker UI (`components/IntentModal.tsx`)**: Minimalist time selection modal matching PureIntent's Instrument Serif typography and light/dark theme design system with quick time presets (9 AM, 12 PM, 3 PM, 5 PM, 8 PM), AM/PM toggle, and hour/minute selectors.
- **Database Schema Migration (`db/db.ts`)**: Automated database migration during initialization to convert legacy date-only `due_date` strings (`YYYY-MM-DD`) to ISO datetime strings (`YYYY-MM-DDT23:59:00.000Z`), safely preserving existing task due dates.
- **Inline Past-Time Validation**: Non-intrusive modal validation when selecting a past time or date, guarding against silent scheduling failures or immediate unexpected triggers.
- **Exact Datetime Display & Overdue Precision (`components/TaskCard.tsx`)**: Updated task card metadata formatting to display exact date and time (e.g., "Aug 22, 2026 at 5:00 PM") and refined overdue status logic to compare exact target timestamps against `Date.now()`.

### Fixed
- Fixed date-only comparison logic in `TaskCard` that previously calculated overdue status based strictly on date boundaries without considering exact time.
- Fixed stale/duplicate notification handles when editing a task multiple times or changing/clearing task due date/time.

---

## [2.0.0] - 2026-08-18

### Added
- **Offline Local Notifications**: Scheduled on-device notifications for tasks with due dates, functioning completely offline without remote servers or push tokens.
- **Database Schema Migration**: Added `notification_id` column to `intents` table to store associated notification IDs safely without data loss.
- **Notification Service (`services/notificationService.ts`)**: Decoupled service managing notification permissions (including Android 13+ `POST_NOTIFICATIONS`), scheduling, cancellation, rescheduling, and automatic startup reconciliation against SQLite tasks.
- **Global & Per-Task Notification UI**: Added header bell toggle for global notification preference and indicator on tasks with active notifications.
- **Auto-Reconciliation**: On application launch, scheduled OS notifications are reconciled against current SQLite database states to eliminate drift.

---

## [1.0.0] - 2026-08-07

### Added
- Initial release of PureIntent task manager.
- Editorial minimalist aesthetic with Instrument Serif typography and OKLCH color system.
- Light and dark theme support with custom physics toggle animation.
- SQLite local database storage via `expo-sqlite`.
- Custom date selection, status filtering, and search functionality.
