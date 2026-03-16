import {
  CONTENT_STEP_TYPES,
  getDefaultAnswerData,
  getDefaultStepContent,
  type StepAnswerData,
  type StepContent,
  type StepType,
} from "@/lib/types/lesson";
import {
  extractFillBlankIds,
  replaceGenericBlankPlaceholders,
} from "@/lib/quiz/fill-blank-template";

interface NormalizeLessonStepInput {
  stepType: unknown;
  content: unknown;
  answerData: unknown;
  explanation?: unknown;
  hint?: unknown;
}

export interface NormalizedLessonStepPayload {
  stepType: StepType;
  content: StepContent;
  answerData: StepAnswerData;
}

export interface NormalizedLessonStepRecord
  extends NormalizedLessonStepPayload {
  explanation: string | null;
  hint: string | null;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : {};
}

function toStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => String(item ?? "").trim())
      .filter((item) => item.length > 0);
  }
  if (typeof value === "string" || typeof value === "number") {
    const normalized = String(value).trim();
    return normalized.length > 0 ? [normalized] : [];
  }
  return [];
}

function toNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function toBoolean(value: unknown): boolean | null {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true") return true;
    if (normalized === "false") return false;
  }
  return null;
}

function uniqueStrings(values: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    if (seen.has(value)) continue;
    seen.add(value);
    result.push(value);
  }
  return result;
}

function nonEmptyString(value: unknown): string | null {
  if (typeof value !== "string" && typeof value !== "number") return null;
  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeOptionalString(value: unknown): string | null {
  return nonEmptyString(value);
}

function normalizeStepType(value: unknown): StepType {
  const raw = String(value ?? "explanation").trim().toLowerCase();

  switch (raw) {
    case "multiple choice":
    case "multiple-choice":
    case "multi_choice":
    case "mcq":
      return "multiple_choice";
    case "truefalse":
    case "boolean":
      return "true_false";
    case "match":
    case "matching":
      return "drag_match";
    case "sort":
    case "ordering":
      return "drag_sort";
    case "categorize":
    case "category":
      return "drag_categorize";
    case "fill_blank":
    case "fill_in_blank":
    case "fill-in-the-blank":
      return "fill_blanks";
    case "text":
    case "short_answer":
    case "free_text":
      return "type_answer";
    case "multi-select":
    case "multi select":
    case "multiple_select":
      return "select_many";
    default: {
      const validStepTypes = new Set<StepType>([
        "explanation",
        "concept",
        "multiple_choice",
        "true_false",
        "drag_sort",
        "drag_match",
        "drag_categorize",
        "fill_blanks",
        "type_answer",
        "select_many",
        "reveal",
      ]);
      return validStepTypes.has(raw as StepType)
        ? (raw as StepType)
        : "explanation";
    }
  }
}

function collectTextFragments(value: unknown, depth = 0): string[] {
  if (depth > 4 || value == null) return [];
  if (typeof value === "string" || typeof value === "number") {
    const normalized = String(value).trim();
    return normalized ? [normalized] : [];
  }
  if (Array.isArray(value)) {
    return value.flatMap((item) => collectTextFragments(item, depth + 1));
  }
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    return Object.entries(record)
      .filter(([key]) => !["id", "type", "stepType"].includes(key))
      .flatMap(([, entry]) => collectTextFragments(entry, depth + 1));
  }
  return [];
}

function fallbackExplanationFromContent(content: unknown, prefix?: string): string {
  const text = uniqueStrings(collectTextFragments(content)).join("\n\n").trim();
  if (text) return prefix ? `${prefix}\n\n${text}` : text;
  return prefix || "Review this part of the lesson and continue.";
}

function toAlphaId(index: number): string {
  return String.fromCharCode(97 + (index % 26));
}

function toOrderedItems(
  value: unknown,
  labelKeys: string[] = ["text", "label", "title", "value", "content", "name"]
): { id: string; text: string }[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item, index) => {
      if (typeof item === "string" || typeof item === "number") {
        return {
          id: String(index + 1),
          text: String(item).trim(),
        };
      }

      const raw = asRecord(item);
      const text =
        labelKeys
          .map((key) => nonEmptyString(raw[key]))
          .find((entry) => entry !== null) || "";

      return {
        id: String(raw.id ?? index + 1),
        text,
      };
    })
    .filter((item) => item.text.length > 0);
}

