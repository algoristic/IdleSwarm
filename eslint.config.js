// @ts-check
const eslint = require('@eslint/js');
const { defineConfig, globalIgnores } = require('eslint/config');
const tseslint = require('typescript-eslint');
const angular = require('angular-eslint');
const importX = require('eslint-plugin-import-x');
const prettier = require('eslint-config-prettier/flat');

const local = require('./tools/eslint-rules');

/**
 * Muster für Importe aus Schichten, die eine Schicht nicht verwenden darf. Greift für den Alias
 * (`@app/hud/feature/…`) und relative Pfade (`../../feature/…`).
 *
 * @param {string} layer
 * @param {string[]} layers
 */
const forbiddenLayers = (layer, layers) => ({
  regex: `(^|/)(${layers.join('|')})(/|$)`,
  message: `Die Schicht ${layer} darf nicht von ${layers.join(', ')} abhängen (Schichten: feature → ui → data-access → domain → util). Passt eine Abhängigkeit nicht, wandert der Code in die richtige Schicht.`,
});

const FRAMEWORK_IMPORTS = {
  regex: '^(@angular|rxjs)(/|$)',
  message:
    'domain und util bleiben Angular- und RxJS-frei, damit sie unter Node (Vitest) und in Web Workern laufen.',
};

/** Fremde Domänen und die App-Wurzel nur über den Alias. */
const CROSS_DOMAIN = {
  regex: '^(\\.\\./)+(app\\.|[^./][^/]*/(feature|ui|data-access|domain|util)/)',
  message:
    'Andere Domänen und die App-Wurzel über den Alias @app/… importieren, damit Querabhängigkeiten sichtbar sind; innerhalb einer Domäne relativ.',
};

/** Verbote, die überall gelten. */
const FORBIDDEN_PACKAGES = [
  {
    regex: '^@angular/(cdk|material)(/|$)|^bootstrap(/|$)',
    message:
      'Keine UI-Frameworks: Styling über Tailwind mit Tokens, Dialoge über natives <dialog> mit showModal().',
  },
  {
    regex: '^@ngrx(/|$)',
    message: 'Kein NgRx: Zustand liegt in Signals in Stores der data-access-Schicht.',
  },
];

const FORBIDDEN_PATHS = [
  {
    name: '@angular/core',
    importNames: ['Input', 'Output', 'EventEmitter', 'ViewChild', 'ViewChildren'],
    message:
      'Nur Signal-APIs: input(), output(), model(), viewChild() statt Decorators und EventEmitter.',
  },
  {
    name: '@angular/core',
    importNames: ['ContentChild', 'ContentChildren', 'HostBinding', 'HostListener'],
    message: 'contentChild()/contentChildren() und die host-Metadaten statt Decorators.',
  },
  {
    name: '@angular/core',
    importNames: ['NgModule'],
    message: 'Keine NgModules: Komponenten sind standalone.',
  },
  {
    name: '@angular/core',
    importNames: ['NgZone'],
    message: 'Die App ist zoneless: Anzeige nur über Signals und Template-Ereignisse, kein NgZone.',
  },
  {
    name: '@angular/core',
    importNames: ['APP_INITIALIZER'],
    message: 'provideAppInitializer(...) statt APP_INITIALIZER.',
  },
  {
    name: '@angular/router',
    importNames: ['CanActivate', 'CanActivateChild', 'CanDeactivate', 'CanMatch', 'Resolve'],
    message:
      'Guards nur funktional (CanActivateFn, CanMatchFn, CanDeactivateFn) als Fabriken, keine Klassen-Guards oder Resolver.',
  },
  {
    name: '@angular/router',
    importNames: ['ResolveFn'],
    message:
      'Keine Resolver: Daten kommen über die Facade, Abläufe starten über Guards oder DestroyRef.',
  },
  {
    name: '@angular/forms',
    message:
      'Formulare nur mit Signal Forms (@angular/forms/signals): keine Reactive Forms, kein ngModel, kein ControlValueAccessor.',
  },
  {
    name: 'rxjs',
    importNames: ['Subject', 'BehaviorSubject', 'ReplaySubject', 'AsyncSubject'],
    message:
      'Eigener Zustand und eigene Eingaben nur in Signals; RxJS nur an Angular-Schnittstellen, dort sofort toSignal().',
  },
];

