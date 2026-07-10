import type { Img2ColorConfig } from "../types/config";

export const img2colorConfig: Img2ColorConfig = {
	enable: true,
	apiUrl: "https://img2color-go-jade.vercel.app/api",
	params: {
		format: "hsl",
		colors: 1,
		maxWidth: 400,
		skipBackground: false,
		algorithm: "mediancut",
	},
	timeoutMs: 15000,
	concurrency: 3,
};
