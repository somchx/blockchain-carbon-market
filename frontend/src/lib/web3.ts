import { BrowserProvider, Contract, formatUnits } from "ethers";
import { carbonCreditAbi, carbonMarketAbi, erc20Abi, governanceTokenAbi, governorAbi, retireCertificateAbi, riskOracleAbi, tcutSaleAbi } from "./contracts";

type InjectedProvider = {
  request: (args: { method: string; params?: unknown[] | Record<string, unknown> }) => Promise<unknown>;
  on?: (event: string, handler: (...args: unknown[]) => void) => void;
  removeListener?: (event: string, handler: (...args: unknown[]) => void) => void;
};

export type WalletState = {
  account: string;
  chainId: number;
  provider: BrowserProvider;
};

export type ContractConfig = {
  chainId: number;
  rpcLabel: string;
  rpcUrl?: string;
  explorerBaseUrl?: string;
  marketAddress?: string;
  utilityTokenAddress?: string;
  carbonTokenAddress?: string;
  assessorAddress?: string;
  expectedSellerAddress?: string;
  retireCertificateAddress?: string;
  governanceTokenAddress?: string;
  governorAddress?: string;
  oracleAddress?: string;
  tcutSaleAddress?: string;
};

function trimAddr(value: string | undefined): string | undefined {
  return value?.trim();
}

function requireAddress(value: string | undefined, label: string) {
  const addr = trimAddr(value);
  if (!addr) {
    throw new Error(`${label} is not configured`);
  }
  return addr;
}

export function getContractConfig(): ContractConfig {
  return {
    chainId: Number(import.meta.env.VITE_CHAIN_ID ?? 31337),
    rpcLabel: import.meta.env.VITE_CHAIN_LABEL ?? "Hardhat Local",
    rpcUrl: import.meta.env.VITE_CHAIN_RPC_URL,
    explorerBaseUrl: import.meta.env.VITE_EXPLORER_BASE_URL,
    marketAddress: trimAddr(import.meta.env.VITE_MARKET_ADDRESS),
    utilityTokenAddress: trimAddr(import.meta.env.VITE_UTILITY_TOKEN_ADDRESS),
    carbonTokenAddress: trimAddr(import.meta.env.VITE_CARBON_TOKEN_ADDRESS),
    assessorAddress: trimAddr(import.meta.env.VITE_ASSESSOR_ADDRESS),
    expectedSellerAddress: trimAddr(import.meta.env.VITE_EXPECTED_SELLER_ADDRESS),
    retireCertificateAddress: trimAddr(import.meta.env.VITE_RETIRE_CERTIFICATE_ADDRESS),
    governanceTokenAddress: trimAddr(import.meta.env.VITE_GOVERNANCE_TOKEN_ADDRESS),
    governorAddress: trimAddr(import.meta.env.VITE_GOVERNOR_ADDRESS),
    oracleAddress: trimAddr(import.meta.env.VITE_ORACLE_ADDRESS),
    tcutSaleAddress: trimAddr(import.meta.env.VITE_TCUT_SALE_ADDRESS),
  };
}

export function hasWallet() {
  return typeof window !== "undefined" && typeof window.ethereum !== "undefined";
}

function getEthereumProvider() {
  if (!window.ethereum) {
    throw new Error("MetaMask or another injected wallet was not found");
  }

  return window.ethereum as InjectedProvider;
}

export async function connectWallet() {
  if (!hasWallet()) {
    throw new Error("MetaMask or another injected wallet was not found");
  }

  const provider = new BrowserProvider(getEthereumProvider());
  await provider.send("eth_requestAccounts", []);
  const signer = await provider.getSigner();
  const network = await provider.getNetwork();

  return {
    account: await signer.getAddress(),
    chainId: Number(network.chainId),
    provider
  } satisfies WalletState;
}

export async function switchToConfiguredNetwork() {
  const provider = getEthereumProvider();
  const config = getContractConfig();
  const hexChainId = `0x${config.chainId.toString(16)}`;

  try {
    await provider.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: hexChainId }]
    });
  } catch (error) {
    const switchError = error as { code?: number };
    if (switchError.code !== 4902 || !config.rpcUrl) {
      throw error;
    }

    await provider.request({
      method: "wallet_addEthereumChain",
      params: [{
        chainId: hexChainId,
        chainName: config.rpcLabel,
        nativeCurrency: {
          name: "Sepolia ETH",
          symbol: "ETH",
          decimals: 18
        },
        rpcUrls: [config.rpcUrl],
        blockExplorerUrls: config.explorerBaseUrl ? [config.explorerBaseUrl] : []
      }]
    });
  }
}

