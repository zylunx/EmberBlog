/**
 * Build-time Algolia indexer.
 *
 * Usage:
 *   pnpm algolia:index              # write dev index (default when not prod)
 *   pnpm algolia:index -- --prod --force   # write production index
 *   pnpm algolia:index -- --dry-run
 *
 * Env:
 *   PUBLIC_ALGOLIA_APP_ID / searchConfig.algolia.appId
 *   ALGOLIA_ADMIN_API_KEY
 *   PUBLIC_ALGOLIA_INDEX (optional full override)
 *   ALGOLIA_INDEX_ENV=dev|prod
 *   ALGOLIA_INDEX_FORCE=1  (required to write production index)
 */

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { algoliasearch } from "algoliasearch";
import { glob } from "glob";
import matter from "gray-matter";
import { searchConfig } from "../src/config/searchConfig";
import { siteConfig } from "../src/config/siteConfig";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const POSTS_DIR = path.join(ROOT, "src/content/posts");

type CliOptions = {
	force: boolean;
	dryRun: boolean;
	env: "dev" | "prod" | "auto";
};

type PostRecord = {
	objectID: string;
	url: string;
	title: string;
	description: string;
	content: string;
	tags: string[];
	categories: string[];
	date: number;
	published: string;
};

function parseArgs(argv: string[]): CliOptions {
	const force =
		argv.includes("--force") || process.env.ALGOLIA_INDEX_FORCE === "1";
	const dryRun = argv.includes("--dry-run");
	let env: CliOptions["env"] = "auto";
	if (argv.includes("--prod")) env = "prod";
	else if (argv.includes("--dev")) env = "dev";
	return { force, dryRun, env };
}

function resolveIndexName(env: CliOptions["env"]): {
	name: string;
	isProd: boolean;
} {
	const override = process.env.PUBLIC_ALGOLIA_INDEX?.trim();
	if (override) {
		const isProd =
			override === searchConfig.algolia.indexName.prod ||
			override.endsWith("_prod") ||
			process.env.ALGOLIA_INDEX_ENV === "prod";
		return { name: override, isProd };
	}

	let target: "dev" | "prod";
	if (env === "auto") {
		const indexEnv = (process.env.ALGOLIA_INDEX_ENV || "").toLowerCase();
		if (indexEnv === "prod" || indexEnv === "production") target = "prod";
		else if (indexEnv === "dev" || indexEnv === "development") target = "dev";
		else target = process.env.NODE_ENV === "production" ? "prod" : "dev";
	} else {
		target = env;
	}

	return {
		name:
			target === "prod"
				? searchConfig.algolia.indexName.prod
				: searchConfig.algolia.indexName.dev,
		isProd: target === "prod",
	};
}

function removeFileExtension(id: string): string {
	return id.replace(/\.(md|mdx|markdown)$/i, "");
}

function toPostUrl(relId: string): string {
	const slug = removeFileExtension(relId).replace(/\\/g, "/");
	// Match site trailingSlash: always
	return `/posts/${slug}/`;
}

/**
 * title + description + stripped markdown body; drop fenced code blocks.
 */
