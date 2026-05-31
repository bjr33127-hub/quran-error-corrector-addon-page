const LAST_PAGE = 604;
const DEFAULT_HIGHLIGHT_COLOR = "#ffd76a";
const STOP_MARKS = ["\u06d6", "\u06d7", "\u06d8", "\u06da", "\u06db"];
const UTHMANIC_FONT_URL = "https://verses.quran.foundation/fonts/quran/hafs/uthmanic_hafs/UthmanicHafs1Ver18.woff2";
const QCF_FONT_URL = "https://verses.quran.foundation/fonts/quran/hafs/v2/woff2/p{page}.woff2";
const STORAGE_KEY = "qec-mobile-csv-cards-v1";
const BASMALA = "\u0628\u0650\u0633\u0652\u0645\u0650 \u0671\u0644\u0644\u0651\u064e\u0647\u0650 \u0671\u0644\u0631\u0651\u064e\u062d\u0652\u0645\u064e\u0670\u0646\u0650 \u0671\u0644\u0631\u0651\u064e\u062d\u0650\u064a\u0645\u0650";

const STRINGS = {
  fr: {
    task: "Recite le contexte avant l'erreur, puis continue jusqu'au passage travaille.",
    anchor: "Aide pour memoriser cette erreur : repete {window}x l'endroit ou tu t'es trompe avec une ligne avant et une ligne apres, puis repete {half}x la demi-page.",
    rangeSame: "Sourate {surah}, verset {ayah}, mot {pos}",
    rangeSameWords: "Sourate {surah}, verset {ayah}, mots {start}-{end}",
    rangeAcross: "Sourate {surah}, {from} -> {to}",
    ayahEnd: "fin du verset",
  },
  en: {
    task: "Recite the context before the error, then continue through the passage you are correcting.",
    anchor: "To lock in this correction: repeat the mistake window {window}x with one line before and one line after, then repeat the half-page {half}x.",
    rangeSame: "Surah {surah}, ayah {ayah}, word {pos}",
    rangeSameWords: "Surah {surah}, ayah {ayah}, words {start}-{end}",
    rangeAcross: "Surah {surah}, {from} -> {to}",
    ayahEnd: "end of ayah",
  },
  ar: {
    task: "\u0627\u0642\u0631\u0623 \u0627\u0644\u0633\u064a\u0627\u0642 \u0642\u0628\u0644 \u0627\u0644\u062e\u0637\u0623\u060c \u062b\u0645 \u0623\u0643\u0645\u0644 \u062d\u062a\u0649 \u0627\u0644\u0645\u0648\u0636\u0639 \u0627\u0644\u0630\u064a \u062a\u0631\u064a\u062f \u062a\u062b\u0628\u064a\u062a\u0647.",
    anchor: "\u0645\u0633\u0627\u0639\u062f\u0629 \u0644\u062a\u062b\u0628\u064a\u062a \u0647\u0630\u0627 \u0627\u0644\u062e\u0637\u0623: \u0643\u0631\u0631 \u0645\u0648\u0636\u0639 \u0627\u0644\u062e\u0637\u0623 {window} \u0645\u0631\u0627\u062a \u0645\u0639 \u0633\u0637\u0631 \u0642\u0628\u0644\u0647 \u0648\u0633\u0637\u0631 \u0628\u0639\u062f\u0647\u060c \u062b\u0645 \u0643\u0631\u0631 \u0646\u0635\u0641 \u0627\u0644\u0635\u0641\u062d\u0629 {half} \u0645\u0631\u0627\u062a.",
    rangeSame: "\u0633\u0648\u0631\u0629 {surah}\u060c \u0627\u0644\u0622\u064a\u0629 {ayah}\u060c \u0627\u0644\u0643\u0644\u0645\u0629 {pos}",
    rangeSameWords: "\u0633\u0648\u0631\u0629 {surah}\u060c \u0627\u0644\u0622\u064a\u0629 {ayah}\u060c \u0627\u0644\u0643\u0644\u0645\u0627\u062a {start}-{end}",
    rangeAcross: "\u0633\u0648\u0631\u0629 {surah}\u060c {from} -> {to}",
    ayahEnd: "\u0646\u0647\u0627\u064a\u0629 \u0627\u0644\u0622\u064a\u0629",
  },
};

const state = {
  currentPage: 1,
  pageData: null,
  pageCache: new Map(),
  loadedFonts: new Set(),
  surahs: {},
  selection: null,
  selectionBeforePointerDown: null,
  pointerMoved: false,
  dragActive: false,
  previewTimer: null,
  fitRaf: null,
  queue: [],
  activePreviewTab: "front",
};

const els = {};

document.addEventListener("DOMContentLoaded", boot);

async function boot() {
  bindElements();
  bindEvents();
  setHighlightColor(els.highlightColor.value);
  state.queue = loadQueue();
  renderQueue();
  setStatus("Chargement du corpus...");
  try {
    const [manifest, surahs] = await Promise.all([
      fetchJson("data/manifest.json"),
      fetchJson("data/surahs.json"),
    ]);
    els.pageInput.max = String(manifest.page_count || LAST_PAGE);
    state.surahs = surahs || {};
    await loadPage(1);
    setStatus("Pret");
  } catch (error) {
    setError(error.message);
    els.mushafPage.innerHTML = '<div class="empty">Impossible de charger les donnees.</div>';
  }
}

