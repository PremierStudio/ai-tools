import * as p from "@clack/prompts";

// Brand indigo palette — true color ANSI
const I = {
  100: "\x1b[38;2;224;231;255m",
  300: "\x1b[38;2;165;180;252m",
  400: "\x1b[38;2;129;140;248m",
  500: "\x1b[38;2;99;102;241m",
  600: "\x1b[38;2;79;70;229m",
} as const;

const DIM = "\x1b[2m";
const R = "\x1b[0m";

function shimmer(text: string): string {
  const gradient = [I[600], I[500], I[400], I[300], I[100], I[300], I[400], I[500], I[600]];
  return (
    text
      .split("")
      .map((ch, i) => {
        const ci = Math.round((i / Math.max(text.length - 1, 1)) * (gradient.length - 1));
        return `${gradient[ci] ?? ""}${ch}`;
      })
      .join("") + R
  );
}

export function showBanner(version: string): void {
  p.intro(`${I[400]}◆${R} ${shimmer("plannable")} ${DIM}v${version}${R}`);
}
