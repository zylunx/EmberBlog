import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { normalizePageInput } from "../src/utils/pagination-utils";

assert.deepEqual(normalizePageInput("12abc03", 99), {
	value: "99",
	page: 99,
});
assert.deepEqual(normalizePageInput("0008", 10), { value: "8", page: 8 });
assert.deepEqual(normalizePageInput("000", 10), { value: "", page: null });
assert.deepEqual(normalizePageInput("15", 8), { value: "8", page: 8 });

const source = readFileSync("src/components/common/Pagination.astro", "utf8");
assert.match(source, /class="page-jump-control"/);
assert.match(source, /normalizePageInput/);
assert.match(source, /inputmode="numeric"/);
