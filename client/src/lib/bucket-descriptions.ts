/**
 * Descriptions for exit distribution buckets
 */

export const BUCKET_DESCRIPTIONS: Record<string, string> = {
  "Total Loss":
    "Complete write-off. Company fails and returns 0x your invested capital. Typical for companies that run out of runway before achieving product-market fit.",
  "Low Return":
    "Modest returns (0.1x-1x). Company survives but doesn't scale significantly. May include acqui-hires or small strategic exits that return some but not all capital.",
  "Mid Return":
    "Solid returns (1x-5x). Company achieves meaningful traction and exits via acquisition or modest IPO. These help preserve capital and generate steady returns.",
  "High Return":
    "Strong returns (5x-20x). Company scales successfully with strong product-market fit. Represents your 'winners' that drive meaningful fund performance.",
  Outlier:
    "Exceptional returns (20x-100x+). Rare breakout companies that achieve massive scale. The 'fund returners' that define top-tier VC performance. Historically ~1-2% of investments.",
};
