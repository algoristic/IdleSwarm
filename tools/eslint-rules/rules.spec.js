const { describe, it } = require('node:test');

const angular = require('angular-eslint');
const { RuleTester } = require('eslint');
const tseslint = require('typescript-eslint');

const plugin = require('.');

RuleTester.describe = describe;
RuleTester.it = it;

const ts = new RuleTester({ languageOptions: { parser: tseslint.parser } });
const html = new RuleTester({ languageOptions: { parser: angular.templateParser } });

const UI_GAME = '/repo/src/app/game/ui/hud/hud.component';

ts.run('i18n-id (TypeScript)', plugin.rules['i18n-id'], {
  valid: [
    { filename: `${UI_GAME}.ts`, code: 'const a = $localize`:@@uiGame-hud-title:Titel`;' },
    {
      filename: '/repo/src/app/game/feature/state/game.facade.ts',
      code: 'const a = $localize`:@@featureGame-gameFacade-notice-saved:Gespeichert`;',
    },
    {
      filename: '/repo/src/app/game/data-access/game-store/game-store.service.ts',
      code: 'const a = $localize`:@@dataAccessGame-gameStoreService-x:X`;',
    },
    { filename: '/repo/src/main.ts', code: 'const a = $localize`:@@beliebig:X`;' },
  ],
  invalid: [
    {
      filename: `${UI_GAME}.ts`,
      code: 'const a = $localize`:@@featureGame-hud-title:Titel`;',
      errors: [{ messageId: 'wrongPrefix' }],
    },
    {
      filename: `${UI_GAME}.ts`,
      code: 'const a = $localize`:@@uiGame-hud-:Titel`;',
      errors: [{ messageId: 'wrongPrefix' }],
    },
  ],
});

html.run('i18n-id (Template)', plugin.rules['i18n-id'], {
  valid: [
    {
      filename: `${UI_GAME}.html`,
      code: '<p i18n="@@uiGame-hud-a">A</p><b i18n-title="@@uiGame-hud-b" title="B"></b>',
    },
  ],
  invalid: [
    {
      filename: `${UI_GAME}.html`,
      code: '<p i18n="@@uiGame-other-a">A</p>',
      errors: [{ messageId: 'wrongPrefix' }],
    },
    {
      filename: `${UI_GAME}.html`,
      code: '<b i18n-title="@@uiDev-hud-b" title="B"></b>',
      errors: [{ messageId: 'wrongPrefix' }],
    },
  ],
});

ts.run('file-name', plugin.rules['file-name'], {
  valid: [
    { filename: `${UI_GAME}.ts`, code: '@Component({}) class HudComponent {}' },
    {
      filename: '/repo/src/app/game/feature/catalog-entry/catalog-entry.page.ts',
      code: '@Component({}) class CatalogEntryPage {}',
    },
    {
      filename: '/repo/src/app/shared/ui/button/button.directive.ts',
      code: '@Directive({}) class ButtonDirective {}',
    },
    {
      filename: '/repo/src/app/game/feature/dialog-menu/dialog-menu.component.ts',
      code: '@Component({}) class DialogMenuComponent {}',
    },
    { filename: `${UI_GAME}.ts`, code: 'interface HudView {} export const A = 1;' },
  ],
  invalid: [
    {
      filename: '/repo/src/app/game/ui/hud/hud.ts',
      code: '@Component({}) class HudComponent {}',
      errors: [{ messageId: 'wrongFile' }],
    },
    {
      filename: `${UI_GAME}.ts`,
      code: '@Component({}) class HeadsUpComponent {}',
      errors: [{ messageId: 'wrongClass' }],
    },
    {
      filename: '/repo/src/app/game/feature/menu-dialog/menu-dialog.component.ts',
      code: '@Component({}) class MenuDialogComponent {}',
      errors: [{ messageId: 'dialogFolder' }],
    },
    {
      filename: `${UI_GAME}.ts`,
      code: 'export interface HudView {}',
      errors: [{ messageId: 'exportedType' }],
    },
  ],
});

const component = (body) => `@Component({}) class A {\n${body}\n}`;

ts.run('member-order', plugin.rules['member-order'], {
  valid: [
    {
      code: component(`
        facade = inject(Facade);
        #router = inject(Router);
        items = input.required();
        value = model();
        ids = IDS;
        state = signal(1);
        selected = output();
        canvas = viewChild('c');
        count = computed(() => 1);
        queue = linkedSignal(() => 1);
        title = $localize\`:@@x-y-z:T\`;
        labels = { a: $localize\`:@@x-y-a:A\` };
        #frameId = null;
        constructor() {}
        ngOnInit() {}
        onSave() {}
        #format() {}`),
    },
    { code: 'class Plain { a = computed(() => 1); b = inject(X); }' },
  ],
  invalid: [
    {
      code: component('count = computed(() => 1);\nitems = input();'),
      errors: [{ messageId: 'order' }],
    },
    {
      code: component('#format() {}\nonSave() {}'),
      errors: [{ messageId: 'order' }],
    },
    {
      code: component('title = $localize`:@@x-y-z:T`;\n#frameId = null;\nselected = output();'),
      errors: [{ messageId: 'order' }],
    },
  ],
});

