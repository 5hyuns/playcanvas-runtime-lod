// lod-debug-ui.js
//
// On-screen debug panel for lodScript: shows the active level, triangle count and
// camera distance, and lets you force a level, toggle wireframe or tint by level.
//
// Requires: lod.js (the `lodScript` script) on this entity or on `target`.

var LodDebugUi = pc.createScript('lodDebugUI');

LodDebugUi.attributes.add('lodScript', {
    type: 'entity',
    title: 'LOD Entity',
    description: 'Entity with lodScript (uses this entity if empty)'
});

// Panel text colours and overlay material colours per level: LOD0..LOD4
LodDebugUi.CSS_COLORS = ['#4ade80', '#facc15', '#fb923c', '#f87171', '#a855f7'];
LodDebugUi.TINT_COLORS = [
    [0.2, 0.8, 0.2],
    [0.8, 0.8, 0.2],
    [0.8, 0.5, 0.2],
    [0.8, 0.2, 0.2],
    [0.5, 0.2, 0.5]
];

// Level colours are reserved for "which LOD is active"; everything else in the panel is neutral.
// Layout: top-right on desktop, bottom-center with a compact grid and larger touch targets on
// phones in portrait.
LodDebugUi.CSS = [
    '.lod-debug {',
    '  --bg: rgba(17, 18, 23, 0.92); --line: rgba(255, 255, 255, 0.09);',
    '  --fill: rgba(255, 255, 255, 0.06); --fill-hover: rgba(255, 255, 255, 0.11); --fill-on: rgba(255, 255, 255, 0.16);',
    '  --text: #f3f4f6; --muted: #9ca3af; --ink: #111318; --focus: #93c5fd; --control: 28px;',
    '  position: fixed; top: 12px; right: 12px; z-index: 10000; width: 232px; box-sizing: border-box;',
    '  padding: 12px; border: 1px solid var(--line); border-radius: 10px;',
    '  background: var(--bg); color: var(--text); box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);',
    '  font: 500 12px/1.4 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;',
    '  user-select: none; -webkit-user-select: none; touch-action: manipulation; -webkit-tap-highlight-color: transparent;',
    '}',
    '.lod-debug * { box-sizing: border-box; }',
    '.lod-debug-title { margin: 0 0 10px; font-size: 13px; font-weight: 600; letter-spacing: 0.01em; }',

    '.lod-debug-stats { display: grid; gap: 4px; margin: 0 0 12px; padding-bottom: 12px; border-bottom: 1px solid var(--line); }',
    '.lod-debug-stat { display: flex; justify-content: space-between; align-items: baseline; gap: 12px; }',
    '.lod-debug-label { color: var(--muted); }',
    '.lod-debug-value { font-weight: 600; font-variant-numeric: tabular-nums; }',

    '.lod-debug-row { display: flex; gap: 4px; margin-bottom: 8px; }',
    '.lod-debug button {',
    '  flex: 1; min-width: 0; height: var(--control); padding: 0; border: 0; border-radius: 6px;',
    '  background: var(--fill); color: var(--text); font: inherit; font-variant-numeric: tabular-nums; cursor: pointer;',
    '  transition: background-color 150ms ease-out, color 150ms ease-out, opacity 150ms ease-out;',
    '}',
    '.lod-debug button:hover:not(:disabled) { background: var(--fill-hover); }',
    '.lod-debug button:focus-visible, .lod-debug input:focus-visible { outline: 2px solid var(--focus); outline-offset: 2px; }',

    // Auto / Manual segmented control
    '.lod-debug-mode { padding: 2px; border-radius: 8px; background: var(--fill); gap: 2px; }',
    '.lod-debug-mode button { background: transparent; color: var(--muted); }',
    '.lod-debug-mode button[aria-pressed="true"] { background: var(--fill-on); color: var(--text); font-weight: 600; }',

    // Level buttons: the current one carries its level colour, also while disabled in Auto mode
    '.lod-debug-levels { margin-bottom: 12px; }',
    '.lod-debug-levels button[aria-pressed="true"] { background: var(--lod-color); color: var(--ink); font-weight: 700; }',
    '.lod-debug-levels button:disabled { cursor: default; }',
    '.lod-debug-levels button:disabled:not([aria-pressed="true"]) { opacity: 0.4; }',

    '.lod-debug-toggles { display: grid; gap: 6px; }',
    '.lod-debug-toggle { display: flex; align-items: center; gap: 8px; cursor: pointer; }',
    '.lod-debug-toggle input {',
    '  appearance: none; -webkit-appearance: none; flex: none; width: 14px; height: 14px; margin: 0;',
    '  border: 1.5px solid rgba(255, 255, 255, 0.4); border-radius: 4px; cursor: pointer;',
    '  transition: background-color 150ms ease-out, border-color 150ms ease-out;',
    '}',
    '.lod-debug-toggle input:checked {',
    '  border-color: var(--text); background: var(--text) no-repeat center / 10px 10px',
    '  url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 10 10\'%3E%3Cpath d=\'M2 5.2 4.1 7.3 8 3\' fill=\'none\' stroke=\'%23111318\' stroke-width=\'1.6\' stroke-linecap=\'round\' stroke-linejoin=\'round\'/%3E%3C/svg%3E");',
    '}',

    '@media (max-width: 600px), (pointer: coarse) and (orientation: portrait) {',
    '  .lod-debug {',
    '    --control: 40px; top: auto; right: auto; left: 50%; transform: translateX(-50%);',
    '    bottom: calc(12px + env(safe-area-inset-bottom, 0px)); width: min(360px, calc(100vw - 24px));',
    '    font-size: 13px;',
    '  }',
    '  .lod-debug-title { display: none; }',
    '  .lod-debug-stats { grid-template-columns: repeat(3, 1fr); gap: 8px; }',
    '  .lod-debug-stat { flex-direction: column; align-items: flex-start; gap: 0; }',
    '  .lod-debug-label { font-size: 11px; }',
    '  .lod-debug-levels { margin-bottom: 10px; }',
    '  .lod-debug-toggles { grid-template-columns: 1fr 1fr; }',
    '  .lod-debug-toggle { min-height: 32px; }',
    '}',

    '@media (prefers-reduced-motion: reduce) { .lod-debug *, .lod-debug { transition: none !important; } }'
].join('\n');

