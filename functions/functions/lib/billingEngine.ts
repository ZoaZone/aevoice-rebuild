/**
 * billingEngine.ts
 *
 * Core billing logic for AEVOICE platform
 * Implements 25% profit margin pricing: User Cost = (Platform Net Cost) + (25% Profit) + (Tax)
 *
 * @module billingEngine
 */

import { logger } from "./infra/logger.ts";

interface BillingConfig {
  profitMarginPercentage?: number; // Default 25%
  taxPercentage?: number; // Default 0%, varies by region
  currency?: string; // Default USD
}

interface CostBreakdown {
  platformNetCost: number;
  profitAmount: number;
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
}

interface UsageCost {
  twilioWhatsAppCost?: number;
  emailCampaignCost?: number;
  voiceCampaignCost?: number;
  socialMediaCost?: number;
  aiProcessingCost?: number;
  storageost?: number;
  otherCosts?: Record<string, number>;
}

interface BillingResult {
  billingId: string;
  clientId: string;
  period: string;
  breakdown: CostBreakdown;
  usageCosts: UsageCost;
  metadata?: Record<string, unknown>;
}

export class BillingEngine {
  private profitMarginPercentage: number;
  private taxPercentage: number;
  private currency: string;

  constructor(config: BillingConfig = {}) {
    this.profitMarginPercentage = config.profitMarginPercentage ?? 25.0;
    this.taxPercentage = config.taxPercentage ?? 0.0;
    this.currency = config.currency ?? "USD";
  }

  /**
   * Calculate user cost with 25% profit margin
   * Formula: User Cost = (Platform Net Cost) + (25% Profit) + (Tax)
   */
  calculateUserCost(
    platformNetCost: number,
    taxPercentage?: number,
  ): CostBreakdown {
    if (platformNetCost < 0) {
      throw new Error("Platform net cost cannot be negative");
    }

    const effectiveTaxPercentage = taxPercentage ?? this.taxPercentage;

    // Calculate profit amount (25% of net cost)
    const profitAmount = (platformNetCost * this.profitMarginPercentage) / 100;

    // Calculate subtotal
    const subtotal = platformNetCost + profitAmount;

    // Calculate tax amount
    const taxAmount = (subtotal * effectiveTaxPercentage) / 100;

    // Calculate total amount
    const totalAmount = subtotal + taxAmount;

    return {
      platformNetCost: this.roundToTwoDecimals(platformNetCost),
      profitAmount: this.roundToTwoDecimals(profitAmount),
      subtotal: this.roundToTwoDecimals(subtotal),
      taxAmount: this.roundToTwoDecimals(taxAmount),
      totalAmount: this.roundToTwoDecimals(totalAmount),
    };
  }

  /**
   * Calculate Twilio WhatsApp billing with 25% markup
   */
  calculateWhatsAppBilling(
    twilioNetCost: number,
    taxPercentage?: number,
  ): CostBreakdown {
    logger.info("Calculating WhatsApp billing", {
      twilio_net_cost: twilioNetCost,
      profit_margin: this.profitMarginPercentage,
      tax_percentage: taxPercentage ?? this.taxPercentage,
    });

    return this.calculateUserCost(twilioNetCost, taxPercentage);
  }

  /**
   * Calculate Marketing Hub billing with 25% markup
   */
  calculateMarketingHubBilling(
    costs: {
      emailCost?: number;
      whatsAppCost?: number;
      socialMediaCost?: number;
      voiceCost?: number;
    },
    taxPercentage?: number,
  ): {
    breakdown: CostBreakdown;
    costDetails: {
      emailCost: number;
      whatsAppCost: number;
      socialMediaCost: number;
      voiceCost: number;
      totalPlatformCost: number;
    };
  } {
    const emailCost = costs.emailCost ?? 0;
    const whatsAppCost = costs.whatsAppCost ?? 0;
    const socialMediaCost = costs.socialMediaCost ?? 0;
    const voiceCost = costs.voiceCost ?? 0;

    const totalPlatformCost = emailCost + whatsAppCost + socialMediaCost +
      voiceCost;

    logger.info("Calculating Marketing Hub billing", {
      email_cost: emailCost,
      whatsapp_cost: whatsAppCost,
      social_media_cost: socialMediaCost,
      voice_cost: voiceCost,
      total_platform_cost: totalPlatformCost,
      profit_margin: this.profitMarginPercentage,
    });

    const breakdown = this.calculateUserCost(totalPlatformCost, taxPercentage);

    return {
      breakdown,
      costDetails: {
        emailCost: this.roundToTwoDecimals(emailCost),
        whatsAppCost: this.roundToTwoDecimals(whatsAppCost),
        socialMediaCost: this.roundToTwoDecimals(socialMediaCost),
        voiceCost: this.roundToTwoDecimals(voiceCost),
        totalPlatformCost: this.roundToTwoDecimals(totalPlatformCost),
      },
    };
  }

