// Mock for @modelcontextprotocol/sdk/client/index.js
class Client {
  constructor() {
    this.connect = jest.fn();
    this.close = jest.fn();
    this.ping = jest.fn();
    this.listTools = jest.fn();
    this.callTool = jest.fn();
  }
}

module.exports = { Client };