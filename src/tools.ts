import { z } from "zod";
import { Api } from "./api";

export type ToolResult = {
	content: { type: "text"; text: string }[];
	isError?: boolean;
};

export type AdGuardTool<TSchema extends z.ZodTypeAny = z.ZodTypeAny> = {
	name: string;
	description: string;
	inputSchema?: TSchema;
	run: (input: z.infer<TSchema>) => Promise<ToolResult>;
};

const AddRewriteDnsRecord = z.object({
	domain: z.string(),
	ip: z
		.string()
		.describe(
			"if the ip is missing get the most common ip in the list of dns record before use this tool",
		),
});

const RemoveRewriteDnsRecord = z.object({
	domain: z.string(),
	ip: z.string(),
});

const ManageDnsFilteringRules = z.object({
	domains: z.array(z.string()),
	allowed: z.boolean(),
});

const RemoveRdnsFilteringRules = z.object({
	domains: z.array(z.string()),
});

const ToggleFilterList = z.object({
	id: z.number().describe("The numeric ID of the filter list"),
	enabled: z.boolean().describe("true to enable, false to disable"),
});

export const adguardTools: AdGuardTool[] = [
	{
		name: "list_rewrite_dns_records",
		description: "List all DNS rewrite records (custom local DNS entries)",
		run: async () => {
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
	},
	{
		name: "add_rewrite_dns_record",
		description: "Add a DNS rewrite record mapping a domain to an IP address",
		inputSchema: AddRewriteDnsRecord,
		run: async ({ domain, ip }: z.infer<typeof AddRewriteDnsRecord>) => {
			await Api.rewrite.add(domain, ip);
			return {
				content: [{ type: "text", text: `Added DNS entry: ${domain} -> ${ip}` }],
			};
		},
	},
	{
		name: "remove_rewrite_dns_record",
		description: "Remove a DNS rewrite record by domain and IP address",
		inputSchema: RemoveRewriteDnsRecord,
		run: async ({ domain, ip }: z.infer<typeof RemoveRewriteDnsRecord>) => {
			await Api.rewrite.remove(domain, ip);
			return {
				content: [{ type: "text", text: `Removed DNS entry: ${domain} -> ${ip}` }],
			};
		},
	},
	{
		name: "list_dns_filtering_rules",
		description: "List all custom DNS filtering rules (blocked or allowed domains)",
		run: async () => {
			const rules = await Api.rules.list();
			return {
				content: rules.map((rule) => ({
					type: "text",
					text: `${rule.domain} = ${rule.allowed ? "Allowed" : "Blocked"}`,
				})),
			};
		},
	},
	{
		name: "manage_dns_filtering_rules",
		description: "Block or allow domains using DNS filtering rules",
		inputSchema: ManageDnsFilteringRules,
		run: async ({ domains, allowed }: z.infer<typeof ManageDnsFilteringRules>) => {
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
	},
	{
		name: "remove_rdns_filtering_rules",
		description: "Remove custom DNS filtering rules for the given domains",
		inputSchema: RemoveRdnsFilteringRules,
		run: async ({ domains }: z.infer<typeof RemoveRdnsFilteringRules>) => {
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
	},
	{
		name: "list_filter_lists",
		description: "List all configured filter lists with their status and rule count",
		run: async () => {
			const filters = await Api.filters.list();
			return {
				content: [
					{
						type: "text",
						text: filters
							.map(
								(f) =>
									`[${f.id}] ${f.name} - ${f.enabled ? "enabled" : "disabled"} - ${f.rules_count} rules\n  URL: ${f.url}`,
							)
							.join("\n"),
					},
				],
			};
		},
	},
	{
		name: "toggle_filter_list",
		description: "Enable or disable a filter list by its ID (use list_filter_lists to get IDs)",
		inputSchema: ToggleFilterList,
		run: async ({ id, enabled }: z.infer<typeof ToggleFilterList>) => {
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
	},
	{
		name: "refresh_filter_lists",
		description: "Force an update of all filter lists from their source URLs",
		run: async () => {
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
	},
];

export const findAdguardTool = (name: string) => {
	return adguardTools.find((tool) => tool.name === name);
};

export const formatToolResult = (result: ToolResult) => {
	return result.content.map((item) => item.text).join("\n");
};
