// js/config.js

export const GAME_CONFIG = {
  totalQuarters: 12,         // 3年=12季度
  startYear: 2022,
  startQuarter: 1,
  actionsPerTurn: 2,         // 每回合最多2次主动操作
  randomEventsPerTurn: { min: 0, max: 2 },
  policyAxisRange: { min: -5, max: 5 },
  policyAxisStart: -2,       // 开局偏紧
};

export const POLICY_LEVELS = [
  { range: [-5, -3], label: '严格', color: '#c62828', signal: '↓↓' },
  { range: [-2, -1], label: '偏紧', color: '#f57c00', signal: '↓' },
  { range: [0, 0],   label: '中性', color: '#9e9e9e', signal: '—' },
  { range: [1, 2],   label: '偏松', color: '#7cb342', signal: '↑' },
  { range: [3, 5],   label: '宽松', color: '#388e3c', signal: '↑↑' },
];

export const SCORE_DIMENSIONS = [
  '流动性管理',
  '融资成本控制',
  '项目推进',
  '合规指数',
  '危机应对',
  '综合发展',
];
