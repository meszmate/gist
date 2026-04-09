import { describe, it, expect } from "vitest";
import {
  parseJsonWithFallback,
  extractArray,
  extractArrayDeep,
  normalizeFlashcards,
} from "../parsing";

describe("parseJsonWithFallback", () => {
  it("parses valid JSON", () => {
    expect(parseJsonWithFallback('{"a":1}')).toEqual({ a: 1 });
  });

  it("parses valid JSON array", () => {
    expect(parseJsonWithFallback("[1,2,3]")).toEqual([1, 2, 3]);
  });

  it("extracts object from garbage prefix", () => {
    expect(parseJsonWithFallback('Here is the result: {"a":1}')).toEqual({ a: 1 });
  });

  it("extracts array from garbage", () => {
    expect(parseJsonWithFallback("some text [1,2,3] more text")).toEqual([1, 2, 3]);
  });

  it("handles markdown fenced JSON", () => {
    const input = '```json\n{"flashcards": [{"front":"Q","back":"A"}]}\n```';
    const result = parseJsonWithFallback(input);
    expect(result).toEqual({ flashcards: [{ front: "Q", back: "A" }] });
  });

  it("returns null for unparseable text", () => {
    expect(parseJsonWithFallback("no json here")).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(parseJsonWithFallback("")).toBeNull();
  });

  it("prefers object extraction over array", () => {
    const input = 'prefix {"items": [1]} suffix';
    const result = parseJsonWithFallback(input);
    expect(result).toEqual({ items: [1] });
  });
});

describe("extractArray", () => {
  it("returns array directly", () => {
    expect(extractArray([1, 2, 3], ["items"])).toEqual([1, 2, 3]);
  });

  it("extracts by first matching key", () => {
    const data = { flashcards: [{ front: "Q", back: "A" }] };
    expect(extractArray(data, ["flashcards", "cards"])).toEqual([{ front: "Q", back: "A" }]);
  });

  it("tries multiple keys", () => {
    const data = { cards: [1, 2] };
    expect(extractArray(data, ["flashcards", "cards"])).toEqual([1, 2]);
  });

  it("returns empty for no match", () => {
    expect(extractArray({ x: "y" }, ["items"])).toEqual([]);
  });

  it("returns empty for null", () => {
    expect(extractArray(null, ["items"])).toEqual([]);
  });
});

describe("extractArrayDeep", () => {
  it("finds nested array", () => {
    const data = { response: { data: { items: [1, 2, 3] } } };
    expect(extractArrayDeep(data, ["items"])).toEqual([1, 2, 3]);
  });

  it("finds first array in nested object", () => {
    const data = { response: { results: [1, 2] } };
    expect(extractArrayDeep(data, ["items"])).toEqual([1, 2]);
  });

  it("prefers direct match over deep search", () => {
    const data = { items: [1], nested: { items: [2] } };
    expect(extractArrayDeep(data, ["items"])).toEqual([1]);
  });

  it("returns empty for no arrays", () => {
    expect(extractArrayDeep({ a: "b" }, ["items"])).toEqual([]);
  });
});

describe("normalizeFlashcards", () => {
  it("normalizes standard format", () => {
    const input = [{ front: "Q1", back: "A1" }, { front: "Q2", back: "A2" }];
    const result = normalizeFlashcards(input);
    expect(result).toEqual([{ front: "Q1", back: "A1" }, { front: "Q2", back: "A2" }]);
  });

  it("normalizes question/answer format", () => {
    const input = [{ question: "Q1", answer: "A1" }];
    expect(normalizeFlashcards(input)).toEqual([{ front: "Q1", back: "A1" }]);
  });

  it("normalizes term/definition format", () => {
    const input = [{ term: "T1", definition: "D1" }];
    expect(normalizeFlashcards(input)).toEqual([{ front: "T1", back: "D1" }]);
  });

  it("normalizes prompt/explanation format", () => {
    const input = [{ prompt: "P1", explanation: "E1" }];
    expect(normalizeFlashcards(input)).toEqual([{ front: "P1", back: "E1" }]);
  });

  it("filters out empty cards", () => {
    const input = [{ front: "Q1", back: "A1" }, { front: "", back: "A2" }, { front: "Q3", back: "" }];
    expect(normalizeFlashcards(input)).toEqual([{ front: "Q1", back: "A1" }]);
  });

  it("filters out non-objects", () => {
    const input = [null, undefined, "string", 42, { front: "Q1", back: "A1" }];
    expect(normalizeFlashcards(input)).toEqual([{ front: "Q1", back: "A1" }]);
  });

  it("trims whitespace", () => {
    const input = [{ front: "  Q1  ", back: "  A1  " }];
    expect(normalizeFlashcards(input)).toEqual([{ front: "Q1", back: "A1" }]);
  });
});