/** Schichtregeln; Specs dürfen quer importieren. */
const LAYER_PATTERNS = {
  ui: [forbiddenLayers('ui', ['feature', 'data-access'])],
  'data-access': [forbiddenLayers('data-access', ['feature', 'ui'])],
  domain: [forbiddenLayers('domain', ['feature', 'ui', 'data-access']), FRAMEWORK_IMPORTS],
  util: [forbiddenLayers('util', ['feature', 'ui', 'data-access', 'domain']), FRAMEWORK_IMPORTS],
};

/**
 * Richtung dev → game → shared; gilt auch für Specs.
 *
 * @type {Partial<Record<string, string[]>>}
 */
const FORBIDDEN_DOMAINS = {
  shared: ['game', 'dev'],
  game: ['dev'],
};

/**
 * Muster für Importe aus Domänen, die eine Domäne nicht verwenden darf. Greift nur für den Alias
 * (`@app/game/…`); relative Pfade in fremde Domänen meldet `CROSS_DOMAIN` nur, wenn sie in einen
 * Schichtordner führen (`../../game/domain/…`, nicht `../../game/x`).
 *
 * @param {string} domain
 * @param {string[]} domains
 */
const forbiddenDomains = (domain, domains) => ({
  regex: `^@app/(${domains.join('|')})(/|$)`,
  message: `Die Domäne ${domain} darf nicht von ${domains.join(', ')} abhängen (Richtung dev → game → shared).`,
});

/** @param {{ regex: string; message: string }[]} patterns */
const restrictImports = (patterns) => ({
  'no-restricted-imports': [
    'error',
    { paths: FORBIDDEN_PATHS, patterns: [CROSS_DOMAIN, ...FORBIDDEN_PACKAGES, ...patterns] },
  ],
});

const SIGNAL_APIS =
  'input|output|model|computed|linkedSignal|viewChild|viewChildren|contentChild|contentChildren';

/** Syntaxverbote, die in allen TypeScript-Dateien gelten. */
const SYNTAX = [
  {
    selector: 'TSEnumDeclaration',
    message:
      'Kein TS-enum: as const-Liste mit abgeleitetem Typ (`export const KINDS = [...] as const; type Kind = (typeof KINDS)[number];`).',
  },
  {
    selector: '[accessibility]',
    message:
      'Keine Zugriffsmodifier: Member, die das Template nutzt, bleiben ohne Modifier; nur intern genutzte sind ECMAScript-private Felder (#name).',
  },
  {
    selector: `PropertyDefinition[readonly=true][key.type!='PrivateIdentifier'] > CallExpression.value:matches([callee.name=/^(${SIGNAL_APIS})$/], [callee.object.name=/^(${SIGNAL_APIS})$/])`,
    message: `Kein readonly vor ${SIGNAL_APIS.replaceAll('|', ', ')}.`,
  },
  {
    selector: 'Decorator Property[key.name=/^(changeDetection|encapsulation)$/]',
    message:
      'changeDetection und encapsulation nicht setzen: OnPush ist Standard, ViewEncapsulation bleibt unverändert.',
  },
  {
    selector: "Decorator[expression.callee.name='Injectable'] Property[key.name='providedIn']",
    message:
      '@Injectable() ohne providedIn; bereitgestellt wird über provide<Name>Service() bzw. provide<Domain>State(). Root-Defaults nur für Plattform-Tokens.',
  },
  {
    selector:
      "TaggedTemplateExpression[tag.name='$localize'] > TemplateLiteral.quasi:not([quasis.0.value.raw=/^:@@/])",
    message:
      'Jeder $localize-Text braucht eine explizite ID: $localize`:@@<layer><Domain>-<klasse>-<key>:Text`.',
  },
  {
    selector:
      'CallExpression[callee.name=/^(effect|afterRenderEffect)$/] CallExpression[callee.property.name=/^(set|update)$/]',
    message:
      'Effects nur für Seiteneffekte in die Außenwelt (DOM, Entprellen); nie Signals aus Effects schreiben. Abgeleiteter Zustand ist computed oder linkedSignal.',
  },
  {
    selector: "CallExpression[callee.name='computed'] CallExpression[callee.name='form']",
    message:
      'Formulare nie in computed() bauen: leere mit signal({...}), aus einem Input befüllte mit linkedSignal().',
  },
  {
    selector:
      'Property[key.name=/^can(Activate|ActivateChild|Match|Deactivate)$/] > ArrayExpression > Identifier',
    message:
      'Guards sind Fabriken und werden in der Routendefinition aufgerufen: canActivate: [itemGuard()].',
  },
];

