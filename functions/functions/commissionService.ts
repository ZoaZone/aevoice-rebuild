/**
 * commissionService.ts
 *
 * Core commission calculation logic for agencies and affiliates.
 * All commission calculations are based on NET PROFIT (after LLM and operational costs).
 *
 * @module commissionService
 */

import { logger } from "./lib/infra/logger.js";

/**
 * Affiliate commission tier rates (percentage of NET profit)
 */
export const AFFILIATE_TIERS = {
  bronze: 20,
  silver: 30,
  gold: 40,
  platinum: 50,
} as const;

/**
 * Agency commission tier rates (percentage of NET profit)
 */
export const AGENCY_TIERS = {
  starter: 50,
  growth: 60,
  elite_base: 70,
  elite_byollm_bonus: 5, // Additional bonus when using BYOLLM
} as const;

/**
 * Plan types for cost estimation
 */
export const PLAN_TYPES = {
  MINI: ["aeva-mini", "mini"],
  MICRO: ["aeva-micro", "micro"],
  MEDIUM: ["aeva-medium", "medium"],
  MEGA: ["aeva-mega", "mega"],
  ENTERPRISE: ["enterprise"],
} as const;

/**
 * Calculate agency commission based on tier and BYOLLM usage
 *
 * @param {number} grossAmountUsd - Total revenue in USD
 * @param {number} llmCostUsd - LLM API costs in USD
 * @param {number} otherCostsUsd - Other operational costs in USD
 * @param {string} tier - Agency tier (starter, growth, elite)
 * @param {boolean} byollmApplied - Whether agency used their own LLM key
 * @param {boolean} coBrandOptIn - Whether agency opted into co-branding (future use)
 * @returns {Object} Commission calculation details
 */
export function computeAgencyCommission({
  grossAmountUsd,
  llmCostUsd = 0,
  otherCostsUsd = 0,
  tier = "starter",
  byollmApplied = false,
  coBrandOptIn = false,
}: {
  grossAmountUsd: number;
  llmCostUsd?: number;
  otherCostsUsd?: number;
  tier?: string;
  byollmApplied?: boolean;
  coBrandOptIn?: boolean;
}): {
  netProfitUsd: number;
  commissionRate: number;
  commissionAmountUsd: number;
  coBrandBonus: number;
  byollmApplied: boolean;
} {
  // Calculate net profit
  const netProfitUsd = grossAmountUsd - llmCostUsd - otherCostsUsd;

  if (netProfitUsd <= 0) {
    logger.warn("Agency commission: negative or zero net profit", {
      grossAmountUsd,
      llmCostUsd,
      otherCostsUsd,
      netProfitUsd,
    });

    return {
      netProfitUsd,
      commissionRate: 0,
      commissionAmountUsd: 0,
      coBrandBonus: 0,
      byollmApplied,
    };
  }

  // Determine base commission rate from tier
  let commissionRate = AGENCY_TIERS.starter;

  if (tier === "growth") {
    commissionRate = AGENCY_TIERS.growth;
  } else if (tier === "elite") {
    commissionRate = AGENCY_TIERS.elite_base;

    // Add BYOLLM bonus for elite tier
    if (byollmApplied) {
      commissionRate += AGENCY_TIERS.elite_byollm_bonus;
    }
  }

  // Co-branding bonus (reserved for future enhancement)
  const coBrandBonus = 0;

  // Calculate commission amount
  const commissionAmountUsd = (netProfitUsd * commissionRate) / 100;

  logger.info("Agency commission calculated", {
    grossAmountUsd,
    llmCostUsd,
    otherCostsUsd,
    netProfitUsd,
    tier,
    byollmApplied,
    commissionRate,
    commissionAmountUsd,
  });

  return {
    netProfitUsd,
    commissionRate,
    commissionAmountUsd,
    coBrandBonus,
    byollmApplied,
  };
}

