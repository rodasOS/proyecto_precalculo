import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import katex from 'katex';

/** Muestra LaTeX con KaTeX. El LaTeX lo genera el propio motor; KaTeX corre con trust desactivado. */
@Component({
  selector: 'app-formula',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span [class.bloque]="display()" [innerHTML]="html()"></span>`,
  styles: `.bloque { display: block; overflow-x: auto; overflow-y: hidden; padding: 2px 0; max-width: 100%; }`,
})
export class Formula {
  readonly latex = input.required<string>();
  readonly display = input(false);
  private readonly san = inject(DomSanitizer);
  protected readonly html = computed(() => {
    let h: string;
    try {
      h = katex.renderToString(this.latex(), { displayMode: this.display(), throwOnError: false, strict: 'ignore', trust: false, output: 'htmlAndMathml' });
    } catch {
      h = `<code>${this.latex().replace(/[<>&]/g, '')}</code>`;
    }
    return this.san.bypassSecurityTrustHtml(h);
  });
}
