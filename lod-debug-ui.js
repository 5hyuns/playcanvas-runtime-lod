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

LodDebugUi.STYLE = {
    title: 'font-weight:bold; font-size:14px; margin-bottom:10px; padding-bottom:8px; border-bottom:1px solid #444;',
    row: 'display:flex; justify-content:space-between; margin-bottom:4px;',
    separator: 'border-bottom:1px solid #444; margin:10px 0;',
    buttonRow: 'display:flex; gap:6px; margin-bottom:10px;',
    button: 'flex:1; border:1px solid #666; border-radius:4px; background:#333; color:#fff;' +
        'font:inherit; font-size:12px; cursor:pointer;',
    checkbox: 'display:flex; align-items:center; gap:8px; margin-bottom:6px; cursor:pointer;'
};

// Panel placement lives in a stylesheet so it can respond to the screen:
// top-right on desktop, bottom-center with larger touch targets on phones in portrait.
LodDebugUi.CSS =
    '.lod-debug-panel {' +
    '  position:fixed; top:10px; right:10px; z-index:10000; min-width:200px; padding:12px 16px;' +
    '  background:rgba(0,0,0,0.85); color:#fff; border-radius:8px; box-shadow:0 4px 12px rgba(0,0,0,0.3);' +
    '  font:13px Consolas, Monaco, monospace;' +
    '}' +
    '.lod-debug-panel button { padding:6px 0; }' +
    '@media (max-width: 600px), (pointer: coarse) and (orientation: portrait) {' +
    '  .lod-debug-panel {' +
    '    top:auto; right:auto; left:50%; transform:translateX(-50%);' +
    '    bottom:calc(10px + env(safe-area-inset-bottom, 0px));' +
    '    width:min(360px, calc(100vw - 20px)); box-sizing:border-box;' +
    '  }' +
    '  .lod-debug-panel button { padding:10px 0; }' +
    '}';

LodDebugUi.injectStyles = function () {
    if (document.getElementById('lod-debug-ui-style')) return;

    var style = document.createElement('style');
    style.id = 'lod-debug-ui-style';
    style.textContent = LodDebugUi.CSS;
    document.head.appendChild(style);
};

LodDebugUi.ACTIVE_MODE_COLOR = '#4a7c4a';
LodDebugUi.IDLE_COLOR = '#333';


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
    var style = LodDebugUi.STYLE;

    LodDebugUi.injectStyles();

    var panel = this._panel = this._el('div');
    panel.className = 'lod-debug-panel';

    var title = this._el('div', style.title, panel);
    title.textContent = 'LOD Debug';

    this._levelText = this._infoRow(panel, 'Level:');
    this._triangleText = this._infoRow(panel, 'Triangles:');
    this._distanceText = this._infoRow(panel, 'Distance:');

    this._el('div', style.separator, panel);

    // Auto / Manual
    var modeRow = this._el('div', style.buttonRow, panel);
    this._autoButton = this._button(modeRow, 'Auto', function () { self._setManual(false); });
    this._manualButton = this._button(modeRow, 'Manual', function () { self._setManual(true); });

    // Level buttons: 0 .. lodCount
    var levelRow = this._el('div', style.buttonRow, panel);
    this._levelButtons = [];
    for (var i = 0; i <= this._lod.lodCount; i++) {
        this._levelButtons.push(this._button(levelRow, String(i), this._onLevelButton.bind(this, i)));
    }

    this._el('div', style.separator, panel);

    this._checkbox(panel, 'Wireframe', function (checked) { self._setWireframe(checked); });
    this._checkbox(panel, 'Color by LOD', function (checked) { self._setTint(checked); });

    document.body.appendChild(panel);

    this._refreshModeButtons();
    this._refreshLevelButtons();
};

LodDebugUi.prototype._el = function (tag, cssText, parent) {
    var el = document.createElement(tag);
    if (cssText) el.style.cssText = cssText;
    if (parent) parent.appendChild(el);
    return el;
};

// Returns the value span so it can be updated every frame.
LodDebugUi.prototype._infoRow = function (parent, label) {
    var row = this._el('div', LodDebugUi.STYLE.row, parent);

    var labelEl = this._el('span', 'color:#aaa;', row);
    labelEl.textContent = label;

    var valueEl = this._el('span', 'font-weight:bold;', row);
    valueEl.textContent = '---';
    return valueEl;
};

LodDebugUi.prototype._button = function (parent, text, onClick) {
    var button = this._el('button', LodDebugUi.STYLE.button, parent);
    button.textContent = text;
    button.addEventListener('click', onClick);
    return button;
};

LodDebugUi.prototype._checkbox = function (parent, text, onChange) {
    var label = this._el('label', LodDebugUi.STYLE.checkbox, parent);

    var input = this._el('input', 'cursor:pointer;', label);
    input.type = 'checkbox';
    input.addEventListener('change', function () { onChange(input.checked); });

    label.appendChild(document.createTextNode(text));
};

LodDebugUi.prototype._cssColor = function (level) {
    var colors = LodDebugUi.CSS_COLORS;
    return colors[Math.min(level, colors.length - 1)];
};

LodDebugUi.prototype._refreshModeButtons = function () {
    this._autoButton.style.background = this._manual ? LodDebugUi.IDLE_COLOR : LodDebugUi.ACTIVE_MODE_COLOR;
    this._manualButton.style.background = this._manual ? LodDebugUi.ACTIVE_MODE_COLOR : LodDebugUi.IDLE_COLOR;
};

LodDebugUi.prototype._refreshLevelButtons = function () {
    var current = this._lod.getCurrentLOD();

    for (var i = 0; i < this._levelButtons.length; i++) {
        var button = this._levelButtons[i];
        button.style.background = i === current ? this._cssColor(i) : LodDebugUi.IDLE_COLOR;
        button.style.opacity = this._manual ? '1' : '0.5';
        button.style.cursor = this._manual ? 'pointer' : 'default';
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
