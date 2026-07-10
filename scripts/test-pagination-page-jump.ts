import assert from "node:assert/strict";
import { normalizePageInput } from "../src/utils/pagination-utils";

assert.deepEqual(normalizePageInput("12abc03", 99), {
	value: "1203",
	page: 99,
});
assert.deepEqual(normalizePageInput("0008", 10), { value: "8", page: 8 });
assert.deepEqual(normalizePageInput("000", 10), { value: "", page: null });
assert.deepEqual(normalizePageInput("15", 8), { value: "15", page: 8 });
