export type BackgroundWallpaperConfig = {
	articleWaves?: {
		enable:
			| boolean
			| {
					desktop: boolean;
					mobile: boolean;
			  };
	};
};