const SUBSCRIBE = {
  selector: "CallExpression[callee.property.name='subscribe']",
  message:
    'Kein manuelles .subscribe() in Komponenten: Observables per toSignal() umwandeln; ist es unvermeidbar, im feature-Layer mit takeUntilDestroyed().',
};

/**
 * Dieselbe Richtungsregel für dynamische Importe (`import('@app/dev/…')`), die
 * `no-restricted-imports` nicht prüft.
 *
 * @param {{ regex: string; message: string }} pattern
 */
const forbiddenDynamicImport = ({ regex, message }) => ({
  selector: `ImportExpression[source.value=/${regex.replaceAll('/', '\\/')}/]`,
  message,
});

/** @param {{ selector: string; message: string }[]} extra */
const restrictSyntax = (extra) => ({ 'no-restricted-syntax': ['error', ...SYNTAX, ...extra] });

const PAGE_ON_INIT = {
  selector: "MethodDefinition[key.name='ngOnInit']",
  message:
    'Seitenbezogene Abläufe starten und stoppen über funktionale Guards oder DestroyRef, nicht über ngOnInit.',
};

const COMPONENT_FILES = ['**/*.component.ts', '**/*.page.ts', '**/*.directive.ts'];

const WORKER_FILES = ['**/*.worker.ts', '**/*-service.model.ts', '**/*-service.utils.ts'];

const WORKER_FRAMEWORK_IMPORTS = {
  regex: FRAMEWORK_IMPORTS.regex,
  message:
    'Worker und ihre Protokolldateien bleiben Angular- und RxJS-frei; ein Worker erzeugt keinen Angular-Injector.',
};

const WORKER_SIBLINGS = {
  regex: '^\\./(?!.*-service\\.(model|utils)$)',
  message:
    'Worker und ihre Protokolldateien (*-service.model.ts, *-service.utils.ts) importieren nur domain, util und das Protokoll, damit kein Angular in den Worker gelangt.',
};

/**
 * Ein späterer Block ersetzt die Optionen von `no-restricted-imports` und `no-restricted-syntax`,
 * statt sie zusammenzuführen. Darum erhält jede Kombination aus Domäne, Schicht und Dateiart ihr
 * vollständiges Array; `*` steht für Domänen ohne Richtungsregel.
 */
const domainRules = () =>
  ['*', ...Object.keys(FORBIDDEN_DOMAINS)].flatMap((domain) => {
    const forbidden = FORBIDDEN_DOMAINS[domain];
    const direction = forbidden && forbiddenDomains(domain, forbidden);
    const domainPatterns = direction ? [direction] : [];
    const dynamic = direction ? [forbiddenDynamicImport(direction)] : [];
    const root = `src/app/${domain}`;
    const domainBlocks = [
      ...(direction
        ? [
            {
              files: [`${root}/**/*.ts`],
              rules: { ...restrictImports(domainPatterns), ...restrictSyntax(dynamic) },
            },
          ]
        : []),
      {
        files: COMPONENT_FILES.map((pattern) => `${root}/${pattern}`),
        rules: restrictSyntax([...dynamic, SUBSCRIBE]),
      },
      {
        files: [`${root}/**/*.page.ts`],
        rules: restrictSyntax([...dynamic, SUBSCRIBE, PAGE_ON_INIT]),
      },
    ];
    const layerBlocks = Object.entries(LAYER_PATTERNS).map(([layer, layerPatterns]) => ({
      files: [`${root}/${layer}/**/*.ts`],
      ignores: ['**/*.spec.ts'],
      rules: restrictImports([...domainPatterns, ...layerPatterns]),
    }));
    const workerBlock = {
      files: WORKER_FILES.map((pattern) => `${root}/data-access/${pattern}`),
      rules: restrictImports([
        ...domainPatterns,
        ...LAYER_PATTERNS['data-access'],
        WORKER_FRAMEWORK_IMPORTS,
        WORKER_SIBLINGS,
      ]),
    };
    return [...domainBlocks, ...layerBlocks, workerBlock];
  });

const E2E_WAIT_MESSAGE =
  'Keine festen Wartezeiten in E2E-Tests: auf Test-IDs und Rollen warten (expect(...).toBeVisible() usw.).';

