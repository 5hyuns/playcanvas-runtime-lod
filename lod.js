// lod.js
//
// Runtime LOD (Level of Detail) for PlayCanvas.
//
// On initialize, simplified index buffers are generated from the entity's render
// meshes with meshoptimizer, then swapped every frame based on camera distance.
// Vertex buffers are shared between all levels; only the index buffer changes.
//
// Requires: meshopt-simplifier.js (defines the global `MeshoptSimplifier`).
// It must be loaded before this script (Settings > Scripts Loading Order).
//
// Note: meshes are swapped in place, so entities sharing the same render asset
// also share the active LOD level.

var LodScript = pc.createScript('lodScript');

LodScript.attributes.add('lodCount', {
    type: 'number', default: 3, min: 1, max: 4, precision: 0,
    title: 'LOD Levels',
    description: 'Number of LOD levels to generate (1-4)'
});

LodScript.attributes.add('distance1', { type: 'number', default: 10, min: 0, title: 'LOD1 Distance', description: 'Distance to switch to LOD1' });
LodScript.attributes.add('distance2', { type: 'number', default: 25, min: 0, title: 'LOD2 Distance', description: 'Distance to switch to LOD2' });
LodScript.attributes.add('distance3', { type: 'number', default: 50, min: 0, title: 'LOD3 Distance', description: 'Distance to switch to LOD3' });
LodScript.attributes.add('distance4', { type: 'number', default: 100, min: 0, title: 'LOD4 Distance', description: 'Distance to switch to LOD4' });

LodScript.attributes.add('ratio1', { type: 'number', default: 0.5, min: 0.01, max: 1, title: 'LOD1 Ratio', description: 'Triangle ratio for LOD1 (0.5 = 50%)' });
LodScript.attributes.add('ratio2', { type: 'number', default: 0.25, min: 0.01, max: 1, title: 'LOD2 Ratio', description: 'Triangle ratio for LOD2' });
LodScript.attributes.add('ratio3', { type: 'number', default: 0.1, min: 0.01, max: 1, title: 'LOD3 Ratio', description: 'Triangle ratio for LOD3' });
LodScript.attributes.add('ratio4', { type: 'number', default: 0.05, min: 0.01, max: 1, title: 'LOD4 Ratio', description: 'Triangle ratio for LOD4' });

LodScript.attributes.add('targetError', {
    type: 'number', default: 0.01, min: 0, max: 1,
    title: 'Target Error',
    description: 'Maximum simplification error relative to mesh size (0.01 = 1%)'
});

LodScript.attributes.add('autoGenerate', {
    type: 'boolean', default: true,
    title: 'Auto Generate',
    description: 'Generate LOD meshes on initialize'
});

LodScript.attributes.add('cameraEntity', {
    type: 'entity',
    title: 'Camera',
    description: 'Camera for distance calculation (first camera in scene if empty)'
});

LodScript.attributes.add('debug', {
    type: 'boolean', default: false,
    title: 'Debug',
    description: 'Log LOD info to the console'
});


// ---------------------------------------------------------------------------
// meshoptimizer loading (shared by every lodScript instance)
// ---------------------------------------------------------------------------

LodScript._simplifierPromise = null;

// Resolves with the MeshoptSimplifier module, or null if it is unavailable.
LodScript.loadSimplifier = function () {
    if (LodScript._simplifierPromise) return LodScript._simplifierPromise;

    var simplifier = window.MeshoptSimplifier;

    if (!simplifier) {
        console.error('lodScript: MeshoptSimplifier not found. Add meshopt-simplifier.js and load it before lod.js.');
        LodScript._simplifierPromise = Promise.resolve(null);
    } else if (!simplifier.supported) {
        console.warn('lodScript: WebAssembly is not supported, LOD disabled.');
        LodScript._simplifierPromise = Promise.resolve(null);
    } else {
        LodScript._simplifierPromise = simplifier.ready.then(function () {
            return simplifier;
        });
    }

    return LodScript._simplifierPromise;
};


// ---------------------------------------------------------------------------
// Lifecycle
// ---------------------------------------------------------------------------

