import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  boolean,
  integer,
  decimal,
  jsonb,
  primaryKey,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import type {
  QuestionConfig,
  CorrectAnswerData,
  AnswersData,
  QuestionResult,
  LetterGradeThreshold,
  QuestionTypeSchema,
} from "@/lib/types/quiz";

// ============== USERS ==============
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  name: varchar("name", { length: 255 }),
  emailVerified: timestamp("email_verified"),
  image: text("image"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const usersRelations = relations(users, ({ many }) => ({
  accounts: many(accounts),
  sessions: many(sessions),
  studyMaterials: many(studyMaterials),
  folders: many(folders),
  contacts: many(contacts),
  contactGroups: many(contactGroups),
}));

// ============== AUTH (NextAuth.js) ==============
export const accounts = pgTable(
  "accounts",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: varchar("type", { length: 255 }).notNull(),
    provider: varchar("provider", { length: 255 }).notNull(),
    providerAccountId: varchar("provider_account_id", { length: 255 }).notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: varchar("token_type", { length: 255 }),
    scope: varchar("scope", { length: 255 }),
    id_token: text("id_token"),
    session_state: varchar("session_state", { length: 255 }),
  },
  (account) => [
    primaryKey({ columns: [account.provider, account.providerAccountId] }),
  ]
);

export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, {
    fields: [accounts.userId],
    references: [users.id],
  }),
}));

export const sessions = pgTable("sessions", {
  sessionToken: varchar("session_token", { length: 255 }).primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires").notNull(),
});

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}));

export const verificationTokens = pgTable(
  "verification_tokens",
  {
    identifier: varchar("identifier", { length: 255 }).notNull(),
    token: varchar("token", { length: 255 }).notNull(),
    expires: timestamp("expires").notNull(),
  },
  (vt) => [primaryKey({ columns: [vt.identifier, vt.token] })]
);

// ============== FOLDERS ==============
export const folders = pgTable("folders", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  color: varchar("color", { length: 20 }),
  parentId: uuid("parent_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const foldersRelations = relations(folders, ({ one, many }) => ({
  user: one(users, {
    fields: [folders.userId],
    references: [users.id],
  }),
  parent: one(folders, {
    fields: [folders.parentId],
    references: [folders.id],
    relationName: "folderHierarchy",
  }),
  children: many(folders, { relationName: "folderHierarchy" }),
  studyMaterials: many(studyMaterials),
}));

// ============== STUDY MATERIALS ==============
export const studyMaterials = pgTable(
  "study_materials",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    folderId: uuid("folder_id").references(() => folders.id, {
      onDelete: "set null",
    }),
    title: varchar("title", { length: 255 }).notNull(),
    description: text("description"),
    sourceContent: text("source_content"),
    summary: text("summary"),
    difficulty: varchar("difficulty", { length: 50 }),
    shareToken: varchar("share_token", { length: 64 }).unique(),
    isPublic: boolean("is_public").default(false),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("study_materials_user_idx").on(table.userId),
    index("study_materials_folder_idx").on(table.folderId),
    index("study_materials_share_token_idx").on(table.shareToken),
  ]
);

export const studyMaterialsRelations = relations(
  studyMaterials,
  ({ one, many }) => ({
    user: one(users, {
      fields: [studyMaterials.userId],
      references: [users.id],
    }),
    folder: one(folders, {
      fields: [studyMaterials.folderId],
      references: [folders.id],
    }),
    flashcards: many(flashcards),
    quizQuestions: many(quizQuestions),
    quizSettings: one(quizSettings),
    gradingConfig: one(gradingConfigs),
    quizAttempts: many(quizAttempts),
    resourceAccessLogs: many(resourceAccessLogs),
  })
);

// ============== FLASHCARDS ==============
export const flashcards = pgTable(
  "flashcards",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    studyMaterialId: uuid("study_material_id")
      .notNull()
      .references(() => studyMaterials.id, { onDelete: "cascade" }),
    front: text("front").notNull(),
    back: text("back").notNull(),
    // SRS fields
    interval: integer("interval").default(0),
    repetitions: integer("repetitions").default(0),
    easeFactor: decimal("ease_factor", { precision: 4, scale: 2 }).default(
      "2.50"
    ),
    nextReview: timestamp("next_review").defaultNow(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("flashcards_material_idx").on(table.studyMaterialId),
    index("flashcards_next_review_idx").on(table.nextReview),
  ]
);

export const flashcardsRelations = relations(flashcards, ({ one }) => ({
  studyMaterial: one(studyMaterials, {
    fields: [flashcards.studyMaterialId],
    references: [studyMaterials.id],
  }),
}));

