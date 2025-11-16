import * as React from 'react';
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
} from '@/components/ui/card';
import {
    Tabs,
    TabsList,
    TabsTrigger,
    AnimatedTabsContent,
} from '@/components/ui/animated-tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { RotateCw, CheckCircle, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useData } from '@/lib/dataContext';
import { useParams } from 'react-router-dom';
import Animate from './Animate';

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

export function DataViewer() {
    const { data: allData } = useData();
    const { id } = useParams();

    const data = React.useMemo(() => allData.find((x) => x.id === id), [allData, id]);

    const [flipped, setFlipped] = React.useState<number | null>(null);
    const [quizAnswers, setQuizAnswers] = React.useState<Record<number, string>>({});
    const [showResults, setShowResults] = React.useState(false);

    const score = React.useMemo(() => {
        if (!showResults || !data) return 0;
        return data.quiz_questions.reduce((acc, q, i) => {
            return quizAnswers[i] === q.correct ? acc + 1 : acc;
        }, 0);
    }, [quizAnswers, showResults, data]);

    const resetQuiz = () => {
        setQuizAnswers({});
        setShowResults(false);
    };

    if (!data) return null;

    return (
        <Animate>
            <div className="w-full max-w-7xl mx-auto p-4 space-y-6 my-10">
                <CardHeader className="text-center pb-4">
                    <CardTitle className="text-5xl mb-4 font-bold">{data.title}</CardTitle>
                    <CardDescription className="text-lg">
                        Your generated summary, flashcards, and quiz
                    </CardDescription>
                </CardHeader>

                <Tabs defaultValue="summary" className="w-full">
                    <TabsList className="grid w-full grid-cols-3 rounded-t-lg mb-8">
                        <TabsTrigger value="summary">Summary</TabsTrigger>
                        <TabsTrigger value="flashcards">
                            Flashcards <Badge className="ml-2">{data.flashcards.length}</Badge>
                        </TabsTrigger>
                        <TabsTrigger value="quiz">
                            Quiz <Badge className="ml-2">{data.quiz_questions.length}</Badge>
                        </TabsTrigger>
                    </TabsList>

                    <AnimatedTabsContent value="summary">
                        <CardContent className="prose prose-sm max-w-none dark:prose-invert">
                            {data.summary.split('\n\n').map((p, i) => (
                                <p key={i} className="mb-4 text-muted-foreground leading-relaxed">
                                    {p}
                                </p>
                            ))}
                        </CardContent>
                    </AnimatedTabsContent>

                    <AnimatedTabsContent value="flashcards">
                        <CardContent className="p-0">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
                                {data.flashcards.map((card, i) => (
                                    <div
                                        key={i}
                                        onClick={() => setFlipped(flipped === i ? null : i)}
                                        className="relative h-48 cursor-pointer preserve-3d transition-transform duration-600"
                                        style={{
                                            transform: flipped === i ? 'rotateY(180deg)' : 'rotateY(0deg)',
                                            transformStyle: 'preserve-3d',
                                        }}
                                    >
                                        {/* Front */}
                                        <Card className="absolute inset-0 backface-hidden flex items-center justify-center p-6 text-center bg-card border shadow-sm hover:shadow-md transition-shadow">
                                            <p className="text-lg font-medium">{card.question}</p>
                                        </Card>
                                        {/* Back */}
                                        <Card className="absolute inset-0 backface-hidden rotate-y-180 flex items-center justify-center p-6 text-center bg-primary/5 border shadow-sm">
                                            <p className="text-lg font-medium text-primary">{card.answer}</p>
                                        </Card>
                                    </div>
                                ))}
                            </div>
                            <p className="text-center text-sm text-muted-foreground mt-4 px-4">
                                Click a card to flip
                            </p>
                        </CardContent>
                    </AnimatedTabsContent>

                    <AnimatedTabsContent value="quiz">
                        <CardContent>
                            {!showResults ? (
                                <div className="space-y-6">
                                    {data.quiz_questions.map((q, i) => (
                                        <div key={i} className="space-y-3">
                                            <p className="font-medium flex items-center gap-2">
                                                <span className="text-primary">{i + 1}.</span>
                                                {q.question}
                                            </p>
                                            <RadioGroup
                                                value={quizAnswers[i] || ''}
                                                onValueChange={(val) => setQuizAnswers((p) => ({ ...p, [i]: val }))}
                                            >
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                                    {q.options.map((opt) => (
                                                        <Label
                                                            key={opt}
                                                            htmlFor={`q${i}-${opt}`}
                                                            className={cn(
                                                                'flex items-center space-x-2 p-3 rounded-lg border cursor-pointer transition-colors',
                                                                quizAnswers[i] === opt
                                                                    ? 'border-primary bg-primary/5'
                                                                    : 'border-input hover:bg-accent'
                                                            )}
                                                        >
                                                            <RadioGroupItem value={opt} id={`q${i}-${opt}`} />
                                                            <span>{opt}</span>
                                                        </Label>
                                                    ))}
                                                </div>
                                            </RadioGroup>
                                        </div>
                                    ))}

                                    <Separator className="my-6" />
                                    <div className="flex justify-between items-center">
                                        <p className="text-sm text-muted-foreground">
                                            {Object.keys(quizAnswers).length} / {data.quiz_questions.length} answered
                                        </p>
                                        <Button
                                            onClick={() => setShowResults(true)}
                                            disabled={Object.keys(quizAnswers).length !== data.quiz_questions.length}
                                        >
                                            Submit Quiz
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    <div className="text-center py-8">
                                        <div className="text-6xl font-bold text-primary mb-2">
                                            {score} / {data.quiz_questions.length}
                                        </div>
                                        <p className="text-lg text-muted-foreground">
                                            {score === data.quiz_questions.length
                                                ? 'Perfect score!'
                                                : score >= data.quiz_questions.length * 0.7
                                                    ? 'Great job!'
                                                    : 'Keep studying!'}
                                        </p>
                                    </div>

                                    <div className="space-y-4">
                                        {data.quiz_questions.map((q, i) => {
                                            const userAnswer = quizAnswers[i];
                                            const isCorrect = userAnswer === q.correct;
                                            return (
                                                <Card
                                                    key={i}
                                                    className={cn('p-4', isCorrect ? 'border-green-500' : 'border-red-500')}
                                                >
                                                    <div className="flex items-start gap-3">
                                                        {isCorrect ? (
                                                            <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                                                        ) : (
                                                            <XCircle className="h-5 w-5 text-red-600 mt-0.5" />
                                                        )}
                                                        <div className="flex-1">
                                                            <p className="font-medium">{q.question}</p>
                                                            <p className="text-sm mt-1">
                                                                <span className="text-muted-foreground">Your answer:</span>{' '}
                                                                <span className={cn(isCorrect ? 'text-green-600' : 'text-red-600')}>
                                                                    {userAnswer || '—'}
                                                                </span>
                                                            </p>
                                                            {!isCorrect && (
                                                                <p className="text-sm text-green-600">Correct: {q.correct}</p>
                                                            )}
                                                        </div>
                                                    </div>
                                                </Card>
                                            );
                                        })}
                                    </div>

                                    <Button onClick={resetQuiz} className="w-full" size="lg">
                                        <RotateCw className="mr-2 h-4 w-4" />
                                        Try Again
                                    </Button>
                                </div>
                            )}
                        </CardContent>
                    </AnimatedTabsContent>
                </Tabs>
            </div>
        </Animate>
    );
}
