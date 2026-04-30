// js/main.js
import { generateOrigin } from './origins.js';
import { renderFateCard } from './ui.js';

const origin = generateOrigin('cfo');
renderFateCard(origin, () => {
  alert('开始游戏（待实现主界面）');
});
