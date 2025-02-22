import { BigNumber } from "bignumber.js";
import { Observable, of } from "rxjs";
import { getAccountUnit } from "../../account";
import { formatCurrencyUnit } from "../../currencies";
import { getEnv } from "../../env";
import {
  SwapExchangeRateAmountTooHigh,
  SwapExchangeRateAmountTooLow,
} from "../../errors";
import type {
  CheckQuote,
  Exchange,
  ExchangeRate,
  GetMultipleStatus,
  GetProviders,
  KYCStatus,
  PostSwapAccepted,
  PostSwapCancelled,
  SwapRequestEvent,
  ValidKYCStatus,
} from "./types";
import type { Transaction } from "../../generated/types";
import type {
  CryptoCurrency,
  TokenCurrency,
} from "@ledgerhq/types-cryptoassets";

export const getMockExchangeRate = ({
  provider = "ftx",
  tradeMethod = "fixed",
}: {
  provider?: string;
  tradeMethod?: "fixed" | "float";
} = {}): ExchangeRate => ({
  rate: new BigNumber("1"),
  toAmount: new BigNumber("12"),
  magnitudeAwareRate: new BigNumber(1)
    .div(new BigNumber(10).pow(18))
    .times(new BigNumber(10).pow(8)),
  rateId: "mockedRateId",
  provider,
  providerType: "CEX",
  tradeMethod,
});

export const mockGetExchangeRates = async (
  exchange: Exchange,
  transaction: Transaction,
  currencyTo?: TokenCurrency | CryptoCurrency | undefined | null
): Promise<(ExchangeRate & { expirationDate?: Date })[]> => {
  const { fromAccount, toAccount } = exchange;
  const amount = transaction.amount;
  const unitFrom = getAccountUnit(fromAccount);
  const unitTo =
    (currencyTo && currencyTo.units[0]) ?? getAccountUnit(toAccount);
  const tenPowMagnitude = new BigNumber(10).pow(unitFrom.magnitude);
  const amountFrom = amount.div(tenPowMagnitude);
  const minAmountFrom = new BigNumber(0.0001);
  const maxAmountFrom = new BigNumber(1000);

  if (amountFrom.lte(minAmountFrom)) {
    throw new SwapExchangeRateAmountTooLow(undefined, {
      minAmountFromFormatted: formatCurrencyUnit(
        unitFrom,
        new BigNumber(minAmountFrom).times(tenPowMagnitude),
        {
          alwaysShowSign: false,
          disableRounding: true,
          showCode: true,
        }
      ),
    });
  }

  if (amountFrom.gte(maxAmountFrom)) {
    throw new SwapExchangeRateAmountTooHigh(undefined, {
      maxAmountFromFormatted: formatCurrencyUnit(
        unitFrom,
        new BigNumber(maxAmountFrom).times(tenPowMagnitude),
        {
          alwaysShowSign: false,
          disableRounding: true,
          showCode: true,
        }
      ),
    });
  }

  //Fake delay to show loading UI
  await new Promise((r) => setTimeout(r, 800));
  const magnitudeAwareRate = new BigNumber(1)
    .div(new BigNumber(10).pow(unitFrom.magnitude))
    .times(new BigNumber(10).pow(unitTo.magnitude));
  //Mock OK, not really magnitude aware
  return [
    {
      rate: new BigNumber("1"),
      toAmount: amount.times(magnitudeAwareRate),
      magnitudeAwareRate,
      rateId: "mockedRateId1",
      provider: "changelly",
      providerType: "CEX",
      expirationDate: new Date(),
      tradeMethod: "fixed",
    },
    {
      rate: new BigNumber("1.1"),
      toAmount: amount.times(magnitudeAwareRate),
      magnitudeAwareRate,
      rateId: "mockedRateId2",
      provider: "changelly",
      providerType: "CEX",
      expirationDate: new Date(),
      tradeMethod: "float",
    },
    {
      rate: new BigNumber("0.9"),
      toAmount: amount.times(magnitudeAwareRate),
      magnitudeAwareRate,
      rateId: "mockedRateId3",
      provider: "cic",
      providerType: "CEX",
      expirationDate: new Date(),
      tradeMethod: "float",
    },
    {
      rate: new BigNumber("0.95"),
      toAmount: amount.times(magnitudeAwareRate),
      magnitudeAwareRate,
      rateId: "mockedRateId4",
      provider: "oneinch",
      providerType: "DEX",
      expirationDate: new Date(),
      tradeMethod: "float",
    },
  ];
};

export const mockInitSwap = (
  exchange: Exchange,
  exchangeRate: ExchangeRate,
  transaction: Transaction
): Observable<SwapRequestEvent> => {
  return of({
    type: "init-swap-result",
    initSwapResult: {
      transaction,
      swapId: "mockedSwapId",
    },
  });
};

