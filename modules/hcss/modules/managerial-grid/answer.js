/* answer.js — 手机答题页逻辑（管理方格测评） */
let displayOrder = [];

document.addEventListener('DOMContentLoaded', () => {
  // token 直达结果
  const token = new URLSearchParams(location.search).get('token');
  if (token) {
    loadResultByToken(token);
    return;
  }
  shuffleOptions();
  renderQuiz();
});

function shuffleOptions() {
  displayOrder = GridCore.QUESTIONS.map(q => {
    const arr = q.options.map((_, j) => j);
    for (let k = arr.length - 1; k > 0; k--) {
      const r = Math.floor(Math.random() * (k + 1));
      [arr[k], arr[r]] = [arr[r], arr[k]];
    }
    return arr;
  });
}

function renderQuiz() {
  const qz = document.getElementById('quiz');
  qz.innerHTML = '';
  GridCore.QUESTIONS.forEach((q, i) => {
    const card = document.createElement('div'); card.className = 'quiz-card';
    const head = document.createElement('div'); head.className = 'qhead';
    head.innerHTML = `<span class="qnum">Q${i+1}</span><span class="qtitle">${escapeHtml(q.q)}</span>`;
    card.appendChild(head);
    const order = displayOrder[i];
    order.forEach((origIdx, pos) => {
      const o = q.options[origIdx];
      const letter = String.fromCharCode(65 + pos);
      const dispText = o.text.replace(/^[A-E]\.\s*/, letter + '. ');
      const lab = document.createElement('label'); lab.className = 'opt';
      lab.innerHTML = `<input type="radio" name="q${i}" value="${origIdx}">${escapeHtml(dispText)}`;
      lab.querySelector('input').addEventListener('change', () => {
        card.querySelectorAll('.opt').forEach(x => x.classList.remove('sel'));
        lab.classList.add('sel');
      });
      card.appendChild(lab);
    });
    qz.appendChild(card);
  });
}

async function submitQuiz() {
  const nameEl = document.getElementById('participantName');
  const name = (nameEl.value || '').trim();
  if (!name) {
    showMsg('请先填写姓名（必填项）后再提交', 'err');
    nameEl.focus();
    nameEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return;
  }
  const answers = [];
  for (let i = 0; i < GridCore.QUESTIONS.length; i++) {
    const sel = document.querySelector(`input[name="q${i}"]:checked`);
    if (!sel) { alert('请先完成全部 10 道题（第 ' + (i+1) + ' 题未选）'); return; }
    answers.push(+sel.value);
  }
  const btn = document.querySelector('#submitBar .btn');
  btn.disabled = true; btn.textContent = '提交中…';
  try {
    const { token, result } = await QuizStore.submitQuiz(answers, name);
    renderResult(result);
    showTokenShare(token);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } catch (e) {
    showMsg('提交失败：' + e.message, 'err');
  } finally {
    btn.disabled = false; btn.textContent = '提交并查看结果';
  }
}

function renderResult(s) {
  document.getElementById('pVal').textContent = s.P;
  document.getElementById('hVal').textContent = s.H;
  document.getElementById('pBar').style.width = (s.P/90*100) + '%';
  document.getElementById('hBar').style.width = (s.H/90*100) + '%';
  const pB = document.getElementById('pTier'); pB.className = 'badge b-' + s.pt; pB.textContent = GridCore.tierLabel(s.pt);
  const hB = document.getElementById('hTier'); hB.className = 'badge b-' + s.ht; hB.textContent = GridCore.tierLabel(s.ht);
  document.getElementById('typeName').textContent = s.type;
  document.getElementById('coordTxt').textContent = `方格坐标：( ${s.pc.toFixed(1)}, ${s.hc.toFixed(1)} )`;
  document.getElementById('typeDesc').textContent = s.desc;
  renderGrid(s.pc, s.hc);
  document.getElementById('adviceTitle').textContent = '针对你偏弱维度的改善建议 · ' + s.weak;
  document.getElementById('adviceBody').innerHTML = '<ol>' + s.advice.map(a => `<li>${escapeHtml(a)}</li>`).join('') + '</ol>';
  document.getElementById('quizView').style.display = 'none';
  document.getElementById('submitBar').style.display = 'none';
  document.getElementById('quizResult').style.display = 'block';
}