function bindElements() {
  [
    "statusLine",
    "queueButton",
    "queueCount",
    "prevPage",
    "nextPage",
    "pageInput",
    "pageMeta",
    "mushafStage",
    "mushafPage",
    "selectionRange",
    "clearSelection",
    "errorType",
    "severity",
    "highlightColor",
    "cardLanguage",
    "notes",
    "addToCsv",
    "downloadCsv",
    "anchorPlan",
    "previewFront",
    "previewBack",
    "queueDialog",
    "closeQueue",
    "queueList",
    "clearQueue",
    "downloadCsvDialog",
  ].forEach((id) => {
    els[id] = document.getElementById(id);
  });
}

function bindEvents() {
  els.prevPage.addEventListener("click", () => loadPage(state.currentPage - 1));
  els.nextPage.addEventListener("click", () => loadPage(state.currentPage + 1));
  els.pageInput.addEventListener("change", () => loadPage(Number(els.pageInput.value)));
  els.clearSelection.addEventListener("click", clearSelection);
  els.highlightColor.addEventListener("input", () => {
    setHighlightColor(els.highlightColor.value);
    repaintSelection();
    queuePreview();
  });
  ["errorType", "severity", "cardLanguage", "notes"].forEach((id) => {
    els[id].addEventListener("input", queuePreview);
    els[id].addEventListener("change", queuePreview);
  });
  els.addToCsv.addEventListener("click", addCurrentCard);
  els.downloadCsv.addEventListener("click", downloadCsv);
  els.downloadCsvDialog.addEventListener("click", downloadCsv);
  els.queueButton.addEventListener("click", openQueue);
  els.closeQueue.addEventListener("click", () => els.queueDialog.close());
  els.clearQueue.addEventListener("click", clearQueue);

  document.querySelectorAll(".tab").forEach((tab) => {
    tab.addEventListener("click", () => setTab(tab.dataset.tab));
  });

  els.mushafPage.addEventListener("pointermove", (event) => {
    if (!state.dragActive) return;
    const wordEl = document.elementFromPoint(event.clientX, event.clientY)?.closest(".quran-word");
    if (!wordEl) return;
    const word = findWordById(Number(wordEl.dataset.id));
    if (word) extendSelection(word);
  });
  window.addEventListener("pointerup", () => {
    state.dragActive = false;
  });
  window.addEventListener("resize", () => {
    queueFitPage();
    queueFitRenderedPages();
  });
}

async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`HTTP ${response.status}: ${url}`);
  return response.json();
}

async function loadPage(page) {
  const next = clamp(Number(page) || 1, 1, Number(els.pageInput.max) || LAST_PAGE);
  setStatus(`Chargement page ${next}...`);
  try {
    const pageData = await getPage(next);
    await loadQcfFont(next);
    state.currentPage = next;
    state.pageData = pageData;
    state.selection = null;
    els.pageInput.value = String(next);
    renderPage(pageData);
    updateSelectionUi(false);
    queueFitPage();
    setStatus("Pret");
  } catch (error) {
    setError(error.message);
  }
}

async function getPage(page) {
  const key = Number(page);
  if (state.pageCache.has(key)) return state.pageCache.get(key);
  const pageData = await fetchJson(`data/pages/${String(key).padStart(3, "0")}.json`);
  state.pageCache.set(key, pageData);
  return pageData;
}

async function loadQcfFont(page) {
  const fontName = qcfFontName(page);
  if (state.loadedFonts.has(fontName)) return;
  const font = new FontFace(fontName, `url('${qcfFontUrl(page)}')`);
  font.display = "block";
  try {
    await font.load();
    document.fonts.add(font);
    state.loadedFonts.add(fontName);
  } catch (error) {
    console.warn(`Font ${fontName} unavailable`, error);
  }
}

function qcfFontName(page) {
  return `p${Number(page)}-v2`;
}

function qcfFontUrl(page) {
  return QCF_FONT_URL.replace("{page}", Number(page));
}

function renderPage(pageData) {
  const fontName = qcfFontName(pageData.page);
  els.pageMeta.textContent = `Page ${pageData.page} | ${pageData.lines.length} lignes | ${pageData.verse_range}`;
  els.mushafPage.innerHTML = "";
  els.mushafPage.style.setProperty("--qec-page-font", fontName);
  displayLines(pageData).forEach((line) => {
    const lineEl = document.createElement("div");
    lineEl.className = "quran-line";
    lineEl.dataset.line = String(line.line_number);
    if (line.kind === "header" || line.kind === "basmala") {
      lineEl.classList.add("quran-deco-line", line.kind === "header" ? "quran-surah-header" : "quran-basmala");
      lineEl.textContent = line.text;
      els.mushafPage.appendChild(lineEl);
      return;
    }
    if (!line.words.length) lineEl.classList.add("quran-line-empty");
    if (shouldCenterLine(pageData, line)) lineEl.classList.add("quran-line-centered");
    line.words.forEach((word) => {
      const wordEl = document.createElement("span");
      wordEl.className = "quran-word";
      wordEl.dataset.id = String(word.global_id);
      wordEl.dataset.line = String(word.line_number);
      wordEl.dataset.location = word.location;
      wordEl.innerHTML = word.code_v2 || escapeHtml(word.text_qpc_hafs || word.text || "");
      wordEl.title = readableLocation(word);
      wordEl.addEventListener("pointerdown", (event) => beginSelection(event, word));
      wordEl.addEventListener("click", (event) => {
        if (event.detail <= 1) finishClickSelection(word);
      });
      lineEl.appendChild(wordEl);
    });
    els.mushafPage.appendChild(lineEl);
  });
}

