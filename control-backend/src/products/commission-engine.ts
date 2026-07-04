export interface EngineInput {
  type: string;          // PERCENT_OF_SALE, PERCENT_OF_MARGIN, FIXED_PER_UNIT, or legacy (PERCENT, FIXED, SPLIT)
  value: number;         // percentage/fixed value (e.g. 50 for 50% or 5 for S/ 5)
  applyTo?: string;      // legacy (SALE or PROFIT)
  isAdditional: boolean; // if true, the calculated commission is added to basePrice
  basePrice: number;     // base product price
  costPrice: number;     // cost price of the product
  minCommission?: number;// minimum commission limit
  maxCommission?: number | null;// maximum commission limit
}

export interface EngineResult {
  commissionUnit: number;
  chargedPriceUnit: number;
}

export class CommissionEngine {
  static calculate(input: EngineInput): EngineResult {
    let normalizedType = input.type;
    const value = input.value;

    // 1. Map legacy types to normalized types
    if (normalizedType === 'PERCENT') {
      if (input.applyTo === 'PROFIT') {
        normalizedType = 'PERCENT_OF_MARGIN';
      } else {
        normalizedType = 'PERCENT_OF_SALE';
      }
    } else if (normalizedType === 'FIXED' || normalizedType === 'SPLIT') {
      normalizedType = 'FIXED_PER_UNIT';
    }

    // 2. Compute base commission amount before limits or adjustments
    let commissionUnit = 0;
    switch (normalizedType) {
      case 'FIXED_PER_UNIT':
        commissionUnit = value;
        break;
      case 'PERCENT_OF_MARGIN':
        const profit = Math.max(0, input.basePrice - input.costPrice);
        const marginFactor = value > 1 ? value / 100 : value;
        commissionUnit = profit * marginFactor;
        break;
      case 'PERCENT_OF_SALE':
        const saleFactor = value > 1 ? value / 100 : value;
        commissionUnit = input.basePrice * saleFactor;
        break;
      default:
        commissionUnit = 0;
    }

    // 3. Apply min/max limits
    const minComm = input.minCommission ?? 0;
    if (commissionUnit < minComm) {
      commissionUnit = minComm;
    }
    if (input.maxCommission !== undefined && input.maxCommission !== null && commissionUnit > input.maxCommission) {
      commissionUnit = input.maxCommission;
    }

    // 4. Calculate final customer charged price
    let chargedPriceUnit = input.basePrice;
    if (input.isAdditional || input.type === 'SPLIT') {
      chargedPriceUnit = input.basePrice + commissionUnit;
    }

    return {
      commissionUnit,
      chargedPriceUnit
    };
  }
}
