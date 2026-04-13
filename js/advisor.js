/**
 * INTELIS Advisor – Frontend logic
 * Handles form state, API streaming, and markdown rendering.
 */

import { initNav } from './nav.js';
import { initAnimations } from './animations.js';

// ── State ─────────────────────────────────────────────────────────────────────
let investmentType = 'residential';
const selectedZones = new Set();
let lastPayload = null;

// ── Init ──────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initNav();
  initAnimations();
  initTypePills();
  initZoneChips();
  initForm();
});

// ── Type pills ────────────────────────────────────────────────────────────────
function initTypePills() {
  document.querySelectorAll('.advisor-pill').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.advisor-pill').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      investmentType = btn.dataset.type;
    });
  });
}

// ── Zone chips ────────────────────────────────────────────────────────────────
function initZoneChips() {
  document.querySelectorAll('.zone-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const zone = chip.dataset.zone;
      if (selectedZones.has(zone)) {
        selectedZones.delete(zone);
        chip.classList.remove('selected');
      } else {
        selectedZones.add(zone);
        chip.classList.add('selected');
      }
    });
  });
}

// ── Form ──────────────────────────────────────────────────────────────────────
function initForm() {
  const submitBtn = document.getElementById('advisor-submit');
  const retryBtn  = document.getElementById('retry-btn');

  submitBtn.addEventListener('click', handleSubmit);
  retryBtn.addEventListener('click', () => {
    if (lastPayload) streamAdvisorQuery(lastPayload);
  });
}

function handleSubmit() {
  const budgetInput  = document.getElementById('budget-input');
  const currencyEl   = document.getElementById('currency-select');
  const budgetError  = document.getElementById('budget-error');
  const budget       = parseFloat(budgetInput.value);

  if (!budget || budget < 100000) {
    budgetError.hidden = false;
    budgetInput.focus();
    return;
  }
  budgetError.hidden = true;

  const payload = {
    investmentType,
    zones: [...selectedZones],
    budget,
    currency: currencyEl.value,
  };

  lastPayload = payload;
  streamAdvisorQuery(payload);
}

// ── Streaming ─────────────────────────────────────────────────────────────────
async function streamAdvisorQuery(payload) {
  showResults('loading');

  let response;
  try {
    response = await fetch('/api/advisor', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch {
    showResults('error', 'No se pudo conectar con el servidor. Asegúrate de que el servidor esté corriendo.');
    return;
  }

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    showResults('error', body.error || `Error del servidor (${response.status}).`);
    return;
  }

  showResults('streaming');

  const resultsEl = document.getElementById('results-content');
  resultsEl.innerHTML = '';

  let fullText = '';
  const reader  = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer    = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop(); // keep incomplete line in buffer

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        try {
          const data = JSON.parse(line.slice(6));

          if (data.type === 'text') {
            fullText += data.text;
            resultsEl.innerHTML = renderMarkdown(fullText) + '<span class="streaming-cursor"></span>';
          }

          if (data.type === 'done') {
            resultsEl.innerHTML = renderMarkdown(fullText);
            initAnimations(); // re-activate reveal elements in results
          }

          if (data.type === 'error') {
            showResults('error', data.message);
            return;
          }
        } catch {
          // ignore malformed SSE lines
        }
      }
    }
  } catch {
    showResults('error', 'La conexión fue interrumpida. Intenta de nuevo.');
  }
}

// ── UI state ──────────────────────────────────────────────────────────────────
function showResults(state, errorMsg) {
  const section  = document.getElementById('results-section');
  const loading  = document.getElementById('results-loading');
  const content  = document.getElementById('results-content');
  const error    = document.getElementById('results-error');
  const errorTxt = document.getElementById('error-message');

  section.hidden  = false;
  loading.hidden  = true;
  content.hidden  = true;
  error.hidden    = true;

  if (state === 'loading') {
    loading.hidden = false;
    section.scrollIntoView({ behavior: 'smooth', block: 'start' });
  } else if (state === 'streaming') {
    content.hidden = false;
    section.scrollIntoView({ behavior: 'smooth', block: 'start' });
  } else if (state === 'error') {
    error.hidden  = false;
    if (errorMsg && errorTxt) errorTxt.textContent = errorMsg;
    section.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

// ── Markdown renderer (no external deps) ─────────────────────────────────────
function renderMarkdown(text) {
  // Escape HTML in raw text blocks (safety)
  const lines = text.split('\n');
  const html  = [];
  let inList  = false;
  let inTable = false;
  let tableRows = [];

  const flushList = () => {
    if (inList) { html.push('</ul>'); inList = false; }
  };
  const flushTable = () => {
    if (!inTable) return;
    inTable = false;
    if (tableRows.length < 2) { tableRows = []; return; }

    const headCells = parseTableRow(tableRows[0]);
    const bodyRows  = tableRows.slice(2); // skip separator row
    let t = '<div class="advisor-table-wrap"><table><thead><tr>';
    headCells.forEach(c => { t += `<th>${c}</th>`; });
    t += '</tr></thead><tbody>';
    bodyRows.forEach(row => {
      const cells = parseTableRow(row);
      if (cells.every(c => !c.trim())) return;
      t += '<tr>';
      cells.forEach(c => { t += `<td>${inlineFormat(c)}</td>`; });
      t += '</tr>';
    });
    t += '</tbody></table></div>';
    html.push(t);
    tableRows = [];
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Table row
    if (line.trim().startsWith('|')) {
      flushList();
      inTable = true;
      tableRows.push(line);
      continue;
    } else {
      flushTable();
    }

    // H2
    const h2 = line.match(/^## (.+)/);
    if (h2) { flushList(); html.push(`<h2>${inlineFormat(h2[1])}</h2>`); continue; }

    // H3
    const h3 = line.match(/^### (.+)/);
    if (h3) { flushList(); html.push(`<h3>${inlineFormat(h3[1])}</h3>`); continue; }

    // H4
    const h4 = line.match(/^#### (.+)/);
    if (h4) { flushList(); html.push(`<h4>${inlineFormat(h4[1])}</h4>`); continue; }

    // List item
    const li = line.match(/^[-*] (.+)/);
    if (li) {
      if (!inList) { html.push('<ul>'); inList = true; }
      html.push(`<li>${inlineFormat(li[1])}</li>`);
      continue;
    }

    // Numbered list
    const oli = line.match(/^\d+\. (.+)/);
    if (oli) {
      if (!inList) { html.push('<ul class="advisor-ol">'); inList = true; }
      html.push(`<li>${inlineFormat(oli[1])}</li>`);
      continue;
    }

    // Blank line
    if (!line.trim()) {
      flushList();
      continue;
    }

    // Paragraph
    flushList();
    html.push(`<p>${inlineFormat(line)}</p>`);
  }

  flushList();
  flushTable();

  return html.join('\n');
}

function inlineFormat(text) {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g,     '<em>$1</em>')
    .replace(/`(.+?)`/g,       '<code>$1</code>')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
}

function parseTableRow(row) {
  return row.split('|').slice(1, -1).map(c => c.trim());
}
