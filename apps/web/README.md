# Movie Explorer Web

React, TypeScript, and Vite frontend for Movie Explorer.

Install dependencies and run shared workflows from the repository root. To run
only the frontend in development:

```bash
npm run dev
```

The app uses `VITE_API_BASE_URL` when provided and otherwise connects to
`http://localhost:4000`. See `.env.example` for the safe local configuration
shape.

The workspace provides `build`, `lint`, `typecheck`, and `test` scripts for
narrow frontend verification.
