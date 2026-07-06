import type { GalleryConfig } from "@/types/galleryConfig";

export const galleryConfig: GalleryConfig = {
	albums: [
		{
			id: "firefly-2026",
			name: "可爱流萤",
			description: "飞萤之火自无梦的长夜亮起，绽放在终竟的明天。",
			location: "崩坏：星穹铁道",
			date: "2026-01-01",
			tags: ["崩坏星穹铁道", "流萤"],
		},
		{
			id: "encrypted-test",
			name: "加密相册示例",
			description: "设置访问密码后，输入正确密码才能查看相册内容。",
			location: "私人相册",
			date: "2026-02-01",
			tags: ["加密相册", "示例"],
			password: "123456",
			passwordHint: "示例密码：123456",
		},
	],
	columnWidth: 240,
	networkAlbum: {
		apiUrl: "https://t.alcy.cc/json",
		categories: [
			{ value: "pc", label: "pc" },
			{ value: "ai", label: "AI" },
			{ value: "aimp", label: "AI MP" },
			{ value: "bd", label: "BD" },
			{ value: "fj", label: "FJ" },
			{ value: "fjmp", label: "FJ MP" },
			{ value: "lai", label: "LAI" },
			{ value: "moe", label: "Moe" },
			{ value: "moemp", label: "Moe MP" },
			{ value: "mp", label: "MP" },
			{ value: "tx", label: "TX" },
			{ value: "xhl", label: "XHL" },
			{ value: "ys", label: "YS" },
			{ value: "ysmp", label: "YS MP" },
		],
		defaultCategory: "pc",
		maxQuantity: 10,
		defaultQuantity: 6,
		cooldownSeconds: 5,
	},
};
