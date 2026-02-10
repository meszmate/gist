import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { eq } from "drizzle-orm";
import {
  users,
  folders,
  studyMaterials,
  flashcards,
  quizQuestions,
  lessons,
  lessonSteps,
} from "../lib/db/schema";
import type { StepContent, StepAnswerData } from "../lib/types/lesson";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL environment variable is required");
  process.exit(1);
}

const client = postgres(DATABASE_URL);
const db = drizzle(client);

async function seed() {
  console.log("Seeding database...\n");

  // 1. Create or find test user
  console.log("1. Creating test user...");
  const existingUsers = await db
    .select()
    .from(users)
    .where(eq(users.email, "seed@example.com"));

  let user;
  if (existingUsers.length > 0) {
    user = existingUsers[0];
    console.log("   Found existing user:", user.id);
  } else {
    const [newUser] = await db
      .insert(users)
      .values({
        email: "seed@example.com",
        name: "Seed User",
      })
      .returning();
    user = newUser;
    console.log("   Created user:", user.id);
  }

  // 2. Create sample folder
  console.log("2. Creating sample folder...");
  const [folder] = await db
    .insert(folders)
    .values({
      userId: user.id,
      name: "Sample Folder",
      color: "#6366f1",
    })
    .returning();
  console.log("   Created folder:", folder.id);

  // 3. Create study material (resource)
  console.log("3. Creating study material...");
  const [resource] = await db
    .insert(studyMaterials)
    .values({
      userId: user.id,
      folderId: folder.id,
      title: "Introduction to TypeScript",
      description:
        "A comprehensive guide to TypeScript fundamentals including types, interfaces, and generics.",
      sourceContent:
        "TypeScript is a typed superset of JavaScript that compiles to plain JavaScript. It adds optional static typing and class-based object-oriented programming to the language. TypeScript supports interfaces, enums, generics, and more advanced type features.",
      summary:
        "TypeScript extends JavaScript with static types, helping catch errors at compile time. Key features include interfaces for defining contracts, generics for reusable components, and union/intersection types for flexible type compositions.",
    })
    .returning();
  console.log("   Created resource:", resource.id);

  // 4. Create flashcards
  console.log("4. Creating flashcards...");
  const flashcardData = [
    {
      front: "What is TypeScript?",
      back: "TypeScript is a typed superset of JavaScript that compiles to plain JavaScript.",
    },
    {
      front: "What is an interface in TypeScript?",
      back: "An interface defines a contract for the shape of an object, specifying the types of its properties and methods.",
    },
    {
      front: "What are generics in TypeScript?",
      back: "Generics allow creating reusable components that work with a variety of types rather than a single one.",
    },
    {
      front: "What is a union type?",
      back: "A union type allows a value to be one of several types, written using the pipe (|) operator, e.g. string | number.",
    },
    {
      front: "What is type narrowing?",
      back: "Type narrowing is the process of refining a type within a conditional block using type guards like typeof, instanceof, or custom predicates.",
    },
  ];

  await db.insert(flashcards).values(
    flashcardData.map((fc) => ({
      studyMaterialId: resource.id,
      front: fc.front,
      back: fc.back,
    }))
  );
  console.log(`   Created ${flashcardData.length} flashcards`);

  // 5. Create quiz questions
  console.log("5. Creating quiz questions...");
  const quizData = [
    {
      question: "Which of the following best describes TypeScript?",
      questionType: "multiple_choice",
      questionConfig: {
        options: [
          { id: "a", text: "A completely new programming language" },
          { id: "b", text: "A typed superset of JavaScript" },
          { id: "c", text: "A JavaScript framework" },
          { id: "d", text: "A CSS preprocessor" },
        ],
      },
      correctAnswerData: { correctOptionId: "b" },
      options: ["A completely new programming language", "A typed superset of JavaScript", "A JavaScript framework", "A CSS preprocessor"],
      correctAnswer: 1,
      explanation: "TypeScript is a typed superset of JavaScript that compiles to plain JavaScript.",
      order: 0,
    },
    {
      question: "TypeScript code can run directly in the browser without compilation.",
      questionType: "true_false",
      questionConfig: {},
      correctAnswerData: { correctValue: false },
      options: null,
      correctAnswer: null,
      explanation: "TypeScript must be compiled to JavaScript before it can run in a browser.",
      order: 1,
    },
    {
      question: "What keyword is used to define an interface in TypeScript?",
      questionType: "text_input",
      questionConfig: {
        acceptedAnswers: ["interface"],
        caseSensitive: false,
      },
      correctAnswerData: { acceptedAnswers: ["interface"] },
      options: null,
      correctAnswer: null,
      explanation: "The 'interface' keyword is used to define interfaces in TypeScript.",
      order: 2,
    },
  ];

  await db.insert(quizQuestions).values(
    quizData.map((q) => ({
      studyMaterialId: resource.id,
      question: q.question,
      questionType: q.questionType,
      questionConfig: q.questionConfig,
      correctAnswerData: q.correctAnswerData,
      options: q.options,
      correctAnswer: q.correctAnswer,
      explanation: q.explanation,
      order: q.order,
    }))
  );
  console.log(`   Created ${quizData.length} quiz questions`);

  // 6. Create lesson
  console.log("6. Creating lesson...");
  const [lesson] = await db
    .insert(lessons)
    .values({
      studyMaterialId: resource.id,
      title: "TypeScript Basics",
      description: "Learn the fundamental concepts of TypeScript including types, interfaces, and basic syntax.",
      order: 0,
      status: "published",
      isPublic: false,
      settings: {
        allowSkip: true,
        showProgressBar: true,
        transitionStyle: "slide",
      },
    })
    .returning();
  console.log("   Created lesson:", lesson.id);

  // 7. Create lesson steps
  console.log("7. Creating lesson steps...");
  const stepsData: {
    order: number;
    stepType: string;
    content: StepContent;
    answerData: StepAnswerData;
    explanation: string | null;
    hint: string | null;
  }[] = [
    {
      order: 0,
      stepType: "explanation",
      content: {
        type: "explanation",
        markdown:
          "# Welcome to TypeScript\n\nTypeScript is a **typed superset** of JavaScript developed by Microsoft. It adds optional static typing, classes, and interfaces to JavaScript.\n\n## Why TypeScript?\n\n- Catch errors at compile time instead of runtime\n- Better IDE support with autocompletion\n- Easier to refactor large codebases\n- Self-documenting code through types",
      },
      answerData: null,
      explanation: null,
      hint: null,
    },
    {
      order: 1,
      stepType: "concept",
      content: {
        type: "concept",
        title: "Static Typing",
        description:
          "TypeScript allows you to explicitly declare types for variables, function parameters, and return values. This helps catch type-related errors during development rather than at runtime.",
        highlightStyle: "info",
      },
      answerData: null,
      explanation: null,
      hint: null,
    },
    {
      order: 2,
      stepType: "multiple_choice",
      content: {
        type: "multiple_choice",
        question: "What is the main benefit of TypeScript over JavaScript?",
        options: [
          { id: "a", text: "It runs faster in the browser" },
          { id: "b", text: "It catches type errors at compile time" },
          { id: "c", text: "It has a smaller file size" },
          { id: "d", text: "It doesn't need a runtime" },
        ],
      },
      answerData: { correctOptionId: "b" },
      explanation: "TypeScript's primary benefit is catching type-related errors during compilation, before the code runs.",
      hint: "Think about what 'typed superset' means for development.",
    },
    {
      order: 3,
      stepType: "true_false",
      content: {
        type: "true_false",
        statement: "TypeScript interfaces can only describe object shapes, not function signatures.",
        trueExplanation: "This is incorrect - interfaces can describe both.",
        falseExplanation: "Correct! Interfaces can describe object shapes, function signatures, and even classes.",
      },
      answerData: { correctValue: false },
      explanation: "TypeScript interfaces are versatile and can describe object shapes, function signatures, class contracts, and more.",
      hint: "Consider all the different things interfaces can define.",
    },
  ];

  await db.insert(lessonSteps).values(
    stepsData.map((step) => ({
      lessonId: lesson.id,
      order: step.order,
      stepType: step.stepType,
      content: step.content,
      answerData: step.answerData,
      explanation: step.explanation,
      hint: step.hint,
    }))
  );
  console.log(`   Created ${stepsData.length} lesson steps`);

  console.log("\nSeeding complete!");
  console.log(`\nSummary:`);
  console.log(`  User:        ${user.email} (${user.id})`);
  console.log(`  Folder:      ${folder.name}`);
  console.log(`  Resource:    ${resource.title}`);
  console.log(`  Flashcards:  ${flashcardData.length}`);
  console.log(`  Questions:   ${quizData.length}`);
  console.log(`  Lesson:      ${lesson.title} (${stepsData.length} steps)`);
}

seed()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exit(1);
  });
