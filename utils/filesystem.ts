import { Filesystem, Directory } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';

const IMAGE_DIR = Directory.Data;
const IMAGE_SUBDIR = 'Robotrix_Images';


let dirEnsured = false;

const ensureDir = async () => {
  if (Capacitor.getPlatform() === 'web') return;

  if (dirEnsured) return;

  try {
    await Filesystem.readdir({
      path: IMAGE_SUBDIR,
      directory: IMAGE_DIR,
    });
  } catch {
    try {
      await Filesystem.mkdir({
        path: IMAGE_SUBDIR,
        directory: IMAGE_DIR,
        recursive: true,
      });
    } catch (e: any) {
      if (!e?.message?.toLowerCase()?.includes('exist')) {
        console.error('Filesystem mkdir error:', e);
      }
    }
  }

  dirEnsured = true;
};


const computeHash = async (data: string): Promise<string> => {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    try {
      const buffer = new TextEncoder().encode(data);
      const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
      return Array.from(new Uint8Array(hashBuffer))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
    } catch {
    }
  }

  let hash = 5381;
  for (let i = 0; i < data.length; i++) {
    hash = ((hash << 5) + hash) + data.charCodeAt(i);
  }
  return (hash >>> 0).toString(16);
};

export const saveImageToFilesystem = async (
  dataUrl: string
): Promise<string> => {

  if (Capacitor.getPlatform() === 'web') {
    return dataUrl;
  }

  await ensureDir();

  const base64Data = dataUrl.includes(',')
    ? dataUrl.split(',')[1]
    : dataUrl;

  const hash = await computeHash(base64Data);

  let extension = 'png';
  const match = dataUrl.match(/^data:image\/([a-zA-Z+]+);base64,/);
  if (match?.[1]) {
    extension = match[1] === 'jpeg' ? 'jpg' : match[1];
  }

  const filePath = `${IMAGE_SUBDIR}/img_${hash}.${extension}`;

  try {
    await Filesystem.stat({
      path: filePath,
      directory: IMAGE_DIR,
    });
    return filePath;
  } catch {
  }

  await Filesystem.writeFile({
    path: filePath,
    data: base64Data,
    directory: IMAGE_DIR,
  });

  return filePath;
};

export const loadImageFromFilesystem = async (
  filePath: string
): Promise<string | null> => {

  if (Capacitor.getPlatform() === 'web') {
    return filePath;
  }

  try {
    const result = await Filesystem.readFile({
      path: filePath,
      directory: IMAGE_DIR,
    });

    const ext = filePath.split('.').pop()?.toLowerCase() || 'png';
    const mime =
      ext === 'jpg' || ext === 'jpeg'
        ? 'image/jpeg'
        : `image/${ext}`;

    return `data:${mime};base64,${result.data}`;
  } catch (e) {
    console.warn('Image load failed:', filePath, e);
    return null;
  }
};


export const deleteImageFromFilesystem = async (
  filePath?: string
): Promise<void> => {

  if (!filePath) return;

  if (Capacitor.getPlatform() === 'web') return;

  try {
    await Filesystem.deleteFile({
      path: filePath,
      directory: IMAGE_DIR,
    });
  } catch {
  }
};
