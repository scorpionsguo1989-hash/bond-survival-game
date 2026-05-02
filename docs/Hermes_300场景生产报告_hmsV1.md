# Hermes_300场景生产报告_hmsV1

## 1. 完成情况

| 分类 | 实际数量 |
|---|---:|
| NPC 实体 | 41 |
| Saga 长线事件 | 40 |
| 季节日历 + 历史回响 | 70 |
| 区域/健康度定向 + 角色深度 | 155 |
| 黑天鹅 V2 | 15 |
| 场景合计 | 280 |

文件已写入：
- content/npcLibrary.json
- content/sagaEvents.json
- content/seasonalEvents.json
- content/targetedEvents.json
- content/blackSwansV2.json

角色深度事件拆分：CFO 25，IM 25，GOV 25。
区域定向覆盖：{'east_core': 20, 'central_capital': 20, 'west_prefecture': 20, 'northeast_old': 20}。

## 2. NPC 复用统计

| NPC ID | 名称 | 被引用次数 |
|---|---|---:|
| npc_lgfv_yu_north | 豫北开投控股 | 23 |
| npc_lgfv_yangtze_capital | 长三角资管 | 12 |
| npc_lgfv_liao_east | 辽东建发集团 | 12 |
| npc_lgfv_qian_mountain | 黔岭产投集团 | 31 |
| npc_lgfv_jiao_bay | 胶湾新城控股 | 8 |
| npc_lgfv_han_river | 汉江水务投资 | 15 |
| npc_lgfv_hexi_rail | 河西轨交建设 | 8 |
| npc_lgfv_songbei_urban | 松北城更集团 | 18 |
| npc_lgfv_minjiang_industry | 闽江产业控股 | 7 |
| npc_lgfv_jianghuai_transport | 江淮交建集团 | 13 |
| npc_lgfv_tianfu_airport | 天府临空开发 | 7 |
| npc_lgfv_huanghe_energy | 黄河能源投资 | 12 |
| npc_lgfv_bohai_port | 渤海港城投资 | 9 |
| npc_lgfv_lushan_tourism | 庐山文旅开发 | 11 |
| npc_lgfv_xibei_agri | 西北农发控股 | 7 |
| npc_lgfv_hailan_asset | 海岚国资运营 | 13 |
| npc_lgfv_chu_medicine | 楚州医药园投 | 7 |
| npc_lgfv_shanbei_mining | 陕北矿区城投 | 10 |
| npc_lgfv_icecity_heat | 冰城热力集团 | 12 |
| npc_lgfv_lake_newtown | 湖东新城发展 | 18 |
| npc_issuer_north_developer | 北方民营房企 | 7 |
| npc_issuer_coastal_property | 海岸混合房企 | 3 |
| npc_issuer_steel_private | 华北民营钢贸 | 3 |
| npc_issuer_solar_equipment | 西部光伏设备商 | 3 |
| npc_issuer_auto_supplier | 长江汽车零部件 | 3 |
| npc_issuer_mining_private | 西南民营矿业 | 3 |
| npc_issuer_healthcare_group | 东部民营医养集团 | 3 |
| npc_issuer_trade_holdco | 沿海贸易控股 | 3 |
| npc_issuer_amc_local | 地方 AMC 甲 | 3 |
| npc_issuer_securities_asset | 券商资管丙 | 5 |
| npc_bank_main_state | 主开户行 · 国有大行 A | 46 |
| npc_bank_policy_b | 政策性银行 B | 39 |
| npc_bank_city_c | 本地城商行 C | 22 |
| npc_bank_joint_d | 股份行 D | 18 |
| npc_bank_rural_e | 农商行 E | 30 |
| npc_bank_trust_f | 信托通道 F | 21 |
| npc_wm_top5_alpha | TOP 5 理财子 · 阿尔法 | 45 |
| npc_wm_city_beta | 城商行理财子 · 贝塔 | 26 |
| npc_wm_rural_gamma | 农商系理财 · 伽马 | 21 |
| npc_wm_insurance_delta | 保险资管 · 德尔塔 | 31 |
| npc_wm_broker_epsilon | 券商资管 · 艾普西隆 | 23 |

## 3. Saga 摘要

| saga_id | 主题 | 步数 | 非空跳转数 |
|---|---|---:|---:|
| saga_regional_reprice | 区域信用重定价 | 5 | 10 |
| saga_wm_redemption | 理财净值化赎回 | 5 | 10 |
| saga_debt_swap_20 | 化债名单争夺 | 5 | 10 |
| saga_offshore_property | 房企境外违约传导 | 5 | 10 |
| saga_rural_bank | 小银行风险外溢 | 5 | 10 |
| saga_asset_manager_cleanup | 资管通道清理 | 5 | 10 |
| saga_city_platform_storm | 单城平台暴雷 | 5 | 10 |
| saga_long_bond_whipsaw | 大票仓利率震荡 | 5 | 10 |

## 4. 接入与问题记录

1. 已在 `js/eventEngine.js` 接入新增内容文件：`seasonalEvents.json`、`targetedEvents.json` 会并入普通随机池；`blackSwansV2.json` 会并入黑天鹅池；`sagaEvents.json` 与 `npcLibrary.json` 会随 `loadEvents()` 返回。
2. 已实现 `triggerCondition` 过滤：支持 min/maxQuarter、requireRole、regionTier、healthLevel、policyMin/policyMax，以及 cash/nav/debtRatio/leverageRatio 等阈值字段。
3. 已实现 Saga 基础接续：玩家选择 Saga 事件后，根据 `next_saga_step_map[choiceIdx]` 写入下一步；下一季若存在 `nextSagaEventId`，强制触发该 Saga 步骤，不再走主线/随机抽取；返回 null 时将该 saga 标记完成，避免重复开局。
4. `npcLibrary.json` 已随事件数据加载，但 NPC hover/记忆面板尚未做 UI 接入；当前只是内容与数据层可用。
5. 延迟后果 `_delayedEffect` 已写入部分选项，但当前 engine 仍只跳过内部 flag；若要真正生效，需要后续实现 pending delayed effects 队列。

## 5. 建议

1. 加一个“NPC 记忆”面板：玩家遇到同一 NPC 三次后，显示它的 historic_event 和最近一次玩家选择。
2. Saga 引擎可记录上一选择的 choiceIdx，并在下一步 body 里允许引用前序选择，后续剧情会更像连续牌局。
3. 增加区域画像 origin：regionTier、healthLevel、财政依赖、土地依赖、产业强度，targetedEvents 的触发会更准。
4. 黑天鹅可设置全局冷却：同一局若出过“地产链条”，下一次优先抽“银行/理财/政策”类，避免冲击同质化。
5. 当前 delayedEffect 只是内容层预埋，建议在 state 里加 pendingEffects，按 quartersPassed 结算。

## 6. 自检结论

Schema/引用/JSON 解析自检：通过。
前端数据层接入测试：`npm test` 通过，13 个测试文件、129 个测试全部通过。
项目未配置 `npm run build`，可用脚本只有 `test`、`test:watch`、`serve`，因此本次以 Vitest 全量测试作为自动化验证。
未发现阻断问题。
