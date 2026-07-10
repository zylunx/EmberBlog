import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { glob } from "glob";
import matter from "gray-matter";
import { img2colorConfig } from "../src/config/img2colorConfig";

type ProcessResult = {
	file: string;
	status: "updated" | "skipped" | "error";
	notify?: boolean;
	reason?: string;
};

type Img2ColorResponse = {
	code?: number;
	data?: {
		dominant?: unknown;
	};
	message?: string;
};

type HslColor = {
	h: number;
	s: number;
	l: number;
};

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const POSTS_DIR = path.resolve(__dirname, "../src/content/posts");
const COLOR_FIELD = "color";
const IMAGE_FIELD = "image";

function isBlankColor(value: unknown): boolean {
	return (
		value === undefined ||
		value === null ||
		(typeof value === "string" && value.trim() === "")
	);
}

function isRemoteImageUrl(value: unknown): value is string {
	return typeof value === "string" && /^https?:\/\//i.test(value);
}

function isHslColor(value: unknown): value is HslColor {
	if (typeof value !== "object" || value === null || Array.isArray(value)) {
		return false;
	}

	const { h, s, l } = value as Record<string, unknown>;
	return (
		typeof h === "number" &&
		Number.isFinite(h) &&
		h >= 0 &&
		h <= 360 &&
		typeof s === "number" &&
		Number.isFinite(s) &&
		s >= 0 &&
		s <= 100 &&
		typeof l === "number" &&
		Number.isFinite(l) &&
		l >= 0 &&
		l <= 100
	);
}

function normalizeDominantColor(value: unknown): string | undefined {
	if (typeof value === "string" && value.trim() !== "") {
		return value.trim();
	}

	if (isHslColor(value)) {
		return `hsl(${value.h} ${value.s}% ${value.l}%)`;
	}
}

function quoteColorInFrontmatter(source: string, color: string): string {
	const frontmatterEnd = source.indexOf("\n---\n");
	if (frontmatterEnd === -1) {
		throw new Error("Unable to find frontmatter end delimiter");
	}

	const frontmatter = source.slice(0, frontmatterEnd);
	if (!/^color:.*$/m.test(frontmatter)) {
		throw new Error("Unable to find frontmatter color field");
	}

	return `${frontmatter.replace(/^color:.*$/m, `color: ${JSON.stringify(color)}`)}${source.slice(frontmatterEnd)}`;
}

function buildApiUrl(imageUrl: string): string {
	const url = new URL(img2colorConfig.apiUrl);
	url.searchParams.set("img", imageUrl);

	for (const [key, value] of Object.entries(img2colorConfig.params)) {
		if (value !== undefined && value !== null) {
			url.searchParams.set(key, String(value));
		}
	}

	return url.toString();
}

async function fetchDominantColor(imageUrl: string): Promise<string> {
	const controller = new AbortController();
	const timeout = setTimeout(
		() => controller.abort(),
		img2colorConfig.timeoutMs,
	);

	try {
		const response = await fetch(buildApiUrl(imageUrl), {
			signal: controller.signal,
		});

		if (!response.ok) {
			throw new Error(`API responded with ${response.status}`);
		}

		const json = (await response.json()) as Img2ColorResponse;
		const dominant = normalizeDominantColor(json.data?.dominant);
		if (!dominant) {
			throw new Error(json.message || "API response missing data.dominant");
		}

		return dominant;
	} finally {
		clearTimeout(timeout);
	}
}

async function processPost(filePath: string): Promise<ProcessResult> {
	const relativePath = path.relative(POSTS_DIR, filePath).replace(/\\/g, "/");

	try {
		const raw = await fs.readFile(filePath, "utf-8");
		const parsed = matter(raw);

		if (!isBlankColor(parsed.data[COLOR_FIELD])) {
			return {
				file: relativePath,
				status: "skipped",
				reason: "color already exists",
			};
		}

		const image = parsed.data[IMAGE_FIELD];
		if (!isRemoteImageUrl(image)) {
			return {
				file: relativePath,
				status: "skipped",
				notify: true,
				reason: "image is not an http/https URL",
			};
		}

		const color = await fetchDominantColor(image);
		parsed.data[COLOR_FIELD] = color;
		const output = quoteColorInFrontmatter(
			matter.stringify(parsed.content, parsed.data),
			color,
		);
		await fs.writeFile(filePath, output, "utf-8");

		return { file: relativePath, status: "updated", reason: color };
	} catch (error) {
		return {
			file: relativePath,
			status: "error",
			reason: error instanceof Error ? error.message : String(error),
		};
	}
}

async function runConcurrent<T, R>(
	items: T[],
	worker: (item: T) => Promise<R>,
	concurrency: number,
): Promise<R[]> {
	const results: R[] = [];
	let index = 0;
	const workerCount = Math.max(1, Math.min(concurrency, items.length));

	await Promise.all(
		Array.from({ length: workerCount }, async () => {
			while (index < items.length) {
				const currentIndex = index++;
				results[currentIndex] = await worker(items[currentIndex]);
			}
		}),
	);

	return results;
}

async function main() {
	if (!img2colorConfig.enable) {
		console.log("[img2color] Disabled by config.");
		return;
	}

	if (!img2colorConfig.apiUrl) {
		throw new Error("[img2color] apiUrl is required.");
	}
	new URL(img2colorConfig.apiUrl);

	const files = await glob("**/*.{md,mdx}", {
		cwd: POSTS_DIR,
		absolute: true,
		ignore: ["**/_quarantine/**"],
	});

	if (files.length === 0) {
		console.log("[img2color] No posts found.");
		return;
	}

	const results = await runConcurrent(
		files,
		processPost,
		img2colorConfig.concurrency,
	);
	const updated = results.filter((result) => result.status === "updated");
	const skipped = results.filter((result) => result.status === "skipped");
	const errors = results.filter((result) => result.status === "error");

	for (const result of updated) {
		console.log(`[img2color] Updated ${result.file}: ${result.reason}`);
	}
	for (const result of skipped.filter((result) => result.notify)) {
		console.warn(`[img2color] Skipped ${result.file}: ${result.reason}`);
	}
	for (const result of errors) {
		console.error(`[img2color] Failed ${result.file}: ${result.reason}`);
	}

	console.log(
		`[img2color] Done. Updated: ${updated.length}, skipped: ${skipped.length}, errors: ${errors.length}.`,
	);
}

if (
	process.argv[1] &&
	import.meta.url === pathToFileURL(process.argv[1]).href
) {
	main().catch((error) => {
		console.error(error instanceof Error ? error.message : error);
		process.exit(1);
	});
}
