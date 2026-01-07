# Cograph MCP Server

A Model Context Protocol (MCP) server for code analysis using the Claude API.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Configure environment variables:
```bash
cp .env.example .env
# Edit .env and add your ANTHROPIC_API_KEY
```

## Development

Run the server in development mode with hot reload:
```bash
npm run dev
```

## Build

Compile TypeScript to JavaScript:
```bash
npm run build
```

## Run

Start the compiled server:
```bash
npm start
```

## Type Checking

Run TypeScript type checking without building:
```bash
npm run typecheck
```

## Available Tools

### ping
Test tool that responds with "pong". Used to verify server connectivity.

**Parameters:**
- `message` (string, optional): Optional message to echo back

**Example:**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "ping",
    "arguments": {
      "message": "hello"
    }
  }
}
```

**Response:**
```json
{
  "result": {
    "content": [
      {
        "type": "text",
        "text": "pong: hello"
      }
    ]
  },
  "jsonrpc": "2.0",
  "id": 1
}
```

## Architecture

- **Transport**: stdio (standard input/output)
- **Protocol**: Model Context Protocol (MCP)
- **AI Provider**: Anthropic Claude API

## Dependencies

- `@modelcontextprotocol/sdk`: MCP server implementation
- `@anthropic-ai/sdk`: Claude API client
- `dotenv`: Environment variable management
- `zod`: Schema validation
