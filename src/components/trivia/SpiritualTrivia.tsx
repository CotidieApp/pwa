'use client';

import React, { useEffect, useMemo, useState } from 'react';
import * as Icon from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import {
  spiritualTriviaQuestions,
  triviaCategories,
  triviaDifficulties,
  type TriviaCategoryId,
  type TriviaDifficultyId,
  type TriviaQuestion,
} from '@/lib/trivia-questions';

type CategorySelection = 'todas' | TriviaCategoryId;
type DifficultySelection = 'todas' | TriviaDifficultyId;
type SessionLength = 5 | 10 | 15 | 20;

const sessionLengthOptions: readonly SessionLength[] = [5, 10, 15, 20];

interface PreparedOption {
  text: string;
  isCorrect: boolean;
}

interface PreparedQuestion {
  question: TriviaQuestion;
  options: PreparedOption[];
}

interface AnswerRecord {
  question: TriviaQuestion;
  selectedAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
}

const shuffle = <T,>(items: readonly T[]): T[] => {
  const shuffled = [...items];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const target = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[target]] = [shuffled[target], shuffled[index]];
  }
  return shuffled;
};

const prepareQuestion = (question: TriviaQuestion): PreparedQuestion => ({
  question,
  options: shuffle(
    question.options.map((text, index) => ({
      text,
      isCorrect: index === question.correctIndex,
    }))
  ),
});

const questionMatchesFilters = (
  question: TriviaQuestion,
  category: CategorySelection,
  difficulty: DifficultySelection
) =>
  (category === 'todas' || question.category === category) &&
  (difficulty === 'todas' || question.difficulty === difficulty);

const buildSession = (
  category: CategorySelection,
  difficulty: DifficultySelection,
  length: SessionLength
): PreparedQuestion[] => {
  const eligibleQuestions = spiritualTriviaQuestions.filter((question) =>
    questionMatchesFilters(question, category, difficulty)
  );
  const targetLength = Math.min(length, eligibleQuestions.length);

  if (category !== 'todas') {
    return shuffle(eligibleQuestions)
      .slice(0, targetLength)
      .map(prepareQuestion);
  }

  const buckets = new Map(
    triviaCategories.map((entry) => [
      entry.id,
      shuffle(eligibleQuestions.filter((question) => question.category === entry.id)),
    ])
  );
  const selected: TriviaQuestion[] = [];

  while (selected.length < targetLength) {
    let addedQuestion = false;
    for (const categoryEntry of shuffle(triviaCategories)) {
      const next = buckets.get(categoryEntry.id)?.pop();
      if (next) {
        selected.push(next);
        addedQuestion = true;
      }
      if (selected.length === targetLength) break;
    }
    if (!addedQuestion) break;
  }

  return selected.map(prepareQuestion);
};

const categoryLabel = (category: TriviaCategoryId) =>
  triviaCategories.find((entry) => entry.id === category)?.label ?? category;

const difficultyLabel = (difficulty: TriviaDifficultyId) =>
  triviaDifficulties.find((entry) => entry.id === difficulty)?.label ?? difficulty;

