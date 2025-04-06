// ==UserScript==
// @name         ChatGPT Prompt Presets
// @namespace    http://tampermonkey.net/
// @version      1.3
// @description  Enhance ChatGPT experience by adding customizable prompt presets.
// @author       Konhz
// @match        https://chatgpt.com/*
// @grant        GM_xmlhttpRequest
// @connect      api.github.com
// @updateURL    https://raw.githubusercontent.com/huaizhenkou/ChatGPT-Prompt-Presets-Sync/main/ChatGPT%20Prompt%20Presets.user.js
// @downloadURL  https://raw.githubusercontent.com/huaizhenkou/ChatGPT-Prompt-Presets-Sync/main/ChatGPT%20Prompt%20Presets.user.js
// ==/UserScript==


(function () {
    'use strict';

    const i18nMap = {
        zh: {
            settingsTitle: "ChatGPT 自定义设置",
            chatWidthLabel: "对话区域宽度",
            reset: "恢复默认",
            promptDataTitle: "📦 Prompt 数据管理",
            export: "📤 导出",
            import: "📥 导入",
            gistId: "Gist ID",
            gistToken: "GitHub Token",
            gistIdPlaceholder: "请输入 GitHub Gist ID",
            gistTokenPlaceholder: "可选，支持私有 Gist",
            upload: "⬆️ 上传",
            download: "⬇️ 拉取",
            addPrompt: "添加 Prompt",
            savePrompt: "保存",
            promptListTitle: count => `📂 已添加 ${count} 条 Prompt` ,
            deleteConfirm: title => `是否删除 Prompt「${title}」？`,
            importOverwriteConfirm: count => `导入将覆盖当前 ${count} 条 prompt，是否继续？`,
            uploadSuccess: "上传成功",
            uploadFail: (status, msg) => `上传失败: ${status}\n${msg}`,
            uploadFail_onerror: "上传失败",
            fetchSuccess: "同步成功",
            fetchFail: (status, msg) => `拉取失败: ${status}\n${msg}`,
            fetchFail_onerror: "拉取失败",
            parseError: msg => `解析失败: ${msg}`,
            importSuccess: "导入成功",
            importFail: msg => `导入失败：${msg}`,
            titleEmpty: "标题和内容不能为空",
            lengthExceeded: "长度超限",
            fileNotFound: '未找到 chatgpt_prompts.json 文件',
            formatInvalid: '格式不正确',
            formatNotArray: "格式错误：不是数组",
            formatInvalidField: "格式错误：字段不合法",
            openSettings: "打开增强设置",
            titlePlaceholder: "题目 (≤10字)",
            contentPlaceholder: "内容 (≤1000字)",
            editPrompt: "✏️ 编辑",
            deletePrompt: "🗑️ 删除",
            inputPrompt: "请输入 Gist ID",
            gistId: "Gist ID：",
            gistToken: "GitHub Token：",
            promptTips: "提示：请在浮动按钮中右键编辑或删除 Prompt",
        },
        en: {
            settingsTitle: "ChatGPT Custom Settings",
            chatWidthLabel: "Chat Width",
            reset: "Reset",
            promptDataTitle: "📦 Prompt Management",
            export: "📤 Export",
            import: "📥 Import",
            gistId: "Gist ID",
            gistToken: "GitHub Token",
            gistIdPlaceholder: "Enter GitHub Gist ID",
            gistTokenPlaceholder: "Optional, supports private Gists",
            upload: "⬆️ Upload",
            download: "⬇️ Download",
            addPrompt: "Add Prompt",
            savePrompt: "Save",
            promptListTitle: count => `📂 ${count} Prompts`,
            deleteConfirm: title => `Delete prompt \"${title}\"?`,
            importOverwriteConfirm: count => `Import will overwrite ${count} prompts. Continue?`,
            uploadSuccess: "Upload successful",
            uploadFail: (status, msg) => `Upload failed: ${status}\n${msg}`,
            uploadFail_onerror: "Upload failed",
            fetchSuccess: "Sync successful",
            fetchFail: (status, msg) => `Download failed: ${status}\n${msg}`,
            fetchFail_onerror: "Download failed",
            parseError: msg => `Parse error: ${msg}`,
            importFail: msg => `Import failed: ${msg}`,
            importSuccess: "Import Success",
            titleEmpty: "Title and content cannot be empty",
            lengthExceeded: "Length exceeded",
            fileNotFound: 'chatgpt_prompts.json not found',
            formatInvalid: 'Invalid format',
            formatNotArray: "Format error: not an array",
            formatInvalidField: "Format error: invalid field structure",
            openSettings: "Open settings",
            titlePlaceholder: "Title (≤10 chars)",
            contentPlaceholder: "Content (≤1000 chars)",
            editPrompt: "✏️ Edit",
            deletePrompt: "🗑️ Delete",
            inputPrompt: "Please input Gist ID",
            gistId: "Gist ID：",
            gistToken: "GitHub Token：",
            promptTips: "Tip: Right-click a floating button to edit or delete a prompt",
        }
    };

    const lang = navigator.language?.split('-')[0] || 'en';
    const t = i18nMap[lang] || i18nMap.en;

    const STORAGE_KEY = 'chatgpt_enhancer_config';

    const defaultConfig = {
        customChatWidthPercent: 50,
        prompts: [],
        gistId: localStorage.getItem('gist_id') || '',
        gistToken: '',
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

    function uploadPromptsToGist(gistId, token) {
        const url = `https://api.github.com/gists/${gistId}`;
        GM_xmlhttpRequest({
            method: 'PATCH',
            url: url,
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { 'Authorization': `token ${token}` } : {})
            },
            data: JSON.stringify({
                files: {
                    'chatgpt_prompts.json': {
                        content: JSON.stringify(config.prompts, null, 2)
                    }
                }
            }),
            onload: function (response) {
                if (response.status === 200) {
                    alert(t.uploadSuccess);
                } else {
                    alert(t.uploadFail(response.status, response.responseText));
                }
            },
            onerror: function () {
                alert(t.uploadFail_onerror);
            }
        });
    }

    function fetchPromptsFromGist(gistId, token = null) {
        const url = `https://api.github.com/gists/${gistId}`;
        GM_xmlhttpRequest({
            method: 'GET',
            url: url,
            headers: {
                ...(token ? { 'Authorization': `token ${token}` } : {})
            },
            onload: function (response) {
                if (response.status !== 200) {
                    alert(t.fetchFail(response.status, response.responseText));
                    return;
                }

                try {
                    const data = JSON.parse(response.responseText);
                    const content = data.files?.['chatgpt_prompts.json']?.content;
                    if (!content) return alert(t.fileNotFound);

                    const imported = JSON.parse(content);
                    if (!Array.isArray(imported)) throw new Error(t.formatInvalid);

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

                    alert(t.fetchSuccess);
                } catch (e) {
                    alert(t.parseError(e.message));
                }
            },
            onerror: function () {
                alert(t.fetchFail_onerror);
            }
        });
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
                    if (!Array.isArray(imported)) throw new Error(t.formatNotArray);

                    const valid = imported.every(p =>
                                                 typeof p.title === 'string' &&
                                                 typeof p.content === 'string' &&
                                                 p.title.length <= 10 &&
                                                 p.content.length <= 1000
                                                );

                    if (!valid) throw new Error(t.formatInvalidField);

                    if (confirm(t.importOverwriteConfirm(config.prompts.length))) {
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
                        alert(t.importSuccess);
                    }
                } catch (err) {
                    alert(t.importFail(err.message));
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

        btn.title = t.openSettings;
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
            justifyContent: 'flex-start',
            zIndex: '1000',
            marginBottom: '8px',
            background: bg,
            color: color,
            borderTop: `1px solid ${border}`,
            overflowX: 'auto',
        });

        // 添加 ➕ 按钮
        const addBtn = document.createElement('button');
        addBtn.textContent = '➕ 添加';
        Object.assign(addBtn.style, {
            padding: '4px 8px',
            border: `1px dashed ${border}`,
            borderRadius: '4px',
            background: 'transparent',
            color: color,
            cursor: 'pointer',
            fontSize: '12px',
        });

        addBtn.onclick = () => {
            showPromptEditor(); // 不传 index，代表新建
        };

        wrapper.appendChild(addBtn);

        config.prompts.forEach((p, i) => {
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

            // 插入内容
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

            // 右键菜单
            btn.oncontextmenu = (e) => {
                e.preventDefault();
                showPromptMenu(e.pageX, e.pageY, i, p);
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
    }



    function forceInputBottom() {
        const editor = document.querySelector('.ProseMirror');
        if (!editor) return;

        const formWrapper = editor.closest('form')?.parentElement;
        if (formWrapper) {
            formWrapper.style.marginTop = 'auto';
        }
    }

    renderPromptButtons();
    forceInputBottom();

    observeThemeChange(() => {
        renderPromptButtons();
        forceInputBottom();
    });

    ensurePromptButtonsMounted();

    const waitInput = setInterval(() => {
        const textarea = document.querySelector('textarea');
        if (textarea) {
            renderPromptButtons();
            clearInterval(waitInput);
        }
    }, 500);

    function createPromptEditor(container, dark) {
        const hint = document.createElement('div');
        hint.textContent = t.promptTips;
        Object.assign(hint.style, {
            fontSize: '13px',
            color: dark ? '#ccc' : '#666',
            padding: '4px',
            fontStyle: 'italic',
        });

        container.appendChild(hint);
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

        <h2 style="margin-top:0; font-size: 16px;">${t.settingsTitle}</h2>

        <div style="margin-top: 12px;">
          <label style="font-weight: bold;">${t.chatWidthLabel}<span id="widthValue">${config.customChatWidthPercent}%</span></label><br>
          <div style="display: flex; align-items: center; gap: 8px;">
            <input type="range" id="widthSlider" min="50" max="80" value="${config.customChatWidthPercent}" style="flex: 1;">
            <button id="resetWidthBtn" style="flex-shrink:0;">${t.reset}</button>
          </div>
        </div>

        <hr style="margin: 12px -8px; border: none; border-top: 1px solid ${borderColor};">

<details style="margin-top: 12px;">
  <summary style="cursor:pointer; font-weight: bold;">${t.promptDataTitle}</summary>

  <div style="margin-top: 8px; display: flex; gap: 8px; justify-content: space-between;">
    <button id="exportPromptsBtn" style="flex:1;">${t.export}</button>
    <button id="importPromptsBtn" style="flex:1;">${t.import}</button>
  </div>

  <div style="margin-top: 16px;">
    <label style="font-weight:bold;">${t.gistId}</label>
    <input id="gistIdInput" style="width:100%;margin-top:4px;padding:4px;" placeholder="${t.gistIdPlaceholder}">

    <label style="font-weight:bold;margin-top:8px;">${t.gistToken}</label>
    <input type="password" id="gistTokenInput" style="width:100%;margin-top:4px;padding:4px;" placeholder="${t.gistTokenPlaceholder}">

    <div style="margin-top:8px;display:flex;gap:8px;">
      <button id="syncUpload" style="flex:1;">${t.upload}</button>
      <button id="syncDownload" style="flex:1;">${t.download}</button>
    </div>
  </div>
</details>

<div id="promptEditorContainer" style="margin-top: 12px;"></div>

      </div>
    `;

        document.body.appendChild(settingsPanel);
        document.addEventListener('click', outsideClickClose);
        settingsPanel.addEventListener('click', e => e.stopPropagation());

        const buttonStyle = {
            flex: '1',
            padding: '4px 8px',
            border: dark ? '1px solid #555' : '1px solid #ccc',
            borderRadius: '4px',
            background: dark ? '#444' : '#f9f9f9',
            color: dark ? '#fff' : '#000',
            cursor: 'pointer'
        };

        ['exportPromptsBtn', 'importPromptsBtn', 'syncUpload', 'syncDownload'].forEach(id => {
            const btn = document.getElementById(id);
            if (btn) Object.assign(btn.style, buttonStyle);
        });

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

        document.getElementById('gistIdInput').value = config.gistId || '';
        document.getElementById('gistTokenInput').value = config.gistToken || '';

        const tokenInput = document.getElementById('gistTokenInput');
        Object.assign(tokenInput.style, {
            background: dark ? '#444' : '#fff',
            color: dark ? '#fff' : '#000',
            border: '1px solid #888',
            borderRadius: '4px',
        });

        document.getElementById('syncUpload').addEventListener('click', () => {
            const gistId = document.getElementById('gistIdInput').value.trim();
            const token = document.getElementById('gistTokenInput').value.trim();

            if (!gistId) return alert(t.inputPrompt);

            config.gistId = gistId;
            config.gistToken = token;
            saveConfig();

            uploadPromptsToGist(gistId, token);
        });

        document.getElementById('syncDownload').addEventListener('click', () => {
            const gistId = document.getElementById('gistIdInput').value.trim();
            const token = document.getElementById('gistTokenInput').value.trim();

            if (!gistId) return alert(t.inputPrompt);

            config.gistId = gistId;
            config.gistToken = token;
            saveConfig();

            fetchPromptsFromGist(gistId, token);
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

    function showPromptMenu(x, y, index, prompt) {
        const existing = document.getElementById('cgpt-prompt-context-menu');
        if (existing) existing.remove();

        const dark = isDarkTheme();
        const menu = document.createElement('div');
        menu.id = 'cgpt-prompt-context-menu';

        Object.assign(menu.style, {
            position: 'absolute',
            top: `${y}px`,
            left: `${x}px`,
            background: dark ? '#444' : '#fff',
            color: dark ? '#fff' : '#000',
            border: '1px solid #888',
            borderRadius: '4px',
            boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
            zIndex: 10000,
        });

        const edit = document.createElement('div');
        edit.textContent = t.editPrompt;
        const del = document.createElement('div');
        del.textContent = t.deletePrompt;

        [edit, del].forEach(el => {
            Object.assign(el.style, {
                padding: '6px 12px',
                cursor: 'pointer',
            });
            el.onmouseover = () => { el.style.background = (dark ? '#555' : '#eee'); };
            el.onmouseout = () => { el.style.background = 'inherit'; };
        });

        edit.onclick = () => {
            menu.remove();
            showPromptEditor(index, prompt);
        };

        del.onclick = () => {
            menu.remove();
            if (confirm(t.deleteConfirm(prompt.title))) {
                config.prompts.splice(index, 1);
                saveConfig();
                renderPromptButtons();
            }
        };

        menu.appendChild(edit);
        menu.appendChild(del);
        document.body.appendChild(menu);

        const cleanup = () => menu.remove();
        setTimeout(() => {
            document.addEventListener('click', cleanup, { once: true });
        }, 0);
    }

    function showPromptEditor(index, prompt = { title: '', content: '' }) {
        const existing = document.getElementById('cgpt-prompt-editor-popup');
        if (existing) existing.remove();

        const dark = isDarkTheme();
        const popup = document.createElement('div');
        popup.id = 'cgpt-prompt-editor-popup';

        Object.assign(popup.style, {
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            background: dark ? '#333' : '#fff',
            color: dark ? '#fff' : '#000',
            border: '1px solid #888',
            borderRadius: '8px',
            padding: '16px',
            zIndex: 10000,
            boxShadow: '0 2px 12px rgba(0,0,0,0.3)',
            width: '300px'
        });

        const title = document.createElement('input');
        title.value = prompt.title || '';
        title.maxLength = 10;
        title.placeholder = t.titlePlaceholder;
        Object.assign(title.style, {
            width: '100%',
            marginBottom: '8px',
            padding: '6px',
            border: '1px solid #888',
            borderRadius: '4px',
            background: dark ? '#444' : '#fff',
            color: dark ? '#fff' : '#000',
        });

        const content = document.createElement('textarea');
        content.value = prompt.content || '';
        content.maxLength = 1000;
        content.rows = 4;
        content.placeholder = t.contentPlaceholder;
        Object.assign(content.style, {
            width: '100%',
            marginBottom: '8px',
            padding: '6px',
            border: '1px solid #888',
            borderRadius: '4px',
            background: dark ? '#444' : '#fff',
            color: dark ? '#fff' : '#000',
        });

        const saveBtn = document.createElement('button');
        saveBtn.textContent = t.savePrompt;
        Object.assign(saveBtn.style, {
            width: '100%',
            padding: '6px',
            border: 'none',
            borderRadius: '4px',
            background: '#4caf50',
            color: '#fff',
            cursor: 'pointer'
        });

        saveBtn.onclick = () => {
            const newTitle = title.value.trim();
            const newContent = content.value.trim();
            if (!newTitle || !newContent) return alert(t.titleEmpty);
            if (newTitle.length > 10 || newContent.length > 1000) return alert(t.lengthExceeded);

            if (typeof index === 'number') {
                config.prompts[index] = { title: newTitle, content: newContent };
            } else {
                config.prompts.push({ title: newTitle, content: newContent });
            }

            saveConfig();
            renderPromptButtons();
            popup.remove();
        };

        popup.appendChild(title);
        popup.appendChild(content);
        popup.appendChild(saveBtn);

        document.body.appendChild(popup);

        setTimeout(() => {
            document.addEventListener('click', (e) => {
                if (!popup.contains(e.target)) popup.remove();
            }, { once: true });
        }, 0);
    }


})();