const PLATFORM_MESSAGE =
  'Plattformzugriffe liegen hinter Injection-Tokens mit Root-Default (*-service.tokens.ts), damit Tests sie ersetzen können.';
const FORMAT_MESSAGE =
  'Zahlen und Zeiten formatiert shared/util (de-DE), nicht Intl oder toLocaleString mit der Laufzeit-Locale.';

const PLATFORM_GLOBALS = [
  'localStorage',
  'sessionStorage',
  'requestAnimationFrame',
  'cancelAnimationFrame',
  'Worker',
].map((name) => ({ name, message: PLATFORM_MESSAGE }));
const PLATFORM_PROPERTIES = [
  { object: 'Date', property: 'now', message: PLATFORM_MESSAGE },
  { object: 'performance', property: 'now', message: PLATFORM_MESSAGE },
  { object: 'window', property: 'localStorage', message: PLATFORM_MESSAGE },
  { object: 'window', property: 'requestAnimationFrame', message: PLATFORM_MESSAGE },
];
const FORMAT_GLOBALS = [{ name: 'Intl', message: FORMAT_MESSAGE }];
const FORMAT_PROPERTIES = [{ property: 'toLocaleString', message: FORMAT_MESSAGE }];

/**
 * @param {{ platform: boolean; format: boolean }} restricted
 * @returns {Record<string, unknown>}
 */
const restrictGlobals = ({ platform, format }) => ({
  'no-restricted-globals': [
    'error',
    ...(platform ? PLATFORM_GLOBALS : []),
    ...(format ? FORMAT_GLOBALS : []),
  ],
  'no-restricted-properties': [
    'error',
    ...(platform ? PLATFORM_PROPERTIES : []),
    ...(format ? FORMAT_PROPERTIES : []),
  ],
});

