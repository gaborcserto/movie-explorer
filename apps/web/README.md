# Movie Explorer Web

React, TypeScript, and Vite frontend for Movie Explorer.

Install dependencies from the repository root. Run the complete application with `npm run dev`, or run only this workspace with:

```bash
npm run dev --workspace @movie-explorer/web
```

The app uses `VITE_API_BASE_URL` when provided and otherwise connects to `http://localhost:4000`. See `.env.example` for the safe local configuration shape.

The workspace provides `build`, `lint`, `typecheck`, and `test` scripts. Frontend tests run with Vitest and React Testing Library.
