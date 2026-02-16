import type {
  QuestionTypeSlug,
  QuestionConfig,
  CorrectAnswerData,
  UserAnswer,
  MultipleChoiceAnswer,
  MultipleChoiceUserAnswer,
  TrueFalseAnswer,
  TrueFalseUserAnswer,
  TextInputConfig,
  TextInputAnswer,
  TextInputUserAnswer,
  YearRangeConfig,
  YearRangeAnswer,
  YearRangeUserAnswer,
  NumericRangeConfig,
  NumericRangeAnswer,
  NumericRangeUserAnswer,
  MatchingConfig,
  MatchingAnswer,
  MatchingUserAnswer,
  FillBlankConfig,
  FillBlankAnswer,
  FillBlankUserAnswer,
  MultiSelectAnswer,
  MultiSelectUserAnswer,
} from '@/lib/types/quiz';

export interface ValidationResult {
  isCorrect: boolean;
  creditPercent: number; // 0-100, allows for partial credit
  feedback?: string;
}

// Type guards for user answers
function isMultipleChoiceUserAnswer(answer: UserAnswer): answer is MultipleChoiceUserAnswer {
  return typeof answer === 'object' && answer !== null && 'selectedIndex' in answer;
}

function isTrueFalseUserAnswer(answer: UserAnswer): answer is TrueFalseUserAnswer {
  return typeof answer === 'object' && answer !== null && 'selectedValue' in answer;
}

function isTextInputUserAnswer(answer: UserAnswer): answer is TextInputUserAnswer {
  return typeof answer === 'object' && answer !== null && 'text' in answer;
}

function isYearRangeUserAnswer(answer: UserAnswer): answer is YearRangeUserAnswer {
  return typeof answer === 'object' && answer !== null && 'year' in answer;
}

function isNumericRangeUserAnswer(answer: UserAnswer): answer is NumericRangeUserAnswer {
  return typeof answer === 'object' && answer !== null && 'value' in answer;
}

function isMatchingUserAnswer(answer: UserAnswer): answer is MatchingUserAnswer {
  return typeof answer === 'object' && answer !== null && 'pairs' in answer;
}

function isFillBlankUserAnswer(answer: UserAnswer): answer is FillBlankUserAnswer {
  return typeof answer === 'object' && answer !== null && 'blanks' in answer && !('acceptedAnswers' in answer);
}

function isMultiSelectUserAnswer(answer: UserAnswer): answer is MultiSelectUserAnswer {
  return typeof answer === 'object' && answer !== null && 'selectedIndices' in answer;
}

// Validator implementations for each question type
function validateMultipleChoice(
  userAnswer: UserAnswer,
  correctAnswerData: CorrectAnswerData,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _config: QuestionConfig
): ValidationResult {
  const correctAnswer = correctAnswerData as MultipleChoiceAnswer;

  // Handle legacy format (just a number)
  let selectedIndex: number;
  if (typeof userAnswer === 'number') {
    selectedIndex = userAnswer;
  } else if (isMultipleChoiceUserAnswer(userAnswer)) {
    selectedIndex = userAnswer.selectedIndex;
  } else {
    return { isCorrect: false, creditPercent: 0, feedback: 'Invalid answer format' };
  }

  const isCorrect = selectedIndex === correctAnswer.correctIndex;
  return {
    isCorrect,
    creditPercent: isCorrect ? 100 : 0,
  };
}

function validateTrueFalse(
  userAnswer: UserAnswer,
  correctAnswerData: CorrectAnswerData,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _config: QuestionConfig
): ValidationResult {
  const correctAnswer = correctAnswerData as TrueFalseAnswer & { isTrue?: boolean };

  let selectedValue: boolean;
  if (typeof userAnswer === 'boolean') {
    selectedValue = userAnswer;
  } else if (isTrueFalseUserAnswer(userAnswer)) {
    selectedValue = userAnswer.selectedValue;
  } else {
    return { isCorrect: false, creditPercent: 0, feedback: 'Invalid answer format' };
  }

  const expectedValue =
    typeof correctAnswer.correctValue === "boolean"
      ? correctAnswer.correctValue
      : typeof correctAnswer.isTrue === "boolean"
        ? correctAnswer.isTrue
        : false;
  const isCorrect = selectedValue === expectedValue;
  return {
    isCorrect,
    creditPercent: isCorrect ? 100 : 0,
  };
}

