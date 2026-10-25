export interface MarketRange {
  lowDollars: number;
  midDollars: number;
  highDollars: number;
}

export interface MarketComparable {
  title: string;
  priceDollars: number;
  miles: number | null;
  source: string;
  link: string;
}

export interface MarketCurvePoint {
  modelYear: number;
  midDollars: number;
}

export interface MarketValue {
  tradeIn: MarketRange;
  retail: MarketRange;
  comparables: MarketComparable[];
  curve: MarketCurvePoint[];
  notes: string;
}
