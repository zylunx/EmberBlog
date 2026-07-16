/**
 * Post-build search step: Pagefind and/or Algolia, based on searchConfig + env.
 *
 * Invoked at the end of `pnpm build`.
 */

import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { searchConfig } from "../src/config/searchConfig";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

function env(name: string): string {
	return (process.env[name] || "").trim();
}

function resolvePreferredProvider(): "pagefind" | "algolia" {
	if (searchConfig.provider !== "algolia") return "pagefind";

	const appId = env("PUBLIC_ALGOLIA_APP_ID") || searchConfig.algolia.appId;
	const searchKey = env("PUBLIC_ALGOLIA_SEARCH_KEY");
	const hasIndex =
		Boolean(env("PUBLIC_ALGOLIA_INDEX")) ||
		Boolean(searchConfig.algolia.indexName.prod) ||
		Boolean(searchConfig.algolia.indexName.dev);

	if (!appId || !searchKey || !hasIndex) {
		console.warn(
			"[postbuild-search] Algolia public config incomplete (appId / PUBLIC_ALGOLIA_SEARCH_KEY / index). Falling back to Pagefind.",
		);
		return "pagefind";
	}
	return "algolia";
}

function run(
	command: string,
	args: string[],
	opts: { cwd?: string; env?: NodeJS.ProcessEnv } = {},
): Promise<number> {
	return new Promise((resolve, reject) => {
		const child = spawn(command, args, {
			cwd: opts.cwd ?? ROOT,
			env: { ...process.env, ...opts.env },
			stdio: "inherit",
			// Windows needs shell for pnpm.cmd resolution; avoid DEP0190 by joining carefully
			shell: process.platform === "win32",
			windowsHide: true,
		});
		child.on("error", reject);
		child.on("close", (code) => resolve(code ?? 1));
	});
}

async function runPagefind(): Promise<void> {
	console.log("[postbuild-search] Running Pagefind…");
	const code = await run("pnpm", ["exec", "pagefind", "--site", "dist"]);
	if (code !== 0) {
		throw new Error(`[postbuild-search] Pagefind exited with code ${code}`);
	}
}

async function runAlgoliaIndex(): Promise<void> {
	const adminKey = env("ALGOLIA_ADMIN_API_KEY");
	if (!adminKey) {
		const msg =
			"[postbuild-search] ALGOLIA_ADMIN_API_KEY missing; cannot push Algolia index.";
		if (searchConfig.algolia.failBuildOnIndexError) {
			throw new Error(msg);
		}
		console.warn(`${msg} Continuing because failBuildOnIndexError=false.`);
		return;
	}

	// Production writes need an explicit force flag (CI should set ALGOLIA_INDEX_FORCE=1).
	const indexEnv = (env("ALGOLIA_INDEX_ENV") || "prod").toLowerCase();
	const targetProd =
		indexEnv === "prod" ||
		indexEnv === "production" ||
		process.env.NODE_ENV === "production";

	const args = ["tsx", path.join(ROOT, "scripts/index-algolia.ts")];
	if (targetProd) {
		args.push("--prod");
		if (env("ALGOLIA_INDEX_FORCE") === "1") {
			args.push("--force");
		} else if (searchConfig.algolia.failBuildOnIndexError) {
			throw new Error(
				"[postbuild-search] Production index push requires ALGOLIA_INDEX_FORCE=1 (or run pnpm algolia:index -- --prod --force).",
			);
		} else {
			console.warn(
				"[postbuild-search] Skipping prod index push (no ALGOLIA_INDEX_FORCE=1).",
			);
			return;
		}
	} else {
		args.push("--dev");
	}

	console.log("[postbuild-search] Pushing Algolia index…");
	const code = await run("pnpm", ["exec", ...args]);
	if (code !== 0) {
		const msg = `[postbuild-search] Algolia index script exited with code ${code}`;
		if (searchConfig.algolia.failBuildOnIndexError) {
			throw new Error(msg);
		}
		console.warn(`${msg} Continuing because failBuildOnIndexError=false.`);
	}
}

async function main() {
	const provider = resolvePreferredProvider();
	console.log(`[postbuild-search] Effective provider: ${provider}`);

	if (provider === "algolia") {
		await runAlgoliaIndex();
	} else {
		await runPagefind();
	}
}

main().catch((err) => {
	console.error(err instanceof Error ? err.message : err);
	process.exit(1);
});