function displayLines(pageData) {
  const linesByNumber = new Map(pageData.lines.map((line) => [Number(line.line_number), { ...line, kind: "words" }]));
  const decorations = pageDecorations(pageData);
  const lines = [];
  for (let lineNo = 1; lineNo <= 15; lineNo += 1) {
    lines.push(linesByNumber.get(lineNo) || decorations.get(lineNo) || { kind: "empty", line_number: lineNo, words: [] });
  }
  return lines;
}

function pageDecorations(pageData) {
  const occupied = new Set(pageData.lines.map((line) => Number(line.line_number)));
  const decorations = new Map();
  pageData.lines.forEach((line) => {
    if (!line.words?.length) return;
    const first = line.words[0];
    const loc = parseVerseKey(first.verse_key);
    const pos = Number(first.position);
    if (!loc || loc.ayah !== 1 || pos !== 1 || loc.surah === 1) return;
    const lineNo = Number(line.line_number);
    if (loc.surah === 9) {
      const headerLine = lineNo - 1;
      if (headerLine >= 1 && headerLine <= 15 && !occupied.has(headerLine)) {
        decorations.set(headerLine, surahHeaderLine(headerLine, loc.surah));
      }
      return;
    }
    const headerLine = lineNo - 2;
    const basmalaLine = lineNo - 1;
    if (headerLine >= 1 && headerLine <= 15 && !occupied.has(headerLine)) {
      decorations.set(headerLine, surahHeaderLine(headerLine, loc.surah));
    }
    if (basmalaLine >= 1 && basmalaLine <= 15 && !occupied.has(basmalaLine)) {
      decorations.set(basmalaLine, { kind: "basmala", line_number: basmalaLine, words: [], text: BASMALA });
    }
  });
  return decorations;
}

function surahHeaderLine(lineNumber, surahNumber) {
  return { kind: "header", line_number: lineNumber, words: [], text: `\u0633\u0648\u0631\u0629 ${surahNumber}` };
}

function beginSelection(event, word) {
  event.preventDefault();
  state.selectionBeforePointerDown = state.selection ? { ...state.selection } : null;
  state.pointerMoved = false;
  state.dragActive = true;
  state.selection = { startId: Number(word.global_id), endId: Number(word.global_id) };
  repaintSelection();
  updateSelectionUi();
}

function extendSelection(word) {
  if (!state.dragActive || !state.selection) return;
  if (Number(word.global_id) !== Number(state.selection.startId)) {
    state.pointerMoved = true;
  }
  state.selection.endId = Number(word.global_id);
  repaintSelection();
  updateSelectionUi();
}

function finishClickSelection(word) {
  const previous = state.selectionBeforePointerDown;
  if (!state.pointerMoved && previous && previous.startId === previous.endId && previous.startId !== Number(word.global_id)) {
    state.selection = { startId: previous.startId, endId: Number(word.global_id) };
  } else if (!state.selection) {
    state.selection = { startId: Number(word.global_id), endId: Number(word.global_id) };
  } else if (state.selection.startId === state.selection.endId && state.selection.startId !== Number(word.global_id)) {
    state.selection.endId = Number(word.global_id);
  }
  state.dragActive = false;
  state.selectionBeforePointerDown = null;
  state.pointerMoved = false;
  repaintSelection();
  updateSelectionUi();
}

function repaintSelection() {
  const selected = normalizedSelection();
  document.querySelectorAll(".quran-highlight-fill").forEach((node) => node.remove());
  document.querySelectorAll(".quran-word").forEach((node) => {
    const id = Number(node.dataset.id);
    const inRange = selected && selected.start <= id && id <= selected.end;
    node.classList.toggle("selected", Boolean(inRange));
  });
  window.requestAnimationFrame(() => paintHighlightFills(document, ".quran-line", ".quran-word.selected", "quran-highlight-fill"));
}

function updateSelectionUi(refresh = true) {
  const selected = normalizedSelection();
  els.addToCsv.disabled = !selected;
  if (!selected || !state.pageData) {
    els.selectionRange.textContent = "Aucune selection";
    els.anchorPlan.textContent = "";
    els.previewFront.innerHTML = "";
    els.previewBack.innerHTML = "";
    return;
  }
  const words = wordsInSelection(selected);
  if (!words.length) return;
  const first = words[0];
  const last = words[words.length - 1];
  els.selectionRange.textContent = first.location === last.location ? readableLocation(first) : `${readableLocation(first)} -> ${readableLocation(last)}`;
  if (refresh) queuePreview();
}

function queuePreview() {
  window.clearTimeout(state.previewTimer);
  if (!normalizedSelection()) return;
  state.previewTimer = window.setTimeout(refreshPreview, 120);
}

async function refreshPreview() {
  try {
    const preview = await buildCurrentPreview();
    els.anchorPlan.textContent = preview.anchorPlan;
    els.previewFront.innerHTML = preview.front;
    els.previewBack.innerHTML = preview.back;
    setTab(state.activePreviewTab);
    queueFitRenderedPages();
  } catch (error) {
    setError(error.message);
  }
}

async function buildCurrentPreview() {
  const selected = normalizedSelection();
  if (!selected || !state.pageData) throw new Error("Selection vide.");
  return buildPreviewFromSelection(state.pageData, await getCorpusAccessor(), selectionFromUi(selected), { fields: false });
}

async function getCorpusAccessor() {
  return async (page) => getPage(page);
}

