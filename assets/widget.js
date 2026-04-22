/**
 * CaTokens — widget.js
 * ─────────────────────────────────────────────────────────────
 * 위젯 상태 전환 + 채움 애니메이션 로직
 * HTML에서 분리된 순수 JS 버전 (vanilla, no dependencies)
 * ─────────────────────────────────────────────────────────────
 */

// ── 상수 ──────────────────────────────────────────────────────

const MAX_TOKENS = 88_000; // Max 5x 플랜 기준

/**
 * 상태 임계값
 * @enum {number}
 */
const THRESHOLDS = {
  IDLE:       10,   // 0  ~ 9%   → idle
  ACTIVE:     80,   // 10 ~ 79%  → active
  WARNING:    100,  // 80 ~ 99%  → warning
  LIMIT_5H:   101,  // 100%      → limit_5h  (슬라이더 max=105에서 100일 때)
  LIMIT_WEEK: 102,  // 101%+     → limit_week
};

/**
 * 상태별 색상 설정
 */
const STATE_COLORS = {
  idle: {
    grad1:  '#1e1e28',
    grad2:  '#2a2a40',
    stroke: 'rgba(42,42,53,0.8)',
  },
  active: {
    grad1:  '#4c1d95',
    grad2:  '#a78bfa',
    stroke: 'rgba(139,92,246,0.6)',
  },
  warning: {
    grad1:  '#b45309',
    grad2:  '#fcd34d',
    stroke: 'rgba(245,158,11,0.7)',
  },
  limit_5h: {
    grad1:  '#7f1d1d',
    grad2:  '#ef4444',
    stroke: 'rgba(239,68,68,0.8)',
  },
  limit_week: {
    grad1:  '#111827',
    grad2:  '#374151',
    stroke: 'rgba(75,85,99,0.5)',
  },
};

// ── DOM 참조 ──────────────────────────────────────────────────

const els = {
  widget:       document.getElementById('demoWidget'),
  fillGroup:    document.getElementById('fillGroup'),
  trayFill:     document.getElementById('trayFill'),
  outline:      document.getElementById('demoOutline'),
  eyes:         document.getElementById('demoEyes'),
  deadEyes:     document.getElementById('demoDeadEyes'),
  sleepEyes:    document.getElementById('demoSleepEyes'),
  pulseRing:    document.getElementById('demoPulse'),
  pupilL:       document.getElementById('pupilL'),
  pupilR:       document.getElementById('pupilR'),
  tokenReadout: document.getElementById('tokenReadout'),
  tokenSub:     document.getElementById('tokenSub'),
  statusBadge:  document.getElementById('statusBadge'),
  pctLabel:     document.getElementById('pctLabel'),
  trayText:     document.getElementById('trayText'),
  gradStop1:    document.getElementById('gradStop1'),
  gradStop2:    document.getElementById('gradStop2'),
  trayStop1:    document.getElementById('trayStop1'),
  trayStop2:    document.getElementById('trayStop2'),
};

// ── 핵심 함수 ─────────────────────────────────────────────────

/**
 * pct(0~105)를 받아 위젯 전체 상태를 업데이트한다.
 * @param {number} pct - 0~100: 5h 사용률, 101+: 주간 한도 초과
 */