function normalizeExplanationStep(
  content: Record<string, unknown>
): NormalizedLessonStepPayload {
  const markdown =
    nonEmptyString(content.markdown) ||
    nonEmptyString(content.text) ||
    nonEmptyString(content.body) ||
    nonEmptyString(content.description) ||
    fallbackExplanationFromContent(content);

  const rawSections = Array.isArray(content.revealSections)
    ? content.revealSections
    : Array.isArray(content.sections)
      ? content.sections
      : [];

  const revealSections = rawSections
    .map((section, index) => {
      const raw = asRecord(section);
      const label = nonEmptyString(raw.label) || `Part ${index + 1}`;
      const sectionContent =
        nonEmptyString(raw.content) ||
        nonEmptyString(raw.text) ||
        nonEmptyString(raw.markdown);

      return label && sectionContent ? { label, content: sectionContent } : null;
    })
    .filter(
      (section): section is { label: string; content: string } => section !== null
    );

  return {
    stepType: "explanation",
    content: {
      type: "explanation",
      markdown,
      ...(revealSections.length > 0 ? { revealSections } : {}),
    },
    answerData: null,
  };
}

function normalizeConceptStep(
  content: Record<string, unknown>
): NormalizedLessonStepPayload {
  const title =
    nonEmptyString(content.title) ||
    nonEmptyString(content.heading) ||
    nonEmptyString(content.concept) ||
    nonEmptyString(content.question);
  const description =
    nonEmptyString(content.description) ||
    nonEmptyString(content.body) ||
    nonEmptyString(content.markdown) ||
    nonEmptyString(content.text);

  if (!title && !description) {
    return normalizeExplanationStep(content);
  }

  const highlightStyle = new Set(["info", "warning", "success", "default"]).has(
    String(content.highlightStyle ?? "")
  )
    ? (String(content.highlightStyle) as "info" | "warning" | "success" | "default")
    : "info";

  return {
    stepType: "concept",
    content: {
      type: "concept",
      title: title || "Key concept",
      description: description || title || "Review this concept.",
      highlightStyle,
    },
    answerData: null,
  };
}

function resolveCorrectOptionId(
  value: unknown,
  options: { id: string; text: string }[]
): string | null {
  if (!options.length) return null;

  const asIndex = toNumber(value);
  if (asIndex !== null) {
    const rounded = Math.round(asIndex);
    if (rounded >= 0 && rounded < options.length) return options[rounded].id;
    if (rounded >= 1 && rounded <= options.length) return options[rounded - 1].id;
  }

  const text = nonEmptyString(value);
  if (!text) return null;

  const byId = options.find((option) => option.id === text);
  if (byId) return byId.id;

  const byText = options.find(
    (option) => option.text.toLowerCase() === text.toLowerCase()
  );
  return byText?.id || null;
}

function normalizeMultipleChoiceStep(
  content: Record<string, unknown>,
  answerData: Record<string, unknown>
): NormalizedLessonStepPayload {
  const question =
    nonEmptyString(content.question) ||
    nonEmptyString(content.prompt) ||
    nonEmptyString(content.title) ||
    nonEmptyString(content.statement);

  const rawOptions = Array.isArray(content.options)
    ? content.options
    : Array.isArray(content.choices)
      ? content.choices
      : Array.isArray(content.answers)
        ? content.answers
        : [];

  const options = rawOptions
    .map((option, index) => {
      if (typeof option === "string" || typeof option === "number") {
        const text = String(option).trim();
        return text
          ? {
              id: toAlphaId(index),
              text,
            }
          : null;
      }

      const raw = asRecord(option);
      const text =
        nonEmptyString(raw.text) ||
        nonEmptyString(raw.label) ||
        nonEmptyString(raw.option) ||
        nonEmptyString(raw.answer) ||
        nonEmptyString(raw.value);

      if (!text) return null;

      return {
        id: nonEmptyString(raw.id) || toAlphaId(index),
        text,
        explanation: nonEmptyString(raw.explanation) || undefined,
      };
    })
    .filter(
      (
        option
      ): option is { id: string; text: string; explanation?: string | undefined } =>
        option !== null
    );

  if (!question || options.length < 2) {
    return normalizeExplanationStep({
      markdown: fallbackExplanationFromContent(
        { question, options },
        question || "Review the material."
      ),
    });
  }

  const correctOptionId =
    resolveCorrectOptionId(
      answerData.correctOptionId ??
        answerData.correctAnswerId ??
        answerData.correctOption ??
        answerData.correctAnswer ??
        answerData.answerId ??
        answerData.correctIndex,
      options
    ) || options[0].id;

  return {
    stepType: "multiple_choice",
    content: {
      type: "multiple_choice",
      question,
      options,
    },
    answerData: { correctOptionId },
  };
}