LodScript.prototype.initialize = function () {
    this._lods = [];            // one entry per mesh instance, see _buildMeshLods
    this._currentLod = 0;
    this._ready = false;
    this._destroyed = false;
    this._generating = false;
    this._manualMode = false;
    this._camera = null;

    this._distances = [];
    this._ratios = [];
    this._entityPos = new pc.Vec3();

    if (!this.entity.render) {
        console.warn('lodScript: entity "' + this.entity.name + '" has no render component.');
        return;
    }

    this._cacheSettings();
    this._findCamera();

    this.on('attr', this._cacheSettings, this);
    this.on('attr:cameraEntity', this._findCamera, this);
    this.on('destroy', this._onDestroy, this);

    if (this.autoGenerate) {
        this.generate();
    }
};

LodScript.prototype.update = function (dt) {
    if (!this._ready || this._manualMode) return;

    var distance = this.getCameraDistance();
    var level = this._levelForDistance(distance);

    if (level !== this._currentLod) {
        this._applyLevel(level);

        if (this.debug) {
            console.log('lodScript: ' + this.entity.name + ' -> LOD' + level + ' (distance ' + distance.toFixed(1) + ')');
        }
    }
};

LodScript.prototype._onDestroy = function () {
    this._destroyed = true;
    this._release();
};


// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

// Generates LOD index buffers for every mesh instance on the entity.
// Returns a promise that resolves once the LODs are ready.
LodScript.prototype.generate = function () {
    if (this._generating) return Promise.resolve();
    this._generating = true;

    var self = this;

    return LodScript.loadSimplifier().then(function (simplifier) {
        self._generating = false;

        // script may have been destroyed while meshoptimizer was loading
        if (!simplifier || self._destroyed || !self.entity.render || self.entity.render.meshInstances.length === 0) return;

        self._release();

        var meshInstances = self.entity.render.meshInstances;
        for (var i = 0; i < meshInstances.length; i++) {
            var lod = self._buildMeshLods(simplifier, meshInstances[i].mesh);
            if (lod) self._lods.push(lod);
        }

        self._ready = self._lods.length > 0;

        if (self.debug) {
            console.log('lodScript: ' + self.entity.name + ' - generated LODs for ' + self._lods.length + ' mesh instance(s)');
        }
    });
};

// Forces a specific LOD level (0 = original mesh). Usually combined with setManualMode(true).
LodScript.prototype.setLODLevel = function (level) {
    level = pc.math.clamp(level, 0, this.lodCount);
    if (level !== this._currentLod) {
        this._applyLevel(level);
    }
};

LodScript.prototype.getCurrentLOD = function () {
    return this._currentLod;
};

LodScript.prototype.getCurrentTriangleCount = function () {
    var total = 0;
    for (var i = 0; i < this._lods.length; i++) {
        total += this._lods[i].triangleCounts[this._currentLod] || 0;
    }
    return total;
};

LodScript.prototype.getCameraDistance = function () {
    if (!this._camera) return 0;

    this._entityPos.copy(this.entity.getPosition());
    return this._entityPos.distance(this._camera.getPosition());
};

// Disables distance based switching so setLODLevel() sticks.
LodScript.prototype.setManualMode = function (enabled) {
    this._manualMode = enabled;

    if (this.debug) {
        console.log('lodScript: manual mode ' + (enabled ? 'on' : 'off'));
    }
};

LodScript.prototype.isManualMode = function () {
    return this._manualMode;
};


// ---------------------------------------------------------------------------
// Internals
// ---------------------------------------------------------------------------

LodScript.prototype._cacheSettings = function () {
    this._distances = [this.distance1, this.distance2, this.distance3, this.distance4];
    this._ratios = [this.ratio1, this.ratio2, this.ratio3, this.ratio4];
};

LodScript.prototype._findCamera = function () {
    this._camera = this.cameraEntity;

    if (!this._camera) {
        var cameras = this.app.root.findComponents('camera');
        this._camera = cameras.length > 0 ? cameras[0].entity : null;
    }

    if (!this._camera && this.debug) {
        console.warn('lodScript: no camera found');
    }
};

