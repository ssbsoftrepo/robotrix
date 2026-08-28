// Filesystem helper stub for web/mobile without native storage permissions

export const saveImageToFilesystem = async (dataUrl: string): Promise<string> => {
  return dataUrl;
};

export const loadImageFromFilesystem = async (filePath: string): Promise<string | null> => {
  return filePath;
};

export const deleteImageFromFilesystem = async (filePath?: string): Promise<void> => {
  return;
};
