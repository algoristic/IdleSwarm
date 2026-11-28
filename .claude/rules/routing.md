---
paths:
  - 'src/**/*.routes.ts'
  - 'src/**/*.guards.ts'
  - 'src/**/*.providers.ts'
  - 'src/main.ts'
  - 'src/app/app.*'
---

# Routing und Bootstrap

Klassen-Guards, Resolver und `APP_INITIALIZER` meldet ESLint.

- Jedes Feature hat `<domain>.routes.ts` mit `export const <domain>Routes: Routes` und wird lazy geladen:

  ```ts
  {
    path: 'eintraege',
    loadChildren: async () => (await import('@app/items/feature/items.routes')).itemsRoutes,
  },
  ```

- Guards sind Fabriken (`canActivate: [itemGuard()]`, ESLint). Umleiten mit `RedirectCommand`.
- Die App-Wurzel (`main.ts`, Root-Komponente, Root-Routen, `app.config.ts`) startet und verdrahtet nur. App-weite Verdrahtung (Router, App-weiter State) passiert in den Bootstrap-Providers, Abläufe über `provideAppInitializer(...)`.
