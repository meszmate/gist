export const FILE_CONFIG = {
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  MAX_TOTAL_SIZE: 25 * 1024 * 1024, // 25MB total
  MAX_CONTENT_LENGTH: 100000, // ~100k characters
  ALLOWED_EXTENSIONS: ['txt', 'pdf', 'docx'] as const,
};

export interface FileProcessingResult {
  fileName: string;
  success: boolean;
  text?: string;
  error?: string;
}

export interface FileValidationResult {
  valid: boolean;
  error?: string;
}

export function getFileExtension(fileName: string): string {
  return fileName.split('.').pop()?.toLowerCase() ?? '';
}

export function validateFile(file: File): FileValidationResult {
  const ext = getFileExtension(file.name);

  if (!FILE_CONFIG.ALLOWED_EXTENSIONS.includes(ext as typeof FILE_CONFIG.ALLOWED_EXTENSIONS[number])) {
    return { valid: false, error: 'unsupportedType' };
  }

  if (file.size > FILE_CONFIG.MAX_FILE_SIZE) {
    return { valid: false, error: 'fileTooLarge' };
  }

  return { valid: true };
}

export function validateTotalSize(files: FileList | File[]): FileValidationResult {
  const fileArray = Array.isArray(files) ? files : Array.from(files);
  const totalSize = fileArray.reduce((sum, file) => sum + file.size, 0);

  if (totalSize > FILE_CONFIG.MAX_TOTAL_SIZE) {
    return { valid: false, error: 'totalTooLarge' };
  }

  return { valid: true };
}

export function validateContentLength(content: string): FileValidationResult {
  if (content.length > FILE_CONFIG.MAX_CONTENT_LENGTH) {
    return { valid: false, error: 'contentTooLong' };
  }

  return { valid: true };
}
