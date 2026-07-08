export type Img2ColorAlgorithm = "mediancut" | "kmeans";
export type Img2ColorFormat = "hex" | "rgb" | "hsl" | "cmyk";

export type Img2ColorConfig = {
	enable: boolean;
	apiUrl: string;
	params: {
		format?: Img2ColorFormat;
		colors?: number;
		maxWidth?: number;
		skipBackground?: boolean;
		algorithm?: Img2ColorAlgorithm;
	};
	timeoutMs: number;
	concurrency: number;
};
