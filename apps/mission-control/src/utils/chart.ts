export function compactNumber(value: number) {

  return Intl.NumberFormat("en", {

    notation: "compact",

    maximumFractionDigits: 1,

  }).format(value);

}

export function currency(value: number) {

  return Intl.NumberFormat("en", {

    style: "currency",

    currency: "USD",

    notation: "compact",

  }).format(value);

}

export function percent(value: number) {

  return `${value.toFixed(1)}%`;

}

export function shortDate(date: string) {

  return new Date(date).toLocaleDateString("en-US", {

    month: "short",

    day: "numeric",

  });

}