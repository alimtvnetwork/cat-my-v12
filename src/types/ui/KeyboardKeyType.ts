// Single source of truth for standard keyboard event keys used in the UI.

export class KeyboardKeyType {
  static readonly ArrowUp = "ArrowUp";
  static readonly ArrowDown = "ArrowDown";
  static readonly ArrowLeft = "ArrowLeft";
  static readonly ArrowRight = "ArrowRight";
  static readonly Enter = "Enter";
  static readonly Escape = "Escape";
  static readonly Space = " ";
  static readonly Home = "Home";
  static readonly End = "End";
  static readonly PageUp = "PageUp";
  static readonly PageDown = "PageDown";
  static readonly Tab = "Tab";
  static readonly Backspace = "Backspace";
  static readonly Delete = "Delete";
  static readonly F2 = "F2";
  static readonly E = "e";
  static readonly EUpper = "E";
  static readonly C = "c";
  static readonly CUpper = "C";
  static readonly P = "p";
  static readonly PUpper = "P";
  static readonly G = "g";
  static readonly GUpper = "G";
  static readonly H = "h";
  static readonly HUpper = "H";
  static readonly R = "r";
  static readonly RUpper = "R";
  static readonly A = "a";
  static readonly AUpper = "A";

  static isArrowUp(val: string | null | undefined): boolean {
    return val === this.ArrowUp;
  }
  static isArrowDown(val: string | null | undefined): boolean {
    return val === this.ArrowDown;
  }
  static isArrowLeft(val: string | null | undefined): boolean {
    return val === this.ArrowLeft;
  }
  static isArrowRight(val: string | null | undefined): boolean {
    return val === this.ArrowRight;
  }
  static isEnter(val: string | null | undefined): boolean {
    return val === this.Enter;
  }
  static isEscape(val: string | null | undefined): boolean {
    return val === this.Escape;
  }
  static isSpace(val: string | null | undefined): boolean {
    return val === this.Space;
  }
  static isHome(val: string | null | undefined): boolean {
    return val === this.Home;
  }
  static isEnd(val: string | null | undefined): boolean {
    return val === this.End;
  }
  static isPageUp(val: string | null | undefined): boolean {
    return val === this.PageUp;
  }
  static isPageDown(val: string | null | undefined): boolean {
    return val === this.PageDown;
  }
  static isTab(val: string | null | undefined): boolean {
    return val === this.Tab;
  }
  static isBackspace(val: string | null | undefined): boolean {
    return val === this.Backspace;
  }
  static isDelete(val: string | null | undefined): boolean {
    return val === this.Delete;
  }
  static isF2(val: string | null | undefined): boolean {
    return val === this.F2;
  }
  static isE(val: string | null | undefined): boolean {
    return val === this.E;
  }
  static isEUpper(val: string | null | undefined): boolean {
    return val === this.EUpper;
  }
  static isC(val: string | null | undefined): boolean {
    return val === this.C;
  }
  static isCUpper(val: string | null | undefined): boolean {
    return val === this.CUpper;
  }
  static isP(val: string | null | undefined): boolean {
    return val === this.P;
  }
  static isPUpper(val: string | null | undefined): boolean {
    return val === this.PUpper;
  }
  static isG(val: string | null | undefined): boolean {
    return val === this.G;
  }
  static isGUpper(val: string | null | undefined): boolean {
    return val === this.GUpper;
  }
  static isH(val: string | null | undefined): boolean {
    return val === this.H;
  }
  static isHUpper(val: string | null | undefined): boolean {
    return val === this.HUpper;
  }
  static isR(val: string | null | undefined): boolean {
    return val === this.R;
  }
  static isRUpper(val: string | null | undefined): boolean {
    return val === this.RUpper;
  }
  static isA(val: string | null | undefined): boolean {
    return val === this.A;
  }
  static isAUpper(val: string | null | undefined): boolean {
    return val === this.AUpper;
  }

  // Compound helpers
  static isEnterOrSpace(val: string | null | undefined): boolean {
    return this.isEnter(val) || this.isSpace(val);
  }
  static isArrowUpOrDown(val: string | null | undefined): boolean {
    return this.isArrowUp(val) || this.isArrowDown(val);
  }
  static isArrowLeftOrRight(val: string | null | undefined): boolean {
    return this.isArrowLeft(val) || this.isArrowRight(val);
  }
  static isArrowKey(val: string | null | undefined): boolean {
    return this.isArrowUpOrDown(val) || this.isArrowLeftOrRight(val);
  }
}