// Need to understand how and why this gets used
export const mockGetProviders: GetProviders = async () => {
  //Fake delay to show loading UI
  await new Promise((r) => setTimeout(r, 800));

  return [
    {
      provider: "changelly",
      pairs: [
        { from: "bitcoin", to: "ethereum", tradeMethod: "float" },
        { from: "bitcoin", to: "ethereum", tradeMethod: "fixed" },
        { from: "bitcoin", to: "dogecoin", tradeMethod: "float" },
        { from: "bitcoin", to: "dogecoin", tradeMethod: "fixed" },
        { from: "ethereum", to: "bitcoin", tradeMethod: "float" },
        { from: "ethereum", to: "bitcoin", tradeMethod: "fixed" },
      ],
    },
    {
      provider: "cic",
      pairs: [
        { from: "bitcoin", to: "ethereum", tradeMethod: "float" },
        { from: "bitcoin", to: "ethereum", tradeMethod: "fixed" },
        { from: "ethereum", to: "bitcoin", tradeMethod: "float" },
        { from: "ethereum", to: "bitcoin", tradeMethod: "fixed" },
      ],
    },
  ];
};

// Providers using V5 schema. For some reason it doesn't work though (still requires V4)
// return {
//   currencies: {
//     7: "ethereum/erc20/usd_tether__erc20_",
//     8: "bitcoin",
//     149: "ethereum",
//   },
//   providers: {
//     changelly: [
//       {
//         methods: ["fixed", "float"],
//         pairs: {
//           7: [8, 149],
//           8: [7, 149],
//           149: [7, 8],
//         },
//       },
//     ],
//     cic: [
//       {
//         methods: ["fixed", "float"],
//         pairs: {
//           7: [8, 149],
//           8: [7, 149],
//           149: [7, 8],
//         },
//       },
//     ],
//     oneinch: [
//       {
//         methods: ["float"],
//         pairs: {
//           7: [149],
//           149: [7],
//         },
//       },
//     ],
//     paraswap: [
//       {
//         methods: ["float"],
//         pairs: {
//           7: [149],
//           149: [7],
//         },
//       },
//     ],
//   },
// };

export const mockGetStatus: GetMultipleStatus = async (statusList) => {
  //Fake delay to show loading UI
  await new Promise((r) => setTimeout(r, 800));
  return statusList.map((s) => ({ ...s, status: "finished" }));
};

export const mockGetKYCStatus = async (
  id: string,
  status: ValidKYCStatus
): Promise<KYCStatus> => {
  //Fake delay to show the pending state in the UI
  await new Promise((r) => setTimeout(r, 2000));
  return { id, status };
};

const mockedCheckQuoteStatusCode = getEnv("MOCK_SWAP_CHECK_QUOTE");

export const mockCheckQuote: CheckQuote = async ({
  provider: _provider,
  quoteId: _quoteId,
  bearerToken: _bearerToken,
}) => {
  //Fake delay to show the pending state in the UI
  await new Promise((r) => setTimeout(r, 2000));

  switch (mockedCheckQuoteStatusCode) {
    case "RATE_VALID":
      return { codeName: mockedCheckQuoteStatusCode };

    case "KYC_FAILED":
      return {
        codeName: mockedCheckQuoteStatusCode,
        error: "KYC Failed",
        description: "The KYC verification failed",
      };

    case "KYC_PENDING":
      return {
        codeName: mockedCheckQuoteStatusCode,
        error: "KYC Pending",
        description: "The KYC is pending",
      };

    case "KYC_UNDEFINED":
      return {
        codeName: mockedCheckQuoteStatusCode,
        error: "KYC undifined",
        description: "The KYC is undifined",
      };

    case "KYC_UPGRADE_REQUIRED":
      return {
        codeName: mockedCheckQuoteStatusCode,
        error: "KYC upgrade requierd",
        description: "Need to upgrade KYC level",
      };

    case "MFA_REQUIRED":
      return {
        codeName: mockedCheckQuoteStatusCode,
        error: "MFA requierd",
        description: "Need to enable MFA",
      };

    case "OVER_TRADE_LIMIT":
      return {
        codeName: mockedCheckQuoteStatusCode,
        error: "Trade over the limit",
        description: "You have reached your trade limit",
      };

    case "UNKNOW_USER":
      return {
        codeName: mockedCheckQuoteStatusCode,
        error: "Unknown user",
        description: "Provided bearerToken does not match any known user",
      };

    case "RATE_NOT_FOUND":
      return {
        codeName: mockedCheckQuoteStatusCode,
        error: "Rate not found",
        description: "Rate not found",
      };

    case "WITHDRAWALS_BLOCKED":
      return {
        codeName: mockedCheckQuoteStatusCode,
        error: "Withdrawals blocked",
        description: "Withdrawals blocked",
      };

    default:
      return {
        codeName: "UNKNOWN_ERROR",
        error: "Unknown error",
        description: "Something unexpected happened",
      };
  }
};

export const mockPostSwapAccepted: PostSwapAccepted = async ({
  /* eslint-disable @typescript-eslint/no-unused-vars */
  provider,
  swapId,
  transactionId,
  /* eslint-enable */
}) => {
  //Fake delay to simulate network
  await new Promise((r) => setTimeout(r, 800));

  return null;
};

export const mockPostSwapCancelled: PostSwapCancelled = async ({
  /* eslint-disable @typescript-eslint/no-unused-vars */
  provider,
  swapId,
  /* eslint-enable */
}) => {
  //Fake delay to simulate network
  await new Promise((r) => setTimeout(r, 800));

  return null;
};
