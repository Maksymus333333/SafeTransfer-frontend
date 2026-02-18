import { BrowserProvider } from 'ethers';

export const waitForTxConfirmation = async (
  provider: BrowserProvider,
  txHash: string,
  onStatus?: (msg: string) => void,
  interval = 3000
) => {
  onStatus?.('Transaction pending on blockchain...');

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const receipt = await provider.getTransactionReceipt(txHash);

    if (receipt) {
      if (receipt.status === 1) {
        onStatus?.('Transaction confirmed on blockchain');
        return receipt;
      }

      throw new Error('Transaction reverted');
    }

    await new Promise((r) => setTimeout(r, interval));
  }
};