function validateTextInput(
  userAnswer: UserAnswer,
  correctAnswerData: CorrectAnswerData,
  config: QuestionConfig
): ValidationResult {
  const correctAnswer = correctAnswerData as TextInputAnswer;
  const textConfig = config as TextInputConfig;
  const acceptedAnswers = Array.isArray(correctAnswer.acceptedAnswers)
    ? correctAnswer.acceptedAnswers
    : [];
  const keywords = Array.isArray(correctAnswer.keywords)
    ? correctAnswer.keywords
    : [];

  let userText: string;
  if (typeof userAnswer === 'string') {
    userText = userAnswer;
  } else if (isTextInputUserAnswer(userAnswer)) {
    userText = userAnswer.text;
  } else {
    return { isCorrect: false, creditPercent: 0, feedback: 'Invalid answer format' };
  }

  // Apply config options
  if (textConfig.trimWhitespace !== false) {
    userText = userText.trim();
  }

  const normalize = (str: string) => {
    let result = str;
    if (!textConfig.caseSensitive) {
      result = result.toLowerCase();
    }
    return result;
  };

  const normalizedUserText = normalize(userText);

  // Check for exact match with any accepted answer
  for (const accepted of acceptedAnswers) {
    if (normalize(accepted) === normalizedUserText) {
      return { isCorrect: true, creditPercent: 100 };
    }
  }

  // Check for keyword-based partial credit
  if (keywords.length > 0) {
    const matchedKeywords = keywords.filter(keyword =>
      normalizedUserText.includes(normalize(keyword))
    );

    const threshold = correctAnswer.keywordMatchThreshold || Math.ceil(keywords.length / 2);

    if (matchedKeywords.length >= threshold) {
      const creditPercent = Math.min(
        (matchedKeywords.length / keywords.length) * 100,
        75 // Cap partial credit at 75%
      );
      return {
        isCorrect: false,
        creditPercent,
        feedback: `Partial credit: matched ${matchedKeywords.length} of ${keywords.length} key concepts`,
      };
    }
  }

  return { isCorrect: false, creditPercent: 0 };
}

function validateYearRange(
  userAnswer: UserAnswer,
  correctAnswerData: CorrectAnswerData,
  config: QuestionConfig
): ValidationResult {
  const correctAnswer = correctAnswerData as YearRangeAnswer & { exactYear?: number; year?: number };
  const yearConfig = config as YearRangeConfig;

  let userYear: number;
  if (typeof userAnswer === 'number') {
    userYear = userAnswer;
  } else if (isYearRangeUserAnswer(userAnswer)) {
    userYear = userAnswer.year;
  } else {
    return { isCorrect: false, creditPercent: 0, feedback: 'Invalid answer format' };
  }

  // Validate against min/max if specified
  if (yearConfig.minYear !== undefined && userYear < yearConfig.minYear) {
    return { isCorrect: false, creditPercent: 0, feedback: `Year must be at least ${yearConfig.minYear}` };
  }
  if (yearConfig.maxYear !== undefined && userYear > yearConfig.maxYear) {
    return { isCorrect: false, creditPercent: 0, feedback: `Year must be at most ${yearConfig.maxYear}` };
  }

  const expectedYear =
    correctAnswer.correctYear ??
    correctAnswer.exactYear ??
    correctAnswer.year;
  if (expectedYear === undefined) {
    return { isCorrect: false, creditPercent: 0, feedback: 'No correct year configured' };
  }

  const difference = Math.abs(userYear - expectedYear);

  // Exact match
  if (difference === 0) {
    return { isCorrect: true, creditPercent: 100 };
  }

  // Check partial credit ranges
  if (correctAnswer.partialCreditRanges) {
    for (const range of correctAnswer.partialCreditRanges.sort((a, b) => a.tolerance - b.tolerance)) {
      if (difference <= range.tolerance) {
        return {
          isCorrect: false,
          creditPercent: range.creditPercent,
          feedback: `Off by ${difference} year${difference > 1 ? 's' : ''}`,
        };
      }
    }
  }

  // Check default tolerance from config
  const tolerance = yearConfig.tolerance || 0;
  if (tolerance > 0 && difference <= tolerance) {
    const creditPercent = Math.max(0, 100 - (difference / tolerance) * 50);
    return {
      isCorrect: false,
      creditPercent,
      feedback: `Off by ${difference} year${difference > 1 ? 's' : ''}`,
    };
  }

    return {
      isCorrect: false,
      creditPercent: 0,
      feedback: `The correct year was ${expectedYear}`,
    };
}

