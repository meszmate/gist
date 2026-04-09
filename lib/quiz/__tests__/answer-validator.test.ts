import { describe, it, expect } from "vitest";
import { validateAnswer, validateLegacyAnswer } from "../answer-validator";
import type { UserAnswer } from "@/lib/types/quiz";

describe("validateMultipleChoice", () => {
  const correctData = { correctIndex: 2 };
  const config = { options: ["A", "B", "C", "D"] };

  it("correct answer with object format", () => {
    const result = validateAnswer("multiple_choice", { selectedIndex: 2 }, correctData, config);
    expect(result.isCorrect).toBe(true);
    expect(result.creditPercent).toBe(100);
  });

  it("wrong answer", () => {
    const result = validateAnswer("multiple_choice", { selectedIndex: 0 }, correctData, config);
    expect(result.isCorrect).toBe(false);
    expect(result.creditPercent).toBe(0);
  });

  it("legacy number format", () => {
    const result = validateAnswer("multiple_choice", 2, correctData, config);
    expect(result.isCorrect).toBe(true);
  });

  it("invalid format returns 0", () => {
    const result = validateAnswer("multiple_choice", "wrong" as unknown as UserAnswer, correctData, config);
    expect(result.isCorrect).toBe(false);
    expect(result.creditPercent).toBe(0);
  });
});

describe("validateTrueFalse", () => {
  it("correct with selectedValue", () => {
    const result = validateAnswer("true_false", { selectedValue: true }, { correctValue: true }, {});
    expect(result.isCorrect).toBe(true);
  });

  it("wrong value", () => {
    const result = validateAnswer("true_false", { selectedValue: false }, { correctValue: true }, {});
    expect(result.isCorrect).toBe(false);
  });

  it("legacy boolean format", () => {
    const result = validateAnswer("true_false", true as unknown as UserAnswer, { correctValue: true }, {});
    expect(result.isCorrect).toBe(true);
  });

  it("handles isTrue fallback in correctAnswerData", () => {
    const result = validateAnswer("true_false", { selectedValue: true }, { isTrue: true } as any, {});
    expect(result.isCorrect).toBe(true);
  });
});

describe("validateTextInput", () => {
  const correctData = { acceptedAnswers: ["Paris", "paris"], keywords: ["capital", "France"] };
  const config = { caseSensitive: false, trimWhitespace: true };

  it("exact match", () => {
    const result = validateAnswer("text_input", { text: "Paris" }, correctData, config);
    expect(result.isCorrect).toBe(true);
    expect(result.creditPercent).toBe(100);
  });

  it("case insensitive match", () => {
    const result = validateAnswer("text_input", { text: "PARIS" }, correctData, config);
    expect(result.isCorrect).toBe(true);
  });

  it("keyword partial credit", () => {
    const result = validateAnswer("text_input", { text: "the capital of France is nice" }, correctData, config);
    expect(result.isCorrect).toBe(false);
    expect(result.creditPercent).toBeGreaterThan(0);
    expect(result.creditPercent).toBeLessThanOrEqual(75);
  });

  it("no match returns 0", () => {
    const result = validateAnswer("text_input", { text: "London" }, correctData, config);
    expect(result.creditPercent).toBe(0);
  });
});

describe("validateYearRange", () => {
  const correctData = { correctYear: 1969 };
  const config = { minYear: 1900, maxYear: 2024, tolerance: 5 };

  it("exact match", () => {
    const result = validateAnswer("year_range", { year: 1969 }, correctData, config);
    expect(result.isCorrect).toBe(true);
  });

  it("within tolerance gives partial credit", () => {
    const result = validateAnswer("year_range", { year: 1971 }, correctData, config);
    expect(result.isCorrect).toBe(false);
    expect(result.creditPercent).toBeGreaterThan(0);
  });

  it("outside tolerance gives 0", () => {
    const result = validateAnswer("year_range", { year: 1950 }, correctData, config);
    expect(result.creditPercent).toBe(0);
  });

  it("handles correctYear/exactYear/year fallbacks", () => {
    const r1 = validateAnswer("year_range", { year: 1969 }, { exactYear: 1969 } as any, config);
    expect(r1.isCorrect).toBe(true);
    const r2 = validateAnswer("year_range", { year: 1969 }, { year: 1969 } as any, config);
    expect(r2.isCorrect).toBe(true);
  });

  it("partialCreditRanges", () => {
    const data = { correctYear: 1969, partialCreditRanges: [{ tolerance: 2, creditPercent: 80 }] };
    const result = validateAnswer("year_range", { year: 1970 }, data, {});
    expect(result.creditPercent).toBe(80);
  });
});

