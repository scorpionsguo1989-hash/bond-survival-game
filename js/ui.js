// js/ui.js

const REGION_LABELS = {
  east_core: '东部核心', central_capital: '中部省会',
  west_prefecture: '西部地级市', northeast_old: '东北老工业区'
};
const HEALTH_LABELS = { good: '财务健康', medium: '财务一般', weak: '财务承压' };

export function renderFateCard(origin, onAccept) {
  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="screen active">
      <div class="fate-container">
        <div class="fate-title">债市生存游戏</div>
        <div class="fate-subtitle">你的命运已定</div>
        <div class="fate-card">
          <div class="role-badge">角色 · 城投财务总监</div>
          <div class="role-name">${escapeHtml(origin.directorName)}</div>
          <div class="role-org">${escapeHtml(origin.platformName)}</div>
          <div class="fate-tags">
            <span class="tag tag-region">${origin.labels.region}</span>
            <span class="tag tag-type">${origin.labels.business}</span>
            <span class="tag tag-warn">⚠ ${origin.labels.tag}</span>
          </div>
          <div class="challenges">
            <div class="challenges-title">你这局的三大挑战</div>
            ${origin.challenges.map((c, i) => `
              <div class="challenge-item">
                <span class="challenge-num">0${i+1}</span>
                <span class="challenge-text">${escapeHtml(c)}</span>
              </div>
            `).join('')}
          </div>
          <button id="btn-accept-fate" class="start-btn">接受命运，开始游戏 →</button>
        </div>
      </div>
    </div>
  `;
  document.getElementById('btn-accept-fate').addEventListener('click', onAccept);
}

export function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
