# VC Follow-on Investment Research

## Key Data Points from Carta & Market Research

### Valuation Step-Ups (Q2 2024 - Q2 2025)

**Seed to Series A:**
- Median step-up: **2.8x** (Q2 2024, Carta)
- Recent trend: **2.5x** (current estimate, LinkedIn post by Peter Walker)
- AI startups may see higher multiples vs non-AI

**Seed Valuations:**
- Q2 2024: $14.8M median (Carta)
- Q1 2025: $16M median (Carta) - 18% YoY increase
- Range: $14M - $16M

**Series A Valuations:**
- Q2 2025: $47.9M median (Carta) - new high, 20% YoY increase
- Q1 2025: ~$45M median for primary rounds
- Implied from seed: $14.8M × 2.8x = $41.4M (consistent with range)

**Series A to Series B:**
- Historical step-up: **2.8x** (from academic source citing Carta 2024)
- Later rounds: **~1.6x** to Series C

### Pro-Rata Participation Behavior

**Key Insights:**
- Pro-rata rights give investors the **right, not obligation** to maintain ownership
- VCs selectively exercise pro-rata based on company performance
- "One or two companies in a fund will drive most of the returns" - pro-rata rights critical for winners
- Successful reserve strategy requires identifying top companies AND putting substantial reserves into them

**Typical Reserve Strategy:**
- VCs don't deploy reserves uniformly
- Focus reserves on **winners** (companies raising follow-on rounds at higher valuations)
- Failed companies don't consume reserves (no follow-on rounds to participate in)

### Capital Deployment Norms

**Fund Deployment Targets:**
- 70-75% deployment is typical target (Goodwin Terms Database)
- Over 80% of funds have this target range
- Under-deployment (<60%) indicates inability to deploy capital
- Over-deployment (>200%) would require recycling or over-commitment

### Follow-on Round Success Rates

**Implied from Market Data:**
- Not all seed companies raise Series A
- Not all Series A companies raise Series B
- Only **successful** companies that achieve milestones raise follow-on rounds
- VCs exercise pro-rata selectively based on performance signals

## Modeling Recommendations

### 1. Success-Based Follow-on Deployment
- Link follow-on deployment to company outcome
- Only companies with positive exits (>1x) should trigger follow-on opportunities
- Higher-performing companies more likely to raise follow-on rounds

### 2. Valuation Step-Up Parameters
- **Seed → Series A:** 2.5x - 3.0x valuation increase
- **Series A → Series B:** 2.0x - 3.0x valuation increase
- Use these to calculate pro-rata check sizes

### 3. Pro-Rata Calculation
- Initial ownership % = Check Size / Post-Money Valuation
- Follow-on check to maintain ownership = Initial % × (New Round Size)
- New Round Size typically 20-30% dilution event

### 4. Selective Participation
- Model pro-rata participation probability based on company performance
- High performers (>10x): 80-100% pro-rata participation
- Medium performers (3-10x): 40-60% pro-rata participation  
- Low performers (1-3x): 10-20% pro-rata participation
- Failures (<1x): 0% pro-rata participation

### 5. Reserve Ratio Interpretation
- Reserve ratio should represent % of initial check set aside for follow-on
- Actual deployment depends on company success
- Example: 50% reserve ratio on $2M check = $1M available, but only deployed if company succeeds

## Implementation Approach

1. **Add valuation step-up parameters** to simulation inputs
2. **Model follow-on rounds** as discrete events tied to company success
3. **Calculate pro-rata check sizes** based on ownership maintenance math
4. **Apply selective participation** based on performance thresholds
5. **Track actual reserve deployment** vs available reserves
6. **Report deployment metrics** to validate realism (should be 70-90% for healthy portfolios)
