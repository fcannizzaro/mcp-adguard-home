import { mkdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { z } from "zod";

export const ConfigSchema = z.object({
	ADGUARD_URL: z.string().min(1),
	ADGUARD_USERNAME: z.string().min(1),
	ADGUARD_PASSWORD: z.string().min(1),
});

export type AdguardConfig = z.infer<typeof ConfigSchema>;

export const configPath = join(homedir(), ".config", "mcp-adguard-home", "config.json");

export const loadSavedConfig = async () => {
	try {
		const raw = await readFile(configPath, "utf8");
		return ConfigSchema.partial().parse(JSON.parse(raw));
	} catch (error) {
		const code = error instanceof Error && "code" in error ? error.code : undefined;
		if (code === "ENOENT") return {};
		throw error;
	}
};

export const loadConfig = async (): Promise<AdguardConfig> => {
	const saved = await loadSavedConfig();
	const result = ConfigSchema.safeParse({
		...process.env,
		...saved,
	});

	if (!result.success) {
		console.error("Invalid AdGuard credentials", result.error.format());
		throw new Error(
			`Missing AdGuard credentials. Run "adguard-cli login" or set ADGUARD_URL, ADGUARD_USERNAME and ADGUARD_PASSWORD.`,
		);
	}

	return result.data;
};

export const saveConfig = async (config: AdguardConfig) => {
	const data = ConfigSchema.parse(config);
	await mkdir(dirname(configPath), { recursive: true });
	await writeFile(configPath, `${JSON.stringify(data, null, 2)}\n`, { mode: 0o600 });
};
