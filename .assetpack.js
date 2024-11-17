import { pixiPipes } from '@assetpack/core/pixi';

export default {
    entry: './raw-assets',
    output: './public/assets/',
    cache: true,
    pipes: [
        ...pixiPipes({
            compression: { jpg: false, png: false, webp: false },
            resolutions: { default: 1 },
            texturePacker: {
                texturePacker: {
                    removeFileExtension: true,
                },
            },
            manifest: {
                output: './public/assets/assets-manifest.json',
            }
        }),
    ],
};