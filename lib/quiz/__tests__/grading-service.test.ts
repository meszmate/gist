import { describe, it, expect } from "vitest";
import {
  gradeQuestion,
  gradeQuiz,
  formatGradeDisplay,
  getGradeColorClass,
  calculateQuizStatistics,
  type QuestionData,
} from "../grading-service";

function makeQuestion(overrides: Partial<QuestionData> = {}): QuestionData {
  return {
    id: "q1",
    questionType: "multiple_choice",
    questionConfig: { options: ["A", "B", "C", "D"] },
    correctAnswerData: { correctIndex: 0 },
    points: 1,
    ...overrides,
  };
}

describe("gradeQuestion", () => {
  it("grades correct answer", () => {
    const result = gradeQuestion(makeQuestion(), { selectedIndex: 0 });
    expect(result.isCorrect).toBe(true);
    expect(result.pointsEarned).toBe(1);
    expect(result.creditPercent).toBe(100);
  });

  it("grades wrong answer", () => {
    const result = gradeQuestion(makeQuestion(), { selectedIndex: 1 });
    expect(result.isCorrect).toBe(false);
    expect(result.pointsEarned).toBe(0);
  });

  it("handles legacy format (options + correctAnswer, no correctAnswerData)", () => {
    const legacy = makeQuestion({
      correctAnswerData: null,
      options: ["A", "B", "C"],
      correctAnswer: 1,
    });
    const result = gradeQuestion(legacy, 1);
    expect(result.isCorrect).toBe(true);
  });

  it("respects point values", () => {
    const result = gradeQuestion(makeQuestion({ points: 3 }), { selectedIndex: 0 });
    expect(result.pointsEarned).toBe(3);
    expect(result.pointsPossible).toBe(3);
  });

  it("disables partial credit", () => {
    const q = makeQuestion({
      questionType: "fill_blank",
      questionConfig: { caseSensitive: false },
      correctAnswerData: { blanks: { b1: ["A"], b2: ["B"] } },
      points: 2,
    });
    const result = gradeQuestion(q, { blanks: { b1: "A", b2: "wrong" } }, false);
    expect(result.pointsEarned).toBe(0);
  });
});

describe("gradeQuiz", () => {
  const questions: QuestionData[] = [
    makeQuestion({ id: "q1", points: 1, correctAnswerData: { correctIndex: 0 } }),
    makeQuestion({ id: "q2", points: 2, correctAnswerData: { correctIndex: 1 } }),
    makeQuestion({ id: "q3", points: 1, correctAnswerData: { correctIndex: 2 } }),
  ];

  it("all correct gives 100%", () => {
    const answers = { q1: { selectedIndex: 0 }, q2: { selectedIndex: 1 }, q3: { selectedIndex: 2 } };
    const result = gradeQuiz(questions, answers);
    expect(result.score).toBe(100);
    expect(result.pointsEarned).toBe(4);
    expect(result.pointsPossible).toBe(4);
  });

  it("all wrong gives 0%", () => {
    const answers = { q1: { selectedIndex: 3 }, q2: { selectedIndex: 3 }, q3: { selectedIndex: 3 } };
    const result = gradeQuiz(questions, answers);
    expect(result.score).toBe(0);
    expect(result.pointsEarned).toBe(0);
  });

  it("mixed answers with weighted points", () => {
    const answers = { q1: { selectedIndex: 0 }, q2: { selectedIndex: 3 }, q3: { selectedIndex: 2 } };
    const result = gradeQuiz(questions, answers);
    // 1 + 0 + 1 = 2 out of 4 = 50%
    expect(result.score).toBe(50);
    expect(result.pointsEarned).toBe(2);
  });

  it("percentage grading type with pass threshold", () => {
    const answers = { q1: { selectedIndex: 0 }, q2: { selectedIndex: 1 }, q3: { selectedIndex: 2 } };
    const result = gradeQuiz(questions, answers, { gradingType: "percentage", passThreshold: 60 });
    expect(result.passed).toBe(true);
  });

  it("pass_fail grading", () => {
    const answers = { q1: { selectedIndex: 3 }, q2: { selectedIndex: 3 }, q3: { selectedIndex: 3 } };
    const result = gradeQuiz(questions, answers, { gradingType: "pass_fail", passThreshold: 60 });
    expect(result.grade).toBe("Fail");
    expect(result.passed).toBe(false);
  });

  it("letter grading", () => {
    const answers = { q1: { selectedIndex: 0 }, q2: { selectedIndex: 1 }, q3: { selectedIndex: 2 } };
    const result = gradeQuiz(questions, answers, { gradingType: "letter" });
    expect(result.grade).toBeTruthy();
  });

  it("points grading", () => {
    const answers = { q1: { selectedIndex: 0 }, q2: { selectedIndex: 1 }, q3: { selectedIndex: 2 } };
    const result = gradeQuiz(questions, answers, { gradingType: "points" });
    expect(result.pointsEarned).toBe(4);
    expect(result.passed).toBe(true);
  });
});

