import { z } from "zod";
import { DnsRecords, Filtering, FilterLists, type Rule } from "./schema";

const EnvSchema = z.object({
	ADGUARD_USERNAME: z.string(),
	ADGUARD_PASSWORD: z.string(),
	ADGUARD_URL: z.string(),
});

const getEnv = () => {
	const result = EnvSchema.safeParse(process.env);

	if (!result.success) {
		console.error("Invalid environment variables", result.error.format());
		throw new Error("Invalid environment variables");
	}

	return result.data;
};

const serializeRule = (rule: Rule) => {
	return `${rule.allowed ? "@@" : ""}||${rule.domain}^$important`;
};

const api = async (path: string, body?: Record<string, unknown>) => {
	const env = getEnv();
	const Authorization = Buffer.from(`${env.ADGUARD_USERNAME}:${env.ADGUARD_PASSWORD}`).toString(
		"base64",
	);

	const res = await fetch(`${env.ADGUARD_URL}/control/${path}`, {
		method: body ? "POST" : "GET",
		headers: {
			Authorization: `Basic ${Authorization}`,
			"Content-Type": "application/json",
		},
		body: body ? JSON.stringify(body) : undefined,
	});

	if (!res.ok) {
		throw new Error(`AdGuard API error ${res.status}: ${await res.text()}`);
	}

	return res;
};

export const Api = {
	rules: {
		list: async () => {
			const res = await api("filtering/status");
			return Filtering.parse(await res.json());
		},
		update: async (domains: string[], allowed: boolean) => {
			const rules = await Api.rules.list();
			for (const domain of domains) {
				const rule = rules.find((item) => item.domain === domain);
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
				rules: prev.filter((rule) => !domains.includes(rule.domain)).map(serializeRule),
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
			return z.object({ updated: z.number() }).parse(await res.json());
		},
	},
};
