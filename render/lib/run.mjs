// lib/run.mjs — paket komutlarını alt süreç olarak çağırma (kaynak hattın `node render/harness.mjs …` kalıbının yerine).
// Her çağrı dağıtıcıdan (bin/motion-render.mjs) geçer; proje kökü MOTION_PROJECT ile taşınır, cwd = proje kökü (kaynakla aynı).
//   spawnSync(process.execPath, harnessArgs('probe', id, '--frame', '0', …), { cwd: ROOT, env: harnessEnv() })
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { ROOT } from './project.mjs';

export const BIN = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'bin', 'motion-render.mjs');

// [dağıtıcı, komut, argümanlar…] — process.execPath ile çalıştırılır (dizi argümanlar düzleştirilir)
export function harnessArgs(cmd, ...args) { return [BIN, cmd, ...args.flat().map(String)]; }
export function harnessEnv(extra = {}) { return { ...process.env, MOTION_PROJECT: ROOT, ...extra }; }

// Eşzamanlı çağrı: opts.stdio 'inherit' ise çıktı doğrudan konsola; değilse stdout/stderr metin olarak döner.
export function runCmd(cmd, args = [], opts = {}) {
  const { env, ...rest } = opts;
  return spawnSync(process.execPath, harnessArgs(cmd, args), { cwd: ROOT, env: harnessEnv(env), encoding: 'utf8', maxBuffer: 64 << 20, ...rest });
}

// probe --eval çıktısındaki "eval → <json>" satırını çözer (sonuç bir kez JSON.parse edilir; sayfa JSON.stringify döndürdüyse ikinci parse çağırana kalır)
export function parseEval(stdout) {
  const ln = String(stdout || '').split('\n').find((l) => l.includes('eval →'));
  return ln ? JSON.parse(ln.slice(ln.indexOf('→') + 1).trim()) : undefined;
}