function normalizeTrueFalseStep(
  content: Record<string, unknown>,
  answerData: Record<string, unknown>
): NormalizedLessonStepPayload {
  const statement =
    nonEmptyString(content.statement) ||
    nonEmptyString(content.question) ||
    nonEmptyString(content.text) ||
    nonEmptyString(content.prompt);

  if (!statement) {
    return normalizeExplanationStep(content);
  }

  const correctValue =
    toBoolean(answerData.correctValue ?? answerData.answer ?? answerData.correctAnswer) ??
    true;

  return {
    stepType: "true_false",
    content: {
      type: "true_false",
      statement,
      trueExplanation: nonEmptyString(content.trueExplanation) || undefined,
      falseExplanation: nonEmptyString(content.falseExplanation) || undefined,
    },
    answerData: { correctValue },
  };
}

function detectOneBasedIndexing(
  rawPairs: unknown[],
  position: 0 | 1,
  listLength: number
): boolean {
  if (listLength <= 0) return false;
  const numericValues = rawPairs
    .filter((entry) => Array.isArray(entry) && entry.length > position)
    .map((entry) => toNumber((entry as unknown[])[position]))
    .filter((value): value is number => value !== null)
    .map((value) => Math.round(value));

  if (numericValues.length === 0) return false;
  const hasZero = numericValues.some((value) => value === 0);
  const allWithinOneBased = numericValues.every(
    (value) => value >= 1 && value <= listLength
  );
  return allWithinOneBased && !hasZero;
}

function resolveListIndex(
  value: unknown,
  listLength: number,
  preferOneBased: boolean
): number | null {
  const numeric = toNumber(value);
  if (numeric === null || listLength <= 0) return null;

  const rounded = Math.round(numeric);
  if (preferOneBased && rounded >= 1 && rounded <= listLength) {
    return rounded - 1;
  }
  if (rounded >= 0 && rounded < listLength) {
    return rounded;
  }
  if (!preferOneBased && rounded >= 1 && rounded <= listLength) {
    return rounded - 1;
  }
  return null;
}

function resolveListValue(
  value: unknown,
  values: string[],
  preferOneBased: boolean
): string | null {
  const index = resolveListIndex(value, values.length, preferOneBased);
  if (index !== null && values[index] !== undefined) return values[index];
  const text = nonEmptyString(value);
  return text || null;
}

function normalizeDragSortStep(
  content: Record<string, unknown>,
  answerData: Record<string, unknown>
): NormalizedLessonStepPayload {
  const items = toOrderedItems(
    content.items ??
      content.steps ??
      content.sequence ??
      content.order ??
      content.options
  ).map((item, index) => ({
    id: item.id || String(index + 1),
    text: item.text,
  }));

  if (items.length < 2) {
    return normalizeExplanationStep(content);
  }

  const rawCorrectOrder = Array.isArray(answerData.correctOrder)
    ? answerData.correctOrder
    : Array.isArray(answerData.order)
      ? answerData.order
      : [];
  const useOneBased = detectOneBasedIndexing([rawCorrectOrder], 0, items.length);
  const correctOrder = rawCorrectOrder
    .map((value) => {
      const byIndex = resolveListIndex(value, items.length, useOneBased);
      if (byIndex !== null && items[byIndex]) return items[byIndex].id;

      const text = nonEmptyString(value);
      if (!text) return null;

      const byId = items.find((item) => item.id === text);
      if (byId) return byId.id;

      const byText = items.find(
        (item) => item.text.toLowerCase() === text.toLowerCase()
      );
      return byText?.id || null;
    })
    .filter((itemId): itemId is string => itemId !== null);

  return {
    stepType: "drag_sort",
    content: {
      type: "drag_sort",
      instruction:
        nonEmptyString(content.instruction) || "Put the items in the correct order",
      items,
    },
    answerData: {
      correctOrder: correctOrder.length === items.length
        ? correctOrder
        : items.map((item) => item.id),
    },
  };
}

