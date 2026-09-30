// ==UserScript==
// @name         飞书问卷随机填写助手（通用版，不提交）
// @namespace    local.feishu.form.prefill
// @version      0.0.1
// @description  通用预填诊断版：重渲染安全填写与脱敏诊断日志；保留已有回答，不提交。
// @match        https://*.feishu.cn/*
// @exclude      https://login.feishu.cn/*
// @exclude      https://passport.feishu.cn/*
// @exclude      https://accounts.feishu.cn/*
// @run-at       document-idle
// @grant        GM_registerMenuCommand
// @noframes
// ==/UserScript==

(async () => {
    'use strict';
    // 匹配所有飞书租户，不依赖固定的 /share/base/form/ 路径或问卷 ID。
    // 宽网址匹配不等于在普通飞书页面执行填充：必须先发现飞书表单的题目结构。
    function allowedPage() {
        return location.protocol === 'https:' && /(^|\.)feishu\.cn$/i.test(location.hostname) &&
            !/^(login|passport|accounts)\./i.test(location.hostname) &&
            !/^\/(accounts|passport|login)(?:\/|$)/i.test(location.pathname);
    }

    if (!allowedPage()) return;
    (console.info || console.log)?.call(console, '[飞书预填调试] 启动 v3.3.1；等待表单结构，不输出网址或答案。');
    const pageKey = () => location.origin + location.pathname + location.search;
    const INITIAL_PAGE = pageKey();
    const QUESTION_SELECTOR = '.base-form-container_card_item, [id^="field-item-"]';
    const questionCards = () => Array.from(document.querySelectorAll(QUESTION_SELECTOR))
        .filter(card => card.querySelector('.base-form-container_title_wrapper') && card.querySelector('.base-form-container_value_wrapper'))
        .filter(card => !Array.from(card.querySelectorAll(QUESTION_SELECTOR)).some(child =>
            child.querySelector('.base-form-container_title_wrapper') && child.querySelector('.base-form-container_value_wrapper')));
    const formReady = () => questionCards().length > 0;
    if (!formReady()) {
        // 登录跳转后的新页面会重新加载脚本。普通文档页不会出现操作面板或被填充。
        const ready = await new Promise(resolve => {
            let watcher, timeout;
            const finish = value => {
                watcher?.disconnect();
                clearTimeout(timeout);
                resolve(value);
            };
            watcher = new MutationObserver(() => {
                if (!allowedPage() || pageKey() !== INITIAL_PAGE) finish(false);
                else if (formReady()) finish(true);
            });
            watcher.observe(document.body, {childList: true, subtree: true});
            timeout = setTimeout(() => finish(false), 120000);
            window.addEventListener('pagehide', () => finish(false), {once: true});
            if (formReady()) finish(true);
        });
        if (!ready) return;
    }
    if (!allowedPage() || pageKey() !== INITIAL_PAGE) return;

    // ===================== 可修改配置 =====================
    const CONFIG = {
        debug: true,                  // 诊断日志；不记录答案或认证信息
        autoFill: true,               // 打开后自动填充空题
        startDelayMs: 700,
        readyWaitMs: 1600,            // 控件加载/保存确认的单次等待上限
        retryDelayMs: 350,            // 失败先让出其他题，再重试
        maxAttempts: 3,               // 每字段每轮最多尝试次数
        domQuietMs: 500,              // 全部处理后继续观察条件题/延迟渲染
        runMaxMs: 180000,             // 单轮总时间上限，停止按钮随时生效
        actionDelayMs: 35,            // 状态检查的轮询间隔；成功立即继续，不逐次固定等待
        scrollDelayMs: 50,            // 虚拟列表滚动后留给页面渲染的短暂时间
        watchMs: 60000,               // 等待异步加载/条件题的最长观察时间
        multiMin: 1,
        dropdownScanMax: 60,          // 虚拟下拉列表的最大扫描页数；超限报告人工处理
        multiMax: 5,                  // 同时遵守页面显示的最少/最多限制
        // 不含任何特定问卷的题号、字段 ID 或业务文案。
        // 通用候选文案只用于预填参考，请在提交前按真实想法检查或修改。
        textPool: [
            '希望相关信息和要求更加清晰，方便理解和执行。',
            '建议进一步简化流程，提升使用或参与的便利性。',
            '希望持续听取参与者的意见，对反馈的问题及时跟进。',
            '建议加强沟通与反馈，让后续改进的方向更加明确。',
            '希望在现有基础上持续优化细节，提升整体体验。',
            '建议提供更明确的说明和示例，降低理解和操作的难度。'
        ],
        textByField: {},              // 可选：自行配置特定字段；默认不绑定任何字段
        textRules: [                  // 按题目内容匹配，不依赖题号或字段 ID
            {
                match: /三个词|三词|3\s*个词|三个关键词|3\s*个关键词/,
                values: ['专业、清晰、高效', '便捷、规范、可靠', '沟通、协作、进步', '品质、服务、创新', '认真、务实、向上', '简洁、易用、实用']
            },
            {
                match: /意见|建议|改进|改善|反馈|期待/,
                values: [
                    '建议进一步简化流程，减少重复操作，并提供清晰的说明。',
                    '希望及时回应参与者的反馈，并说明相关问题的处理进度。',
                    '建议完善沟通渠道，让重要信息能够及时、准确地传达。',
                    '希望持续优化使用体验，并结合实际反馈逐步改进。',
                    '建议增加具体示例或操作指引，方便大家更快理解和使用。',
                    '希望保持清晰的规则和稳定的服务，并持续关注细节体验。'
                ]
            }
        ],
        // 可把真实答案锁定在这里。单选/下拉填字符串；多选填数组；评分填数字。
        // 字段 ID 可在控制台的填充结果中查看；不同问卷请使用各自的字段 ID。
        fixedAnswers: {},
        // 验证码/授权声明仍由人处理；明确的质量校验评分指令单独识别，不随机。
        skipTitle: /验证码|同意声明|隐私授权|授权同意/,
    };
    // =====================================================

    const S = {
        card: QUESTION_SELECTOR,
        title: '.base-form-container_title_wrapper, legend, [data-question-title]',
        value: '.base-form-container_value_wrapper',
        option: '.base-component-select-list-editor-option',
        optionText: '.base-component-select-list-editor-text',
        dropdown: '.b-select-dropdown-menu, .bitable-selector-option-wrapper, [role="combobox"]:not(select)',
        popup: '.b-select-dropdown-content, .bitable-selector-option-modal, .bitable-selector-option-dropdown, .bitable-select-dropdown, [role="listbox"]',
        rating: '.ud__rate__character',
        text: 'textarea, input:not([type]), input[type="text"], [contenteditable="true"], [contenteditable="plaintext-only"]',
    };
    const done = new Set();
    const touched = new Set();
    let running = false, stopped = false, generation = 0, timer, observer;
    const clean = text => String(text ?? '').replace(/[\u200b\u200c\u200d\ufeff]/g, '').trim();
    const all = (selector, root = document) => Array.from(root.querySelectorAll(selector));
    const visible = el => !!el && el.isConnected && el.getClientRects().length > 0 &&
        getComputedStyle(el).visibility !== 'hidden' && getComputedStyle(el).display !== 'none';
    // 一些原生选项隐藏 input，只显示 label；只要有可见标签仍可操作。
    const usable = el => !!el && (visible(el) || (el.matches?.('input[type="radio"], input[type="checkbox"]') &&
            Array.from(el.labels || []).some(visible))) && !el.disabled && !el.readOnly &&
        !el.matches?.(':disabled') && el.getAttribute('aria-disabled') !== 'true';
    const anonymousIds = new WeakMap();
    const anonymousKeys = new Map();
    let anonymousCounter = 0;

    function fieldId(card) {
        const id = card.closest('[id^="field-item-"]')?.id || card.getAttribute('data-field-id') || card.querySelector('[data-field-id]')?.getAttribute('data-field-id') || card.id;
        if (id) return id.replace(/^field-item-/, '');
        if (!anonymousIds.has(card)) {
            // 无字段 ID 时以标题及同名题出现次序恢复身份，不绑定特定问卷。
            const titleOf = c => clean(c.querySelector(S.title)?.textContent || c.getAttribute('aria-label'));
            const title = titleOf(card);
            const peers = questionCards().filter(c => titleOf(c) === title);
            const key = JSON.stringify([title, Math.max(0, peers.indexOf(card))]);
            if (!anonymousKeys.has(key)) anonymousKeys.set(key, 'question-' + (++anonymousCounter));
            anonymousIds.set(card, anonymousKeys.get(key));
        }
        return anonymousIds.get(card);
    }

    const fieldTitle = card => clean(card.querySelector(S.title)?.textContent || card.getAttribute('aria-label') || '未命名题目');
    const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
    const randInt = (min, max) => min + Math.floor(Math.random() * (max - min + 1));
    const pick = list => list[randInt(0, list.length - 1)];
    const shuffle = list => {
        const copy = [...list];
        for (let i = copy.length - 1; i > 0; i--) {
            const j = randInt(0, i);
            [copy[i], copy[j]] = [copy[j], copy[i]];
        }
        return copy;
    };

    function trace(event, card, details = {}) {
        debugLog(event, {q: card ? debugQuestion(card) : null, qid: card ? debugIdentity(card) : null, ...details});
    }

    // 不缓存整轮题目 DOM；条件题/受控组件更新后按字段身份重新定位。
    const answerPlans = new Map();
    const planKey = (card, kind) => JSON.stringify([fieldId(card), kind]);
    const hasPlan = (card, kind) => answerPlans.has(planKey(card, kind));

    function planned(card, kind, choose) {
        const key = planKey(card, kind);
        if (!answerPlans.has(key)) answerPlans.set(key, choose());
        return answerPlans.get(key);
    }

    const autoBlocked = new Set();
    const touchRevision = new Map();
    let scriptActionDepth = 0;

    function scriptAction(fn) {
        scriptActionDepth++;
        try {
            return fn();
        } finally {
            scriptActionDepth--;
        }
    }

    let activeQuestion = null, runDeadline = Infinity;

    function staleError() {
        const e = new Error('题目节点已更新或暂时移除');
        e.name = 'StaleDOMError';
        return e;
    }

    function liveCard(card) {
        // 绝大多数操作没有重建题卡，直接使用已连接节点；重建后通过 DOM id O(1) 找回。
        if (visible(card)) return card;
        const id = fieldId(card);
        const direct = document.getElementById('field-item-' + id);
        const current = direct && direct.querySelector(S.title) && direct.querySelector(S.value) && visible(direct)
            ? direct : questionCards().find(c => fieldId(c) === id && visible(c));
        if (!current) throw staleError();
        if (current !== card) trace('card.relocated', current, {replaced: true});
        return current;
    }

    const pollMs = () => Math.max(10, Math.min(80, CONFIG.actionDelayMs || 10));

    async function waitForRead(read, token, timeout = CONFIG.readyWaitMs) {
        const until = Math.min(Date.now() + timeout, runDeadline);
        do {
            check(token);
            try {
                if (read()) return true;
            } catch (e) {
                if (e.name !== 'StaleDOMError') throw e;
            }
            if (Date.now() >= until) return false;
            await sleep(pollMs());
        } while (true);
    }

    function controlsReady(card) {
        if (CONFIG.skipTitle.test(fieldTitle(card))) return true;
        return !!dropdownTrigger(card) || all('select', card).some(usable) || getOptions(card).length > 0 ||
            all(S.rating, card).some(usable) || textEditors(card).length > 0;
    }

    function optionGroups(card) {
        const groups = [];
        for (const option of getOptions(card)) {
            const scope = option.closest('.base-component-select-list-editor-single, .base-component-select-list-editor-multi, [role="radiogroup"], [role="group"]') || card;
            const name = option.matches('input[type="radio"]') ? option.name : '';
            let group = groups.find(g => g.scope === scope && g.name === name);
            if (!group) {
                group = {scope, name, options: []};
                groups.push(group);
            }
            group.options.push(option);
        }
        return groups;
    }

    function check(token) {
        if (!allowedPage() || pageKey() !== INITIAL_PAGE) {
            stop();
            status.textContent = '网址已变化，请刷新新的问卷页面后再填充。';
            throw new DOMException('页面已变化', 'AbortError');
        }
        if (activeQuestion && Date.now() >= runDeadline) {
            const e = new Error('本轮达到等待上限');
            e.name = 'RunTimeoutError';
            throw e;
        }
        if (activeQuestion && (touchRevision.get(activeQuestion.id) || 0) !== activeQuestion.revision) {
            const e = new Error('用户正在操作该题');
            e.name = 'UserTouchedError';
            throw e;
        }
        if (stopped || token !== generation) {
            throw new DOMException('已停止', 'AbortError');
        }
    }

    async function settle(token) {
        await sleep(CONFIG.scrollDelayMs);
        check(token);
    }

    function selected(el) {
        if ('checked' in el) return el.checked;
        return el.getAttribute('aria-checked') === 'true' || el.getAttribute('aria-selected') === 'true' ||
            el.classList.contains('base-component-select-list-editor-option-checked');
    }

    const optionLabel = el => clean(el.querySelector(S.optionText)?.textContent || el.getAttribute('aria-label') ||
        ('labels' in el ? Array.from(el.labels || []).map(label => label.textContent).join(' ') || el.value : el.textContent));

    function getOptions(root) {
        const custom = all(S.option, root).filter(usable);
        if (custom.length) return custom;
        const native = all('input[type="radio"], input[type="checkbox"]', root).filter(usable);
        if (native.length) return native;
        return all('[role="radio"], [role="checkbox"]', root).filter(usable);
    }

    function limits(card, total) {
        const text = clean(card.querySelector('.bitable-form__editor__select_editor_limit-tip')?.textContent || card.textContent);
        const exact = text.match(/(?:恰好选择|必须选择|需选择|请选择)\s*(\d+)\s*(?:项|个)/)?.[1];
        const min = Number(exact ?? text.match(/(?:最少|至少)(?:可(?:以)?)?(?:选择|选)?\s*(\d+)\s*(?:项|个)?/)?.[1] ?? CONFIG.multiMin);
        const max = Number(exact ?? text.match(/(?:最多|至多)(?:可(?:以)?)?(?:选择|选)?\s*(\d+)\s*(?:项|个)?/)?.[1] ?? CONFIG.multiMax);
        const low = Math.max(1, min, CONFIG.multiMin);
        const high = Math.min(total, max, Math.max(CONFIG.multiMax, low));
        if (high < low) throw new Error('多选限制无法满足，请手动填写');
        return [low, high];
    }

    async function click(el, token) {
        check(token);
        if (!usable(el)) throw new Error('控件不可操作');
        scriptAction(() => el.click());
        check(token);
    }


    // 诊断日志只记录结构和状态，不记录题目文字、答案、字段ID、网址或认证信息。
    const debugEntries = [];
    const debugStages = new Map();
    const debugOrdinals = new WeakMap();
    const debugIdentities = new Map();
    const debugStarted = Date.now();

    function debugLog(event, data = {}) {
        if (!CONFIG.debug) return;
        const entry = {ms: Date.now() - debugStarted, event, ...data};
        debugEntries.push(entry);
        if (debugEntries.length > 500) debugEntries.shift();
        (console.info || console.log)?.call(console, '[飞书预填调试] ' + JSON.stringify(entry));
    }

    function debugIdentity(card) {
        const id = fieldId(card);
        if (!debugIdentities.has(id)) debugIdentities.set(id, debugIdentities.size + 1);
        return debugIdentities.get(id);
    }

    function debugQuestion(card) {
        const cards = questionCards();
        const index = cards.findIndex(c => fieldId(c) === fieldId(card));
        if (index >= 0) {
            debugOrdinals.set(card, index + 1);
            return index + 1;
        }
        return debugOrdinals.get(card) || null;
    }

    function debugElement(el) {
        if (!el) return null;
        const rect = el.getBoundingClientRect();
        const style = getComputedStyle(el);
        const safeRoles = ['combobox', 'listbox', 'option', 'radio', 'checkbox', 'textbox', 'searchbox'];
        const expanded = el.getAttribute('aria-expanded');
        return {
            tag: el.tagName.toLowerCase(),
            classes: Array.from(el.classList).filter(c => /^(base-form-|base-component-|bitable-|b-select-|ud__rate|select-)/.test(c) || /^(enabled|opened|disabled|SingleSelect|MultiSelect)$/.test(c)).slice(0, 12),
            role: safeRoles.includes(el.getAttribute('role')) ? el.getAttribute('role') : null,
            visible: visible(el), usable: usable(el), connected: el.isConnected,
            disabled: !!el.disabled || el.getAttribute('aria-disabled') === 'true', readOnly: !!el.readOnly,
            expanded: expanded === 'true' ? true : expanded === 'false' ? false : null,
            rect: {width: Math.round(rect.width), height: Math.round(rect.height)},
            display: style.display, visibility: style.visibility, pointerEvents: style.pointerEvents,
            textLength: clean(el.textContent).length,
            hasValue: 'value' in el ? !!el.value : null,
            placeholderElement: !!el.querySelector('.bitable-editor-placeholder, .b-select-value-placeholder'),
            placeholderLikeText: /^(请选择(?:选项)?|select|choose)(?:$|\s)/i.test(clean(el.value || el.textContent)),
            insidePopup: !!el.closest(S.popup), childCount: el.children.length
        };
    }

    function debugCard(card) {
        const value = card.querySelector(S.value) || card;
        const title = card.querySelector(S.title);
        const dropdowns = all(S.dropdown, card);
        const candidateNodes = all('[class*="select"], [role="combobox"], select, [data-form-control-interactive-root]', value);
        return {
            q: debugQuestion(card), qid: debugIdentity(card),
            titleTypes: Array.from(title?.classList || []).filter(c => ['SingleSelect', 'MultiSelect', 'Rating', 'Text', 'Number', 'Date'].includes(c)),
            connected: card.isConnected, visible: visible(card), alreadyDone: done.has(fieldId(card)), userTouched: touched.has(fieldId(card)),
            stage: debugStages.get(fieldId(card)) || 'not-started',
            dropdownCount: dropdowns.length, activeTrigger: debugElement(dropdownTrigger(card)),
            dropdowns: dropdowns.map(debugElement).slice(0, 8),
            candidateNodes: dropdowns.length ? candidateNodes.slice(0, 6).map(debugElement) : [],
            otherControls: {
                nativeSelect: all('select', card).length, listOptions: getOptions(card).length,
                rating: all(S.rating, card).length, textEditors: textEditors(card).length
            }
        };
    }

    function debugStage(card, stage, details = {}) {
        debugStages.set(fieldId(card), stage);
        debugLog(stage, {q: debugQuestion(card), qid: debugIdentity(card), ...details});
    }

    function printDiagnostics() {
        if (!CONFIG.debug) return;
        const cards = questionCards();
        const relevant = cards;
        const packet = {
            version: '3.3.1', running, stopped, totalQuestions: cards.length,
            droppedEarlierEntries: debugEntries.length >= 500,
            cards: relevant.slice(0, 80).map(debugCard),
            popups: all(S.popup).slice(0, 12).map(el => ({node: debugElement(el), optionCount: all('.b-select-option, .bitable-selector-value-wrapper, [role="option"]', el).length})),
            logs: [...debugEntries]
        };
        (console.info || console.log)?.call(console, '[飞书预填诊断包] ' + JSON.stringify(packet));
    }

    debugLog('ready', {version: '3.3.1', questions: questionCards().length, autoFill: CONFIG.autoFill});
    for (const eventName of ['pointerdown', 'mousedown', 'mouseup', 'click', 'keydown']) {
        document.addEventListener(eventName, e => {
            if (!CONFIG.debug || !(e.target instanceof Element)) return;
            const card = e.target.closest(S.card);
            const root = e.target.closest(S.dropdown + ', ' + S.popup);
            if (!root) return;
            const popupCard = card || questionCards().find(c => debugStages.get(fieldId(c))?.startsWith('dropdown.'));
            debugLog('dom-event', {
                q: popupCard ? debugQuestion(popupCard) : null,
                type: e.type, trusted: e.isTrusted, target: debugElement(e.target)
            });
            // 只读观察人工点击后的状态；不添加点击、不修改表单。
            if (e.isTrusted && e.type === 'click' && popupCard) {
                setTimeout(() => debugLog('after-user-click', {card: debugCard(popupCard)}), 250);
            }
        }, true);
    }

    async function fillOptionGroup(card, getCurrent, force, fixed, token, kind) {
        const options = getCurrent();
        const multi = options.some(el => el.closest('.base-component-select-list-editor-multi')) ||
            options.some(el => el.matches('input[type="checkbox"], [role="checkbox"]'));
        if (!options.length) throw new Error('选项尚未加载');
        if (!force && !hasPlan(card, kind) && options.some(selected)) return '已有回答';
        let wanted;
        if (fixed !== undefined) {
            const labels = (Array.isArray(fixed) ? fixed : [fixed]).map(clean);
            wanted = labels.map(label => {
                const el = options.find(o => optionLabel(o) === label);
                if (!el) throw new Error('固定答案与选项不匹配：' + label);
                return optionLabel(el);
            });
            wanted = [...new Set(wanted)];
        } else {
            const eligible = options.filter(o => !/^(其他|其它)(?:$|[：:（(])/.test(optionLabel(o)));
            if (!eligible.length) throw new Error('仅有“其他”选项，请手动填写');
            wanted = multi ? shuffle(eligible).slice(0, randInt(...limits(card, eligible.length))).map(optionLabel)
                : [optionLabel(pick(eligible))];
        }
        wanted = planned(card, kind, () => wanted);
        if (!wanted.every(label => options.some(o => optionLabel(o) === label))) throw new Error('选项内容已变化，请手动检查');
        if (!multi && wanted.length !== 1) throw new Error('单选固定答案必须只有一项');
        if (multi) {
            const [min, max] = limits(card, options.length);
            if (wanted.length < min || wanted.length > max) throw new Error('固定多选答案超出限制');
            // 先取消不需要的旧项，避免重随机时超过最大数量。
            for (const label of options.filter(selected).map(optionLabel)) {
                if (!wanted.includes(label)) {
                    const current = getCurrent().find(o => optionLabel(o) === label);
                    if (current && selected(current)) {
                        await click(current, token);
                        if (!await waitForRead(() => !getCurrent().some(o => optionLabel(o) === label && selected(o)), token))
                            throw new Error('未确认多选取消保存，请手动检查');
                    }
                }
            }
        }
        for (const label of wanted) {
            const current = getCurrent().find(o => optionLabel(o) === label);
            if (!current) throw new Error('选项在渲染时变化');
            if (!selected(current)) {
                await click(current, token);
                if (!await waitForRead(() => getCurrent().some(o => optionLabel(o) === label && selected(o)), token))
                    throw new Error('未确认选项被保存，请手动检查');
            }
        }
        if (!await waitForRead(() => {
            const actual = getCurrent().filter(selected).map(optionLabel);
            return actual.length === wanted.length && wanted.every(x => actual.includes(x));
        }, token)) {
            throw new Error('未确认选项被保存，请手动检查');
        }
        return '已填：' + wanted.join('、');
    }

    async function fillList(card, force, fixed, token) {
        const count = optionGroups(liveCard(card)).length;
        if (count > 1 && fixed !== undefined) throw new Error('复合选项题的固定答案请手动填写');
        const results = [];
        for (let index = 0; index < count; index++) {
            // 组序号而不是旧 scope 元素：组件整体替换后仍能找到对应组选项。
            const getCurrent = () => optionGroups(liveCard(card))[index]?.options || [];
            if (!await waitForRead(() => getCurrent().length > 0, token)) throw new Error('选项尚未加载');
            results.push(await fillOptionGroup(liveCard(card), getCurrent, force, fixed, token, 'list-' + index));
        }
        return results.join('；');
    }

    function ratingValue(card) {
        const values = all(S.rating, card).map((el, i) =>
            all('.bitable_rating__icon', el).some(icon => !icon.classList.contains('bitable_rating__unselect_icon')) ? i + 1 : 0);
        return Math.max(0, ...values);
    }

    async function fillRating(card, force, fixed, token) {
        if (!force && !hasPlan(card, 'rating') && ratingValue(card) > 0) return '已有回答';
        const chars = all(S.rating, card).filter(usable);
        if (!chars.length) throw new Error('评分尚未加载');
        const n = planned(card, 'rating', () => fixed === undefined ? randInt(1, chars.length) : Number(fixed));
        if (!Number.isInteger(n) || n < 1 || n > chars.length) throw new Error('评分超出范围');
        if (ratingValue(card) === n) return '已填：' + n + ' 分';
        // 点击完整星体/数字块，避免选成半星。
        const body = chars[n - 1].querySelector('.ud__rate__character-body');
        await click(body || chars[n - 1], token);
        if (!await waitForRead(() => ratingValue(liveCard(card)) === n, token)) throw new Error('未确认评分被保存，请手动检查');
        return '已填：' + n + ' 分';
    }

    function dropdownTrigger(card) {
        if (!card.isConnected) {
            const id = fieldId(card);
            card = document.getElementById('field-item-' + id) || questionCards().find(c => fieldId(c) === id) || card;
        }
        return all(S.dropdown, card).find(el => usable(el) && !el.closest(S.popup));
    }

    async function fillDropdown(card, force, fixed, token) {
        debugStage(card, 'dropdown.start', {card: debugCard(card)});
        const trigger = dropdownTrigger(card);
        if (!trigger) throw new Error('下拉控件不可操作');
        const desktop = trigger.matches('.b-select-dropdown-menu');
        const triggerContent = el => clean(el?.value || el?.textContent);
        const isPlaceholder = el => !!el?.querySelector('.bitable-editor-placeholder, .b-select-value-placeholder') ||
            /^(请选择(?:选项)?|select|choose)(?:$|\s)/i.test(triggerContent(el));
        if (!force && !hasPlan(card, 'dropdown') && triggerContent(trigger) && !isPlaceholder(trigger)) {
            debugStage(card, 'dropdown.skip-existing', {trigger: debugElement(trigger)});
            return '已有回答';
        }
        const optionSelector = '.bitable-selector-value-wrapper, .b-select-option, [role="option"]';
        const before = new Set(all(S.popup).filter(visible));
        // 同题内已展开的桌面菜单不再点击，避免把它关掉。
        const inline = all(S.popup, card).find(el => visible(el) && all(optionSelector, el).some(usable));
        debugStage(card, 'dropdown.open-before', {desktop, inlineFound: !!inline, trigger: debugElement(trigger), visiblePopupCount: before.size});
        if (!inline) await click(trigger, token);
        debugStage(card, 'dropdown.open-after', {trigger: debugElement(trigger), visiblePopupCount: all(S.popup).filter(visible).length});
        let root;
        for (let i = 0; i < 12; i++) {
            check(token);
            card = liveCard(card);
            const currentTrigger = dropdownTrigger(card);
            const ids = (currentTrigger?.getAttribute('aria-controls') || currentTrigger?.getAttribute('aria-owns') || '').split(/\s+/).filter(Boolean);
            const controlled = ids.map(id => document.getElementById(id)).filter(visible);
            const owned = all(S.popup, card).filter(visible);
            const opened = all(S.popup).filter(el => visible(el) && !before.has(el) &&
                (!el.closest(S.card) || el.closest(S.card) === card));
            root = [...new Set([...controlled, ...owned, ...opened])].find(el => all(optionSelector, el).some(usable));
            if (i === 0 || i === 11 || root) debugLog('dropdown.find-popup', {
                q: debugQuestion(card),
                qid: debugIdentity(card),
                attempt: i + 1,
                controlledCount: controlled.length,
                ownedCount: owned.length,
                newlyOpenedCount: opened.length,
                found: !!root
            });
            if (root) break;
            await sleep(pollMs());
        }
        if (!root) {
            debugStage(card, 'dropdown.popup-not-found', {card: debugCard(card)});
            throw new Error('无法识别关联的下拉层，请手动选择');
        }
        debugStage(card, 'dropdown.popup-found', {root: debugElement(root)});
        const getCurrent = () => all(optionSelector, root).filter(el => usable(el) &&
            !el.matches('.b-select-option__disabled, .b-select-option-disabled, [disabled]'));
        const optionSelected = el => selected(el) || !!el.querySelector('input:checked, [aria-checked="true"]');
        const closePopup = async () => {
            check(token);
            const close = root.querySelector('.resizeable-modal-wrapper-done');
            if (usable(close)) await click(close, token);
            else if (visible(root)) {
                const target = root.querySelector('.b-select-search') || dropdownTrigger(card) || trigger;
                target.dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape', code: 'Escape', bubbles: true}));
                await waitForRead(() => !visible(root), token, desktop ? 100 : 250);
                // 部分桌面控件不响应 Escape，用题目标题作无副作用的外部点击。
                if (desktop && visible(root)) {
                    const title = liveCard(card).querySelector(S.title);
                    if (usable(title)) {
                        for (const type of ['mousedown', 'mouseup', 'click']) {
                            title.dispatchEvent(new MouseEvent(type, {bubbles: true, cancelable: true, button: 0}));
                        }
                        await waitForRead(() => !visible(root), token, 250);
                    }
                }
            }
        };
        let closeAttemptedAfterVerify = false;
        try {
            const scroller = desktop ? root.querySelector('.b-select-list') : null;
            debugStage(card, 'dropdown.scan', {scroller: debugElement(scroller), clientHeight: scroller?.clientHeight || 0, scrollHeight: scroller?.scrollHeight || 0});
            const records = new Map();
            const capture = () => {
                const pageLabels = new Set();
                for (const el of getCurrent()) {
                    const label = optionLabel(el);
                    if (!label) continue;
                    if (pageLabels.has(label)) throw new Error('下拉选项文字重复，无法安全区分');
                    pageLabels.add(label);
                    if (!records.has(label)) records.set(label, {
                        label, position: scroller?.scrollTop || 0, selected: optionSelected(el),
                        verifiable: el.hasAttribute('aria-selected') || el.hasAttribute('aria-checked') ||
                            !!el.querySelector('input[type="checkbox"], [role="checkbox"]')
                    });
                }
            };
            // 桌面列表是虚拟渲染：分段滚动收集，不能只随机首屏的十几项。
            if (scroller && scroller.clientHeight > 0 && scroller.scrollHeight > scroller.clientHeight) {
                scroller.scrollTop = 0;
                scroller.dispatchEvent(new Event('scroll'));
                await settle(token);
                let complete = false;
                for (let page = 0; page < CONFIG.dropdownScanMax; page++) {
                    capture();
                    const end = Math.max(0, scroller.scrollHeight - scroller.clientHeight);
                    if (scroller.scrollTop >= end - 1) {
                        complete = true;
                        break;
                    }
                    const previous = scroller.scrollTop;
                    scroller.scrollTop = Math.min(end, previous + Math.max(1, Math.floor(scroller.clientHeight * 0.8)));
                    scroller.dispatchEvent(new Event('scroll'));
                    await settle(token);
                    if (scroller.scrollTop <= previous) throw new Error('下拉列表无法滚动，请手动选择');
                }
                if (!complete) throw new Error('下拉选项过多，扫描达到上限，请手动选择');
            } else capture();
            const options = [...records.values()];
            debugStage(card, 'dropdown.options-collected', {optionCount: options.length});
            const multi = root.getAttribute('aria-multiselectable') === 'true' ||
                !!card.querySelector('.bitable-multi-selector-editor') ||
                getCurrent().some(el => el.querySelector('input[type="checkbox"], [role="checkbox"]'));
            if (!force && !hasPlan(card, 'dropdown') && multi && options.some(el => el.selected)) return '已有回答';
            let wanted;
            if (fixed !== undefined) {
                wanted = [...new Set((Array.isArray(fixed) ? fixed : [fixed]).map(clean))];
                if (!wanted.every(label => records.has(label))) throw new Error('固定下拉答案不匹配');
            } else {
                const eligible = options.filter(el => !/^(其他|其它)(?:$|[：:（(])/.test(el.label));
                if (!eligible.length) throw new Error('没有可随机选择的下拉选项');
                wanted = (multi ? shuffle(eligible).slice(0, randInt(...limits(card, eligible.length))) : [pick(eligible)]).map(el => el.label);
            }
            wanted = planned(card, 'dropdown', () => wanted);
            if (!wanted.every(label => records.has(label))) throw new Error('下拉选项内容已变化，请手动检查');
            if (!multi && wanted.length !== 1) throw new Error('下拉层未标识多选，答案必须只有一项');
            const findLabel = async label => {
                if (scroller) {
                    scroller.scrollTop = records.get(label).position;
                    scroller.dispatchEvent(new Event('scroll'));
                    await settle(token);
                }
                const el = getCurrent().find(el => optionLabel(el) === label);
                if (!el) throw new Error('下拉选项在渲染时变化：' + label);
                return el;
            };
            const activate = async label => {
                const el = await findLabel(label);
                const was = optionSelected(el);
                debugStage(card, 'dropdown.option-click', {target: debugElement(el)});
                await click(el, token);
                // 某些桌面版本在 mousedown 而非 click 时处理选择。仅点击未生效时补发，避免多选切换两次。
                if (desktop) await waitForRead(() => {
                    const option = getCurrent().find(el => optionLabel(el) === label);
                    return multi ? (option && optionSelected(option) !== was) :
                        (!isPlaceholder(dropdownTrigger(card)) && triggerContent(dropdownTrigger(card)).includes(label));
                }, token);
                const current = getCurrent().find(el => optionLabel(el) === label);
                const savedSingle = !isPlaceholder(dropdownTrigger(card)) && triggerContent(dropdownTrigger(card)).includes(label);
                if (desktop && current && (multi ? optionSelected(current) === was : !savedSingle)) {
                    debugStage(card, 'dropdown.option-mousedown-fallback');
                    current.dispatchEvent(new MouseEvent('mousedown', {bubbles: true, cancelable: true, button: 0, buttons: 1}));
                    current.dispatchEvent(new MouseEvent('mouseup', {bubbles: true, cancelable: true, button: 0}));
                    await settle(token);
                }
            };
            if (multi) {
                if (!options.every(el => el.verifiable)) throw new Error('多选下拉未提供可验证的选中状态，请手动填写');
                const [min, max] = limits(card, options.length);
                if (wanted.length < min || wanted.length > max) throw new Error('下拉多选答案超出限制');
                for (const old of options.filter(el => el.selected && !wanted.includes(el.label))) await activate(old.label);
            }
            for (const label of wanted) {
                const el = await findLabel(label);
                if (!multi || !optionSelected(el)) await activate(label);
            }
            if (multi) {
                for (const record of options) {
                    if (optionSelected(await findLabel(record.label)) !== wanted.includes(record.label)) throw new Error('未确认下拉多选保存');
                }
            }
            debugStage(card, 'dropdown.verify');
            await closePopup();
            closeAttemptedAfterVerify = true;
            if (!await waitForRead(() => {
                const fresh = dropdownTrigger(liveCard(card));
                return fresh && !isPlaceholder(fresh) && wanted.every(label => triggerContent(fresh).includes(label));
            }, token)) {
                throw new Error('未确认下拉答案被保存，请手动检查');
            }
            debugStage(liveCard(card), 'dropdown.saved', {trigger: debugElement(dropdownTrigger(card))});
            return '已填：' + wanted.join('、');
        } finally {
            if (!stopped && token === generation && allowedPage() && pageKey() === INITIAL_PAGE && visible(root) && !closeAttemptedAfterVerify) await closePopup();
        }
    }

    async function fillNativeSelect(card, force, fixed, token) {
        const count = all('select', liveCard(card)).filter(usable).length;
        const results = [];
        for (let index = 0; index < count; index++) {
            const getSelect = () => all('select', liveCard(card)).filter(usable)[index];
            const el = getSelect();
            if (!el) throw staleError();
            const choices = Array.from(el.options).filter(option => !option.disabled && !option.parentElement.disabled &&
                option.value !== '' && !/^(请选择|请选择选项|select|choose)(?:\s|$)/i.test(clean(option.textContent)));
            if (!choices.length) throw new Error('下拉框没有可用选项');
            if (!force && !hasPlan(card, 'native-' + index) && choices.some(option => option.selected)) {
                results.push('已有回答');
                continue;
            }
            const multi = el.multiple;
            const labels = fixed === undefined ? null : (Array.isArray(fixed) ? fixed : [fixed]).map(clean);
            let wanted = labels ? labels.map(label => {
                const match = choices.find(option => clean(option.textContent) === label || option.value === label);
                if (!match) throw new Error('固定下拉答案不匹配：' + label);
                return match;
            }) : multi ? shuffle(choices).slice(0, randInt(...limits(liveCard(card), choices.length))) : [pick(choices)];
            const savedValues = planned(card, 'native-' + index, () => wanted.map(option => option.value));
            wanted = savedValues.map(value => choices.find(option => option.value === value));
            if (wanted.some(option => !option)) throw new Error('原生下拉选项内容已变化，请手动检查');
            if (!multi && wanted.length !== 1) throw new Error('单选下拉只能选择一项');
            if (multi) {
                const [min, max] = limits(liveCard(card), choices.length);
                if (wanted.length < min || wanted.length > max) throw new Error('下拉多选答案超出限制');
            }
            const wantedValues = wanted.map(option => option.value);
            const wantedLabels = wanted.map(option => clean(option.textContent));
            check(token);
            for (const option of Array.from(el.options)) option.selected = wanted.includes(option);
            el.dispatchEvent(new Event('input', {bubbles: true}));
            // input 监听器可能同步替换整个控件，change 必须派发到当前节点。
            const changed = getSelect();
            if (!changed) throw staleError();
            changed.dispatchEvent(new Event('change', {bubbles: true}));
            check(token);
            if (!await waitForRead(() => {
                const fresh = getSelect();
                const values = fresh ? Array.from(fresh.selectedOptions).map(option => option.value) : [];
                return values.length === wantedValues.length && wantedValues.every(value => values.includes(value));
            }, token)) throw new Error('未确认原生下拉答案被保存');
            results.push('已填：' + wantedLabels.join('、'));
        }
        return results.join('；');
    }

    function textEditors(card) {
        const root = card.querySelector(S.value) || card;
        return all(S.text, root).filter(el => usable(el) && !el.closest('[role="combobox"], [role="listbox"], .b-select-dropdown-content, .bitable-selector-option-modal') &&
            !el.matches('.b-select-search, input[type="search"]') &&
            el.getAttribute('role') !== 'searchbox' && !el.closest('[contenteditable="true"], [contenteditable="plaintext-only"]')?.contains(el.parentElement));
    }

    async function fillText(card, force, fixed, token) {
        if (!textEditors(liveCard(card)).length) throw new Error('文本编辑器尚未加载');
        const results = [];
        for (let index = 0; index < textEditors(liveCard(card)).length; index++) {
            const el = textEditors(liveCard(card))[index];
            const editable = el.isContentEditable || /^(true|plaintext-only)$/.test(el.getAttribute('contenteditable') || '');
            const current = clean(editable ? el.textContent : el.value);
            if (!force && !hasPlan(card, 'text-' + index) && current) {
                results.push('已有回答');
                continue;
            }
            const rule = CONFIG.textRules.find(rule => rule.match.test(fieldTitle(card)));
            const pool = CONFIG.textByField[fieldId(card)] || rule?.values || CONFIG.textPool;
            if (fixed === undefined && (!Array.isArray(pool) || !pool.length)) throw new Error('文本候选池为空');
            const min = el.minLength > 0 ? el.minLength : 0;
            const max = el.maxLength >= 0 ? el.maxLength : Infinity;
            const candidates = fixed === undefined ? pool.filter(value => String(value).length >= min && String(value).length <= max) : [fixed];
            if (!candidates.length) throw new Error('内置文案不符合该文本框的字数限制，请自定义文案');
            const value = planned(card, 'text-' + index, () => String(pick(candidates)));
            if (value.length < min || value.length > max) throw new Error('固定文本不符合字数限制');
            check(token);
            el.focus();
            if (editable) {
                // 富文本依赖编辑事件；不直接改 innerHTML，以免只改界面而未被编辑器记录。
                const range = document.createRange();
                range.selectNodeContents(el);
                const sel = window.getSelection();
                if (!sel) throw new Error('浏览器未提供文本选区');
                sel.removeAllRanges();
                sel.addRange(range);
                if (!scriptAction(() => document.execCommand('insertText', false, value))) throw new Error('浏览器不支持富文本插入，请手动输入');
            } else {
                const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
                Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, value);
                el.dispatchEvent(new Event('input', {bubbles: true}));
                const changed = textEditors(liveCard(card))[index];
                if (!changed) throw staleError();
                changed.dispatchEvent(new Event('change', {bubbles: true}));
            }
            el.blur();
            check(token);
            let fresh, actual;
            if (!await waitForRead(() => {
                fresh = textEditors(liveCard(card))[index];
                const editable = fresh?.isContentEditable || /^(true|plaintext-only)$/.test(fresh?.getAttribute('contenteditable') || '');
                actual = clean(editable ? fresh?.textContent : fresh?.value);
                return !!fresh && actual === clean(value);
            }, token)) throw new Error('未确认文本持久显示，请手动检查');
            if (fresh?.validity && !fresh.validity.valid) throw new Error('文本未通过格式校验，请手动修改');
            results.push('已填：' + actual);
        }
        return results.join('；');
    }

    async function fillCard(card, force, token) {
        card = liveCard(card);
        const fixed = CONFIG.fixedAnswers[fieldId(card)];
        const title = fieldTitle(card);
        debugStage(card, 'card.dispatch', {card: debugCard(card)});
        if (CONFIG.skipTitle.test(title)) return '人工检查：' + title;
        if (/质量(?:校验|检验|检测)|注意力(?:检测|校验|检验)|认真(?:作答|答题).*检验/.test(title)) {
            // 只解释评分题里清晰、唯一的正向选择指令；不把描述里的其他数字当答案。
            const matches = [...title.matchAll(/(?:请|务必|必须)\s*(?:您|你)?\s*(?:直接|仅|只|务必)?\s*(?:选择|选中|勾选)\s*[“"'‘「]?\s*(\d+)\s*分/g)];
            if (!card.querySelector(S.rating) || matches.length !== 1 || /不要|不能|切勿|不得|不应|勿选|或/.test(title)) {
                return '人工检查：未识别唯一的质量校验评分指令';
            }
            const requested = Number(matches[0][1]);
            if (fixed !== undefined && Number(fixed) !== requested) return '人工检查：固定答案与质量校验指令冲突';
            return fillRating(card, force, requested, token);
        }
        // 选择+补充文本的复合题：下拉/原生选择后也处理普通文本，排除菜单搜索框。
        const withText = async result => {
            const fresh = liveCard(card);
            return textEditors(fresh).length ? result + '；' + await fillText(fresh, force, undefined, token) : result;
        };
        if (card.querySelector('select')) return withText(await fillNativeSelect(card, force, fixed, token));
        if (dropdownTrigger(card)) return withText(await fillDropdown(card, force, fixed, token));
        if (getOptions(card).length) {
            const result = await fillList(card, force, fixed, token);
            const fresh = liveCard(card);
            return textEditors(fresh).length ? result + '；' + await fillText(fresh, force, undefined, token) : result;
        }
        if (card.querySelector(S.rating)) return fillRating(card, force, fixed, token);
        if (card.querySelector(S.text)) return fillText(card, force, fixed, token);
        return '不支持的题型：请手动填写';
    }

    // 脚本不调用提交/网络接口，不批量提交；网页自身仍可能同步或保存草稿。
    const panel = document.createElement('div');
    panel.id = 'feishu-random-prefill-panel';
    panel.style.cssText = 'position:fixed;right:12px;bottom:12px;z-index:2147483647;width:260px;max-width:85vw;padding:12px;background:#fff;border:1px solid #ccc;border-radius:10px;box-shadow:0 4px 18px #0003;color:#222;font:13px/1.6 sans-serif;';
    const heading = document.createElement('strong');
    heading.textContent = '问卷预填 · 诊断版 v3.3.1';
    panel.append(heading);
    const status = document.createElement('div');
    status.style.cssText = 'margin:6px 0;white-space:pre-wrap;';
    status.textContent = '等待问卷加载；填空题将随机使用内置文案，请检查是否符合真实想法。';
    panel.append(status);
    const buttons = document.createElement('div');
    panel.append(buttons);

    function button(label, handler) {
        const b = document.createElement('button');
        b.type = 'button';
        b.textContent = label;
        b.style.cssText = 'margin:3px;padding:4px 7px;cursor:pointer;';
        b.addEventListener('click', handler);
        buttons.append(b);
    }

    document.body.append(panel);

    function stop() {
        stopped = true;
        generation++;
        clearTimeout(timer);
        observer?.disconnect();
        status.textContent = '已停止。当前已填写内容会保留。';
    }

    async function run(force = false, onlyDropdowns = false, automatic = false) {
        if (running) return;
        trace('run.start', null, {force, onlyDropdowns, automatic});
        if (!allowedPage() || pageKey() !== INITIAL_PAGE) {
            stop();
            status.textContent = '网址已变化，请刷新新的问卷页面后再填充。';
            return;
        }
        if (!questionCards().some(visible)) {
            status.textContent = '等待问卷加载；若停在登录页面，请先自行登录。';
            return;
        }
        if (!automatic) autoBlocked.clear();
        stopped = false;
        running = true;
        const token = ++generation;
        const results = new Map(), completed = new Set(), attempts = new Map(), retryAt = new Map();
        answerPlans.clear();
        runDeadline = Date.now() + CONFIG.runMaxMs;
        let quietSince = 0;
        const eligible = card => (!onlyDropdowns || !!dropdownTrigger(card)) && !completed.has(fieldId(card)) &&
            (!automatic || !autoBlocked.has(fieldId(card))) &&
            (force || (!done.has(fieldId(card)) && !touched.has(fieldId(card))));
        const record = (card, result) => results.set(fieldId(card), {
            字段: fieldId(card), 题号: clean(card.querySelector('.base-form-container_number_content')?.textContent),
            题目: fieldTitle(card), 结果: result
        });
        try {
            const guideClose = document.querySelector('.mobile-voice-input-onboarding-guide-header-close-btn');
            if (usable(guideClose)) await click(guideClose, token);
            while (Date.now() < runDeadline) {
                check(token);
                // 每一步重扫，不让先前答题触发的整页重渲染污染后续调度。
                const pending = questionCards().filter(visible).filter(eligible);
                const card = pending.find(c => Date.now() >= (retryAt.get(fieldId(c)) || 0));
                if (!card) {
                    if (!pending.length) {
                        if (!quietSince) quietSince = Date.now();
                        if (Date.now() - quietSince >= CONFIG.domQuietMs) break;
                    } else quietSince = 0;
                    await sleep(pollMs());
                    continue;
                }
                quietSince = 0;
                const id = fieldId(card), attempt = (attempts.get(id) || 0) + 1;
                attempts.set(id, attempt);
                activeQuestion = {id, revision: touchRevision.get(id) || 0};
                status.textContent = '正在预填：' + fieldTitle(card) + (attempt > 1 ? '（重试 ' + attempt + '）' : '');
                trace('card.attempt', card, {attempt, connected: card.isConnected});
                try {
                    if (!await waitForRead(() => controlsReady(liveCard(card)), token)) throw new Error('控件加载超时或题型暂不支持');
                    const current = liveCard(card);
                    const result = await fillCard(current, force, token);
                    check(token);
                    const fresh = liveCard(current);
                    if (result.startsWith('不支持')) throw new Error('题型暂不支持');
                    done.add(id);
                    completed.add(id);
                    autoBlocked.delete(id);
                    record(fresh, result);
                    trace('card.result', fresh, {attempt, outcome: result.includes('已填：') ? 'filled' : result.startsWith('人工检查') ? 'manual' : 'existing'});
                } catch (e) {
                    if (e.name === 'AbortError') throw e;
                    trace('card.error', card, {attempt, connected: card.isConnected, errorName: e.name});
                    if (e.name === 'UserTouchedError') {
                        completed.add(id);
                        record(card, '人工检查：填写期间检测到用户操作，已让出该题');
                    } else {
                        record(card, '失败：' + e.message);
                        if (attempt >= CONFIG.maxAttempts || Date.now() >= runDeadline) {
                            completed.add(id);
                            autoBlocked.add(id);
                            trace('card.retry-exhausted', card, {attempt});
                        } else {
                            retryAt.set(id, Date.now() + CONFIG.retryDelayMs);
                            trace('card.retry-scheduled', card, {attempt, stale: e.name === 'StaleDOMError'});
                        }
                    }
                } finally {
                    activeQuestion = null;
                }
            }
            const liveIds = new Set(questionCards().filter(visible).map(fieldId));
            // 被条件逻辑隐藏/删除的旧题不算当前问卷漏填。
            for (const id of results.keys()) if (!liveIds.has(id)) results.delete(id);
            for (const card of questionCards().filter(visible).filter(eligible)) {
                autoBlocked.add(fieldId(card));
                record(card, '失败：本轮达到等待上限，请手动重试空题');
            }
            const rows = [...results.values()];
            const filled = rows.filter(r => r.结果.includes('已填：')).length;
            const manual = rows.filter(r => /^(失败|人工检查|不支持)/.test(r.结果)).length;
            status.textContent = '本轮已填 ' + filled + ' 题；需检查 ' + manual + ' 题。\n已有/已操作回答保留。详情看 F12 控制台。\n请检查内置文案、基本信息和质量校验题，再自行提交。';
            trace('run.finished', null, {filled, manual, processed: rows.length});
            console.group('[飞书预填调试] 本轮结果（不含答案）');
            console.table(CONFIG.debug ? rows.map((r, i) => ({
                record: i + 1,
                outcome: r.结果.startsWith('失败') ? 'error' : r.结果.startsWith('人工检查') ? 'manual' : r.结果.includes('已填：') ? 'filled' : 'existing'
            })) : rows);
            console.groupEnd();
        } catch (e) {
            if (e.name !== 'AbortError') {
                status.textContent = '发生错误：' + e.message;
                console.error(CONFIG.debug ? '[飞书预填调试] 主流程异常：' + e.name : e);
            }
        } finally {
            activeQuestion = null;
            runDeadline = Infinity;
            running = false;
        }
    }

    button('填充空题', () => void run(false));
    const reroll = () => {
        if (running) return;
        if (confirm('重新随机会覆盖当前问卷中支持题型的已有回答（人工检查题除外）。确定继续？')) void run(true);
    };
    button('重新随机', reroll);
    button('停止', stop);
    button('打印诊断', printDiagnostics);
    button('只重试空下拉', () => {
        if (running) {
            debugLog('retry.ignored-busy');
            return;
        }
        for (const card of questionCards()) {
            if (dropdownTrigger(card)) {
                done.delete(fieldId(card));
                touched.delete(fieldId(card));
            }
        }
        debugLog('retry.empty-dropdowns');
        void run(false, true);
    });
    if (typeof GM_registerMenuCommand === 'function') {
        GM_registerMenuCommand('填充空题（保留已有回答）', () => void run(false));
        GM_registerMenuCommand('重新随机（确认后覆盖）', reroll);
        GM_registerMenuCommand('停止自动预填', stop);
        GM_registerMenuCommand('打印脱敏诊断日志', printDiagnostics);
    }
    // 自动填充过程中，保护用户自己碰过的题，即使还没有填完。
    for (const type of ['pointerdown', 'keydown', 'input', 'change']) {
        document.addEventListener(type, e => {
            if (!e.isTrusted || scriptActionDepth > 0 || panel.contains(e.target)) return;
            const card = e.target instanceof Element ? e.target.closest(S.card) : null;
            if (card) {
                const id = fieldId(card);
                touched.add(id);
                touchRevision.set(id, (touchRevision.get(id) || 0) + 1);
            }
        }, true);
    }
    if (CONFIG.autoFill) {
        const expires = Date.now() + CONFIG.watchMs;

        function schedule() {
            if (stopped || running || Date.now() > expires) return;
            if (!questionCards().some(c => visible(c) && !done.has(fieldId(c)) && !touched.has(fieldId(c)) && !autoBlocked.has(fieldId(c)))) return;
            clearTimeout(timer);
            timer = setTimeout(() => void run(false, false, true), 700);
        }

        observer = new MutationObserver(mutations => {
            if (mutations.some(m => !panel.contains(m.target))) schedule();
        });
        observer.observe(document.body, {childList: true, subtree: true});
        timer = setTimeout(() => void run(false, false, true), CONFIG.startDelayMs);
        setTimeout(() => {
            observer?.disconnect();
        }, CONFIG.watchMs);
        window.addEventListener('pagehide', stop, {once: true});
    }
})();
