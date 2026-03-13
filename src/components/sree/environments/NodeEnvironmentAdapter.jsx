export default class NodeEnvironmentAdapter {
  getEnvironmentInfo() {
    // Node adapter is a stub in this app context
    const platform = typeof process !== 'undefined' ? process.platform : 'unknown';
    return { type: 'node', os: platform };
  }
  canListFiles() { return false; }
  canReadFiles() { return false; }
  canWriteFiles() { return false; }
  canRunCommands() { return false; }
  async listFiles() { return []; }
  async readFile() { throw new Error('Node adapter stub'); }
  async writeFile() { throw new Error('Node adapter stub'); }
  async runCommand() { throw new Error('Node adapter stub'); }
}