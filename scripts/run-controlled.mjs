import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

export function runControlled(steps, root) {
  const guard = path.join(os.homedir(), '.codex', 'projects', 'mejoras-operativas', 'tools', 'Invoke-ControlledBuild.ps1');
  // Local Windows coordination; other machines retain sequential execution.
  if (process.platform === 'win32' && fs.existsSync(guard)) {
    const shell = path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe');
    const result = spawnSync(shell, [
      '-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', guard,
      '-WorkingDirectory', root,
      '-StepsBase64', Buffer.from(JSON.stringify(steps), 'utf8').toString('base64'),
    ], { cwd: root, stdio: 'inherit', windowsHide: true });
    if (result.error) console.error(result.error.message);
    return result.status ?? 1;
  }
  for (const step of steps) {
    const result = spawnSync(step.executable, step.arguments, { cwd: root, stdio: 'inherit', windowsHide: true });
    if (result.error) console.error(result.error.message);
    if (result.status !== 0) return result.status ?? 1;
  }
  return 0;
}
