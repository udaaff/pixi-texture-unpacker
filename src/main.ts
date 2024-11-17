import { Application, Assets, Container, Rectangle, RenderTexture, Sprite } from 'pixi.js';

import { initAssets } from './utils/assets';
import JSZip from 'jszip';

/** The PixiJS app Application instance, shared across the project */
export const app = new Application();

/** Setup app and initialise assets */
async function init() {
    // Initialize app
    await app.init({
        backgroundColor: 0x000000,
    });

    // Add pixi canvas element (app.canvas) to the document's body
    document.body.appendChild(app.canvas);

    // Setup assets bundles (see assets.ts) and start up loading everything in background
    await initAssets();

    const sprite = Sprite.from("graphic.png")
    const container = new Container();
    container.addChild(sprite);

    const regions = await parseXMLRegions(Assets.get("graphic.xml"));
    saveRegionsAsZip(container, regions, "unpacked.zip")
}

async function saveRegionsAsZip(
    container: Container,
    regions: { name: string; rectangle: Rectangle; frame?: { x: number; y: number; width: number; height: number } }[],
    zipFileName: string
) {
    const renderer = app.renderer;
    renderer.resolution = Math.max(window.devicePixelRatio, 2); // Ensure resolution is correct
    const zip = new JSZip();

    for (let i = 0; i < regions.length; i++) {
        const { name, rectangle, frame } = regions[i];
        const { x, y, width, height } = rectangle;

        // Create a render texture for the trimmed region
        const renderTexture = RenderTexture.create({
            width,
            height,
            resolution: renderer.resolution,
        });

        // Clone the container for rendering
        const clonedContainer = cloneContainer(container);
        clonedContainer.x = -x;
        clonedContainer.y = -y;

        // Render the region to the texture
        renderer.render({
            container: clonedContainer,
            target: renderTexture,
        });

        // Extract the image as a canvas
        const canvas = renderer.extract.canvas(renderTexture) as HTMLCanvasElement;

        if (frame) {
            const { x: frameX, y: frameY, width: frameWidth, height: frameHeight } = frame;

            // Create a new canvas for the full frame
            const frameCanvas = document.createElement("canvas");
            frameCanvas.width = frameWidth * renderer.resolution;
            frameCanvas.height = frameHeight * renderer.resolution;

            const context = frameCanvas.getContext("2d")!;
            context.scale(renderer.resolution, renderer.resolution); // Scale for resolution
            // Draw the trimmed texture onto the full frame
            context.drawImage(canvas, 0, 0, width * renderer.resolution, height * renderer.resolution, -frameX, -frameY, width, height);

            // Replace the original canvas with the frame canvas
            const dataURL = frameCanvas.toDataURL("image/png");

            // Convert data URL to Blob
            const response = await fetch(dataURL);
            const blob = await response.blob();

            // Add Blob to ZIP file
            zip.file(`${name}.png`, blob);
        } else {
            // No frame, use the original trimmed canvas
            const dataURL = canvas.toDataURL("image/png");

            // Convert data URL to Blob
            const response = await fetch(dataURL);
            const blob = await response.blob();

            // Add Blob to ZIP file
            zip.file(`${name}.png`, blob);
        }

        // Cleanup
        renderTexture.destroy(true);
        clonedContainer.destroy({ children: true });
    }

    // Generate ZIP and trigger download
    zip.generateAsync({ type: "blob" }).then((content) => {
        const link = document.createElement("a");
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

async function parseXMLRegions(xmlContent: string) {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlContent, "application/xml");

    const regions: {
        name: string;
        rectangle: Rectangle;
        frame?: { x: number; y: number; width: number; height: number };
    }[] = [];

    const subTextures = xmlDoc.getElementsByTagName("SubTexture");

    for (const subTexture of Array.from(subTextures)) {
        const name = subTexture.getAttribute("name") || "unknown";
        const x = parseFloat(subTexture.getAttribute("x") || "0");
        const y = parseFloat(subTexture.getAttribute("y") || "0");
        const width = parseFloat(subTexture.getAttribute("width") || "0");
        const height = parseFloat(subTexture.getAttribute("height") || "0");

        // Optional frame attributes
        const frameX = parseFloat(subTexture.getAttribute("frameX") || "0");
        const frameY = parseFloat(subTexture.getAttribute("frameY") || "0");
        const frameWidth = parseFloat(subTexture.getAttribute("frameWidth") || "0") || width;
        const frameHeight = parseFloat(subTexture.getAttribute("frameHeight") || "0") || height;

        const rectangle = new Rectangle(x, y, width, height);

        // Frame data if applicable
        const frame = frameWidth && frameHeight
            ? { x: frameX, y: frameY, width: frameWidth, height: frameHeight }
            : undefined;

        regions.push({ name, rectangle, frame });
    }

    return regions;
}

// Init everything
init();