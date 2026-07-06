// UI:速度控制、显示开关、天体选择、信息面板
import { BODIES, PLANET_ORDER } from './data.js';

const SELECTABLE = ['sun', ...PLANET_ORDER.slice(0, 3), 'moon', ...PLANET_ORDER.slice(3)];

export function buildUI(callbacks) {
  const { onSpeedChange, onTogglePause, onToggleOrbits, onToggleLabels, onSelectBody, onResetView } = callbacks;

  /* 顶部标题 */
  const header = el('div', 'header');
  header.innerHTML = `
    <h1>宇宙天体 3D 演示</h1>
    <p>拖拽旋转视角 · 滚轮 / 双指缩放 · 点击天体查看科普信息</p>
  `;
  document.body.appendChild(header);

  /* 模拟时间显示 */
  const clock = el('div', 'sim-clock');
  document.body.appendChild(clock);

  /* 底部控制栏 */
  const bar = el('div', 'control-bar');

  const bodyRow = el('div', 'body-row');
  for (const key of SELECTABLE) {
    const btn = el('button', 'body-btn');
    btn.textContent = BODIES[key].name;
    btn.dataset.key = key;
    btn.addEventListener('click', () => onSelectBody(key));
    bodyRow.appendChild(btn);
  }
  const overviewBtn = el('button', 'body-btn overview');
  overviewBtn.textContent = '全景';
  overviewBtn.addEventListener('click', onResetView);
  bodyRow.appendChild(overviewBtn);
  bar.appendChild(bodyRow);

  const ctrlRow = el('div', 'ctrl-row');

  const pauseBtn = el('button', 'icon-btn');
  pauseBtn.textContent = '⏸';
  pauseBtn.title = '暂停 / 播放';
  let paused = false;
  pauseBtn.addEventListener('click', () => {
    paused = !paused;
    pauseBtn.textContent = paused ? '▶' : '⏸';
    onTogglePause(paused);
  });
  ctrlRow.appendChild(pauseBtn);

  const speedWrap = el('div', 'speed-wrap');
  const speedLabel = el('span', 'speed-label');
  const slider = document.createElement('input');
  slider.type = 'range';
  slider.min = '0'; slider.max = '100'; slider.value = '50';
  const applySpeed = () => {
    const v = Number(slider.value);
    const daysPerSec = v === 0 ? 0 : 0.1 * Math.pow(1200, v / 100);
    speedLabel.textContent = daysPerSec === 0 ? '静止'
      : daysPerSec < 1 ? `1秒 ≈ ${(daysPerSec * 24).toFixed(1)} 小时`
      : `1秒 ≈ ${daysPerSec.toFixed(1)} 天`;
    onSpeedChange(daysPerSec);
  };
  slider.addEventListener('input', applySpeed);
  speedWrap.append('速度', slider, speedLabel);
  ctrlRow.appendChild(speedWrap);

  const orbitToggle = makeToggle('轨道', true, onToggleOrbits);
  const labelToggle = makeToggle('标签', true, onToggleLabels);
  ctrlRow.appendChild(orbitToggle);
  ctrlRow.appendChild(labelToggle);

  bar.appendChild(ctrlRow);
  document.body.appendChild(bar);

  /* 信息面板 */
  const panel = el('div', 'info-panel');
  panel.innerHTML = '<button class="close-btn">×</button><div class="info-content"></div>';
  document.body.appendChild(panel);
  panel.querySelector('.close-btn').addEventListener('click', () => {
    panel.classList.remove('open');
    setActiveButton(null);
  });

  function setActiveButton(key) {
    bodyRow.querySelectorAll('.body-btn').forEach((b) => {
      b.classList.toggle('active', b.dataset.key === key);
    });
  }

  function showInfo(key) {
    const d = BODIES[key];
    if (!d) return;
    const rows = [
      ['类型', d.type],
      ['直径', `${d.diameterKm.toLocaleString()} km`],
      d.orbitDays ? ['公转周期', formatDays(d.orbitDays)] : null,
      ['自转周期', formatDays(Math.abs(d.rotationDays)) + (d.rotationDays < 0 ? '(逆行)' : '')],
      d.tiltDeg !== undefined ? ['自转轴倾角', `${d.tiltDeg}°`] : null,
    ].filter(Boolean);

    panel.querySelector('.info-content').innerHTML = `
      <h2>${d.name} <span class="en">${d.en}</span></h2>
      <table>${rows.map(([k, v]) => `<tr><td>${k}</td><td>${v}</td></tr>`).join('')}</table>
      <h3>你知道吗?</h3>
      <ul>${d.facts.map((f) => `<li>${f}</li>`).join('')}</ul>
      <p class="scale-note">* 演示中天体大小与轨道距离经过压缩,并非真实比例。</p>
    `;
    panel.classList.add('open');
    setActiveButton(key);
  }

  function updateClock(elapsedDays) {
    const years = Math.floor(elapsedDays / 365.25);
    const days = Math.floor(elapsedDays % 365.25);
    clock.textContent = `模拟时间:${years} 年 ${days} 天`;
  }

  applySpeed();
  return { showInfo, updateClock, setActiveButton };
}

function formatDays(days) {
  if (days < 1) return `${(days * 24).toFixed(1)} 小时`;
  if (days > 800) return `${(days / 365.25).toFixed(1)} 年`;
  return `${days} 天`;
}

function makeToggle(text, checked, onChange) {
  const label = el('label', 'toggle');
  const input = document.createElement('input');
  input.type = 'checkbox';
  input.checked = checked;
  input.addEventListener('change', () => onChange(input.checked));
  label.append(input, text);
  return label;
}

function el(tag, cls) {
  const node = document.createElement(tag);
  node.className = cls;
  return node;
}
