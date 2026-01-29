import { Plugin } from "vite";
import { resolve } from "path";
import { copyFileSync } from "fs";

export interface CopyProcessedFileOptions {
    /** Source file path relative to the build output directory */
    src: string;
    /** Destination file path relative to the build output directory */
    dest: string;
    /** Whether to only copy during build (default: true) */
    buildOnly?: boolean;
}

/**
 * Vite plugin that copies a processed file from the build output to another location.
 * This is useful for creating copies of processed HTML files with all their bundled assets.
 *
 * @param options Configuration options for the copy operation
 * @returns Vite plugin
 */
export function copyProcessedFilePlugin(options: CopyProcessedFileOptions): Plugin {
    return {
        name: "copy-processed-file",
        writeBundle() {
            const { src, dest, buildOnly = true } = options;

            // Only run during build if buildOnly is true
            if (buildOnly && process.env.NODE_ENV !== "production") {
                return;
            }

            const srcPath = resolve(process.cwd(), "deploy", src);
            const destPath = resolve(process.cwd(), "deploy", dest);

            try {
                copyFileSync(srcPath, destPath);
                console.log(`✓ Copied ${src} to ${dest}`);
            } catch (error) {
                console.error(`Failed to copy ${src} to ${dest}:`, error);
            }
        }
    };
}
