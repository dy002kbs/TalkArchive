declare module "kuroshiro" {
  interface ConvertOptions {
    to: "hiragana" | "katakana" | "romaji";
    mode?: "normal" | "spaced" | "okurigana" | "furigana";
  }

  class Kuroshiro {
    init(analyzer: unknown): Promise<void>;
    convert(text: string, options: ConvertOptions): Promise<string>;
  }

  export default Kuroshiro;
}

declare module "kuroshiro-analyzer-kuromoji" {
  class KuromojiAnalyzer {
    constructor(options?: { dictPath?: string });
  }
  export default KuromojiAnalyzer;
}
