#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { adguardTools } from "./tools";

const server = new McpServer({
	name: "mcp-adguard-home",
	version: "1.0.0",
});

for (const tool of adguardTools) {
	server.registerTool(
		tool.name,
		{
			description: tool.description,
			inputSchema: tool.inputSchema,
		},
		tool.run,
	);
}

// Start receiving messages on stdin and sending messages on stdout
const transport = new StdioServerTransport();
await server.connect(transport);
