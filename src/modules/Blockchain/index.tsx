/* eslint-disable @typescript-eslint/no-explicit-any */
import { BrowserProvider, Contract } from 'ethers';

const CONTRACT_ADDRESS = '0x55EE4E217290854c3285a6725C97748c04Ee3246';
const CONTRACT_ABI = [
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'address', name: 'owner', type: 'address' },
      { indexed: false, internalType: 'string', name: 'ipfsCid', type: 'string' },
      { indexed: false, internalType: 'bytes32', name: 'originalFileHash', type: 'bytes32' },
    ],
    name: 'FileAdded',
    type: 'event',
  },
  {
    inputs: [
      { internalType: 'string', name: '_ipfsCid', type: 'string' },
      { internalType: 'bytes32', name: '_originalFileHash', type: 'bytes32' },
    ],
    name: 'addFile',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'address', name: '_owner', type: 'address' }],
    name: 'getFilesByOwner',
    outputs: [
      {
        components: [
          { internalType: 'string', name: 'ipfsCid', type: 'string' },
          { internalType: 'bytes32', name: 'originalFileHash', type: 'bytes32' },
          { internalType: 'uint256', name: 'timestamp', type: 'uint256' },
        ],
        internalType: 'struct FileRegistry.FileRecord[]',
        name: '',
        type: 'tuple[]',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
];

export const SEPILIA_CHAIN_ID = '0xaa36a7';
export const SEPILIA_PARAMS = {
  chainId: SEPILIA_CHAIN_ID,
  chainName: 'Sepolia Test Network',
  nativeCurrency: { name: 'SepoliaETH', symbol: 'ETH', decimals: 18 },
  rpcUrls: ['https://rpc.sepolia.org'],
  blockExplorerUrls: ['https://sepolia.etherscan.io'],
};

export const ensureSepoliaNetwork = async () => {
  if (!window.ethereum) throw new Error('MetaMask not found');

  const chainIdHex = (await window.ethereum.request({ method: 'eth_chainId' })) as string;
  if (chainIdHex !== SEPILIA_CHAIN_ID) {
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: SEPILIA_CHAIN_ID }],
      });
      console.log('Switched to Sepolia network');
    } catch (switchError: any) {
      // Якщо мережі немає в MetaMask
      if (switchError.code === 4902) {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [SEPILIA_PARAMS],
        });
        console.log('Sepolia network added');
      } else {
        throw new Error('User rejected network switch');
      }
    }
  }
};

export const getProvider = () => {
  if (!window.ethereum) throw new Error('MetaMask not found');
  return new BrowserProvider(window.ethereum);
};

export const getSigner = async () => {
  const provider = getProvider();
  return await provider.getSigner();
};

export const getContract = (signerOrProvider: any) => {
  return new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signerOrProvider);
};

export const addFileOnChain = async (ipfsCid: string, fileHashHex: string) => {
  const signer = await getSigner();
  const contract = getContract(signer);
  const tx = await contract.addFile(ipfsCid, '0x' + fileHashHex);
  await tx.wait();
  return tx.hash;
};

export const verifyFileOnChain = async (fileHashHex: string) => {
  const provider = getProvider();
  const signer = await provider.getSigner();
  const address = await signer.getAddress();
  const contract = getContract(provider);
  const records = await contract.getFilesByOwner(address);
  return records.some((r: any) => r.originalFileHash === '0x' + fileHashHex);
};
