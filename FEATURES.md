# New Features

Additional features implemented beyond the core project requirements.

## Test Actions

Comprehensive test management capabilities enabling duplication, modification, and removal of tests.

## Test Configurations

Customisable and reusable test configurations that can be saved, managed, and applied to streamline test execution and increase usability.

## 404 Page

A branded "page not found" screen with gradient typography and a prompt-injection-themed message. Catches all unknown routes and guides users back to the home page.

## Page Transition Animations

Smooth fade-in and slide-up animations on every page navigation using the `motion` library. The home page vulnerability catalogue uses staggered card entrance animations.

## Vulnerability Navigation (Previous / Next)

Each vulnerability detail page includes "Previous" and "Next" navigation links at the bottom, creating a natural reading path through all eight vulnerabilities.

## Persistent Chat History

The Security Knowledge Assistant chat now persists in `localStorage` instead of `sessionStorage`, so conversations survive tab closures and browser restarts.

## Home Page Search and Filter

A search bar above the vulnerability catalogue filters cards by name, description, and tags in real time. Impact-level filter pills (All / High / Medium / Low) provide quick severity-based filtering.

## Auto-Play Demo Mode

The live demo terminal on vulnerability pages includes an auto-play toggle that advances demo steps automatically at 1.5-second intervals, creating a hands-free cinematic walkthrough of attack and mitigation scenarios.

## Responsive Mobile Header

On screens narrower than 768px, the header navigation collapses into a hamburger menu that opens a slide-out sheet with all navigation links, replacing the horizontal pill bar.

## Knowledge Check Quizzes

Each vulnerability page includes a collapsible "Knowledge Check" section with 2–3 multiple-choice questions. Users receive instant feedback with explanations, and a score summary after completing all questions.

## Dark Mode Terminal Fix

The live demo terminal panel now has improved light-mode framing with a ring border and shadow, providing clean visual separation against light backgrounds while maintaining its intentional dark terminal aesthetic.

## Dead Dependency Cleanup

Removed unused dependencies (`@mui/material`, `@emotion/react`, `@emotion/styled`, `@mui/icons-material`, `@popperjs/core`, `react-popper`). Fixed package name from `@figma/my-make-file` to `prompt-injection-protection`. Deleted unused files (`mockKbAnswer.ts`, `tests.ts`).
