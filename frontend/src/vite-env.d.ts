/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_CHAIN_ID?: string;
  readonly VITE_CHAIN_LABEL?: string;
  readonly VITE_EXPLORER_BASE_URL?: string;
  readonly VITE_CHAIN_RPC_URL?: string;
  readonly VITE_MARKET_ADDRESS?: string;
  readonly VITE_UTILITY_TOKEN_ADDRESS?: string;
  readonly VITE_CARBON_TOKEN_ADDRESS?: string;
  readonly VITE_ASSESSOR_ADDRESS?: string;
  readonly VITE_EXPECTED_SELLER_ADDRESS?: string;
  readonly VITE_RETIRE_CERTIFICATE_ADDRESS?: string;
  readonly VITE_GOVERNANCE_TOKEN_ADDRESS?: string;
  readonly VITE_GOVERNOR_ADDRESS?: string;
  readonly VITE_ORACLE_ADDRESS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

interface Window {
  ethereum?: {
    request?: (args: { method: string; params?: unknown[] | object }) => Promise<unknown>;
    on?: (event: string, handler: (...args: unknown[]) => void) => void;
    removeListener?: (event: string, handler: (...args: unknown[]) => void) => void;
  };
}