function selectionFromUi(selected) {
  return {
    page: state.currentPage,
    startId: selected.start,
    endId: selected.end,
    errorType: els.errorType.value.trim() || "Mot",
    severity: els.severity.value.trim() || "Difficile",
    highlightColor: normalizeHexColor(els.highlightColor.value),
    language: els.cardLanguage.value || "fr",
    notes: els.notes.value.trim(),
  };
}

async function buildPreviewFromSelection(pageData, getPageFn, selection, options = {}) {
  const firstWord = firstSelectedWord(pageData, selection);
  const location = parseLocation(firstWord);
  const lang = normalizeLanguage(selection.language);
  const surah = surahDisplayName(location.surah);
  const half = halfForWordInPage(pageData, firstWord);
  const unit = `${selection.page}${half}`;
  const [contextPage, contextHalf] = contextUnit(selection.page, half);
  const contextData = await getPageFn(contextPage);
  await Promise.all([loadQcfFont(contextPage), loadQcfFont(selection.page)]);
  const startId = Math.min(selection.startId, selection.endId);
  const endId = Math.max(selection.startId, selection.endId);
  const task = tr(lang, "task");
  const anchorPlan = anchorPlanText(selection.severity, lang);
  const errorRange = errorRangeText(pageData, selection, lang);
  const promptHtml = renderPageHtml(contextData, { half: contextHalf, highlightColor: selection.highlightColor });
  const answerHtml = renderPageHtml(pageData, { highlight: [startId, endId], highlightColor: selection.highlightColor });
  const metaFront = [surah, unit, selection.errorType, selection.severity].filter(Boolean);
  const metaBack = [surah, `Page ${selection.page}`, errorRange].filter(Boolean);
  const id = selectionKey(selection);
  const frontContent = cardContent({
    id,
    lang,
    dir: textDirection(lang),
    classes: "qec-front-card",
    meta: metaFront,
    body: `<div class="qec-task">${escapeHtml(task)}</div>${promptHtml}${selection.notes ? `<div class="qec-notes">${escapeHtml(selection.notes)}</div>` : ""}`,
  });
  const backContent = cardContent({
    id,
    lang,
    dir: textDirection(lang),
    classes: "qec-back-card",
    meta: metaBack,
    body: `${answerHtml}<div class="qec-anchor">${escapeHtml(anchorPlan)}</div>`,
  });

  if (options.fields) {
    return {
      id,
      front: `${cardFieldStyle()}${frontContent}${cardFitScript()}`,
      back: `${cardFieldStyle()}${backContent}${cardFitScript()}`,
      meta: { unit, surah, errorRange, errorType: selection.errorType, severity: selection.severity },
    };
  }
  return { id, front: frontContent, back: backContent, anchorPlan, meta: { unit, surah, errorRange } };
}

function cardContent({ id, lang, dir, classes, meta, body }) {
  return `<div class="qec-card ${classes}" lang="${escapeAttr(lang)}" dir="${escapeAttr(dir)}"><span style="display:none">QEC-ID:${escapeHtml(id)}</span><div class="qec-card-meta">${meta.map((item) => `<span>${escapeHtml(item)}</span>`).join("")}</div>${body}</div>`;
}

async function addCurrentCard() {
  try {
    const selected = normalizedSelection();
    if (!selected || !state.pageData) return;
    const card = await buildPreviewFromSelection(state.pageData, await getCorpusAccessor(), selectionFromUi(selected), { fields: true });
    const existingIndex = state.queue.findIndex((item) => item.id === card.id);
    if (existingIndex >= 0) {
      state.queue[existingIndex] = card;
      setStatus("Carte CSV mise a jour.");
    } else {
      state.queue.push(card);
      setStatus("Carte ajoutee au CSV.");
    }
    saveQueue();
    renderQueue();
  } catch (error) {
    setError(error.message);
  }
}

function loadQueue() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveQueue() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.queue));
}

function renderQueue() {
  els.queueCount.textContent = String(state.queue.length);
  els.downloadCsv.disabled = state.queue.length === 0;
  els.downloadCsvDialog.disabled = state.queue.length === 0;
  els.clearQueue.disabled = state.queue.length === 0;
  els.queueList.innerHTML = "";
  if (!state.queue.length) {
    els.queueList.innerHTML = '<div class="empty">Aucune carte en attente.</div>';
    return;
  }
  state.queue.forEach((item) => {
    const row = document.createElement("div");
    row.className = "queue-item";
    row.innerHTML = `<strong>${escapeHtml(item.meta.unit)} | ${escapeHtml(item.meta.surah)}</strong><span>${escapeHtml(item.meta.errorRange)}</span><span>${escapeHtml(item.meta.errorType)} | ${escapeHtml(item.meta.severity)}</span>`;
    const remove = document.createElement("button");
    remove.type = "button";
    remove.textContent = "Retirer";
    remove.addEventListener("click", () => {
      state.queue = state.queue.filter((card) => card.id !== item.id);
      saveQueue();
      renderQueue();
    });
    row.appendChild(remove);
    els.queueList.appendChild(row);
  });
}

function openQueue() {
  renderQueue();
  if (typeof els.queueDialog.showModal === "function") {
    els.queueDialog.showModal();
  }
}

function clearQueue() {
  state.queue = [];
  saveQueue();
  renderQueue();
  setStatus("File CSV videe.");
}

