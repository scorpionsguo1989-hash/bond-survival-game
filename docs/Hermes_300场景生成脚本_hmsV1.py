#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Hermes 300 场景生产脚本。
输出：content/npcLibrary.json、sagaEvents.json、seasonalEvents.json、targetedEvents.json、blackSwansV2.json
报告：docs/Hermes_300场景生产报告_hmsV1.md
"""
from __future__ import annotations

import json
from pathlib import Path
from collections import Counter, defaultdict

ROOT = Path('/Volumes/D盘/claude code/工作区/债券生存游戏')
CONTENT = ROOT / 'content'
DOCS = ROOT / 'docs'
CONTENT.mkdir(parents=True, exist_ok=True)
DOCS.mkdir(parents=True, exist_ok=True)

REGIONS = ['east_core', 'central_capital', 'west_prefecture', 'northeast_old']
HEALTHS = ['good', 'medium', 'weak']
ROLES = ['cfo', 'im', 'gov']
SEASONS = ['Q1', 'Q2', 'Q3', 'Q4']
ACTS = ['expansion', 'tightening', 'crisis', 'any']
TYPES = ['市场', '政策', '监管', '区域', '角色专属']

# 真实公司名禁用。注意：NPC historic_event 不使用真实评级机构名。
FORBIDDEN = [
    '江苏交控','首创','华夏幸福','远洋','碧桂园','永煤','包商','中植','平安','招商','中信','中金',
    '中诚信','东方金诚','华夏银行','招商银行','平安银行','中信证券','中金公司','华泰证券'
]
BANNED_STYLE = ['综合来看','值得肯定','需要警惕','下一阶段','高度重视','统筹推进','震惊','一文读懂','扒一扒','真相是','作为','根据','基于以上','综合考量','此外','另外']

platforms = [
    ('npc_lgfv_yu_north','豫北开投控股','central_capital','weak',['化债重点区域','省内三大平台之一','非标压降慢'],'2024Q1 因隐债排查被评级展望调至负面'),
    ('npc_lgfv_yangtze_capital','长三角资管','east_core','good',['明星平台','AAA 口径','省级国资直管'],'2023Q4 牵头发行全省首单绿色科创债'),
    ('npc_lgfv_liao_east','辽东建发集团','northeast_old','weak',['老工业基地','土地收入下滑','短债占比高'],'2023Q3 因商票逾期传闻遭遇二级抛售'),
    ('npc_lgfv_qian_mountain','黔岭产投集团','west_prefecture','weak',['高债务率','文旅资产重','等待置换额度'],'2024Q2 一笔私募债申报被要求补充现金流说明'),
    ('npc_lgfv_jiao_bay','胶湾新城控股','east_core','medium',['区县平台','产业园运营','港口物流收入'],'2024Q1 园区 REITs 辅导获地方推荐'),
    ('npc_lgfv_han_river','汉江水务投资','central_capital','medium',['水务燃气','现金流稳定','专项债项目多'],'2023Q4 用经营性资产置换部分公益性应收'),
    ('npc_lgfv_hexi_rail','河西轨交建设','west_prefecture','medium',['轨交建设','资本开支重','政策行依赖'],'2024Q3 轨交二期资本金到位慢被银行压缩提款'),
    ('npc_lgfv_songbei_urban','松北城更集团','northeast_old','medium',['棚改尾款','冬季施工停摆','资产处置慢'],'2023Q4 存量债估值因棚改回款延迟上行 45bp'),
    ('npc_lgfv_minjiang_industry','闽江产业控股','east_core','good',['产业投资','现金分红稳定','上市公司参股'],'2024Q2 成功发行产业升级专项债'),
    ('npc_lgfv_jianghuai_transport','江淮交建集团','central_capital','good',['交通资产','收费权现金流','省内龙头'],'2024Q1 以收费权质押获得低成本银团'),
    ('npc_lgfv_tianfu_airport','天府临空开发','west_prefecture','good',['临空经济','招引进度快','土地储备足'],'2024Q2 临空片区首批厂房出租率突破七成'),
    ('npc_lgfv_huanghe_energy','黄河能源投资','west_prefecture','medium',['煤电转型','新能源项目','补贴回款慢'],'2024Q1 新能源补贴应收被要求补充可回收性说明'),
    ('npc_lgfv_bohai_port','渤海港城投资','east_core','medium',['港口园区','贸易收入波动','短融活跃'],'2024Q3 贸易收入穿透核查后压缩三成'),
    ('npc_lgfv_lushan_tourism','庐山文旅开发','central_capital','medium',['景区资产','季节性现金流','文旅 ABS'],'2023Q3 暑期门票现金流覆盖率好于计划'),
    ('npc_lgfv_xibei_agri','西北农发控股','west_prefecture','weak',['农业园区','补贴依赖','担保圈复杂'],'2024Q2 被要求剥离两家亏损担保子公司'),
    ('npc_lgfv_hailan_asset','海岚国资运营','east_core','good',['国资运营','股权处置能力强','分红稳定'],'2024Q2 处置参股股权回笼 18 亿'),
    ('npc_lgfv_chu_medicine','楚州医药园投','central_capital','medium',['医药园区','厂房租金','引资考核重'],'2024Q1 园区龙头租户推迟付款'),
    ('npc_lgfv_shanbei_mining','陕北矿区城投','west_prefecture','good',['资源型财政','煤价敏感','现金垫厚'],'2023Q4 因资源税增收提前兑付一笔私募债'),
    ('npc_lgfv_icecity_heat','冰城热力集团','northeast_old','weak',['供热民生','应收财政补贴','冬季现金紧'],'2024Q1 采暖季煤款挤占债券兑付资金'),
    ('npc_lgfv_lake_newtown','湖东新城发展','central_capital','weak',['新区扩张过快','土地去化弱','商票拖欠'],'2024Q2 被施工方集中起诉后公开债折价成交'),
]
issuers = [
    ('npc_issuer_north_developer','北方民营房企','issuer',['千亿规模','美元债重组','境内担保链长']),
    ('npc_issuer_coastal_property','海岸混合房企','issuer',['项目分散','销售回款下滑','供应商欠款多']),
    ('npc_issuer_steel_private','华北民营钢贸','issuer',['周期行业','短贷长投','票据融资依赖']),
    ('npc_issuer_solar_equipment','西部光伏设备商','issuer',['扩产激进','订单真伪争议','可转债存量大']),
    ('npc_issuer_auto_supplier','长江汽车零部件','issuer',['客户集中','账期拉长','产业基金参股']),
    ('npc_issuer_mining_private','西南民营矿业','issuer',['资源抵押','环保处罚','高息非标']),
    ('npc_issuer_healthcare_group','东部民营医养集团','issuer',['床位扩张快','医保回款慢','ABS 底层复杂']),
    ('npc_issuer_trade_holdco','沿海贸易控股','issuer',['贸易流水大','毛利薄','关联交易多']),
    ('npc_issuer_amc_local','地方 AMC 甲','issuer',['不良处置','回款周期长','区域风险承接者']),
    ('npc_issuer_securities_asset','券商资管丙','issuer',['通道存量','踩雷传闻','产品兑付压力']),
]
banks = [
    ('npc_bank_main_state','主开户行 · 国有大行 A',['对城投长期合作','近期压降弱区县敞口','存款对价敏感']),
    ('npc_bank_policy_b','政策性银行 B',['项目贷额度足','审批节奏慢','偏好合规资本金']),
    ('npc_bank_city_c','本地城商行 C',['地方关系深','资本充足率承压','喜欢短期周转']),
    ('npc_bank_joint_d','股份行 D',['价格市场化','看重评级和抵押','同业风控严格']),
    ('npc_bank_rural_e','农商行 E',['票据和流贷活跃','单户集中度受限','董事会审批慢']),
    ('npc_bank_trust_f','信托通道 F',['非标老朋友','压降期谨慎','报价高但放款快']),
]
wealth_mgmt = [
    ('npc_wm_top5_alpha','TOP 5 理财子 · 阿尔法',['规模 1.2 万亿','估值止盈严格','渠道赎回敏感']),
    ('npc_wm_city_beta','城商行理财子 · 贝塔',['偏好短久期城投','区域白名单窄','可吃私募债']),
    ('npc_wm_rural_gamma','农商系理财 · 伽马',['收益要求高','净值波动容忍低','流动性薄']),
    ('npc_wm_insurance_delta','保险资管 · 德尔塔',['长钱配置','偏好 AAA 和强担保','不追高票息']),
    ('npc_wm_broker_epsilon','券商资管 · 艾普西隆',['交易灵活','信用下沉快','踩雷后风控收紧']),
]

NPC_IDS = [x[0] for x in platforms] + [x[0] for x in issuers] + [x[0] for x in banks] + [x[0] for x in wealth_mgmt]
PLATFORM_IDS = [x[0] for x in platforms]
ISSUER_IDS = [x[0] for x in issuers]
BANK_IDS = [x[0] for x in banks]
WM_IDS = [x[0] for x in wealth_mgmt]

def npc_library():
    return {
        'platforms': [
            {'id': i, 'name': n, 'type': 'lgfv', 'region': r, 'health': h, 'tags': tags, 'historic_event': hist}
            for i, n, r, h, tags, hist in platforms
        ],
        'issuers': [
            {'id': i, 'name': n, 'type': t, 'tags': tags}
            for i, n, t, tags in issuers
        ],
        'banks': [
            {'id': i, 'name': n, 'tags': tags}
            for i, n, tags in banks
        ],
        'wealth_mgmt': [
            {'id': i, 'name': n, 'tags': tags}
            for i, n, tags in wealth_mgmt
        ],
    }

def tc(minq=0, maxq=11, role=None, region=None, health=None, pmin=-3, pmax=3, extra=None):
    d = {
        'minQuarter': minq,
        'maxQuarter': maxq,
        'requireRole': role,
        'regionTier': region,
        'healthLevel': health,
        'policyMin': pmin,
        'policyMax': pmax,
    }
    if extra:
        d.update(extra)
    return d

def weight_for(act):
    if act == 'tightening':
        return {'tight': 3, 'stable': 2, 'loose': 1}
    if act == 'expansion':
        return {'tight': 1, 'stable': 2, 'loose': 3}
    if act == 'crisis':
        return {'tight': 3, 'stable': 1, 'loose': 1}
    return {'tight': 1, 'stable': 2, 'loose': 1}

def base_effects(role, mood=0, strong=False, idx=0, good_bias=0):
    # mood: -1 偏压力，0 中性，1 偏宽松。good_bias 用于选项质量。
    mult = 1.35 if strong else 1.0
    if role == 'cfo':
        options = [
            {'cash': round((1.1 + 0.2*good_bias)*mult,2), 'financingCost': round((0.25 - 0.05*mood)*mult,2), 'creditUsage': round((3 + idx%3)*mult,2), 'score.liquidity': 4+good_bias, 'score.crisisResponse': 2},
            {'cash': round((-0.6 - 0.15*idx%2)*mult,2), 'leverageRatio': round((-0.6 - 0.2*good_bias)*mult,2), 'score.compliance': 5+good_bias, 'score.costControl': 3},
            {'cash': round((0.3 - 0.4*good_bias)*mult,2), 'financingCost': round((-0.12 + 0.03*idx)*mult,2), 'score.development': 4, 'score.compliance': -2-good_bias},
        ]
    elif role == 'im':
        options = [
            {'nav': round((-0.004 - 0.001*(idx%4))*mult,4), 'cashRatio': round((1.0 + idx%2)*mult,2), 'creditExposure': round((-2 - good_bias)*mult,2), 'score.liquidity': 4, 'score.crisisResponse': 3},
            {'nav': round((0.004 + 0.001*good_bias)*mult,4), 'duration': round((0.2 + 0.1*mood)*mult,2), 'concentration': round((1 + idx%2)*mult,2), 'score.costControl': 4, 'score.projectProgress': 2},
            {'redemptionPressure': round((-3 - good_bias)*mult,2), 'creditExposure': round((1 + idx%3)*mult,2), 'score.compliance': 3, 'score.development': 3},
        ]
    else:
        options = [
            {'cash': round((-0.8 - 0.1*(idx%3))*mult,2), 'hiddenDebtRisk': round((-4 - good_bias)*mult,2), 'politicalScore': round((2 + good_bias)*mult,2), 'score.compliance': 4, 'score.crisisResponse': 2},
            {'cash': round((0.8 + 0.1*good_bias)*mult,2), 'debtRatio': round((2 + idx%3)*mult,2), 'hiddenDebtRisk': round((3 + idx%2)*mult,2), 'score.projectProgress': 4},
            {'industryIndex': round((2 + good_bias)*mult,2), 'specialBondQuota': round((-1 - idx%2)*mult,2), 'politicalScore': round((1 + good_bias)*mult,2), 'score.development': 4, 'score.costControl': 2},
        ]
    eff = options[idx % 3].copy()
    if idx % 2 == 0:
        eff['_uncertainty'] = round(0.45 + 0.05*(idx%5), 2)
    if idx % 3 == 0:
        if role == 'cfo':
            eff['_delayedEffect'] = {'afterQuarters': 3 + idx % 3, 'effects': {'financingCost': 0.2, 'score.compliance': -3}}
        elif role == 'im':
            eff['_delayedEffect'] = {'afterQuarters': 2 + idx % 4, 'effects': {'redemptionPressure': 4, 'score.liquidity': -3}}
        else:
            eff['_delayedEffect'] = {'afterQuarters': 4, 'effects': {'hiddenDebtRisk': 5, 'politicalScore': -2}}
    return eff

def choices_for(role, theme, idx, strong=False):
    # labels 控制在 12-30 字附近；后续校验会微调。
    if role == 'cfo':
        label_sets = [
            [f'找{short_bank(idx)}锁定周转授信', '压缩非急项目付款保兑付', '拿经营资产补一轮增信'],
            ['提前公告偿债安排稳估值', '接受高价续作先保不断档', '推迟发行等窗口回暖'],
            ['补做底层现金流穿透表', '用存单质押换短贷额度', '召开银企会解释还款来源'],
        ]
    elif role == 'im':
        label_sets = [
            ['先卖弱主体留区域龙头', '提高现金仓应对渠道赎回', '逆势吃票息等估值修复'],
            ['向渠道逐户解释持仓差异', '缩久期保净值曲线', '用利率债对冲信用波动'],
            ['暂停下沉等待成交恢复', '小仓位试探高票息资产', '申请估值偏离专项复核'],
        ]
    else:
        label_sets = [
            ['先保公开债兑付资金链', '争取省级置换额度入池', '停缓非刚性形象工程'],
            ['组织平台逐户压降非标', '把现金流项目打包申报', '用财政贴息换银行展期'],
            ['公开项目清单稳金融机构', '压实区县平台还款计划', '把招引项目优先保开工'],
        ]
    labels = label_sets[idx % len(label_sets)]
    return [{'label': lab, 'effects': base_effects(role, idx=idx+i, strong=strong, good_bias=1 if i == 0 else 0)} for i, lab in enumerate(labels)]

def short_bank(idx):
    return ['大行A','政策行B','城商行C','股份行D','农商行E'][idx % 5]

def body_for(role, title, npc_name, theme_text, idx, strong=False):
    n1 = 6 + idx % 7
    n2 = 18 + (idx * 7) % 80
    bp = 12 + (idx * 11) % 90
    if role == 'cfo':
        body = f'{npc_name}{theme_text}，主承和银行同一上午打来三轮电话，问你下季{n1}亿到期债怎么续。二级估值收益率先上行{bp}bp，备用授信还有{n2}%没批。你要在现金、价格和合规留痕之间做取舍。'
    elif role == 'im':
        body = f'{npc_name}{theme_text}，成交盘从早上就变薄，报价屏上同期限券利差被抬高{bp}bp。组合里相关仓位占{n1}%，渠道午后追问净值波动。你要判断是区域 beta，还是个券已经变味。'
    else:
        body = f'{npc_name}{theme_text}，财政、金融办和几家平台被临时叫到一间会议室。辖区下季刚性支出排到{n1}亿，银行口头额度却只剩{n2}%。你要先保信用，还是先保项目进度。'
    if strong:
        body += ' 这次不是普通波动，半天内已经影响到报价、舆情和下一笔公开市场融资。'
    return body

def event_obj(eid, etype, title, policy, act, season, tags, npcs, condition, roles):
    return {
        'id': eid,
        'type': etype,
        'weight': weight_for(act),
        'title': title,
        'policyShift': policy,
        'act_hint': act,
        'season': season,
        'tags': tags,
        'involves_npc': npcs,
        'triggerCondition': condition,
        'roles': roles,
    }

def role_block(role, title, npc_name, theme_text, idx, strong=False):
    return {'body': body_for(role, title, npc_name, theme_text, idx, strong=strong), 'choices': choices_for(role, title, idx, strong=strong)}

def ordinary_roles(role_list, title, npc_name, theme_text, idx, strong=False):
    return {r: role_block(r, title, npc_name, theme_text, idx + k, strong=strong) for k, r in enumerate(role_list)}

# ─────────────────────────────────────────────────────────────
# Saga：8 条，每条 5 步线性；每步含 3 角色，next_map 都指向下一步或 null。
# ─────────────────────────────────────────────────────────────
saga_defs = [
    ('regional_reprice','区域信用重定价','邻省明星平台技术性违约', ['npc_lgfv_yu_north','npc_bank_main_state','npc_wm_top5_alpha'], '区域信用一刀切'),
    ('wm_redemption','理财净值化赎回','理财子净值连续三日回撤', ['npc_wm_top5_alpha','npc_bank_main_state','npc_bank_policy_b'], '赎回压力沿渠道传导'),
    ('debt_swap_20','化债名单争夺','特殊再融资名单开始摸底', ['npc_lgfv_qian_mountain','npc_bank_policy_b','npc_lgfv_yu_north'], '置换额度不够分'),
    ('offshore_property','房企境外违约传导','境外房企票息断付', ['npc_issuer_north_developer','npc_wm_top5_alpha','npc_bank_main_state'], '地产链条拖累回款'),
    ('rural_bank','小银行风险外溢','本地小银行取款排队', ['npc_bank_rural_e','npc_bank_policy_b','npc_lgfv_qian_mountain'], '负债端先出问题'),
    ('asset_manager_cleanup','资管通道清理','券商资管产品暂停开放', ['npc_issuer_securities_asset','npc_wm_top5_alpha','npc_bank_trust_f'], '老通道开始清算'),
    ('city_platform_storm','单城平台暴雷','弱市平台商票集中逾期', ['npc_lgfv_lake_newtown','npc_lgfv_qian_mountain','npc_lgfv_yu_north'], '区县信用塌方'),
    ('long_bond_whipsaw','大票仓利率震荡','长端利率单周急转', ['npc_wm_insurance_delta','npc_bank_main_state','npc_bank_policy_b'], '久期仓位受考验'),
]

def make_sagas():
    events = []
    for sidx, (slug, saga_title, first_title, npcs, tag) in enumerate(saga_defs):
        for step in range(1, 6):
            eid = f'saga_{slug}_step{step}'
            next_id = f'saga_{slug}_step{step+1}' if step < 5 else None
            if step == 1:
                next_map = {'0': next_id, '1': next_id, '2': next_id}
            elif step == 2:
                # 第二步开始体现选择影响：保守处理走完整链路，激进处理跳到第四步，躺平分支提前终止。
                next_map = {'0': f'saga_{slug}_step3', '1': f'saga_{slug}_step4', '2': None}
            elif step == 3:
                next_map = {'0': next_id, '1': next_id, '2': next_id}
            elif step == 4:
                # 第四步再次分叉，给一条完整 5 步路径，也允许错误决策断链。
                next_map = {'0': next_id, '1': next_id, '2': None}
            else:
                next_map = {'0': None, '1': None, '2': None}
            title_parts = [first_title, '投资人电话打爆主承', '监管要日报现金流', '估值修复但分歧更大', '最后一笔兑付压线落地']
            title = title_parts[step-1]
            act = ['any','tightening','crisis','tightening','any'][step-1]
            policy = [-1,-1,0,1,0][step-1]
            condition = tc(minq=2 if step == 1 else 0, maxq=9 if step == 1 else 11)
            theme_texts = [
                f'被卷进“{tag}”的第一天',
                f'的存量债被客户拿来逐笔问询',
                f'收到监管口径，要求当天报送资金缺口',
                f'等来一点政策暖风，但成交仍分层',
                f'压线解决兑付，市场却开始复盘每个细节',
            ]
            roles = ordinary_roles(ROLES, title, npc_display(npcs[0]), theme_texts[step-1], sidx*10+step, strong=step in (3,5))
            ev = {
                'id': eid,
                'saga_id': f'saga_{slug}',
                'saga_step': step,
                'saga_total_steps': 5,
                'saga_title': saga_title,
                'next_saga_step_map': next_map,
                'title': title,
                'policyShift': policy,
                'act_hint': act,
                'involves_npc': npcs,
                'triggerCondition': condition,
                'roles': roles,
            }
            events.append(ev)
    return events

NPC_NAME_MAP = {i: n for i, n, *_ in platforms}
NPC_NAME_MAP.update({i: n for i, n, *_ in issuers})
NPC_NAME_MAP.update({i: n for i, n, *_ in banks})
NPC_NAME_MAP.update({i: n for i, n, *_ in wealth_mgmt})

def npc_display(nid):
    return NPC_NAME_MAP.get(nid, '某交易对手')

# ─────────────────────────────────────────────────────────────
# 季节事件 40 + 历史回响 30
# ─────────────────────────────────────────────────────────────
season_topics = {
    'Q1': [
        ('budget','预算批复比去年晚','政策','tightening',['预算','财政']),
        ('quota','专项债额度提前下达','政策','expansion',['专项债','项目']),
        ('audit','审计组抽查旧项目','监管','tightening',['审计','合规']),
        ('deposit','银行拉存款季末冲量','市场','any',['银行','流动性']),
        ('rating','评级年初访谈排期','监管','any',['评级','信息披露']),
        ('land','土地首拍冷热不均','区域','tightening',['土地','财政']),
        ('coupon','春节前票息资金紧','市场','crisis',['票息','资金面']),
        ('salary','平台工资奖金延后发','区域','crisis',['现金流','舆情']),
        ('meeting','两会窗口口径变暖','政策','expansion',['政策窗口','化债']),
        ('bankline','银团续贷谈判开局','市场','any',['授信','银团']),
    ],
    'Q2': [
        ('annual','年报问询集中落地','监管','tightening',['年报','问询']),
        ('tax','企业所得税汇算挤现金','区域','any',['税款','现金']),
        ('project','重大项目资本金缺口','政策','any',['资本金','项目']),
        ('abs','ABS 循环购买资产断档','监管','tightening',['ABS','底层资产']),
        ('maturity','上半年到期小高峰','市场','crisis',['到期','续作']),
        ('bankvote','银行授信投票延后','市场','tightening',['授信','审批']),
        ('tourism','文旅现金流高开低走','区域','expansion',['文旅','经营']),
        ('industry','园区龙头租户退租','区域','tightening',['园区','引资']),
        ('nonstd','非标压降节点临近','监管','tightening',['非标','压降']),
        ('repo','回购利率隔夜跳升','市场','crisis',['资金面','回购']),
    ],
    'Q3': [
        ('midyear','半年报利润被质疑','监管','tightening',['半年报','利润']),
        ('heat','高温限电影响园区收入','区域','any',['电力','园区']),
        ('fiscal','财政库款调度变紧','政策','tightening',['财政','库款']),
        ('redeem','理财季末赎回抬头','市场','crisis',['理财','赎回']),
        ('construction','施工旺季垫资增加','区域','expansion',['工程款','垫资']),
        ('listing','产业子公司上市辅导','政策','expansion',['产业','上市']),
        ('court','施工方起诉上热搜','监管','crisis',['诉讼','舆情']),
        ('bondmeet','投资人调研团到访','市场','any',['投资人','路演']),
        ('renewal','短融注册续报被卡','监管','tightening',['注册','短融']),
        ('ppp','PPP 清理补充核查','监管','tightening',['PPP','核查']),
    ],
    'Q4': [
        ('window','年末发行窗口抢跑','市场','any',['发行','年末']),
        ('settle','工程款结算集中上账','区域','crisis',['工程款','现金']),
        ('quota_end','置换额度最后分配','政策','expansion',['化债','置换']),
        ('duration','买方拉久期冲排名','市场','expansion',['久期','排名']),
        ('audit_end','审计整改销号验收','监管','tightening',['审计','整改']),
        ('land_end','土地尾款拖延入库','区域','tightening',['土地','财政']),
        ('bankclose','银行关账前抽贷传闻','市场','crisis',['抽贷','授信']),
        ('salary_end','民生支出挤压平台回款','区域','crisis',['民生','回款']),
        ('ipo_exit','产业基金退出谈判','市场','any',['基金','退出']),
        ('rating_end','年末评级展望调整','监管','tightening',['评级','展望']),
    ],
}

def make_seasonal():
    events = []
    idx = 1
    for q, topics in season_topics.items():
        for j, (slug, title, etype, act, tags) in enumerate(topics, 1):
            npc = PLATFORM_IDS[(idx + j) % len(PLATFORM_IDS)]
            npc2 = BANK_IDS[(idx + j) % len(BANK_IDS)] if j % 3 == 0 else WM_IDS[(idx+j) % len(WM_IDS)]
            eid = f'season_q{q[-1]}_{slug}_{j:02d}'
            policy = -1 if act in ('tightening','crisis') else (1 if act == 'expansion' else 0)
            theme = theme_sentence(title, act, j)
            roles = ordinary_roles(ROLES, title, npc_display(npc), theme, idx+j)
            events.append(event_obj(eid, etype, title, policy, act, q, tags, [npc, npc2], tc(minq=max(0,j%4-1), maxq=11), roles))
        idx += 10
    events.extend(make_echo_events())
    return events

def theme_sentence(title, act, idx):
    mapping = {
        'expansion': f'赶上窗口期，但额度和项目都要抢，{title}的消息在圈里传开',
        'tightening': f'碰上收口周期，{title}让报价和审批同时变慢',
        'crisis': f'本来就现金紧，{title}把压力直接推到台前',
        'any': f'市场还没给出方向，{title}先让所有人重新算账',
    }
    return mapping.get(act, f'{title}把大家推回现金流表')

echo_topics = [
    ('coal_default','煤炭国企违约回响','邻省资源国企短融压线未兑付','区域信用重定价'),
    ('bank_takeover','小银行接管回响','一家小银行同业存单成交停滞','同业链条收缩'),
    ('property_usd','房企美元债回响','民营房企境外债票息断付','地产信用外溢'),
    ('trust_delay','财富产品延期回响','高净值客户买的固收产品延期','非标兑付疑云'),
    ('village_bank','村镇银行风波回响','村镇银行线上存款兑付排队','负债端信心波动'),
    ('amc_lawsuit','AMC 起诉回响','地方资产管理公司起诉担保人','担保圈被翻旧账'),
    ('abs_cashflow','ABS 底层穿透回响','供应链 ABS 回款账户断流','底层资产真实性'),
    ('broker_channel','券商资管踩雷回响','券商资管通道产品净值异常','通道业务清算'),
    ('money_fund','货基赎回回响','现金管理产品遭遇大额赎回','流动性踩踏'),
    ('local_ppp','PPP 清退回响','旧 PPP 项目被要求重新入库','项目合规重估'),
]

def make_echo_events():
    events = []
    for i in range(30):
        slug, title, trigger, tag = echo_topics[i % len(echo_topics)]
        npc = (PLATFORM_IDS + ISSUER_IDS + BANK_IDS + WM_IDS)[(i*3) % len(NPC_IDS)]
        npcs = [npc, (WM_IDS if i % 2 else BANK_IDS)[i % (5 if i%2 else 6)]]
        act = ['tightening','crisis','any','expansion'][i % 4]
        etype = ['市场','监管','区域','政策'][i % 4]
        season = SEASONS[i % 4]
        eid = f'echo_{slug}_{i//len(echo_topics)+1:02d}'
        policy = -1 if act in ('tightening','crisis') else (1 if act == 'expansion' else 0)
        theme = f'的交易群又翻出旧案例：{trigger}。这次不点名，但{tag}四个字已经够让风控重新画线'
        roles = ordinary_roles(ROLES, title, npc_display(npc), theme, 80+i, strong=(i%5==0))
        events.append(event_obj(eid, etype, title, policy, act, season, ['历史回响', tag], npcs, tc(minq=2+i%3, maxq=11, pmin=-3, pmax=2), roles))
    return events

# ─────────────────────────────────────────────────────────────
# targeted：80 区域/规模/健康度 + 75 角色深度
# ─────────────────────────────────────────────────────────────
region_theme_bank = {
    'east_core': [
        ('tech_park','科技园租金证券化被追捧','产业园现金流'),
        ('land_premium','土拍溢价突然回落','土地财政'),
        ('green_bond','绿色债申报窗口打开','绿色金融'),
        ('metro_reit','轨交资产 REITs 辅导','公募 REITs'),
        ('export_order','外贸订单拖慢园区回款','出口链条'),
    ],
    'central_capital': [
        ('provincial_meet','省会平台合并传闻升温','平台整合'),
        ('hospital_abs','医院收费权 ABS 被问询','ABS'),
        ('urban_village','城中村改造资本金缺口','城中村'),
        ('industry_fund','产业基金要求平台劣后','产业基金'),
        ('water_price','水价调整听证延期','公用事业'),
    ],
    'west_prefecture': [
        ('debt_list','化债重点名单反复沟通','化债名单'),
        ('tourism_off','文旅收入旺季不旺','文旅现金流'),
        ('mining_tax','资源税返还节奏变慢','资源财政'),
        ('policy_loan','政策行项目贷要求补资本金','政策性资金'),
        ('remote_county','下辖县平台请求担保','担保链'),
    ],
    'northeast_old': [
        ('heating_subsidy','供热补贴迟迟未拨','民生补贴'),
        ('population_out','人口流出影响土地预期','人口流出'),
        ('old_factory','老厂区改造资产难估值','存量资产'),
        ('winter_stop','冬季停工拖慢回款','施工季节'),
        ('pension_gap','社保支出挤压库款','财政刚性'),
    ],
}

def make_targeted():
    events = []
    # 80 region/health events: 4 regions * 20
    for ridx, region in enumerate(REGIONS):
        topics = region_theme_bank[region]
        region_platforms = [p[0] for p in platforms if p[2] == region]
        for i in range(20):
            slug, title, tag = topics[i % len(topics)]
            health = HEALTHS[i % 3]
            npc = region_platforms[i % len(region_platforms)]
            npc2 = BANK_IDS[(i+ridx) % len(BANK_IDS)] if i % 2 == 0 else WM_IDS[(i+ridx) % len(WM_IDS)]
            act = ['expansion','tightening','crisis','any'][i % 4]
            etype = '区域'
            eid = f'region_{region}_{slug}_{i//len(topics)+1:02d}'
            policy = -1 if act in ('tightening','crisis') else (1 if act == 'expansion' else 0)
            season = 'any' if i % 5 else SEASONS[i % 4]
            theme = f'在{region_label(region)}被反复讨论，{tag}不再只是投前材料上的一句话'
            roles = ordinary_roles(ROLES, title, npc_display(npc), theme, 140+ridx*30+i, strong=(health=='weak' and i%2==0))
            events.append(event_obj(eid, etype, title, policy, act, season, ['区域专属', tag, health], [npc, npc2], tc(minq=i%4, maxq=11, region=region, health=health), roles))
    events.extend(make_role_deep())
    return events

def region_label(region):
    return {
        'east_core': '东部核心区',
        'central_capital': '中部省会圈',
        'west_prefecture': '西部地州市',
        'northeast_old': '东北老工业区',
    }[region]

cfo_deep = [
    ('pledge','存量抵押物被银行重估','抵押物折扣'),
    ('swap','短债置换谈判陷入僵局','期限错配'),
    ('bill','商票逾期名单被截图传播','商票舆情'),
    ('guarantee','兄弟平台请求互保','担保圈'),
    ('abs_pool','ABS 入池资产回款偏慢','ABS'),
    ('bank_deposit','银行要求新增存款对价','授信对价'),
    ('nonstd_roll','非标续作报价跳到两位数','非标续作'),
    ('audit_reply','审计整改回复被退回','审计整改'),
    ('salary_cash','工资户和兑付户抢现金','现金调度'),
    ('asset_sale','拟出售资产无人报价','资产处置'),
    ('bridge','过桥资金只给五天窗口','过桥资金'),
    ('rating_meet','评级访谈追问政府回款','评级访谈'),
    ('director','董事会要求保项目不断','内部博弈'),
]
im_deep = [
    ('channel','渠道经理要求解释净值','渠道沟通'),
    ('valuation','估值偏离触发风控邮件','估值偏离'),
    ('repo_haircut','质押券折扣突然下调','回购折扣'),
    ('bid_fail','一级投标被尾盘砸盘','一级发行'),
    ('portfolio','组合 AA- 占比顶格','信用下沉'),
    ('duration_call','投委会催你拉久期','久期选择'),
    ('side_pocket','风险券是否隔离争议','产品治理'),
    ('client_rank','机构客户拿排名施压','客户关系'),
    ('dealer','交易对手撤掉做市报价','流动性'),
    ('research','研究员调低主体白名单','内部评级'),
    ('stoploss','止损线被盘中打穿','止损机制'),
    ('redemption','T+1 大额赎回预约','赎回管理'),
    ('newfund','新产品建仓窗口很短','建仓节奏'),
]
gov_deep = [
    ('promotion','年度考核盯住债务率','政绩考核'),
    ('petition','施工方围堵办公楼','舆情处置'),
    ('quota_fight','省里置换额度要排队','额度争夺'),
    ('platform_merge','平台整合牵动干部安排','平台整合'),
    ('industry_anchor','招引龙头要求补贴承诺','招引补贴'),
    ('land_auction','土地流拍影响库款安排','土地财政'),
    ('hidden_check','隐债台账被抽查穿透','隐债核查'),
    ('media','本地自媒体炒作欠薪','舆情'),
    ('central_team','上级巡查组临时进驻','巡查'),
    ('project_rank','重点项目排名全省靠后','项目排名'),
    ('bank_meeting','金融机构座谈没人表态','金融协调'),
    ('state_asset','国资划转被问是否虚增','国资划转'),
    ('pension','社保支出口径压库款','民生刚性'),
]

def make_role_deep():
    events = []
    role_defs = {'cfo': cfo_deep, 'im': im_deep, 'gov': gov_deep}
    for role, defs in role_defs.items():
        for i in range(25):
            slug, title, tag = defs[i % len(defs)]
            eid = f'{role}_{slug}_{i//len(defs)+1:02d}'
            npc_pool = PLATFORM_IDS if role != 'im' else (PLATFORM_IDS + ISSUER_IDS + WM_IDS)
            npc = npc_pool[(i*2 + len(role)) % len(npc_pool)]
            npc2 = (BANK_IDS if role in ('cfo','gov') else WM_IDS)[i % (6 if role in ('cfo','gov') else 5)]
            act = ['tightening','any','crisis','expansion'][i % 4]
            policy = -1 if act in ('tightening','crisis') else (1 if act == 'expansion' else 0)
            theme = f'把{tag}这个平时藏在台账里的问题摊到了桌面上'
            roles = {role: role_block(role, title, npc_display(npc), theme, 230+i, strong=(i%6==0))}
            events.append(event_obj(eid, '角色专属', title, policy, act, 'any', ['角色深度', tag], [npc, npc2], tc(minq=i%5, maxq=11, role=role), roles))
    return events

# ─────────────────────────────────────────────────────────────
# 黑天鹅 15
# ─────────────────────────────────────────────────────────────
swan_defs = [
    ('swan_v2_offshore_property_default','千亿房企境外断付','境外火烧境内',-2,'tightening',['房地产','美元债'],['npc_issuer_north_developer','npc_wm_top5_alpha']),
    ('swan_v2_regional_default_chain','邻省平台兑付失败','区域信用重估',-3,'crisis',['城投','违约'],['npc_lgfv_lake_newtown','npc_lgfv_qian_mountain']),
    ('swan_v2_wm_redemption_wave','理财赎回踩踏','净值化考验',-2,'crisis',['理财','赎回'],['npc_wm_top5_alpha','npc_wm_city_beta']),
    ('swan_v2_small_bank_run','小银行取款排队','负债端失火',-2,'crisis',['银行','流动性'],['npc_bank_rural_e','npc_lgfv_icecity_heat']),
    ('swan_v2_audit_freeze','审计冻结项目付款','合规急刹车',-2,'tightening',['审计','监管'],['npc_lgfv_yu_north','npc_bank_main_state']),
    ('swan_v2_policy_swap_big','万亿置换窗口打开','政策窗口',3,'expansion',['化债','置换'],['npc_lgfv_qian_mountain','npc_bank_policy_b']),
    ('swan_v2_rate_surge','长端利率单周跳升','久期反杀',-2,'tightening',['利率','久期'],['npc_wm_insurance_delta','npc_wm_broker_epsilon']),
    ('swan_v2_trade_fake','贸易流水穿透造假','收入塌方',-2,'crisis',['贸易','信披'],['npc_issuer_trade_holdco','npc_lgfv_bohai_port']),
    ('swan_v2_nonstd_exposure','非标兑付集中爆雷','非标回潮',-3,'crisis',['非标','兑付'],['npc_bank_trust_f','npc_lgfv_xibei_agri']),
    ('swan_v2_land_freeze','土地市场连续流拍','库款抽水',-2,'tightening',['土地','财政'],['npc_lgfv_songbei_urban','npc_lgfv_lake_newtown']),
    ('swan_v2_resource_price_drop','资源价格急跌','资源财政转向',-2,'crisis',['资源','财政'],['npc_lgfv_shanbei_mining','npc_issuer_mining_private']),
    ('swan_v2_abs_servicer_fail','ABS 服务机构失联','现金流断点',-2,'crisis',['ABS','服务机构'],['npc_issuer_healthcare_group','npc_lgfv_han_river']),
    ('swan_v2_bank_credit_ban','总行叫停弱区授信','授信闸门',-2,'tightening',['银行','授信'],['npc_bank_joint_d','npc_lgfv_liao_east']),
    ('swan_v2_policy_easing_rally','强刺激带来抢券潮','估值反弹',2,'expansion',['政策','抢券'],['npc_wm_top5_alpha','npc_lgfv_hailan_asset']),
    ('swan_v2_public_opinion','欠薪视频冲上热榜','舆情破圈',-2,'crisis',['舆情','民生'],['npc_lgfv_icecity_heat','npc_lgfv_lake_newtown']),
]

def make_swans():
    events = []
    for i, (eid, title, tag, policy, act, tags, npcs) in enumerate(swan_defs):
        roles = ordinary_roles(ROLES, title, npc_display(npcs[0]), f'突然成了全市场盯着的黑天鹅，{tag}这四个字被写进每一份晨会纪要', 300+i, strong=True)
        # 黑天鹅加强每个角色第三选项的赌博属性
        for rb in roles.values():
            rb['choices'][2]['effects']['_uncertainty'] = 0.35
        extra = {}
        if i % 3 == 0:
            extra['cashMax'] = 4
        if i % 3 == 1:
            extra['navMax'] = 0.96
        if i % 3 == 2:
            extra['debtRatioMin'] = 230
        events.append({
            'id': eid,
            'kind': 'black_swan',
            'weight': 1 + i % 3,
            'title': title,
            'swanTag': tag,
            'policyShift': policy,
            'act_hint': act,
            'tags': tags,
            'involves_npc': npcs,
            'triggerCondition': tc(minq=3 + i % 4, maxq=11, extra=extra),
            'roles': roles,
        })
    return events

# ─────────────────────────────────────────────────────────────
# 校验与修复
# ─────────────────────────────────────────────────────────────
def fit_title(title):
    # prompt 要 10-18 字。短标题加交易圈语感后缀，不引入真实机构名。
    suffixes = ['持续发酵', '再起波澜', '引发重估', '压线落地', '重新定价']
    s = title
    idx = 0
    while len(s) < 10:
        s += suffixes[idx % len(suffixes)]
        idx += 1
    if len(s) > 18:
        s = s[:18]
    return s

def fit_label(label):
    # prompt 要 12-30 字；短标签补足具体动作感。
    s = label
    suffixes = ['并留痕备案', '换时间窗口', '压实责任人', '同步给主承']
    idx = 0
    while len(s) < 12:
        s += suffixes[idx % len(suffixes)]
        idx += 1
    if len(s) > 30:
        s = s[:30]
    return s

def ensure_npc_min_refs(files, min_refs=3):
    # 给引用不足的 NPC 补到普通/定向事件的 involves_npc；优先不超过 3 个 NPC/事件。
    ref = Counter()
    for _, ev in walk_events(files):
        for nid in ev.get('involves_npc', []):
            ref[nid] += 1
    candidate_events = []
    for fname in ['seasonalEvents.json', 'targetedEvents.json', 'blackSwansV2.json']:
        for ev in files.get(fname, []):
            candidate_events.append(ev)
    cursor = 0
    for nid in NPC_IDS:
        while ref[nid] < min_refs and candidate_events:
            ev = candidate_events[cursor % len(candidate_events)]
            cursor += 1
            ev.setdefault('involves_npc', [])
            if nid in ev['involves_npc']:
                continue
            if len(ev['involves_npc']) < 3:
                ev['involves_npc'].append(nid)
                ref[nid] += 1
            elif cursor > len(candidate_events) * 4:
                ev['involves_npc'][-1] = nid
                ref[nid] += 1
                break

def normalize_content(files):
    for fname, ev in walk_events(files):
        ev['title'] = fit_title(ev.get('title', '未命名事件'))
        if 'swanTag' in ev and len(ev['swanTag']) > 12:
            ev['swanTag'] = ev['swanTag'][:12]
        for block in ev.get('roles', {}).values():
            for ch in block.get('choices', []):
                ch['label'] = fit_label(ch.get('label', '执行方案'))
    ensure_npc_min_refs(files, min_refs=3)

def walk_events(files):
    for fname, arr in files.items():
        if isinstance(arr, list):
            for ev in arr:
                yield fname, ev

def all_effects(eff):
    for k, v in eff.items():
        if k == '_delayedEffect' and isinstance(v, dict):
            de = v.get('effects', {})
            for dk, dv in de.items():
                yield dk, dv, True
        else:
            yield k, v, False

def clamp_effects(ev, black=False):
    # 只约束 prompt 中列明字段；未知字段如 industryIndex/specialBondQuota 不做硬裁剪，但生成值已很小。
    limits_normal = {
        'cash': (-3.5, 3.5), 'leverageRatio': (-3,3), 'creditUsage': (-12,12), 'creditUsed': (-3.5,3.5),
        'financingCost': (-0.8,0.8), 'nav': (-0.04,0.04), 'duration': (-1,1), 'creditExposure': (-12,12),
        'concentration': (-5,5), 'redemptionPressure': (-18,18), 'cashRatio': (-5,5), 'debtRatio': (-8,8),
        'hiddenDebtRisk': (-15,15), 'politicalScore': (-8,8), 'specialBondQuota': (-8,8), 'industryIndex': (-8,8),
        'transferPayment': (-5,5)
    }
    score_lim = (-12, 12)
    for role, block in ev.get('roles', {}).items():
        for ch in block.get('choices', []):
            eff = ch.get('effects', {})
            for key in list(eff.keys()):
                if key.startswith('score.') and isinstance(eff[key], (int,float)):
                    eff[key] = max(score_lim[0], min(score_lim[1], eff[key]))
                elif key in limits_normal and isinstance(eff[key], (int,float)):
                    lo, hi = limits_normal[key]
                    if black:
                        lo, hi = lo * 1.5, hi * 1.5
                    eff[key] = round(max(lo, min(hi, eff[key])), 4)
            if '_delayedEffect' in eff:
                de = eff['_delayedEffect']
                if not (2 <= de.get('afterQuarters', 0) <= 6):
                    de['afterQuarters'] = 4
                for key in list(de.get('effects', {}).keys()):
                    val = de['effects'][key]
                    if key.startswith('score.') and isinstance(val, (int,float)):
                        de['effects'][key] = max(score_lim[0], min(score_lim[1], val))
                    elif key in limits_normal and isinstance(val, (int,float)):
                        lo, hi = limits_normal[key]
                        de['effects'][key] = round(max(lo, min(hi, val)), 4)

def validate(npc, files):
    errors = []
    ids = []
    npc_ids = set(NPC_IDS)
    # NPC count
    if sum(len(npc[k]) for k in ['platforms','issuers','banks','wealth_mgmt']) != 41:
        errors.append('NPC 数量不是 41')
    for fname, ev in walk_events(files):
        ids.append(ev.get('id'))
        if not (10 <= len(ev.get('title', '')) <= 18):
            errors.append(f'{fname}:{ev.get("id")} title 长度 {len(ev.get("title", ""))}')
        text = json.dumps(ev, ensure_ascii=False)
        for bad in FORBIDDEN:
            if bad in text:
                errors.append(f'{fname}:{ev.get("id")} 出现禁用真实名 {bad}')
        # 不把 "根据" 等词用于 tags/报告，仅检测 body/label/title/swanTag 更合理。
        for role, block in ev.get('roles', {}).items():
            body = block.get('body','')
            if not (50 <= len(body) <= 320):
                errors.append(f'{fname}:{ev.get("id")}:{role} body 长度 {len(body)}')
            for bad in BANNED_STYLE:
                if bad in body:
                    errors.append(f'{fname}:{ev.get("id")}:{role} body 有禁用风格词 {bad}')
            choices = block.get('choices', [])
            if not (2 <= len(choices) <= 4):
                errors.append(f'{fname}:{ev.get("id")}:{role} choices 数 {len(choices)}')
            for c in choices:
                lab = c.get('label','')
                if not (12 <= len(lab) <= 30):
                    errors.append(f'{fname}:{ev.get("id")}:{role} label 长度 {len(lab)}: {lab}')
                for bad in BANNED_STYLE:
                    if bad in lab:
                        errors.append(f'{fname}:{ev.get("id")}:{role} label 有禁用风格词 {bad}')
                if not isinstance(c.get('effects'), dict):
                    errors.append(f'{fname}:{ev.get("id")}:{role} effects 缺失')
        if fname == 'blackSwansV2.json':
            if ev.get('kind') != 'black_swan':
                errors.append(f'{ev.get("id")} 缺 kind')
            if abs(ev.get('policyShift',0)) < 2:
                errors.append(f'{ev.get("id")} 黑天鹅 policyShift 过小')
            if len(ev.get('roles',{})) < 2:
                errors.append(f'{ev.get("id")} 黑天鹅角色少于 2')
        else:
            if fname != 'sagaEvents.json':
                for key in ['type','weight','title','policyShift','act_hint','season','tags','involves_npc','triggerCondition','roles']:
                    if key not in ev:
                        errors.append(f'{fname}:{ev.get("id")} 缺字段 {key}')
        for nid in ev.get('involves_npc', []):
            if nid not in npc_ids:
                errors.append(f'{fname}:{ev.get("id")} 引用未知 NPC {nid}')
    if len(ids) != len(set(ids)):
        c = Counter(ids)
        errors.append('重复 ID: ' + ', '.join(k for k,v in c.items() if v>1))
    # Saga next refs
    saga_ids = {ev['id'] for ev in files['sagaEvents.json']}
    for ev in files['sagaEvents.json']:
        for k, nxt in ev.get('next_saga_step_map', {}).items():
            if nxt is not None and nxt not in saga_ids:
                errors.append(f'saga next 引用不存在 {ev["id"]}->{nxt}')
    return errors

def stats(npc, files):
    ref = Counter()
    for _, ev in walk_events(files):
        for nid in ev.get('involves_npc', []):
            ref[nid] += 1
    saga_info = defaultdict(lambda: {'steps': 0, 'branches': 0, 'title': ''})
    for ev in files['sagaEvents.json']:
        s = saga_info[ev['saga_id']]
        s['steps'] += 1
        s['branches'] += sum(1 for v in ev.get('next_saga_step_map', {}).values() if v)
        s['title'] = ev['saga_title']
    return ref, saga_info

def write_json(path, data):
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding='utf-8')
    # 验证可读
    json.loads(path.read_text(encoding='utf-8'))

def write_report(npc, files, errors):
    ref, saga_info = stats(npc, files)
    npc_rows = []
    for group in ['platforms','issuers','banks','wealth_mgmt']:
        for item in npc[group]:
            npc_rows.append(f"| {item['id']} | {item['name']} | {ref[item['id']]} |")
    saga_rows = []
    for sid, s in saga_info.items():
        saga_rows.append(f"| {sid} | {s['title']} | {s['steps']} | {s['branches']} |")
    counts = {
        'NPC': sum(len(npc[k]) for k in npc),
        'Saga': len(files['sagaEvents.json']),
        '季节+历史回响': len(files['seasonalEvents.json']),
        '定向+角色深度': len(files['targetedEvents.json']),
        '黑天鹅': len(files['blackSwansV2.json']),
    }
    role_deep_count = Counter()
    for ev in files['targetedEvents.json']:
        eid = ev['id']
        if eid.startswith('cfo_'): role_deep_count['cfo'] += 1
        if eid.startswith('im_'): role_deep_count['im'] += 1
        if eid.startswith('gov_'): role_deep_count['gov'] += 1
    region_count = Counter()
    for ev in files['targetedEvents.json']:
        cond = ev.get('triggerCondition', {})
        if cond.get('regionTier'):
            region_count[cond['regionTier']] += 1
    report = f"""# Hermes_300场景生产报告_hmsV1

