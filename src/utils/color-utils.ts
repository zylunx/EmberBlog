/**
 * HEX 主题色校验与对比文字色派生。
 *
 * 主题色始终保留逐字 HEX；柔和表面色由 CSS color-mix() 直接派生。
 */

export interface ThemeColorTokens {
	main: string;
	dark: string;
	onMain: "#000000" | "#ffffff";
	onDark: "#000000" | "#ffffff";
}

/** 解析 #RGB / #RRGGBB（可含或不含 #）为 0–1 的 sRGB 分量。 */
export function parseHex(
	hex: string,
): { r: number; g: number; b: number } | null {
	if (typeof hex !== "string") {
		return null;
	}

	let value = hex.trim().replace(/^#/, "");
	if (value.length === 3) {
		value = value
			.split("")
			.map((channel) => channel.repeat(2))
			.join("");
	}
	if (value.length !== 6 || !/^[\da-f]{6}$/i.test(value)) {
		return null;
	}

	const numeric = Number.parseInt(value, 16);
	return {
		r: ((numeric >> 16) & 0xff) / 255,
		g: ((numeric >> 8) & 0xff) / 255,
		b: (numeric & 0xff) / 255,
	};
}

function srgbToLinear(channel: number): number {
	return channel <= 0.04045
		? channel / 12.92
		: ((channel + 0.055) / 1.055) ** 2.4;
}

function relativeLuminance({
	r,
	g,
	b,
}: {
	r: number;
	g: number;
	b: number;
}): number {
	return (
		0.2126 * srgbToLinear(r) +
		0.7152 * srgbToLinear(g) +
		0.0722 * srgbToLinear(b)
	);
}

/** 为 HEX 背景选择对比度更高的黑色或白色文字。 */
export function onAccentFg(hex: string): "#000000" | "#ffffff" {
	const color = parseHex(hex);
	if (!color) {
		throw new Error(
			`强调色必须是 #RGB 或 #RRGGBB，当前值：${JSON.stringify(hex)}`,
		);
	}

	const luminance = relativeLuminance(color);
	const contrastWithBlack = (luminance + 0.05) / 0.05;
	const contrastWithWhite = 1.05 / (luminance + 0.05);
	return contrastWithWhite >= contrastWithBlack ? "#ffffff" : "#000000";
}

/** 校验站点主题 HEX，并生成明暗模式所需 token。 */
export function deriveThemeColorTokens(
	main: string,
	dark: string,
): ThemeColorTokens {
	if (!parseHex(main)) {
		throw new Error(
			`siteConfig.style.color.main 必须是 #RGB 或 #RRGGBB，当前值：${JSON.stringify(main)}`,
		);
	}
	if (!parseHex(dark)) {
		throw new Error(
			`siteConfig.style.color.dark 必须是 #RGB 或 #RRGGBB，当前值：${JSON.stringify(dark)}`,
		);
	}

	return {
		main,
		dark,
		onMain: onAccentFg(main),
		onDark: onAccentFg(dark),
	};
}