LodDebugUi.injectStyles = function () {
    if (document.getElementById('lod-debug-ui-style')) return;

    var style = document.createElement('style');
    style.id = 'lod-debug-ui-style';
    style.textContent = LodDebugUi.CSS;
    document.head.appendChild(style);
};



LodDebugUi.prototype.initialize = function () {
    var target = this.lodScript || this.entity;

    this._lod = target.script && target.script.lodScript;
    this._render = target.render;

    if (!this._lod) {
        console.warn('lodDebugUI: no lodScript found on "' + target.name + '"');
        return;
    }

    this._manual = false;
    this._wireframe = false;
    this._tint = false;
    this._lastLevel = -1;
    this._originalMaterials = new Map();
    this._tintMaterials = LodDebugUi.TINT_COLORS.map(function (rgb) {
        var material = new pc.StandardMaterial();
        material.diffuse = new pc.Color(rgb[0], rgb[1], rgb[2]);
        material.update();
        return material;
    });

    this._buildPanel();

    this.on('destroy', this._onDestroy, this);
};

LodDebugUi.prototype.update = function (dt) {
    if (!this._lod) return;

    var level = this._lod.getCurrentLOD();

    this._levelText.textContent = 'LOD' + level + ' (of ' + this._lod.lodCount + ')';
    this._levelText.style.color = this._cssColor(level);
    this._triangleText.textContent = this._lod.getCurrentTriangleCount().toLocaleString();
    this._distanceText.textContent = this._lod.getCameraDistance().toFixed(1) + 'm';

    if (level !== this._lastLevel) {
        this._lastLevel = level;
        this._refreshLevelButtons();
        if (this._tint) this._applyTint(level);
    }
};

LodDebugUi.prototype._onDestroy = function () {
    this._setWireframe(false);
    this._setTint(false);

    if (this._panel && this._panel.parentNode) {
        this._panel.parentNode.removeChild(this._panel);
    }

    this._tintMaterials.forEach(function (material) {
        material.destroy();
    });
};


// ---------------------------------------------------------------------------
// Panel
// ---------------------------------------------------------------------------

