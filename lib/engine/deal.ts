import { FINANCING } from "@/config/financing";
import type { Cents } from "@/types";
import { monthlyPaymentCents } from "@/lib/engine/finance";

export interface DealInput {
  priceCents: Cents;
  tradeInCents: Cents;
  /** Remaining loan balance or lease payoff. Zero when the car is owned. */
  payoffCents: Cents;
  cashDownCents: Cents;
  apr?: number;
  termMonths?: number;
  taxRate?: number;
  allowTradeInTaxCredit?: boolean;
  feesCents?: number;
  currentPaymentCents: Cents;
}

export interface DealResult {
  taxableCents: Cents;
  /** Example sales tax. It varies by state and is not a Toyota figure. */
  taxCents: Cents;
  feesCents: Cents;
  equityCents: Cents;
  negativeEquity: boolean;
  amountFinancedCents: Cents;
  paymentCents: Cents;
  paymentDeltaCents: Cents;
  /** Payments across the full term, plus cash down. */
  totalCostCents: Cents;
  apr: number;
  termMonths: number;
  taxRate: number;
}

/**
 * New-vehicle worksheet. Negative equity is reported on its own line and is
 * also part of the amount financed, because the payoff has to be settled.
 */
export function priceDeal(input: DealInput): DealResult {
  const apr = input.apr ?? FINANCING.exampleApr;
  const termMonths = input.termMonths ?? FINANCING.exampleTermMonths;
  const taxRate = input.taxRate ?? FINANCING.salesTaxRate;
  const allowCredit = input.allowTradeInTaxCredit ?? FINANCING.allowTradeInTaxCredit;
  const feesCents = input.feesCents ?? FINANCING.titleFeesCents;
  const equityCents = input.tradeInCents - input.payoffCents;
  const taxableCents = allowCredit
    ? Math.max(0, input.priceCents - input.tradeInCents)
    : input.priceCents;
  const taxCents = Math.round(taxableCents * taxRate);
  const amountFinancedCents = Math.max(
    0,
    input.priceCents + taxCents + feesCents - input.tradeInCents + input.payoffCents - input.cashDownCents,
  );
  const paymentCents = monthlyPaymentCents(amountFinancedCents, apr, termMonths);
  return {
    taxableCents,
    taxCents,
    feesCents,
    equityCents,
    negativeEquity: equityCents < 0,
    amountFinancedCents,
    paymentCents,
    paymentDeltaCents: paymentCents - input.currentPaymentCents,
    totalCostCents: paymentCents * termMonths + input.cashDownCents,
    apr,
    termMonths,
    taxRate,
  };
}