/**
 * Calculate affiliate commission based on tier
 *
 * @param {number} grossAmountUsd - Total revenue in USD
 * @param {number} llmCostUsd - LLM API costs in USD
 * @param {number} otherCostsUsd - Other operational costs in USD
 * @param {string} tier - Affiliate tier (bronze, silver, gold, platinum)
 * @param {number} customRate - Custom commission rate (overrides tier)
 * @returns {Object} Commission calculation details
 */
export function computeAffiliateCommission({
  grossAmountUsd,
  llmCostUsd = 0,
  otherCostsUsd = 0,
  tier = "bronze",
  customRate = null,
}: {
  grossAmountUsd: number;
  llmCostUsd?: number;
  otherCostsUsd?: number;
  tier?: string;
  customRate?: number | null;
}): {
  netProfitUsd: number;
  commissionRate: number;
  commissionAmountUsd: number;
} {
  // Calculate net profit
  const netProfitUsd = grossAmountUsd - llmCostUsd - otherCostsUsd;

  if (netProfitUsd <= 0) {
    logger.warn("Affiliate commission: negative or zero net profit", {
      grossAmountUsd,
      llmCostUsd,
      otherCostsUsd,
      netProfitUsd,
    });

    return {
      netProfitUsd,
      commissionRate: 0,
      commissionAmountUsd: 0,
    };
  }

  // Determine commission rate
  let commissionRate = customRate !== null ? customRate : AFFILIATE_TIERS.bronze;

  if (customRate === null) {
    if (tier === "silver") {
      commissionRate = AFFILIATE_TIERS.silver;
    } else if (tier === "gold") {
      commissionRate = AFFILIATE_TIERS.gold;
    } else if (tier === "platinum") {
      commissionRate = AFFILIATE_TIERS.platinum;
    }
  }

  // Calculate commission amount
  const commissionAmountUsd = (netProfitUsd * commissionRate) / 100;

  logger.info("Affiliate commission calculated", {
    grossAmountUsd,
    llmCostUsd,
    otherCostsUsd,
    netProfitUsd,
    tier,
    customRate,
    commissionRate,
    commissionAmountUsd,
  });

  return {
    netProfitUsd,
    commissionRate,
    commissionAmountUsd,
  };
}

/**
 * Estimate costs for a given plan (used for real-time splitting estimation)
 *
 * @param {string} planType - Plan type identifier
 * @param {number} grossAmountUsd - Gross amount in USD
 * @returns {Object} Estimated costs
 */
export function estimateCosts(
  planType: string,
  grossAmountUsd: number,
): {
  llmCostUsd: number;
  otherCostsUsd: number;
} {
  // Conservative cost estimates based on plan type
  // These are rough estimates; actual costs tracked via usage
  let llmCostPercentage = 15; // Default 15% of revenue
  let otherCostsPercentage = 10; // Default 10% for Twilio, infrastructure, etc.

  const planLower = planType.toLowerCase();

  // Check if plan matches known types
  const isMiniOrMicro = PLAN_TYPES.MINI.some((p) => planLower === p.toLowerCase()) ||
    PLAN_TYPES.MICRO.some((p) => planLower === p.toLowerCase());
  const isMegaOrEnterprise = PLAN_TYPES.MEGA.some((p) => planLower === p.toLowerCase()) ||
    PLAN_TYPES.ENTERPRISE.some((p) => planLower === p.toLowerCase());

  if (isMiniOrMicro) {
    llmCostPercentage = 20; // Smaller plans have higher relative costs
    otherCostsPercentage = 15;
  } else if (isMegaOrEnterprise) {
    llmCostPercentage = 10; // Larger plans have economies of scale
    otherCostsPercentage = 8;
  }

  return {
    llmCostUsd: (grossAmountUsd * llmCostPercentage) / 100,
    otherCostsUsd: (grossAmountUsd * otherCostsPercentage) / 100,
  };
}