function validateNumericRange(
  userAnswer: UserAnswer,
  correctAnswerData: CorrectAnswerData,
  config: QuestionConfig
): ValidationResult {
  const correctAnswer = correctAnswerData as NumericRangeAnswer & { exactValue?: number; value?: number };
  const numericConfig = config as NumericRangeConfig;

  let userValue: number;
  if (typeof userAnswer === 'number') {
    userValue = userAnswer;
  } else if (isNumericRangeUserAnswer(userAnswer)) {
    userValue = userAnswer.value;
  } else {
    return { isCorrect: false, creditPercent: 0, feedback: 'Invalid answer format' };
  }

  // Validate against min/max if specified
  if (numericConfig.min !== undefined && userValue < numericConfig.min) {
    return { isCorrect: false, creditPercent: 0, feedback: `Value must be at least ${numericConfig.min}` };
  }
  if (numericConfig.max !== undefined && userValue > numericConfig.max) {
    return { isCorrect: false, creditPercent: 0, feedback: `Value must be at most ${numericConfig.max}` };
  }

  const expectedValue =
    correctAnswer.correctValue ??
    correctAnswer.exactValue ??
    correctAnswer.value;
  if (expectedValue === undefined) {
    return { isCorrect: false, creditPercent: 0, feedback: 'No correct value configured' };
  }

  const difference = Math.abs(userValue - expectedValue);

  // Exact match (with floating point tolerance)
  if (difference < 0.0001) {
    return { isCorrect: true, creditPercent: 100 };
  }

  // Check partial credit ranges
  if (correctAnswer.partialCreditRanges) {
    for (const range of correctAnswer.partialCreditRanges.sort((a, b) => a.tolerance - b.tolerance)) {
      const toleranceValue = range.toleranceType === 'percentage'
      ? (range.tolerance / 100) * Math.abs(expectedValue)
        : range.tolerance;

      if (difference <= toleranceValue) {
        return {
          isCorrect: false,
          creditPercent: range.creditPercent,
          feedback: `Close! Off by ${difference.toFixed(2)}`,
        };
      }
    }
  }

  // Check default tolerance from config
  const tolerance = numericConfig.tolerance || 0;
  if (tolerance > 0) {
    const toleranceValue = numericConfig.toleranceType === 'percentage'
      ? (tolerance / 100) * Math.abs(expectedValue)
      : tolerance;

    if (difference <= toleranceValue) {
      const creditPercent = Math.max(0, 100 - (difference / toleranceValue) * 50);
      return {
        isCorrect: false,
        creditPercent,
        feedback: `Close! Off by ${difference.toFixed(2)}`,
      };
    }
  }

  return {
    isCorrect: false,
    creditPercent: 0,
    feedback: `The correct answer was ${expectedValue}${numericConfig.unit ? ` ${numericConfig.unit}` : ''}`,
  };
}

