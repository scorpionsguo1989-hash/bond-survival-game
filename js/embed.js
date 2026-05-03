// js/embed.js — iframe 嵌入主站时的运行时适配
//
// 场景：游戏运行在主站 gaozhai-bond.com/game 的 iframe 内
// 行为：
//   - body 加 .embedded class（CSS 据此隐藏与主站重复的元素）
//   - 右上角浮一个 ← 搞债 角标，点击 → window.parent.location = '/'
//   - 直访 :8080 时**不**加，避免独立访问看到无效返回按钮
//
// 主入口：initEmbedded()，在 main.js init() 中调一次（幂等）

/**
 * 检测当前是否在 iframe 内运行。
 * 跨域 iframe 访问 window.top 会抛 SecurityError → catch 视为 embedded
 */
export function isEmbedded() {
  try {
    return window.self !== window.top;
  } catch (e) {
    return true;
  }
}

/**
 * 一次性初始化。重复调用幂等。
 */
export function initEmbedded() {
  if (!isEmbedded()) return;
  if (document.body.classList.contains('embedded')) return;  // 已初始化
  document.body.classList.add('embedded');
  mountBackToMainButton();
}

function mountBackToMainButton() {
  if (document.getElementById('embed-back-btn')) return;
  const a = document.createElement('a');
  a.id = 'embed-back-btn';
  a.href = '/';
  a.title = '返回搞债主站';
  a.setAttribute('aria-label', '返回搞债主站');
  a.innerHTML = `
    <span class="arr" aria-hidden="true">←</span>
    <span class="lbl">搞债</span>
  `;
  a.addEventListener('click', (e) => {
    e.preventDefault();
    try {
      // 让父框（主站）跳到首页 —— 玩家直接退出游戏
      window.parent.location.href = '/';
    } catch (err) {
      // 跨域父框拒绝赋值时，退到本窗口
      window.location.href = '/';
    }
  });
  document.body.appendChild(a);
}