function stripMarkdownToIndexText(raw: string): string {
	let text = raw;

	// fenced code blocks
	text = text.replace(/```[\s\S]*?```/g, " ");
	text = text.replace(/~~~[\s\S]*?~~~/g, " ");

	// inline code
	text = text.replace(/`[^`]*`/g, " ");

	// images ![alt](url) -> alt
	text = text.replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1");

	// links [text](url) -> text
	text = text.replace(/\[([^\]]+)\]\([^)]*\)/g, "$1");

	// HTML tags
	text = text.replace(/<[^>]+>/g, " ");

	// headings / emphasis / lists markers
	text = text.replace(/^#{1,6}\s+/gm, "");
	text = text.replace(/(\*\*|__)(.*?)\1/g, "$2");
	text = text.replace(/(\*|_)(.*?)\1/g, "$2");
	text = text.replace(/^\s*[-*+]\s+/gm, "");
	text = text.replace(/^\s*\d+\.\s+/gm, "");
	text = text.replace(/^\s*>\s+/gm, "");

	// MDX-ish import/export lines
	text = text.replace(/^\s*import\s.+$/gm, "");
	text = text.replace(/^\s*export\s.+$/gm, "");

	// collapse whitespace
	text = text.replace(/\r\n/g, "\n").replace(/[ \t]+\n/g, "\n");
	text = text.replace(/\n{3,}/g, "\n\n");
	text = text.replace(/[ \t]{2,}/g, " ");

	return text.trim();
}

async function collectRecords(): Promise<PostRecord[]> {
	const files = await glob("**/*.{md,mdx}", {
		cwd: POSTS_DIR,
		nodir: true,
		absolute: false,
	});

	const records: PostRecord[] = [];

	for (const rel of files) {
		const full = path.join(POSTS_DIR, rel);
		const raw = await fs.readFile(full, "utf-8");
		const { data, content } = matter(raw);

		const draft = Boolean(data.draft);
		const password =
			typeof data.password === "string" ? data.password.trim() : "";

		// Production index rules: skip drafts & password posts
		if (draft) continue;
		if (password) continue;

		const title = String(data.title || removeFileExtension(rel));
		const description = String(data.description || "");
		const tags = Array.isArray(data.tags)
			? data.tags.map((t) => String(t)).filter(Boolean)
			: [];
		const categoryRaw = data.category;
		const categories =
			categoryRaw && String(categoryRaw).trim()
				? [String(categoryRaw).trim()]
				: [];

		const publishedDate = data.published
			? new Date(data.published)
			: new Date(0);
		const date = Number.isNaN(publishedDate.getTime())
			? 0
			: publishedDate.getTime();

		const body = stripMarkdownToIndexText(content);
		const objectID = removeFileExtension(rel).replace(/\\/g, "/");

		records.push({
			objectID,
			url: toPostUrl(rel),
			title,
			description,
			content: body,
			tags,
			categories,
			date,
			published: publishedDate.toISOString(),
		});
	}

	return records;
}

async function main() {
	const opts = parseArgs(process.argv.slice(2).filter((a) => a !== "--"));
	const appId =
		process.env.PUBLIC_ALGOLIA_APP_ID?.trim() || searchConfig.algolia.appId;
	const adminKey = process.env.ALGOLIA_ADMIN_API_KEY?.trim() || "";

	const { name: indexName, isProd } = resolveIndexName(opts.env);
	const dateIndexName = `${indexName}_date_desc`;

	const records = await collectRecords();
	console.log(
		`[algolia:index] Prepared ${records.length} records for index "${indexName}" (site: ${siteConfig.site_url})`,
	);

	if (opts.dryRun) {
		console.log("[algolia:index] Dry run — sample object:");
		console.log(JSON.stringify(records[0] ?? null, null, 2));
		console.log(
			`[algolia:index] Would write ${records.length} objects to ${indexName} (replica: ${dateIndexName}, prod=${isProd})`,
		);
		return;
	}

	if (!appId) {
		throw new Error(
			"[algolia:index] Missing Application ID (PUBLIC_ALGOLIA_APP_ID or searchConfig.algolia.appId)",
		);
	}
	if (!adminKey) {
		throw new Error(
			"[algolia:index] Missing ALGOLIA_ADMIN_API_KEY (required to push records)",
		);
	}

	if (isProd && !opts.force) {
		throw new Error(
			`[algolia:index] Refusing to write production index "${indexName}" without --force or ALGOLIA_INDEX_FORCE=1`,
		);
	}

	const client = algoliasearch(appId, adminKey);

	const indexSettings = {
		searchableAttributes: [
			"title",
			"tags",
			"categories",
			"description",
			"content",
		],
		attributesForFaceting: ["tags", "categories"],
		attributesToRetrieve: [
			"url",
			"title",
			"description",
			"tags",
			"categories",
			"date",
			"published",
		],
		attributesToHighlight: ["title", "description", "content"],
		attributesToSnippet: ["content:20", "description:20"],
		customRanking: ["desc(date)"],
		highlightPreTag: "<mark>",
		highlightPostTag: "</mark>",
		// clickAnalytics 是搜索请求参数，不是索引 settings，不要写在这里
		replicas: [dateIndexName],
	};

	console.log(`[algolia:index] Setting settings on ${indexName}…`);
	await client.setSettings({
		indexName,
		indexSettings,
	});

	console.log(`[algolia:index] Configuring replica ${dateIndexName}…`);
	await client.setSettings({
		indexName: dateIndexName,
		indexSettings: {
			ranking: [
				"desc(date)",
				"typo",
				"geo",
				"words",
				"filters",
				"proximity",
				"attribute",
				"exact",
				"custom",
			],
		},
	});

	console.log(
		`[algolia:index] Atomic replaceAllObjects (${records.length} objects)…`,
	);
	await client.replaceAllObjects({
		indexName,
		objects: records,
		// wait for indexing task
		batchSize: 1000,
	});

	console.log("[algolia:index] Done.");
}

main().catch((err) => {
	console.error(err instanceof Error ? err.message : err);
	process.exit(1);
});