function normalizeDragMatchStep(
  content: Record<string, unknown>,
  answerData: Record<string, unknown>
): NormalizedLessonStepPayload {
  const rawPairs = Array.isArray(content.pairs)
    ? content.pairs
    : Array.isArray(content.items)
      ? content.items
      : [];

  let pairs = rawPairs
    .map((pair, index) => {
      const rawPair = asRecord(pair);
      return {
        id: String(rawPair.id ?? `${index + 1}`),
        left: String(
          rawPair.left ?? rawPair.term ?? rawPair.concept ?? rawPair.title ?? ""
        ).trim(),
        right: String(
          rawPair.right ??
            rawPair.definition ??
            rawPair.match ??
            rawPair.value ??
            rawPair.explanation ??
            ""
        ).trim(),
      };
    })
    .filter((pair) => pair.left.length > 0 || pair.right.length > 0);

  if (pairs.length === 0) {
    const leftItems = toStringArray(content.leftItems);
    const rightItems = toStringArray(content.rightItems);
    pairs = leftItems.map((left, index) => ({
      id: String(index + 1),
      left,
      right: rightItems[index] || "",
    }));
  }

  const rightPool = [
    ...pairs.map((pair) => pair.right).filter((value) => value.length > 0),
    ...toStringArray(content.rightItems),
  ];
  const rawCorrectPairs = answerData.correctPairs ?? answerData.pairs;
  const normalizedCorrectPairs: Record<string, string> = {};
  const rawCorrectPairsArray = Array.isArray(rawCorrectPairs)
    ? rawCorrectPairs
    : [];
  const useOneBasedLeft = detectOneBasedIndexing(
    rawCorrectPairsArray,
    0,
    pairs.length
  );
  const useOneBasedRight = detectOneBasedIndexing(
    rawCorrectPairsArray,
    1,
    rightPool.length
  );

  if (Array.isArray(rawCorrectPairs)) {
    for (const entry of rawCorrectPairs) {
      if (Array.isArray(entry) && entry.length >= 2) {
        const leftIndex = resolveListIndex(
          entry[0],
          pairs.length,
          useOneBasedLeft
        );
        const rightIndex = resolveListIndex(
          entry[1],
          rightPool.length,
          useOneBasedRight
        );

        let pairId: string | null = null;
        if (leftIndex !== null && pairs[leftIndex]) {
          pairId = pairs[leftIndex].id;
        } else {
          const leftText = String(entry[0] ?? "").trim();
          const foundPair = pairs.find(
            (pair) => pair.id === leftText || pair.left === leftText
          );
          pairId = foundPair?.id || (leftText.length > 0 ? leftText : null);
        }

        const rightText =
          rightIndex !== null && rightPool[rightIndex] !== undefined
            ? rightPool[rightIndex]
            : String(entry[1] ?? "").trim();

        if (pairId && rightText) normalizedCorrectPairs[pairId] = rightText;
        continue;
      }

      const rawPair = asRecord(entry);
      const leftText = String(
        rawPair.left ?? rawPair.leftId ?? rawPair.from ?? ""
      ).trim();
      const rightText = String(
        rawPair.right ?? rawPair.rightText ?? rawPair.to ?? ""
      ).trim();
      if (leftText && rightText) normalizedCorrectPairs[leftText] = rightText;
    }
  } else if (rawCorrectPairs && typeof rawCorrectPairs === "object") {
    for (const [rawLeft, rawRight] of Object.entries(
      rawCorrectPairs as Record<string, unknown>
    )) {
      const leftIndex = resolveListIndex(
        rawLeft,
        pairs.length,
        useOneBasedLeft
      );
      const leftKey =
        leftIndex !== null && pairs[leftIndex]
          ? pairs[leftIndex].id
          : String(rawLeft ?? "").trim();
      const rightIndex = resolveListIndex(
        rawRight,
        rightPool.length,
        useOneBasedRight
      );
      const rightValue =
        rightIndex !== null && rightPool[rightIndex] !== undefined
          ? rightPool[rightIndex]
          : String(rawRight ?? "").trim();
      if (leftKey && rightValue) normalizedCorrectPairs[leftKey] = rightValue;
    }
  }

  const reconciledCorrectPairs: Record<string, string> = {};
  for (const [rawKey, rightText] of Object.entries(normalizedCorrectPairs)) {
    if (!rightText) continue;

    const byId = pairs.find((pair) => pair.id === rawKey);
    if (byId) {
      reconciledCorrectPairs[byId.id] = rightText;
      continue;
    }

    const byLeft = pairs.find((pair) => pair.left === rawKey);
    if (byLeft) {
      reconciledCorrectPairs[byLeft.id] = rightText;
      continue;
    }
  }

  pairs = pairs
    .map((pair) => {
      const right = pair.right || reconciledCorrectPairs[pair.id] || "";
      return { ...pair, right };
    })
    .filter((pair) => pair.left.trim().length > 0 && pair.right.trim().length > 0);

  if (pairs.length < 2) {
    return normalizeExplanationStep(content);
  }

  for (const pair of pairs) {
    if (!reconciledCorrectPairs[pair.id]) {
      reconciledCorrectPairs[pair.id] = pair.right;
    }
  }

  return {
    stepType: "drag_match",
    content: {
      type: "drag_match",
      instruction:
        nonEmptyString(content.instruction) ||
        "Match each item with its definition",
      pairs,
    },
    answerData: { correctPairs: reconciledCorrectPairs },
  };
}

