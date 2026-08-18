# Changelog

All notable changes to PureIntent will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
