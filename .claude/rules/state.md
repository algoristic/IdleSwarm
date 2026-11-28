---
paths:
  - 'src/app/*/feature/state/**'
  - 'src/app/*/data-access/**'
  - 'src/**/*.worker.ts'
---

# State und Data-Access

Zustand liegt in Signals in Stores der `data-access`-Schicht. NgRx, eigene Subjects und Plattformzugriffe außerhalb der Tokens meldet ESLint.

## Facade

```ts
@Injectable()
export class ItemsFacade {
  readonly #store = inject(ItemsStore);

  view = computed<ItemsView>(() => toItemsView(this.#store.state()));

  save(id: ItemId): void {
    this.#store.save(id);
  }
}
```

- Die Facade ist der einzige Zugang für Komponenten. Facades anderer Domänen nutzt eine Seite nur, wenn sie diese ausdrücklich zusammensetzt.
- Facades stellen **Viewmodels** als `computed` bereit. Die Ableitung ist eine reine Funktion (`toItemsView` in `feature/state/<domain>.utils.ts`), ohne Angular testbar. Abgeleitete Werte werden nicht im Zustand gespeichert.
- Viewmodels enthalten Rohwerte (Zahlen, Codes). Formatieren die Pipes, Texte setzt das Template ein.
- Facades enthalten keine Fachregeln; die liegen in `domain`.
- Lokaler UI-Zustand (offenes Panel, Auswahl) liegt als Signal in der Facade oder der Seite.
- Effects (`effect()`) nur für echte Seiteneffekte in die Außenwelt (DOM-Attribute, Entprellen); Schreiben in Signals meldet ESLint.
- RxJS nur an Angular-Schnittstellen, die Observables liefern (`Router.events`): sofort `toSignal()`, oder, wenn unvermeidbar, mit `takeUntilDestroyed()` abonnieren.

## Providers

```ts
export function provideItemsState(): (Provider | EnvironmentProviders)[] {
  return [ItemsFacade];
}
```

- Routengebundener State wird in der Route registriert: `providers: [provideItemsState()]`.
- App-weite Abläufe startet `provideAppInitializer(...)` im Bootstrap. Seitenbezogene Abläufe starten und stoppen über funktionale Guards oder `DestroyRef` (`ngOnInit` in Seiten meldet ESLint).

## Data-Access

- Services sind `@Injectable()` und werden über `provide<Name>Service()` bereitgestellt; die `provide<Domain>State()`, die einen Service nutzt, schließt ihn ein.
- Plattformzugriffe (localStorage, Worker, `requestAnimationFrame`, `Date.now`, `performance.now`) liegen hinter Injection-Tokens mit Root-Default in `<name>-service.tokens.ts`, damit Tests sie ersetzen können.
- Methoden liefern typisierte Domänenwerte oder Signals. Fehler werden als Codes zurückgegeben oder als Signal bereitgestellt, nicht als Text.
- Worker-Protokolle (Request/Response-Typen, Type Guards) liegen in `<name>-service.model.ts` bzw. `<name>-service.utils.ts`. Was Worker und Protokolldateien importieren dürfen, prüft ESLint.