function normalizeDragCategorizeStep(
  content: Record<string, unknown>,
  answerData: Record<string, unknown>
): NormalizedLessonStepPayload {
  const rawCategories = Array.isArray(content.categories)
    ? content.categories
    : Array.isArray(content.groups)
      ? content.groups
      : Array.isArray(content.buckets)
        ? content.buckets
        : [];

  const categories = rawCategories
    .map((category, index) => {
      if (typeof category === "string" || typeof category === "number") {
        const name = String(category).trim();
        return name ? { id: `cat${index + 1}`, name } : null;
      }

      const raw = asRecord(category);
      const name =
        nonEmptyString(raw.name) ||
        nonEmptyString(raw.label) ||
        nonEmptyString(raw.title);

      return name
        ? {
            id: nonEmptyString(raw.id) || `cat${index + 1}`,
            name,
          }
        : null;
    })
    .filter((category): category is { id: string; name: string } => category !== null);

  const rawItems = Array.isArray(content.items)
    ? content.items
    : Array.isArray(content.terms)
      ? content.terms
      : Array.isArray(content.cards)
        ? content.cards
        : [];

  const rawMapping = answerData.correctMapping ?? answerData.mapping ?? {};
  const useOneBasedCategoryIndexing = Array.isArray(rawMapping)
    ? detectOneBasedIndexing(rawMapping, 1, categories.length)
    : false;

  const resolveCategoryId = (value: unknown): string | null => {
    const byIndex = resolveListIndex(
      value,
      categories.length,
      useOneBasedCategoryIndexing
    );
    if (byIndex !== null && categories[byIndex]) return categories[byIndex].id;

    const text = nonEmptyString(value);
    if (!text) return null;

    const byId = categories.find((category) => category.id === text);
    if (byId) return byId.id;

    const byName = categories.find(
      (category) => category.name.toLowerCase() === text.toLowerCase()
    );
    return byName?.id || null;
  };

  const inferredMapping: Record<string, string> = {};
  if (Array.isArray(rawMapping)) {
    for (const entry of rawMapping) {
      if (Array.isArray(entry) && entry.length >= 2) {
        const itemKey = nonEmptyString(entry[0]);
        const categoryId = resolveCategoryId(entry[1]);
        if (itemKey && categoryId) inferredMapping[itemKey] = categoryId;
      }
    }
  } else {
    for (const [itemKey, categoryValue] of Object.entries(
      asRecord(rawMapping)
    )) {
      const categoryId = resolveCategoryId(categoryValue);
      if (categoryId) inferredMapping[itemKey] = categoryId;
    }
  }

  const items = rawItems
    .map((item, index) => {
      if (typeof item === "string" || typeof item === "number") {
        const text = String(item).trim();
        return text
          ? {
              id: String(index + 1),
              text,
              categoryId:
                inferredMapping[String(index + 1)] || categories[0]?.id || "",
            }
          : null;
      }

      const raw = asRecord(item);
      const id = nonEmptyString(raw.id) || String(index + 1);
      const text =
        nonEmptyString(raw.text) ||
        nonEmptyString(raw.label) ||
        nonEmptyString(raw.title) ||
        nonEmptyString(raw.value);
      const categoryId =
        resolveCategoryId(raw.categoryId ?? raw.category ?? raw.groupId) ||
        inferredMapping[id] ||
        inferredMapping[text || ""] ||
        "";

      return text ? { id, text, categoryId } : null;
    })
    .filter(
      (item): item is { id: string; text: string; categoryId: string } => item !== null
    )
    .filter((item) => categories.some((category) => category.id === item.categoryId));

  if (categories.length < 2 || items.length < 2) {
    return normalizeExplanationStep(content);
  }

  const correctMapping = Object.fromEntries(
    items.map((item) => [item.id, item.categoryId])
  );

  return {
    stepType: "drag_categorize",
    content: {
      type: "drag_categorize",
      instruction:
        nonEmptyString(content.instruction) ||
        "Sort each item into the correct category",
      categories,
      items,
    },
    answerData: { correctMapping },
  };
}

