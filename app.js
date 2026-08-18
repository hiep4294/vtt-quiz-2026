import { QUESTION_BANK } from "./data/questions.js";
import {
  QUIZ_PLAN,
  TOTAL_QUESTIONS,
  OPTION_KEYS,
  buildQuiz,
  formatTime,
  scoreQuiz,
  validateBank,
} from "./quiz-core.js";

const STORAGE_KEY = "vtt-quiz-2026-active-attempt";
const STORAGE_VERSION = 2;
const DISPLAY_LETTERS = OPTION_KEYS;

const elements = {
  startScreen: document.querySelector("#start-screen"),
  quizScreen: document.querySelector("#quiz-screen"),
  resultScreen: document.querySelector("#result-screen"),
  examStatus: document.querySelector("#exam-status"),
  progressLabel: document.querySelector("#progress-label"),
  timer: document.querySelector("#timer"),
  planList: document.querySelector("#plan-list"),
  durationSelect: document.querySelector("#duration-select"),
  startButton: document.querySelector("#start-button"),
  resumeButton: document.querySelector("#resume-button"),
  questionNumber: document.querySelector("#question-number"),
  questionCode: document.querySelector("#question-code"),
  questionText: document.querySelector("#question-text"),
  options: document.querySelector("#options"),
  flagButton: document.querySelector("#flag-button"),
  previousButton: document.querySelector("#previous-button"),
  nextButton: document.querySelector("#next-button"),
  answeredCount: document.querySelector("#answered-count"),
  progressBar: document.querySelector("#progress-bar"),
  questionGrid: document.querySelector("#question-grid"),
  submitButton: document.querySelector("#submit-button"),
  submitHint: document.querySelector("#submit-hint"),
  resultTitle: document.querySelector("#result-title"),
  resultMessage: document.querySelector("#result-message"),
  scoreValue: document.querySelector("#score-value"),
  correctCount: document.querySelector("#correct-count"),
  wrongCount: document.querySelector("#wrong-count"),
  unansweredCount: document.querySelector("#unanswered-count"),
  timeUsed: document.querySelector("#time-used"),
  breakdownList: document.querySelector("#breakdown-list"),
  newQuizButton: document.querySelector("#new-quiz-button"),
  toggleReviewButton: document.querySelector("#toggle-review-button"),
  reviewSection: document.querySelector("#review-section"),
  reviewList: document.querySelector("#review-list"),
};

let state = {
  questions: [],
  answers: {},
  flagged: new Set(),
  currentIndex: 0,
  startedAt: null,
  deadline: null,
  durationMinutes: 60,
  timerId: null,
};

function poolLabel(pool) {
  return pool.replace("KT26.VTT.", "");
}

function renderPlan() {
  const fragment = document.createDocumentFragment();
  for (const item of QUIZ_PLAN) {
    const row = document.createElement("div");
    row.className = "plan-row";

    const label = document.createElement("span");
    label.textContent = item.pool;
    const count = document.createElement("strong");
    count.textContent = item.count;

    row.append(label, count);
    fragment.append(row);
  }
  elements.planList.replaceChildren(fragment);
}

function showScreen(name) {
  elements.startScreen.hidden = name !== "start";
  elements.quizScreen.hidden = name !== "quiz";
  elements.resultScreen.hidden = name !== "result";
  elements.examStatus.hidden = name !== "quiz";
  window.scrollTo({ top: 0, behavior: "instant" });
}

function serializeAttempt() {
  return {
    version: STORAGE_VERSION,
    questionIds: state.questions.map((question) => question.id),
    optionOrders: Object.fromEntries(
      state.questions.map((question) => [question.id, question.optionOrder]),
    ),
    answers: state.answers,
    flagged: [...state.flagged],
    currentIndex: state.currentIndex,
    startedAt: state.startedAt,
    deadline: state.deadline,
    durationMinutes: state.durationMinutes,
  };
}

function saveAttempt() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(serializeAttempt()));
}