// ============== QUESTION TYPES REGISTRY ==============
export const questionTypes = pgTable(
  "question_types",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: varchar("slug", { length: 50 }).notNull().unique(),
    name: varchar("name", { length: 100 }).notNull(),
    description: text("description"),
    configSchema: jsonb("config_schema").notNull().$type<Record<string, QuestionTypeSchema>>(),
    answerSchema: jsonb("answer_schema").notNull().$type<Record<string, QuestionTypeSchema>>(),
    isSystem: boolean("is_system").default(false),
    isActive: boolean("is_active").default(true),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [index("question_types_slug_idx").on(table.slug)]
);

// ============== QUIZ QUESTIONS ==============
export const quizQuestions = pgTable(
  "quiz_questions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    studyMaterialId: uuid("study_material_id")
      .notNull()
      .references(() => studyMaterials.id, { onDelete: "cascade" }),
    question: text("question").notNull(),
    // New question type system
    questionType: varchar("question_type", { length: 50 }).default("multiple_choice").notNull(),
    questionConfig: jsonb("question_config").default({}).$type<QuestionConfig>(),
    correctAnswerData: jsonb("correct_answer_data").$type<CorrectAnswerData>(),
    points: decimal("points", { precision: 5, scale: 2 }).default("1.0"),
    order: integer("order"),
    // Legacy fields for backward compatibility
    options: jsonb("options").$type<string[]>(),
    correctAnswer: integer("correct_answer"),
    explanation: text("explanation"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    index("quiz_questions_material_idx").on(table.studyMaterialId),
    index("quiz_questions_type_idx").on(table.questionType),
  ]
);

export const quizQuestionsRelations = relations(quizQuestions, ({ one }) => ({
  studyMaterial: one(studyMaterials, {
    fields: [quizQuestions.studyMaterialId],
    references: [studyMaterials.id],
  }),
}));