function normalizeFillBlanksStep(
  content: Record<string, unknown>,
  answerData: Record<string, unknown>
): NormalizedLessonStepPayload {
  const rawTemplate = String(content.template ?? content.text ?? "").trim();
  const rawBlanks = Array.isArray(content.blanks) ? content.blanks : [];

  const acceptedById: Record<string, string[]> = {};
  const blankDefinitions = rawBlanks.map((blank, index) => {
    const rawBlank = asRecord(blank);
    const id = String(rawBlank.id ?? `b${index + 1}`).trim();
    const acceptedAnswers = uniqueStrings(
      toStringArray(rawBlank.acceptedAnswers ?? rawBlank.answers ?? rawBlank.answer)
    );
    if (id.length > 0) acceptedById[id] = acceptedAnswers;
    return { id, acceptedAnswers };
  });

  const rawCorrectBlanks = asRecord(answerData.correctBlanks ?? answerData.blanks);
  for (const [id, answers] of Object.entries(rawCorrectBlanks)) {
    acceptedById[id] = uniqueStrings(toStringArray(answers));
  }

  let blankIds = extractFillBlankIds(
    rawTemplate,
    blankDefinitions.map((blank) => ({ id: blank.id }))
  );
  if (blankIds.length === 0) blankIds = blankDefinitions.map((blank) => blank.id);
  if (blankIds.length === 0) blankIds = Object.keys(acceptedById);
  if (blankIds.length === 0) blankIds = ["b1"];

  let template = rawTemplate;
  if (!template) {
    template = blankIds.map((id) => `{{${id}}}`).join(" ");
  } else {
    template = replaceGenericBlankPlaceholders(template, blankIds);
  }

  const blanks = blankIds.map((id, index) => ({
    id,
    acceptedAnswers:
      acceptedById[id] ||
      blankDefinitions.find((blank) => blank.id === id)?.acceptedAnswers ||
      blankDefinitions[index]?.acceptedAnswers ||
      [],
  }));

  const correctBlanks: Record<string, string[]> = {};
  for (const blank of blanks) {
    correctBlanks[blank.id] = blank.acceptedAnswers;
  }

  return {
    stepType: "fill_blanks",
    content: {
      type: "fill_blanks",
      template,
      blanks,
    },
    answerData: { correctBlanks },
  };
}

function normalizeTypeAnswerStep(
  content: Record<string, unknown>,
  answerData: Record<string, unknown>
): NormalizedLessonStepPayload {
  const question =
    nonEmptyString(content.question) ||
    nonEmptyString(content.prompt) ||
    nonEmptyString(content.text);

  const acceptedAnswers = uniqueStrings(
    toStringArray(
      answerData.acceptedAnswers ?? answerData.answers ?? answerData.correctAnswers
    )
  );

  if (!question || acceptedAnswers.length === 0) {
    return normalizeExplanationStep(content);
  }

  return {
    stepType: "type_answer",
    content: {
      type: "type_answer",
      question,
      placeholder:
        typeof content.placeholder === "string" ? content.placeholder : undefined,
      caseSensitive:
        typeof content.caseSensitive === "boolean" ? content.caseSensitive : false,
    },
    answerData: { acceptedAnswers },
  };
}

