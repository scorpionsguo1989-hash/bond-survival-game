/* eslint-disable */
// Round 3 — Overlays: OperationModal / Toast / CrisisModal
// 这里只渲染"静态"形态（不含真正的开/关交互），用于 design canvas 内呈现

const { useMemo } = React;

/* ============================================================
   背景占位（让 modal 不浮空）
============================================================ */
function BgStub({ mobile }) {
  return (
    <>
      <div className="bg-stub">
        {!mobile && <div><div className="bs-panel" style={{height: 120}} /><div className="bs-panel" style={{height: 80}} /><div className="bs-panel" style={{height: 200}} /></div>}
        <div><div className="bs-panel" style={{margin: mobile ? '64px 8px 6px' : '70px 12px 12px', height: mobile ? 80 : 240}} /><div className="bs-panel" style={{height: mobile ? 80 : 200}} /></div>
        {!mobile && <div><div className="bs-panel" style={{height: 120}} /><div className="bs-panel" style={{height: 280}} /></div>}
        <div className="bs-topbar" />
      </div>
    </>
  );
}

/* ============================================================
   1) OperationModal
============================================================ */
function OperationModal({ mobile, role = "cfo", value = 2.0, max = 5, min = 0.5 }) {
  const pct = ((value - min) / (max - min)) * 100;
  const ticks = [0.5, 1, 2, 3, 4, 5];
  return (
    <div className={`overlay-host ${mobile ? 'mobile' : ''}`} data-role={role}>
      <BgStub mobile={mobile} />
      <div className="scrim" />
      <div className={`opmodal ${mobile ? 'mobile' : ''}`}>
        <div className="opm-rail" />
        <div className="opm-head">
          <div className="lh">
            <span className="opm-tag">CFO · OPS</span>
            <span className="opm-id">OP-2023Q2-0417</span>
          </div>
          <button className="opm-x" aria-label="close">✕</button>
        </div>
        <div className="opm-title">申请银行续贷</div>
        <div className="opm-desc">
          通过本地国有商业银行申请短期流贷续期。续贷成功可缓解短期偿付压力，但会增加财务费用与信用授信占用。
        </div>

        <div className="opm-body">
          {/* 输入 */}
          <div className="opm-input">
            <div className="opm-input-row">
              <span className="opm-label">借款金额（亿）</span>
              <span className="opm-hint">范围 <b>{min.toFixed(1)} – {max.toFixed(1)}</b> · 步长 0.1</span>
            </div>
            <div className="opm-numwrap">
              <span className="opm-num" contentEditable={false}>{value.toFixed(2)}</span>
              <span className="opm-caret" />
              <span className="opm-unit">亿元</span>
            </div>
            {/* slider */}
            <div className="opm-slider">
              <div className="opm-slider-track">
                <div className="opm-slider-rail" />
                <div className="opm-slider-fill" style={{width: pct + '%'}} />
                <div className="opm-slider-knob" style={{left: pct + '%'}} />
              </div>
              <div className="opm-slider-ticks">
                {ticks.map((t,i)=>(
                  <span key={i} className={Math.abs(t-value)<0.06?'active':''}>{t}</span>
                ))}
              </div>
            </div>
          </div>

          {/* 预计影响 */}
          <div className="opm-impact">
            <div className="opm-impact-head">
              <span className="ax">▶ 预计影响</span>
              <span className="meta">基于本季利率 4.85% / 期限 1Y</span>
            </div>
            <div className="opm-impact-rows">
              <div className="opm-impact-row">
                <span className="k">现金</span>
                <span className="arrow">→</span>
                <span className="v up">+{value.toFixed(2)} 亿</span>
              </div>
              <div className="opm-impact-row">
                <span className="k">信用授信占用</span>
                <span className="arrow">→</span>
                <span className="v down">−{value.toFixed(2)} 亿</span>
              </div>
              <div className="opm-impact-row">
                <span className="k">融资成本</span>
                <span className="arrow">→</span>
                <span className="v warn">+{(value * 0.0485).toFixed(3)} 亿/年</span>
              </div>
              <div className="opm-impact-row">
                <span className="k">市场信心</span>
                <span className="arrow">→</span>
                <span className="v">−1.2 pt</span>
              </div>
            </div>
          </div>

          {/* warn */}
          <div className="opm-warn">
            <span className="ico">!</span>
            <span>本次续贷会触发监管报备；若本季再有 2 笔以上债项展期，将进入"重点关注"名单。</span>
          </div>
        </div>

        <div className="opm-foot">
          <button className="opm-btn">取消 <span className="kbd">ESC</span></button>
          <button className="opm-btn primary">
            <span className="arr">▶</span> 确认执行
            <span className="kbd">⏎</span>
          </button>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   2) Toasts
============================================================ */
function ToastIcon({ kind }) {
  if (kind === 'success') return <span>✓</span>;
  if (kind === 'error') return <span>✕</span>;
  return <span>i</span>;
}

function Toast({ kind, meta, t1, t2, progress = 0.62 }) {
  const C = 14, R = 5, len = 2 * Math.PI * R;
  const off = len * (1 - progress);
  return (
    <div className={`toast ${kind}`}>
      <div className="ico"><ToastIcon kind={kind} /></div>
      <div className="body">
        <div className="t1">
          <span className="meta">{meta}</span>
          {t1}
        </div>
        {t2 && <div className="t2">{t2}</div>}
      </div>
      <div className="timer" aria-hidden="true">
        <svg viewBox="0 0 14 14">
          <circle className="bg" cx="7" cy="7" r={R} />
          <circle className="fg" cx="7" cy="7" r={R} strokeDasharray={len} strokeDashoffset={off} />
        </svg>
      </div>
      <button className="x" aria-label="dismiss">✕</button>
    </div>
  );
}

function ToastsDesktop() {
  return (
    <div className="overlay-host">
      <BgStub />
      <div className="toast-stack tr">
        <Toast kind="success" meta="OK" t1="续贷申请已提交，2.00 亿已入账"
               t2="ID 0417 · 现金 4.62 → 6.62 · 季 2023Q2" progress={0.78} />
        <Toast kind="error" meta="ERR" t1="发行规模超过监管限额"
               t2="本季净融资额度上限 5.00 亿，已用 4.80" progress={0.55} />
        <Toast kind="info" meta="INFO" t1="自动存档完成"
               t2="2023Q2 · 11:42 · 排行榜已上传" progress={0.30} />
        <Toast kind="info" meta="INFO" t1="排行榜已更新：你当前排名 #14 / 1,082" progress={0.18} />
      </div>
    </div>
  );
}

function ToastsMobile() {
  return (
    <div className="overlay-host mobile">
      <BgStub mobile />
      <div className="toast-stack tc">
        <Toast kind="success" meta="OK" t1="续贷成功，2.00 亿已入账"
               t2="现金 4.62 → 6.62 亿" progress={0.72} />
        <Toast kind="error" meta="ERR" t1="超过监管净融资上限"
               progress={0.50} />
        <Toast kind="info" meta="INFO" t1="排行榜已更新：#14 / 1,082" progress={0.22} />
      </div>
    </div>
  );
}

/* ============================================================
   3) CrisisModal
============================================================ */
function CrisisBanner() {
  return (
    <div className="crisis-banner">
      <span className="pulse" />
      <span className="em">危机警报</span>
      <span className="sep">·</span>
      <span>时间暂停</span>
      <span className="sep">·</span>
      <span>必须处置后继续</span>
    </div>
  );
}

function CrisisOption({ k, title, desc, cost, preds, cta = "选择此方案" }) {
  return (
    <button className="cm-opt">
      <div className="cm-opt-head">
        <span className="cm-opt-key">{k}</span>
        <span className="cm-opt-cost">{cost}</span>
      </div>
      <div className="cm-opt-title">{title}</div>
      <div className="cm-opt-desc">{desc}</div>
      <div className="cm-opt-pred">
        <div className="pl">预计影响</div>
        {preds.map((p, i) => (
          <div key={i} className="pred-row">
            <span className="pk">{p.k}</span>
            <span className={`pv ${p.tone || 'flat'}`}>{p.v}</span>
          </div>
        ))}
      </div>
      <div className="cm-opt-cta">
        <span>{cta}</span>
        <span className="arr">▶</span>
      </div>
    </button>
  );
}

function CrisisIM({ mobile }) {
  return (
    <div className={`overlay-host ${mobile ? 'mobile' : ''}`} data-role="im">
      <BgStub mobile={mobile} />
      <div className="scrim crisis" />
      <CrisisBanner />
      <div className={`cmodal ${mobile ? 'mobile' : ''}`}>
        <div className="cm-head">
          <div className="cm-tagline">
            <span className="cm-sev">SEV-1 · LIQUIDITY</span>
            <span className="cm-id">EVT-2023Q3-IM-014</span>
            <span className="cm-time">T-暂停 · 3.2s 前触发</span>
          </div>
          <div className="cm-title">客户赎回压力骤升至 84%</div>
          <div className="cm-desc">
            上海某险资委外今日下午发起 <em>9.5 亿</em> 大额赎回申请。
            若 T+1 现金及高流动品不足覆盖，将被迫折价抛售信用债，引发净值二次下跌与连锁赎回。
          </div>
        </div>

        <div className="cm-metrics">
          <div className="cm-metric danger">
            <span className="k">赎回压力</span>
            <span className="v">84<span className="u">%</span></span>
            <span className="d">▲ 21 pt · 触线 80%</span>
          </div>
          <div className="cm-metric warn">
            <span className="k">T+1 可用现金</span>
            <span className="v">3.20<span className="u">亿</span></span>
            <span className="d">缺口 −6.30 亿</span>
          </div>
          <div className="cm-metric">
            <span className="k">组合净值</span>
            <span className="v">1.0182</span>
            <span className="d">本周 −0.42%</span>
          </div>
        </div>

        <div className="cm-opts">
          <CrisisOption
            k="A"
            cost="代价 · 净值"
            title="折价抛售信用债"
            desc="按市价 −1.2% 卖出 7 亿城投永续，T+0 到账，覆盖赎回。"
            preds={[
              { k: "现金", v: "+7.00 亿", tone: "up" },
              { k: "净值", v: "−0.84%", tone: "down" },
              { k: "客户信任", v: "−12 pt", tone: "down" },
            ]}
          />
          <CrisisOption
            k="B"
            cost="代价 · 杠杆"
            title="质押式回购融资"
            desc="以国债+利率债质押融入 6.5 亿隔夜资金，杠杆率上行至 138%。"
            preds={[
              { k: "现金", v: "+6.50 亿", tone: "up" },
              { k: "杠杆率", v: "118 → 138%", tone: "warn" },
              { k: "净值", v: "−0.05%", tone: "down" },
            ]}
          />
          <CrisisOption
            k="C"
            cost="代价 · 关系"
            title="协商延期赎回"
            desc="与客户沟通分期赎回（5+5），需让出业绩报酬并承诺特定补偿。"
            preds={[
              { k: "现金缺口", v: "−6.30 → −1.30", tone: "warn" },
              { k: "客户关系", v: "−4 pt", tone: "down" },
              { k: "管理费", v: "−0.18 亿", tone: "down" },
            ]}
          />
        </div>

        <div className="cm-foot">
          <span className="hint">提示：本次危机 <b>不会</b> 计入再触发计数。键盘 <b>1/2/3</b> 选择方案，<b>ESC</b> 不可关闭。</span>
          <span className="deadline"><span className="dot" />T-暂停 中</span>
        </div>
      </div>
    </div>
  );
}

function CrisisGOV() {
  return (
    <div className="overlay-host" data-role="gov">
      <BgStub />
      <div className="scrim crisis" />
      <CrisisBanner />
      <div className="cmodal">
        <div className="cm-head">
          <div className="cm-tagline">
            <span className="cm-sev">SEV-1 · HIDDEN DEBT</span>
            <span className="cm-id">EVT-2024Q1-GOV-007</span>
            <span className="cm-time">T-暂停 · 中央督导组在途</span>
          </div>
          <div className="cm-title">隐性债务敞口突破 220 亿</div>
          <div className="cm-desc">
            年度审计抽查发现 <em>3 家平台</em> 表外担保未纳入财政统计，叠加新增非标，市级隐债总规模触线。
            若不在 30 日内压降至 200 亿以下，将被列为"高风险地区"，全年新增专项债额度归零。
          </div>
        </div>

        <div className="cm-metrics">
          <div className="cm-metric danger">
            <span className="k">隐债敞口</span>
            <span className="v">223.4<span className="u">亿</span></span>
            <span className="d">超线 +23.4 亿</span>
          </div>
          <div className="cm-metric warn">
            <span className="k">年度财政收入</span>
            <span className="v">186<span className="u">亿</span></span>
            <span className="d">增速 −4.1% YoY</span>
          </div>
          <div className="cm-metric">
            <span className="k">化债任务进度</span>
            <span className="v">42<span className="u">%</span></span>
            <span className="d">本年目标 65%</span>
          </div>
        </div>

        <div className="cm-opts">
          <CrisisOption
            k="A"
            cost="代价 · 资产"
            title="划入优质国资抵销"
            desc="将市属水务集团 30% 股权注入平台，账面抵销隐债 26 亿。"
            preds={[
              { k: "隐债", v: "−26.0 亿", tone: "up" },
              { k: "可变现国资", v: "−42 亿", tone: "down" },
              { k: "财政收入", v: "−1.8 亿/年", tone: "warn" },
            ]}
          />
          <CrisisOption
            k="B"
            cost="代价 · 透明"
            title="申请特殊再融资额度"
            desc="向省厅申报 30 亿置换债，低息长期资金置换非标。"
            preds={[
              { k: "隐债", v: "−30.0 亿", tone: "up" },
              { k: "显性债务", v: "+30.0 亿", tone: "warn" },
              { k: "评级", v: "AA → AA-", tone: "down" },
            ]}
          />
          <CrisisOption
            k="C"
            cost="代价 · 仕途"
            title="向省里申请豁免"
            desc="以重点项目民生属性申请专项豁免，过程不可控。"
            preds={[
              { k: "成功率", v: "约 35%", tone: "warn" },
              { k: "若成功 隐债", v: "−23.4 亿", tone: "up" },
              { k: "若失败 政绩分", v: "−18 pt", tone: "down" },
            ]}
          />
        </div>

        <div className="cm-foot">
          <span className="hint">提示：本次处置将进入 <b>年度化债报告</b>，影响后续 4 个季度的省级评分。</span>
          <span className="deadline"><span className="dot" />T-暂停 中</span>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   导出 to window for design canvas to consume
============================================================ */
Object.assign(window, {
  OperationModal,
  ToastsDesktop,
  ToastsMobile,
  CrisisIM,
  CrisisGOV,
});
