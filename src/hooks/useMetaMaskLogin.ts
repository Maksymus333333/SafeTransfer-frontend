import { useState } from 'react';
import { getMe, getNonce, verifySiwe } from '../global/api/authApi';
import { SiweMessage } from 'siwe';
import { getAddress } from 'ethers';
import { NavigateFunction } from 'react-router-dom';

declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
      on?: (event: string, handler: (...args: unknown[]) => void) => void;
    };
  }
}

export const useMetaMaskLogin = (navigate: NavigateFunction) => {
  const [loading, setLoading] = useState(false);

  const debugLog = (...args: unknown[]) => {
    if (process.env.NODE_ENV === 'development') console.log('[MetaMaskLogin]', ...args);
  };

  const login = async () => {
    if (!window.ethereum) {
      alert('MetaMask is not installed!');
      return;
    }

    setLoading(true);

    try {
      // 1. Отримуємо новий nonce перед кожним логіном
      const { nonce } = await getNonce();
      debugLog('Fetched nonce:', nonce);

      // 2. Отримуємо адресу користувача
      const accounts = (await window.ethereum.request({ method: 'eth_requestAccounts' })) as string[];
      if (!accounts || accounts.length === 0) throw new Error('No Ethereum accounts found.');
      const address = getAddress(accounts[0]);
      debugLog('User address:', address);

      // 3. Отримуємо chainId
      const chainIdHex = (await window.ethereum.request({ method: 'eth_chainId' })) as string;
      const chainId = parseInt(chainIdHex, 16);
      debugLog('Chain ID:', chainId);

      // 4. Створюємо SIWE повідомлення
      const siwe = new SiweMessage({
        domain: window.location.host,
        address,
        statement: 'Sign in with Ethereum to the app.',
        uri: window.location.origin,
        version: '1',
        chainId,
        nonce,
      });
      const messageToSign = siwe.prepareMessage();

      // 5. Підписуємо повідомлення через MetaMask
      const signature = (await window.ethereum.request({
        method: 'personal_sign',
        params: [messageToSign, address],
      })) as string;
      debugLog('SIWE message:', messageToSign);
      debugLog('Signature:', signature, 'length:', signature.length);

      // 6. Верифікуємо підпис на бекенді
      await verifySiwe(messageToSign, signature);

      // 7. Отримуємо дані користувача

      const user = await getMe();
      debugLog('Logged in user:', user);

      // 8. Перехід на головну сторінку
      navigate('/');
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error('MetaMask login error:', error.message);
        alert(`Login failed: ${error.message}`);
      } else {
        console.error('MetaMask login error:', error);
        alert('Login failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return { login, loading };
};
