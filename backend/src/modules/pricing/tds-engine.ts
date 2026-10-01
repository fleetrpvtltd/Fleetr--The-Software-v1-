export interface TdsInput {
  transactionAmount: number;
  annualCumulativeAmount: number;
  transporterPan: string | null;
  transporterEntityType: 'INDIVIDUAL' | 'HUF' | 'CORPORATE' | 'PARTNERSHIP' | 'LLP';
  carriageCount: number;
  hasForm15GH: boolean;
  form15GHValidUntil?: Date;
}

export interface TdsResult {
  applicable: boolean;
  tdsRate: number;  // 0, 1, 2, or 20
  tdsAmount: number;
  applicableSection: string;  // '194C' or '206AB' or 'EXEMPT'
  reason: string;
  warnings: string[];
}

/**
 * Validates a given PAN string.
 */
export function validatePAN(pan: string): boolean {
  return /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(pan);
}

/**
 * Calculates TDS based on inputs according to section 194C and 206AB.
 */
export function calculateTDS(input: TdsInput): TdsResult {
  const warnings: string[] = [];
  
  if (input.transactionAmount <= 30000 && input.annualCumulativeAmount <= 100000) {
    return {
      applicable: false,
      tdsRate: 0,
      tdsAmount: 0,
      applicableSection: 'EXEMPT',
      reason: 'Below threshold limits',
      warnings
    };
  }

  if (!input.transporterPan || !validatePAN(input.transporterPan)) {
    warnings.push('Invalid or missing PAN. Higher TDS rate applies.');
    return {
      applicable: true,
      tdsRate: 20,
      tdsAmount: input.transactionAmount * 0.20,
      applicableSection: '206AB',
      reason: 'PAN not provided or invalid',
      warnings
    };
  }

  const isFormValid = input.hasForm15GH && input.form15GHValidUntil && (input.form15GHValidUntil > new Date());
  
  if (input.carriageCount <= 10 && isFormValid) {
    return {
      applicable: false,
      tdsRate: 0,
      tdsAmount: 0,
      applicableSection: '194C(6)',
      reason: 'Exempt under 194C(6) - Up to 10 carriages and Form 15G/H provided',
      warnings
    };
  }

  let tdsRate = 2; // Default for Corporate, Partnership, LLP
  if (input.transporterEntityType === 'INDIVIDUAL' || input.transporterEntityType === 'HUF') {
    tdsRate = 1;
  }

  return {
    applicable: true,
    tdsRate,
    tdsAmount: (input.transactionAmount * tdsRate) / 100,
    applicableSection: '194C',
    reason: `Standard rate for ${input.transporterEntityType}`,
    warnings
  };
}