describe("formatGradeDisplay", () => {
  const baseResult = { score: 85.5, pointsEarned: 8.55, pointsPossible: 10, grade: "B+", passed: true, questionResults: [] };

  it("percentage", () => {
    expect(formatGradeDisplay(baseResult, "percentage")).toBe("85.5%");
  });

  it("letter", () => {
    expect(formatGradeDisplay(baseResult, "letter")).toBe("B+");
  });

  it("pass_fail", () => {
    expect(formatGradeDisplay({ ...baseResult, grade: "Pass" }, "pass_fail")).toBe("Pass");
  });

  it("points with showPointValues", () => {
    expect(formatGradeDisplay(baseResult, "points", true)).toBe("8.6 / 10.0 pts");
  });

  it("points without showPointValues falls back to percentage", () => {
    expect(formatGradeDisplay(baseResult, "points", false)).toBe("85.5%");
  });
});

describe("getGradeColorClass", () => {
  it("success for >= 80", () => {
    expect(getGradeColorClass(80)).toBe("success");
    expect(getGradeColorClass(100)).toBe("success");
  });

  it("warning for >= passThreshold and < 80", () => {
    expect(getGradeColorClass(60)).toBe("warning");
    expect(getGradeColorClass(79)).toBe("warning");
  });

  it("error for < passThreshold", () => {
    expect(getGradeColorClass(59)).toBe("error");
    expect(getGradeColorClass(0)).toBe("error");
  });

  it("custom passThreshold", () => {
    expect(getGradeColorClass(45, 40)).toBe("warning");
    expect(getGradeColorClass(35, 40)).toBe("error");
  });
});

describe("calculateQuizStatistics", () => {
  it("empty results", () => {
    const stats = calculateQuizStatistics([]);
    expect(stats.averageScore).toBe(0);
    expect(stats.passRate).toBe(0);
  });

  it("single result", () => {
    const stats = calculateQuizStatistics([
      { score: 85, pointsEarned: 8.5, pointsPossible: 10, grade: "B", passed: true, questionResults: [] },
    ]);
    expect(stats.averageScore).toBe(85);
    expect(stats.medianScore).toBe(85);
    expect(stats.highestScore).toBe(85);
    expect(stats.lowestScore).toBe(85);
    expect(stats.standardDeviation).toBe(0);
    expect(stats.passRate).toBe(100);
  });

  it("multiple results with median (odd count)", () => {
    const results = [
      { score: 60, pointsEarned: 6, pointsPossible: 10, grade: null, passed: true, questionResults: [] },
      { score: 80, pointsEarned: 8, pointsPossible: 10, grade: null, passed: true, questionResults: [] },
      { score: 100, pointsEarned: 10, pointsPossible: 10, grade: null, passed: true, questionResults: [] },
    ];
    const stats = calculateQuizStatistics(results);
    expect(stats.medianScore).toBe(80);
    expect(stats.averageScore).toBe(80);
  });

  it("even count median", () => {
    const results = [
      { score: 60, pointsEarned: 6, pointsPossible: 10, grade: null, passed: false, questionResults: [] },
      { score: 80, pointsEarned: 8, pointsPossible: 10, grade: null, passed: true, questionResults: [] },
    ];
    const stats = calculateQuizStatistics(results);
    expect(stats.medianScore).toBe(70);
  });

  it("grade distribution", () => {
    const results = [
      { score: 90, pointsEarned: 9, pointsPossible: 10, grade: "A", passed: true, questionResults: [] },
      { score: 85, pointsEarned: 8.5, pointsPossible: 10, grade: "B", passed: true, questionResults: [] },
      { score: 92, pointsEarned: 9.2, pointsPossible: 10, grade: "A", passed: true, questionResults: [] },
    ];
    const stats = calculateQuizStatistics(results);
    expect(stats.gradeDistribution).toEqual({ A: 2, B: 1 });
  });

  it("pass rate calculation", () => {
    const results = [
      { score: 80, pointsEarned: 8, pointsPossible: 10, grade: null, passed: true, questionResults: [] },
      { score: 40, pointsEarned: 4, pointsPossible: 10, grade: null, passed: false, questionResults: [] },
      { score: 90, pointsEarned: 9, pointsPossible: 10, grade: null, passed: true, questionResults: [] },
      { score: 30, pointsEarned: 3, pointsPossible: 10, grade: null, passed: false, questionResults: [] },
    ];
    const stats = calculateQuizStatistics(results);
    expect(stats.passRate).toBe(50);
  });
});
