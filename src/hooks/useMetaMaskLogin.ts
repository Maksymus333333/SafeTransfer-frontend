import { useState, useEffect } from 'react';
import { getMe, getNonce, verifySiwe } from '../global/api/authApi';
import { SiweMessage } from 'siwe';
import { getAddress } from 'ethers';
import Cookies from 'js-cookie';
import { NavigateFunction } from 'react-router-dom';

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ethereum?: any;
  }
}

export const useMetaMaskLogin = (navigate: NavigateFunction) => {
  const [nonce, setNonce] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const debugLog = (...args: unknown[]) => {
    if (process.env.NODE_ENV === 'development') {
      console.log('[MetaMaskLogin]', ...args);
    }
  };

  useEffect(() => {
    const fetchNonce = async () => {
      try {
        const { nonce } = await getNonce();
        setNonce(nonce);
        debugLog('Nonce:', nonce);
      } catch (error) {
        console.error('Failed to get nonce:', error);
      }
    };

    fetchNonce();
  }, []);

  const login = async () => {
    if (!window.ethereum) {
      alert('MetaMask is not installed!');
      return;
    }

    setLoading(true);

    try {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      const address = getAddress(accounts[0]);
      const chainIdHex = await window.ethereum.request({ method: 'eth_chainId' });
      const chainId = parseInt(chainIdHex, 16);

      if (!nonce) throw new Error('Nonce is missing');

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

      const signature = await window.ethereum.request({
        method: 'personal_sign',
        params: [messageToSign, address],
      });

      debugLog('SIWE Message:', messageToSign);
      debugLog('Signature:', signature);

      const { access_token } = await verifySiwe(messageToSign, signature);

      Cookies.set('access_token', access_token, { expires: 7, secure: true });

      const user = await getMe(access_token);
      debugLog('Logged in user:', user);

      navigate('/');
    } catch (error) {
      console.error('MetaMask login error:', error);
      alert('Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return { login, loading };
};