  /**
   * Calculate aggregate usage billing for a period
   */
  calculatePeriodBilling(
    usageCosts: UsageCost,
    taxPercentage?: number,
  ): {
    breakdown: CostBreakdown;
    usageDetails: UsageCost & { totalPlatformCost: number };
  } {
    // Sum all platform costs
    const twilioWhatsAppCost = usageCosts.twilioWhatsAppCost ?? 0;
    const emailCampaignCost = usageCosts.emailCampaignCost ?? 0;
    const voiceCampaignCost = usageCosts.voiceCampaignCost ?? 0;
    const socialMediaCost = usageCosts.socialMediaCost ?? 0;
    const aiProcessingCost = usageCosts.aiProcessingCost ?? 0;
    const storageCost = usageCosts.storageost ?? 0;

    let otherCostsTotal = 0;
    if (usageCosts.otherCosts) {
      otherCostsTotal = Object.values(usageCosts.otherCosts).reduce(
        (sum, cost) => sum + cost,
        0,
      );
    }

    const totalPlatformCost = twilioWhatsAppCost +
      emailCampaignCost +
      voiceCampaignCost +
      socialMediaCost +
      aiProcessingCost +
      storageCost +
      otherCostsTotal;

    logger.info("Calculating period billing", {
      twilio_whatsapp_cost: twilioWhatsAppCost,
      email_campaign_cost: emailCampaignCost,
      voice_campaign_cost: voiceCampaignCost,
      social_media_cost: socialMediaCost,
      ai_processing_cost: aiProcessingCost,
      storage_cost: storageCost,
      other_costs_total: otherCostsTotal,
      total_platform_cost: totalPlatformCost,
      profit_margin: this.profitMarginPercentage,
    });

    const breakdown = this.calculateUserCost(totalPlatformCost, taxPercentage);

    return {
      breakdown,
      usageDetails: {
        ...usageCosts,
        totalPlatformCost: this.roundToTwoDecimals(totalPlatformCost),
      },
    };
  }

  /**
   * Generate billing estimate
   */
  generateBillingEstimate(
    estimatedCosts: UsageCost,
    taxPercentage?: number,
  ): {
    estimate: CostBreakdown;
    usageDetails: UsageCost & { totalPlatformCost: number };
    currency: string;
  } {
    const result = this.calculatePeriodBilling(estimatedCosts, taxPercentage);

    return {
      estimate: result.breakdown,
      usageDetails: result.usageDetails,
      currency: this.currency,
    };
  }

  /**
   * Format amount for display
   */
  formatAmount(amount: number, includeCurrency: boolean = true): string {
    const formatted = this.roundToTwoDecimals(amount).toFixed(2);

    if (includeCurrency) {
      // Simple currency formatting
      switch (this.currency) {
        case "USD":
          return `$${formatted}`;
        case "EUR":
          return `€${formatted}`;
        case "GBP":
          return `£${formatted}`;
        case "INR":
          return `₹${formatted}`;
        default:
          return `${formatted} ${this.currency}`;
      }
    }

    return formatted;
  }

  /**
   * Helper: Round to 2 decimal places
   */
  private roundToTwoDecimals(value: number): number {
    return Math.round(value * 100) / 100;
  }

  /**
   * Validate billing configuration
   */
  static validateConfig(
    config: BillingConfig,
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (config.profitMarginPercentage !== undefined) {
      if (
        config.profitMarginPercentage < 0 || config.profitMarginPercentage > 100
      ) {
        errors.push("Profit margin percentage must be between 0 and 100");
      }
    }

    if (config.taxPercentage !== undefined) {
      if (config.taxPercentage < 0 || config.taxPercentage > 100) {
        errors.push("Tax percentage must be between 0 and 100");
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Get profit margin percentage
   */
  getProfitMarginPercentage(): number {
    return this.profitMarginPercentage;
  }

  /**
   * Get tax percentage
   */
  getTaxPercentage(): number {
    return this.taxPercentage;
  }

  /**
   * Get currency
   */
  getCurrency(): string {
    return this.currency;
  }
}

/**
 * Create default billing engine instance with 25% profit margin
 */
export function createBillingEngine(config?: BillingConfig): BillingEngine {
  return new BillingEngine(config);
}

/**
 * Quick helper for calculating user cost with default settings
 */
export function calculateUserCost(
  platformNetCost: number,
  taxPercentage: number = 0,
): CostBreakdown {
  const engine = createBillingEngine();
  return engine.calculateUserCost(platformNetCost, taxPercentage);
}
