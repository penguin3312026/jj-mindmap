/**
 * 人力资本战略工作室 · 共享应用脚本
 * - 读取 modules.json 动态渲染顶部导航
 * - 高亮当前页面
 * - 提供模块页通用的 Tab 切换、CSV 下载等工具函数
 */
(function () {
  const SITE_KEY = 'hc-strategy-studio';

  // 根据当前文件路径计算导航相对路径
  function navBase() {
    const path = location.pathname.replace(/\\/g, '/');
    if (path.includes('/modules/')) return '../../';
    return './';
  }

  // 渲染顶部导航
  async function renderNav() {
    const base = navBase();
    let data;
    try {
      const res = await fetch(base + 'assets/data/modules.json');
      data = await res.json();
    } catch (e) {
      console.warn('加载 modules.json 失败', e);
      return;
    }

    const container = document.querySelector('.nav');
    if (!container) return;

    const currentPath = location.pathname.split('/').pop() || 'index.html';
    const inModule = location.pathname.includes('/modules/');
    const currentModule = inModule ? location.pathname.split('/modules/')[1].split('/')[0] : 'home';

    container.innerHTML = data.nav.map(item => {
      const href = item.url.startsWith('http') ? item.url : base + item.url.replace(/^\.\/\.\.\//, '').replace(/^\.\//, '');
      const isActive = item.id === currentModule || (item.id === 'home' && !inModule);
      return `<a href="${href}" class="${isActive ? 'active' : ''}">${item.label}</a>`;
    }).join('');
  }

  // Tab 切换（模块页通用）
  window.initTabs = function () {
    const tabs = document.querySelectorAll('.tab');
    const panels = document.querySelectorAll('.tab-panel');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        panels.forEach(p => p.classList.remove('active'));
        tab.classList.add('active');
        const target = tab.dataset.target;
        if (target) document.getElementById(target)?.classList.add('active');
      });
    });
  };

  // 主动切换到某个 tab-panel
  window.switchTab = function (panelId) {
    const tab = document.querySelector(`.tab[data-target="${panelId}"]`);
    if (tab) tab.click();
  };

  // CSV 下载辅助
  window.downloadCSV = function (filename, rows) {
    const escape = v => {
      v = v == null ? '' : String(v);
      return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v;
    };
    const csv = '\uFEFF' + rows.map(r => r.map(escape).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  // 把文件内容读成 text
  window.readFileText = function (file) {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result);
      r.onerror = reject;
      r.readAsText(file, 'UTF-8');
    });
  };

  // 初始化
  document.addEventListener('DOMContentLoaded', renderNav);
})();