function updateWidget(pct) {
  // 1. 채움 높이 업데이트 (translateY: 100%=비어있음, 0%=꽉참)
  const fillY = 100 - Math.min(pct, 100);
  const fillTransition = 'transform 0.7s cubic-bezier(0.34, 1.56, 0.64, 1)';

  els.fillGroup.style.transition = fillTransition;
  els.fillGroup.style.transform  = `translateY(${fillY}%)`;
  els.trayFill.style.transition  = fillTransition;
  els.trayFill.style.transform   = `translateY(${fillY}%)`;

  // 2. 텍스트 업데이트
  const tokens     = Math.round((Math.min(pct, 100) / 100) * MAX_TOKENS);
  const displayPct = Math.min(pct, 100).toFixed(0);

  els.tokenReadout.innerHTML =
    `${tokens.toLocaleString()} <span style="font-size:13px;color:var(--muted)">/ ${MAX_TOKENS.toLocaleString()}</span>`;
  els.tokenSub.textContent = `5시간 기준 · ${displayPct}% 사용`;
  els.pctLabel.textContent = `${pct}%`;
  els.trayText.textContent = `${tokens.toLocaleString()} tok — ${displayPct}%`;

  // 3. 눈 / 모션 / 색상 전환
  _resetEyes();

  if (pct > 100) {
    _applyState('limit_week', {
      widgetClass: 'widget demo-widget glow-dead',
      eyes: 'dead',
      badge: { text: '주간 한도 초과 💀', cls: 'status-badge dead' },
    });

  } else if (pct >= 100) {
    _applyState('limit_5h', {
      widgetClass: 'widget demo-widget glow-danger',
      eyes: 'sleep',
      badge: { text: '5h 제한 도달 😵', cls: 'status-badge limit' },
    });

  } else if (pct >= 80) {
    _applyState('warning', {
      widgetClass: 'widget demo-widget shake glow-warn',
      eyes: 'normal',
      bloodshot: true,
      badge: { text: '⚠ 한도 임박', cls: 'status-badge warn' },
    });

  } else if (pct >= 10) {
    _applyState('active', {
      widgetClass: 'widget demo-widget bounce glow-purple',
      eyes: 'normal',
      pulse: true,
      badge: { text: '● 활성', cls: 'status-badge' },
    });

  } else {
    _applyState('idle', {
      widgetClass: 'widget demo-widget',
      eyes: 'none',
      badge: { text: 'IDLE', cls: 'status-badge' },
    });
  }
}

/**
 * 상태 적용 헬퍼
 */
function _applyState(stateName, opts) {
  const c = STATE_COLORS[stateName];

  // 위젯 클래스 (animation)
  els.widget.className = opts.widgetClass;

  // 아웃라인 색
  els.outline.style.stroke = c.stroke;

  // 그라디언트 색
  els.gradStop1.style.stopColor = c.grad1;
  els.gradStop2.style.stopColor = c.grad2;
  els.trayStop1.style.stopColor = c.grad1;
  els.trayStop2.style.stopColor = c.grad2;

  // 눈 표시
  if (opts.eyes === 'normal') {
    els.eyes.style.display = 'block';
    const pupilColor = opts.bloodshot ? '#7f1d1d' : '#1a0a3e';
    els.pupilL.setAttribute('fill', pupilColor);
    els.pupilR.setAttribute('fill', pupilColor);
  } else if (opts.eyes === 'dead') {
    els.deadEyes.style.display = 'block';
  } else if (opts.eyes === 'sleep') {
    els.sleepEyes.style.display = 'block';
  }

  // 펄스 링
  els.pulseRing.style.display = opts.pulse ? 'block' : 'none';

  // 뱃지
  els.statusBadge.textContent = opts.badge.text;
  els.statusBadge.className   = opts.badge.cls;
}

/**
 * 눈 초기화
 */
function _resetEyes() {
  els.eyes.style.display      = 'none';
  els.deadEyes.style.display  = 'none';
  els.sleepEyes.style.display = 'none';
  els.pulseRing.style.display = 'none';
  els.widget.className        = 'widget demo-widget';
}

// ── 이벤트 바인딩 ─────────────────────────────────────────────

const slider = document.getElementById('tokenSlider');
slider.addEventListener('input', () => updateWidget(parseInt(slider.value, 10)));

// 초기 렌더
updateWidget(0);

// ── 자동 데모 (로드 시 0 → 65% 까지 자동 fill) ───────────────

(function autoDemo() {
  let pct = 0;
  const timer = setInterval(() => {
    pct += 1.5;
    if (pct >= 65) {
      clearInterval(timer);
      return;
    }
    slider.value = pct;
    updateWidget(pct);
  }, 40);

  // 600ms 딜레이 후 시작
  setTimeout(() => {}, 600);
})();
