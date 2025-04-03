// ==UserScript==
// @name         ChatGPT Enhancer: Model Menu Merge, Wide Screen & Prompt Presets
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Enhance ChatGPT experience by merging the model menu, enabling wide-screen conversations, and adding customizable prompt presets.
// @author       Konhz
// @match        https://chatgpt.com/*
// @grant        none
// @updateURL    https://github.com/konhz/chatgpt-enhancer/raw/main/script.user.js
// @downloadURL  https://github.com/konhz/chatgpt-enhancer/raw/main/script.user.js
// ==/UserScript==



(function () {
    'use strict';

    const STORAGE_KEY = 'chatgpt_enhancer_config';

    const defaultConfig = {
        customChatWidthPercent: 50,
        prompts: [],
    };

    const config = loadConfig();
    let settingsPanel = null;

    function loadConfig() {
        const saved = localStorage.getItem(STORAGE_KEY);
        return saved ? { ...defaultConfig, ...JSON.parse(saved) } : { ...defaultConfig };
    }

    function saveConfig() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    }

    function exportPrompts() {
        const dataStr = JSON.stringify(config.prompts, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = 'chatgpt-prompts.json';
        a.click();

        URL.revokeObjectURL(url);
    }

    function importPrompts() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';

        input.onchange = () => {
            const file = input.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const imported = JSON.parse(e.target.result);
                    if (!Array.isArray(imported)) throw new Error("格式错误：不是数组");

                    const valid = imported.every(p =>
                                                 typeof p.title === 'string' &&
                                                 typeof p.content === 'string' &&
                                                 p.title.length <= 10 &&
                                                 p.content.length <= 1000
                                                );

                    if (!valid) throw new Error("格式错误：字段不合法");

                    if (confirm(`导入将覆盖当前 ${config.prompts.length} 条 prompt，是否继续？`)) {
                        config.prompts = imported;
                        saveConfig();
                        renderPromptButtons();
                        if (settingsPanel) {
                            const container = document.getElementById('promptEditorContainer');
                            if (container) {
                                container.innerHTML = '';
                                createPromptEditor(container, isDarkTheme());
                            }
                        }
                        alert('导入成功');
                    }
                } catch (err) {
                    alert(`导入失败：${err.message}`);
                }
            };
            reader.readAsText(file);
        };

        input.click();
    }


    function isDarkTheme() {
        const bgColor = window.getComputedStyle(document.body).backgroundColor;
        if (!bgColor) return false;
        const rgb = bgColor.match(/\d+/g).map(Number);
        const brightness = (rgb[0] * 299 + rgb[1] * 587 + rgb[2] * 114) / 1000;
        return brightness < 128;
    }

    function injectSettingsButton() {
        if (document.getElementById('cgpt-enhancer-settings-btn')) return;

        const btn = document.createElement('button');
        btn.id = 'cgpt-enhancer-settings-btn';
        btn.innerHTML = '⚙️';
        Object.assign(btn.style, {
            position: 'fixed',
            bottom: '20px',
            right: '20px',
            zIndex: '9999',
            fontSize: '18px',
            padding: '8px 10px',
            background: '#fff',
            border: '1px solid #ccc',
            borderRadius: '50%',
            cursor: 'pointer',
            boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
        });

        btn.title = '打开增强设置';
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (settingsPanel) {
                closeSettingsPanel();
            } else {
                createSettingsPanel();
            }
        });

        document.body.appendChild(btn);
    }

    function applyCustomWidth() {
        const percent = config.customChatWidthPercent;
        const maxWidth = `${percent}vw`;

        const update = () => {
            const containers = document.querySelectorAll('main div[class*="max-w-"], main .lg\\:max-w-3xl, main .xl\\:max-w-4xl');
            containers.forEach(el => {
                el.style.maxWidth = maxWidth;
                el.style.width = '100%';
            });
        };

        update();

        const main = document.querySelector('main');
        if (main) {
            const chatObserver = new MutationObserver(update);
            chatObserver.observe(main, { childList: true, subtree: true });
        }

    }

    applyCustomWidth();
    injectSettingsButton();

    function observeThemeChange(callback) {
        const observer = new MutationObserver(() => {
            callback();
        });

        observer.observe(document.body, {
            attributes: true,
            attributeFilter: ['class', 'style']
        });
    }

    function ensurePromptButtonsMounted(interval = 1000) {
        let lastEditor = null;

        setInterval(() => {
            const editor = document.querySelector('.ProseMirror');

            if (editor && editor !== lastEditor) {
                lastEditor = editor;

                const exists = document.getElementById('cgpt-prompt-buttons');
                if (!exists) {
                    renderPromptButtons();
                    forceInputBottom();
                }
            }
        }, interval);
    }



    function renderPromptButtons() {
        const editor = document.querySelector('.ProseMirror');
        if (!editor) return;

        const parent = editor.closest('form')?.parentElement;
        if (!parent) return;

        let wrapper = document.getElementById('cgpt-prompt-buttons');
        if (wrapper) wrapper.remove();

        // 🌗 主题自适配
        const dark = isDarkTheme();
        const bg = dark ? '#333' : '#fff';
        const color = dark ? '#fff' : '#000';
        const border = dark ? '#555' : '#aaa';

        wrapper = document.createElement('div');
        wrapper.id = 'cgpt-prompt-buttons';
        Object.assign(wrapper.style, {
            position: 'absolute',
            bottom: '100%',
            left: '0',
            right: '0',
            display: 'flex',
            gap: '8px',
            padding: '4px',
            flexWrap: 'wrap',
            justifyContent: 'flex-start', // ✅ 左对齐
            zIndex: '1000',
            marginBottom: '8px',
            background: bg,
            color: color,
            borderTop: `1px solid ${border}`,
            overflowX: 'auto',
        });

        config.prompts.forEach(p => {
            const btn = document.createElement('button');
            btn.textContent = p.title;
            Object.assign(btn.style, {
                padding: '4px 8px',
                border: `1px solid ${border}`,
                borderRadius: '4px',
                background: bg,
                color: color,
                cursor: 'pointer',
                fontSize: '12px',
                maxWidth: '80px',
                overflow: 'hidden',
                whiteSpace: 'nowrap',
                textOverflow: 'ellipsis',
            });

            btn.onclick = (e) => {
                e.preventDefault();
                editor.focus();

                const sel = window.getSelection();
                if (!sel || sel.rangeCount === 0) return;

                const range = sel.getRangeAt(0);
                range.deleteContents();
                const textNode = document.createTextNode(p.content);
                range.insertNode(textNode);
                range.setStartAfter(textNode);
                range.setEndAfter(textNode);
                sel.removeAllRanges();
                sel.addRange(range);

                editor.dispatchEvent(new Event('input', { bubbles: true }));
            };

            btn.onmouseover = () => {
                btn.style.background = dark ? '#444' : '#eee';
            };
            btn.onmouseout = () => {
                btn.style.background = bg;
            };

            wrapper.appendChild(btn);
        });

        parent.style.position = 'relative';
        parent.appendChild(wrapper);

        // ✅ 输入框靠下显示
        parent.style.marginTop = 'auto';
    }

    function forceInputBottom() {
        const editor = document.querySelector('.ProseMirror');
        if (!editor) return;

        const formWrapper = editor.closest('form')?.parentElement;
        if (formWrapper) {
            formWrapper.style.marginTop = 'auto';
        }
    }

    renderPromptButtons(); // 初始渲染
    forceInputBottom();

    observeThemeChange(() => {
        renderPromptButtons(); // 主题切换
        forceInputBottom();
    });

    ensurePromptButtonsMounted(); // 放在脚本初始化阶段即可

    const waitInput = setInterval(() => {
        const textarea = document.querySelector('textarea');
        if (textarea) {
            renderPromptButtons();
            clearInterval(waitInput);
        }
    }, 500);

    function createPromptEditor(container, dark) {
        const wrap = document.createElement('div');
        wrap.style.marginTop = '12px';

        const titleInput = document.createElement('input');
        titleInput.placeholder = '题目 (≤10字)';
        titleInput.maxLength = 10;
        Object.assign(titleInput.style, {
            width: '100%',
            padding: '4px',
            marginBottom: '4px',
            background: dark ? '#444' : '#fff',
            color: dark ? '#fff' : '#000',
            border: '1px solid #888',
            borderRadius: '4px',
        });

        const contentInput = document.createElement('textarea');
        contentInput.placeholder = '内容 (≤1000字)';
        contentInput.maxLength = 1000;
        contentInput.rows = 3;
        Object.assign(contentInput.style, {
            width: '100%',
            padding: '4px',
            marginBottom: '4px',
            background: dark ? '#444' : '#fff',
            color: dark ? '#fff' : '#000',
            border: '1px solid #888',
            borderRadius: '4px',
        });

        const addBtn = document.createElement('button');
        addBtn.textContent = '添加 Prompt';
        Object.assign(addBtn.style, {
            padding: '4px 8px',
            cursor: 'pointer',
            background: '#4caf50',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            marginBottom: '8px'
        });

        let editingIndex = -1;

        addBtn.onclick = () => {
            const title = titleInput.value.trim();
            const content = contentInput.value.trim();
            if (!title || !content) return alert("标题和内容不能为空");
            if (title.length > 10 || content.length > 1000) return alert("长度超限");

            if (editingIndex >= 0) {
                config.prompts[editingIndex] = { title, content };
            } else {
                config.prompts.push({ title, content });
            }

            saveConfig();
            renderPromptButtons();
            titleInput.value = '';
            contentInput.value = '';
            editingIndex = -1;
            addBtn.textContent = '添加 Prompt';
            renderPromptList();
        };

        const listWrap = document.createElement('div');
        listWrap.style.marginTop = '12px';

        function renderPromptList() {
            const prevDetails = listWrap.querySelector('details');
            const wasOpen = prevDetails?.open ?? true;

            listWrap.innerHTML = '';

            const toggle = document.createElement('details');
            toggle.open = wasOpen;

            const summary = document.createElement('summary');
            summary.textContent = `已添加 ${config.prompts.length} 条 Prompt`;
            toggle.appendChild(summary);

            config.prompts.forEach((p, i) => {
                const row = document.createElement('div');
                row.textContent = `📝 ${p.title}`;
                row.title = "点击编辑，右键删除";
                Object.assign(row.style, {
                    padding: '4px 6px',
                    margin: '2px 0',
                    background: dark ? '#444' : '#f4f4f4',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '13px',
                });

                row.onclick = () => {
                    titleInput.value = p.title;
                    contentInput.value = p.content;
                    editingIndex = i;
                    addBtn.textContent = '保存修改';
                };

                row.oncontextmenu = (e) => {
                    e.preventDefault();
                    if (confirm(`是否删除 Prompt「${p.title}」？`)) {
                        config.prompts.splice(i, 1);
                        saveConfig();
                        renderPromptButtons();
                        renderPromptList(); // 👈 关键点：保持展开状态
                    }
                };

                toggle.appendChild(row);
            });

            listWrap.appendChild(toggle);
        }


        container.appendChild(titleInput);
        container.appendChild(contentInput);
        container.appendChild(addBtn);
        container.appendChild(listWrap);

        renderPromptList();
    }


    function createSettingsPanel() {
        const dark = isDarkTheme();
        const textColor = dark ? '#fff' : '#000';
        const bgColor = dark ? '#333' : '#fff';
        const borderColor = dark ? '#555' : '#ccc';

        settingsPanel = document.createElement('div');
        settingsPanel.id = 'cgpt-enhancer-settings-panel';

        settingsPanel.innerHTML = `
      <div style="
        position: fixed;
        bottom: 70px;
        right: 20px;
        background: ${bgColor};
        color: ${textColor};
        border: 1px solid ${borderColor};
        box-shadow: 0 2px 12px rgba(0,0,0,0.2);
        z-index: 10000;
        padding: 16px;
        border-radius: 8px;
        width: 320px;
        font-family: sans-serif;
      ">

        <h2 style="margin-top:0; font-size: 16px;">ChatGPT 自定义设置</h2>

        <div style="margin-top: 12px;">
          <label style="font-weight: bold;">对话区域宽度：<span id="widthValue">${config.customChatWidthPercent}%</span></label><br>
          <div style="display: flex; align-items: center; gap: 8px;">
            <input type="range" id="widthSlider" min="50" max="80" value="${config.customChatWidthPercent}" style="flex: 1;">
            <button id="resetWidthBtn" style="flex-shrink:0;">恢复默认</button>
          </div>
        </div>

        <hr style="margin: 12px -8px; border: none; border-top: 1px solid ${borderColor};">

        <div style="margin-top: 12px; display: flex; gap: 8px; justify-content: space-between;">
               <button id="exportPromptsBtn" style="flex:1;">导出 Prompt</button>
               <button id="importPromptsBtn" style="flex:1;">导入 Prompt</button>
        </div>


        <div id="promptEditorContainer" style="margin-top: 12px;"></div>
      </div>
    `;

        document.body.appendChild(settingsPanel);
        document.addEventListener('click', outsideClickClose);
        settingsPanel.addEventListener('click', e => e.stopPropagation());

        document.getElementById('exportPromptsBtn').addEventListener('click', exportPrompts);
        document.getElementById('importPromptsBtn').addEventListener('click', importPrompts);

        const slider = document.getElementById('widthSlider');
        const widthLabel = document.getElementById('widthValue');
        slider.addEventListener('input', (e) => {
            config.customChatWidthPercent = parseInt(e.target.value);
            widthLabel.textContent = config.customChatWidthPercent + '%';
            saveConfig();
            applyCustomWidth();
        });

        document.getElementById('resetWidthBtn').addEventListener('click', () => {
            config.customChatWidthPercent = defaultConfig.customChatWidthPercent;
            saveConfig();
            slider.value = config.customChatWidthPercent;
            widthLabel.textContent = config.customChatWidthPercent + '%';
            applyCustomWidth();
        });

        const container = document.getElementById('promptEditorContainer');
        createPromptEditor(container, dark);
    }

    function closeSettingsPanel() {
        if (settingsPanel) {
            settingsPanel.remove();
            settingsPanel = null;
        }
        document.removeEventListener('click', outsideClickClose);
    }

    function outsideClickClose() {
        closeSettingsPanel();
    }
})();