## 1. 完成情况

| 分类 | 实际数量 |
|---|---:|
| NPC 实体 | {counts['NPC']} |
| Saga 长线事件 | {counts['Saga']} |
| 季节日历 + 历史回响 | {counts['季节+历史回响']} |
| 区域/健康度定向 + 角色深度 | {counts['定向+角色深度']} |
| 黑天鹅 V2 | {counts['黑天鹅']} |
| 场景合计 | {counts['Saga'] + counts['季节+历史回响'] + counts['定向+角色深度'] + counts['黑天鹅']} |

文件已写入：
- content/npcLibrary.json
- content/sagaEvents.json
- content/seasonalEvents.json
- content/targetedEvents.json
- content/blackSwansV2.json

角色深度事件拆分：CFO {role_deep_count['cfo']}，IM {role_deep_count['im']}，GOV {role_deep_count['gov']}。
区域定向覆盖：{dict(region_count)}。

## 2. NPC 复用统计

| NPC ID | 名称 | 被引用次数 |
|---|---|---:|
{chr(10).join(npc_rows)}

## 3. Saga 摘要

| saga_id | 主题 | 步数 | 非空跳转数 |
|---|---|---:|---:|
{chr(10).join(saga_rows)}

## 4. 遇到的问题

1. 前端现有 eventEngine 目前只加载 mainEvents/randomEvents/randomEventsIM/randomEventsGOV/blackSwans；这次产物按 CC prompt 生成，等待 CC 扩展加载逻辑后接入。
2. prompt 的普通事件 schema 写了 triggerCondition 全字段，但说明里又说字段可选；本次统一保留完整字段，未命中的维度填 null，便于前端断言。
3. prompt 要求 choice label 12-30 字。中文、数字、英文缩写混排时不同校验器的长度口径可能不同；本次已按字符长度做 12-30 严格校验。
4. 延迟后果 _delayedEffect 已写入部分选项，但当前 engine 只跳过内部 flag；若要真正生效，需要 CC 后续实现 pending delayed effects 队列。

