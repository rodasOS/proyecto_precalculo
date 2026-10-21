import { ChangeDetectionStrategy, Component, computed, effect, input, signal, untracked } from '@angular/core';
import { compilar } from '../../core/cas/evaluar';
import { Nodo } from '../../core/cas/ast';
import { PuntoGrafica } from '../../core/cas/resultado.model';

export interface CurvaGrafica { nodo: Nodo; texto: string }

const COLORES = ['#2f4bd0', '#d9480f', '#0b7a55', '#9c36b5'];
const COLOR_PUNTO: Record<PuntoGrafica['tipo'], string> = { interseccion: '#495057', maximo: '#c92a2a', minimo: '#1c7ed6', inflexion: '#e67700', otro: '#862e9c' };
const W = 720;
const H = 420;

function pasoBonito(rango: number, objetivo = 8): number {
  const crudo = rango / objetivo;
  const mag = Math.pow(10, Math.floor(Math.log10(crudo)));
  const n = crudo / mag;
  return (n < 1.5 ? 1 : n < 3.5 ? 2 : n < 7.5 ? 5 : 10) * mag;
}
const redondear = (v: number) => (Math.abs(v) < 1e-9 ? 0 : Math.round(v * 1e6) / 1e6);

/** Gráfica 2D en SVG con zoom, desplazamiento, asíntotas y puntos marcados. */
@Component({
  selector: 'app-grafico',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './grafico.html',
  styleUrl: './grafico.scss',
})
export class Grafico {
  readonly curvas = input.required<CurvaGrafica[]>();
  readonly puntos = input<PuntoGrafica[]>([]);
  readonly asintotasV = input<number[]>([]);
  readonly asintotasH = input<number[]>([]);
  readonly xmin0 = input(-5);
  readonly xmax0 = input(5);

  protected readonly W = W;
  protected readonly H = H;
  protected readonly xmin = signal(-5);
  protected readonly xmax = signal(5);
  protected readonly ymin = signal(-5);
  protected readonly ymax = signal(5);
  private ajusteManual = false;
  private arrastre: { x: number; y: number; id: number } | null = null;

  constructor() {
    effect(() => {
      const a = this.xmin0(), b = this.xmax0();
      this.curvas(); this.puntos();
      untracked(() => {
        this.xmin.set(a);
        this.xmax.set(b);
        this.ajusteManual = false;
        this.ajustarY();
      });
    });
  }

  private readonly funciones = computed(() => this.curvas().map((c) => ({ ...c, f: compilar(c.nodo) })));

  private ajustarY(): void {
    const fs = this.funciones();
    const a = this.xmin(), b = this.xmax();
    const ys: number[] = [];
    for (const { f } of fs) for (let i = 0; i <= 300; i++) { const y = f({ x: a + ((b - a) * i) / 300 }); if (Number.isFinite(y) && Math.abs(y) < 1e8) ys.push(y); }
    for (const p of this.puntos()) ys.push(p.y);
    ys.push(0);
    ys.sort((p, q) => p - q);
    let lo = ys[Math.floor(ys.length * 0.03)] ?? -5;
    let hi = ys[Math.ceil(ys.length * 0.97) - 1] ?? 5;
    for (const p of this.puntos()) { lo = Math.min(lo, p.y); hi = Math.max(hi, p.y); }
    lo = Math.min(lo, 0); hi = Math.max(hi, 0);
    let span = hi - lo;
    if (span < 1) { lo -= 0.5; hi += 0.5; span = 1; }
    this.ymin.set(lo - span * 0.12);
    this.ymax.set(hi + span * 0.12);
  }

  protected readonly sx = (x: number) => ((x - this.xmin()) / (this.xmax() - this.xmin())) * W;
  protected readonly sy = (y: number) => H - ((y - this.ymin()) / (this.ymax() - this.ymin())) * H;

