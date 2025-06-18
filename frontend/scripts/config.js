const CONTRACT_CONFIG = {
    NETWORK: {
        chainId: '0x7A69', // 31337 in hex (localhost)
        chainName: 'Localhost 8545',
        rpcUrls: ['http://127.0.0.1:8545'],
        blockExplorerUrls: ['']
    },
    
    ADDRESSES: {
        CRST_TOKEN: '0x4A679253410272dd5232B3Ff7cF5dbB88f295319',
        COURSE_REGISTRATION: '0x7a2088a1bFc9d81c55368AE168C2C02570cB814F'
    },
    
    ABIS: {
        CRST_TOKEN: [
        {
                "inputs": [
                        {
                                "internalType": "address",
                                "name": "initialOwner",
                                "type": "address"
                        }
                ],
                "stateMutability": "nonpayable",
                "type": "constructor"
        },
        {
                "inputs": [
                        {
                                "internalType": "address",
                                "name": "spender",
                                "type": "address"
                        },
                        {
                                "internalType": "uint256",
                                "name": "allowance",
                                "type": "uint256"
                        },
                        {
                                "internalType": "uint256",
                                "name": "needed",
                                "type": "uint256"
                        }
                ],
                "name": "ERC20InsufficientAllowance",
                "type": "error"
        },
        {
                "inputs": [
                        {
                                "internalType": "address",
                                "name": "sender",
                                "type": "address"
                        },
                        {
                                "internalType": "uint256",
                                "name": "balance",
                                "type": "uint256"
                        },
                        {
                                "internalType": "uint256",
                                "name": "needed",
                                "type": "uint256"
                        }
                ],
                "name": "ERC20InsufficientBalance",
                "type": "error"
        },
        {
                "inputs": [
                        {
                                "internalType": "address",
                                "name": "approver",
                                "type": "address"
                        }
                ],
                "name": "ERC20InvalidApprover",
                "type": "error"
        },
        {
                "inputs": [
                        {
                                "internalType": "address",
                                "name": "receiver",
                                "type": "address"
                        }
                ],
                "name": "ERC20InvalidReceiver",
                "type": "error"
        },
        {
                "inputs": [
                        {
                                "internalType": "address",
                                "name": "sender",
                                "type": "address"
                        }
                ],
                "name": "ERC20InvalidSender",
                "type": "error"
        },
        {
                "inputs": [
                        {
                                "internalType": "address",
                                "name": "spender",
                                "type": "address"
                        }
                ],
                "name": "ERC20InvalidSpender",
                "type": "error"
        },
        {
                "inputs": [
                        {
                                "internalType": "address",
                                "name": "owner",
                                "type": "address"
                        }
                ],
                "name": "OwnableInvalidOwner",
                "type": "error"
        },
        {
                "inputs": [
                        {
                                "internalType": "address",
                                "name": "account",
                                "type": "address"
                        }
                ],
                "name": "OwnableUnauthorizedAccount",
                "type": "error"
        },
        {
                "anonymous": false,
                "inputs": [
                        {
                                "indexed": true,
                                "internalType": "address",
                                "name": "owner",
                                "type": "address"
                        },
                        {
                                "indexed": true,
                                "internalType": "address",
                                "name": "spender",
                                "type": "address"
                        },
                        {
                                "indexed": false,
                                "internalType": "uint256",
                                "name": "value",
                                "type": "uint256"
                        }
                ],
                "name": "Approval",
                "type": "event"
        },
        {
                "anonymous": false,
                "inputs": [
                        {
                                "indexed": false,
                                "internalType": "uint256",
                                "name": "burnedAmount",
                                "type": "uint256"
                        },
                        {
                                "indexed": false,
                                "internalType": "uint256",
                                "name": "newBalance",
                                "type": "uint256"
                        }
                ],
                "name": "AutoBurnTriggered",
                "type": "event"
        },
        {
                "anonymous": false,
                "inputs": [
                        {
                                "indexed": true,
                                "internalType": "address",
                                "name": "previousOwner",
                                "type": "address"
                        },
                        {
                                "indexed": true,
                                "internalType": "address",
                                "name": "newOwner",
                                "type": "address"
                        }
                ],
                "name": "OwnershipTransferred",
                "type": "event"
        },
        {
                "anonymous": false,
                "inputs": [
                        {
                                "indexed": false,
                                "internalType": "uint256",
                                "name": "amount",
                                "type": "uint256"
                        },
                        {
                                "indexed": false,
                                "internalType": "string",
                                "name": "reason",
                                "type": "string"
                        }
                ],
                "name": "TokensBurned",
                "type": "event"
        },
        {
                "anonymous": false,
                "inputs": [
                        {
                                "indexed": true,
                                "internalType": "address",
                                "name": "to",
                                "type": "address"
                        },
                        {
                                "indexed": false,
                                "internalType": "uint256",
                                "name": "amount",
                                "type": "uint256"
                        }
                ],
                "name": "TokensMinted",
                "type": "event"
        },
        {
                "anonymous": false,
                "inputs": [
                        {
                                "indexed": true,
                                "internalType": "address",
                                "name": "from",
                                "type": "address"
                        },
                        {
                                "indexed": true,
                                "internalType": "address",
                                "name": "to",
                                "type": "address"
                        },
                        {
                                "indexed": false,
                                "internalType": "uint256",
                                "name": "value",
                                "type": "uint256"
                        }
                ],
                "name": "Transfer",
                "type": "event"
        },
        {
                "inputs": [],
                "name": "AUTO_BURN_THRESHOLD",
                "outputs": [
                        {
                                "internalType": "uint256",
                                "name": "",
                                "type": "uint256"
                        }
                ],
                "stateMutability": "view",
                "type": "function"
        },
        {
                "inputs": [],
                "name": "ETH_TO_CRST_RATE",
                "outputs": [
                        {
                                "internalType": "uint256",
                                "name": "",
                                "type": "uint256"
                        }
                ],
                "stateMutability": "view",
                "type": "function"
        },
        {
                "inputs": [],
                "name": "MAX_SUPPLY",
                "outputs": [
                        {
                                "internalType": "uint256",
                                "name": "",
                                "type": "uint256"
                        }
                ],
                "stateMutability": "view",
                "type": "function"
        },
        {
                "inputs": [
                        {
                                "internalType": "address",
                                "name": "owner",
                                "type": "address"
                        },
                        {
                                "internalType": "address",
                                "name": "spender",
                                "type": "address"
                        }
                ],
                "name": "allowance",
                "outputs": [
                        {
                                "internalType": "uint256",
                                "name": "",
                                "type": "uint256"
                        }
                ],
                "stateMutability": "view",
                "type": "function"
        },
        {
                "inputs": [
                        {
                                "internalType": "address",
                                "name": "spender",
                                "type": "address"
                        },
                        {
                                "internalType": "uint256",
                                "name": "value",
                                "type": "uint256"
                        }
                ],
                "name": "approve",
                "outputs": [
                        {
                                "internalType": "bool",
                                "name": "",
                                "type": "bool"
                        }
                ],
                "stateMutability": "nonpayable",
                "type": "function"
        },
        {
                "inputs": [
                        {
                                "internalType": "address",
                                "name": "account",
                                "type": "address"
                        }
                ],
                "name": "balanceOf",
                "outputs": [
                        {
                                "internalType": "uint256",
                                "name": "",
                                "type": "uint256"
                        }
                ],
                "stateMutability": "view",
                "type": "function"
        },
        {
                "inputs": [
                        {
                                "internalType": "uint256",
                                "name": "amount",
                                "type": "uint256"
                        }
                ],
                "name": "burn",
                "outputs": [],
                "stateMutability": "nonpayable",
                "type": "function"
        },
        {
                "inputs": [
                        {
                                "internalType": "uint256",
                                "name": "ethAmount",
                                "type": "uint256"
                        }
                ],
                "name": "burnForEthWithdrawal",
                "outputs": [],
                "stateMutability": "nonpayable",
                "type": "function"
        },
        {
                "inputs": [],
                "name": "decimals",
                "outputs": [
                        {
                                "internalType": "uint8",
                                "name": "",
                                "type": "uint8"
                        }
                ],
                "stateMutability": "view",
                "type": "function"
        },
        {
                "inputs": [],
                "name": "getRemainingSupply",
                "outputs": [
                        {
                                "internalType": "uint256",
                                "name": "",
                                "type": "uint256"
                        }
                ],
                "stateMutability": "view",
                "type": "function"
        },
        {
                "inputs": [],
                "name": "getSupplyUtilization",
                "outputs": [
                        {
                                "internalType": "uint256",
                                "name": "",
                                "type": "uint256"
                        }
                ],
                "stateMutability": "view",
                "type": "function"
        },
        {
                "inputs": [
                        {
                                "internalType": "address",
                                "name": "to",
                                "type": "address"
                        },
                        {
                                "internalType": "uint256",
                                "name": "amount",
                                "type": "uint256"
                        }
                ],
                "name": "mint",
                "outputs": [],
                "stateMutability": "nonpayable",
                "type": "function"
        },
        {
                "inputs": [],
                "name": "name",
                "outputs": [
                        {
                                "internalType": "string",
                                "name": "",
                                "type": "string"
                        }
                ],
                "stateMutability": "view",
                "type": "function"
        },
        {
                "inputs": [],
                "name": "owner",
                "outputs": [
                        {
                                "internalType": "address",
                                "name": "",
                                "type": "address"
                        }
                ],
                "stateMutability": "view",
                "type": "function"
        },
        {
                "inputs": [],
                "name": "renounceOwnership",
                "outputs": [],
                "stateMutability": "nonpayable",
                "type": "function"
        },
        {
                "inputs": [],
                "name": "symbol",
                "outputs": [
                        {
                                "internalType": "string",
                                "name": "",
                                "type": "string"
                        }
                ],
                "stateMutability": "view",
                "type": "function"
        },
        {
                "inputs": [],
                "name": "totalSupply",
                "outputs": [
                        {
                                "internalType": "uint256",
                                "name": "",
                                "type": "uint256"
                        }
                ],
                "stateMutability": "view",
                "type": "function"
        },
        {
                "inputs": [
                        {
                                "internalType": "address",
                                "name": "to",
                                "type": "address"
                        },
                        {
                                "internalType": "uint256",
                                "name": "amount",
                                "type": "uint256"
                        }
                ],
                "name": "transfer",
                "outputs": [
                        {
                                "internalType": "bool",
                                "name": "",
                                "type": "bool"
                        }
                ],
                "stateMutability": "nonpayable",
                "type": "function"
        },
        {
                "inputs": [
                        {
                                "internalType": "address",
                                "name": "from",
                                "type": "address"
                        },
                        {
                                "internalType": "address",
                                "name": "to",
                                "type": "address"
                        },
                        {
                                "internalType": "uint256",
                                "name": "amount",
                                "type": "uint256"
                        }
                ],
                "name": "transferFrom",
                "outputs": [
                        {
                                "internalType": "bool",
                                "name": "",
                                "type": "bool"
                        }
                ],
                "stateMutability": "nonpayable",
                "type": "function"
        },
        {
                "inputs": [
                        {
                                "internalType": "address",
                                "name": "newOwner",
                                "type": "address"
                        }
                ],
                "name": "transferOwnership",
                "outputs": [],
                "stateMutability": "nonpayable",
                "type": "function"
        },
        {
                "inputs": [],
                "name": "willAutoBurnTrigger",
                "outputs": [
                        {
                                "internalType": "bool",
                                "name": "",
                                "type": "bool"
                        },
                        {
                                "internalType": "uint256",
                                "name": "",
                                "type": "uint256"
                        }
                ],
                "stateMutability": "view",
                "type": "function"
        }
],
        
        COURSE_REGISTRATION: [
        {
                "inputs": [
                        {
                                "internalType": "address",
                                "name": "_tokenAddress",
                                "type": "address"
                        },
                        {
                                "internalType": "address",
                                "name": "initialOwner",
                                "type": "address"
                        },
                        {
                                "internalType": "address",
                                "name": "_beneficiary",
                                "type": "address"
                        }
                ],
                "stateMutability": "nonpayable",
                "type": "constructor"
        },
        {
                "inputs": [],
                "name": "EnforcedPause",
                "type": "error"
        },
        {
                "inputs": [],
                "name": "ExpectedPause",
                "type": "error"
        },
        {
                "inputs": [
                        {
                                "internalType": "address",
                                "name": "owner",
                                "type": "address"
                        }
                ],
                "name": "OwnableInvalidOwner",
                "type": "error"
        },
        {
                "inputs": [
                        {
                                "internalType": "address",
                                "name": "account",
                                "type": "address"
                        }
                ],
                "name": "OwnableUnauthorizedAccount",
                "type": "error"
        },
        {
                "inputs": [],
                "name": "ReentrancyGuardReentrantCall",
                "type": "error"
        },
        {
                "anonymous": false,
                "inputs": [
                        {
                                "indexed": true,
                                "internalType": "address",
                                "name": "admin",
                                "type": "address"
                        },
                        {
                                "indexed": true,
                                "internalType": "address",
                                "name": "approvedBy",
                                "type": "address"
                        }
                ],
                "name": "AdminApproved",
                "type": "event"
        },
        {
                "anonymous": false,
                "inputs": [
                        {
                                "indexed": true,
                                "internalType": "address",
                                "name": "admin",
                                "type": "address"
                        },
                        {
                                "indexed": true,
                                "internalType": "address",
                                "name": "rejectedBy",
                                "type": "address"
                        }
                ],
                "name": "AdminRejected",
                "type": "event"
        },
        {
                "anonymous": false,
                "inputs": [
                        {
                                "indexed": true,
                                "internalType": "address",
                                "name": "pendingAdmin",
                                "type": "address"
                        }
                ],
                "name": "AdminRequested",
                "type": "event"
        },
        {
                "anonymous": false,
                "inputs": [
                        {
                                "indexed": false,
                                "internalType": "string",
                                "name": "reason",
                                "type": "string"
                        }
                ],
                "name": "AutoBurnTriggered",
                "type": "event"
        },
        {
                "anonymous": false,
                "inputs": [
                        {
                                "indexed": true,
                                "internalType": "address",
                                "name": "student",
                                "type": "address"
                        },
                        {
                                "indexed": false,
                                "internalType": "uint256[]",
                                "name": "courseIds",
                                "type": "uint256[]"
                        },
                        {
                                "indexed": false,
                                "internalType": "uint256",
                                "name": "totalAmount",
                                "type": "uint256"
                        },
                        {
                                "indexed": false,
                                "internalType": "uint256",
                                "name": "timestamp",
                                "type": "uint256"
                        }
                ],
                "name": "BatchFeePaid",
                "type": "event"
        },
        {
                "anonymous": false,
                "inputs": [
                        {
                                "indexed": true,
                                "internalType": "address",
                                "name": "oldBeneficiary",
                                "type": "address"
                        },
                        {
                                "indexed": true,
                                "internalType": "address",
                                "name": "newBeneficiary",
                                "type": "address"
                        },
                        {
                                "indexed": true,
                                "internalType": "address",
                                "name": "updatedBy",
                                "type": "address"
                        }
                ],
                "name": "BeneficiaryUpdated",
                "type": "event"
        },
        {
                "anonymous": false,
                "inputs": [
                        {
                                "indexed": true,
                                "internalType": "address",
                                "name": "student",
                                "type": "address"
                        },
                        {
                                "indexed": false,
                                "internalType": "uint256",
                                "name": "crstAmount",
                                "type": "uint256"
                        },
                        {
                                "indexed": false,
                                "internalType": "uint256",
                                "name": "ethReturned",
                                "type": "uint256"
                        },
                        {
                                "indexed": false,
                                "internalType": "uint256",
                                "name": "feeDeducted",
                                "type": "uint256"
                        }
                ],
                "name": "CRSTReturned",
                "type": "event"
        },
        {
                "anonymous": false,
                "inputs": [
                        {
                                "indexed": true,
                                "internalType": "uint256",
                                "name": "courseId",
                                "type": "uint256"
                        },
                        {
                                "indexed": true,
                                "internalType": "address",
                                "name": "admin",
                                "type": "address"
                        }
                ],
                "name": "CourseActivated",
                "type": "event"
        },
        {
                "anonymous": false,
                "inputs": [
                        {
                                "indexed": true,
                                "internalType": "uint256",
                                "name": "courseId",
                                "type": "uint256"
                        },
                        {
                                "indexed": false,
                                "internalType": "string",
                                "name": "name",
                                "type": "string"
                        },
                        {
                                "indexed": false,
                                "internalType": "uint256",
                                "name": "feeInTokens",
                                "type": "uint256"
                        },
                        {
                                "indexed": true,
                                "internalType": "address",
                                "name": "admin",
                                "type": "address"
                        }
                ],
                "name": "CourseAdded",
                "type": "event"
        },
        {
                "anonymous": false,
                "inputs": [
                        {
                                "indexed": true,
                                "internalType": "uint256",
                                "name": "courseId",
                                "type": "uint256"
                        },
                        {
                                "indexed": true,
                                "internalType": "address",
                                "name": "admin",
                                "type": "address"
                        }
                ],
                "name": "CourseDeactivated",
                "type": "event"
        },
        {
                "anonymous": false,
                "inputs": [
                        {
                                "indexed": true,
                                "internalType": "uint256",
                                "name": "courseId",
                                "type": "uint256"
                        },
                        {
                                "indexed": false,
                                "internalType": "string",
                                "name": "name",
                                "type": "string"
                        },
                        {
                                "indexed": false,
                                "internalType": "uint256",
                                "name": "feeInTokens",
                                "type": "uint256"
                        },
                        {
                                "indexed": true,
                                "internalType": "address",
                                "name": "admin",
                                "type": "address"
                        }
                ],
                "name": "CourseUpdated",
                "type": "event"
        },
        {
                "anonymous": false,
                "inputs": [
                        {
                                "indexed": true,
                                "internalType": "address",
                                "name": "beneficiary",
                                "type": "address"
                        },
                        {
                                "indexed": false,
                                "internalType": "uint256",
                                "name": "amount",
                                "type": "uint256"
                        },
                        {
                                "indexed": true,
                                "internalType": "address",
                                "name": "withdrawnBy",
                                "type": "address"
                        },
                        {
                                "indexed": false,
                                "internalType": "uint256",
                                "name": "tokensBurned",
                                "type": "uint256"
                        }
                ],
                "name": "EthWithdrawn",
                "type": "event"
        },
        {
                "anonymous": false,
                "inputs": [
                        {
                                "indexed": true,
                                "internalType": "address",
                                "name": "student",
                                "type": "address"
                        },
                        {
                                "indexed": true,
                                "internalType": "uint256",
                                "name": "courseId",
                                "type": "uint256"
                        },
                        {
                                "indexed": false,
                                "internalType": "uint256",
                                "name": "amount",
                                "type": "uint256"
                        },
                        {
                                "indexed": false,
                                "internalType": "uint256",
                                "name": "timestamp",
                                "type": "uint256"
                        }
                ],
                "name": "FeesPaid",
                "type": "event"
        },
        {
                "anonymous": false,
                "inputs": [
                        {
                                "indexed": true,
                                "internalType": "address",
                                "name": "previousOwner",
                                "type": "address"
                        },
                        {
                                "indexed": true,
                                "internalType": "address",
                                "name": "newOwner",
                                "type": "address"
                        }
                ],
                "name": "OwnershipTransferred",
                "type": "event"
        },
        {
                "anonymous": false,
                "inputs": [
                        {
                                "indexed": false,
                                "internalType": "address",
                                "name": "account",
                                "type": "address"
                        }
                ],
                "name": "Paused",
                "type": "event"
        },
        {
                "anonymous": false,
                "inputs": [
                        {
                                "indexed": true,
                                "internalType": "address",
                                "name": "student",
                                "type": "address"
                        },
                        {
                                "indexed": true,
                                "internalType": "uint256",
                                "name": "courseId",
                                "type": "uint256"
                        },
                        {
                                "indexed": false,
                                "internalType": "uint256",
                                "name": "timestamp",
                                "type": "uint256"
                        }
                ],
                "name": "StudentRegistered",
                "type": "event"
        },
        {
                "anonymous": false,
                "inputs": [
                        {
                                "indexed": true,
                                "internalType": "address",
                                "name": "beneficiary",
                                "type": "address"
                        },
                        {
                                "indexed": false,
                                "internalType": "uint256",
                                "name": "amount",
                                "type": "uint256"
                        },
                        {
                                "indexed": true,
                                "internalType": "address",
                                "name": "withdrawnBy",
                                "type": "address"
                        }
                ],
                "name": "TokenFeesWithdrawn",
                "type": "event"
        },
        {
                "anonymous": false,
                "inputs": [
                        {
                                "indexed": true,
                                "internalType": "uint256",
                                "name": "requestId",
                                "type": "uint256"
                        },
                        {
                                "indexed": true,
                                "internalType": "address",
                                "name": "student",
                                "type": "address"
                        },
                        {
                                "indexed": false,
                                "internalType": "uint256",
                                "name": "amountInTokens",
                                "type": "uint256"
                        },
                        {
                                "indexed": false,
                                "internalType": "uint256",
                                "name": "ethPaid",
                                "type": "uint256"
                        }
                ],
                "name": "TokenPurchaseCompleted",
                "type": "event"
        },
        {
                "anonymous": false,
                "inputs": [
                        {
                                "indexed": true,
                                "internalType": "uint256",
                                "name": "requestId",
                                "type": "uint256"
                        },
                        {
                                "indexed": true,
                                "internalType": "address",
                                "name": "student",
                                "type": "address"
                        },
                        {
                                "indexed": false,
                                "internalType": "uint256",
                                "name": "amountInTokens",
                                "type": "uint256"
                        },
                        {
                                "indexed": true,
                                "internalType": "address",
                                "name": "admin",
                                "type": "address"
                        }
                ],
                "name": "TokenRequestApproved",
                "type": "event"
        },
        {
                "anonymous": false,
                "inputs": [
                        {
                                "indexed": true,
                                "internalType": "uint256",
                                "name": "requestId",
                                "type": "uint256"
                        },
                        {
                                "indexed": true,
                                "internalType": "address",
                                "name": "student",
                                "type": "address"
                        },
                        {
                                "indexed": true,
                                "internalType": "address",
                                "name": "admin",
                                "type": "address"
                        }
                ],
                "name": "TokenRequestRejected",
                "type": "event"
        },
        {
                "anonymous": false,
                "inputs": [
                        {
                                "indexed": true,
                                "internalType": "uint256",
                                "name": "requestId",
                                "type": "uint256"
                        },
                        {
                                "indexed": true,
                                "internalType": "address",
                                "name": "student",
                                "type": "address"
                        },
                        {
                                "indexed": false,
                                "internalType": "uint256",
                                "name": "amountInTokens",
                                "type": "uint256"
                        },
                        {
                                "indexed": false,
                                "internalType": "uint256",
                                "name": "ethRequired",
                                "type": "uint256"
                        },
                        {
                                "indexed": false,
                                "internalType": "string",
                                "name": "reason",
                                "type": "string"
                        },
                        {
                                "indexed": false,
                                "internalType": "uint256",
                                "name": "timestamp",
                                "type": "uint256"
                        }
                ],
                "name": "TokenRequested",
                "type": "event"
        },
        {
                "anonymous": false,
                "inputs": [
                        {
                                "indexed": false,
                                "internalType": "address",
                                "name": "account",
                                "type": "address"
                        }
                ],
                "name": "Unpaused",
                "type": "event"
        },
        {
                "anonymous": false,
                "inputs": [
                        {
                                "indexed": true,
                                "internalType": "address",
                                "name": "user",
                                "type": "address"
                        },
                        {
                                "indexed": true,
                                "internalType": "address",
                                "name": "deactivatedBy",
                                "type": "address"
                        }
                ],
                "name": "UserDeactivated",
                "type": "event"
        },
        {
                "anonymous": false,
                "inputs": [
                        {
                                "indexed": true,
                                "internalType": "address",
                                "name": "user",
                                "type": "address"
                        },
                        {
                                "indexed": false,
                                "internalType": "enum CourseRegistration.UserRole",
                                "name": "role",
                                "type": "uint8"
                        },
                        {
                                "indexed": false,
                                "internalType": "uint256",
                                "name": "timestamp",
                                "type": "uint256"
                        }
                ],
                "name": "UserProfileCreated",
                "type": "event"
        },
        {
                "stateMutability": "payable",
                "type": "fallback"
        },
        {
                "inputs": [],
                "name": "ETH_TO_CRST_RATE",
                "outputs": [
                        {
                                "internalType": "uint256",
                                "name": "",
                                "type": "uint256"
                        }
                ],
                "stateMutability": "view",
                "type": "function"
        },
        {
                "inputs": [],
                "name": "MAX_COURSE_CAPACITY",
                "outputs": [
                        {
                                "internalType": "uint256",
                                "name": "",
                                "type": "uint256"
                        }
                ],
                "stateMutability": "view",
                "type": "function"
        },
        {
                "inputs": [],
                "name": "MAX_COURSE_FEE",
                "outputs": [
                        {
                                "internalType": "uint256",
                                "name": "",
                                "type": "uint256"
                        }
                ],
                "stateMutability": "view",
                "type": "function"
        },
        {
                "inputs": [],
                "name": "MAX_CREDIT_HOURS",
                "outputs": [
                        {
                                "internalType": "uint8",
                                "name": "",
                                "type": "uint8"
                        }
                ],
                "stateMutability": "view",
                "type": "function"
        },
        {
                "inputs": [],
                "name": "RETURN_FEE_PERCENT",
                "outputs": [
                        {
                                "internalType": "uint256",
                                "name": "",
                                "type": "uint256"
                        }
                ],
                "stateMutability": "view",
                "type": "function"
        },
        {
                "inputs": [
                        {
                                "internalType": "uint256",
                                "name": "courseId",
                                "type": "uint256"
                        }
                ],
                "name": "activateCourse",
                "outputs": [],
                "stateMutability": "nonpayable",
                "type": "function"
        },
        {
                "inputs": [
                        {
                                "internalType": "string",
                                "name": "name",
                                "type": "string"
                        },
                        {
                                "internalType": "string",
                                "name": "description",
                                "type": "string"
                        },
                        {
                                "internalType": "uint8",
                                "name": "creditHours",
                                "type": "uint8"
                        },
                        {
                                "internalType": "uint256",
                                "name": "feeInTokens",
                                "type": "uint256"
                        },
                        {
                                "internalType": "uint16",
                                "name": "capacity",
                                "type": "uint16"
                        }
                ],
                "name": "addCourse",
                "outputs": [],
                "stateMutability": "nonpayable",
                "type": "function"
        },
        {
                "inputs": [
                        {
                                "internalType": "address",
                                "name": "adminAddress",
                                "type": "address"
                        }
                ],
                "name": "approveAdmin",
                "outputs": [],
                "stateMutability": "nonpayable",
                "type": "function"
        },
        {
                "inputs": [
                        {
                                "internalType": "uint256",
                                "name": "requestId",
                                "type": "uint256"
                        }
                ],
                "name": "approveTokenRequest",
                "outputs": [],
                "stateMutability": "nonpayable",
                "type": "function"
        },
        {
                "inputs": [],
                "name": "beneficiary",
                "outputs": [
                        {
                                "internalType": "address",
                                "name": "",
                                "type": "address"
                        }
                ],
                "stateMutability": "view",
                "type": "function"
        },
        {
                "inputs": [
                        {
                                "internalType": "uint256",
                                "name": "",
                                "type": "uint256"
                        }
                ],
                "name": "courseIds",
                "outputs": [
                        {
                                "internalType": "uint256",
                                "name": "",
                                "type": "uint256"
                        }
                ],
                "stateMutability": "view",
                "type": "function"
        },
        {
                "inputs": [
                        {
                                "internalType": "uint256",
                                "name": "",
                                "type": "uint256"
                        }
                ],
                "name": "courses",
                "outputs": [
                        {
                                "internalType": "uint256",
                                "name": "id",
                                "type": "uint256"
                        },
                        {
                                "internalType": "string",
                                "name": "name",
                                "type": "string"
                        },
                        {
                                "internalType": "string",
                                "name": "description",
                                "type": "string"
                        },
                        {
                                "internalType": "uint8",
                                "name": "creditHours",
                                "type": "uint8"
                        },
                        {
                                "internalType": "uint256",
                                "name": "feeInTokens",
                                "type": "uint256"
                        },
                        {
                                "internalType": "uint16",
                                "name": "capacity",
                                "type": "uint16"
                        },
                        {
                                "internalType": "uint16",
                                "name": "enrolled",
                                "type": "uint16"
                        },
                        {
                                "internalType": "bool",
                                "name": "isActive",
                                "type": "bool"
                        },
                        {
                                "internalType": "uint256",
                                "name": "createdAt",
                                "type": "uint256"
                        },
                        {
                                "internalType": "address",
                                "name": "createdBy",
                                "type": "address"
                        }
                ],
                "stateMutability": "view",
                "type": "function"
        },
        {
                "inputs": [],
                "name": "crstToken",
                "outputs": [
                        {
                                "internalType": "contract ICRSTTokenAutoBurn",
                                "name": "",
                                "type": "address"
                        }
                ],
                "stateMutability": "view",
                "type": "function"
        },
        {
                "inputs": [
                        {
                                "internalType": "uint256",
                                "name": "courseId",
                                "type": "uint256"
                        }
                ],
                "name": "deactivateCourse",
                "outputs": [],
                "stateMutability": "nonpayable",
                "type": "function"
        },
        {
                "inputs": [],
                "name": "getAllCourseIds",
                "outputs": [
                        {
                                "internalType": "uint256[]",
                                "name": "",
                                "type": "uint256[]"
                        }
                ],
                "stateMutability": "view",
                "type": "function"
        },
        {
                "inputs": [],
                "name": "getContractEthBalance",
                "outputs": [
                        {
                                "internalType": "uint256",
                                "name": "",
                                "type": "uint256"
                        }
                ],
                "stateMutability": "view",
                "type": "function"
        },
        {
                "inputs": [],
                "name": "getContractTokenBalance",
                "outputs": [
                        {
                                "internalType": "uint256",
                                "name": "",
                                "type": "uint256"
                        }
                ],
                "stateMutability": "view",
                "type": "function"
        },
        {
                "inputs": [
                        {
                                "internalType": "uint256",
                                "name": "courseId",
                                "type": "uint256"
                        }
                ],
                "name": "getCourse",
                "outputs": [
                        {
                                "components": [
                                        {
                                                "internalType": "uint256",
                                                "name": "id",
                                                "type": "uint256"
                                        },
                                        {
                                                "internalType": "string",
                                                "name": "name",
                                                "type": "string"
                                        },
                                        {
                                                "internalType": "string",
                                                "name": "description",
                                                "type": "string"
                                        },
                                        {
                                                "internalType": "uint8",
                                                "name": "creditHours",
                                                "type": "uint8"
                                        },
                                        {
                                                "internalType": "uint256",
                                                "name": "feeInTokens",
                                                "type": "uint256"
                                        },
                                        {
                                                "internalType": "uint16",
                                                "name": "capacity",
                                                "type": "uint16"
                                        },
                                        {
                                                "internalType": "uint16",
                                                "name": "enrolled",
                                                "type": "uint16"
                                        },
                                        {
                                                "internalType": "bool",
                                                "name": "isActive",
                                                "type": "bool"
                                        },
                                        {
                                                "internalType": "uint256",
                                                "name": "createdAt",
                                                "type": "uint256"
                                        },
                                        {
                                                "internalType": "address",
                                                "name": "createdBy",
                                                "type": "address"
                                        }
                                ],
                                "internalType": "struct CourseRegistration.Course",
                                "name": "",
                                "type": "tuple"
                        }
                ],
                "stateMutability": "view",
                "type": "function"
        },
        {
                "inputs": [
                        {
                                "internalType": "uint256",
                                "name": "courseId",
                                "type": "uint256"
                        }
                ],
                "name": "getCourseDetails",
                "outputs": [
                        {
                                "components": [
                                        {
                                                "internalType": "uint256",
                                                "name": "id",
                                                "type": "uint256"
                                        },
                                        {
                                                "internalType": "string",
                                                "name": "name",
                                                "type": "string"
                                        },
                                        {
                                                "internalType": "string",
                                                "name": "description",
                                                "type": "string"
                                        },
                                        {
                                                "internalType": "uint8",
                                                "name": "creditHours",
                                                "type": "uint8"
                                        },
                                        {
                                                "internalType": "uint256",
                                                "name": "feeInTokens",
                                                "type": "uint256"
                                        },
                                        {
                                                "internalType": "uint16",
                                                "name": "capacity",
                                                "type": "uint16"
                                        },
                                        {
                                                "internalType": "uint16",
                                                "name": "enrolled",
                                                "type": "uint16"
                                        },
                                        {
                                                "internalType": "bool",
                                                "name": "isActive",
                                                "type": "bool"
                                        },
                                        {
                                                "internalType": "uint256",
                                                "name": "createdAt",
                                                "type": "uint256"
                                        },
                                        {
                                                "internalType": "address",
                                                "name": "createdBy",
                                                "type": "address"
                                        }
                                ],
                                "internalType": "struct CourseRegistration.Course",
                                "name": "course",
                                "type": "tuple"
                        },
                        {
                                "internalType": "uint256",
                                "name": "revenue",
                                "type": "uint256"
                        },
                        {
                                "internalType": "uint256",
                                "name": "enrollmentRate",
                                "type": "uint256"
                        }
                ],
                "stateMutability": "view",
                "type": "function"
        },
        {
                "inputs": [],
                "name": "getPendingTokenRequests",
                "outputs": [
                        {
                                "components": [
                                        {
                                                "internalType": "uint256",
                                                "name": "id",
                                                "type": "uint256"
                                        },
                                        {
                                                "internalType": "address",
                                                "name": "student",
                                                "type": "address"
                                        },
                                        {
                                                "internalType": "uint256",
                                                "name": "amountInTokens",
                                                "type": "uint256"
                                        },
                                        {
                                                "internalType": "uint256",
                                                "name": "ethRequired",
                                                "type": "uint256"
                                        },
                                        {
                                                "internalType": "string",
                                                "name": "reason",
                                                "type": "string"
                                        },
                                        {
                                                "internalType": "enum CourseRegistration.RequestStatus",
                                                "name": "status",
                                                "type": "uint8"
                                        },
                                        {
                                                "internalType": "uint256",
                                                "name": "timestamp",
                                                "type": "uint256"
                                        },
                                        {
                                                "internalType": "uint256",
                                                "name": "processedAt",
                                                "type": "uint256"
                                        },
                                        {
                                                "internalType": "address",
                                                "name": "processedBy",
                                                "type": "address"
                                        }
                                ],
                                "internalType": "struct CourseRegistration.TokenRequest[]",
                                "name": "",
                                "type": "tuple[]"
                        }
                ],
                "stateMutability": "view",
                "type": "function"
        },
        {
                "inputs": [
                        {
                                "internalType": "address",
                                "name": "student",
                                "type": "address"
                        },
                        {
                                "internalType": "uint256",
                                "name": "courseId",
                                "type": "uint256"
                        }
                ],
                "name": "getRegistration",
                "outputs": [
                        {
                                "components": [
                                        {
                                                "internalType": "address",
                                                "name": "student",
                                                "type": "address"
                                        },
                                        {
                                                "internalType": "uint256",
                                                "name": "courseId",
                                                "type": "uint256"
                                        },
                                        {
                                                "internalType": "uint256",
                                                "name": "timestamp",
                                                "type": "uint256"
                                        },
                                        {
                                                "internalType": "bool",
                                                "name": "hasPaid",
                                                "type": "bool"
                                        },
                                        {
                                                "internalType": "uint256",
                                                "name": "paidAmount",
                                                "type": "uint256"
                                        },
                                        {
                                                "internalType": "uint256",
                                                "name": "paidAt",
                                                "type": "uint256"
                                        }
                                ],
                                "internalType": "struct CourseRegistration.Registration",
                                "name": "registration",
                                "type": "tuple"
                        }
                ],
                "stateMutability": "view",
                "type": "function"
        },
        {
                "inputs": [
                        {
                                "internalType": "uint256",
                                "name": "amountInTokens",
                                "type": "uint256"
                        }
                ],
                "name": "getRequiredEthForTokens",
                "outputs": [
                        {
                                "internalType": "uint256",
                                "name": "",
                                "type": "uint256"
                        }
                ],
                "stateMutability": "pure",
                "type": "function"
        },
        {
                "inputs": [
                        {
                                "internalType": "address",
                                "name": "student",
                                "type": "address"
                        }
                ],
                "name": "getStudentCourses",
                "outputs": [
                        {
                                "internalType": "uint256[]",
                                "name": "",
                                "type": "uint256[]"
                        }
                ],
                "stateMutability": "view",
                "type": "function"
        },
        {
                "inputs": [],
                "name": "getSystemStats",
                "outputs": [
                        {
                                "internalType": "uint256",
                                "name": "totalCourses",
                                "type": "uint256"
                        },
                        {
                                "internalType": "uint256",
                                "name": "totalStudents",
                                "type": "uint256"
                        },
                        {
                                "internalType": "uint256",
                                "name": "totalFeesCollectedAmount",
                                "type": "uint256"
                        },
                        {
                                "internalType": "uint256",
                                "name": "totalEthCollectedAmount",
                                "type": "uint256"
                        },
                        {
                                "internalType": "uint256",
                                "name": "totalEthReturnedAmount",
                                "type": "uint256"
                        },
                        {
                                "internalType": "uint256",
                                "name": "totalReturnFeesAmount",
                                "type": "uint256"
                        },
                        {
                                "internalType": "uint256",
                                "name": "totalTokenRequests",
                                "type": "uint256"
                        },
                        {
                                "internalType": "uint256",
                                "name": "currentSupply",
                                "type": "uint256"
                        },
                        {
                                "internalType": "uint256",
                                "name": "contractTokenBalance",
                                "type": "uint256"
                        },
                        {
                                "internalType": "bool",
                                "name": "willAutoBurn",
                                "type": "bool"
                        },
                        {
                                "internalType": "uint256",
                                "name": "autoBurnAmount",
                                "type": "uint256"
                        }
                ],
                "stateMutability": "view",
                "type": "function"
        },
        {
                "inputs": [
                        {
                                "internalType": "uint256",
                                "name": "requestId",
                                "type": "uint256"
                        }
                ],
                "name": "getTokenRequest",
                "outputs": [
                        {
                                "components": [
                                        {
                                                "internalType": "uint256",
                                                "name": "id",
                                                "type": "uint256"
                                        },
                                        {
                                                "internalType": "address",
                                                "name": "student",
                                                "type": "address"
                                        },
                                        {
                                                "internalType": "uint256",
                                                "name": "amountInTokens",
                                                "type": "uint256"
                                        },
                                        {
                                                "internalType": "uint256",
                                                "name": "ethRequired",
                                                "type": "uint256"
                                        },
                                        {
                                                "internalType": "string",
                                                "name": "reason",
                                                "type": "string"
                                        },
                                        {
                                                "internalType": "enum CourseRegistration.RequestStatus",
                                                "name": "status",
                                                "type": "uint8"
                                        },
                                        {
                                                "internalType": "uint256",
                                                "name": "timestamp",
                                                "type": "uint256"
                                        },
                                        {
                                                "internalType": "uint256",
                                                "name": "processedAt",
                                                "type": "uint256"
                                        },
                                        {
                                                "internalType": "address",
                                                "name": "processedBy",
                                                "type": "address"
                                        }
                                ],
                                "internalType": "struct CourseRegistration.TokenRequest",
                                "name": "",
                                "type": "tuple"
                        }
                ],
                "stateMutability": "view",
                "type": "function"
        },
        {
                "inputs": [
                        {
                                "internalType": "address",
                                "name": "student",
                                "type": "address"
                        },
                        {
                                "internalType": "uint256",
                                "name": "courseId",
                                "type": "uint256"
                        }
                ],
                "name": "isStudentRegistered",
                "outputs": [
                        {
                                "internalType": "bool",
                                "name": "isRegistered",
                                "type": "bool"
                        },
                        {
                                "internalType": "bool",
                                "name": "hasPaid",
                                "type": "bool"
                        }
                ],
                "stateMutability": "view",
                "type": "function"
        },
        {
                "inputs": [],
                "name": "nextCourseId",
                "outputs": [
                        {
                                "internalType": "uint256",
                                "name": "",
                                "type": "uint256"
                        }
                ],
                "stateMutability": "view",
                "type": "function"
        },
        {
                "inputs": [],
                "name": "owner",
                "outputs": [
                        {
                                "internalType": "address",
                                "name": "",
                                "type": "address"
                        }
                ],
                "stateMutability": "view",
                "type": "function"
        },
        {
                "inputs": [],
                "name": "pause",
                "outputs": [],
                "stateMutability": "nonpayable",
                "type": "function"
        },
        {
                "inputs": [],
                "name": "paused",
                "outputs": [
                        {
                                "internalType": "bool",
                                "name": "",
                                "type": "bool"
                        }
                ],
                "stateMutability": "view",
                "type": "function"
        },
        {
                "inputs": [
                        {
                                "internalType": "uint256",
                                "name": "courseId",
                                "type": "uint256"
                        }
                ],
                "name": "payFee",
                "outputs": [],
                "stateMutability": "nonpayable",
                "type": "function"
        },
        {
                "inputs": [
                        {
                                "internalType": "uint256[]",
                                "name": "courseIds",
                                "type": "uint256[]"
                        }
                ],
                "name": "payFeesForCourses",
                "outputs": [],
                "stateMutability": "nonpayable",
                "type": "function"
        },
        {
                "inputs": [
                        {
                                "internalType": "address",
                                "name": "",
                                "type": "address"
                        }
                ],
                "name": "pendingAdmins",
                "outputs": [
                        {
                                "internalType": "bool",
                                "name": "",
                                "type": "bool"
                        }
                ],
                "stateMutability": "view",
                "type": "function"
        },
        {
                "inputs": [],
                "name": "registerAsStudent",
                "outputs": [],
                "stateMutability": "nonpayable",
                "type": "function"
        },
        {
                "inputs": [
                        {
                                "internalType": "uint256",
                                "name": "courseId",
                                "type": "uint256"
                        }
                ],
                "name": "registerForCourse",
                "outputs": [],
                "stateMutability": "nonpayable",
                "type": "function"
        },
        {
                "inputs": [
                        {
                                "internalType": "address",
                                "name": "",
                                "type": "address"
                        },
                        {
                                "internalType": "uint256",
                                "name": "",
                                "type": "uint256"
                        }
                ],
                "name": "registrations",
                "outputs": [
                        {
                                "internalType": "address",
                                "name": "student",
                                "type": "address"
                        },
                        {
                                "internalType": "uint256",
                                "name": "courseId",
                                "type": "uint256"
                        },
                        {
                                "internalType": "uint256",
                                "name": "timestamp",
                                "type": "uint256"
                        },
                        {
                                "internalType": "bool",
                                "name": "hasPaid",
                                "type": "bool"
                        },
                        {
                                "internalType": "uint256",
                                "name": "paidAmount",
                                "type": "uint256"
                        },
                        {
                                "internalType": "uint256",
                                "name": "paidAt",
                                "type": "uint256"
                        }
                ],
                "stateMutability": "view",
                "type": "function"
        },
        {
                "inputs": [
                        {
                                "internalType": "address",
                                "name": "adminAddress",
                                "type": "address"
                        }
                ],
                "name": "rejectAdmin",
                "outputs": [],
                "stateMutability": "nonpayable",
                "type": "function"
        },
        {
                "inputs": [
                        {
                                "internalType": "uint256",
                                "name": "requestId",
                                "type": "uint256"
                        }
                ],
                "name": "rejectTokenRequest",
                "outputs": [],
                "stateMutability": "nonpayable",
                "type": "function"
        },
        {
                "inputs": [],
                "name": "renounceOwnership",
                "outputs": [],
                "stateMutability": "nonpayable",
                "type": "function"
        },
        {
                "inputs": [],
                "name": "requestAdminAccess",
                "outputs": [],
                "stateMutability": "nonpayable",
                "type": "function"
        },
        {
                "inputs": [
                        {
                                "internalType": "uint256",
                                "name": "amountInTokens",
                                "type": "uint256"
                        },
                        {
                                "internalType": "string",
                                "name": "reason",
                                "type": "string"
                        }
                ],
                "name": "requestTokens",
                "outputs": [],
                "stateMutability": "payable",
                "type": "function"
        },
        {
                "inputs": [
                        {
                                "internalType": "uint256",
                                "name": "crstAmount",
                                "type": "uint256"
                        }
                ],
                "name": "returnCRSTForETH",
                "outputs": [],
                "stateMutability": "nonpayable",
                "type": "function"
        },
        {
                "inputs": [
                        {
                                "internalType": "address",
                                "name": "_beneficiary",
                                "type": "address"
                        }
                ],
                "name": "setBeneficiary",
                "outputs": [],
                "stateMutability": "nonpayable",
                "type": "function"
        },
        {
                "inputs": [
                        {
                                "internalType": "address",
                                "name": "",
                                "type": "address"
                        },
                        {
                                "internalType": "uint256",
                                "name": "",
                                "type": "uint256"
                        }
                ],
                "name": "studentCourses",
                "outputs": [
                        {
                                "internalType": "uint256",
                                "name": "",
                                "type": "uint256"
                        }
                ],
                "stateMutability": "view",
                "type": "function"
        },
        {
                "inputs": [],
                "name": "tokenRequestCounter",
                "outputs": [
                        {
                                "internalType": "uint256",
                                "name": "",
                                "type": "uint256"
                        }
                ],
                "stateMutability": "view",
                "type": "function"
        },
        {
                "inputs": [
                        {
                                "internalType": "uint256",
                                "name": "",
                                "type": "uint256"
                        }
                ],
                "name": "tokenRequests",
                "outputs": [
                        {
                                "internalType": "uint256",
                                "name": "id",
                                "type": "uint256"
                        },
                        {
                                "internalType": "address",
                                "name": "student",
                                "type": "address"
                        },
                        {
                                "internalType": "uint256",
                                "name": "amountInTokens",
                                "type": "uint256"
                        },
                        {
                                "internalType": "uint256",
                                "name": "ethRequired",
                                "type": "uint256"
                        },
                        {
                                "internalType": "string",
                                "name": "reason",
                                "type": "string"
                        },
                        {
                                "internalType": "enum CourseRegistration.RequestStatus",
                                "name": "status",
                                "type": "uint8"
                        },
                        {
                                "internalType": "uint256",
                                "name": "timestamp",
                                "type": "uint256"
                        },
                        {
                                "internalType": "uint256",
                                "name": "processedAt",
                                "type": "uint256"
                        },
                        {
                                "internalType": "address",
                                "name": "processedBy",
                                "type": "address"
                        }
                ],
                "stateMutability": "view",
                "type": "function"
        },
        {
                "inputs": [],
                "name": "totalEthCollected",
                "outputs": [
                        {
                                "internalType": "uint256",
                                "name": "",
                                "type": "uint256"
                        }
                ],
                "stateMutability": "view",
                "type": "function"
        },
        {
                "inputs": [],
                "name": "totalEthReturned",
                "outputs": [
                        {
                                "internalType": "uint256",
                                "name": "",
                                "type": "uint256"
                        }
                ],
                "stateMutability": "view",
                "type": "function"
        },
        {
                "inputs": [],
                "name": "totalFeesCollected",
                "outputs": [
                        {
                                "internalType": "uint256",
                                "name": "",
                                "type": "uint256"
                        }
                ],
                "stateMutability": "view",
                "type": "function"
        },
        {
                "inputs": [],
                "name": "totalReturnFees",
                "outputs": [
                        {
                                "internalType": "uint256",
                                "name": "",
                                "type": "uint256"
                        }
                ],
                "stateMutability": "view",
                "type": "function"
        },
        {
                "inputs": [],
                "name": "totalStudentsRegistered",
                "outputs": [
                        {
                                "internalType": "uint256",
                                "name": "",
                                "type": "uint256"
                        }
                ],
                "stateMutability": "view",
                "type": "function"
        },
        {
                "inputs": [
                        {
                                "internalType": "address",
                                "name": "newOwner",
                                "type": "address"
                        }
                ],
                "name": "transferOwnership",
                "outputs": [],
                "stateMutability": "nonpayable",
                "type": "function"
        },
        {
                "inputs": [],
                "name": "unpause",
                "outputs": [],
                "stateMutability": "nonpayable",
                "type": "function"
        },
        {
                "inputs": [
                        {
                                "internalType": "uint256",
                                "name": "courseId",
                                "type": "uint256"
                        },
                        {
                                "internalType": "string",
                                "name": "name",
                                "type": "string"
                        },
                        {
                                "internalType": "string",
                                "name": "description",
                                "type": "string"
                        },
                        {
                                "internalType": "uint8",
                                "name": "creditHours",
                                "type": "uint8"
                        },
                        {
                                "internalType": "uint256",
                                "name": "feeInTokens",
                                "type": "uint256"
                        },
                        {
                                "internalType": "uint16",
                                "name": "capacity",
                                "type": "uint16"
                        }
                ],
                "name": "updateCourse",
                "outputs": [],
                "stateMutability": "nonpayable",
                "type": "function"
        },
        {
                "inputs": [
                        {
                                "internalType": "address",
                                "name": "",
                                "type": "address"
                        }
                ],
                "name": "userProfiles",
                "outputs": [
                        {
                                "internalType": "address",
                                "name": "walletAddress",
                                "type": "address"
                        },
                        {
                                "internalType": "enum CourseRegistration.UserRole",
                                "name": "role",
                                "type": "uint8"
                        },
                        {
                                "internalType": "bool",
                                "name": "isActive",
                                "type": "bool"
                        },
                        {
                                "internalType": "uint256",
                                "name": "registeredAt",
                                "type": "uint256"
                        },
                        {
                                "internalType": "address",
                                "name": "approvedBy",
                                "type": "address"
                        }
                ],
                "stateMutability": "view",
                "type": "function"
        },
        {
                "inputs": [],
                "name": "withdrawAllEth",
                "outputs": [],
                "stateMutability": "nonpayable",
                "type": "function"
        },
        {
                "inputs": [
                        {
                                "internalType": "uint256",
                                "name": "amountInWei",
                                "type": "uint256"
                        }
                ],
                "name": "withdrawEth",
                "outputs": [],
                "stateMutability": "nonpayable",
                "type": "function"
        },
        {
                "inputs": [
                        {
                                "internalType": "uint256",
                                "name": "amountInTokens",
                                "type": "uint256"
                        }
                ],
                "name": "withdrawTokenFees",
                "outputs": [],
                "stateMutability": "nonpayable",
                "type": "function"
        },
        {
                "stateMutability": "payable",
                "type": "receive"
        }
]
    }
};