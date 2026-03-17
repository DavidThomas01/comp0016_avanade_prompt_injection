## Frontend

React 18 + TypeScript + Vite + Tailwind CSS v4 + shadcn/ui (Radix).

### Running

```bash
npm install
npm run dev       # http://localhost:5173
npm run build     # production build in dist/
```

Configuration:

- API base URL: `VITE_API_BASE` (default `http://localhost:8080/api`).
- Copy `.env.example` to `.env` and adjust as needed.

### Pages

| Route | Page | What it does |
| --- | --- | --- |
| `/` | Home | Landing page with vulnerability catalogue and search/filter. |
| `/vulnerability/:id` | Vulnerability detail | Deep‑dive, interactive demo, mitigations, knowledge checks. |
| `/mitigations` | Mitigations | Browse mitigations with code implementations. |
| `/testing` | Testing | Create tests, run them against LLMs, view risk analysis. |
| `/prompt-enhancer` | Prompt Enhancer | Select mitigations and let an LLM harden a system prompt. |
| `/security-knowledge-assistant` | Security Assistant | Full‑screen chat for prompt‑injection Q&A. |
| `*` | 404 | Branded not‑found page with navigation back home. |

### Structure

```text
src/app/
├── pages/                  # One component per route
├── data/
│   ├── vulnerabilities.ts  # Vulnerability catalogue
│   ├── mitigations.ts      # Mitigation catalogue
│   └── tests.ts            # Default test presets
├── types/                  # Shared TypeScript interfaces
├── api/                    # REST client helpers
├── assistant/              # Chat widget, streaming client, storage
├── components/
│   ├── ui/                 # shadcn/ui primitives (button, dialog, tabs, etc.)
│   ├── Header.tsx
│   └── ThemeToggle.tsx
├── hooks/                  # Shared React hooks
└── lib/pdf/                # PDF export (react‑pdf) templates + theme
```

### Contributing

#### Adding a vulnerability

1. Open `src/app/data/vulnerabilities.ts`.
2. Append to the `vulnerabilities` array using this shape:

   ```typescript
   {
     id: string;                // URL‑safe slug, e.g. 'token-smuggling'
     name: string;
     description: string;
     impactLevel: 'high' | 'medium' | 'low';
     tags: string[];
     nuggets: string[];         // Key takeaway bullets
     technicalExplanation: string[];
     exampleAttack: {
       goal: string;
       steps: string[];
       prompt: string;
       badResponse: string;
     };
     mitigation: {
       overview: string;
       recommendedMitigationIds: string[];  // IDs from mitigations.ts
     };
     withVsWithout: { without: string; with: string };
     demo: {
       systemContext: string;
       steps: DemoStep[];           // Unmitigated conversation flow
       mitigatedSteps: DemoStep[];  // Mitigated conversation flow
     };
   }
   ```

3. The home and detail pages will include it automatically; no routing changes needed.

#### Adding a mitigation

1. Open `src/app/data/mitigations.ts`.
2. Append to the `mitigations` array:

   ```typescript
   {
     id: string;
     name: string;
     description: string;
     strategy: string;
     codeBased: boolean;        // true = app/middleware code, false = process/model‑level
     details: string[];         // Explanation paragraphs
     metrics: { label: string; value: number; color: string }[];
     defenseFlow: string[];     // Step‑by‑step defense flow
     implementations: {
       pseudo?: string;
       python?: string;
       java?: string;
     };
   }
   ```

3. Use IDs that match references from vulnerabilities.

#### Adding a test preset

1. Open `src/app/data/tests.ts`.
2. Append to `defaultTests`. Each test should have:
   - `suiteId`: `'basic'` or `'advanced'`
   - `prompt`: string
   - Optional `mitigations` array (by mitigation ID)
   - `model_cfg`: model selection configuration expected by the backend

Presets appear in the Testing page automatically.

### Styling

- Tailwind utility classes + CSS variables in `src/styles/theme.css`.
- Use `cn()` from `components/ui/utils.ts` for conditional class merging.
- Dark mode is mandatory:
  - Always pair light classes with `dark:` variants.
  - Prefer `.glass`, `.glass-strong`, and `.glass-chat-reply` from `src/styles/app.css` for translucent panels.
- Prefer semantic tokens (`bg-background`, `text-foreground`, etc.) over hard‑coded colors.