function normalizeSelectManyStep(
  content: Record<string, unknown>,
  answerData: Record<string, unknown>
): NormalizedLessonStepPayload {
  const question =
    nonEmptyString(content.question) ||
    nonEmptyString(content.prompt) ||
    nonEmptyString(content.title);

  const rawOptions = Array.isArray(content.options)
    ? content.options
    : Array.isArray(content.choices)
      ? content.choices
      : Array.isArray(content.answers)
        ? content.answers
        : [];

  const options = rawOptions
    .map((option, index) => {
      if (typeof option === "string" || typeof option === "number") {
        const text = String(option).trim();
        return text
          ? {
              id: toAlphaId(index),
              text,
            }
          : null;
      }

      const raw = asRecord(option);
      const text =
        nonEmptyString(raw.text) ||
        nonEmptyString(raw.label) ||
        nonEmptyString(raw.option) ||
        nonEmptyString(raw.answer) ||
        nonEmptyString(raw.value);

      if (!text) return null;

      return {
        id: nonEmptyString(raw.id) || toAlphaId(index),
        text,
        explanation: nonEmptyString(raw.explanation) || undefined,
      };
    })
    .filter(
      (
        option
      ): option is { id: string; text: string; explanation?: string | undefined } =>
        option !== null
    );

  const rawCorrectValues = Array.isArray(answerData.correctOptionIds)
    ? answerData.correctOptionIds
    : Array.isArray(answerData.correctAnswers)
      ? answerData.correctAnswers
      : Array.isArray(answerData.correctOptions)
        ? answerData.correctOptions
        : Array.isArray(answerData.correctIndices)
          ? answerData.correctIndices
          : [];

  const useOneBased = detectOneBasedIndexing([rawCorrectValues], 0, options.length);
  const correctOptionIds = uniqueStrings(
    rawCorrectValues
      .map((value) => resolveListValue(value, options.map((option) => option.id), useOneBased))
      .map((value) => {
        if (!value) return null;
        const byId = options.find((option) => option.id === value);
        if (byId) return byId.id;
        const byText = options.find(
          (option) => option.text.toLowerCase() === value.toLowerCase()
        );
        return byText?.id || null;
      })
      .filter((value): value is string => value !== null)
  );

  if (!question || options.length < 2 || correctOptionIds.length === 0) {
    return normalizeExplanationStep(content);
  }

  return {
    stepType: "select_many",
    content: {
      type: "select_many",
      question,
      options,
    },
    answerData: { correctOptionIds },
  };
}

function normalizeRevealStep(
  content: Record<string, unknown>
): NormalizedLessonStepPayload {
  const rawSteps = Array.isArray(content.steps)
    ? content.steps
    : Array.isArray(content.sections)
      ? content.sections
      : Array.isArray(content.items)
        ? content.items
        : [];

  let steps = rawSteps
    .map((step, index) => {
      if (typeof step === "string" || typeof step === "number") {
        const text = String(step).trim();
        return text ? { id: String(index + 1), content: text } : null;
      }

      const raw = asRecord(step);
      const stepContent =
        nonEmptyString(raw.content) ||
        nonEmptyString(raw.text) ||
        nonEmptyString(raw.markdown) ||
        nonEmptyString(raw.description);

      return stepContent
        ? {
            id: nonEmptyString(raw.id) || String(index + 1),
            content: stepContent,
          }
        : null;
    })
    .filter((step): step is { id: string; content: string } => step !== null);

  if (steps.length === 0) {
    const fallbackText =
      nonEmptyString(content.markdown) ||
      nonEmptyString(content.text) ||
      nonEmptyString(content.description);

    if (fallbackText) {
      steps = fallbackText
        .split(/\n{2,}/)
        .map((part) => part.trim())
        .filter(Boolean)
        .map((part, index) => ({ id: String(index + 1), content: part }));
    }
  }

  if (steps.length === 0) {
    return normalizeExplanationStep(content);
  }

  return {
    stepType: "reveal",
    content: {
      type: "reveal",
      title: nonEmptyString(content.title) || undefined,
      steps,
    },
    answerData: null,
  };
}

