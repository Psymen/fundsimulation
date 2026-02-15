/**
 * Descriptions for exit distribution buckets
 */

export const BUCKET_DESCRIPTIONS: Record<string, string> = {
  "Total Loss":
    "Complete write-off. Company fails and returns 0x your invested capital. Typical for companies that run out of runway before achieving product-market fit.",
  "Partial Loss":
    "Returns 0.1-0.5x invested capital. Company survives briefly but fails to scale — may include acqui-hires, fire sales, or partial asset recovery. Returns some capital but significant loss overall.",
  "Near Break-even":
    "Returns 0.5-1.5x invested capital. Company achieves modest traction but not enough for a strong exit. Small M&A or early wind-down that roughly preserves capital.",
  "Mid Return":
    "Solid returns (1.5-5x). Company achieves meaningful traction and exits via acquisition or modest IPO. These help preserve capital and generate steady returns.",
  "High Return":
    "Strong returns (5-20x). Company scales successfully with strong product-market fit. Represents your 'winners' that drive meaningful fund performance.",
  Outlier:
    "Exceptional returns (20x-150x). Rare breakout companies that achieve massive scale. The 'fund returners' that define top-tier VC performance. Historically ~1-3% of investments.",
};
