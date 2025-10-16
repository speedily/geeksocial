import { ethers } from 'ethers';

export interface PaymentRequest {
  amount: number;
  currency: 'PYUSD';
  userId: string;
  plan: 'basic' | 'premium' | 'enterprise';
  description: string;
}

export interface PaymentResponse {
  success: boolean;
  transactionId?: string;
  paymentUrl?: string;
  error?: string;
}

export interface PYUSDConfig {
  contractAddress: string;
  rpcUrl: string;
  chainId: number;
}

export class PayPalPYUSDService {
  private config: PYUSDConfig;
  private provider: ethers.Provider;

  constructor() {
    this.config = {
      contractAddress: process.env.BASE_CONTRACT_ADDRESS || '',
      rpcUrl: process.env.BASE_RPC_URL || 'https://mainnet.base.org',
      chainId: parseInt(process.env.BASE_CHAIN_ID || '8453')
    };

    this.provider = new ethers.JsonRpcProvider(this.config.rpcUrl);
  }

  async createPayment(request: PaymentRequest): Promise<PaymentResponse> {
    try {
      // Validate payment request
      if (!this.validatePaymentRequest(request)) {
        return {
          success: false,
          error: 'Invalid payment request'
        };
      }

      // Create payment intent
      const paymentIntent = await this.createPaymentIntent(request);
      
      return {
        success: true,
        transactionId: paymentIntent.transactionId,
        paymentUrl: paymentIntent.paymentUrl
      };
    } catch (error) {
      console.error('Error creating payment:', error);
      return {
        success: false,
        error: 'Failed to create payment'
      };
    }
  }

  async processPayment(transactionId: string, userWallet: string): Promise<PaymentResponse> {
    try {
      // Get payment details
      const payment = await this.getPaymentDetails(transactionId);
      if (!payment) {
        return {
          success: false,
          error: 'Payment not found'
        };
      }

      // Process PYUSD transaction
      const txHash = await this.executePYUSDTransaction(payment, userWallet);
      
      if (txHash) {
        return {
          success: true,
          transactionId: txHash
        };
      } else {
        return {
          success: false,
          error: 'Transaction failed'
        };
      }
    } catch (error) {
      console.error('Error processing payment:', error);
      return {
        success: false,
        error: 'Failed to process payment'
      };
    }
  }

  async verifyPayment(transactionId: string): Promise<boolean> {
    try {
      const receipt = await this.provider.getTransactionReceipt(transactionId);
      return receipt?.status === 1;
    } catch (error) {
      console.error('Error verifying payment:', error);
      return false;
    }
  }

  async getPYUSDBalance(walletAddress: string): Promise<number> {
    try {
      // PYUSD contract ABI (simplified)
      const pyusdAbi = [
        'function balanceOf(address owner) view returns (uint256)',
        'function decimals() view returns (uint8)'
      ];

      const contract = new ethers.Contract(
        this.config.contractAddress,
        pyusdAbi,
        this.provider
      );

      const balance = await contract.balanceOf(walletAddress);
      const decimals = await contract.decimals();
      
      return parseFloat(ethers.formatUnits(balance, decimals));
    } catch (error) {
      console.error('Error getting PYUSD balance:', error);
      return 0;
    }
  }

  async transferPYUSD(fromWallet: string, toAddress: string, amount: number): Promise<string | null> {
    try {
      const signer = new ethers.Wallet(process.env.BASE_PRIVATE_KEY!, this.provider);
      const contract = new ethers.Contract(
        this.config.contractAddress,
        [
          'function transfer(address to, uint256 amount) returns (bool)',
          'function decimals() view returns (uint8)'
        ],
        signer
      );

      const decimals = await contract.decimals();
      const amountWei = ethers.parseUnits(amount.toString(), decimals);

      const tx = await contract.transfer(toAddress, amountWei);
      await tx.wait();

      return tx.hash;
    } catch (error) {
      console.error('Error transferring PYUSD:', error);
      return null;
    }
  }

  private validatePaymentRequest(request: PaymentRequest): boolean {
    if (!request.amount || request.amount <= 0) return false;
    if (request.currency !== 'PYUSD') return false;
    if (!request.userId) return false;
    if (!['basic', 'premium', 'enterprise'].includes(request.plan)) return false;
    if (!request.description) return false;

    return true;
  }

  private async createPaymentIntent(request: PaymentRequest): Promise<{
    transactionId: string;
    paymentUrl: string;
  }> {
    // Generate unique transaction ID
    const transactionId = `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Create payment URL (in real implementation, this would be a PayPal payment URL)
    const paymentUrl = `${process.env.NEXT_PUBLIC_APP_URL}/payment/${transactionId}`;

    return {
      transactionId,
      paymentUrl
    };
  }

  private async getPaymentDetails(transactionId: string): Promise<PaymentRequest | null> {
    // In real implementation, this would fetch from database
    // For MVP, we'll return a mock payment
    return {
      amount: 15,
      currency: 'PYUSD',
      userId: 'user_123',
      plan: 'premium',
      description: 'Premium content creation service'
    };
  }

  private async executePYUSDTransaction(payment: PaymentRequest, userWallet: string): Promise<string | null> {
    try {
      // In real implementation, this would:
      // 1. Check user's PYUSD balance
      // 2. Execute the transfer
      // 3. Return transaction hash

      // For MVP, we'll simulate the transaction
      const mockTxHash = `0x${Math.random().toString(16).substr(2, 64)}`;
      
      // Simulate transaction confirmation
      setTimeout(() => {
        console.log(`Transaction ${mockTxHash} confirmed`);
      }, 2000);

      return mockTxHash;
    } catch (error) {
      console.error('Error executing PYUSD transaction:', error);
      return null;
    }
  }

  getPricingPlans() {
    return {
      basic: {
        price: 5,
        currency: 'PYUSD',
        features: [
          '10 content generations per month',
          'Basic AI optimization',
          'Twitter & Instagram posting',
          'Basic analytics'
        ]
      },
      premium: {
        price: 15,
        currency: 'PYUSD',
        features: [
          '50 content generations per month',
          'Advanced AI optimization',
          'All social media platforms',
          'Advanced analytics',
          'Content scheduling',
          'Hashtag optimization'
        ]
      },
      enterprise: {
        price: 50,
        currency: 'PYUSD',
        features: [
          'Unlimited content generations',
          'Premium AI optimization',
          'All social media platforms',
          'Advanced analytics',
          'Content scheduling',
          'Hashtag optimization',
          'Team collaboration',
          'Custom integrations',
          'Priority support'
        ]
      }
    };
  }
}

export const paypalService = new PayPalPYUSDService();
