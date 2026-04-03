# Copilot Instructions

## Project Overview

Fast-moving, vibe-coded language-learning app. Prioritize **functional, clean, pragmatic** code. Avoid over-engineering, unnecessary abstractions, and heavy architecture.

**Monorepo:** Nx + Yarn workspaces.

## What the Product Does

Duopara is a spaced-repetition language-learning app. Users read AI-generated texts, build vocabulary, and practice with interactive games.

- **AI text generation** — Creates reading material on a chosen topic/difficulty, seeded with ~80% known words and ~20% new words.
- **Reading sessions** — Users read texts, tap words to translate, and mark new vocabulary.
- **Practice games** — 7 game types (definition, translation, reverse translation, fill-blank, matching grid, true/false, quiz). SM-2 scoring updates word progress after each attempt.
- **Vocabulary tracking** — Words progress through `learning → learned → mastered` via SM-2 spaced repetition (difficulty factor, streak, next review date).
- **Dashboard & stats** — Streak, mastered word count, texts read, vocabulary breakdown.

## Tech Stack

| Directory | Stack |
|---|---|
| `packages/backend` | Node.js, TypeScript, Express, Prisma (SQLite), Zod, JWT, OpenAI, Mastra |
| `packages/frontend` | React, TypeScript, Vite, Tailwind CSS, React Router, TanStack Query, Zustand |
| `packages/shared` | TypeScript — shared types, utilities, constants |
| `app/` (outside monorepo packages) | React Native (Expo), Expo Router, NativeWind, TanStack Query, Zustand, Reanimated |

## Guidelines

- Write concise, readable code. Fewer files and layers is better.
- Don't add abstractions until they're needed more than once.
- Prefer co-location: keep code close to where it's used.
- Use Zod for validation on the backend; keep frontend validation minimal.
- State management: Zustand stores. Server state: TanStack Query.
- Styling: Tailwind (frontend), NativeWind (app). No CSS-in-JS.

## Shared Package Rule

**Interfaces, types, and utilities used by more than one of `frontend`, `app`, or `backend` MUST live in `packages/shared/src/` and be exported from its index.** Do not duplicate types across packages.

---

> **⚠️ MANDATORY: KEEP THIS FILE UP TO DATE ⚠️**
>
> Whenever you make a relevant architectural change, introduce a new core library, or establish a new convention, you **MUST** automatically propose an update to `.github/copilot-instructions.md` to reflect those changes. This is non-negotiable — treat this file as a living document that stays in sync with the project.