function validateMatching(
  userAnswer: UserAnswer,
  correctAnswerData: CorrectAnswerData,
  config: QuestionConfig
): ValidationResult {
  const correctAnswer = correctAnswerData as MatchingAnswer;
  const matchingConfig = config as MatchingConfig;

  if (!isMatchingUserAnswer(userAnswer)) {
    return { isCorrect: false, creditPercent: 0, feedback: 'Invalid answer format' };
  }

  const userPairs = userAnswer.pairs && typeof userAnswer.pairs === 'object'
    ? userAnswer.pairs
    : {};
  const correctPairs = correctAnswer.correctPairs && typeof correctAnswer.correctPairs === 'object'
    ? correctAnswer.correctPairs
    : {};
  const totalPairs = Array.isArray(matchingConfig.leftColumn) && matchingConfig.leftColumn.length > 0
    ? matchingConfig.leftColumn.length
    : Object.keys(correctPairs).length;

  if (totalPairs === 0) {
    return { isCorrect: false, creditPercent: 0, feedback: 'No matching pairs configured' };
  }

  let correctCount = 0;
  for (const [leftItem, rightItem] of Object.entries(userPairs)) {
    if (correctPairs[leftItem] === rightItem) {
      correctCount++;
    }
  }

  const isAllCorrect = correctCount === totalPairs;

  // Check if partial credit is enabled
  const partialCreditEnabled = correctAnswer.partialCreditPerPair !== false;

  if (isAllCorrect) {
    return { isCorrect: true, creditPercent: 100 };
  }

  if (partialCreditEnabled && correctCount > 0) {
    const creditPercent = (correctCount / totalPairs) * 100;
    return {
      isCorrect: false,
      creditPercent,
      feedback: `${correctCount} of ${totalPairs} pairs correct`,
    };
  }

  return {
    isCorrect: false,
    creditPercent: 0,
    feedback: `${correctCount} of ${totalPairs} pairs correct`,
  };
}

function validateFillBlank(
  userAnswer: UserAnswer,
  correctAnswerData: CorrectAnswerData,
  config: QuestionConfig
): ValidationResult {
  const correctAnswer = correctAnswerData as FillBlankAnswer;
  const fillBlankConfig = config as FillBlankConfig;

  if (!isFillBlankUserAnswer(userAnswer)) {
    return { isCorrect: false, creditPercent: 0, feedback: 'Invalid answer format' };
  }

  const userBlanks = userAnswer.blanks;
  const correctBlanks = correctAnswer.blanks && typeof correctAnswer.blanks === 'object'
    ? correctAnswer.blanks
    : {};
  const totalBlanks = Object.keys(correctBlanks).length;

  if (totalBlanks === 0) {
    return { isCorrect: false, creditPercent: 0, feedback: 'No blanks configured' };
  }

  const normalize = (str: string) => {
    let result = str.trim();
    if (!fillBlankConfig.caseSensitive) {
      result = result.toLowerCase();
    }
    return result;
  };

  let correctCount = 0;
  for (const [blankId, acceptedAnswers] of Object.entries(correctBlanks)) {
    const userValue = userBlanks[blankId];
    const normalizedAcceptedAnswers = Array.isArray(acceptedAnswers)
      ? acceptedAnswers
          .map((answer) => String(answer ?? "").trim())
          .filter((answer) => answer.length > 0)
      : typeof acceptedAnswers === "string" || typeof acceptedAnswers === "number"
        ? [String(acceptedAnswers).trim()].filter((answer) => answer.length > 0)
        : [];
    if (userValue) {
      const normalizedUser = normalize(userValue);
      const isMatch = normalizedAcceptedAnswers.some(accepted => normalize(accepted) === normalizedUser);
      if (isMatch) {
        correctCount++;
      }
    }
  }

  const isAllCorrect = correctCount === totalBlanks;

  if (isAllCorrect) {
    return { isCorrect: true, creditPercent: 100 };
  }

  if (correctCount > 0) {
    const creditPercent = (correctCount / totalBlanks) * 100;
    return {
      isCorrect: false,
      creditPercent,
      feedback: `${correctCount} of ${totalBlanks} blanks correct`,
    };
  }

  return { isCorrect: false, creditPercent: 0 };
}

