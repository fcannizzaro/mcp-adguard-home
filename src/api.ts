import { z } from "zod";
import { DnsRecords, FilterLists, Filtering, type FilterList, type Rule } from "./schema";

export const parsed = z
	.object({
		ADGUARD_USERNAME: z.string(),
		ADGUARD_PASSWORD: z.string(),
		ADGUARD_URL: z.string(),
	})
	.safeParse(process.env);

if (!parsed.success) {
	console.error("Invalid environment variables", parsed.error.format());
	throw new Error("Invalid environment variables");
}

const env = parsed.data;

const Authorization = Buffer.from(
	`${env.ADGUARD_USERNAME}:${env.ADGUARD_PASSWORD}`,
).toString("base64");

const headers = {
	Authorization: `Basic ${Authorization}`,
};

const serializeRule = (rule: Rule) => {
	return `${rule.allowed ? "@@" : ""}||${rule.domain}^$important`;
};

const api = (path: string, body?: Record<string, unknown>) =>
	fetch(`${env.ADGUARD_URL}/control/${path}`, {
		method: body ? "POST" : "GET",
		headers: {
			...headers,
			"Content-Type": "application/json",
		},
		body: body ? JSON.stringify(body) : undefined,
	});

export const Api = {
	rules: {
		list: async () => {
			const res = await api("filtering/status");
			return Filtering.parse(await res.json());
		},
		update: async (domains: string[], allowed: boolean) => {
			const rules = await Api.rules.list();
			for (const domain of domains) {
				const rule = rules.find((rule) => rule.domain === domain);
				if (rule) {
					rule.allowed = allowed;
				} else {
					rules.push({
						domain,
						allowed,
					});
				}
			}
			return api("filtering/set_rules", { rules: rules.map(serializeRule) });
		},
		remove: async (domains: string[]) => {
			const prev = await Api.rules.list();
			return api("filtering/set_rules", {
				rules: prev
					.filter((rule) => !domains.includes(rule.domain))
					.map(serializeRule),
			});
		},
	},
	rewrite: {
		list: async () => {
			const res = await api("rewrite/list");
			return DnsRecords.parse(await res.json());
		},
		add: async (domain: string, answer: string) =>
			api("rewrite/add", {
				domain,
				answer,
			}),
		remove: async (domain: string, answer: string) =>
			api("rewrite/delete", {
				domain,
				answer,
			}),
	},
	filters: {
		list: async () => {
			const res = await api("filtering/status");
			return FilterLists.parse(await res.json());
		},
		toggle: async (id: number, enabled: boolean) => {
			const filters = await Api.filters.list();
			const filter = filters.find((f) => f.id === id);
			if (!filter) {
				throw new Error(`Filter with id ${id} not found`);
			}
			return api("filtering/set_url", {
				url: filter.url,
				whitelist: false,
				data: {
					url: filter.url,
					name: filter.name,
					enabled,
				},
			});
		},
		refresh: async () => {
			const res = await api("filtering/refresh", { whitelist: false });
			return res.json() as Promise<{ updated: number }>;
		},
	},
};
