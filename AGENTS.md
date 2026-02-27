# AGENTS.md — Repository Rules

## Project

Prompt Injection Protection — a React + Python educational app covering prompt-injection vulnerabilities, mitigations, and testing.

## Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS v4, Radix UI (shadcn/ui), Vite
- **Backend**: Python, FastAPI
- **Styling**: Tailwind utility classes + CSS variables in `frontend/src/styles/theme.css` + app-level utilities in `frontend/src/styles/app.css`

## Rules

### Dark mode is mandatory

Every UI feature **must** support both light and dark mode. This is non-negotiable.

- Use semantic color tokens (`text-foreground`, `text-muted-foreground`, `bg-background`, `bg-card`, `border-border`, etc.) instead of hardcoded grays where possible.
- When semantic tokens are insufficient, always pair light classes with `dark:` variants (e.g. `text-gray-700 dark:text-gray-300`).
- Never ship a component with only light-mode colors. If you add `bg-white/60`, also add `dark:bg-white/5`.
- The `.glass`, `.glass-strong`, and `.glass-chat-reply` CSS classes in `app.css` already have dark variants — prefer these for translucent panels.
- Brand colors (Avanade orange `#FF5800`, magenta `#A4005A`) work on both themes; keep them for accents and gradients.
- Test your changes visually in both modes before considering them complete.

### Styling conventions

- Use `cn()` (from `frontend/src/app/components/ui/utils.ts`) for conditional class merging.
- Prefer Tailwind utilities over custom CSS. If custom CSS is needed, add it to `app.css` with `.dark` counterparts.
- The theme toggle uses `next-themes` with `attribute="class"` — the `.dark` class is applied to `<html>`.
- CSS variables for both themes live in `frontend/src/styles/theme.css` (`:root` for light, `.dark` for dark).

### Code quality

- TypeScript strict mode. No `any` unless absolutely unavoidable.
- Components go in `frontend/src/app/components/`. Pages go in `frontend/src/app/pages/`.
- Do not add comments that merely narrate what code does.

### Commits

Include the following trailer in every commit message:

```
Co-authored-by: Cursor Agent <cursoragent@cursor.com>
```
