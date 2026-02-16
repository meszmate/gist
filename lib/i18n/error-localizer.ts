type TranslateFn = (
  key: string,
  params?: Record<string, string | number>
) => string;

function translateWithFallback(
  t: TranslateFn,
  key: string,
  fallback: string,
  params?: Record<string, string | number>
): string {
  const translated = t(key, params);
  return translated === key ? fallback : translated;
}

const EXACT_ERROR_KEY_MAP: Record<string, string> = {
  Unauthorized: "errors.unauthorized",
  "Authentication required": "errors.authenticationRequired",
  "Not found": "errors.notFound",
  "Resource not found": "errors.resourceNotFound",
  "Resource not found or not public": "errors.resourceNotFoundOrNotPublic",
  "Quiz not found": "errors.quizNotFound",
  "Question not found": "errors.questionNotFound",
  "Lesson not found": "errors.lessonNotFound",
  "Step not found": "errors.stepNotFound",
  "Card not found": "errors.cardNotFound",
  "Contact not found": "errors.contactNotFound",
  "You are not authorized to take this quiz": "errors.notAuthorizedQuiz",
  "Invalid data": "errors.invalidData",
  "Invalid query parameters": "errors.invalidQueryParameters",
  "Invalid section": "errors.invalidSection",
  "Message is required": "errors.messageRequired",
  "No source content available": "errors.noSourceContent",
  "Invalid data: 'completed' must be a boolean": "errors.invalidCompletedValue",
  "A question type with this slug already exists": "questionTypes.slugExists",
  "Cannot modify system question types": "questionTypes.cannotModifySystem",
  "Cannot delete system question types": "questionTypes.cannotDeleteSystem",
  "Contact with this email already exists": "contacts.contactExists",
  "No file provided": "upload.noFileProvided",
  "File size exceeds 10MB limit": "upload.fileSizeExceeds",
  "Failed to parse file": "upload.failedToParse",
};

export function localizeErrorMessage(
  error: unknown,
  t: TranslateFn,
  fallbackKey: string = "errors.generic"
): string {
  const message =
    typeof error === "string"
      ? error.trim()
      : error instanceof Error
      ? error.message.trim()
      : "";

  if (!message) {
    return translateWithFallback(t, fallbackKey, t("errors.generic"));
  }

  if (/^Unsupported file type\. Accepted types:/i.test(message)) {
    const types = message.match(/Accepted types:\s*(.+)$/i)?.[1];
    if (types) {
      return translateWithFallback(t, "upload.unsupportedType", message, { types });
    }
    return translateWithFallback(t, "errors.generic", message);
  }

  if (
    /^No text could be extracted from this file/i.test(message)
  ) {
    return translateWithFallback(t, "upload.noTextExtracted", message);
  }

  if (
    /^The file type is supported, but readable text could not be extracted/i.test(
      message
    )
  ) {
    return translateWithFallback(t, "upload.couldNotReadContent", message);
  }

  if (/string (does not|did not) match the expected pattern/i.test(message)) {
    return translateWithFallback(t, "upload.fileNamePatternError", message);
  }

  const exactKey = EXACT_ERROR_KEY_MAP[message];
  if (exactKey) {
    return translateWithFallback(t, exactKey, message);
  }

  if (/^Failed to fetch\b/i.test(message)) {
    return translateWithFallback(t, "errors.failedToFetch", message);
  }

  if (/^Failed to create\b/i.test(message)) {
    return translateWithFallback(t, "errors.failedToCreate", message);
  }

  if (/^Failed to update\b/i.test(message)) {
    return translateWithFallback(t, "errors.failedToUpdate", message);
  }

  if (/^Failed to delete\b/i.test(message)) {
    return translateWithFallback(t, "errors.failedToDelete", message);
  }

  if (/^Failed to save\b/i.test(message)) {
    return translateWithFallback(t, "errors.failedToSave", message);
  }

  if (/^Failed to submit\b/i.test(message)) {
    return translateWithFallback(t, "errors.failedToSubmit", message);
  }

  if (/^Failed to generate\b/i.test(message)) {
    return translateWithFallback(t, "errors.failedToGenerate", message);
  }

  if (/^Failed to review\b/i.test(message)) {
    return translateWithFallback(t, "errors.failedToReview", message);
  }

  if (/^Failed to process\b/i.test(message)) {
    return translateWithFallback(t, "errors.failedToProcess", message);
  }

  if (/^Failed to load\b/i.test(message)) {
    return translateWithFallback(t, "errors.failedToLoad", message);
  }

  if (/^Failed to start\b/i.test(message)) {
    return translateWithFallback(t, "errors.failedToStart", message);
  }

  return translateWithFallback(t, fallbackKey, message);
}

export async function getApiErrorMessage(
  response: Response,
  fallback: string
): Promise<string> {
  try {
    const data = await response.json();
    if (data && typeof data.error === "string" && data.error.trim()) {
      return data.error.trim();
    }
  } catch {
    // Ignore parse errors and use fallback.
  }
  return fallback;
}
