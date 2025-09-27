// /types/ngl.d.ts
export {}; // 유지 (모듈화 OK)

declare global {
  namespace NGL {
    // ===== 공통 타입 =====
    type ParamBag = Record<string, unknown>;

    interface StageParams {
      backgroundColor?: string;
    }

    interface LoadFileOptions {
      defaultRepresentation?: boolean;
      ext?: string;
      [k: string]: unknown;
    }

    interface Representation {
      dispose(): void;
      setParameters(params: ParamBag): void;
    }

    interface ResidueProxy {
      index: number;
      resno: number;
      resname: string;
      chainname: string;
      isProtein(): boolean;
      isNucleic(): boolean;
      isHelix(): boolean;
      isSheet(): boolean;
    }

    interface Structure {
      residueCount: number;
      getResidueProxy(): ResidueProxy;
      eachResidue(cb: (r: ResidueProxy) => void): void;
    }

    interface StructureComponent {
      structure: Structure;
      addRepresentation(type: string, params?: ParamBag): Representation;
      addTrajectory(trajPath: string): void;
      autoView(ms?: number): void;
    }

    class Stage {
      constructor(el?: HTMLElement | string, params?: StageParams);
      compList: StructureComponent[];
      handleResize(): void;
      loadFile(path: string, opts?: LoadFileOptions): Promise<StructureComponent>;
      loadScript(path: string): Promise<void>;
      autoView(ms?: number): void;
      dispose(): void;
      removeAllComponents(): void;
      toggleSpin(): void;
      toggleFullscreen(): void;
      setParameters(params: ParamBag): void;
      makeImage(params: {
        factor?: number;
        antialias?: boolean;
        trim?: boolean;
        transparent?: boolean;
        [k: string]: unknown;
      }): Promise<Blob>;
    }

    interface StageWidgetOptions {
      root?: HTMLElement;
      getBounds?: () => DOMRect;
    }
    function StageWidget(stage: Stage, opts?: StageWidgetOptions): void;

    const DatasourceRegistry: {
      add(name: string, ds: unknown): void;
    };

    class StaticDatasource {
      constructor(rootUrl: string);
    }

    class MdsrvDatasource {
      constructor(rootUrl: string);
    }

    function setListingDatasource(ds: unknown): void;
    function setTrajectoryDatasource(ds: unknown): void;

    function getQuery(key: string): string | null;

    let cssDirectory: string | undefined;
    let documentationUrl: string | undefined;
    let examplesListUrl: string | undefined;
    let examplesScriptUrl: string | undefined;

    function download(blob: Blob, filename: string): void;
  }

  interface Window {
    NGL?: typeof NGL;
    __nglGuiReady?: boolean;
  }
}
