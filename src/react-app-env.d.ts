/// <reference types="react-scripts" />

declare global {
  interface Window {
    ethereum?: {
      isMetaMask?: boolean;
      request: <T>(args: { method: string; params?: unknown[] }) => Promise<T>;
      on: (event: string, handler: (...args: unknown[]) => void) => void;
      removeListener: (event: string, handler: (...args: unknown[]) => void) => void;
    };
  }
}

export {};
