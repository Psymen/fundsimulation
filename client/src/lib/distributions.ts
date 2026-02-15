/**
 * Statistical distribution sampling functions for realistic VC return modeling
 *
 * Key insight: VC returns follow power law distributions, not uniform.
 * Within exit buckets, returns should cluster near the lower end with
 * exponentially decreasing probability toward higher multiples.
 */

/**
 * Box-Muller transform: generates standard normal random variable
 */
function boxMullerNormal(): number {
  const u1 = Math.random();
  const u2 = Math.random();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

/**
 * Sample from a uniform distribution (baseline)
 */
export function uniformRandom(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

/**
 * Sample from a log-normal distribution within [min, max]
 * The mode (most likely value) is near the lower end of the range
 *
 * @param min - Minimum value
 * @param max - Maximum value
 * @param skew - Controls right-skewness (0.5 = moderate, 1.0 = heavy)
 */
export function logNormalSample(min: number, max: number, skew: number = 0.7): number {
  if (min >= max) return min;
  if (min === 0 && max === 0) return 0;

  // Map to [0, 1] range, apply log-normal, map back
  const range = max - min;

  // Parameters: mode near 20% of range for right-skewed distribution
  const mu = Math.log(0.2 * range + 0.01);
  const sigma = skew;

  // Generate log-normal sample
  const z = boxMullerNormal();
  let sample = Math.exp(mu + sigma * z);

  // Rejection sampling: resample if outside bounds (up to 20 attempts)
  let attempts = 0;
  while ((sample < 0 || sample > range) && attempts < 20) {
    const z2 = boxMullerNormal();
    sample = Math.exp(mu + sigma * z2);
    attempts++;
  }

  // Clamp as fallback
  sample = Math.max(0, Math.min(range, sample));

  return min + sample;
}

/**
 * Sample from a Pareto (power law) distribution
 * Used specifically for outlier returns where extreme outcomes
 * are possible but exponentially rarer
 *
 * P(X > x) = (xMin/x)^alpha
 *
 * @param xMin - Minimum value (scale parameter)
 * @param alpha - Shape parameter (tail index). Lower = fatter tail
 *   - alpha ~1.5: very fat tail (more extreme outliers)
 *   - alpha ~2.0: typical VC returns
 *   - alpha ~2.5: thinner tail (less extreme)
 * @param xMax - Maximum value (cap)
 */
export function paretoSample(xMin: number, alpha: number, xMax: number): number {
  const u = Math.random();
  const sample = xMin / Math.pow(u, 1 / alpha);
  return Math.min(sample, xMax);
}

/**
 * Sample a return multiple within a bucket using realistic distributions
 *
 * For most buckets: log-normal (right-skewed, mode near minimum)
 * For outlier bucket: Pareto (power law tail)
 *
 * @param minMultiple - Bucket minimum return multiple
 * @param maxMultiple - Bucket maximum return multiple
 * @param isOutlier - Whether this is the outlier/home-run bucket
 */
export function sampleReturnMultiple(
  minMultiple: number,
  maxMultiple: number,
  isOutlier: boolean = false
): number {
  // Total loss bucket
  if (minMultiple === 0 && maxMultiple === 0) {
    return 0;
  }

  // Very narrow range - just use uniform
  if (maxMultiple - minMultiple < 0.5) {
    return uniformRandom(minMultiple, maxMultiple);
  }

  if (isOutlier) {
    // Outlier bucket: use Pareto distribution
    // alpha ~2.0 means E[X] = 2*xMin for unbounded case
    return paretoSample(minMultiple, 2.0, maxMultiple);
  }

  // Standard buckets: use log-normal
  return logNormalSample(minMultiple, maxMultiple, 0.7);
}

/**
 * Sample exit year based on outcome and stage
 *
 * Empirical patterns:
 * - Failed companies exit earlier (acqui-hire, wind-down): 3-6 years
 * - Moderate successes via M&A: 5-8 years
 * - Big winners via IPO: 7-11 years
 * - Seed investments take longer than Series A
 *
 * @param returnMultiple - Company's return multiple
 * @param stage - Investment stage
 * @param exitWindowMin - Earliest possible exit year
 * @param exitWindowMax - Latest possible exit year (fund life)
 */
export function sampleExitYear(
  returnMultiple: number,
  stage: "seed" | "seriesA",
  exitWindowMin: number,
  exitWindowMax: number
): number {
  // Stage bias: seed companies take ~1 year longer
  const stageBias = stage === "seed" ? 1.0 : 0;

  let meanDelay: number;
  let stdDelay: number;

  if (returnMultiple === 0) {
    // Total loss: wind-down in 3-6 years
    meanDelay = 4.5 + stageBias * 0.5;
    stdDelay = 1.2;
  } else if (returnMultiple < 1) {
    // Partial loss / break-even: slow M&A exit
    meanDelay = 5.5 + stageBias * 0.5;
    stdDelay = 1.3;
  } else if (returnMultiple < 5) {
    // Moderate success: strategic M&A
    meanDelay = 6.0 + stageBias * 0.7;
    stdDelay = 1.2;
  } else if (returnMultiple < 20) {
    // Strong exit: late M&A or small IPO
    meanDelay = 7.0 + stageBias * 0.8;
    stdDelay = 1.5;
  } else {
    // Outlier: IPO or mega acquisition, needs time to scale
    meanDelay = 8.5 + stageBias;
    stdDelay = 1.8;
  }

  // Sample from log-normal (always positive)
  const mu = Math.log(meanDelay) - 0.5 * Math.log(1 + (stdDelay / meanDelay) ** 2);
  const sigma = Math.sqrt(Math.log(1 + (stdDelay / meanDelay) ** 2));

  const z = boxMullerNormal();
  let exitYear = Math.exp(mu + sigma * z);

  // Clamp to valid exit window
  exitYear = Math.max(exitWindowMin, Math.min(exitWindowMax + 2, exitYear));

  return exitYear;
}
