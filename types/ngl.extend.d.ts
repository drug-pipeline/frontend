// /types/ngl.extend.d.ts
export {};

declare global {
  namespace NGL {
    interface Stage {
      /** 화면을 다시 그리도록 Stage에 요청 */
      requestRender(): void;
      /** 이미 쓰고 있는 다른 메서드들도 명시해두면 좋습니다 */
      autoView(duration?: number): void;
      handleResize(): void;
      dispose(): void;
      removeAllComponents?(): void;
    }

    interface StructureComponent {
      addRepresentation(type: string, params?: Record<string, unknown>): NGL.Representation;
      autoView?(ms?: number): void;
      // Secondary 패널에서 사용 중인 structure API를 명확히
      structure: {
        eachResidue(cb: (res: NGL.ResidueProxy) => void): void;
      };
    }
  }
}
