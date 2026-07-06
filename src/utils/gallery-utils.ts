import fs from "node:fs";
import path from "node:path";
import type { GalleryAlbum } from "@/types/galleryConfig";
import { url } from "@/utils/url-utils";

function withBase(assetPath: string): string {
	if (!assetPath) return "";
	if (/^(https?:)?\/\//i.test(assetPath) || /^(data|blob):/i.test(assetPath)) {
		return assetPath;
	}
	const normalizedPath = assetPath.startsWith("/")
		? assetPath
		: `/${assetPath}`;
	const base = import.meta.env.BASE_URL || "/";
	if (base !== "/" && normalizedPath.startsWith(base)) {
		return normalizedPath;
	}
	return url(normalizedPath);
}

export function scanAlbumPhotos(albumId: string): string[] {
	const dir = path.join(process.cwd(), "public", "gallery", albumId);
	if (!fs.existsSync(dir)) return [];

	const files = fs
		.readdirSync(dir)
		.filter((file) => /\.(jpe?g|png|webp|avif|gif)$/i.test(file))
		.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

	const coverIndex = files.findIndex((file) => /^cover\./i.test(file));
	if (coverIndex > 0) {
		const [coverFile] = files.splice(coverIndex, 1);
		files.unshift(coverFile);
	}

	const localPhotos = files.map((file) =>
		withBase(`/gallery/${albumId}/${file}`),
	);
	const urlsFile = path.join(dir, "urls.txt");
	const remotePhotos = fs.existsSync(urlsFile)
		? fs
				.readFileSync(urlsFile, "utf-8")
				.split("\n")
				.map((line) => line.trim())
				.filter((line) => line && !line.startsWith("#"))
		: [];

	return [...localPhotos, ...remotePhotos];
}

export function getAlbumCover(album: GalleryAlbum, photos: string[]): string {
	if (album.cover) return withBase(album.cover);
	const coverFile = photos.find((photo) => /\/cover\./i.test(photo));
	return coverFile || photos[0] || "";
}
