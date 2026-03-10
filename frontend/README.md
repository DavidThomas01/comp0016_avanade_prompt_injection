# Frontend

React 18 + TypeScript + Vite + Tailwind CSS v4 + shadcn/ui (Radix).

## Running

```bash
npm install
npm run dev       # http://localhost:5173
npm run build     # production build in dist/
```

The app expects the backend at `VITE_API_BASE` (default `http://localhost:8080/api`, set in `.env`). Copy `.env.example` if you don't have a `.env` yet.

## Pages

| Route | Page | What it does |
|---|---|---|
| `/` | Home | Landing page with vulnerability catalogue |
| `/vulnerability/:id` | Vulnerability detail | Technical breakdown, interactive demo, mitigations |
| `/mitigations` | Mitigations | Browse mitigations with code implementations (pseudo, Python, Java) |
| `/testing` | Testing | Create tests, run them against LLMs, view risk analysis |
| `/prompt-enhancer` | Prompt Enhancer | Select mitigations and let an LLM harden a system prompt |
| `/security-knowledge-assistant` | Security Assistant | Full-screen chat for prompt-injection Q&A |

## Structure

```
src/app/
├── pages/              # One component per route
├── data/
│   ├── vulnerabilities.ts   # Vulnerability catalogue
│   ├── mitigations.ts       # Mitigation catalogue
│   └── tests.ts             # Default test presets
├── types/              # Shared TypeScript interfaces
├── api/                # REST client (prompt enhancer)
├── assistant/          # Chat widget, streaming client, storage
├── components/
│   ├── ui/             # shadcn/ui primitives (button, dialog, tabs, etc.)
│   ├── Header.tsx
│   └── ThemeToggle.tsx
├── hooks/
└── lib/pdf/            # PDF export (react-pdf) templates + theme
```

## Contributing

### Adding a vulnerability

Edit `src/app/data/vulnerabilities.ts` and append to the `vulnerabilities` array. The `Vulnerability` interface is defined at the top of the file:

```typescript
{
  id: string;                // URL-safe slug, e.g. 'token-smuggling'
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

The home page and detail page pick it up automatically -- no routing changes needed.

### Adding a mitigation

Edit `src/app/data/mitigations.ts` and append to the `mitigations` array:

```typescript
{
  id: string;
  name: string;
  description: string;
  strategy: string;
  codeBased: boolean;        // true = app/middleware code, false = process/model-level
  details: string[];         // Explanation paragraphs
  metrics: { label: string; value: number; color: string }[];
  defenseFlow: string[];     // Step-by-step defense flow
  implementations: {
    pseudo?: string;
    python?: string;
    java?: string;
  };
}
```

### Adding a test preset

Edit `src/app/data/tests.ts` and append to `defaultTests`. Each test needs a `suiteId` (`'basic'` or `'advanced'`), a `prompt`, optional `mitigations` array, and a `model_cfg`.

### Styling

- Tailwind utility classes + CSS variables in `src/styles/theme.css`.
- Use `cn()` from `components/ui/utils.ts` for conditional class merging.
- Dark mode is mandatory -- always pair light classes with `dark:` variants.
- Prefer the `.glass` / `.glass-strong` CSS classes from `src/styles/app.css` for translucent panels.