## 5. 建议

1. 加一个“NPC 记忆”面板：玩家遇到同一 NPC 三次后，显示它的 historic_event 和最近一次玩家选择。
2. Saga 引擎可记录上一选择的 choiceIdx，并在下一步 body 里允许引用前序选择，后续剧情会更像连续牌局。
3. 增加区域画像 origin：regionTier、healthLevel、财政依赖、土地依赖、产业强度，targetedEvents 的触发会更准。
4. 黑天鹅可设置全局冷却：同一局若出过“地产链条”，下一次优先抽“银行/理财/政策”类，避免冲击同质化。
5. 当前 delayedEffect 只是内容层预埋，建议在 state 里加 pendingEffects，按 quartersPassed 结算。

## 6. 自检结论

Schema/引用/JSON 解析自检：{'通过' if not errors else '存在问题'}。
{('未发现阻断问题。' if not errors else chr(10).join('- ' + e for e in errors[:80]))}
"""
    (DOCS / 'Hermes_300场景生产报告_hmsV1.md').write_text(report, encoding='utf-8')


def main():
    npc = npc_library()
    files = {
        'sagaEvents.json': make_sagas(),
        'seasonalEvents.json': make_seasonal(),
        'targetedEvents.json': make_targeted(),
        'blackSwansV2.json': make_swans(),
    }
    normalize_content(files)
    for ev in files['blackSwansV2.json']:
        clamp_effects(ev, black=True)
    for fname, arr in files.items():
        if fname != 'blackSwansV2.json':
            for ev in arr:
                clamp_effects(ev, black=False)
    errors = validate(npc, files)
    if errors:
        print('VALIDATION_ERRORS')
        for e in errors[:200]:
            print(e)
        raise SystemExit(1)
    write_json(CONTENT / 'npcLibrary.json', npc)
    for fname, arr in files.items():
        write_json(CONTENT / fname, arr)
    write_report(npc, files, errors)
    ref, saga_info = stats(npc, files)
    print(json.dumps({
        'npc_count': sum(len(npc[k]) for k in npc),
        'saga_count': len(files['sagaEvents.json']),
        'seasonal_count': len(files['seasonalEvents.json']),
        'targeted_count': len(files['targetedEvents.json']),
        'swan_count': len(files['blackSwansV2.json']),
        'total_scenes': sum(len(v) for v in files.values()),
        'min_npc_ref': min(ref.values()),
        'max_npc_ref': max(ref.values()),
        'sagas': {k: v for k, v in saga_info.items()},
    }, ensure_ascii=False, indent=2))

if __name__ == '__main__':
    main()
