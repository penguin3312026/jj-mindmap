/* quiz-store.js — 管理方格测评 · Supabase 存储适配器（纯 REST，无 SDK / 无 CDN）
 * 依赖：window.QUIZ_CONFIG、window.GridCore（grid-core.js 已先加载）
 * 提供：scoreByIndices / submitQuiz / getResultByToken / getHostData / clearAll
 */
(function () {
  const C = window.QUIZ_CONFIG;
  const URL = C.SUPABASE_URL, KEY = C.SUPABASE_ANON_KEY;

  function headers(extra) {
    return Object.assign({
      'apikey': KEY,
      'Authorization': 'Bearer ' + KEY,
      'Content-Type': 'application/json'
    }, extra || {});
  }

  // 本地算分：与后端 score_by_indices 完全一致（复用 grid-core）
  function scoreByIndices(indices) {
    const G = window.GridCore;
    let P = 0, H = 0; const picks = [];
    for (let qi = 0; qi < G.QUESTIONS.length; qi++) {
      const idx = indices[qi]; picks.push(idx);
      P += G.QUESTIONS[qi].options[idx].p;
      H += G.QUESTIONS[qi].options[idx].h;
    }
    const pc = G.coordOf(P), hc = G.coordOf(H);
    const pt = G.tier(P), ht = G.tier(H);
    const tn = G.typeNameOf(pc, hc);
    const combo = G.COMBOS[pt + '-' + ht];
    return {
      P, H, pc, hc, pt, ht, type: tn,
      desc: G.typeDescOf(tn),
      weak: combo ? combo.lower : '',
      advice: combo ? combo.advice : [],
      picks
    };
  }

  function uuid() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return 't' + Date.now() + Math.random().toString(16).slice(2);
  }

  // 提交：本地算分 + 写 Supabase，返回 {token, result}
  async function submitQuiz(indices, name) {
    const result = scoreByIndices(indices);
    const token = uuid();
    const row = {
      token, name: name || null,
      answers: indices,
      p: result.P, h: result.H, pc: result.pc, hc: result.hc,
      pt: result.pt, ht: result.ht, type: result.type,
      weak: result.weak, advice: result.advice
    };
    const r = await fetch(URL + '/rest/v1/quiz_submissions', {
      method: 'POST',
      headers: headers({ 'Prefer': 'return=minimal' }),
      body: JSON.stringify(row)
    });
    if (!r.ok) {
      let m = '提交失败（网络或服务异常）';
      try { const j = await r.json(); m = j.message || j.error || m; } catch (e) {}
      throw new Error(m);
    }
    return { token, result };
  }

  // 按 token 回看个人结果
  async function getResultByToken(token) {
    const sel = 'token,name,p,h,pc,hc,pt,ht,type,weak,advice,created_at';
    const r = await fetch(URL + '/rest/v1/quiz_submissions?token=eq.' + encodeURIComponent(token) + '&select=' + sel);
    if (!r.ok) throw new Error('查询结果失败');
    const rows = await r.json();
    if (!rows.length) throw new Error('未找到该结果，链接可能已失效');
    const x = rows[0];
    return {
      token: x.token, name: x.name,
      P: x.p, H: x.h, pc: x.pc, hc: x.hc,
      pt: x.pt, ht: x.ht, type: x.type,
      weak: x.weak, advice: x.advice, created_at: x.created_at
    };
  }

  // 已收份数（无需口令，仅计数）
  async function getTotal() {
    try {
      const r = await fetch(URL + '/rest/v1/quiz_submissions?select=name&order=created_at.desc');
      if (!r.ok) return 0;
      const rows = await r.json();
      return rows.length;
    } catch (e) { return 0; }
  }

  // 主持人汇总（前端校验口令后拉全量并聚合）
  async function getHostData(passcode) {
    if (passcode !== C.HOST_PASSCODE) throw new Error('口令不正确');
    const sel = 'name,p,h,pc,hc,type,created_at';
    const r = await fetch(URL + '/rest/v1/quiz_submissions?select=' + sel + '&order=created_at.desc');
    if (!r.ok) throw new Error('拉取汇总失败');
    const rows = await r.json();
    const total = rows.length;
    let sumP = 0, sumH = 0; const dist = {};
    rows.forEach(x => { sumP += x.p; sumH += x.h; dist[x.type] = (dist[x.type] || 0) + 1; });
    return {
      total,
      avgP: total ? Math.round(sumP / total) : 0,
      avgH: total ? Math.round(sumH / total) : 0,
      dist,
      rows: rows.map(x => ({
        name: x.name, P: x.p, H: x.h, pc: x.pc, hc: x.hc,
        type: x.type, created_at: x.created_at
      }))
    };
  }

  // 清空（走 Supabase RPC，口令在服务端再校验一次）
  async function clearAll(passcode) {
    if (passcode !== C.HOST_PASSCODE) throw new Error('口令不正确');
    const r = await fetch(URL + '/rest/v1/rpc/clear_quiz_submissions', {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ p_passcode: passcode })
    });
    if (!r.ok) {
      let m = '清空失败';
      try { const j = await r.json(); m = j.message || m; } catch (e) {}
      throw new Error(m);
    }
    return true;
  }

  window.QuizStore = { scoreByIndices, submitQuiz, getResultByToken, getTotal, getHostData, clearAll };
})();
