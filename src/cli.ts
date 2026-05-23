#!/usr/bin/env node

import { z } from "zod";
import { adguardTools, findAdguardTool, formatToolResult } from "./tools";

const commands = adguardTools
	.map((tool) => `  ${tool.name.padEnd(32)} ${tool.description}`)
	.join("\n");

const usage = `Usage:
  adguard-cli <command> [json-args]

Examples:
  adguard-cli list_rewrite_dns_records
  adguard-cli add_rewrite_dns_record --domain example.test --ip 192.168.1.10
  adguard-cli manage_dns_filtering_rules --domains ads.example --allowed false

Environment:
  ADGUARD_URL       Base URL of your AdGuard Home instance
  ADGUARD_USERNAME  AdGuard Home username
  ADGUARD_PASSWORD  AdGuard Home password

Commands:
${commands}
`;

const parseValue = (value: string, schema: z.ZodTypeAny): unknown => {
	if (schema instanceof z.ZodNumber) return Number(value);
	if (schema instanceof z.ZodBoolean) return value === "true";
	if (schema instanceof z.ZodArray) return value.split(",").filter(Boolean);
	return value;
};

const parseFlags = (args: string[], schema: z.ZodObject<z.ZodRawShape>) => {
	const shape = schema.shape;
	const result: Record<string, unknown> = {};

	for (let index = 0; index < args.length; index++) {
		const arg = args[index];
		if (!arg?.startsWith("--")) {
			throw new Error(`Unexpected argument: ${arg}`);
		}

		const key = arg.slice(2);
		const fieldSchema = shape[key];
		if (!fieldSchema) {
			throw new Error(`Unknown option: --${key}`);
		}

		const value = args[index + 1];
		if (!value || value.startsWith("--")) {
			throw new Error(`Missing value for --${key}`);
		}

		const parsedValue = parseValue(value, fieldSchema);
		if (
			fieldSchema instanceof z.ZodArray &&
			Array.isArray(result[key]) &&
			Array.isArray(parsedValue)
		) {
			result[key] = [...result[key], ...parsedValue];
		} else {
			result[key] = parsedValue;
		}

		index++;
	}

	return result;
};

const parseArgs = (args: string[], schema: z.ZodTypeAny | undefined) => {
	if (args.length === 0) return {};

	if (!schema) {
		throw new Error(`Unexpected argument: ${args[0]}`);
	}

	if (args.length === 1 && args[0]?.startsWith("{")) {
		try {
			return JSON.parse(args[0]);
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			throw new Error(`Invalid JSON arguments: ${message}`, { cause: error });
		}
	}

	if (schema instanceof z.ZodObject) {
		return parseFlags(args, schema);
	}

	throw new Error("This command does not support CLI flags");
};

const [command, ...rawArgs] = process.argv.slice(2);

try {
	if (!command || command === "--help" || command === "-h") {
		console.log(usage);
		process.exit(0);
	}

	const tool = findAdguardTool(command);
	if (!tool) {
		console.error(`Unknown command: ${command}\n`);
		console.error(usage);
		process.exit(1);
	}

	const parsedArgs = tool.inputSchema?.parse(parseArgs(rawArgs, tool.inputSchema)) ?? {};
	const result = await tool.run(parsedArgs);
	const output = formatToolResult(result);

	if (output) {
		console.log(output);
	}

	process.exit(result.isError ? 1 : 0);
} catch (error) {
	const message = error instanceof Error ? error.message : String(error);
	console.error(message);
	process.exit(1);
}
