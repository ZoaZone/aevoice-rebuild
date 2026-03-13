export default class BrowserEnvironmentAdapter {
  getEnvironmentInfo() {
    return { type: "browser", os: "web" };
  }
  canListFiles() { return false; }
  canReadFiles() { return false; }
  canWriteFiles() { return false; }
  canRunCommands() { return false; }
  async listFiles() { return []; }
  async readFile() { throw new Error("Not supported in browser"); }
  async writeFile() { throw new Error("Not supported in browser"); }
  async runCommand() { throw new Error("Not supported in browser"); }
}