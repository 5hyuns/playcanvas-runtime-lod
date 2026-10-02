# Third-Party Notices

This repository includes or relies on the following third-party works.

---

## meshoptimizer

- **Author:** Arseny Kapoulkine
- **Project:** https://github.com/zeux/meshoptimizer
- **Version:** npm package `meshoptimizer` v1.0.1 (WebAssembly built from meshoptimizer 1.0)
- **License:** MIT
- **Included as:** `meshopt-simplifier.js`, a copy of `js/meshopt_simplifier.js`.
  The only change is the removal of the final `export { MeshoptSimplifier };` line so that the
  file can be loaded as a classic (non-module) PlayCanvas script. The original copyright header
  is kept in the file.
- **Used for:** mesh simplification (`MeshoptSimplifier.simplify`) that generates the LOD index buffers in `lod.js`.

Full license text, reproduced from the project's `LICENSE.md`:

```
MIT License

Copyright (c) 2016-2026 Arseny Kapoulkine

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

---

## "Frank" 3D model (model file not included; shown in the demo recording)

- **Title:** Frank
- **Author:** misterdevious - https://sketchfab.com/misterdevious
- **Source:** https://sketchfab.com/3d-models/frank-0eb1f1757349489eab05a0f03cff5b46
- **License:** Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International (CC BY-NC-SA 4.0)
  - https://creativecommons.org/licenses/by-nc-sa/4.0/
- **Used for:** the test/demo model in the PlayCanvas project where these scripts were developed,
  including the hosted live demo at https://playcanv.as/p/06c52602/ (credited in its description).
  The model was not modified as a file; `lod.js` only produces simplified versions of it at runtime.

The model file itself is **not** distributed in this repository.

`docs/lod-switching-demo.gif` is a screen recording of the model rendered with these scripts
(wireframe and per-level tinting, at several LOD levels). As a work showing the model, that
recording is licensed under CC BY-NC-SA 4.0 with the credit below, and is not for commercial use.

If you redistribute the model, this recording, or a
modified version of it, you must credit the author, use it for non-commercial purposes only, and
share it under the same CC BY-NC-SA 4.0 license.

> "Frank" (https://sketchfab.com/3d-models/frank-0eb1f1757349489eab05a0f03cff5b46) by misterdevious
> (https://sketchfab.com/misterdevious) is licensed under CC BY-NC-SA 4.0
> (https://creativecommons.org/licenses/by-nc-sa/4.0/).
