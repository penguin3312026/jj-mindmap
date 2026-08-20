/*
 * grid-core.js — 管理方格领导力测评 · 批量计分核心
 * 单数据源：HTML 分析器与 Node 校验脚本共用，保证算法一致。
 * 计分口径沿用原工具：P/H 满分各 90；坐标 = round(v/90*8*10+10)/10 → 1..9；
 * 档次：高 >=72 / 低 <=44 / 中 45..71；风格判定与 9 种组合建议同原 HTML。
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.GridCore = factory();
})(typeof self !== "undefined" ? self : this, function () {
  // 题目：title 与问卷星一致；options[i] 对应 问卷星选项 A/B/C/D/E（i=0..4）
  const QUESTIONS = [
    { q: "你刚接手一个团队，成员之间关系融洽但工作效率偏低，连续两个月未完成核心 KPI。你发现大家花大量时间在非正式沟通和相互帮忙上。",
      options: [
        { p:3, h:8, text:"A. 先不急着调整，花时间与每位成员一对一聊天，了解他们的职业期望和困惑，建立信任关系后再慢慢提升要求。" },
        { p:9, h:2, text:"B. 召开紧急会议，明确接下来的硬性指标和截止日期，同时表示「有困难可以提，但标准不能降」。" },
        { p:2, h:2, text:"C. 保持现状，让大家维持当前的节奏，相信熟悉工作后会自然改善。" },
        { p:6, h:6, text:"D. 制定一个折中方案：在原有指标基础上小幅提高要求，同时每周安排一次团队聚餐来维持氛围。" },
        { p:8, h:7, text:"E. 重新梳理工作流程，将任务分解为清晰的步骤和责任人，设定每日进度跟踪，同时邀请成员提出流程优化建议。" }
      ] },
    { q: "一位平时表现优秀的下属，最近连续三周迟到、工作心不在焉，提交的报告有明显错误。你私下了解得知，他家里有老人住院，但公司没有明确的弹性工作政策。",
      options: [
        { p:4, h:8, text:"A. 找他谈话，先表示理解他的家庭困难，主动提出可以帮他协调工作安排，同时温和地提醒他尽量保证关键节点的交付质量。" },
        { p:8, h:2, text:"B. 按公司规定给他正式警告，并告知如果继续迟到将影响季度考核，工作是工作，不能因为私事影响职责。" },
        { p:2, h:3, text:"C. 装作不知道，等他主动来找你说明情况，若一直不说就先观察，暂时不处理。" },
        { p:3, h:7, text:"D. 找他谈话，告诉他「特殊时期可以理解」，允许他自由调整上下班时间，工作进度可以放慢一些。" },
        { p:7, h:8, text:"E. 向 HR 申请为他特批一段时间的弹性工作制，同时与他共同制定一个临时的简化版任务清单，确保核心工作不受影响。" }
      ] },
    { q: "公司下达了一个非常紧迫的重要项目，要求在两周内完成，而你的团队目前手头已有满负荷的常规工作。你需要决定如何推进。",
      options: [
        { p:5, h:7, text:"A. 先召集全员开会，坦诚说明项目的紧迫性和意义，然后请大家一起讨论如何在现有工作基础上挤出时间和资源，共同制定突击方案。" },
        { p:9, h:2, text:"B. 直接挑选团队里最能干的几个人，把核心任务分配给她们，其他人维持常规工作，并明确告诉被选中的成员「这个项目必须优先」。" },
        { p:2, h:4, text:"C. 接受任务，但维持原有工作分配，告诉大家「尽力而为，能做多少做多少」，不施加额外压力。" },
        { p:7, h:5, text:"D. 制定一个详细的加班排班表，把任务平均分配给所有人，同时向公司申请额外的加班补贴作为激励。" },
        { p:8, h:7, text:"E. 先向上级争取延长两天期限，再向团队传达任务，并按照每个人的专长重新平衡工作量，尽量不让任何人负担过重。" }
      ] },
    { q: "团队中有两位骨干成员长期关系紧张，经常在会议上公开争论，互相否定对方的方案。虽然各自能力都很强，但合作效率很低，其他成员也感到尴尬。",
      options: [
        { p:3, h:8, text:"A. 分别找两人单独谈话，了解冲突根源，然后安排一次专门的协调会，让双方在第三方见证下把分歧说开，并约定未来合作的边界。" },
        { p:7, h:2, text:"B. 明确告诉两人：「争论可以，但必须在会上给出建设性方案，谁提不出方案就不准发言。」用规则约束他们的行为。" },
        { p:1, h:3, text:"C. 暂时不介入，认为他们之间是正常的工作摩擦，过段时间自然就会磨合好。" },
        { p:4, h:5, text:"D. 调整两人的工作分工，尽可能让他们各管一摊、减少交集，以维持表面和谐。" },
        { p:8, h:7, text:"E. 召集整个团队，重新强调团队合作的价值观，表扬那些协作良好的成员，但不在会上点名这两人的冲突。" }
      ] },
    { q: "一个季度结束，团队完成了 105% 的目标，但过程中出现了几次质量返工。上级对你的整体评价是「结果不错，但过程管理可以更好」。你需要对团队进行绩效反馈。",
      options: [
        { p:4, h:7, text:"A. 召开总结会，先充分认可大家的努力和最终成果，再引导大家一起反思返工的原因，共同制定下季度的流程改进清单。" },
        { p:9, h:1, text:"B. 在会议上公布每个人的具体业绩排名，重奖排名前三的成员，对造成返工的环节点名批评并要求写出整改方案。" },
        { p:2, h:4, text:"C. 简单表扬一下大家，然后分发季度奖金，不提返工的事，以免破坏气氛。" },
        { p:5, h:6, text:"D. 先肯定成绩，再委婉地说「我们在细节上还有一些不足」，然后请大家各自提交一份改进建议，不做集体讨论。" },
        { p:8, h:8, text:"E. 分别找相关责任人谈话，认真分析返工根因，同时私下向上级解释这是「追求高标准过程中的合理代价」。" }
      ] },
    { q: "一位年轻下属提出希望承担更多挑战性任务，但你发现他目前的基本工作偶尔还有纰漏，尚未完全熟练。其他同事也觉得他有点「眼高手低」。",
      options: [
        { p:6, h:7, text:"A. 肯定他的上进心，给他安排一个有挑战性的小项目作为试点，同时安排一位资深同事作为导师跟进，并约定每周复盘一次。" },
        { p:8, h:2, text:"B. 直接告诉他：「先把目前的工作做到零失误再谈其他，这是基本要求。」" },
        { p:3, h:5, text:"C. 既然他有热情，就挑一个难度不高的新任务完全交给他做，让他自己摸索，不设太多指导。" },
        { p:5, h:5, text:"D. 给他分配一个难度适中的新任务，但同时告诉他：「你手头的常规工作也不能落下，自己平衡好。」" },
        { p:7, h:7, text:"E. 先不给他新任务，而是调整他现有工作的目标，把要求提到更高水平，让他感觉「现在的工作本身就很有挑战」。" }
      ] },
    { q: "公司推行一项新的数字化管理系统，要求全员使用。团队成员普遍抵触，有人觉得学习成本高，有人觉得现有流程够用，有人担心工作量增加。系统上线日期已定，必须执行。",
      options: [
        { p:4, h:8, text:"A. 先暂停进度，花一周时间充分听取每个人的顾虑，然后调整实施节奏，同时亲自带头学习和使用系统，让大家看到你的投入。" },
        { p:8, h:2, text:"B. 直接下发强制性通知，明确使用新系统的截止日期，并说明「到时未达标者将影响绩效」。" },
        { p:2, h:3, text:"C. 把培训资料发给大家，告诉他们「有问题随时问我」，然后不再主动过问，等上线前再检查。" },
        { p:5, h:6, text:"D. 先选两三个对新事物接受度高的成员作为试点，等他们用顺了再让他们去带动其他人，不搞全员强制推进。" },
        { p:8, h:8, text:"E. 组织一次集体培训，然后在初期阶段降低大家的常规工作量要求，让大家有充分时间适应新系统，同时设置一个过渡期接受新旧并行。" }
      ] },
    { q: "你的上级突然要求你裁掉一名绩效垫底的下属（该下属工作能力一般但人缘好、态度认真），而你认为经过培训他还有潜力提升。",
      options: [
        { p:4, h:8, text:"A. 找上级深入沟通，拿出该下属的改进计划和学习数据，争取再给 3 个月的观察期，同时与下属坦诚谈话，明确改进目标并每周跟进。" },
        { p:7, h:2, text:"B. 执行上级的决定，以绩效为由辞退该下属，并安慰他说「这是公司的决定，我也没办法」。" },
        { p:2, h:3, text:"C. 尽量拖延执行，同时偷偷帮该下属在公司内部其他部门寻找调岗机会，希望他主动离开。" },
        { p:6, h:6, text:"D. 向上级建议「再给一次机会」，同时制定一个考核方案，如果他达不到就按照原计划执行，既尊重上级也给了下属一个明确的出路。" },
        { p:8, h:7, text:"E. 不执行裁员决定，而是向人事部门申请将该下属转为兼职或顾问角色，以保住他的工作。" }
      ] },
    { q: "团队近期连续加班，士气明显低落，但距离项目交付还有两周，无法立刻减少工作量。你注意到有人开始消极怠工。",
      options: [
        { p:4, h:8, text:"A. 找一个合适的时间，把大家聚在一起（非正式场合），坦诚承认现在的确很辛苦，并请他们一起想两个问题：这最后两周怎么高效冲刺？项目结束后他们最想要什么样的补偿？" },
        { p:8, h:2, text:"B. 重申项目的重要性和交付的严肃性，强调「坚持就是胜利」，并以身作则带头加班。" },
        { p:2, h:4, text:"C. 适当减少一些非核心的要求，给大家一些喘息空间，同时尽量少打扰他们，让他们自行安排节奏。" },
        { p:5, h:6, text:"D. 购买零食饮料、发放小额红包作为短期激励，并承诺项目结束后全员补休三天，同时维持原有工作安排。" },
        { p:8, h:8, text:"E. 重新审视剩余工作，砍掉可有可无的部分，重新分配任务让每个人做自己最擅长的部分，并每天早会后给大家 15 分钟自由交流释放情绪。" }
      ] },
    { q: "回顾过去一年，你觉得自己在团队管理上最希望提升的一个方面是什么？",
      options: [
        { p:3, h:8, text:"A. 希望能更敏锐地察觉每个成员的个人发展需求，更有效地激励和培养他们。" },
        { p:8, h:2, text:"B. 希望在把控进度和执行效率上更严格、更精准，减少低效环节。" },
        { p:2, h:3, text:"C. 希望工作能更轻松一些，不必为太多人事问题操心。" },
        { p:5, h:6, text:"D. 希望在维持团队稳定的同时，也能稳步提升业绩，不追求突变。" },
        { p:8, h:7, text:"E. 希望在实现团队高绩效的同时，也能让每个人感到有成就感和归属感，两者兼顾。" }
      ] }
  ];

  const COMBOS = {
    "high-high": { name: "(9,9) 团队型", lower: "无（均衡且双高）", advice: ["继续保持，重点优化「效率与人文的融合速度」。", "可在紧急场景下预演「加速版 9,9」以减少决策时间，避免理想流程拖慢节奏。"] },
    "high-med":  { name: "(9,5) 偏任务型", lower: "人本导向 H 中等", advice: ["每周固定安排 2 次「非议题性」一对一沟通（只聊个人发展，不谈 KPI）。", "在布置任务时，强制自己在说「截止日期」之前先说三句「这项任务能给你带来什么成长」。"] },
    "high-low":  { name: "(9,1) 任务型", lower: "人本导向 H 低", advice: ["请一位 H 得分高的同事做你的「人本观察员」，在会议中提醒你暂停关注氛围。", "每做完一个项目，专门用 20 分钟让团队成员表达「感受」而非「结果」。", "学习「非暴力沟通」四步法（观察–感受–需要–请求）。"] },
    "med-high":  { name: "(5,9) 偏关系型", lower: "生产导向 P 中等", advice: ["在每项任务开始时，主动问自己「这次如果只盯一个核心指标，应该盯什么」。", "每周列出「非做不可」的 3 件事，优先完成，不被关系性事务带偏。", "学习使用「倒排工期法」反向规划时间。"] },
    "med-med":   { name: "(5,5) 中庸型", lower: "两者均中等（均未达高）", advice: ["选择其中一个维度刻意突破——建议优先突破「生产」，因为提升 P 比提升 H 更容易量化。", "设定一个「季度激进目标」（比常规高 30%），打破平衡舒适区。", "减少「折中决策」，练习「二选一」的果断力。"] },
    "med-low":   { name: "(5,1) 任务冷漠型", lower: "P 中等、H 低（双维度偏弱）", advice: ["先补 H：从「最小关怀动作」开始——每天主动问一位成员「今天需要什么支持」。", "再补 P：用「每日站会 + 进度看板」把模糊目标变成可视化任务。", "建议参加「教练型领导力」基础培训。"] },
    "low-high":  { name: "(1,9) 乡村俱乐部型", lower: "生产导向 P 低", advice: ["引入外部「进度督导」角色（可以是助理或 HRBP）每周检查你的目标完成度。", "练习「先说目标，再谈感受」的沟通顺序。", "给自己设定「硬性产出标准」——如每月必须完成 2 项可量化的团队改进。"] },
    "low-med":   { name: "(1,5) 温和平衡型", lower: "生产导向 P 低", advice: ["用「SMART 原则」将每项任务拆解为具体、可衡量的小步骤。", "主动向上级要明确的绩效指标，以此作为自己的「外部驱动力」。", "每天开始工作前，先列出「今天必须交付的 3 个产出」，优先完成。"] },
    "low-low":   { name: "(1,1) 贫乏型", lower: "P 和 H 均低", advice: ["紧急行动：这不是风格问题，是「管理投入度」问题，需要先重建管理意愿。", "建议每周强制安排 4 小时的「深度管理时间」（不做事务性工作，只做团队规划与一对一沟通）。", "找一位 Mentor 或上级每周对你进行「管理行为督导」，前 3 个月以「模仿」为主，不必追求原创风格。"] }
  };

  function tier(v) { if (v >= 72) return "high"; if (v <= 44) return "low"; return "med"; }
  function tierLabel(t) { return t === "high" ? "高" : t === "med" ? "中" : "低"; }
  function coordOf(v) { return Math.round((v / 90) * 8 * 10 + 10) / 10; }

  function typeNameOf(pc, hc) {
    if (pc >= 7 && hc >= 7) return "(9,9) 团队型";
    if (pc >= 7 && hc <= 4) return "(9,1) 任务型";
    if (pc <= 4 && hc >= 7) return "(1,9) 乡村俱乐部型";
    if (pc >= 7 && hc > 4 && hc < 7) return "(9,5) 偏任务型";
    if (pc <= 4 && hc > 4 && hc < 7) return "(1,5) 温和平衡型";
    if (pc > 4 && pc < 7 && hc >= 7) return "(5,9) 偏关系型";
    if (pc > 4 && pc < 7 && hc <= 4) return "(5,1) 任务冷漠型";
    if (pc > 4 && pc < 7 && hc > 4 && hc < 7) return "(5,5) 中庸型";
    if (pc <= 4 && hc <= 4) return "(1,1) 贫乏型";
    return "中间型";
  }
  function typeDescOf(n) {
    const m = {
      "(9,9) 团队型": "对工作和人都高度关心，鼓励参与、沟通，兼顾组织目标与个人需求，被视为理想管理模式。",
      "(9,1) 任务型": "极度关注生产效率，要求服从，对人员关怀不足，危机与高压场景执行力强但易致倦怠。",
      "(1,9) 乡村俱乐部型": "重点维持友好关系与团队氛围，可能牺牲效率来避免冲突。",
      "(5,5) 中庸型": "在任务与人员间寻求平衡，维持现状，稳定但不追求卓越。",
      "(1,1) 贫乏型": "对工作和人都漠不关心，被动维持职位，管理效能最低。",
      "(9,5) 偏任务型": "以结果为导向为主，对人本关怀处在中等水平。",
      "(1,5) 温和平衡型": "关系氛围尚可，但生产导向偏弱。",
      "(5,9) 偏关系型": "以人为中心为主，对生产结果的驱动力处在中等水平。",
      "(5,1) 任务冷漠型": "两个维度都偏弱，既缺乏关怀也缺乏产出驱动。",
      "中间型": "介于典型风格之间，具体落在方格的中段区域。"
    };
    return m[n] || "";
  }

  // 解析问卷星导出的 CSV（含 BOM / 引号 / 换行容错）
  function parseCSV(text) {
    if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);
    const rows = []; let row = [], field = "", i = 0, inQ = false;
    while (i < text.length) {
      const c = text[i];
      if (inQ) {
        if (c === '"') {
          if (text[i + 1] === '"') { field += '"'; i += 2; continue; }
          inQ = false; i++; continue;
        }
        field += c; i++; continue;
      } else {
        if (c === '"') { inQ = true; i++; continue; }
        if (c === ",") { row.push(field); field = ""; i++; continue; }
        if (c === "\r") { i++; continue; }
        if (c === "\n") { row.push(field); rows.push(row); row = []; field = ""; i++; continue; }
        field += c; i++;
      }
    }
    if (field.length || row.length) { row.push(field); rows.push(row); }
    return rows.filter(r => r.some(c => c.trim() !== ""));
  }

  // 把问卷星导出表头匹配到题目列：表头形如 "1. 你刚接手..."
  function findQuestionCol(headers) {
    const map = {};
    headers.forEach((h, idx) => {
      const t = String(h || "").replace(/^[\d]+\.\s*/, "").trim();
      for (let qi = 0; qi < QUESTIONS.length; qi++) {
        const q = QUESTIONS[qi].q;
        if (t === q || q.startsWith(t) || t.startsWith(q)) { map[qi] = idx; break; }
      }
    });
    return map; // {questionIndex: csvColumnIndex}
  }

  // 把一行答卷的某个单元格答案映射到选项下标
  function matchOption(q, answer) {
    if (!answer) return -1;
    const a = String(answer).trim();
    const m = a.match(/^[A-Ea-e]/);
    if (m) { const idx = m[0].toUpperCase().charCodeAt(0) - 65; if (idx < q.options.length) return idx; }
    for (let i = 0; i < q.options.length; i++) {
      const ot = q.options[i].text.replace(/^[A-E]\.\s*/, "").trim();
      if (!ot) continue;
      if (a.includes(ot) || ot.includes(a)) return i;
    }
    return -1;
  }

  // 对单份答卷计分；answers: {questionIndex: cellText}
  function scoreAnswers(answers) {
    let P = 0, H = 0, missing = 0, invalid = 0;
    const picks = [];
    for (let qi = 0; qi < QUESTIONS.length; qi++) {
      const cell = answers[qi];
      const idx = matchOption(QUESTIONS[qi], cell);
      if (idx < 0) { missing++; picks.push(-1); continue; }
      P += QUESTIONS[qi].options[idx].p;
      H += QUESTIONS[qi].options[idx].h;
      picks.push(idx);
    }
    const pc = coordOf(P), hc = coordOf(H);
    const pt = tier(P), ht = tier(H);
    const tn = typeNameOf(pc, hc);
    const combo = COMBOS[pt + "-" + ht];
    return {
      P, H, pc, hc, pt, ht, type: tn, desc: typeDescOf(tn),
      weak: combo ? combo.lower : "", advice: combo ? combo.advice : [],
      picks, complete: missing === 0, missing
    };
  }

  // 识别问卷星导出中的微信用户信息列（常见列名）
  function findWechatCols(headers) {
    const cols = {};
    const namePatterns = [/微信昵称/, /昵称/];
    const openidPatterns = [/微信OpenID/i, /OpenID/i, /微信openid/i];
    const unionidPatterns = [/微信UnionID/i, /UnionID/i, /微信unionid/i];
    const avatarPatterns = [/微信头像/, /头像/];
    const sourcePatterns = [/来源详情/, /来源渠道/, /^来源$/];
    const find = (ps) => headers.findIndex(h => ps.some(p => p.test(String(h).trim())));
    const findBest = (ps) => {
      // 优先返回匹配列名最长、最具体的列
      let bestIdx = -1, bestLen = -1;
      headers.forEach((h, idx) => {
        const hs = String(h).trim();
        if (ps.some(p => p.test(hs)) && hs.length > bestLen) { bestIdx = idx; bestLen = hs.length; }
      });
      return bestIdx;
    };
    cols.nameIdx = find(namePatterns);
    cols.openidIdx = find(openidPatterns);
    cols.unionidIdx = find(unionidPatterns);
    cols.avatarIdx = find(avatarPatterns);
    cols.sourceIdx = findBest(sourcePatterns);
    cols.has = cols.nameIdx >= 0 || cols.openidIdx >= 0 || cols.avatarIdx >= 0 || cols.unionidIdx >= 0;
    return cols;
  }

  // 对整份 CSV 计分：返回 {headers, colMap, rows:[{meta, score, wechat}]}
  function scoreCSV(text, metaCols) {
    metaCols = metaCols || ["开始答题时间", "答题时长(秒)", "来源", "序号"];
    const rows = parseCSV(text);
    if (!rows.length) return { error: "空文件" };
    const headers = rows[0];
    const colMap = findQuestionCol(headers);
    const matched = Object.keys(colMap).length;
    const metaIdx = metaCols.map(c => headers.findIndex(h => String(h).trim() === c)).filter(i => i >= 0);
    const wechatCols = findWechatCols(headers);
    const out = { headers, colMap, matched, total: QUESTIONS.length, wechatCols, rows: [] };
    for (let r = 1; r < rows.length; r++) {
      const line = rows[r];
      const answers = {};
      for (const qi in colMap) answers[qi] = line[colMap[qi]];
      const meta = {};
      metaIdx.forEach((ci, k) => { meta[metaCols[k]] = line[ci] || ""; });
      const wechat = {
        name: wechatCols.nameIdx >= 0 ? line[wechatCols.nameIdx] || "" : "",
        openid: wechatCols.openidIdx >= 0 ? line[wechatCols.openidIdx] || "" : "",
        unionid: wechatCols.unionidIdx >= 0 ? line[wechatCols.unionidIdx] || "" : "",
        avatar: wechatCols.avatarIdx >= 0 ? line[wechatCols.avatarIdx] || "" : "",
        source: wechatCols.sourceIdx >= 0 ? line[wechatCols.sourceIdx] || "" : ""
      };
      out.rows.push({ meta, score: scoreAnswers(answers), wechat, raw: line });
    }
    return out;
  }

  function aggregate(result) {
    const dist = {};
    let sumP = 0, sumH = 0, valid = 0;
    result.rows.forEach(r => {
      if (!r.score.complete) return;
      valid++; sumP += r.score.P; sumH += r.score.H;
      dist[r.score.type] = (dist[r.score.type] || 0) + 1;
    });
    const top = Object.entries(dist).sort((a, b) => b[1] - a[1])[0];
    return {
      total: result.rows.length, valid,
      avgP: valid ? Math.round(sumP / valid) : 0,
      avgH: valid ? Math.round(sumH / valid) : 0,
      dist, topType: top ? top[0] : "—", topCount: top ? top[1] : 0
    };
  }

  // 生成问卷星 create-by-json 所需的 JSONL（中文 qtype 写法）
  function buildWjxJsonl(title, description) {
    title = title || "管理方格 · 领导力风格情境测评";
    description = description || "基于布莱克-莫顿管理方格理论，测量您的生产导向（P）与人本导向（H）。请选择最符合您直觉的选项。";
    const lines = [];
    lines.push(JSON.stringify({ qtype: "问卷基础信息", title: title, description: description, atype: 1 }));
    QUESTIONS.forEach((q, i) => {
      const obj = {
        qtype: "单选",
        title: `${i + 1}. ${q.q}`,
        is_requir: true,
        select: q.options.map((o, idx) => ({ item_index: String(idx + 1), item_title: o.text }))
      };
      lines.push(JSON.stringify(obj));
    });
    return lines.join("\n");
  }

  return {
    QUESTIONS, COMBOS, tier, tierLabel, coordOf,
    typeNameOf, typeDescOf, parseCSV, findQuestionCol, findWechatCols, matchOption,
    scoreAnswers, scoreCSV, aggregate, buildWjxJsonl
  };
});