describe("validateNumericRange", () => {
  const correctData = { correctValue: 100 };
  const config = { tolerance: 10, toleranceType: "absolute" as const };

  it("exact match", () => {
    const result = validateAnswer("numeric_range", { value: 100 }, correctData, config);
    expect(result.isCorrect).toBe(true);
  });

  it("within absolute tolerance gives partial credit", () => {
    const result = validateAnswer("numeric_range", { value: 105 }, correctData, config);
    expect(result.isCorrect).toBe(false);
    expect(result.creditPercent).toBeGreaterThan(0);
  });

  it("percentage tolerance", () => {
    const pctConfig = { tolerance: 10, toleranceType: "percentage" as const };
    const result = validateAnswer("numeric_range", { value: 108 }, correctData, pctConfig);
    expect(result.creditPercent).toBeGreaterThan(0);
  });

  it("floating point exact match with tolerance", () => {
    const result = validateAnswer("numeric_range", { value: 100.00005 }, correctData, config);
    expect(result.isCorrect).toBe(true);
  });
});

describe("validateMatching", () => {
  const correctData = { correctPairs: { "Term1": "Def1", "Term2": "Def2" } };
  const config = { leftColumn: ["Term1", "Term2"], rightColumn: ["Def1", "Def2"] };

  it("all correct", () => {
    const result = validateAnswer("matching", { pairs: { "Term1": "Def1", "Term2": "Def2" } }, correctData, config);
    expect(result.isCorrect).toBe(true);
    expect(result.creditPercent).toBe(100);
  });

  it("partial credit", () => {
    const result = validateAnswer("matching", { pairs: { "Term1": "Def1", "Term2": "Def1" } }, correctData, config);
    expect(result.isCorrect).toBe(false);
    expect(result.creditPercent).toBe(50);
  });

  it("disabled partial credit", () => {
    const data = { ...correctData, partialCreditPerPair: false };
    const result = validateAnswer("matching", { pairs: { "Term1": "Def1", "Term2": "Def1" } }, data, config);
    expect(result.creditPercent).toBe(0);
  });
});

describe("validateFillBlank", () => {
  const correctData = { blanks: { "b1": ["Paris", "paris"], "b2": ["France"] } };
  const config = { caseSensitive: false };

  it("all blanks correct", () => {
    const result = validateAnswer("fill_blank", { blanks: { "b1": "Paris", "b2": "France" } }, correctData, config);
    expect(result.isCorrect).toBe(true);
  });

  it("partial blanks correct", () => {
    const result = validateAnswer("fill_blank", { blanks: { "b1": "Paris", "b2": "Germany" } }, correctData, config);
    expect(result.isCorrect).toBe(false);
    expect(result.creditPercent).toBe(50);
  });

  it("case insensitive", () => {
    const result = validateAnswer("fill_blank", { blanks: { "b1": "PARIS", "b2": "FRANCE" } }, correctData, config);
    expect(result.isCorrect).toBe(true);
  });
});

describe("validateMultiSelect", () => {
  const correctData = { correctIndices: [0, 2] };
  const config = { options: ["A", "B", "C", "D"] };

  it("perfect match", () => {
    const result = validateAnswer("multi_select", { selectedIndices: [0, 2] }, correctData, config);
    expect(result.isCorrect).toBe(true);
    expect(result.creditPercent).toBe(100);
  });

  it("partial credit with penalty", () => {
    const result = validateAnswer("multi_select", { selectedIndices: [0] }, correctData, config);
    expect(result.isCorrect).toBe(false);
    expect(result.creditPercent).toBeGreaterThan(0);
  });

  it("wrong selection reduces credit", () => {
    const result = validateAnswer("multi_select", { selectedIndices: [0, 1, 2] }, correctData, config);
    expect(result.isCorrect).toBe(false);
  });

  it("disabled partial credit", () => {
    const data = { ...correctData, partialCredit: false };
    const result = validateAnswer("multi_select", { selectedIndices: [0] }, data, config);
    expect(result.creditPercent).toBe(0);
  });
});

describe("validateAnswer edge cases", () => {
  it("null answer returns 0", () => {
    const result = validateAnswer("multiple_choice", null, { correctIndex: 0 }, {});
    expect(result.isCorrect).toBe(false);
    expect(result.feedback).toBe("No answer provided");
  });

  it("null correctAnswerData returns 0", () => {
    const result = validateAnswer("multiple_choice", { selectedIndex: 0 }, null, {});
    expect(result.isCorrect).toBe(false);
  });

  it("partialCreditEnabled=false zeros out partial credit", () => {
    const correctData = { blanks: { "b1": ["Paris"], "b2": ["France"] } };
    const result = validateAnswer("fill_blank", { blanks: { "b1": "Paris", "b2": "wrong" } }, correctData, {}, false);
    expect(result.creditPercent).toBe(0);
  });

  it("unknown question type", () => {
    const result = validateAnswer("custom_type" as any, { text: "hi" }, { answer: "hi" }, {});
    expect(result.isCorrect).toBe(false);
  });
});

describe("validateLegacyAnswer", () => {
  it("correct", () => {
    const result = validateLegacyAnswer(2, 2);
    expect(result.isCorrect).toBe(true);
    expect(result.creditPercent).toBe(100);
  });

  it("incorrect", () => {
    const result = validateLegacyAnswer(1, 2);
    expect(result.isCorrect).toBe(false);
    expect(result.creditPercent).toBe(0);
  });

  it("null answer", () => {
    const result = validateLegacyAnswer(null, 2);
    expect(result.isCorrect).toBe(false);
  });
});
