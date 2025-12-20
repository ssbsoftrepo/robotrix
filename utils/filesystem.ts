import { Filesystem, Directory } from '@capacitor/filesystem';

const IMAGE_DIR = Directory.Data;
const IMAGE_SUBDIR = 'Robotrix_Images'; // We can keep the subfolder for internal organization

// Helper to ensure directory exists
const ensureDir = async () => {
    try {
        await Filesystem.readdir({
            path: IMAGE_SUBDIR,
            directory: IMAGE_DIR,
        });
    } catch (e) {
        // Directory likely doesn't exist, try to create it
        try {
            await Filesystem.mkdir({
                path: IMAGE_SUBDIR,
                directory: IMAGE_DIR,
                recursive: true,
            });
        } catch (createError) {
            console.error('Error creating directory:', createError);
        }
    }
};

// Helper to compute SHA-256 hash of a string
const computeHash = async (data: string): Promise<string> => {
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
};

/**
 * Saves a Data URL string to the device filesystem as a binary image file.
 * Returns the stored filename.
 * Uses SHA-256 hash of content to prevent duplicates.
 */
export const saveImageToFilesystem = async (dataUrl: string): Promise<string> => {
    // Ensure folder exists first
    await ensureDir();

    // 1. Extract Base64 data (remove prefix)
    const base64Data = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;

    // 2. Compute Hash for deduplication
    const hash = await computeHash(base64Data);

    // 3. Determine extension
    let extension = 'png';
    const matches = dataUrl.match(/^data:(image\/([a-zA-Z+]+));base64,/);
    if (matches && matches.length >= 3) {
        const subType = matches[2];
        if (subType === 'jpeg') extension = 'jpg';
        else extension = subType;
    }

    const fileName = `${IMAGE_SUBDIR}/img_${hash}.${extension}`;

    // 4. Check if file already exists
    try {
        await Filesystem.stat({
            path: fileName,
            directory: IMAGE_DIR,
        });
        // If stat succeeds, file exists. We don't need to write it again.
        // console.log(`Image ${fileName} already exists, skipping write.`);
        return fileName;
    } catch (e) {
        // File does not exist, proceed to write
    }

    try {
        await Filesystem.writeFile({
            path: fileName,
            data: base64Data,
            directory: IMAGE_DIR,
        });
        return fileName;
    } catch (e) {
        console.error('Error saving image to filesystem:', e);
        throw e;
    }
};

/**
 * Loads an image from the filesystem and returns it as a Data URL.
 */
export const loadImageFromFilesystem = async (fileName: string): Promise<string | null> => {
    try {
        const result = await Filesystem.readFile({
            path: fileName,
            directory: IMAGE_DIR,
        });

        // result.data is the base64 string for binary files

        // Infer mime type from extension
        const ext = fileName.split('.').pop()?.toLowerCase() || 'png';
        let mimeType = 'image/png';
        if (ext === 'jpg' || ext === 'jpeg') mimeType = 'image/jpeg';
        else mimeType = `image/${ext}`;

        return `data:${mimeType};base64,${result.data}`;
    } catch (e) {
        // Quietly fail if file not found (might have been deleted or not strictly an image file ref)
        console.warn(`Could not load image ${fileName}`, e);
        return null;
    }
};

export const deleteImageFromFilesystem = async (fileName: string): Promise<void> => {
    try {
        if (!fileName) return;
        await Filesystem.deleteFile({
            path: fileName,
            directory: IMAGE_DIR,
        });
    } catch (e) {
        // file already gone, ignore
    }
};
