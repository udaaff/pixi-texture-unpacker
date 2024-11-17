import { Application, Container, Rectangle, RenderTexture, Sprite } from 'pixi.js';

import { initAssets } from './utils/assets';
import JSZip from 'jszip';

/** The PixiJS app Application instance, shared across the project */
export const app = new Application();

/** Setup app and initialise assets */
async function init() {
    // Initialize app
    await app.init({
        resolution: Math.max(window.devicePixelRatio, 2),
        backgroundColor: 0x000000,
    });

    // Add pixi canvas element (app.canvas) to the document's body
    document.body.appendChild(app.canvas);

    // Setup assets bundles (see assets.ts) and start up loading everything in background
    await initAssets();

    const sprite = Sprite.from("graphic.png")
    const container = new Container();
    container.addChild(sprite);
    app.stage.addChild(container)

    const regions = []; // Define your regions
    for (let i = 0; i < 10; i++) {
        for (let j = 0; j < 10; j++) {
            regions.push(new Rectangle(i * 100, j * 100, 100, 100)); // Example dynamic regions
        }
    }

    // saveRegionsAsZip(container, regions, 'regions.zip');
}

async function saveRegionsAsZip(
    container: Container,
    regions: Rectangle[],
    zipFileName: string
) {
    const renderer = app.renderer; // Assuming `app` is your PIXI Application
    const zip = new JSZip();

    for (let i = 0; i < regions.length; i++) {
        const region = regions[i];
        const { x, y, width, height } = region;

        // Create a render texture of the desired region size
        const renderTexture = RenderTexture.create({ width, height });

        // Clone the container to isolate rendering
        const clonedContainer = cloneContainer(container);

        // Offset the cloned container to match the desired region
        clonedContainer.x = -x;
        clonedContainer.y = -y;

        // Render the region to the texture
        renderer.render({
            container: clonedContainer,
            target: renderTexture,
        });

        // Extract the image as a canvas
        const canvas = renderer.extract.canvas(renderTexture) as HTMLCanvasElement;
        const dataURL = canvas.toDataURL('image/png');

        // Convert data URL to Blob
        const response = await fetch(dataURL);
        const blob = await response.blob();

        // Add Blob to ZIP file
        zip.file(`region_${i + 1}.png`, blob);

        // Cleanup
        renderTexture.destroy(true);
        clonedContainer.destroy({ children: true });
    }

    // Generate ZIP and trigger download
    zip.generateAsync({ type: 'blob' }).then((content) => {
        const link = document.createElement('a');
        link.href = URL.createObjectURL(content);
        link.download = zipFileName;
        link.click();
    });
}

function cloneContainer(container: Container): Container {
    const clone = new Container();

    // Copy basic properties
    clone.position.set(container.x, container.y);
    clone.scale.set(container.scale.x, container.scale.y);
    clone.rotation = container.rotation;

    // Clone children recursively
    container.children.forEach((child) => {
        if (child instanceof Sprite) {
            const spriteClone = new Sprite(child.texture);
            spriteClone.position.set(child.x, child.y);
            spriteClone.scale.set(child.scale.x, child.scale.y);
            spriteClone.rotation = child.rotation;
            clone.addChild(spriteClone);
        } else if (child instanceof Container) {
            clone.addChild(cloneContainer(child));
        }
    });

    return clone;
}

// Init everything
init();