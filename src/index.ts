#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { Api } from "./api";

const server = new McpServer({
	name: "mcp-adguard-home",
	version: "1.0.0",
});

server.registerTool(
	"list_rewrite_dns_records",
	{
		description: "List all DNS rewrite records (custom local DNS entries)",
	},
	async () => {
		const records = await Api.rewrite.list();
		return {
			content: [
				{
					type: "text",
					text: records.map((record) => `${record.domain} -> ${record.ip}`).join("\n"),
				},
			],
		};
	},
);

server.registerTool(
	"add_rewrite_dns_record",
	{
		description: "Add a DNS rewrite record mapping a domain to an IP address",
		inputSchema: z.object({
			domain: z.string(),
			ip: z
				.string()
				.describe(
					"if the ip is missing get the most common ip in the list of dns record before use this tool",
				),
		}),
	},
	async ({ domain, ip }) => {
		await Api.rewrite.add(domain, ip);
		return {
			content: [{ type: "text", text: `Added DNS entry: ${domain} -> ${ip}` }],
		};
	},
);

server.registerTool(
	"remove_rewrite_dns_record",
	{
		description: "Remove a DNS rewrite record by domain and IP address",
		inputSchema: z.object({
			domain: z.string(),
			ip: z.string(),
		}),
	},
	async ({ domain, ip }) => {
		await Api.rewrite.remove(domain, ip);
		return {
			content: [{ type: "text", text: `Removed DNS entry: ${domain} -> ${ip}` }],
		};
	},
);

server.registerTool(
	"list_dns_filtering_rules",
	{
		description: "List all custom DNS filtering rules (blocked or allowed domains)",
	},
	async () => {
		const rules = await Api.rules.list();
		return {
			content: rules.map((rule) => ({
				type: "text",
				text: `${rule.domain} = ${rule.allowed ? "Allowed" : "Blocked"}`,
			})),
		};
	},
);

server.registerTool(
	"manage_dns_filtering_rules",
	{
		description: "Block or allow domains using DNS filtering rules",
		inputSchema: z.object({
			domains: z.array(z.string()),
			allowed: z.boolean(),
		}),
	},
	async ({ domains, allowed }) => {
		await Api.rules.update(domains, allowed);
		return {
			content: [
				{
					type: "text",
					text: `Added or updated DNS record rules:\n${domains
						.map((domain) => `${domain} = ${allowed ? "Allowed" : "Blocked"}`)
						.join("\n")}`,
				},
			],
		};
	},
);

server.registerTool(
	"remove_rdns_filtering_rules",
	{
		description: "Remove custom DNS filtering rules for the given domains",
		inputSchema: z.object({
			domains: z.array(z.string()),
		}),
	},
	async ({ domains }) => {
		await Api.rules.remove(domains);
		return {
			content: [
				{
					type: "text",
					text: `Removed DNS record rules:\n${domains.join("\n")}`,
				},
			],
		};
	},
);

server.registerTool(
	"list_filter_lists",
	{
		description: "List all configured filter lists with their status and rule count",
	},
	async () => {
		const filters = await Api.filters.list();
		return {
			content: [
				{
					type: "text",
					text: filters
						.map(
							(f) =>
								`[${f.id}] ${f.name} — ${f.enabled ? "enabled" : "disabled"} — ${f.rules_count} rules\n  URL: ${f.url}`,
						)
						.join("\n"),
				},
			],
		};
	},
);

server.registerTool(
	"toggle_filter_list",
	{
		description: "Enable or disable a filter list by its ID (use list_filter_lists to get IDs)",
		inputSchema: z.object({
			id: z.number().describe("The numeric ID of the filter list"),
			enabled: z.boolean().describe("true to enable, false to disable"),
		}),
	},
	async ({ id, enabled }) => {
		try {
			await Api.filters.toggle(id, enabled);
			return {
				content: [
					{
						type: "text",
						text: `Filter list ${id} ${enabled ? "enabled" : "disabled"} successfully`,
					},
				],
			};
		} catch (e) {
			const message = e instanceof Error ? e.message : String(e);
			return {
				content: [{ type: "text", text: `Error: ${message}` }],
				isError: true,
			};
		}
	},
);

server.registerTool(
	"refresh_filter_lists",
	{
		description: "Force an update of all filter lists from their source URLs",
	},
	async () => {
		const result = await Api.filters.refresh();
		return {
			content: [
				{
					type: "text",
					text: `Filter lists refreshed. Updated: ${result.updated}`,
				},
			],
		};
	},
);

// Start receiving messages on stdin and sending messages on stdout
const transport = new StdioServerTransport();
await server.connect(transport);