LodScript.prototype._levelForDistance = function (distance) {
    for (var i = 0; i < this.lodCount; i++) {
        if (distance < this._distances[i]) return i;
    }
    return this.lodCount;
};

// Simplifies a single mesh and returns its LOD record, or null if the mesh can't be used.
LodScript.prototype._buildMeshLods = function (simplifier, mesh) {
    var positions = [];
    var indices = [];

    var vertexCount = mesh.getPositions(positions);
    mesh.getIndices(indices);

    if (vertexCount === 0 || indices.length === 0 || indices.length % 3 !== 0) {
        if (this.debug) console.warn('lodScript: skipping mesh without indexed triangle data');
        return null;
    }

    var positions32 = new Float32Array(positions);
    var indices32 = new Uint32Array(indices);
    var originalTriangles = indices32.length / 3;

    var lod = {
        mesh: mesh,
        originalIndexBuffer: mesh.indexBuffer[0],
        originalIndexCount: mesh.primitive[0].count,
        indexBuffers: [],
        indexCounts: [],
        triangleCounts: [originalTriangles]     // [LOD0, LOD1, ...]
    };

    if (this.debug) {
        console.log('lodScript: ' + this.entity.name + ' LOD0 - ' + originalTriangles + ' triangles');
    }

    var device = this.app.graphicsDevice;

    for (var i = 0; i < this.lodCount; i++) {
        var ratio = this._ratios[i];
        var targetCount = Math.max(3, Math.floor(indices32.length * ratio / 3) * 3);

        var simplified;
        try {
            simplified = simplifier.simplify(indices32, positions32, 3, targetCount, this.targetError)[0];
        } catch (err) {
            console.error('lodScript: simplification failed for LOD' + (i + 1), err);
            break;
        }

        lod.indexBuffers.push(this._createIndexBuffer(device, simplified, vertexCount));
        lod.indexCounts.push(simplified.length);
        lod.triangleCounts.push(simplified.length / 3);

        if (this.debug) {
            console.log('lodScript: ' + this.entity.name + ' LOD' + (i + 1) + ' - ' + (simplified.length / 3) +
                ' triangles (target ' + Math.round(ratio * 100) + '%)');
        }
    }

    return lod;
};

// The index format depends on the highest vertex index, not on the number of indices.
LodScript.prototype._createIndexBuffer = function (device, indices, vertexCount) {
    var data = vertexCount > 0xffff ? indices : new Uint16Array(indices);
    var format = vertexCount > 0xffff ? pc.INDEXFORMAT_UINT32 : pc.INDEXFORMAT_UINT16;

    return new pc.IndexBuffer(device, format, data.length, pc.BUFFER_STATIC, data);
};

LodScript.prototype._applyLevel = function (level) {
    for (var i = 0; i < this._lods.length; i++) {
        var lod = this._lods[i];

        if (level === 0 || lod.indexBuffers.length === 0) {
            this._setIndexBuffer(lod.mesh, lod.originalIndexBuffer, lod.originalIndexCount);
        } else {
            var n = Math.min(level, lod.indexBuffers.length) - 1;
            this._setIndexBuffer(lod.mesh, lod.indexBuffers[n], lod.indexCounts[n]);
        }
    }

    this._currentLod = level;
};

LodScript.prototype._setIndexBuffer = function (mesh, indexBuffer, count) {
    mesh.indexBuffer[0] = indexBuffer;
    mesh.primitive[0].count = count;
};

// Restores the original index buffers and frees the generated ones.
LodScript.prototype._release = function () {
    for (var i = 0; i < this._lods.length; i++) {
        var lod = this._lods[i];
        this._setIndexBuffer(lod.mesh, lod.originalIndexBuffer, lod.originalIndexCount);

        for (var j = 0; j < lod.indexBuffers.length; j++) {
            lod.indexBuffers[j].destroy();
        }
    }

    this._lods = [];
    this._currentLod = 0;
    this._ready = false;
};
