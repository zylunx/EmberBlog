// 相册元信息，id 同时作为 URL slug 和 public/gallery 下的目录名。
export type GalleryAlbum = {
	id: string;
	name: string;
	description?: string;
	date?: string;
	location?: string;
	tags?: string[];
	cover?: string;
	password?: string;
	passwordHint?: string;
};

export type GalleryConfig = {
	albums: GalleryAlbum[];
	columnWidth?: number;
	networkAlbum?: {
		apiUrl?: string;
		categories?: {
			value: string;
			label: string;
		}[];
		defaultCategory?: string;
		maxQuantity?: number;
		defaultQuantity?: number;
		cooldownSeconds?: number;
	};
};
