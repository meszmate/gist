import { z } from "zod";

export const DataSchema = z.object({
    id: z.string(),
    title: z.string(),
    summary: z.string(),
    flashcards: z.array(
        z.object({
            question: z.string(),
            answer: z.string(),
        })
    ),
    quiz_questions: z.array(
        z.object({
            question: z.string(),
            options: z.array(z.string()),
            correct: z.string(),
        })
    ),
});

export const DataArraySchema = z.array(DataSchema);
