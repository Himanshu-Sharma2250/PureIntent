# Changelog

All notable changes to PureIntent will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [4.1.1] - 2026-11-23

### Fixed
- **Android Keyboard Occlusion in Modals**: Resolved an issue on Android where the software keyboard covered active text inputs in the Create/Edit Task modal (`IntentModal`), the Add/Edit Comment modal (`CommentModal`), and the Log Time modal (`TimeLogModal`).
  - **Root Cause**: Android Edge-to-Edge enforcement in modern Expo SDKs prevents the OS window manager from automatically resizing windows on keyboard open (`adjustResize` bypass). Because React Native's `<Modal>` runs in its own native `Dialog` window, it lacked `statusBarTranslucent`/`navigationBarTranslucent` measurements and explicit keyboard avoidance, causing the bottom sheet to remain pinned beneath the software keyboard.
  - **Solution**: Wrapped the sheet contents across all modals in `KeyboardAvoidingView` configured with `behavior="padding"` on both platforms. Enabled `statusBarTranslucent` and `navigationBarTranslucent` on all `<Modal>` instances so dialog windows measure the full screen under edge-to-edge. Wrapped form contents in `ScrollView` with `keyboardShouldPersistTaps="handled"` and dynamic focus scrolling so focused inputs and primary submission buttons remain visible and reachable on the first tap.
  - **Zero New Dependencies**: Accomplished completely offline with 0 new native packages, ensuring 100% offline functionality without requiring new native binary linking.

---

## [4.1.0] - 2026-11-23

### Added
- **Per-Task Start/Stop Timer (100% Offline)**: Native offline timer feature allowing focused work session tracking directly tied to tasks, persisting start timestamp in local SQLite.
- **Dedicated Timer Repository (`db/timerRepository.ts`)**: Encapsulates `startTimer`, `getActiveTimer`, `stopTimer`, and `discardTimer` operations with concurrency lock protection and strict single-active-timer enforcement.
- **Global Timer Hook & App-Wide Provider (`hooks/useTimer.ts`)**: Root context provider tracking active timer state and computing live elapsed time strictly as `now - started_at` (clamped to 0 to safeguard against device clock shifts).
- **Global Running-Timer Bar (`components/ActiveTimerBar.tsx`)**: Slim persistent bottom bar visible across all screens (including HomeScreen task list) displaying running task title, live elapsed time (HH:MM:SS), and tap-to-focus navigation.
- **Task Detail Timer Controls (`components/TimerButton.tsx`)**: In-context timer controls displaying Start Timer or live session duration badge with Stop and secondary Discard actions.
- **Edge Case Protection**:
  - Switch confirmation ("Stop timer on '<task title>' and start here?") when starting a timer while another is active.
  - Cascade deletion on task delete: active timer is discarded without orphaned rows or crashes.
  - Task completion prompt ("Stop timer and log time?") when marking a task complete with an active running timer.
  - Long-running timer safety prompt (>12 hours) on app foregrounding to save as-is or discard.
  - Short session confirmation (<60 seconds) on timer stop offering keep or discard choices.
  - Midnight boundary handling preserving the initial session start date as `work_date`.

### Changed
- **Safe Schema Migration (`db/db.ts`)**: Automated database migration upgrading `time_logs` table: converted `time_spent_minutes` to `time_spent_seconds` (multiplying existing values by 60), made `description` nullable, and added `source` column ('manual' | 'timer', defaulting existing entries to 'manual'). Added `active_timer` table with cascade delete foreign key.
- **Refactored Time Log Repository (`db/timeLogRepository.ts`)**: Updated duration signatures and calculations to operate in seconds (`time_spent_seconds`) and support nullable descriptions.
- **Reactive Time Logs Hook (`hooks/useTimeLogs.ts`)**: Integrated with `useTimer` to automatically refresh time log entries and total time logged whenever a timer stops.
- **Updated Editorial Components (`components/TimeLogCard.tsx`, `components/TimeLogModal.tsx`)**: Formatted duration badges to display hours & minutes ("1h 05m", "1h 0m") or seconds for sessions under a minute; added subtle "Add what you did" prompt for timer logs lacking descriptions and subtle timer source badges; updated modal validation to keep description optional for timer logs while requiring it for manual logs.
- **Updated Screens (`screens/TaskDetailScreen.tsx`, `screens/HomeScreen.tsx`)**: Wired timer controls, total seconds aggregation, and completion/deletion prompts.

---

## [4.0.0] - 2026-09-12

### Added
- **Time Logging Feature (100% Offline)**: JIRA-style work session logging for tasks, stored locally in SQLite with zero network dependencies.
- **Time Logs SQLite Schema & Cascade Deletion (`db/db.ts`)**: Added `time_logs` table with `FOREIGN KEY (task_id) REFERENCES intents(id) ON DELETE CASCADE` to ensure time log entries automatically delete with their parent task without leaving orphaned rows.
- **Dedicated Time Log Repository (`db/timeLogRepository.ts`)**: Encapsulated CRUD methods (`createTimeLog`, `getTimeLogsByTaskId`, `updateTimeLog`, `deleteTimeLog`, `getTotalTimeSpent`) interacting with SQLite database.
- **Reactive Time Logs Hook (`hooks/useTimeLogs.ts`)**: Reactive state hook for time log CRUD operations, tracking real-time total duration logged per task.
- **Editorial Time Log Components (`components/TimeLogCard.tsx`, `components/TimeLogModal.tsx`)**: Minimalist time log cards with formatted duration badges (`Xh Ym`), work date, description, and action buttons; slide-up modal with hours & minutes inputs, quick duration chips (`+15m`, `+30m`, `+1h`, `+2h`), custom calendar date selector with backdating support, and empty-submission / future-date validations.
- **Prominent Total Time Display (`screens/TaskDetailScreen.tsx`)**: Displays aggregate time logged directly within the task detail header card and section header.

### Changed
- **Renamed Notes → Comments (Codebase-wide)**: Unified terminology across database tables, repositories, hooks, components, and user-facing copy.
- **Safe Database Schema Migration (`db/db.ts`)**: Automated database migration during initialization to rename existing `notes` table to `comments` via `ALTER TABLE notes RENAME TO comments;`, safely preserving all user data.
- **Renamed Repository & Types (`db/commentRepository.ts`)**: Renamed from `db/noteRepository.ts` (`createComment`, `getCommentsByTaskId`, `updateComment`, `deleteComment`, `Comment`).
- **Renamed Reactive Hook (`hooks/useComments.ts`)**: Renamed from `hooks/useNotes.ts` (`useComments`).
- **Renamed Editorial Components (`components/CommentCard.tsx`, `components/CommentModal.tsx`)**: Renamed from `NoteCard.tsx` and `NoteModal.tsx` with updated typography and UI copy.
- **Updated Task Detail Screen (`screens/TaskDetailScreen.tsx`)**: Refactored to include both the renamed Comments section and the new Time Logging section with cohesive visual hierarchy and interaction models.

---

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