// ============== QUIZ SETTINGS ==============
export const quizSettings = pgTable("quiz_settings", {
  id: uuid("id").primaryKey().defaultRandom(),
  studyMaterialId: uuid("study_material_id")
    .notNull()
    .references(() => studyMaterials.id, { onDelete: "cascade" })
    .unique(),
  timeLimitSeconds: integer("time_limit_seconds"),
  requireSignin: boolean("require_signin").default(false),
  allowedEmails: text("allowed_emails").array(),
  maxAttempts: integer("max_attempts"),
  shuffleQuestions: boolean("shuffle_questions").default(true),
  showCorrectAnswers: boolean("show_correct_answers").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const quizSettingsRelations = relations(quizSettings, ({ one }) => ({
  studyMaterial: one(studyMaterials, {
    fields: [quizSettings.studyMaterialId],
    references: [studyMaterials.id],
  }),
}));

// ============== GRADING CONFIGS ==============
export const gradingConfigs = pgTable("grading_configs", {
  id: uuid("id").primaryKey().defaultRandom(),
  studyMaterialId: uuid("study_material_id")
    .notNull()
    .references(() => studyMaterials.id, { onDelete: "cascade" })
    .unique(),
  gradingType: varchar("grading_type", { length: 20 }).default("percentage"), // percentage, letter, pass_fail, points
  passThreshold: decimal("pass_threshold", { precision: 5, scale: 2 }).default("60.0"),
  letterGrades: jsonb("letter_grades").$type<LetterGradeThreshold[]>(),
  showGradeOnCompletion: boolean("show_grade_on_completion").default(true),
  showPointValues: boolean("show_point_values").default(false),
  partialCreditEnabled: boolean("partial_credit_enabled").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const gradingConfigsRelations = relations(gradingConfigs, ({ one }) => ({
  studyMaterial: one(studyMaterials, {
    fields: [gradingConfigs.studyMaterialId],
    references: [studyMaterials.id],
  }),
}));

// ============== QUIZ ATTEMPTS ==============
export const quizAttempts = pgTable(
  "quiz_attempts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    studyMaterialId: uuid("study_material_id")
      .notNull()
      .references(() => studyMaterials.id, { onDelete: "cascade" }),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    guestEmail: varchar("guest_email", { length: 255 }),
    participantName: varchar("participant_name", { length: 255 }),
    startedAt: timestamp("started_at").defaultNow().notNull(),
    completedAt: timestamp("completed_at"),
    score: decimal("score", { precision: 5, scale: 2 }),
    // Legacy answer storage
    answers: jsonb("answers").$type<Record<string, number>>(),
    // New flexible answer storage
    answersData: jsonb("answers_data").$type<AnswersData>(),
    pointsEarned: decimal("points_earned", { precision: 7, scale: 2 }),
    pointsPossible: decimal("points_possible", { precision: 7, scale: 2 }),
    grade: varchar("grade", { length: 10 }),
    questionResults: jsonb("question_results").$type<QuestionResult[]>(),
    timeSpentSeconds: integer("time_spent_seconds"),
    attemptNumber: integer("attempt_number").default(1),
  },
  (table) => [
    index("quiz_attempts_material_idx").on(table.studyMaterialId),
    index("quiz_attempts_user_idx").on(table.userId),
    index("quiz_attempts_completed_idx").on(table.completedAt),
  ]
);

export const quizAttemptsRelations = relations(quizAttempts, ({ one }) => ({
  studyMaterial: one(studyMaterials, {
    fields: [quizAttempts.studyMaterialId],
    references: [studyMaterials.id],
  }),
  user: one(users, {
    fields: [quizAttempts.userId],
    references: [users.id],
  }),
}));

// ============== CONTACTS ==============
export const contacts = pgTable(
  "contacts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    teacherId: uuid("teacher_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    email: varchar("email", { length: 255 }).notNull(),
    name: varchar("name", { length: 255 }),
    groupId: uuid("group_id").references(() => contactGroups.id, {
      onDelete: "set null",
    }),
    hasAccount: boolean("has_account").default(false),
    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("contacts_teacher_idx").on(table.teacherId),
    index("contacts_email_idx").on(table.email),
  ]
);

export const contactsRelations = relations(contacts, ({ one }) => ({
  teacher: one(users, {
    fields: [contacts.teacherId],
    references: [users.id],
  }),
  group: one(contactGroups, {
    fields: [contacts.groupId],
    references: [contactGroups.id],
  }),
}));

// ============== CONTACT GROUPS ==============
export const contactGroups = pgTable(
  "contact_groups",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    teacherId: uuid("teacher_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 100 }).notNull(),
    color: varchar("color", { length: 20 }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("contact_groups_teacher_idx").on(table.teacherId)]
);

export const contactGroupsRelations = relations(
  contactGroups,
  ({ one, many }) => ({
    teacher: one(users, {
      fields: [contactGroups.teacherId],
      references: [users.id],
    }),
    contacts: many(contacts),
  })
);

// ============== RESOURCE ACCESS LOG ==============
export const resourceAccessLogs = pgTable(
  "resource_access_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    resourceId: uuid("resource_id")
      .notNull()
      .references(() => studyMaterials.id, { onDelete: "cascade" }),
    email: varchar("email", { length: 255 }),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    accessType: varchar("access_type", { length: 50 }).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("access_logs_resource_idx").on(table.resourceId),
    index("access_logs_email_idx").on(table.email),
  ]
);

export const resourceAccessLogsRelations = relations(
  resourceAccessLogs,
  ({ one }) => ({
    resource: one(studyMaterials, {
      fields: [resourceAccessLogs.resourceId],
      references: [studyMaterials.id],
    }),
    user: one(users, {
      fields: [resourceAccessLogs.userId],
      references: [users.id],
    }),
  })
);

// ============== TYPES ==============
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type StudyMaterial = typeof studyMaterials.$inferSelect;
export type NewStudyMaterial = typeof studyMaterials.$inferInsert;

export type Flashcard = typeof flashcards.$inferSelect;
export type NewFlashcard = typeof flashcards.$inferInsert;

export type QuizQuestion = typeof quizQuestions.$inferSelect;
export type NewQuizQuestion = typeof quizQuestions.$inferInsert;

export type QuizSettings = typeof quizSettings.$inferSelect;
export type NewQuizSettings = typeof quizSettings.$inferInsert;

export type QuizAttempt = typeof quizAttempts.$inferSelect;
export type NewQuizAttempt = typeof quizAttempts.$inferInsert;

export type Contact = typeof contacts.$inferSelect;
export type NewContact = typeof contacts.$inferInsert;

export type ContactGroup = typeof contactGroups.$inferSelect;
export type NewContactGroup = typeof contactGroups.$inferInsert;

export type Folder = typeof folders.$inferSelect;
export type NewFolder = typeof folders.$inferInsert;

export type QuestionType = typeof questionTypes.$inferSelect;
export type NewQuestionType = typeof questionTypes.$inferInsert;

export type GradingConfig = typeof gradingConfigs.$inferSelect;
export type NewGradingConfig = typeof gradingConfigs.$inferInsert;
