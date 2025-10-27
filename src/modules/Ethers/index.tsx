import { BrowserProvider, JsonRpcSigner, Contract } from 'ethers';

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
  {
    inputs: [
      { internalType: 'address', name: '', type: 'address' },
      { internalType: 'uint256', name: '', type: 'uint256' },
    ],
    name: 'userFiles',
    outputs: [
      { internalType: 'string', name: 'ipfsCid', type: 'string' },
      { internalType: 'bytes32', name: 'originalFileHash', type: 'bytes32' },
      { internalType: 'uint256', name: 'timestamp', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
];

// Підключення до MetaMask
export const getProvider = (): BrowserProvider => {
  if (!window.ethereum) throw new Error('MetaMask not installed');
  return new BrowserProvider(window.ethereum);
};

// Повертає JsonRpcSigner
export const getSigner = async (): Promise<JsonRpcSigner> => {
  const provider = getProvider();
  return provider.getSigner();
};

// Повертає контракт (можна передати signer або provider)
export const getContract = (runner: JsonRpcSigner | BrowserProvider): Contract => {
  return new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, runner);
};
