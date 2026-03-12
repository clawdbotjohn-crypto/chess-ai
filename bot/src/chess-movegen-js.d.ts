declare module 'chess-movegen-js' {
  export interface CMMove {
    from: number;
    to: number;
    captured: number;
    movingpiece: number;
    promotedpiece: number;
  }

  export class Board {
    pieceat: number[];
    stm: number;
    moves: CMMove[];
    inCheck: boolean;
    castlingRights: number;
    enpassantSquare: number;
    kingsquares: number[];
    loadFEN(fen: string): void;
    generateMoves(): void;
    makemove(move: CMMove): void;
    undomove(): void;
  }

  const mod: { Board: typeof Board };
  export default mod;
}