ts.run('no-doc-comments', plugin.rules['no-doc-comments'], {
  valid: [
    { code: '// Umgehung für angular/angular#123\nconst a = 1;' },
    { code: '/* eslint-disable-next-line */ const a = 1;' },
  ],
  invalid: [
    { code: '/** Beschreibung */\nconst a = 1;', errors: [{ messageId: 'jsdoc' }] },
    { code: '// ---------\nconst a = 1;', errors: [{ messageId: 'banner' }] },
    { code: '// ==== Abschnitt ====\nconst a = 1;', errors: [{ messageId: 'banner' }] },
  ],
});

ts.run('tailwind-classes (TypeScript)', plugin.rules['tailwind-classes'], {
  valid: [
    { code: "const a = 'absolute top-80 left-80 origin-top-left';" },
    { code: "const a = 'game.' + id + '.save';" },
    { code: "const a = 'g[app-unit-sprite]';" },
    { code: 'const a = `${base} bottom-sheet--collapsed`;' },
  ],
  invalid: [
    { code: "const a = 'p-[13px] text-fg';", errors: [{ messageId: 'arbitrary' }] },
    { code: "const a = 'hover:bg-[#123456]';", errors: [{ messageId: 'arbitrary' }] },
    { code: "const a = '[mask-type:luminance]';", errors: [{ messageId: 'arbitrary' }] },
    { code: "const a = 'bg-' + tone;", errors: [{ messageId: 'composed' }] },
    { code: 'const a = `rounded text-${tone}`;', errors: [{ messageId: 'composed' }] },
  ],
});

html.run('tailwind-classes (Template)', plugin.rules['tailwind-classes'], {
  valid: [
    { code: '<p class="text-fg tabular-nums" [class]="classes()"></p>' },
    { code: '<p [attr.data-testid]="\'game.\' + id"></p>' },
  ],
  invalid: [
    { code: '<p class="w-[13px]"></p>', errors: [{ messageId: 'arbitrary' }] },
    { code: '<p [class]="\'bg-\' + tone"></p>', errors: [{ messageId: 'composed' }] },
  ],
});

const UI_ONLY = {
  allow: ['^(DOCUMENT|DestroyRef)$'],
  message: 'nur Framework-Tokens',
};

ts.run('inject-allowlist', plugin.rules['inject-allowlist'], {
  valid: [
    { code: 'const a = inject(DOCUMENT); const b = inject(DestroyRef);', options: [UI_ONLY] },
    {
      code: 'const a = inject(GameFacade);',
      options: [{ allow: ['Facade$'], message: 'nur Facades' }],
    },
  ],
  invalid: [
    { code: 'const a = inject(Router);', options: [UI_ONLY], errors: [{ messageId: 'forbidden' }] },
    {
      code: 'const a = inject(GameStoreService);',
      options: [{ allow: ['Facade$'], message: 'nur Facades' }],
      errors: [{ messageId: 'forbidden' }],
    },
  ],
});

html.run('template-conventions', plugin.rules['template-conventions'], {
  valid: [
    { code: '<button type="button" data-testid="game.menu.open">Menü</button>' },
    { code: '<a [attr.data-testid]="\'game.views.\' + id" routerLink="/">A</a>' },
    { code: '<button type="button" disabled>Aus</button>' },
    { code: '<p>{{ total() | formatNumber }}</p>' },
    { code: '<button type="button" data-testid="x" (click)="onSave(item.id)">S</button>' },
    { code: '<p [class]="classes()">{{ view().items.length }}</p>' },
  ],
  invalid: [
    { code: '<button type="button">Menü</button>', errors: [{ messageId: 'testId' }] },
    { code: '<div (click)="onOpen()"></div>', errors: [{ messageId: 'testId' }] },
    { code: '<input type="text" />', errors: [{ messageId: 'testId' }] },
    { code: '<p>{{ label(item) }}</p>', errors: [{ messageId: 'call' }] },
    { code: '<p [title]="facade.name(id)"></p>', errors: [{ messageId: 'call' }] },
    { code: '<p>{{ price(id) | formatNumber }}</p>', errors: [{ messageId: 'call' }] },
  ],
});