function renderGrid(pc, hc) {
  const S = 300, pad = 34, unit = 30;
  const X = v => pad + (v - 1) * unit;
  const Y = v => pad + (9 - v) * unit;
  const arch = {"(1,9)":[1,9],"(9,1)":[9,1],"(1,1)":[1,1],"(5,5)":[5,5],"(9,9)":[9,9]};
  const colors = {"(9,9)":"#3fb950","(9,1)":"#f85149","(1,9)":"#58a6ff","(5,5)":"#bc8cff","(1,1)":"#6e7681"};
  let g = '';
  for (let k = 1; k <= 9; k++) {
    g += `<line x1="${X(k)}" y1="${Y(9)}" x2="${X(k)}" y2="${Y(1)}" stroke="#2b3340" stroke-width="1"/>`;
    g += `<line x1="${X(1)}" y1="${Y(k)}" x2="${X(9)}" y2="${Y(k)}" stroke="#2b3340" stroke-width="1"/>`;
  }
  g += `<text x="${X(5)}" y="${S-4}" fill="#9aa7b4" font-size="11" text-anchor="middle">关心生产 →</text>`;
  g += `<text x="10" y="${Y(5)}" fill="#9aa7b4" font-size="11" text-anchor="middle" transform="rotate(-90 10 ${Y(5)})">关心人 ↑</text>`;
  for (const k in arch) {
    const [a, b] = arch[k];
    g += `<circle cx="${X(a)}" cy="${Y(b)}" r="4" fill="${colors[k]}" opacity="0.85"/>`;
    g += `<text x="${X(a)+7}" y="${Y(b)-7}" fill="${colors[k]}" font-size="10">${k}</text>`;
  }
  g += `<circle cx="${X(pc)}" cy="${Y(hc)}" r="7" fill="#fff" stroke="#e3b341" stroke-width="3"/>`;
  document.getElementById('svgWrap').innerHTML = `<svg width="${S}" height="${S}" viewBox="0 0 ${S} ${S}" style="background:var(--panel);border:1px solid rgba(255,255,255,.08);border-radius:10px">${g}</svg>`;
}

function showTokenShare(token) {
  const link = location.origin + location.pathname + '?token=' + token;
  document.getElementById('shareLink').href = link;
  document.getElementById('shareLink').textContent = link;
  const c = document.getElementById('qrWrap'); c.innerHTML = '';
  try {
    const qr = qrcode(0, 'M');
    qr.addData(link); qr.make();
    const img = document.createElement('img');
    img.src = qr.createDataURL(6, 10);
    c.appendChild(img);
  } catch (e) { c.textContent = '二维码生成失败'; }
}

async function loadResultByToken(token) {
  document.getElementById('quizView').style.display = 'none';
  document.getElementById('submitBar').style.display = 'none';
  const rv = document.getElementById('resultView');
  rv.style.display = 'block';
  rv.innerHTML = '<div class="tool-card"><p class="tip">正在加载结果…</p></div>';
  try {
    const data = await QuizStore.getResultByToken(token);
    rv.innerHTML = '';
    document.getElementById('quizResult').style.display = 'block';
    renderResult(data);
    showTokenShare(token);
  } catch (e) {
    rv.innerHTML = `<div class="tool-card"><div class="msg err">加载失败：${escapeHtml(e.message)}</div></div>`;
  }
}

function showMsg(text, type) {
  document.getElementById('msgBox').innerHTML = `<div class="msg ${type}">${escapeHtml(text)}</div>`;
}
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
