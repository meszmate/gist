export interface FlashCard {
    question: string;
    answer: string;
}

export interface QuizQuestion {
    question: string;
    options: string[];
    correct: string;
}

export interface Data {
    id: string;
    title: string;
    summary: string;
    flashcards: FlashCard[];
    quiz_questions: QuizQuestion[];
}