function downloadCsv() {
  if (!state.queue.length) return;
  const csv = buildCsv(state.queue);
  const blob = new Blob(["\ufeff", csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const stamp = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `qec-anki-mobile-${stamp}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  setStatus("CSV telecharge.");
}

function buildCsv(cards) {
  const lines = ["#separator:Comma", "#html:true", "#columns:Front,Back"];
  cards.forEach((card) => {
    lines.push(`${csvCell(card.front)},${csvCell(card.back)}`);
  });
  return `${lines.join("\n")}\n`;
}

function csvCell(value) {
  return `"${String(value).replaceAll('"', '""')}"`;
}

function cardFieldStyle() {
  return `<style>${cardCss()}</style>`;
}

function cardCss() {
  return `.card{margin:0;color:#e6ecec;background:#202326;font-family:Arial,sans-serif;font-size:18px}.qec-card{max-width:560px;margin:0 auto;padding:10px}.qec-card[dir=rtl]{direction:rtl}.qec-card-meta{display:flex;flex-wrap:wrap;gap:8px;justify-content:center;margin:0 0 12px;color:#d7dde0;font-size:13px}.qec-card-meta span{border:1px solid #56716f;border-radius:999px;padding:4px 9px;background:#23302f}.qec-task,.qec-anchor,.qec-notes{max-width:520px;margin:12px auto;color:#e6ecec;line-height:1.45;text-align:center}.qec-anchor{display:block;padding:12px;border:1px solid #56716f;border-radius:8px;background:#28302f;font-weight:650}.qec-page{--qec-page-width:min(92vw,430px,58vh);--quran-font-size:clamp(16px,3.2vh,27px);--qec-highlight-color:#ffd76a;--qec-highlight-text:#120c00;direction:rtl;display:grid;grid-template-rows:repeat(15,minmax(0,1fr));align-content:stretch;width:var(--qec-page-width);aspect-ratio:31/50;height:auto;margin:10px auto;padding:4.2% 4.8%;border:1px solid #d4c4aa;border-radius:8px;color:#111827!important;background:#fffaf0;box-shadow:0 2px 10px rgba(0,0,0,.18);overflow:hidden}.qec-line{position:relative;display:flex;direction:rtl;align-items:center;justify-content:space-between;gap:3px;width:100%;min-width:0;min-height:0;height:100%;overflow:hidden;text-align:center;white-space:nowrap;font-family:var(--qec-page-font),QEC-UthmanicHafs,serif;font-size:var(--quran-font-size);font-kerning:normal;font-synthesis:none;letter-spacing:0;line-height:1;text-rendering:optimizeLegibility;word-spacing:0}.qec-line-empty{visibility:hidden}.qec-line-centered{justify-content:center}.qec-deco-line{justify-content:center;color:#24303a!important;font-family:QEC-UthmanicHafs,serif}.qec-surah-header{border-top:1px solid rgba(97,72,38,.28);border-bottom:1px solid rgba(97,72,38,.28);font-size:calc(var(--quran-font-size)*.66);font-weight:700}.qec-basmala{font-size:calc(var(--quran-font-size)*.62)}.qec-word{position:relative;z-index:1;display:inline-block;color:#111827!important;letter-spacing:0;padding:0 1px;word-spacing:0}.qec-word-hidden{visibility:hidden;pointer-events:none}.qec-highlight{border-radius:0;color:var(--qec-highlight-text)!important;background:transparent;box-shadow:none}.qec-highlight-fill{position:absolute;z-index:0;pointer-events:none;border-radius:5px;background:var(--qec-highlight-color);box-shadow:none}@media(max-width:620px){.qec-card{padding:10px}.qec-page{--qec-page-width:min(94vw,390px,56vh);padding:4% 4.4%}}`;
}

function cardFitScript() {
  return `<script>(function(){function n(e){return parseFloat(e)||0}function h(root){(root||document).querySelectorAll(".qec-highlight-fill").forEach(function(e){e.remove()});(root||document).querySelectorAll(".qec-line").forEach(function(line){var words=[].slice.call(line.querySelectorAll(".qec-highlight"));if(!words.length)return;var groups=[];var current=[];words.forEach(function(word){if(current.length&&current[current.length-1].nextElementSibling!==word){groups.push(current);current=[]}current.push(word)});if(current.length)groups.push(current);var lr=line.getBoundingClientRect();groups.forEach(function(group){var left=Infinity,right=-Infinity,top=Infinity,bottom=-Infinity;group.forEach(function(word){var r=word.getBoundingClientRect();left=Math.min(left,r.left);right=Math.max(right,r.right);top=Math.min(top,r.top);bottom=Math.max(bottom,r.bottom)});var fill=document.createElement("span");fill.className="qec-highlight-fill";fill.style.left=(left-lr.left-2)+"px";fill.style.top=(top-lr.top)+"px";fill.style.width=(right-left+4)+"px";fill.style.height=(bottom-top)+"px";line.insertBefore(fill,line.firstChild)})})}function f(r){var p=(r||document).querySelectorAll(".qec-page");p.forEach(function(page){if(!page.clientWidth||!page.clientHeight)return;var cs=getComputedStyle(page);var inner=page.clientHeight-n(cs.paddingTop)-n(cs.paddingBottom);var row=inner/15;var size=Math.max(12,Math.min(30,row*.74));page.style.setProperty("--quran-font-size",size+"px");var lines=[].slice.call(page.querySelectorAll(".qec-line:not(.qec-line-empty):not(.qec-deco-line)"));for(var i=0;i<8;i++){var ratio=1;lines.forEach(function(line){ratio=Math.max(ratio,line.scrollWidth/Math.max(1,line.clientWidth))});if(ratio<=1.01)break;size=Math.max(10,Math.floor(size/ratio*.98));page.style.setProperty("--quran-font-size",size+"px")}h(page)})}function run(){f(document)}if(document.fonts&&document.fonts.ready){document.fonts.ready.then(function(){requestAnimationFrame(run);setTimeout(run,120)})}else{setTimeout(run,50)}window.addEventListener("resize",run)})();</script>`;
}

function renderPageHtml(pageData, { half = null, highlight = null, highlightColor = DEFAULT_HIGHLIGHT_COLOR } = {}) {
  const pageNo = Number(pageData.page);
  const fontName = qcfFontName(pageNo);
  const style = pageFontStyle(pageNo);
  const color = normalizeHexColor(highlightColor);
  const startId = highlight ? Math.min(Number(highlight[0]), Number(highlight[1])) : null;
  const endId = highlight ? Math.max(Number(highlight[0]), Number(highlight[1])) : null;
  const visibleOrders = half ? visibleWordOrdersForHalf(pageData, half) : null;
  const visibleLines = half ? visibleLineNumbersForHalf(pageData, half) : null;
  const classes = ["qec-page"];
  if (half) classes.push("qec-half-page");
  let output = `${style}<div class="${classes.join(" ")}" dir="rtl" data-page="${pageNo}" style="--qec-page-font:${fontName};--qec-highlight-color:${color};">`;
  displayLines(pageData).forEach((line) => {
    const lineNo = Number(line.line_number);
    if (visibleLines && !visibleLines.has(lineNo)) {
      output += `<div class="qec-line qec-line-empty" data-line="${lineNo}"></div>`;
      return;
    }
    if (line.kind === "header" || line.kind === "basmala") {
      output += `<div class="qec-line qec-deco-line ${line.kind === "header" ? "qec-surah-header" : "qec-basmala"}" data-line="${lineNo}">${escapeHtml(line.text)}</div>`;
      return;
    }
    const lineClasses = ["qec-line"];
    const visibleWords = (line.words || []).filter((word) => !visibleOrders || visibleOrders.has(wordOrder(word)));
    if (!visibleWords.length) lineClasses.push("qec-line-empty");
    if (shouldCenterLine(pageData, line)) lineClasses.push("qec-line-centered");
    output += `<div class="${lineClasses.join(" ")}" data-line="${lineNo}">`;
    (line.words || []).forEach((word) => {
      const visible = !visibleOrders || visibleOrders.has(wordOrder(word));
      const id = Number(word.global_id);
      const wordClasses = ["qec-word"];
      if (!visible) wordClasses.push("qec-word-hidden");
      if (visible && startId !== null && startId <= id && id <= endId) wordClasses.push("qec-highlight");
      output += `<span class="${wordClasses.join(" ")}" data-id="${id}" data-location="${escapeAttr(word.location || "")}">${escapeHtml(word.code_v2 || word.text_qpc_hafs || word.text || "")}</span>`;
    });
    output += "</div>";
  });
  output += "</div>";
  return output;
}

function pageFontStyle(page) {
  const pageNo = Number(page);
  const qcfName = qcfFontName(pageNo);
  return `<style>@font-face{font-family:${qcfName};src:url('${qcfFontUrl(pageNo)}') format('woff2');font-display:block}@font-face{font-family:QEC-UthmanicHafs;src:url('${UTHMANIC_FONT_URL}') format('woff2');font-display:swap}</style>`;
}

function queueFitPage() {
  window.cancelAnimationFrame(state.fitRaf);
  state.fitRaf = window.requestAnimationFrame(fitPageToStage);
}

function fitPageToStage() {
  if (!state.pageData) return;
  const stage = els.mushafStage;
  const page = els.mushafPage;
  const availableWidth = Math.max(260, stage.clientWidth - 16);
  const idealWidth = Math.min(430, availableWidth);
  page.style.width = `${Math.floor(idealWidth)}px`;
  const contentHeight = page.clientHeight - parseFloat(getComputedStyle(page).paddingTop) * 2;
  const rowHeight = contentHeight / 15;
  let fontSize = Math.max(12, Math.min(34, rowHeight * 0.74));
  page.style.setProperty("--quran-font-size", `${fontSize}px`);
  shrinkOverflowingLines(page, fontSize, ".quran-line:not(.quran-line-empty):not(.quran-deco-line)");
}

function shrinkOverflowingLines(page, initialFontSize, selector) {
  const lines = [...page.querySelectorAll(selector)];
  let fontSize = initialFontSize;
  for (let attempt = 0; attempt < 7; attempt += 1) {
    let ratio = 1;
    lines.forEach((line) => {
      ratio = Math.max(ratio, line.scrollWidth / Math.max(1, line.clientWidth));
    });
    if (ratio <= 1.01) break;
    fontSize = Math.max(10, Math.floor((fontSize / ratio) * 0.98));
    page.style.setProperty("--quran-font-size", `${fontSize}px`);
  }
  paintHighlightFills(page, ".quran-line", ".quran-word.selected", "quran-highlight-fill");
}

function queueFitRenderedPages(root = document) {
  const fit = () => window.requestAnimationFrame(() => fitRenderedPages(root));
  if (document.fonts?.ready) document.fonts.ready.then(fit);
  window.setTimeout(fit, 160);
}

function fitRenderedPages(root = document) {
  root.querySelectorAll(".qec-page").forEach((page) => {
    if (page.clientWidth < 20 || page.clientHeight < 20) return;
    const styles = window.getComputedStyle(page);
    const innerHeight = page.clientHeight - parseFloat(styles.paddingTop) - parseFloat(styles.paddingBottom);
    const rowHeight = innerHeight / 15;
    let fontSize = Math.max(12, Math.min(30, rowHeight * 0.74));
    page.style.setProperty("--quran-font-size", `${fontSize}px`);
    shrinkOverflowingLines(page, fontSize, ".qec-line:not(.qec-line-empty):not(.qec-deco-line)");
    paintHighlightFills(page, ".qec-line", ".qec-highlight", "qec-highlight-fill");
  });
}

function paintHighlightFills(root, lineSelector, wordSelector, fillClass) {
  root.querySelectorAll(`.${fillClass}`).forEach((node) => node.remove());
  root.querySelectorAll(lineSelector).forEach((line) => {
    const selectedWords = [...line.querySelectorAll(wordSelector)];
    if (!selectedWords.length) return;
    const groups = [];
    let current = [];
    selectedWords.forEach((word) => {
      if (current.length && current[current.length - 1].nextElementSibling !== word) {
        groups.push(current);
        current = [];
      }
      current.push(word);
    });
    if (current.length) groups.push(current);
    const lineRect = line.getBoundingClientRect();
    groups.forEach((group) => {
      const rects = group.map((word) => word.getBoundingClientRect());
      const left = Math.min(...rects.map((rect) => rect.left));
      const right = Math.max(...rects.map((rect) => rect.right));
      const top = Math.min(...rects.map((rect) => rect.top));
      const bottom = Math.max(...rects.map((rect) => rect.bottom));
      const fill = document.createElement("span");
      fill.className = fillClass;
      fill.style.left = `${left - lineRect.left - 2}px`;
      fill.style.top = `${top - lineRect.top}px`;
      fill.style.width = `${right - left + 4}px`;
      fill.style.height = `${bottom - top}px`;
      line.insertBefore(fill, line.firstChild);
    });
  });
}

function setTab(tabName) {
  state.activePreviewTab = tabName || "front";
  document.querySelectorAll(".tab").forEach((tab) => tab.classList.toggle("active", tab.dataset.tab === state.activePreviewTab));
  els.previewFront.classList.toggle("active", state.activePreviewTab === "front");
  els.previewBack.classList.toggle("active", state.activePreviewTab === "back");
  queueFitRenderedPages();
}

function halfForLine(lineNumber) {
  return Number(lineNumber) <= 7 ? "A" : "B";
}

function wordLineNumbers(pageData) {
  return pageData.lines.filter((line) => line.words?.length).map((line) => Number(line.line_number)).sort((a, b) => a - b);
}

function usesContentHalfSplit(pageData) {
  const lines = wordLineNumbers(pageData);
  if (lines.length < 4) return false;
  const topCount = lines.filter((line) => halfForLine(line) === "A").length;
  return Math.min(topCount, lines.length - topCount) < 3;
}

function splitStartLine(pageData) {
  if (!usesContentHalfSplit(pageData)) return 8;
  const lines = wordLineNumbers(pageData);
  const splitAt = Math.ceil(lines.length / 2);
  return splitAt >= lines.length ? 16 : lines[splitAt];
}

function wordHasRecitableStop(word) {
  if (word.char_type === "end") return true;
  const text = String(word.text_qpc_hafs || word.text || "");
  return STOP_MARKS.some((mark) => text.includes(mark));
}

function iterWords(pageData) {
  return pageData.lines.flatMap((line) => line.words || []);
}

function wordOrder(word) {
  return Number(word.order || word.global_id || 0);
}

function halfBoundaryWordIndex(pageData) {
  const words = iterWords(pageData);
  if (words.length < 2) return words.length ? 0 : null;
  const startLine = splitStartLine(pageData);
  const targetStart = words.findIndex((word) => Number(word.line_number) >= startLine);
  const targetIndex = targetStart === -1 ? words.length : targetStart;
  const ideal = Math.max(0, Math.min(words.length - 2, targetIndex - 1));
  const candidates = words.slice(0, -1).map((word, index) => ({ word, index })).filter(({ word }) => wordHasRecitableStop(word)).map(({ index }) => index);
  if (!candidates.length) return ideal;
  return candidates.reduce((best, index) => {
    const bestScore = [Math.abs(best - ideal), best >= ideal ? 0 : 1];
    const score = [Math.abs(index - ideal), index >= ideal ? 0 : 1];
    return score[0] < bestScore[0] || (score[0] === bestScore[0] && score[1] < bestScore[1]) ? index : best;
  }, candidates[0]);
}

function halfForWordInPage(pageData, word) {
  const boundary = halfBoundaryWordIndex(pageData);
  const words = iterWords(pageData);
  if (boundary === null) return halfForLine(word.line_number);
  return wordOrder(word) <= wordOrder(words[boundary]) ? "A" : "B";
}

function visibleWordOrdersForHalf(pageData, half) {
  const boundary = halfBoundaryWordIndex(pageData);
  const words = iterWords(pageData);
  if (boundary === null) return new Set();
  const selected = half === "A" ? words.slice(0, boundary + 1) : words.slice(boundary + 1);
  return new Set(selected.map(wordOrder));
}

function visibleLineNumbersForHalf(pageData, half) {
  const orders = visibleWordOrdersForHalf(pageData, half);
  const visible = new Set();
  pageData.lines.forEach((line) => {
    if ((line.words || []).some((word) => orders.has(wordOrder(word)))) visible.add(Number(line.line_number));
  });
  if (!visible.size) return visible;
  const first = Math.min(...visible);
  const last = Math.max(...visible);
  pageDecorations(pageData).forEach((_, lineNo) => {
    if ((first <= lineNo && lineNo <= last) || (first - 2 <= lineNo && lineNo < first)) visible.add(lineNo);
  });
  return visible;
}

function contextUnit(page, half) {
  if (half === "B") return [page, "A"];
  if (page <= 1) return [1, "A"];
  return [page - 1, "B"];
}

function normalizedSelection() {
  if (!state.selection) return null;
  return { start: Math.min(state.selection.startId, state.selection.endId), end: Math.max(state.selection.startId, state.selection.endId) };
}

function wordsInSelection(selected) {
  return iterWords(state.pageData).filter((word) => selected.start <= Number(word.global_id) && Number(word.global_id) <= selected.end);
}

function selectedWords(pageData, selection) {
  const start = Math.min(selection.startId, selection.endId);
  const end = Math.max(selection.startId, selection.endId);
  return iterWords(pageData).filter((word) => start <= Number(word.global_id) && Number(word.global_id) <= end);
}

function firstSelectedWord(pageData, selection) {
  const words = selectedWords(pageData, selection);
  if (!words.length) throw new Error("La selection ne contient aucun mot.");
  return words[0];
}

function findWordById(id) {
  return iterWords(state.pageData).find((word) => Number(word.global_id) === Number(id));
}

function parseVerseKey(verseKey) {
  const [surah, ayah] = String(verseKey || "").split(":").map(Number);
  if (!Number.isFinite(surah) || !Number.isFinite(ayah)) return null;
  return { surah, ayah };
}

function parseLocation(word) {
  const key = parseVerseKey(word.verse_key) || { surah: 0, ayah: 0 };
  const isEnd = word.char_type === "end" || String(word.position).toLowerCase() === "end";
  return { surah: key.surah, ayah: key.ayah, position: isEnd ? null : Number(word.position), isEnd };
}

function readableLocation(word) {
  return String(word.location || "").replace(/:end$/, ":fin");
}

function surahDisplayName(number) {
  return state.surahs[String(number)] || `Surah ${number}`;
}

function errorRangeText(pageData, selection, lang) {
  const words = selectedWords(pageData, selection);
  const first = parseLocation(words[0]);
  const last = parseLocation(words[words.length - 1]);
  const surah = surahDisplayName(first.surah);
  const pos = (loc) => loc.isEnd || loc.position === null ? tr(lang, "ayahEnd") : String(loc.position);
  if (first.surah === last.surah && first.ayah === last.ayah) {
    if (first.position === last.position || last.position === null) {
      return format(tr(lang, "rangeSame"), { surah, ayah: first.ayah, pos: pos(first) });
    }
    return format(tr(lang, "rangeSameWords"), { surah, ayah: first.ayah, start: pos(first), end: pos(last) });
  }
  return format(tr(lang, "rangeAcross"), { surah, from: `${first.surah}:${first.ayah} ${pos(first)}`, to: `${last.surah}:${last.ayah} ${pos(last)}` });
}

function anchorPlanText(severity, lang) {
  const bucket = severityBucket(severity);
  const reps = bucket === "repeated" ? [5, 3] : bucket === "forgotten" ? [3, 2] : [2, 1];
  return format(tr(lang, "anchor"), { window: reps[0], half: reps[1] });
}

function severityBucket(value) {
  const normalized = normalizeText(value);
  if (["repete", "repeated", "repete", "repetido"].includes(normalized)) return "repeated";
  if (["oublie", "forgotten", "again", "olvidado"].includes(normalized)) return "forgotten";
  return "difficult";
}

function selectionKey(selection) {
  const start = Math.min(selection.startId, selection.endId);
  const end = Math.max(selection.startId, selection.endId);
  return `QEC-${String(selection.page).padStart(3, "0")}-${start}-${end}`;
}

function shouldCenterLine(pageData, line) {
  return pageData.lines.length < 10 || (line.words || []).length <= 4;
}

function setHighlightColor(color) {
  const normalized = normalizeHexColor(color);
  els.highlightColor.value = normalized;
  document.documentElement.style.setProperty("--qec-highlight-color", normalized);
}

function normalizeHexColor(color) {
  const value = String(color || "").trim();
  if (/^#[0-9a-fA-F]{6}$/.test(value)) return value.toLowerCase();
  if (/^#[0-9a-fA-F]{3}$/.test(value)) return `#${[...value.slice(1)].map((char) => char + char).join("")}`.toLowerCase();
  return DEFAULT_HIGHLIGHT_COLOR;
}

function normalizeLanguage(lang) {
  return ["fr", "en", "ar"].includes(lang) ? lang : "fr";
}

function textDirection(lang) {
  return lang === "ar" ? "rtl" : "ltr";
}

function tr(lang, key) {
  return (STRINGS[normalizeLanguage(lang)] || STRINGS.fr)[key] || STRINGS.fr[key] || key;
}

function format(template, params) {
  return String(template).replace(/\{(\w+)\}/g, (_, key) => (params[key] == null ? "" : String(params[key])));
}

function normalizeText(value) {
  return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
}

function clearSelection() {
  state.selection = null;
  repaintSelection();
  updateSelectionUi(false);
  setStatus("Selection effacee.");
}

function setStatus(message) {
  els.statusLine.classList.remove("error");
  els.statusLine.textContent = message;
}

function setError(message) {
  els.statusLine.classList.add("error");
  els.statusLine.textContent = message;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function escapeHtml(value) {
  return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}

function escapeAttr(value) {
  return escapeHtml(value);
}
