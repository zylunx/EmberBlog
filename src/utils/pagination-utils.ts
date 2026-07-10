export interface NormalizedPageInput {
	value: string;
	page: number | null;
}

export function normalizePageInput(
	value: string,
	lastPage: number,
): NormalizedPageInput {
	const normalizedValue = value.replace(/\D/g, "").replace(/^0+/, "");
	if (!normalizedValue) return { value: "", page: null };

	return {
		value: normalizedValue,
		page: Math.min(Number.parseInt(normalizedValue, 10), lastPage),
	};
}
