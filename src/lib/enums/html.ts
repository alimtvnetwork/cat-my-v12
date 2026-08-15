export enum HtmlTag {
  Input = "INPUT",
  Textarea = "TEXTAREA",
  Select = "SELECT",
}

export enum HtmlTagType {
  Input = "INPUT",
  Textarea = "TEXTAREA",
  Select = "SELECT",
}

export namespace HtmlTagType {
  export function isInput(val: unknown): val is HtmlTagType.Input {
    return val === HtmlTagType.Input;
  }

  export function isTextarea(val: unknown): val is HtmlTagType.Textarea {
    return val === HtmlTagType.Textarea;
  }

  export function isSelect(val: unknown): val is HtmlTagType.Select {
    return val === HtmlTagType.Select;
  }
}