function coercePayloadToRequestedType(
  requestedType: StepType,
  payload: NormalizedLessonStepPayload
): NormalizedLessonStepPayload {
  if (requestedType === payload.stepType) return payload;
  return payload;
}

export function normalizeLessonStepRecord(
  input: NormalizeLessonStepInput
): NormalizedLessonStepRecord {
  const requestedType = normalizeStepType(input.stepType);
  const content = asRecord(input.content);
  const answerData = asRecord(input.answerData);

  let payload: NormalizedLessonStepPayload;

  switch (requestedType) {
    case "concept":
      payload = normalizeConceptStep(content);
      break;
    case "multiple_choice":
      payload = normalizeMultipleChoiceStep(content, answerData);
      break;
    case "true_false":
      payload = normalizeTrueFalseStep(content, answerData);
      break;
    case "drag_sort":
      payload = normalizeDragSortStep(content, answerData);
      break;
    case "drag_match":
      payload = normalizeDragMatchStep(content, answerData);
      break;
    case "drag_categorize":
      payload = normalizeDragCategorizeStep(content, answerData);
      break;
    case "fill_blanks":
      payload = normalizeFillBlanksStep(content, answerData);
      break;
    case "type_answer":
      payload = normalizeTypeAnswerStep(content, answerData);
      break;
    case "select_many":
      payload = normalizeSelectManyStep(content, answerData);
      break;
    case "reveal":
      payload = normalizeRevealStep(content);
      break;
    case "explanation":
    default:
      payload = normalizeExplanationStep(content);
      break;
  }

  const normalized = coercePayloadToRequestedType(requestedType, payload);
  const explanation = normalizeOptionalString(input.explanation);
  const hint = normalizeOptionalString(input.hint);

  return {
    ...normalized,
    explanation:
      normalized.stepType === "explanation" ||
      normalized.stepType === "concept" ||
      normalized.stepType === "reveal"
        ? explanation
        : explanation || fallbackExplanationFromContent(normalized.content),
    hint:
      normalized.stepType === "explanation" ||
      normalized.stepType === "concept" ||
      normalized.stepType === "reveal"
        ? null
        : hint,
  };
}

function isContentStepType(stepType: StepType): boolean {
  return CONTENT_STEP_TYPES.includes(stepType);
}

function hasMeaningfulStepContent(step: NormalizedLessonStepRecord): boolean {
  const defaultContent = getDefaultStepContent(step.stepType);
  const defaultAnswerData = getDefaultAnswerData(step.stepType);

  return (
    JSON.stringify(step.content) !== JSON.stringify(defaultContent) ||
    JSON.stringify(step.answerData) !== JSON.stringify(defaultAnswerData)
  );
}

export function normalizeLessonSteps(
  steps: NormalizeLessonStepInput[]
): NormalizedLessonStepRecord[] {
  const normalized = steps
    .map((step) => normalizeLessonStepRecord(step))
    .filter((step) => hasMeaningfulStepContent(step));

  if (normalized.length === 0) {
    return [
      normalizeLessonStepRecord({
        stepType: "explanation",
        content: { markdown: "Review the study material and continue." },
        answerData: null,
      }),
    ];
  }

  const remaining = [...normalized];
  const ordered: NormalizedLessonStepRecord[] = [];
  let expectContent = true;

  while (remaining.length > 0) {
    const matchingIndex = remaining.findIndex(
      (step) => isContentStepType(step.stepType) === expectContent
    );
    const nextIndex = matchingIndex >= 0 ? matchingIndex : 0;
    const [nextStep] = remaining.splice(nextIndex, 1);
    ordered.push(nextStep);
    expectContent = !isContentStepType(nextStep.stepType);
  }

  if (!isContentStepType(ordered[0].stepType)) {
    ordered[0] = normalizeLessonStepRecord({
      ...ordered[0],
      stepType: "explanation",
      content: {
        markdown: fallbackExplanationFromContent(
          ordered[0].content,
          ordered[0].explanation || "Start by reviewing this key idea."
        ),
      },
      answerData: null,
    });
  }

  return ordered;
}

export function normalizeLessonStepPayload(
  input: NormalizeLessonStepInput
): NormalizedLessonStepPayload {
  const normalized = normalizeLessonStepRecord(input);
  return {
    stepType: normalized.stepType,
    content: normalized.content,
    answerData: normalized.answerData,
  };
}
