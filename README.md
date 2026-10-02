# playcanvas-runtime-lod

PlayCanvas용 런타임 LOD(Level of Detail) 스크립트입니다.
게임이 시작될 때 [meshoptimizer](https://github.com/zeux/meshoptimizer)로 메쉬를 단순화해 LOD 단계를 자동으로 만들고,
카메라 거리에 따라 단계를 바꿔 줍니다. 별도의 빌드 과정 없이 PlayCanvas Editor에 파일을 올리기만 하면 됩니다.

| 파일 | 스크립트 이름 | 역할 |
|------|---------------|------|
| `lod.js` | `lodScript` | LOD 생성 + 카메라 거리 기반 전환 |
| `lod-debug-ui.js` | `lodDebugUI` | (선택) 화면 디버그 패널 |
| `meshopt-simplifier.js` | – | meshoptimizer 단순화기 (전역 `MeshoptSimplifier`, 서드파티 코드) |

## 설치

1. 세 파일을 Editor에 업로드합니다.
2. **Settings > Scripts Loading Order**에서 `meshopt-simplifier.js`를 `lod.js`보다 먼저 두세요.
3. render 컴포넌트가 있는 엔티티에 `lodScript`를 추가합니다. 디버깅이 필요하면 `lodDebugUI`도 추가합니다.

## 속성 (`lodScript`)

| 속성 | 설명 | 기본값 |
|------|------|--------|
| LOD Levels | 생성할 LOD 단계 수 (1-4) | 3 |
| LOD1~4 Distance | 해당 LOD로 전환되는 거리 | 10 / 25 / 50 / 100 |
| LOD1~4 Ratio | 원본 대비 삼각형 비율 | 0.5 / 0.25 / 0.1 / 0.05 |
| Target Error | 허용 단순화 오차 (메쉬 크기 대비) | 0.01 |
| Auto Generate | initialize 시 자동 생성 | true |
| Camera | 거리 기준 카메라 (비우면 씬의 첫 카메라) | – |
| Debug | 콘솔 로그 | false |

## 코드에서 사용

```js
const lod = entity.script.lodScript;

lod.setManualMode(true);     // 거리 기반 자동 전환 끄기
lod.setLODLevel(2);          // LOD2 강제
lod.getCurrentLOD();         // 현재 단계
lod.getCurrentTriangleCount();
lod.getCameraDistance();

lod.generate().then(() => { /* autoGenerate가 false일 때 수동 생성 */ });
```

## 디버그 패널 (`lodDebugUI`)

현재 LOD 단계, 삼각형 수, 카메라 거리를 화면에 보여 줍니다.
Manual 모드에서는 숫자 버튼으로 단계를 직접 고를 수 있고, 와이어프레임 보기와 단계별 색상 표시를 켤 수 있습니다.

## 동작 방식

- 버텍스 버퍼는 그대로 두고 인덱스 버퍼만 단계별로 만들어 `mesh.indexBuffer[0]`를 교체합니다.
- 스크립트가 제거되면(`destroy` 이벤트) 원본 인덱스 버퍼로 되돌리고 생성한 버퍼를 해제합니다.
- 메쉬를 직접 바꾸기 때문에, 같은 render 에셋을 공유하는 엔티티는 LOD 단계도 함께 공유합니다.

## Credits

### meshoptimizer — MIT License

메쉬 단순화는 **Arseny Kapoulkine**의 [meshoptimizer](https://github.com/zeux/meshoptimizer)
(npm 패키지 v1.0.1)로 처리합니다.
`meshopt-simplifier.js`는 meshoptimizer의 `js/meshopt_simplifier.js` 파일을 그대로 복사한 것입니다.
PlayCanvas 클래식 스크립트로 불러올 수 있도록 마지막 `export` 한 줄만 지웠고, 원본 저작권 표기는 파일에 그대로 남아 있습니다.
라이선스 전문은 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)에 있습니다.

### "Frank" 3D model — CC BY-NC-SA 4.0

이 스크립트들을 개발하고 테스트한 PlayCanvas 프로젝트에서 아래 모델을 사용했습니다.
모델 파일은 이 저장소에 **포함되어 있지 않습니다**.

> ["Frank"](https://sketchfab.com/3d-models/frank-0eb1f1757349489eab05a0f03cff5b46)
> by [misterdevious](https://sketchfab.com/misterdevious)
> is licensed under [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/).

이 모델은 작성자를 표기해야 하고, 비상업적으로만 쓸 수 있으며, 수정본도 같은 라이선스로 공유해야 합니다.