export default function SpiritualTrivia() {
  const [category, setCategory] = useState<CategorySelection>('todas');
  const [difficulty, setDifficulty] = useState<DifficultySelection>('todas');
  const [sessionLength, setSessionLength] = useState<SessionLength>(10);
  const [questions, setQuestions] = useState<PreparedQuestion[]>([]);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [selectedOptionIndex, setSelectedOptionIndex] = useState<number | null>(null);
  const [answers, setAnswers] = useState<AnswerRecord[]>([]);
  const [finished, setFinished] = useState(false);

  const current = questions[questionIndex];
  const currentAnswered = selectedOptionIndex !== null;
  const correctCount = answers.filter((answer) => answer.isCorrect).length;
  const incorrectAnswers = answers.filter((answer) => !answer.isCorrect);
  const eligibleQuestionCount = useMemo(
    () => spiritualTriviaQuestions.filter((question) =>
      questionMatchesFilters(question, category, difficulty)
    ).length,
    [category, difficulty]
  );
  const availableSessionLengths = useMemo(
    () => sessionLengthOptions.filter((length) => length <= eligibleQuestionCount),
    [eligibleQuestionCount]
  );

  useEffect(() => {
    if (availableSessionLengths.includes(sessionLength)) return;
    setSessionLength(availableSessionLengths[availableSessionLengths.length - 1] ?? 5);
  }, [availableSessionLengths, sessionLength]);

  const categoryResults = useMemo(
    () =>
      triviaCategories
        .map((entry) => {
          const categoryAnswers = answers.filter((answer) => answer.question.category === entry.id);
          return {
            ...entry,
            total: categoryAnswers.length,
            correct: categoryAnswers.filter((answer) => answer.isCorrect).length,
          };
        })
        .filter((entry) => entry.total > 0),
    [answers]
  );

  const startSession = () => {
    setQuestions(buildSession(category, difficulty, sessionLength));
    setQuestionIndex(0);
    setSelectedOptionIndex(null);
    setAnswers([]);
    setFinished(false);
  };

  const resetSession = () => {
    setQuestions([]);
    setQuestionIndex(0);
    setSelectedOptionIndex(null);
    setAnswers([]);
    setFinished(false);
  };

  const chooseOption = (optionIndex: number) => {
    if (!current || currentAnswered) return;

    const selected = current.options[optionIndex];
    const correct = current.options.find((option) => option.isCorrect);
    if (!selected || !correct) return;

    setSelectedOptionIndex(optionIndex);
    setAnswers((previous) => [
      ...previous,
      {
        question: current.question,
        selectedAnswer: selected.text,
        correctAnswer: correct.text,
        isCorrect: selected.isCorrect,
      },
    ]);
  };

  const advance = () => {
    if (!currentAnswered) return;
    if (questionIndex === questions.length - 1) {
      setFinished(true);
      return;
    }
    setQuestionIndex((currentIndex) => currentIndex + 1);
    setSelectedOptionIndex(null);
  };

  if (questions.length === 0) {
    return (
      <Card>
        <CardHeader className="space-y-2">
          <div className="flex items-center gap-3">
            <Icon.BookOpenCheck className="size-5 shrink-0 text-primary" />
            <CardTitle className="font-headline text-base">Elige un recorrido</CardTitle>
          </div>
          <CardDescription>
            Preguntas breves para conocer mejor la fe. Cada respuesta incluye una explicación y su fuente.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <label htmlFor="trivia-category" className="text-sm font-medium">
              Tema
            </label>
            <Select value={category} onValueChange={(value) => setCategory(value as CategorySelection)}>
              <SelectTrigger id="trivia-category" className="h-12">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas" className="min-h-11">Todos los temas</SelectItem>
                {triviaCategories.map((entry) => (
                  <SelectItem key={entry.id} value={entry.id} className="min-h-11">
                    {entry.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs leading-relaxed text-muted-foreground">
              {category === 'todas'
                ? 'La sesión reparte las preguntas entre los cuatro temas.'
                : triviaCategories.find((entry) => entry.id === category)?.description}
            </p>
          </div>

          <div className="space-y-2">
            <label htmlFor="trivia-difficulty" className="text-sm font-medium">
              Dificultad
            </label>
            <Select
              value={difficulty}
              onValueChange={(value) => setDifficulty(value as DifficultySelection)}
            >
              <SelectTrigger id="trivia-difficulty" className="h-12">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas" className="min-h-11">Todas las dificultades</SelectItem>
                {triviaDifficulties.map((entry) => (
                  <SelectItem key={entry.id} value={entry.id} className="min-h-11">
                    {entry.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs leading-relaxed text-muted-foreground">
              {difficulty === 'todas'
                ? 'La sesión combina distintos niveles de profundidad.'
                : triviaDifficulties.find((entry) => entry.id === difficulty)?.description}
            </p>
          </div>

          <div className="space-y-2">
            <label htmlFor="trivia-length" className="text-sm font-medium">
              Cantidad de preguntas
            </label>
            <Select
              value={String(sessionLength)}
              onValueChange={(value) => setSessionLength(Number(value) as SessionLength)}
            >
              <SelectTrigger id="trivia-length" className="h-12">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableSessionLengths.map((length) => (
                  <SelectItem key={length} value={String(length)} className="min-h-11">
                    {length} preguntas
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {eligibleQuestionCount} disponibles con estos filtros.
            </p>
          </div>

          <div className="flex items-center justify-between gap-3 border-t pt-4 text-xs text-muted-foreground">
            <span>Biblioteca local</span>
            <span>{spiritualTriviaQuestions.length} preguntas</span>
          </div>

          <Button size="lg" className="w-full" onClick={startSession}>
            <Icon.Play />
            Comenzar
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (finished) {
    const percentage = Math.round((correctCount / answers.length) * 100);
    const closingMessage =
      percentage >= 80
        ? 'Muy buen recorrido. Las explicaciones pueden ayudarte a fijar también los detalles.'
        : percentage >= 50
          ? 'Buen punto de partida. Revisa con calma las respuestas que quedaron pendientes.'
          : 'Esta sesión ya señaló buenos temas para volver a leer y profundizar.';

    return (
      <div className="space-y-4">
        <Card>
          <CardHeader className="items-center text-center">
            <Icon.CircleCheckBig className="mb-2 size-9 text-primary" />
            <CardTitle className="font-headline text-xl">Recorrido completado</CardTitle>
            <CardDescription>{closingMessage}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="text-center">
              <p className="font-headline text-4xl text-primary">{correctCount}/{answers.length}</p>
              <p className="mt-1 text-sm text-muted-foreground">respuestas correctas</p>
            </div>

            <div className="space-y-2 border-y py-4">
              {categoryResults.map((result) => (
                <div key={result.id} className="flex items-center justify-between gap-3 text-sm">
                  <span>{result.label}</span>
                  <span className="font-medium tabular-nums">{result.correct}/{result.total}</span>
                </div>
              ))}
            </div>

            {incorrectAnswers.length > 0 ? (
              <div className="space-y-3">
                <h3 className="font-headline text-base">Para repasar</h3>
                {incorrectAnswers.map((answer) => (
                  <div key={answer.question.id} className="border-l-2 border-primary/40 pl-3">
                    <p className="text-sm font-medium leading-relaxed">{answer.question.prompt}</p>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                      {answer.correctAnswer}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">{answer.question.source}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-sm text-muted-foreground">
                No quedaron respuestas pendientes en esta sesión.
              </p>
            )}

            <Button size="lg" className="w-full" onClick={resetSession}>
              <Icon.RotateCcw />
              Nueva sesión
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!current) return null;

  const selectedOption = selectedOptionIndex === null ? null : current.options[selectedOptionIndex];
  const progress = ((questionIndex + (currentAnswered ? 1 : 0)) / questions.length) * 100;

  return (
    <Card>
      <CardHeader className="space-y-3 pb-4">
        <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
          <span>{categoryLabel(current.question.category)} · {difficultyLabel(current.question.difficulty)}</span>
          <span className="tabular-nums">{questionIndex + 1} de {questions.length}</span>
        </div>
        <Progress value={progress} className="h-1.5" />
        <CardTitle className="font-headline text-lg font-normal leading-relaxed">
          {current.question.prompt}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-2" role="group" aria-label="Opciones de respuesta">
          {current.options.map((option, optionIndex) => {
            const isSelected = selectedOptionIndex === optionIndex;
            const showCorrect = currentAnswered && option.isCorrect;
            const showIncorrect = currentAnswered && isSelected && !option.isCorrect;

            return (
              <button
                key={option.text}
                type="button"
                disabled={currentAnswered}
                onClick={() => chooseOption(optionIndex)}
                className={cn(
                  'flex min-h-12 w-full items-center gap-3 rounded-md border bg-background px-3 py-3 text-left text-sm leading-relaxed transition-colors',
                  !currentAnswered && 'active:bg-accent md:hover:bg-accent',
                  showCorrect && 'border-emerald-600 bg-emerald-500/10 text-emerald-950 dark:text-emerald-100',
                  showIncorrect && 'border-destructive bg-destructive/10 text-destructive',
                  currentAnswered && !showCorrect && !showIncorrect && 'opacity-60'
                )}
              >
                <span
                  className={cn(
                    'flex size-6 shrink-0 items-center justify-center rounded-full border text-xs font-medium',
                    showCorrect && 'border-emerald-600 bg-emerald-600 text-white',
                    showIncorrect && 'border-destructive bg-destructive text-destructive-foreground'
                  )}
                >
                  {showCorrect ? (
                    <Icon.Check className="size-4" />
                  ) : showIncorrect ? (
                    <Icon.X className="size-4" />
                  ) : (
                    String.fromCharCode(65 + optionIndex)
                  )}
                </span>
                <span>{option.text}</span>
              </button>
            );
          })}
        </div>

        {currentAnswered ? (
          <div
            className={cn(
              'mt-4 border-l-2 py-1 pl-3',
              selectedOption?.isCorrect ? 'border-emerald-600' : 'border-primary'
            )}
            aria-live="polite"
          >
            <p className="text-sm font-medium">
              {selectedOption?.isCorrect ? 'Correcto' : 'Respuesta correcta'}
            </p>
            {!selectedOption?.isCorrect ? (
              <p className="mt-1 text-sm font-medium">
                {current.options.find((option) => option.isCorrect)?.text}
              </p>
            ) : null}
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              {current.question.explanation}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">Fuente: {current.question.source}</p>
          </div>
        ) : null}

        <Button size="lg" className="mt-2 w-full" disabled={!currentAnswered} onClick={advance}>
          {questionIndex === questions.length - 1 ? 'Ver resultado' : 'Siguiente'}
          {questionIndex === questions.length - 1 ? <Icon.CircleCheck /> : <Icon.ArrowRight />}
        </Button>
      </CardContent>
    </Card>
  );
}