function readSavedAttempt() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved?.version !== STORAGE_VERSION || !saved.questionIds?.length || !saved.deadline) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    const questions = saved.questionIds
      .map((id) => {
        const question = QUESTION_BANK.find((item) => item.id === id);
        const optionOrder = saved.optionOrders?.[id];
        const validOrder =
          Array.isArray(optionOrder) &&
          optionOrder.length === DISPLAY_LETTERS.length &&
          new Set(optionOrder).size === DISPLAY_LETTERS.length &&
          optionOrder.every((letter) => DISPLAY_LETTERS.includes(letter));
        return question && validOrder ? { ...question, optionOrder } : null;
      })
      .filter(Boolean);
    if (questions.length !== TOTAL_QUESTIONS) return null;
    return { ...saved, questions };
  } catch {
    localStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

function updateResumeButton() {
  const saved = readSavedAttempt();
  elements.resumeButton.hidden = !saved;
  if (saved) {
    const answered = Object.keys(saved.answers ?? {}).length;
    elements.resumeButton.textContent = `Tiếp tục bài đang làm (${answered}/50)`;
  }
}

function startNewQuiz() {
  const durationMinutes = Number(elements.durationSelect.value);
  const startedAt = Date.now();
  state = {
    questions: buildQuiz(QUESTION_BANK),
    answers: {},
    flagged: new Set(),
    currentIndex: 0,
    startedAt,
    deadline: startedAt + durationMinutes * 60_000,
    durationMinutes,
    timerId: null,
  };
  saveAttempt();
  openQuiz();
}

function resumeQuiz() {
  const saved = readSavedAttempt();
  if (!saved) {
    updateResumeButton();
    return;
  }
  state = {
    questions: saved.questions,
    answers: saved.answers ?? {},
    flagged: new Set(saved.flagged ?? []),
    currentIndex: Math.min(saved.currentIndex ?? 0, TOTAL_QUESTIONS - 1),
    startedAt: saved.startedAt,
    deadline: saved.deadline,
    durationMinutes: saved.durationMinutes ?? 60,
    timerId: null,
  };
  openQuiz();
  if (Date.now() >= state.deadline) finishQuiz(true);
}

function openQuiz() {
  showScreen("quiz");
  renderNavigator();
  renderQuestion();
  startTimer();
}

function startTimer() {
  clearInterval(state.timerId);
  updateTimer();
  state.timerId = window.setInterval(updateTimer, 1_000);
}

function updateTimer() {
  const secondsLeft = Math.max(0, Math.ceil((state.deadline - Date.now()) / 1_000));
  elements.timer.textContent = formatTime(secondsLeft);
  elements.timer.classList.toggle("timer-warning", secondsLeft <= 300);
  if (secondsLeft <= 0) finishQuiz(true);
}

function renderQuestion() {
  const question = state.questions[state.currentIndex];
  const selectedAnswer = state.answers[question.id];
  const isFlagged = state.flagged.has(question.id);

  elements.questionNumber.textContent = `Câu ${state.currentIndex + 1} / ${TOTAL_QUESTIONS}`;
  elements.questionCode.textContent = `${question.id} · ${poolLabel(question.pool)}`;
  elements.questionText.textContent = question.question;
  elements.flagButton.classList.toggle("active", isFlagged);
  elements.flagButton.setAttribute("aria-pressed", String(isFlagged));
  elements.flagButton.textContent = isFlagged ? "Đã đánh dấu" : "Đánh dấu";

  const fragment = document.createDocumentFragment();
  for (const [index, displayLetter] of DISPLAY_LETTERS.entries()) {
    const sourceLetter = question.optionOrder[index];
    const option = document.createElement("button");
    option.type = "button";
    option.className = "option";
    option.setAttribute("role", "radio");
    option.setAttribute("aria-checked", String(selectedAnswer === sourceLetter));
    if (selectedAnswer === sourceLetter) option.classList.add("selected");

    const badge = document.createElement("span");
    badge.className = "option-letter";
    badge.textContent = displayLetter;
    const text = document.createElement("span");
    text.textContent = question.options[sourceLetter];
    option.append(badge, text);
    option.addEventListener("click", () => chooseAnswer(sourceLetter));
    fragment.append(option);
  }
  elements.options.replaceChildren(fragment);

  elements.previousButton.disabled = state.currentIndex === 0;
  elements.nextButton.textContent = state.currentIndex === TOTAL_QUESTIONS - 1 ? "Về câu đầu" : "Câu tiếp";
  updateProgress();
  updateNavigatorSelection();
}

function chooseAnswer(letter) {
  const question = state.questions[state.currentIndex];
  state.answers[question.id] = letter;
  saveAttempt();
  renderQuestion();
}

function toggleFlag() {
  const id = state.questions[state.currentIndex].id;
  if (state.flagged.has(id)) state.flagged.delete(id);
  else state.flagged.add(id);
  saveAttempt();
  renderQuestion();
}

function goToQuestion(index) {
  state.currentIndex = Math.max(0, Math.min(index, TOTAL_QUESTIONS - 1));
  saveAttempt();
  renderQuestion();
  document.querySelector(".question-card").scrollIntoView({ behavior: "smooth", block: "start" });
}

function renderNavigator() {
  const fragment = document.createDocumentFragment();
  state.questions.forEach((question, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "question-chip";
    button.textContent = index + 1;
    button.dataset.index = index;
    button.setAttribute("aria-label", `Đến câu ${index + 1}`);
    button.addEventListener("click", () => goToQuestion(index));
    fragment.append(button);
  });
  elements.questionGrid.replaceChildren(fragment);
  updateNavigatorSelection();
}

function updateNavigatorSelection() {
  const buttons = elements.questionGrid.querySelectorAll(".question-chip");
  buttons.forEach((button, index) => {
    const question = state.questions[index];
    button.classList.toggle("current", index === state.currentIndex);
    button.classList.toggle("answered", Boolean(state.answers[question.id]));
    button.classList.toggle("flagged", state.flagged.has(question.id));
    button.setAttribute("aria-current", index === state.currentIndex ? "true" : "false");
  });
}

function updateProgress() {
  const answered = Object.keys(state.answers).length;
  const complete = answered === TOTAL_QUESTIONS;
  const percent = (answered / TOTAL_QUESTIONS) * 100;

  elements.answeredCount.textContent = `${answered}/${TOTAL_QUESTIONS}`;
  elements.progressLabel.textContent = `${answered}/${TOTAL_QUESTIONS} câu`;
  elements.progressBar.style.width = `${percent}%`;
  elements.submitButton.disabled = !complete;
  elements.submitHint.textContent = complete
    ? "Bạn đã trả lời đủ. Hãy kiểm tra trước khi nộp."
    : `Còn ${TOTAL_QUESTIONS - answered} câu chưa trả lời.`;
}

function finishQuiz(autoSubmitted = false) {
  if (!state.questions.length) return;
  clearInterval(state.timerId);
  state.timerId = null;

  if (!autoSubmitted) {
    const confirmed = window.confirm("Nộp bài và mở đáp án? Sau khi nộp, bạn không thể sửa lựa chọn.");
    if (!confirmed) {
      startTimer();
      return;
    }
  }

  const finishedAt = Date.now();
  const result = scoreQuiz(state.questions, state.answers);
  const maxDurationSeconds = state.durationMinutes * 60;
  const elapsedSeconds = Math.min(maxDurationSeconds, Math.round((finishedAt - state.startedAt) / 1_000));
  localStorage.removeItem(STORAGE_KEY);
  renderResult(result, elapsedSeconds, autoSubmitted);
  showScreen("result");
}

function renderResult(result, elapsedSeconds, autoSubmitted) {
  const percent = Math.round((result.correct / result.total) * 100);
  elements.resultTitle.textContent = autoSubmitted ? "Đã hết thời gian" : "Hoàn thành bài thi";
  elements.resultMessage.textContent =
    percent >= 80
      ? "Kết quả tốt. Hãy xem lại các câu sai để khóa chặt phần kiến thức còn thiếu."
      : "Hãy dùng phần đáp án chi tiết để ôn lại những mục tiêu còn yếu.";
  elements.scoreValue.textContent = result.correct;
  elements.correctCount.textContent = result.correct;
  elements.wrongCount.textContent = result.wrong;
  elements.unansweredCount.textContent = result.unanswered;
  elements.timeUsed.textContent = formatTime(elapsedSeconds);

  const breakdownFragment = document.createDocumentFragment();
  for (const item of result.breakdown) {
    const row = document.createElement("div");
    row.className = "breakdown-row";
    const labelWrap = document.createElement("div");
    const label = document.createElement("span");
    label.textContent = poolLabel(item.pool);
    const value = document.createElement("strong");
    value.textContent = `${item.correct}/${item.total}`;
    labelWrap.append(label, value);
    const track = document.createElement("div");
    track.className = "breakdown-track";
    const fill = document.createElement("span");
    fill.style.width = `${(item.correct / item.total) * 100}%`;
    track.append(fill);
    row.append(labelWrap, track);
    breakdownFragment.append(row);
  }
  elements.breakdownList.replaceChildren(breakdownFragment);
  renderReview(result.rows);
  elements.reviewSection.hidden = true;
  elements.toggleReviewButton.textContent = "Xem đáp án chi tiết";
}

function renderReview(rows) {
  const fragment = document.createDocumentFragment();
  rows.forEach((row, index) => {
    const card = document.createElement("article");
    card.className = `review-card ${row.correct ? "review-correct" : "review-wrong"}`;

    const heading = document.createElement("div");
    heading.className = "review-heading";
    const title = document.createElement("strong");
    title.textContent = `Câu ${index + 1} · ${row.question.id}`;
    const status = document.createElement("span");
    status.textContent = row.correct ? "Đúng" : row.unanswered ? "Chưa trả lời" : "Sai";
    heading.append(title, status);

    const questionText = document.createElement("p");
    questionText.className = "review-question";
    questionText.textContent = row.question.question;
    card.append(heading, questionText);

    const options = document.createElement("div");
    options.className = "review-options";
    for (const [index, displayLetter] of DISPLAY_LETTERS.entries()) {
      const sourceLetter = row.question.optionOrder[index];
      const option = document.createElement("div");
      option.className = "review-option";
      if (sourceLetter === row.question.answer) option.classList.add("correct-answer");
      if (sourceLetter === row.chosen && sourceLetter !== row.question.answer) {
        option.classList.add("chosen-wrong");
      }
      const badge = document.createElement("span");
      badge.textContent = displayLetter;
      const text = document.createElement("p");
      text.textContent = row.question.options[sourceLetter];
      option.append(badge, text);
      options.append(option);
    }
    card.append(options);

    if (row.question.reference) {
      const reference = document.createElement("p");
      reference.className = "reference";
      reference.textContent = `Tài liệu: ${row.question.reference}`;
      card.append(reference);
    }
    fragment.append(card);
  });
  elements.reviewList.replaceChildren(fragment);
}

function toggleReview() {
  const isHidden = elements.reviewSection.hidden;
  elements.reviewSection.hidden = !isHidden;
  elements.toggleReviewButton.textContent = isHidden ? "Ẩn đáp án chi tiết" : "Xem đáp án chi tiết";
  if (isHidden) elements.reviewSection.scrollIntoView({ behavior: "smooth", block: "start" });
}

function resetToStart() {
  clearInterval(state.timerId);
  state.timerId = null;
  localStorage.removeItem(STORAGE_KEY);
  updateResumeButton();
  showScreen("start");
}

function attachEvents() {
  elements.startButton.addEventListener("click", startNewQuiz);
  elements.resumeButton.addEventListener("click", resumeQuiz);
  elements.flagButton.addEventListener("click", toggleFlag);
  elements.previousButton.addEventListener("click", () => goToQuestion(state.currentIndex - 1));
  elements.nextButton.addEventListener("click", () =>
    goToQuestion(state.currentIndex === TOTAL_QUESTIONS - 1 ? 0 : state.currentIndex + 1),
  );
  elements.submitButton.addEventListener("click", () => finishQuiz(false));
  elements.newQuizButton.addEventListener("click", resetToStart);
  elements.toggleReviewButton.addEventListener("click", toggleReview);

  window.addEventListener("keydown", (event) => {
    if (elements.quizScreen.hidden || event.altKey || event.ctrlKey || event.metaKey) return;
    const key = event.key.toUpperCase();
    if (DISPLAY_LETTERS.includes(key)) {
      const sourceLetter = state.questions[state.currentIndex].optionOrder[DISPLAY_LETTERS.indexOf(key)];
      chooseAnswer(sourceLetter);
    }
    if (event.key === "ArrowLeft") goToQuestion(state.currentIndex - 1);
    if (event.key === "ArrowRight") goToQuestion(state.currentIndex + 1);
  });
}

function init() {
  try {
    validateBank(QUESTION_BANK);
  } catch (error) {
    document.body.textContent = `Không thể tải ngân hàng câu hỏi: ${error.message}`;
    return;
  }
  renderPlan();
  attachEvents();
  updateResumeButton();
  showScreen("start");
}

init();