function validateMultiSelect(
  userAnswer: UserAnswer,
  correctAnswerData: CorrectAnswerData,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _config: QuestionConfig
): ValidationResult {
  const correctAnswer = correctAnswerData as MultiSelectAnswer;

  if (!isMultiSelectUserAnswer(userAnswer)) {
    return { isCorrect: false, creditPercent: 0, feedback: 'Invalid answer format' };
  }

  const selectedIndices = new Set(userAnswer.selectedIndices);
  const correctIndices = new Set(correctAnswer.correctIndices);

  // Calculate correct selections and incorrect selections
  let correctSelections = 0;
  let incorrectSelections = 0;

  for (const index of selectedIndices) {
    if (correctIndices.has(index)) {
      correctSelections++;
    } else {
      incorrectSelections++;
    }
  }

  // Calculate missed correct answers
  const missedCorrect = correctIndices.size - correctSelections;

  // Perfect match
  if (correctSelections === correctIndices.size && incorrectSelections === 0) {
    return { isCorrect: true, creditPercent: 100 };
  }

  // Partial credit calculation
  if (correctAnswer.partialCredit !== false) {
    // Deduct for wrong selections and missed correct answers
    const totalPossible = correctIndices.size;
    const penalties = incorrectSelections + missedCorrect;
    const creditPercent = Math.max(0, ((correctSelections - penalties * 0.5) / totalPossible) * 100);

    return {
      isCorrect: false,
      creditPercent,
      feedback: `${correctSelections} correct, ${incorrectSelections} incorrect, ${missedCorrect} missed`,
    };
  }

  return {
    isCorrect: false,
    creditPercent: 0,
    feedback: `Selected ${correctSelections} of ${correctIndices.size} correct options`,
  };
}

// Main validator function
export function validateAnswer(
  questionType: QuestionTypeSlug,
  userAnswer: UserAnswer | null | undefined,
  correctAnswerData: CorrectAnswerData | null,
  config: QuestionConfig,
  partialCreditEnabled: boolean = true
): ValidationResult {
  // Handle missing answer
  if (userAnswer === null || userAnswer === undefined) {
    return { isCorrect: false, creditPercent: 0, feedback: 'No answer provided' };
  }

  // Handle legacy multiple choice (correctAnswerData is null, use correctAnswer from question)
  if (correctAnswerData === null) {
    return { isCorrect: false, creditPercent: 0, feedback: 'No correct answer configured' };
  }

  let result: ValidationResult;

  switch (questionType) {
    case 'multiple_choice':
      result = validateMultipleChoice(userAnswer, correctAnswerData, config);
      break;
    case 'true_false':
      result = validateTrueFalse(userAnswer, correctAnswerData, config);
      break;
    case 'text_input':
      result = validateTextInput(userAnswer, correctAnswerData, config);
      break;
    case 'year_range':
      result = validateYearRange(userAnswer, correctAnswerData, config);
      break;
    case 'numeric_range':
      result = validateNumericRange(userAnswer, correctAnswerData, config);
      break;
    case 'matching':
      result = validateMatching(userAnswer, correctAnswerData, config);
      break;
    case 'fill_blank':
      result = validateFillBlank(userAnswer, correctAnswerData, config);
      break;
    case 'multi_select':
      result = validateMultiSelect(userAnswer, correctAnswerData, config);
      break;
    default:
      // For custom types, we can't validate without custom logic
      result = { isCorrect: false, creditPercent: 0, feedback: 'Unknown question type' };
  }

  // If partial credit is disabled, convert partial credit to 0
  if (!partialCreditEnabled && !result.isCorrect && result.creditPercent > 0) {
    result.creditPercent = 0;
  }

  return result;
}

// Helper to validate answer for legacy questions (index-based correctAnswer)
export function validateLegacyAnswer(
  userAnswer: number | null | undefined,
  correctAnswer: number
): ValidationResult {
  if (userAnswer === null || userAnswer === undefined) {
    return { isCorrect: false, creditPercent: 0, feedback: 'No answer provided' };
  }

  const isCorrect = userAnswer === correctAnswer;
  return {
    isCorrect,
    creditPercent: isCorrect ? 100 : 0,
  };
}
