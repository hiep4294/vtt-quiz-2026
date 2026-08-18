export const QUIZ_PLAN = Object.freeze([
  { pool: "KT26.VTT.DCTC_n2", count: 3 },
  { pool: "KT26.VTT.DCTC_chung", count: 3 },
  { pool: "KT26.VTT.CSSPV_n2", count: 4 },
  { pool: "KT26.VTT.PC_chung", count: 4 },
  { pool: "KT26.VTT.KN_chung", count: 2 },
  { pool: "KT26.VTT.TTC_n2", count: 4 },
  { pool: "KT26.VTT.TDT_chung", count: 2 },
  { pool: "KT26.VTT.KDSPV_n2", count: 4 },
  { pool: "KT26.VTT.TTTM_chung", count: 4 },
  { pool: "KT26.VTT.KDSPV_chung", count: 4 },
  { pool: "KT26.VTT.QLRRTD_chung", count: 4 },
  { pool: "KT26.VTT.TTC_chung", count: 4 },
  { pool: "KT26.VTT.CSSPV_chung", count: 4 },
  { pool: "KT26.VTT.QLRRHD_chung", count: 4 },
]);

export const TOTAL_QUESTIONS = QUIZ_PLAN.reduce((total, item) => total + item.count, 0);
export const OPTION_KEYS = Object.freeze(["A", "B", "C", "D"]);

export function shuffle(items, random = Math.random) {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }
  return result;
}

export function validateBank(questionBank, plan = QUIZ_PLAN) {
  const ids = new Set();
  const duplicateIds = [];

  for (const question of questionBank) {
    if (ids.has(question.id)) duplicateIds.push(question.id);
    ids.add(question.id);
  }

  if (duplicateIds.length) {
    throw new Error(`Mã câu hỏi bị trùng: ${duplicateIds.join(", ")}`);
  }

  for (const item of plan) {
    const available = questionBank.filter((question) => question.pool === item.pool).length;
    if (available < item.count) {
      throw new Error(`${item.pool} cần ${item.count} câu nhưng chỉ có ${available} câu.`);
    }
  }

  return true;
}

export function buildQuiz(questionBank, random = Math.random, plan = QUIZ_PLAN) {
  validateBank(questionBank, plan);
  const selected = plan.flatMap((item) => {
    const candidates = questionBank.filter((question) => question.pool === item.pool);
    return shuffle(candidates, random).slice(0, item.count);
  });
  return shuffle(selected, random).map((question) => ({
    ...question,
    optionOrder: shuffle(OPTION_KEYS, random),
  }));
}

export function scoreQuiz(questions, answers) {
  const rows = questions.map((question) => {
    const chosen = answers[question.id] ?? null;
    return {
      question,
      chosen,
      correct: chosen === question.answer,
      unanswered: chosen === null,
    };
  });

  const breakdown = QUIZ_PLAN.map(({ pool }) => {
    const poolRows = rows.filter((row) => row.question.pool === pool);
    return {
      pool,
      total: poolRows.length,
      correct: poolRows.filter((row) => row.correct).length,
    };
  }).filter((item) => item.total > 0);

  return {
    rows,
    breakdown,
    correct: rows.filter((row) => row.correct).length,
    wrong: rows.filter((row) => !row.correct && !row.unanswered).length,
    unanswered: rows.filter((row) => row.unanswered).length,
    total: rows.length,
  };
}

export function formatTime(seconds) {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(safeSeconds / 60);
  const remainder = safeSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`;
}
