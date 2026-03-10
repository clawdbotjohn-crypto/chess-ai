/**
 * Type declarations for chess-movegen-js
 * Only what search.ts and evaluate.ts need.
 */
declare module 'chess-movegen-js' {
  export interface CMMove {
    from: number;
    to: number;
    promotedpiece: number;
    movingpiece: number;
    captured: number;
    mask: number;
  }

  export class Board {
    stm: number;           // 0=white, 1=black
    inCheck: boolean;
    moves: CMMove[];
    pieceat: Uint8Array;   // length 128, 0x88 indexed
    kingsquares: Int8Array; // [0]=white king, [1]=black king (0x88)
    castlingRights: number; // bitmask: K=1, Q=2, k=4, q=8
    enpassantSquare: number; // 0x88 square or -1

    constructor();
    loadFEN(fen: string): void;
    generateMoves(): void;
    makemove(move: CMMove): void;
    undomove(): void;
    getFEN(): string;
  }

  const _default: { Board: typeof Board };
  export default _default;
}
