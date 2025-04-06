// ==UserScript==
// @name         ChatGPT Prompt Presets
// @namespace    http://tampermonkey.net/
// @version      1.4
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
            addPrompt: "➕ 添加",
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
            openSettings: "打开设置",
            titlePlaceholder: "题目 (≤10字)",
            contentPlaceholder: "内容 (≤1000字)",
            editPrompt: "✏️ 编辑",
            deletePrompt: "🗑️ 删除",
            promptTips: "提示：请在浮动按钮中右键编辑或删除 Prompt",
            duplicateTitle: "标题已存在，请修改",
            save: "保存",
            cancel: "取消",
            promptBulkDeleteTitle: "🧹 批量删除",
            promptBulkDeleteButton: "删除所选",
            promptBulkDeleteConfirm: count => `确认删除 ${count} 条 Prompt？`,
            promptBulkDeleteNone: "未选择任何 Prompt",
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
            addPrompt: "➕ Add",
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
            gistId: "Gist ID：",
            gistToken: "GitHub Token：",
            promptTips: "Tip: Right-click a floating button to edit or delete a prompt",
            duplicateTitle: "Title already exists. Please choose another.",
            save: "Save",
            cancel: "Cancel",
            promptBulkDeleteTitle: "🧹 Bulk Delete",
            promptBulkDeleteButton: "Delete Selected",
            promptBulkDeleteConfirm: count => `Are you sure you want to delete ${count} prompts?`,
            promptBulkDeleteNone: "No prompts selected",
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

        const form = editor.closest('form');
        if (!form) return;

        let wrapper = document.getElementById('cgpt-prompt-buttons');
        if (wrapper) wrapper.remove();

        const dark = isDarkTheme();
        const bg = dark ? '#333' : '#fff';
        const color = dark ? '#fff' : '#000';
        const border = dark ? '#555' : '#aaa';

        // 注入样式（仅添加一次）
        if (!document.getElementById('cgpt-prompt-style')) {
            const style = document.createElement('style');
            style.id = 'cgpt-prompt-style';
            style.textContent = `
            #cgpt-prompt-buttons button:hover {
                border-color: #4caf50;
            }
            #cgpt-prompt-buttons button.drag-over {
                border: 2px dashed #2196f3 !important;
                background-color: rgba(33, 150, 243, 0.1) !important;
            }
        `;
            document.head.appendChild(style);
        }

        wrapper = document.createElement('div');
        wrapper.id = 'cgpt-prompt-buttons';
        Object.assign(wrapper.style, {
            display: 'flex',
            flexWrap: 'wrap',
            gap: '8px',
            padding: '4px',
            marginBottom: '8px',
            borderTop: `1px solid ${border}`,
            background: bg,
            color: color,
            zIndex: '1000',
        });

        // ➕ 添加按钮
        const addBtn = document.createElement('button');
        addBtn.textContent = t.addPrompt;
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
            showPromptEditor();
        };

        wrapper.appendChild(addBtn);

        let dragSrcIndex = null;

        config.prompts.forEach((p, i) => {
            const btn = document.createElement('button');
            btn.textContent = p.title;
            btn.setAttribute('draggable', 'true');
            btn.dataset.index = i;

            Object.assign(btn.style, {
                padding: '4px 8px',
                border: `1px solid ${border}`,
                borderRadius: '4px',
                background: bg,
                color: color,
                cursor: 'move',
                fontSize: '12px',
                maxWidth: '80px',
                overflow: 'hidden',
                whiteSpace: 'nowrap',
                textOverflow: 'ellipsis',
                transition: 'all 0.2s ease',
            });

            // 拖动排序
            btn.addEventListener('dragstart', (e) => {
                dragSrcIndex = Number(e.target.dataset.index);
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/plain', dragSrcIndex);
                e.target.style.opacity = '0.5';
            });

            btn.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                btn.classList.add('drag-over');
            });

            btn.addEventListener('dragleave', () => {
                btn.classList.remove('drag-over');
            });

            btn.addEventListener('drop', (e) => {
                e.preventDefault();
                btn.classList.remove('drag-over');

                const targetIndex = Number(e.target.dataset.index);
                if (dragSrcIndex === null || dragSrcIndex === targetIndex) return;

                const moved = config.prompts[dragSrcIndex];
                config.prompts.splice(dragSrcIndex, 1);
                config.prompts.splice(targetIndex, 0, moved);

                saveConfig();
                renderPromptButtons();
            });

            btn.addEventListener('dragend', (e) => {
                e.target.style.opacity = '1';
                dragSrcIndex = null;
            });

            // 插入 prompt 内容（保留换行）
            btn.onclick = (e) => {
                e.preventDefault();
                editor.focus();

                const sel = window.getSelection();
                if (!sel || sel.rangeCount === 0) return;

                const range = sel.getRangeAt(0);
                range.deleteContents();

                const lines = p.content.split('\n');
                const fragment = document.createDocumentFragment();

                lines.forEach((line, idx) => {
                    fragment.appendChild(document.createTextNode(line));
                    if (idx < lines.length - 1) {
                        fragment.appendChild(document.createElement('br'));
                    }
                });

                range.insertNode(fragment);

                sel.removeAllRanges();
                const newRange = document.createRange();
                const lastNode = editor.lastChild;
                newRange.selectNodeContents(lastNode);
                newRange.collapse(false);
                sel.addRange(newRange);

                editor.dispatchEvent(new Event('input', { bubbles: true }));
            };

            // 编辑 / 删除
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

        // 👇 挂载到输入框上方
        form.insertBefore(wrapper, form.firstChild);
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

            if (!gistId) return alert(t.gistIdPlaceholder);

            config.gistId = gistId;
            config.gistToken = token;
            saveConfig();

            uploadPromptsToGist(gistId, token);
        });

        document.getElementById('syncDownload').addEventListener('click', () => {
            const gistId = document.getElementById('gistIdInput').value.trim();
            const token = document.getElementById('gistTokenInput').value.trim();

            if (!gistId) return alert(t.gistIdPlaceholder);

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

        const entries = [
            { text: t.editPrompt, action: () => showPromptEditor(index, prompt) },
            { text: t.deletePrompt, action: () => {
                if (confirm(t.deleteConfirm(prompt.title))) {
                    config.prompts.splice(index, 1);
                    saveConfig();
                    renderPromptButtons();
                }
            }},
            { text: t.promptBulkDeleteTitle, action: () => showBulkDeleteDialog() },
        ];

        entries.forEach(({ text, action }) => {
            const item = document.createElement('div');
            item.textContent = text;
            Object.assign(item.style, {
                padding: '6px 12px',
                cursor: 'pointer',
            });
            item.onmouseover = () => {
                item.style.background = dark ? '#555' : '#eee';
            };
            item.onmouseout = () => {
                item.style.background = 'inherit';
            };

            item.onclick = () => {
                menu.remove();
                action();
            };
            menu.appendChild(item);
        });

        document.body.appendChild(menu);
        setTimeout(() => {
            document.addEventListener('click', () => menu.remove(), { once: true });
        }, 0);
    }

    function showBulkDeleteDialog() {
        const existing = document.getElementById('cgpt-bulk-delete-dialog');
        if (existing) existing.remove();

        const dark = isDarkTheme();
        const popup = document.createElement('div');
        popup.id = 'cgpt-bulk-delete-dialog';

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
            width: '300px',
            maxHeight: '60vh',
            overflowY: 'auto',
            fontFamily: 'sans-serif'
        });

        const title = document.createElement('div');
        title.textContent = t.promptBulkDeleteTitle;
        Object.assign(title.style, {
            fontWeight: 'bold',
            fontSize: '16px',
            marginBottom: '12px',
            textAlign: 'center'
        });

        popup.appendChild(title);

        const checkboxes = [];

        config.prompts.forEach((p, idx) => {
            const row = document.createElement('div');
            row.style.marginBottom = '6px';

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.dataset.index = idx;

            const label = document.createElement('label');
            label.textContent = ` ${p.title}`;
            label.style.cursor = 'pointer';

            row.appendChild(checkbox);
            row.appendChild(label);
            popup.appendChild(row);
            checkboxes.push(checkbox);
        });

        const btnRow = document.createElement('div');
        Object.assign(btnRow.style, {
            marginTop: '12px',
            display: 'flex',
            gap: '8px',
        });

        const cancelBtn = document.createElement('button');
        cancelBtn.textContent = t.cancel;
        Object.assign(cancelBtn.style, {
            flex: '1',
            padding: '6px',
            borderRadius: '4px',
            border: 'none',
            background: '#888',
            color: '#fff',
            cursor: 'pointer',
        });
        cancelBtn.onclick = () => popup.remove();

        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = t.promptBulkDeleteButton;
        Object.assign(deleteBtn.style, {
            flex: '1',
            padding: '6px',
            borderRadius: '4px',
            border: 'none',
            background: '#d32f2f',
            color: '#fff',
            cursor: 'pointer',
        });
        deleteBtn.onclick = () => {
            const toDelete = checkboxes
            .map((cb, i) => cb.checked ? i : -1)
            .filter(i => i >= 0);

            if (toDelete.length === 0) {
                alert(t.promptBulkDeleteNone); // ✅ 使用国际化提示
                return;
            }

            if (!confirm(t.promptBulkDeleteConfirm(toDelete.length))) return;

            // 倒序删除
            toDelete.reverse().forEach(i => config.prompts.splice(i, 1));

            saveConfig();
            renderPromptButtons();
            popup.remove();
        };

        btnRow.appendChild(cancelBtn);
        btnRow.appendChild(deleteBtn);
        popup.appendChild(btnRow);

        document.body.appendChild(popup);
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
            padding: '0',
            zIndex: 10000,
            boxShadow: '0 2px 12px rgba(0,0,0,0.3)',
            width: '320px',
            minHeight: '200px',
            overflow: 'hidden',
            fontFamily: 'sans-serif'
        });

        // ========== 🟡 拖动条 ==========
        const header = document.createElement('div');
        header.textContent = index !== undefined ? t.editPrompt : t.addPrompt;
        Object.assign(header.style, {
            padding: '10px',
            cursor: 'move',
            fontWeight: 'bold',
            background: dark ? '#444' : '#f0f0f0',
            borderBottom: '1px solid #888',
        });

        popup.appendChild(header);

        // 拖动逻辑
        let isDragging = false, startX, startY;

        header.addEventListener('mousedown', (e) => {
            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;
            const rect = popup.getBoundingClientRect();
            const offsetX = startX - rect.left;
            const offsetY = startY - rect.top;

            const onMouseMove = (e) => {
                if (!isDragging) return;
                const x = e.clientX - offsetX;
                const y = e.clientY - offsetY;
                Object.assign(popup.style, {
                    left: `${x}px`,
                    top: `${y}px`,
                    transform: 'none'
                });
            };

            const onMouseUp = () => {
                isDragging = false;
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
            };

            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        });

        // ========== 🔴 错误提示区 ==========
        const errorText = document.createElement('div');
        Object.assign(errorText.style, {
            color: 'red',
            fontSize: '13px',
            textAlign: 'center',
            margin: '8px 0 12px',
            minHeight: '18px',
        });

        const contentWrap = document.createElement('div');
        Object.assign(contentWrap.style, {
            padding: '12px',
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

        const btnRow = document.createElement('div');
        Object.assign(btnRow.style, {
            display: 'flex',
            justifyContent: 'space-between',
            gap: '8px',
        });

        const saveBtn = document.createElement('button');
        saveBtn.textContent = t.save;
        Object.assign(saveBtn.style, {
            flex: '1',
            padding: '6px',
            border: 'none',
            borderRadius: '4px',
            background: '#4caf50',
            color: '#fff',
            cursor: 'pointer'
        });

        const cancelBtn = document.createElement('button');
        cancelBtn.textContent = t.cancel;
        Object.assign(cancelBtn.style, {
            flex: '1',
            padding: '6px',
            border: 'none',
            borderRadius: '4px',
            background: '#888',
            color: '#fff',
            cursor: 'pointer'
        });

        const closePopup = () => {
            popup.remove();
            document.removeEventListener('keydown', keyHandler);
        };

        cancelBtn.onclick = closePopup;

        saveBtn.onclick = () => {
            const newTitle = title.value.trim();
            const newContent = content.value.trim();

            if (!newTitle || !newContent) {
                errorText.textContent = t.titleEmpty;
                return;
            }
            if (newTitle.length > 10 || newContent.length > 1000) {
                errorText.textContent = t.lengthExceeded;
                return;
            }

            const titleExists = config.prompts.some((p, idx) =>
                                                    p.title === newTitle && idx !== index
                                                   );
            if (titleExists) {
                errorText.textContent = t.duplicateTitle;
                return;
            }

            errorText.textContent = ''; // 清除错误提示

            if (typeof index === 'number') {
                config.prompts[index] = { title: newTitle, content: newContent };
            } else {
                config.prompts.push({ title: newTitle, content: newContent });
            }

            saveConfig();
            renderPromptButtons();
            closePopup();
        };

        const keyHandler = (e) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                closePopup();
            } else if (e.key === 'Enter' && !e.shiftKey && document.activeElement === content) {
                e.preventDefault();
                saveBtn.click();
            }
        };

        document.addEventListener('keydown', keyHandler);

        btnRow.appendChild(cancelBtn);
        btnRow.appendChild(saveBtn);

        contentWrap.appendChild(title);
        contentWrap.appendChild(content);
        contentWrap.appendChild(errorText);
        contentWrap.appendChild(btnRow);

        popup.appendChild(contentWrap);
        document.body.appendChild(popup);
    }




})();