  protected readonly trazos = computed(() => {
    const x0 = this.xmin(), x1 = this.xmax(), y0 = this.ymin(), y1 = this.ymax();
    const alto = y1 - y0;
    const N = 900;
    return this.funciones().map(({ f, texto }, k) => {
      const segs: string[] = [];
      let actual = '';
      let yPrev = NaN;
      for (let i = 0; i <= N; i++) {
        const x = x0 + ((x1 - x0) * i) / N;
        const y = f({ x, t: x });
        const valido = Number.isFinite(y) && Math.abs(y) < 1e9;
        const salto = valido && Number.isFinite(yPrev) && Math.abs(y - yPrev) > alto * 1.2 && Math.sign(y) !== Math.sign(yPrev);
        if (!valido || salto) { if (actual) segs.push(actual); actual = ''; }
        if (valido) {
          const px = this.sx(x), py = Math.max(-2000, Math.min(2000 + H, this.sy(y)));
          actual += `${actual ? 'L' : 'M'}${px.toFixed(1)} ${py.toFixed(1)}`;
          yPrev = y;
        } else yPrev = NaN;
      }
      if (actual) segs.push(actual);
      return { d: segs.join(' '), color: COLORES[k % COLORES.length], texto };
    });
  });

  protected readonly marcasX = computed(() => {
    const paso = pasoBonito(this.xmax() - this.xmin());
    const out: { v: number; px: number }[] = [];
    for (let v = Math.ceil(this.xmin() / paso) * paso; v <= this.xmax(); v += paso) if (Math.abs(v) > paso / 1000) out.push({ v: redondear(v), px: this.sx(v) });
    return out;
  });
  protected readonly marcasY = computed(() => {
    const paso = pasoBonito(this.ymax() - this.ymin(), 6);
    const out: { v: number; py: number }[] = [];
    for (let v = Math.ceil(this.ymin() / paso) * paso; v <= this.ymax(); v += paso) if (Math.abs(v) > paso / 1000) out.push({ v: redondear(v), py: this.sy(v) });
    return out;
  });
  protected readonly ejeXy = computed(() => Math.max(14, Math.min(H - 6, this.sy(0))));
  protected readonly ejeYx = computed(() => Math.max(4, Math.min(W - 30, this.sx(0))));

  protected readonly puntosVista = computed(() => this.puntos().map((p) => ({ ...p, px: this.sx(p.x), py: this.sy(p.y), color: COLOR_PUNTO[p.tipo] })));
  protected readonly lineasV = computed(() => this.asintotasV().map((x) => this.sx(x)));
  protected readonly lineasH = computed(() => this.asintotasH().map((y) => this.sy(y)));

  protected zoom(factor: number, cx = 0.5, cy = 0.5): void {
    const rx = this.xmax() - this.xmin(), ry = this.ymax() - this.ymin();
    const px = this.xmin() + rx * cx, py = this.ymax() - ry * cy;
    this.xmin.set(px - (px - this.xmin()) * factor); this.xmax.set(px + (this.xmax() - px) * factor);
    this.ymin.set(py - (py - this.ymin()) * factor); this.ymax.set(py + (this.ymax() - py) * factor);
    this.ajusteManual = true;
  }
  protected alRueda(e: WheelEvent): void {
    e.preventDefault();
    const r = (e.currentTarget as SVGElement).getBoundingClientRect();
    this.zoom(e.deltaY > 0 ? 1.15 : 1 / 1.15, (e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height);
  }
  protected alPulsar(e: PointerEvent): void {
    (e.currentTarget as SVGElement).setPointerCapture(e.pointerId);
    this.arrastre = { x: e.clientX, y: e.clientY, id: e.pointerId };
  }
  protected alMover(e: PointerEvent): void {
    if (!this.arrastre) return;
    const r = (e.currentTarget as SVGElement).getBoundingClientRect();
    const dx = ((e.clientX - this.arrastre.x) / r.width) * (this.xmax() - this.xmin());
    const dy = ((e.clientY - this.arrastre.y) / r.height) * (this.ymax() - this.ymin());
    this.xmin.update((v) => v - dx); this.xmax.update((v) => v - dx);
    this.ymin.update((v) => v + dy); this.ymax.update((v) => v + dy);
    this.arrastre = { ...this.arrastre, x: e.clientX, y: e.clientY };
    this.ajusteManual = true;
  }
  protected alSoltar(): void { this.arrastre = null; }
  protected restablecer(): void {
    this.xmin.set(this.xmin0()); this.xmax.set(this.xmax0());
    this.ajusteManual = false;
    this.ajustarY();
  }
  protected get manual(): boolean { return this.ajusteManual; }
}