module.exports = defineConfig([
  globalIgnores(['dist/', 'coverage/', '.angular/', '.claude/']),
  {
    linterOptions: { noInlineConfig: true, reportUnusedInlineConfigs: 'error' },
  },
  {
    files: ['**/*.ts'],
    extends: [
      eslint.configs.recommended,
      tseslint.configs.recommended,
      tseslint.configs.stylistic,
      angular.configs.tsRecommended,
    ],
    plugins: { 'import-x': importX, local },
    settings: {
      // `@app/*` ist der Pfad-Alias für `src/app` (tsconfig.json), kein Paket.
      'import-x/internal-regex': '^@app/',
    },
    processor: angular.processInlineTemplates,
    rules: {
      '@angular-eslint/directive-selector': [
        'error',
        { type: 'attribute', prefix: 'app', style: 'camelCase' },
      ],
      '@angular-eslint/component-selector': [
        'error',
        { type: ['element', 'attribute'], prefix: 'app', style: 'kebab-case' },
      ],
      '@angular-eslint/component-class-suffix': ['error', { suffixes: ['Page', 'Component'] }],
      '@angular-eslint/component-max-inline-declarations': [
        'error',
        { template: 0, styles: 0, animations: 0 },
      ],
      '@angular-eslint/consistent-component-styles': 'error',
      '@angular-eslint/inject-at-top': 'error',
      '@angular-eslint/no-implicit-take-until-destroyed': 'error',
      '@angular-eslint/prefer-host-metadata-property': 'error',
      '@angular-eslint/prefer-inject': 'error',
      '@angular-eslint/prefer-output-emitter-ref': 'error',
      '@angular-eslint/prefer-signal-model': 'error',
      '@angular-eslint/prefer-signals': ['error', { preferReadonlySignalProperties: false }],
      '@angular-eslint/prefer-standalone': ['error', { allowExplicitStandalone: false }],
      '@angular-eslint/sort-keys-in-type-decorator': 'error',
      '@angular-eslint/sort-lifecycle-methods': 'error',
      '@angular-eslint/use-lifecycle-interface': 'error',
      '@typescript-eslint/explicit-function-return-type': [
        'error',
        {
          allowExpressions: true,
          allowTypedFunctionExpressions: true,
          allowHigherOrderFunctions: true,
          allowDirectConstAssertionInArrowFunctions: true,
        },
      ],
      '@typescript-eslint/naming-convention': [
        'error',
        {
          selector: ['classProperty', 'classMethod', 'accessor', 'parameterProperty'],
          format: null,
          leadingUnderscore: 'forbid',
        },
      ],
      '@typescript-eslint/ban-ts-comment': [
        'error',
        {
          'ts-check': false,
          'ts-expect-error': true,
          'ts-ignore': true,
          'ts-nocheck': true,
        },
      ],
      '@typescript-eslint/no-non-null-assertion': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { varsIgnorePattern: '^_', argsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
      'import-x/no-duplicates': 'error',
      'local/file-name': 'error',
      'local/i18n-id': 'error',
      'local/member-order': 'error',
      'import-x/order': [
        'error',
        {
          groups: ['builtin', 'external', 'internal', ['parent', 'sibling', 'index']],
          alphabetize: { order: 'asc', caseInsensitive: true },
          'newlines-between': 'always',
        },
      ],
      ...restrictImports([]),
      ...restrictSyntax([]),
      ...restrictGlobals({ platform: true, format: true }),
    },
  },
  ...domainRules(),
  {
    files: ['**/*-service.tokens.ts'],
    rules: restrictGlobals({ platform: false, format: true }),
  },
  {
    files: ['src/app/shared/util/**/*.ts'],
    rules: restrictGlobals({ platform: true, format: false }),
  },
  {
    files: ['**/*.spec.ts', 'e2e/**/*.ts', 'playwright.config.ts'],
    rules: restrictGlobals({ platform: false, format: false }),
  },
  {
    files: ['e2e/**/*.ts'],
    rules: {
      'no-restricted-globals': ['error', { name: 'setTimeout', message: E2E_WAIT_MESSAGE }],
      'no-restricted-properties': [
        'error',
        { property: 'waitForTimeout', message: E2E_WAIT_MESSAGE },
      ],
    },
  },
  {
    files: ['src/app/*/ui/**/*.ts'],
    ignores: ['**/*.spec.ts'],
    rules: {
      'local/inject-allowlist': [
        'error',
        {
          allow: ['^(DOCUMENT|DestroyRef|ElementRef|Injector|Renderer2)$'],
          message:
            'ui-Komponenten sind präsentational: Daten über Inputs, Ereignisse über Outputs; erlaubt sind nur Framework- und Plattform-Tokens (DOCUMENT, DestroyRef, ElementRef, Injector, Renderer2), keine Facades, Stores, Dienste oder Router.',
        },
      ],
    },
  },
  {
    files: COMPONENT_FILES.map((pattern) => `src/app/*/feature/${pattern}`),
    rules: {
      'local/inject-allowlist': [
        'error',
        {
          allow: [
            'Facade$',
            '^(ActivatedRoute|DestroyRef|DOCUMENT|ElementRef|Injector|Renderer2|Router)$',
          ],
          message:
            'Komponenten und Seiten greifen nur über die Facade ihrer Domäne auf Zustand zu, nie direkt auf Stores, Dienste oder data-access-Tokens.',
        },
      ],
    },
  },
  {
    // Bewusste Ausnahme: der Katalog liest das Config-Token direkt (.claude/rules/dev.md).
    files: ['src/app/dev/feature/catalog-entry/catalog-entry.page.ts'],
    rules: {
      'local/inject-allowlist': [
        'error',
        {
          allow: ['Facade$', '^(ActivatedRoute|DestroyRef|DOCUMENT|Router|GAME_CONFIG)$'],
          message: 'Ausnahme nur für GAME_CONFIG; sonst nur Facades und Router-Tokens.',
        },
      ],
    },
  },
  {
    files: ['src/**/*.ts'],
    rules: { 'local/no-doc-comments': 'error' },
  },
  {
    files: ['src/app/*/feature/**/*.ts', 'src/app/*/ui/**/*.ts'],
    ignores: ['**/*.spec.ts'],
    rules: { 'local/tailwind-classes': 'error' },
  },
  {
    files: ['**/*.html'],
    extends: [angular.configs.templateRecommended, angular.configs.templateAccessibility],
    plugins: { local },
    rules: {
      'local/i18n-id': 'error',
      'local/tailwind-classes': 'error',
      'local/template-conventions': 'error',
      '@angular-eslint/template/i18n': [
        'error',
        { checkId: true, checkText: false, checkAttributes: false },
      ],
      '@angular-eslint/template/no-any': 'error',
      '@angular-eslint/template/no-non-null-assertion': 'error',
      '@angular-eslint/template/prefer-control-flow': 'error',
    },
  },
  prettier,
]);
