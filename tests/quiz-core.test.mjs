import test from "node:test";
import assert from "node:assert/strict";

import { QUESTION_BANK } from "../data/questions.js";
import {
  QUIZ_PLAN,
  TOTAL_QUESTIONS,
  OPTION_KEYS,
  buildQuiz,
  formatTime,
  scoreQuiz,
  validateBank,
} from "../quiz-core.js";

test("question bank has 373 unique valid questions", () => {
  assert.equal(QUESTION_BANK.length, 373);
  assert.equal(validateBank(QUESTION_BANK), true);
  assert.equal(new Set(QUESTION_BANK.map((question) => question.id)).size, 373);
  const normalize = (value) =>
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/g, "d")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  const normalizedQuestionContent = QUESTION_BANK.map((question) =>
    [question.question, ...Object.values(question.options)].map(normalize).join("|"),
  );
  assert.equal(new Set(normalizedQuestionContent).size, 373);
  for (const question of QUESTION_BANK) {
    assert.match(question.id, /^VTT\d+\.\d+$/);
    assert.match(question.answer, /^[ABCD]$/);
    assert.deepEqual(Object.keys(question.options), ["A", "B", "C", "D"]);
    assert.ok(question.question.length > 5);
    assert.ok(Object.values(question.options).every((option) => option.length > 0));
  }
});

test("1,000 random exams always follow the 15-pool, 50-question plan", () => {
  for (let run = 0; run < 1_000; run += 1) {
    const quiz = buildQuiz(QUESTION_BANK);
    assert.equal(quiz.length, TOTAL_QUESTIONS);
    assert.equal(new Set(quiz.map((question) => question.id)).size, TOTAL_QUESTIONS);
    for (const question of quiz) {
      assert.deepEqual([...question.optionOrder].sort(), [...OPTION_KEYS]);
    }
    for (const item of QUIZ_PLAN) {
      assert.equal(
        quiz.filter((question) => question.pool === item.pool).length,
        item.count,
        item.pool,
      );
    }
  }
});

test("answer contents are shuffled without changing the correct source answer", () => {
  const bank = [
    {
      id: "TEST.01",
      pool: "test-pool",
      question: "Câu thử nghiệm?",
      options: { A: "Một", B: "Hai", C: "Ba", D: "Bốn" },
      answer: "B",
    },
  ];
  const plan = [{ pool: "test-pool", count: 1 }];
  const firstAppearance = buildQuiz(bank, () => 0, plan);
  const nextAppearance = buildQuiz(bank, () => 0.999, plan);
  assert.deepEqual(firstAppearance[0].optionOrder, ["B", "C", "D", "A"]);
  assert.deepEqual(nextAppearance[0].optionOrder, ["A", "B", "C", "D"]);
  assert.notDeepEqual(firstAppearance[0].optionOrder, nextAppearance[0].optionOrder);
  assert.equal(scoreQuiz(firstAppearance, { "TEST.01": "B" }).correct, 1);
});

test("scoring reports correct, wrong, unanswered and per-pool totals", () => {
  const quiz = buildQuiz(QUESTION_BANK, () => 0.42);
  const answers = Object.fromEntries(
    quiz.slice(0, 10).map((question, index) => [question.id, index < 6 ? question.answer : "Z"]),
  );
  const result = scoreQuiz(quiz, answers);
  assert.equal(result.correct, 6);
  assert.equal(result.wrong, 4);
  assert.equal(result.unanswered, 40);
  assert.equal(result.breakdown.reduce((sum, item) => sum + item.total, 0), 50);
});

test("time formatter is stable", () => {
  assert.equal(formatTime(0), "00:00");
  assert.equal(formatTime(65), "01:05");
  assert.equal(formatTime(3_600), "60:00");
});