export async function getConnectedWallet() {
  if (!hasWallet()) {
    return null;
  }

  const provider = new BrowserProvider(getEthereumProvider());
  const accounts = await provider.send("eth_accounts", []);
  if (!accounts.length) {
    return null;
  }

  const signer = await provider.getSigner();
  const network = await provider.getNetwork();

  return {
    account: await signer.getAddress(),
    chainId: Number(network.chainId),
    provider
  } satisfies WalletState;
}

export async function getContracts(provider: BrowserProvider) {
  const signer = await provider.getSigner();
  const config = getContractConfig();

  const marketAddress = requireAddress(config.marketAddress, "VITE_MARKET_ADDRESS");
  const utilityTokenAddress = requireAddress(config.utilityTokenAddress, "VITE_UTILITY_TOKEN_ADDRESS");
  const carbonTokenAddress = requireAddress(config.carbonTokenAddress, "VITE_CARBON_TOKEN_ADDRESS");
  const retireCertificateAddress = requireAddress(config.retireCertificateAddress, "VITE_RETIRE_CERTIFICATE_ADDRESS");
  const governanceTokenAddress = requireAddress(config.governanceTokenAddress, "VITE_GOVERNANCE_TOKEN_ADDRESS");
  const governorAddress = requireAddress(config.governorAddress, "VITE_GOVERNOR_ADDRESS");
  const oracleAddress = requireAddress(config.oracleAddress, "VITE_ORACLE_ADDRESS");

  return {
    config,
    market: new Contract(marketAddress, carbonMarketAbi, signer),
    utilityToken: new Contract(utilityTokenAddress, erc20Abi, signer),
    carbonToken: new Contract(carbonTokenAddress, carbonCreditAbi, signer),
    retireCertificate: new Contract(retireCertificateAddress, retireCertificateAbi, signer),
    govToken: new Contract(governanceTokenAddress, governanceTokenAbi, signer),
    governor: new Contract(governorAddress, governorAbi, signer),
    oracle: new Contract(oracleAddress, riskOracleAbi, signer)
  };
}

export function getTCUTSaleContract(provider: BrowserProvider) {
  const config = getContractConfig();
  const addr = requireAddress(config.tcutSaleAddress, "VITE_TCUT_SALE_ADDRESS");
  return new Contract(addr, tcutSaleAbi, provider);
}

export async function readTCUTSaleInfo(provider: BrowserProvider, account?: string) {
  const sale = getTCUTSaleContract(provider);
  const [rate, inventory, faucetAmount, cooldownSec] = await Promise.all([
    sale.rate() as Promise<bigint>,
    sale.tokenBalance() as Promise<bigint>,
    sale.faucetAmount() as Promise<bigint>,
    sale.faucetCooldown() as Promise<bigint>,
  ]);
  let secondsUntilClaim = 0n;
  if (account) {
    secondsUntilClaim = await (sale.timeUntilNextClaim(account) as Promise<bigint>);
  }
  return { rate, inventory, faucetAmount, cooldownSec, secondsUntilClaim };
}

export async function addTCUTToMetaMask() {
  const config = getContractConfig();
  if (!config.utilityTokenAddress || !window.ethereum) return;
  await (window.ethereum as InjectedProvider).request({
    method: "wallet_watchAsset",
    params: {
      type: "ERC20",
      options: {
        address: config.utilityTokenAddress,
        symbol: "TCUT",
        decimals: 18,
      },
    } as unknown as Record<string, unknown>,
  });
}

export async function readWalletBalances(provider: BrowserProvider, account: string) {
  const { utilityToken } = await getContracts(provider);
  const [rawBalance, decimals, symbol] = await Promise.all([
    utilityToken.balanceOf(account),
    utilityToken.decimals(),
    utilityToken.symbol()
  ]);

  return {
    tokenBalance: `${Number(formatUnits(rawBalance, decimals)).toLocaleString()} ${symbol}`
  };
}
