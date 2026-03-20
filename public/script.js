document.addEventListener("DOMContentLoaded", () => {
  const startScreen = document.getElementById("start-screen");
  const quizScreen = document.getElementById("quiz-screen");
  const resultScreen = document.getElementById("result-screen");
  const allPalsScreen = document.getElementById("all-pals-screen");

  const startBtn = document.getElementById("start-btn");
  const backStartBtn = document.getElementById("back-start-btn");
  const backPrevBtn = document.getElementById("back-prev-btn");
  const resultHomeBtn = document.getElementById("result-home-btn");
  const retryBtn = document.getElementById("retry-btn");
  const meetPalsBtn = document.getElementById("meet-pals-btn");
  const backResultBtn = document.getElementById("back-result-btn");

  const progressText = document.getElementById("progress-text");
  const progressPercent = document.getElementById("progress-percent");
  const progressFill = document.getElementById("progress-fill");

  const questionTitle = document.getElementById("question-title");
  const questionSub = document.getElementById("question-sub");
  const optionsContainer = document.getElementById("options-container");

  const resultImage = document.getElementById("result-image");
  const resultName = document.getElementById("result-name");
  const resultDesc = document.getElementById("result-desc");
  const resultBadge = document.getElementById("result-badge");
  const resultTip = document.getElementById("result-tip");

  const allPalsGrid = document.getElementById("all-pals-grid");

  let currentQuestionIndex = 0;
  let lastResultKey = null;
  let userAnswers = [];
  let isSubmittingResult = false;
  let currentQuestions = [];

  const currentScript = document.querySelector('script[src$="script.js"]');
  const assetBase = currentScript
    ? new URL(".", currentScript.src).href
    : window.location.href;

  /**
   * Returns a full asset URL relative to the current script location.
   *
   * @param {string} fileName The asset file name.
   * @returns {string} The resolved asset URL.
   */
  function getAssetUrl(fileName) {
    return new URL(fileName, assetBase).href;
  }

  /**
   * Returns the total number of questions shown in the quiz.
   * This assumes:
   * - fixedQuestions contains Q1 to Q3
   * - adaptiveTemplates contains Q4 to Q6
   *
   * @returns {number} Total number of questions.
   */
  function getTotalQuestionCount() {
    return fixedQuestions.length + adaptiveTemplates.length;
  }

  /**
   * Hides all screens and shows only the requested screen.
   *
   * @param {HTMLElement|null} screen The screen to display.
   * @returns {void}
   */
  function showScreen(screen) {
    [startScreen, quizScreen, resultScreen, allPalsScreen].forEach((section) => {
      if (section) {
        section.classList.add("hidden");
      }
    });

    if (screen) {
      screen.classList.remove("hidden");
    }
  }

  /**
   * Shows a friendly error message inside the quiz screen.
   * Used when question data or bracket generation is invalid.
   *
   * @param {string} message The error message to display.
   * @returns {void}
   */
  function showDataError(message) {
    showScreen(quizScreen);

    if (questionTitle) questionTitle.textContent = "Quiz data not loaded";
    if (questionSub) questionSub.textContent = message;
    if (optionsContainer) optionsContainer.innerHTML = "";
    if (progressText) progressText.textContent = "Question 0 of 0";
    if (progressPercent) progressPercent.textContent = "0%";
    if (progressFill) progressFill.style.width = "0%";

    if (backPrevBtn) backPrevBtn.classList.add("hidden");
  }

  /**
   * Stores a minimal copy of the selected answer.
   *
   * @param {{ pal: string, text?: string }} opt The clicked option.
   * @returns {{ pal: string, text: string }} A cloned answer object.
   */
  function cloneAnswer(opt) {
    return {
      pal: opt.pal,
      text: opt.text || ""
    };
  }

  /**
   * Returns true only when all fixed questions (Q1 to Q3) have been answered.
   *
   * @returns {boolean} Whether Q1 to Q3 are complete.
   */
  function hasCompletedFixedQuestions() {
    return fixedQuestions.every((_, index) => Boolean(userAnswers[index]?.pal));
  }

  /**
   * Returns the winners of the fixed questions only.
   * These are:
   * - Q1 winner
   * - Q2 winner
   * - Q3 winner
   *
   * @returns {string[]} Seed winners from the first 3 questions.
   */
  function getSeedWinners() {
    return userAnswers
      .slice(0, fixedQuestions.length)
      .map((answer) => answer?.pal)
      .filter(Boolean);
  }

  /**
   * Reads adaptive option text for a specific pal and question.
   * Example:
   * adaptiveOptionBank["ola"]["q4"]
   *
   * @param {string} palKey The pal key.
   * @param {string} questionId The question id, such as q4/q5/q6.
   * @returns {string|null} The text if available, else null.
   */
  function getAdaptiveText(palKey, questionId) {
    return adaptiveOptionBank?.[palKey]?.[questionId] || null;
  }

  /**
   * Creates a 2-option head-to-head question object.
   * This is used for Q4, Q5, and Q6.
   *
   * The function only succeeds if both pals have valid adaptive text
   * for the requested template id.
   *
   * @param {{ id: string, q: string, sub: string }} template The adaptive template.
   * @param {string|null} palA First pal.
   * @param {string|null} palB Second pal.
   * @returns {object|null} The generated question object or null if invalid.
   */
  function makeHeadToHeadQuestion(template, palA, palB) {
    if (!template || !palA || !palB) {
      return null;
    }

    const textA = getAdaptiveText(palA, template.id);
    const textB = getAdaptiveText(palB, template.id);

    if (!textA || !textB) {
      return null;
    }

    return {
      id: template.id,
      q: template.q,
      sub: template.sub,
      a: [
        {
          text: textA,
          pal: palA
        },
        {
          text: textB,
          pal: palB
        }
      ]
    };
  }

  /**
   * Returns the chosen pal for a given question index.
   *
   * Index map:
   * 0 = Q1
   * 1 = Q2
   * 2 = Q3
   * 3 = Q4
   * 4 = Q5
   * 5 = Q6
   *
   * @param {number} index The answer index.
   * @returns {string|null} The chosen pal or null if unanswered.
   */
  function getAnswerPal(index) {
    return userAnswers[index]?.pal || null;
  }

  /**
   * Builds a full snapshot of the bracket state.
   *
   * Bracket rules:
   * Q1 = Perry vs Ping
   * Q2 = Iggy vs Tobi
   * Q3 = Sky vs Ty
   * Q4 = Ola vs winner(Q3)
   * Q5 = winner(Q1) vs winner(Q2)
   * Q6 = winner(Q4) vs winner(Q5)
   *
   * preferredPal = winner(Q6)
   * fallbackPal  = winner(Q5)
   *
   * @returns {{
   *   q1Winner: string|null,
   *   q2Winner: string|null,
   *   q3Winner: string|null,
   *   q4Winner: string|null,
   *   q5Winner: string|null,
   *   q6Winner: string|null,
   *   q4Pair: string[]|null,
   *   q5Pair: string[]|null,
   *   q6Pair: string[]|null,
   *   preferredPal: string|null,
   *   fallbackPal: string|null
   * }}
   */
  function getBracketSnapshot() {
    const q1Winner = getAnswerPal(0);
    const q2Winner = getAnswerPal(1);
    const q3Winner = getAnswerPal(2);
    const q4Winner = getAnswerPal(3);
    const q5Winner = getAnswerPal(4);
    const q6Winner = getAnswerPal(5);

    return {
      q1Winner,
      q2Winner,
      q3Winner,
      q4Winner,
      q5Winner,
      q6Winner,
      q4Pair: q3Winner ? ["ola", q3Winner] : null,
      q5Pair: q1Winner && q2Winner ? [q1Winner, q2Winner] : null,
      q6Pair: q4Winner && q5Winner ? [q4Winner, q5Winner] : null,
      preferredPal: q6Winner,
      fallbackPal: q5Winner
    };
  }

  /**
   * Generates the adaptive questions using the strict bracket flow.
   *
   * Important:
   * - Q4 and Q5 become available only after Q1 to Q3 are complete.
   * - Q6 becomes available only after Q4 and Q5 are answered.
   *
   * This avoids the old pool-based logic and forces the frontend
   * to follow the exact tournament structure.
   *
   * @returns {object[]} The adaptive questions to append after fixedQuestions.
   */
  function buildAdaptiveQuestions() {
    if (!Array.isArray(adaptiveTemplates) || adaptiveTemplates.length < 3) {
      return [];
    }

    if (!hasCompletedFixedQuestions()) {
      return [];
    }

    const q4Template = adaptiveTemplates[0];
    const q5Template = adaptiveTemplates[1];
    const q6Template = adaptiveTemplates[2];

    const {
      q1Winner,
      q2Winner,
      q3Winner,
      q4Winner,
      q5Winner
    } = getBracketSnapshot();

    const q4 = makeHeadToHeadQuestion(q4Template, "ola", q3Winner);
    const q5 = makeHeadToHeadQuestion(q5Template, q1Winner, q2Winner);

    const adaptiveQuestions = [];

    if (q4) adaptiveQuestions.push(q4);
    if (q5) adaptiveQuestions.push(q5);

    if (q4Winner && q5Winner) {
      const q6 = makeHeadToHeadQuestion(q6Template, q4Winner, q5Winner);
      if (q6) {
        adaptiveQuestions.push(q6);
      }
    }

    console.log("[BRACKET SNAPSHOT]", getBracketSnapshot());

    return adaptiveQuestions;
  }

  /**
   * Rebuilds the question list shown to the user.
   *
   * Before Q1 to Q3 are complete:
   *   currentQuestions = fixedQuestions only
   *
   * After Q1 to Q3 are complete:
   *   currentQuestions = fixedQuestions + adaptive bracket questions
   *
   * @returns {void}
   */
  function updateQuestionSet() {
    if (hasCompletedFixedQuestions()) {
      currentQuestions = [...fixedQuestions, ...buildAdaptiveQuestions()];
    } else {
      currentQuestions = [...fixedQuestions];
    }
  }

  /**
   * Returns at most 2 options for the question.
   * This ensures the UI always shows exactly two choices.
   *
   * @param {object} item The question object.
   * @returns {object[]} The visible answer options.
   */
  function getVisibleOptions(item) {
    if (!item || !Array.isArray(item.a)) {
      return [];
    }

    return item.a.slice(0, 2);
  }

  /**
   * Resets the quiz state and starts from Q1.
   *
   * @returns {void}
   */
  function startQuiz() {
    currentQuestionIndex = 0;
    lastResultKey = null;
    userAnswers = [];
    currentQuestions = [...fixedQuestions];
    updateQuestionSet();
    showScreen(quizScreen);
    renderQuestion();
  }

  /**
   * Renders the current question on screen.
   *
   * Flow:
   * 1. Validate question data
   * 2. Build adaptive questions when fixed questions are done
   * 3. Render exactly 2 options
   * 4. Save selected answer
   * 5. Move to next question or show result
   *
   * @returns {Promise<void>|void}
   */
  function renderQuestion() {
    if (!Array.isArray(currentQuestions) || currentQuestions.length === 0) {
      showDataError("currentQuestions is empty. Please check quiz generation logic.");
      return;
    }

    if (typeof pals === "undefined") {
      showDataError("pals is missing. Please check data.js for errors.");
      return;
    }

    if (
      currentQuestionIndex === fixedQuestions.length &&
      currentQuestions.length === fixedQuestions.length &&
      hasCompletedFixedQuestions()
    ) {
      updateQuestionSet();
    }

    const item = currentQuestions[currentQuestionIndex];

    if (!item) {
      showDataError("Question data is invalid or missing.");
      return;
    }

    const visibleOptions = getVisibleOptions(item);

    if (!Array.isArray(visibleOptions) || visibleOptions.length !== 2) {
      showDataError(`Expected exactly 2 valid options for ${item.id || "this question"}.`);
      return;
    }

    if (backPrevBtn) {
      backPrevBtn.classList.toggle("hidden", currentQuestionIndex === 0);
    }

    const totalQuestionCount = getTotalQuestionCount();
    const progress = ((currentQuestionIndex + 1) / totalQuestionCount) * 100;

    if (progressText) {
      progressText.textContent = `Question ${currentQuestionIndex + 1} of ${totalQuestionCount}`;
    }

    if (progressPercent) {
      progressPercent.textContent = `${Math.round(progress)}%`;
    }

    if (progressFill) {
      progressFill.style.width = `${progress}%`;
    }

    if (questionTitle) {
      questionTitle.textContent = item.q || "";
    }

    if (questionSub) {
      questionSub.textContent = item.sub || "";
    }

    if (!optionsContainer) return;
    optionsContainer.innerHTML = "";

    visibleOptions.forEach((opt) => {
      const pal = pals[opt.pal];
      if (!pal) return;

      const button = document.createElement("button");
      button.className = "option-btn";
      button.style.setProperty("--accent", pal.color || "#999");
      button.style.setProperty("--accent-soft", pal.soft || "#eee");
      button.innerHTML = `
        <p class="option-desc">${opt.text}</p>
      `;

      button.addEventListener("click", async () => {
        userAnswers[currentQuestionIndex] = cloneAnswer(opt);
        updateQuestionSet();

        currentQuestionIndex += 1;

        if (currentQuestionIndex < currentQuestions.length) {
          renderQuestion();
        } else {
          await showResult();
        }
      });

      optionsContainer.appendChild(button);
    });
  }

  /**
   * Returns the frontend's final preferred pal.
   * This must be the winner of Q6 only.
   *
   * @returns {string|null} The Q6 winner.
   */
  function getFrontendWinner() {
    return getBracketSnapshot().preferredPal;
  }

  /**
   * Returns the fallback pal for stock failure.
   * This must be the winner of Q5.
   *
   * @returns {string|null} The Q5 winner.
   */
  function getFallbackWinner() {
    return getBracketSnapshot().fallbackPal;
  }

  /**
   * Renders the assigned pal on the result screen.
   *
   * @param {string} palKey The final assigned pal key from backend.
   * @returns {void}
   */
  function renderAssignedPal(palKey) {
    if (typeof pals === "undefined") {
      showDataError("pals is missing. Please check data.js for errors.");
      return;
    }

    const result = pals[palKey];

    if (!result) {
      showDataError("Result data is missing.");
      return;
    }

    lastResultKey = palKey;

    if (resultImage) {
      resultImage.src = getAssetUrl(result.image);
      resultImage.alt = result.short;
    }

    if (resultName) {
      resultName.textContent = result.name;
    }

    if (resultDesc) {
      resultDesc.textContent = result.desc;
    }

    if (resultBadge) {
      resultBadge.textContent = result.badge;
    }

    if (resultTip) {
      resultTip.textContent = result.tip;
    }

    showScreen(resultScreen);
  }

  /**
   * Sends the final result request to the backend.
   *
   * Frontend responsibility:
   * - preferredPal = winner(Q6)
   * - fallbackPal  = winner(Q5)
   *
   * Backend responsibility:
   * - if preferredPal stock > 0, use preferredPal
   * - else if fallbackPal stock > 0, use fallbackPal
   * - else apply backend fallback logic
   *
   * @returns {Promise<void>}
   */
  async function showResult() {
    if (isSubmittingResult) return;
    isSubmittingResult = true;

    const preferredPal = getFrontendWinner();
    const fallbackPal = getFallbackWinner();

    if (!preferredPal) {
      showDataError("Could not determine the Q6 winner. Please check the bracket flow.");
      isSubmittingResult = false;
      return;
    }

    try {
      const response = await fetch("/api/quiz/assign", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          preferredPal,
          fallbackPal,
          seedWinners: getSeedWinners(),
          answerHistory: userAnswers.map((answer) => answer?.pal).filter(Boolean),
          bracket: getBracketSnapshot(),
          quizVersion: "elimination-6-bracket"
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Unable to assign a pal.");
      }

      renderAssignedPal(data.assignedPal);
    } catch (error) {
      showDataError(error.message || "Something went wrong while assigning the result.");
    } finally {
      isSubmittingResult = false;
    }
  }

  /**
   * Renders the "Meet all pals" grid.
   *
   * @returns {void}
   */
  function renderAllPals() {
    if (!allPalsGrid || typeof pals === "undefined") return;

    allPalsGrid.innerHTML = "";

    Object.keys(pals).forEach((key) => {
      const pal = pals[key];

      const card = document.createElement("div");
      card.className = "pal-mini-card";
      card.innerHTML = `
        <img src="${getAssetUrl(pal.image)}" alt="${pal.short}">
        <div>
          <strong>${pal.name}</strong>
          <span>${pal.badge}</span>
        </div>
      `;
      allPalsGrid.appendChild(card);
    });
  }

  /**
   * Returns the user to the start screen and clears quiz progress.
   *
   * @returns {void}
   */
  function resetToStart() {
    currentQuestionIndex = 0;
    lastResultKey = null;
    userAnswers = [];
    currentQuestions = [...fixedQuestions];
    showScreen(startScreen);
  }

  /**
   * Debug helper for browser console.
   * Example:
   * quizDebug.getBracketSnapshot()
   */
  window.quizDebug = {
    getAnswers: () => userAnswers,
    getBracketSnapshot
  };

  if (startBtn) {
    startBtn.addEventListener("click", startQuiz);
  }

  if (backStartBtn) {
    backStartBtn.addEventListener("click", resetToStart);
  }

  if (resultHomeBtn) {
    resultHomeBtn.addEventListener("click", resetToStart);
  }

  if (retryBtn) {
    retryBtn.addEventListener("click", startQuiz);
  }

  if (meetPalsBtn) {
    meetPalsBtn.addEventListener("click", () => {
      renderAllPals();
      showScreen(allPalsScreen);
    });
  }

  if (backResultBtn) {
    backResultBtn.addEventListener("click", () => {
      if (lastResultKey) {
        showScreen(resultScreen);
      } else {
        showScreen(startScreen);
      }
    });
  }

  if (backPrevBtn) {
    backPrevBtn.addEventListener("click", () => {
      if (currentQuestionIndex > 0) {
        currentQuestionIndex -= 1;
        userAnswers = userAnswers.slice(0, currentQuestionIndex);
        updateQuestionSet();
        renderQuestion();
      }
    });
  }

  currentQuestions = [...fixedQuestions];
  showScreen(startScreen);
});