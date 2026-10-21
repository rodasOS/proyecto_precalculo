/// <reference lib="webworker" />
import { NombreOp, ejecutarOp } from './motor-ops';

addEventListener('message', ({ data }: MessageEvent<{ id: number; op: NombreOp; args: unknown[] }>) => {
  postMessage({ id: data.id, resultado: ejecutarOp(data.op, data.args) });
});
