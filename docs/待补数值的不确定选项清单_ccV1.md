# 待补数值：赌赢了却不动经营指标的不确定选项

共 115 条。这些选项 `_uncertainty` 掷骰成功后只加分数、不改任何经营指标，
叙事上说不通（例：「争取到政策性银行专项额度介入」成功后现金一分不动）。

修订方式：给成功分支补上与文案相称的指标变化。
护栏在 `tests/content-quality.test.js`，阈值 115 只能往下调。

| 文件 | 事件 ID | 角色 | 选项 | 事件标题 | 选项文案 | 当前 effects |
|---|---|---|---|---|---|---|
| mainEvents | main_2022_q1_a | cfo | 1 | 银行收紧城投贷款额度 | 向主管局汇报，争取政策性银行专项额度介入 | score.projectProgress=3, _uncertainty=0.4 |
| mainEvents | main_2022_q1_b | cfo | 2 | 地方隐性债务专项审计启动 | 申请延期整改，优先保障在建项目进度 | score.projectProgress=4, score.compliance=-3, _uncertainty=0.5 |
| mainEvents | main_2022_q4_a | cfo | 1 | 理财赎回潮蔓延 | 按兵不动，等待政策面安抚 | _uncertainty=0.5, score.compliance=1 |
| mainEvents | main_2023_q4_a | cfo | 1 | 上级考核城投债务化解进度 | 适度包装指标数据突出亮点 | score.compliance=-2, score.crisisResponse=3, _uncertainty=0.5 |
| mainEvents | main_2024_q1_a | cfo | 1 | 非标全面收紧，监管新规落地 | 申请分阶段整改，争取过渡期 | _uncertainty=0.3, score.projectProgress=-2 |
| randomEvents | rand_policy_window_guidance | cfo | 1 | 监管窗口指导：非标整改 | 缓期整改，先保兑付 | _uncertainty=0.3 |
| randomEvents | rand_policy_inspection | cfo | 1 | 审计组进驻 | 选择性配合，控制信息披露 | _uncertainty=0.4, score.compliance=-2 |
| blackSwans | swan_offshore_bank_collapse | cfo | 2 | 海外大型银行突发倒闭 | 尝试展期沟通 | _uncertainty=0.4, score.crisisResponse=8, score.compliance=4 |
| blackSwans | swan_rating_downgrade | im | 1 | 国际评级机构跨级下调中国城投评级 | 用利率衍生品对冲信用利差走阔 | _uncertainty=0.5, score.crisisResponse=6, score.development=4 |
| historicalSagas | saga_hist_4t_step2 | gov | 2 | 平台抢地潮，土地一夜涨三成 | 推迟一周『等数据更全』 | _uncertainty=0.5 |
| historicalSagas | saga_hist_4t_step3 | cfo | 2 | 19 号文清理预警，平台融资闸门收窄 | 找市领导出面斡旋『保全名单地位』 | _uncertainty=0.5, score.compliance=-2, score.crisisResponse=3 |
| historicalSagas | saga_hist_4t_step3 | gov | 2 | 19 号文清理预警，平台融资闸门收窄 | 按下不报，赌 19 号文执行不严 | _uncertainty=0.45, _delayedEffect={'afterQuarters': 5, 'effects': {'score.compliance': -8}} |
| historicalSagas | saga_hist_qianhuang_step1 | im | 2 | 隔夜利率早盘飙到 13% | 硬扛今天，赌央行傍晚出手稳市 | _uncertainty=0.4, _delayedEffect={'afterQuarters': 1, 'effects': {'nav': -0.025, 'redemptionPressure': 12}} |
| historicalSagas | saga_hist_chaori_step2 | cfo | 0 | 持有人会议召开：减半兑付 vs 全额展期 | 联合主承推动 A 方案 + 用案例公关市场 | score.compliance=3, score.development=3, _uncertainty=0.5 |
| historicalSagas | saga_hist_chaori_step2 | im | 2 | 持有人会议召开：减半兑付 vs 全额展期 | 弃权，让其他人决定 | _uncertainty=0.5 |
| historicalSagas | saga_hist_chaori_step2 | gov | 2 | 持有人会议召开：减半兑付 vs 全额展期 | 暂不表态，看持有人态度再说 | _uncertainty=0.5 |
| historicalSagas | saga_hist_chaori_step3 | cfo | 2 | 回头看：刚兑被打破后，定价模型集体重写 | 推动评级升档，争取继续吃 AAA 红利 | _uncertainty=0.5, score.development=3 |
| historicalSagas | saga_hist_chaori_step3 | im | 2 | 回头看：刚兑被打破后，定价模型集体重写 | 申请『信用研究专户』例外，继续做下沉 | _uncertainty=0.5, score.development=4, score.compliance=-2 |
| historicalSagas | saga_hist_43hao_step3 | im | 1 | 存量债务自查：账内账外要不要并 | 看公开披露口径，不主动调 | _uncertainty=0.5 |
| historicalSagas | saga_hist_43hao_step3 | gov | 2 | 存量债务自查：账内账外要不要并 | 拆成两次报，先报 22 亿、半年后再报 6 亿 | score.compliance=0, _uncertainty=0.45 |
| historicalSagas | saga_hist_43hao_step4 | cfo | 2 | 化债 1.0 收官：你的转型成绩单 | 包装数据冲『白名单』 | _uncertainty=0.4, _delayedEffect={'afterQuarters': 3, 'effects': {'score.compliance': -5}} |
| historicalSagas | saga_hist_baoshang_step1 | gov | 1 | 突发：本地城商行 C 被监管接管，同业刚兑被 | 只内部沟通，不公开表态 | score.compliance=3, _uncertainty=0.5 |
| historicalSagas | saga_hist_carrot_step2 | cfo | 2 | 代持市场冻结，加杠杆策略失效 | 求市政府背书让另一家国企接盘 | _uncertainty=0.5, score.compliance=-3 |
| historicalSagas | saga_hist_carrot_step3 | im | 1 | 回头看：内控合规重塑了债市规则 | 通过精选 ABS / REITs 补足收益 | score.development=4, _uncertainty=0.5 |
| historicalSagas | saga_hist_p2p_step1 | cfo | 1 | 今天起一周内 8 家头部 P2P 平台跑路 | 联合其他受害方推动政府介入 | _uncertainty=0.4, score.crisisResponse=3 |
| historicalSagas | saga_hist_p2p_step2 | cfo | 2 | 信用债二级踩踏：所有民企发行人利差走宽 | 推迟一个月，等市场稳定 | _uncertainty=0.5, _delayedEffect={'afterQuarters': 2, 'effects': {'cash': -3.0}} |
| historicalSagas | saga_hist_p2p_step3 | im | 1 | 监管全面清退：备案制取消、平台数量从 500 | 维持原产品定位，靠净值表现说话 | _uncertainty=0.5 |
| historicalSagas | saga_hist_yongmei_step2 | im | 0 | 永煤所在省 7 家国企被立案，发行被全面暂停 | 全面下沉调研：实地走访 + 财务深度核查 | score.compliance=6, score.development=4, _uncertainty=0.55 |
| historicalSagas | saga_hist_yongmei_step3 | cfo | 2 | 央行表态：严禁逃废债 + 中介机构核查 | 推迟发行 + 等市场企稳 | _uncertainty=0.5 |
| historicalSagas | saga_hist_yongmei_step4 | cfo | 2 | 市场分层：『真国企』与『伪国企』开始定价 | 争取被纳入『地方核心平台白名单』 | _uncertainty=0.55, score.development=4 |
| historicalSagas | saga_hist_yongmei_step4 | im | 2 | 市场分层：『真国企』与『伪国企』开始定价 | 维持仓位 + 看后续报表 | _uncertainty=0.5 |
| historicalSagas | saga_hist_yongmei_step4 | gov | 1 | 市场分层：『真国企』与『伪国企』开始定价 | 尽量报『核心 + 重点』 | _uncertainty=0.45, _delayedEffect={'afterQuarters': 4, 'effects': {'score.compliance': -5}} |
| historicalSagas | saga_hist_3rl_step5 | im | 2 | 回头看：地产链条洗牌后的债市新格局 | 做地产 ABS + REITs 替代直接持债 | score.development=5, _uncertainty=0.5 |
| historicalSagas | saga_hist_evergrande_step3 | im | 1 | 中央『保交楼专项基金』3000 亿落地 | 做地产 ABS / REITs 替代 | score.development=5, _uncertainty=0.5 |
| historicalSagas | saga_hist_evergrande_step4 | cfo | 1 | 沧澜重整方案出台：分 12 年偿还 + 折价 | 联合其他债权人争取更好条件 | _uncertainty=0.5, score.crisisResponse=4 |
| historicalSagas | saga_hist_evergrande_step4 | cfo | 2 | 沧澜重整方案出台：分 12 年偿还 + 折价 | 走清算程序，追求 100% 求偿权 | _uncertainty=0.3, score.compliance=4 |
| historicalSagas | saga_hist_evergrande_step4 | im | 1 | 沧澜重整方案出台：分 12 年偿还 + 折价 | 联合机构投资者反对 | _uncertainty=0.4 |
| historicalSagas | saga_hist_evergrande_step4 | im | 2 | 沧澜重整方案出台：分 12 年偿还 + 折价 | 弃权，让基金会决定 | _uncertainty=0.5 |
| historicalSagas | saga_hist_22redm_step1 | gov | 2 | 11 月债市突然急跌：理财净值首次集体破净 | 维持中立，让市场自己消化 | _uncertainty=0.5 |
| historicalSagas | saga_hist_22redm_step2 | im | 2 | 市场踩踏：信用债二级一周走宽 80bp | 推 R3 高波动产品分流稳健客户 | score.development=3, _uncertainty=0.5 |
| historicalSagas | saga_hist_22redm_step3 | cfo | 1 | 央行下场：开 3000 亿 OMO + 窗口 | 申请会计师事务所『分摊到下季度』 | _uncertainty=0.5 |
| historicalSagas | saga_hist_22redm_step4 | cfo | 2 | 回头看：净值化时代客户教育的代价 | 试水多元化产品组合 | score.development=4, _uncertainty=0.5 |
| historicalSagas | saga_hist_yunnan_step1 | cfo | 1 | 西部省高速公路投资公司：千亿贷款只还利息不还 | 维持现状，相信『地方平台不会被一刀切』 | _uncertainty=0.5 |
| historicalSagas | saga_hist_yunnan_step2 | cfo | 1 | 银监会下文：『城投平台贷款分类管理 + 限额 | 推动 PPP / BOT 模式新业务 | score.development=4, _uncertainty=0.5 |
| historicalSagas | saga_hist_yunnan_step2 | cfo | 2 | 银监会下文：『城投平台贷款分类管理 + 限额 | 申请省级支持，请求例外额度 | _uncertainty=0.4, transferPayment=1 |
| historicalSagas | saga_hist_yunnan_step2 | im | 2 | 银监会下文：『城投平台贷款分类管理 + 限额 | 维持现状，看政策细则 | _uncertainty=0.5 |
| historicalSagas | saga_hist_2015crash_step1 | cfo | 2 | A 股一周跌 30%，避险资金涌入债市 | 暂缓发行，先观察股市后续 | _uncertainty=0.5 |
| historicalSagas | saga_hist_2015crash_step2 | cfo | 2 | 央行 + 证监会出台『救市组合拳』，市场预期 | 推迟发行，相信进一步政策利好 | _uncertainty=0.5 |
| historicalSagas | saga_hist_2015crash_step3 | im | 2 | 回头看：股债跷跷板 + 资产配置思维兴起 | 做 FOF 配置型产品 | score.development=5, _uncertainty=0.5 |
| historicalSagas | saga_hist_ppp_step1 | cfo | 2 | 财政部主推 PPP：城投转型新出路 | 暂时观望，等行业规则成熟 | _uncertainty=0.5 |
| historicalSagas | saga_hist_ppp_step1 | im | 1 | 财政部主推 PPP：城投转型新出路 | 做 PPP ABS / 资产证券化产品 | score.development=6, _uncertainty=0.5 |
| historicalSagas | saga_hist_ppp_step1 | gov | 2 | 财政部主推 PPP：城投转型新出路 | 暂不参与，等其他区试错 | _uncertainty=0.5 |
| historicalSagas | saga_hist_ppp_step2 | cfo | 1 | PPP 总规模超 10 万亿，但财政部开始警 | 调整该项目结构，争取保留 | _uncertainty=0.5, score.compliance=3 |
| historicalSagas | saga_hist_ppp_step3 | cfo | 1 | PPP 退潮：3 万亿项目被清理出库 | 申请财政部分补偿 | _uncertainty=0.4, score.compliance=4 |
| historicalSagas | saga_hist_ppp_step3 | cfo | 2 | PPP 退潮：3 万亿项目被清理出库 | 推动项目转商业地产开发 | _uncertainty=0.5, score.development=3 |
| historicalSagas | saga_hist_ppp_step4 | cfo | 2 | 回头看：PPP 模式的真问题 | 转型『真 EPC + 投资』复合模式 | score.development=5, _uncertainty=0.5 |
| historicalSagas | saga_hist_ppp_step4 | im | 1 | 回头看：PPP 模式的真问题 | 推 REITs 类产品 | score.development=6, _uncertainty=0.5 |
| historicalSagas | saga_hist_yongtai_step1 | gov | 1 | AA+ 民企『朔光新能源』15 亿短融违约 | 保持沟通 + 不主动救助 | score.compliance=5, _uncertainty=0.5 |
| historicalSagas | saga_hist_yongtai_step2 | cfo | 1 | 民企融资全面受阻：发行成功率从 80% 降至 | 维持现状，相信资质强势 | _uncertainty=0.5 |
| historicalSagas | saga_hist_yongtai_step2 | cfo | 2 | 民企融资全面受阻：发行成功率从 80% 降至 | 申请『官方信用增级』 | _uncertainty=0.4, score.compliance=4 |
| historicalSagas | saga_hist_yongtai_step3 | cfo | 2 | 回头看：民企信用边界第一次清晰化 | 争取『国家级信用增级』资质 | _uncertainty=0.5, score.development=4 |
| historicalSagas | saga_hist_hidden_office_step1 | cfo | 1 | 中央财政化解地方隐债工作领导小组挂牌 | 选择性配合 + 控制信息披露 | score.compliance=3, _uncertainty=0.5 |
| historicalSagas | saga_hist_hidden_office_step3 | cfo | 2 | 回头看：中央化债机制建设的里程碑 | 扩展商业化业务弥补缺口 | score.development=5, _uncertainty=0.5 |
| historicalSagas | saga_hist_3rl_after_step1 | im | 2 | TOP10 房企半年内 5 家违约：行业系统 | 推 ABS 转换资产 + 减少风险 | score.development=5, _uncertainty=0.5 |
| historicalSagas | saga_hist_3rl_after_step3 | im | 1 | 央企国企收购民营房企潮：行业重新洗牌 | 做地产 ABS / REITs | score.development=6, _uncertainty=0.5 |
| historicalSagas | saga_hist_dswv2_step1 | im | 2 | 中央政治局会议明确『一揽子化债方案』 | 维持现仓位 + 看后续政策 | _uncertainty=0.5 |
| historicalSagas | saga_hist_dswv2_step2 | cfo | 2 | 特殊再融资债重启：1.5 万亿额度落地 | 推迟到下批，等更优条件 | _uncertainty=0.5 |
| historicalSagas | saga_hist_dswv2_step2 | im | 2 | 特殊再融资债重启：1.5 万亿额度落地 | 做特殊再融资债的二级交易 | score.development=6, _uncertainty=0.5 |
| historicalSagas | saga_hist_dswv2_step4 | im | 2 | 化债白名单扩容：『可持续化债』成新标准 | 做转型期 ABS 投资 | score.development=6, _uncertainty=0.5 |
| historicalSagas | saga_hist_dswv2_step5 | cfo | 2 | 回头看：化债 2.0 重塑城投行业 | 扩展跨区域业务 | score.development=5, _uncertainty=0.5 |
| historicalSagas | saga_hist_35hao_step1 | cfo | 1 | 35 号文落地：12 个重点化债省份名单出台 | 推动平台『跨省搬迁』规避限制 | _uncertainty=0.4, score.compliance=-3 |
| historicalSagas | saga_hist_35hao_step4 | cfo | 2 | 回头看：化债攻坚 5 年的成绩单 | 扩展跨区域业务 | score.development=5, _uncertainty=0.5 |
| historicalSagas | saga_hist_sars_step1 | gov | 2 | 突发疫情冲击经济，地方稳增长压力骤增 | 暂缓 + 等政策稳定 | _uncertainty=0.5 |
| historicalSagas | saga_hist_sars_step3 | cfo | 1 | 回头看：城投平台的『黄金起源期』 | 维持高速发展 | score.development=4, _uncertainty=0.5 |
| historicalSagas | saga_hist_19hao_step3 | cfo | 2 | 回头看：城投平台第一次系统性整顿 | 推动平台 + 政府关系再界定 | score.compliance=5, _uncertainty=0.5 |
| historicalSagas | saga_hist_shadow_step4 | cfo | 2 | 回头看：影子银行整顿改写中国金融格局 | 推动金融创新 + 找新出路 | score.development=5, _uncertainty=0.5 |
| historicalSagas | saga_hist_811_step1 | cfo | 2 | 8 月 11 日突发：人民币中间价大幅下调  | 推动汇率衍生品对冲 | score.development=4, _uncertainty=0.5 |
| historicalSagas | saga_hist_811_step1 | gov | 1 | 8 月 11 日突发：人民币中间价大幅下调  | 等市场稳定 + 评估损失 | _uncertainty=0.5 |
| historicalSagas | saga_hist_811_step2 | cfo | 1 | 美元债融资断流，房企 + 城投美元融资全面停 | 推迟发行 + 等市场恢复 | _uncertainty=0.5 |
| historicalSagas | saga_hist_811_step3 | cfo | 2 | 回头看：人民币国际化与汇率管理新阶段 | 推动『境内 + 境外』平衡发展 | score.development=5, _uncertainty=0.5 |
| historicalSagas | saga_hist_covid_step1 | cfo | 2 | 新冠疫情突发：央行紧急降准 1pp + 信用 | 等疫情明朗 | _uncertainty=0.5 |
| historicalSagas | saga_hist_covid_step2 | cfo | 1 | 复工复产 + 经济快速反弹，宽松开始边际收紧 | 等市场更明朗 | _uncertainty=0.5 |
| historicalSagas | saga_hist_zigang_step1 | gov | 2 | 另一家 AAA 国企违约：燔焰之后又一例 | 维持现状 + 看市场反应 | _uncertainty=0.5 |
| historicalSagas | saga_hist_zigang_step2 | cfo | 1 | 市场全面重新定价：『国企信用』溢价消失 | 推迟发行 + 等市场修复 | _uncertainty=0.5 |
| historicalSagas | saga_hist_zigang_step3 | cfo | 2 | 回头看：国企信用从『系统性兜底』到『分类管理 | 推动评级机构上调 | _uncertainty=0.5, score.development=3 |
| historicalSagas | saga_hist_fed_step1 | cfo | 2 | 美联储一年加息 5 次，全球资金回流美元 | 推迟续作 + 等美联储转向 | _uncertainty=0.5 |
| historicalSagas | saga_hist_fed_step2 | cfo | 1 | 中美利差倒挂，资本外流压力增大 | 维持现状 + 看央行操作 | _uncertainty=0.5 |
| historicalSagas | saga_hist_fed_step2 | cfo | 2 | 中美利差倒挂，资本外流压力增大 | 改用浮动利率融资 | score.development=4, _uncertainty=0.5 |
| historicalSagas | saga_hist_fed_step3 | cfo | 2 | 回头看：全球货币周期对中国的传导 | 推动境外业务 + 拓展空间 | score.development=5, _uncertainty=0.5 |
| historicalSagas | saga_hist_july_step1 | im | 2 | 中央政治局 7 月会议明确『一揽子化债方案』 | 维持现仓位 | _uncertainty=0.5 |
| historicalSagas | saga_hist_july_step2 | im | 2 | 财政部 + 央行 + 国务院化债方案落地 | 做化债债券二级交易 | score.development=5, _uncertainty=0.5 |
| historicalSagas | saga_hist_july_step3 | cfo | 2 | 化债成效初现：城投信用利差收窄 | 扩展业务 + 抢市场 | score.development=5, _uncertainty=0.5 |
| historicalSagas | saga_hist_july_step4 | cfo | 2 | 回头看：化债 2.0 的政策智慧 | 扩展跨区域 | score.development=5, _uncertainty=0.5 |
| historicalSagas | saga_hist_offshore_step1 | cfo | 0 | 外管局 + 发改委发文：境外债发行『审批 + | 立刻申报 + 抓紧审批 | _uncertainty=0.5, score.compliance=5 |
| historicalSagas | saga_hist_offshore_step1 | cfo | 2 | 外管局 + 发改委发文：境外债发行『审批 + | 推迟境外融资计划 | _uncertainty=0.5 |
| historicalSagas | saga_hist_offshore_step1 | gov | 1 | 外管局 + 发改委发文：境外债发行『审批 + | 申请境外特殊审批 | _uncertainty=0.4, score.compliance=4 |
| historicalSagas | saga_hist_offshore_step2 | cfo | 2 | 中资美元债存量缩减 1500 亿美元，市场重 | 推动二级回售 | _uncertainty=0.5 |
| historicalSagas | saga_hist_offshore_step3 | cfo | 2 | 回头看：境外融资进入『有序管理』阶段 | 推动境外业务多元化 | score.development=5, _uncertainty=0.5 |
| historicalSagas | saga_hist_consol_step1 | cfo | 1 | 省级国资委推动『区域平台公司大整合』 | 维持独立运营 + 申请例外 | _uncertainty=0.5, score.compliance=4 |
| historicalSagas | saga_hist_consol_step1 | im | 1 | 省级国资委推动『区域平台公司大整合』 | 等待整合方案确定 | _uncertainty=0.5 |
| historicalSagas | saga_hist_consol_step2 | cfo | 2 | 整合方案落地：你的平台被并入市级集团 | 申请调任新业务 | score.development=4, _uncertainty=0.5 |
| historicalSagas | saga_hist_consol_step3 | cfo | 2 | 全国平台数从 13000 家压减到 8000 | 推动跨区域 + 跨行业拓展 | score.development=5, _uncertainty=0.5 |
| historicalSagas | saga_hist_consol_step4 | cfo | 2 | 回头看：城投行业进入『新发展时代』 | 推动行业创新 | score.development=6, _uncertainty=0.5 |
| openingEvents | opening_cfo_v_peer | cfo | 1 | 开年首日：邻省平台被全国通报 | 去省里争取「未涉及隐债」的明牌 | score.compliance=3, _uncertainty=0.5 |
| openingEvents | opening_cfo_slow_market | cfo | 1 | 开年首日：中票成本悄悄从 5.0 升到 5. | 推迟一周，找两家主承再问 | score.compliance=3, _uncertainty=0.55 |
| openingEvents | opening_cfo_slow_peer | cfo | 2 | 开年首日：圈内传「X 区在排查」 | 什么都不做，赌排查不会到本辖区 | _uncertainty=0.45, score.compliance=-2 |
| openingEvents | opening_cfo_redm_list | cfo | 2 | 开年首日：被列入化债重点观察名单 | 通过老领导斡旋，争取被踢出名单 | score.compliance=-5, _uncertainty=0.4, score.crisisResponse=4 |
| openingEvents | opening_cfo_redm_peer | cfo | 1 | 开年首日：兄弟平台已经技术性违约 | 去之前先联系市领导背书 | _uncertainty=0.55, score.crisisResponse=3 |
| openingEvents | opening_cfo_redm_internal | cfo | 1 | 开年首日：主开户行重新评估全部授信 | 全力配合主行评估，争取保全 | score.compliance=5, _uncertainty=0.55 |
| openingEvents | opening_im_slow_peer | im | 1 | 开年首日：同业某产品净值悄悄回撤 | 查清楚到底是不是真的踩雷 | score.compliance=4, _uncertainty=0.6 |
| openingEvents | opening_im_redm_policy | im | 2 | 开年首日：监管「不得大规模赎回」窗口指导 | 跟监管申请被纳入「窗口指导名单」 | _uncertainty=0.4, score.crisisResponse=4 |
| openingEvents | opening_im_redm_internal | im | 2 | 开年首日：风控要求立刻减杠杆 + 砍信用 | 和风控对抗，要求重新评估 | score.compliance=-5, _uncertainty=0.3, score.crisisResponse=3 |
| openingEvents | opening_gov_redm_market | gov | 2 | 开年首日：辖区平台债二级上行 200bp | 组织持有人会议申请展期 | _uncertainty=0.5, score.crisisResponse=4 |
| openingEvents | opening_gov_redm_internal | gov | 0 | 开年首日：副市长被纪委约谈 | 维持现有节奏，不主动改方向 | score.compliance=3, _uncertainty=0.55 |
| openingEvents | opening_generic_im_strategy | im | 2 | 开年首日：投决会要求重审策略 | 建议老板「等 Q1 数据出来再决定」 | _uncertainty=0.55, score.compliance=3 |