LodDebugUi.prototype._buildPanel = function () {
    var self = this;

    LodDebugUi.injectStyles();

    var panel = this._panel = this._el('section', 'lod-debug');
    panel.setAttribute('aria-label', 'LOD debug');

    this._el('h2', 'lod-debug-title', panel).textContent = 'LOD Debug';

    var stats = this._el('div', 'lod-debug-stats', panel);
    this._levelText = this._stat(stats, 'Level');
    this._triangleText = this._stat(stats, 'Triangles');
    this._distanceText = this._stat(stats, 'Distance');

    // Auto / Manual
    var modeRow = this._el('div', 'lod-debug-row lod-debug-mode', panel);
    modeRow.setAttribute('role', 'group');
    modeRow.setAttribute('aria-label', 'Switching mode');
    this._autoButton = this._button(modeRow, 'Auto', function () { self._setManual(false); });
    this._manualButton = this._button(modeRow, 'Manual', function () { self._setManual(true); });

    // Level buttons: 0 .. lodCount
    var levelRow = this._el('div', 'lod-debug-row lod-debug-levels', panel);
    levelRow.setAttribute('role', 'group');
    levelRow.setAttribute('aria-label', 'LOD level');
    this._levelButtons = [];
    for (var i = 0; i <= this._lod.lodCount; i++) {
        var button = this._button(levelRow, String(i), this._onLevelButton.bind(this, i));
        button.setAttribute('aria-label', 'LOD' + i);
        button.style.setProperty('--lod-color', this._cssColor(i));
        this._levelButtons.push(button);
    }

    var toggles = this._el('div', 'lod-debug-toggles', panel);
    this._checkbox(toggles, 'Wireframe', function (checked) { self._setWireframe(checked); });
    this._checkbox(toggles, 'Color by LOD', function (checked) { self._setTint(checked); });

    document.body.appendChild(panel);

    this._refreshModeButtons();
    this._refreshLevelButtons();
};

LodDebugUi.prototype._el = function (tag, className, parent) {
    var el = document.createElement(tag);
    if (className) el.className = className;
    if (parent) parent.appendChild(el);
    return el;
};

// Returns the value element so it can be updated every frame.
LodDebugUi.prototype._stat = function (parent, label) {
    var stat = this._el('div', 'lod-debug-stat', parent);
    this._el('span', 'lod-debug-label', stat).textContent = label;

    var value = this._el('span', 'lod-debug-value', stat);
    value.textContent = '–';
    return value;
};

LodDebugUi.prototype._button = function (parent, text, onClick) {
    var button = this._el('button', null, parent);
    button.type = 'button';
    button.textContent = text;
    button.addEventListener('click', onClick);
    return button;
};

LodDebugUi.prototype._checkbox = function (parent, text, onChange) {
    var label = this._el('label', 'lod-debug-toggle', parent);

    var input = this._el('input', null, label);
    input.type = 'checkbox';
    input.addEventListener('change', function () { onChange(input.checked); });

    label.appendChild(document.createTextNode(text));
};

LodDebugUi.prototype._cssColor = function (level) {
    var colors = LodDebugUi.CSS_COLORS;
    return colors[Math.min(level, colors.length - 1)];
};

LodDebugUi.prototype._refreshModeButtons = function () {
    this._autoButton.setAttribute('aria-pressed', String(!this._manual));
    this._manualButton.setAttribute('aria-pressed', String(this._manual));
};

// In Auto mode the level buttons are a read-out: disabled, with the active level highlighted.
LodDebugUi.prototype._refreshLevelButtons = function () {
    var current = this._lod.getCurrentLOD();

    for (var i = 0; i < this._levelButtons.length; i++) {
        var button = this._levelButtons[i];
        button.setAttribute('aria-pressed', String(i === current));
        button.disabled = !this._manual;
        button.title = this._manual ? '' : 'Switch to Manual to pick a level';
    }
};


// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

LodDebugUi.prototype._setManual = function (manual) {
    this._manual = manual;
    this._lod.setManualMode(manual);
    this._refreshModeButtons();
    this._refreshLevelButtons();
};

LodDebugUi.prototype._onLevelButton = function (level) {
    if (!this._manual) return;
    this._lod.setLODLevel(level);
};

LodDebugUi.prototype._setWireframe = function (enabled) {
    this._wireframe = enabled;
    if (!this._render) return;

    var style = enabled ? pc.RENDERSTYLE_WIREFRAME : pc.RENDERSTYLE_SOLID;
    this._render.meshInstances.forEach(function (meshInstance) {
        meshInstance.renderStyle = style;
    });
};

LodDebugUi.prototype._setTint = function (enabled) {
    if (!this._render || enabled === this._tint) return;
    this._tint = enabled;

    if (enabled) {
        var originals = this._originalMaterials;
        this._render.meshInstances.forEach(function (meshInstance) {
            originals.set(meshInstance, meshInstance.material);
        });
        this._applyTint(this._lod.getCurrentLOD());
    } else {
        this._originalMaterials.forEach(function (material, meshInstance) {
            meshInstance.material = material;
        });
        this._originalMaterials.clear();
    }
};

LodDebugUi.prototype._applyTint = function (level) {
    var material = this._tintMaterials[Math.min(level, this._tintMaterials.length - 1)];
    this._render.meshInstances.forEach(function (meshInstance) {
        meshInstance.material = material;
    });
};
