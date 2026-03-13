export default class DesktopEnvironmentAdapter {
  getEnvironmentInfo() {
    return { type: 'desktop', os: 'native' };
  }
  canListFiles() { return !!(typeof window !== 'undefined' && (window.electron || window.__TAURI__)); }
  canReadFiles() { return this.canListFiles(); }
  canWriteFiles() { return this.canListFiles(); }
  canRunCommands() { return !!(typeof window !== 'undefined' && (window.electron?.runCommand || window.__TAURI__?.invoke)); }
  async listFiles() { return []; }
  async readFile(path) {
    if (typeof window !== 'undefined' && window.electron?.readFile) return await window.electron.readFile(path);
    throw new Error('Not implemented');
  }
  async writeFile(path, contents) {
    if (typeof window !== 'undefined' && window.electron?.writeFile) return await window.electron.writeFile(path, contents);
    throw new Error('Not implemented');
  }
  async runCommand(cmd) {
    if (typeof window !== 'undefined' && window.electron?.runCommand) return await window.electron.runCommand(cmd);
    if (typeof window !== 'undefined' && window.__TAURI__?.invoke) return await window.__TAURI__.invoke('run_command', { cmd });
    throw new Error('Not implemented');
  }
}