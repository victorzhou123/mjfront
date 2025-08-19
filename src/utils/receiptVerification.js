/**
 * 服务器端收据验证机制
 * 处理Apple App Store收据验证和安全检查
 */

// Apple收据验证配置
const RECEIPT_VERIFICATION_CONFIG = {
  // 生产环境验证URL
  PRODUCTION_URL: 'https://buy.itunes.apple.com/verifyReceipt',
  // 沙盒环境验证URL
  SANDBOX_URL: 'https://sandbox.itunes.apple.com/verifyReceipt',
  // 应用的共享密钥（需要在App Store Connect中获取）
  SHARED_SECRET: 'your_shared_secret_here', // TODO: 替换为实际的共享密钥
  // 应用Bundle ID
  BUNDLE_ID: 'com.yourcompany.mjapp', // TODO: 替换为实际的Bundle ID
  // 重试次数
  MAX_RETRIES: 3,
  // 超时时间（毫秒）
  TIMEOUT: 10000
};

// 收据验证状态码
const RECEIPT_STATUS_CODES = {
  0: '收据有效',
  21000: '收据数据格式错误',
  21002: '收据数据格式错误',
  21003: '收据无法验证',
  21004: '提供的共享密钥不匹配',
  21005: '收据服务器暂时不可用',
  21006: '收据有效但订阅已过期',
  21007: '收据来自沙盒环境，但发送到了生产环境',
  21008: '收据来自生产环境，但发送到了沙盒环境',
  21009: '内部数据访问错误',
  21010: '用户账户无法找到或已删除'
};

class ReceiptVerificationManager {
  constructor() {
    this.verificationCache = new Map();
    this.pendingVerifications = new Map();
  }

  /**
   * 验证收据
   * @param {string} receiptData Base64编码的收据数据
   * @param {boolean} isProduction 是否为生产环境
   */
  async verifyReceipt(receiptData, isProduction = true) {
    try {
      // 检查缓存
      const cacheKey = this.generateCacheKey(receiptData);
      if (this.verificationCache.has(cacheKey)) {
        const cached = this.verificationCache.get(cacheKey);
        if (Date.now() - cached.timestamp < 300000) { // 5分钟缓存
          return cached.result;
        }
      }

      // 检查是否正在验证中
      if (this.pendingVerifications.has(cacheKey)) {
        return await this.pendingVerifications.get(cacheKey);
      }

      // 开始验证
      const verificationPromise = this.performVerification(receiptData, isProduction);
      this.pendingVerifications.set(cacheKey, verificationPromise);

      try {
        const result = await verificationPromise;
        
        // 缓存结果
        this.verificationCache.set(cacheKey, {
          result,
          timestamp: Date.now()
        });

        return result;
      } finally {
        this.pendingVerifications.delete(cacheKey);
      }

    } catch (error) {
      console.error('收据验证失败:', error);
      return {
        success: false,
        error: error.message,
        code: 'VERIFICATION_ERROR'
      };
    }
  }

  /**
   * 执行收据验证
   * @param {string} receiptData 收据数据
   * @param {boolean} isProduction 是否为生产环境
   */
  async performVerification(receiptData, isProduction) {
    const verificationUrl = isProduction 
      ? RECEIPT_VERIFICATION_CONFIG.PRODUCTION_URL 
      : RECEIPT_VERIFICATION_CONFIG.SANDBOX_URL;

    const requestBody = {
      'receipt-data': receiptData,
      'password': RECEIPT_VERIFICATION_CONFIG.SHARED_SECRET,
      'exclude-old-transactions': true
    };

    let lastError = null;
    
    // 重试机制
    for (let attempt = 1; attempt <= RECEIPT_VERIFICATION_CONFIG.MAX_RETRIES; attempt++) {
      try {
        const response = await this.makeVerificationRequest(verificationUrl, requestBody);
        
        if (response.status === 21007 && isProduction) {
          // 收据来自沙盒环境，重新用沙盒URL验证
          console.log('收据来自沙盒环境，切换到沙盒验证');
          return await this.performVerification(receiptData, false);
        }
        
        if (response.status === 21008 && !isProduction) {
          // 收据来自生产环境，重新用生产URL验证
          console.log('收据来自生产环境，切换到生产验证');
          return await this.performVerification(receiptData, true);
        }

        return this.processVerificationResponse(response);
        
      } catch (error) {
        lastError = error;
        console.warn(`收据验证第${attempt}次尝试失败:`, error.message);
        
        if (attempt < RECEIPT_VERIFICATION_CONFIG.MAX_RETRIES) {
          // 等待后重试
          await this.delay(1000 * attempt);
        }
      }
    }

    throw lastError || new Error('收据验证失败');
  }

  /**
   * 发送验证请求
   * @param {string} url 验证URL
   * @param {object} body 请求体
   */
  async makeVerificationRequest(url, body) {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('验证请求超时'));
      }, RECEIPT_VERIFICATION_CONFIG.TIMEOUT);

      uni.request({
        url: url,
        method: 'POST',
        header: {
          'Content-Type': 'application/json'
        },
        data: body,
        success: (res) => {
          clearTimeout(timeout);
          if (res.statusCode === 200) {
            resolve(res.data);
          } else {
            reject(new Error(`HTTP错误: ${res.statusCode}`));
          }
        },
        fail: (error) => {
          clearTimeout(timeout);
          reject(new Error(`网络错误: ${error.errMsg || error.message}`));
        }
      });
    });
  }

  /**
   * 处理验证响应
   * @param {object} response Apple服务器响应
   */
  processVerificationResponse(response) {
    const status = response.status;
    const statusMessage = RECEIPT_STATUS_CODES[status] || '未知错误';

    if (status !== 0) {
      return {
        success: false,
        error: statusMessage,
        code: status,
        response: response
      };
    }

    // 验证成功，检查收据内容
    const receipt = response.receipt;
    if (!receipt) {
      return {
        success: false,
        error: '收据数据为空',
        code: 'EMPTY_RECEIPT'
      };
    }

    // 验证Bundle ID
    if (receipt.bundle_id !== RECEIPT_VERIFICATION_CONFIG.BUNDLE_ID) {
      return {
        success: false,
        error: 'Bundle ID不匹配',
        code: 'BUNDLE_ID_MISMATCH',
        expected: RECEIPT_VERIFICATION_CONFIG.BUNDLE_ID,
        actual: receipt.bundle_id
      };
    }

    // 提取交易信息
    const transactions = this.extractTransactions(response);
    
    return {
      success: true,
      receipt: receipt,
      transactions: transactions,
      environment: response.environment || 'production',
      verificationTime: Date.now()
    };
  }

  /**
   * 提取交易信息
   * @param {object} response 验证响应
   */
  extractTransactions(response) {
    const transactions = [];
    
    // 处理应用内购买交易
    if (response.receipt && response.receipt.in_app) {
      response.receipt.in_app.forEach(transaction => {
        transactions.push({
          transactionId: transaction.transaction_id,
          originalTransactionId: transaction.original_transaction_id,
          productId: transaction.product_id,
          purchaseDate: new Date(parseInt(transaction.purchase_date_ms)),
          quantity: parseInt(transaction.quantity) || 1,
          isTrialPeriod: transaction.is_trial_period === 'true',
          isIntroOfferPeriod: transaction.is_in_intro_offer_period === 'true'
        });
      });
    }

    return transactions;
  }

  /**
   * 验证特定交易
   * @param {string} receiptData 收据数据
   * @param {string} transactionId 交易ID
   * @param {string} productId 商品ID
   */
  async verifyTransaction(receiptData, transactionId, productId) {
    try {
      const verificationResult = await this.verifyReceipt(receiptData);
      
      if (!verificationResult.success) {
        return verificationResult;
      }

      // 查找特定交易
      const transaction = verificationResult.transactions.find(t => 
        t.transactionId === transactionId && t.productId === productId
      );

      if (!transaction) {
        return {
          success: false,
          error: '未找到指定的交易',
          code: 'TRANSACTION_NOT_FOUND'
        };
      }

      // 检查交易是否过期（对于消耗型商品，通常不会过期）
      const transactionAge = Date.now() - transaction.purchaseDate.getTime();
      const maxAge = 24 * 60 * 60 * 1000; // 24小时
      
      if (transactionAge > maxAge) {
        return {
          success: false,
          error: '交易已过期',
          code: 'TRANSACTION_EXPIRED',
          transactionAge: transactionAge
        };
      }

      return {
        success: true,
        transaction: transaction,
        receipt: verificationResult.receipt,
        environment: verificationResult.environment
      };

    } catch (error) {
      return {
        success: false,
        error: error.message,
        code: 'VERIFICATION_ERROR'
      };
    }
  }

  /**
   * 生成缓存键
   * @param {string} receiptData 收据数据
   */
  generateCacheKey(receiptData) {
    // 使用收据数据的哈希作为缓存键
    return 'receipt_' + this.simpleHash(receiptData);
  }

  /**
   * 简单哈希函数
   * @param {string} str 字符串
   */
  simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // 转换为32位整数
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * 延迟函数
   * @param {number} ms 毫秒数
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 清理缓存
   */
  clearCache() {
    this.verificationCache.clear();
  }

  /**
   * 获取缓存统计
   */
  getCacheStats() {
    return {
      cacheSize: this.verificationCache.size,
      pendingVerifications: this.pendingVerifications.size
    };
  }
}

// 创建全局实例
const receiptVerificationManager = new ReceiptVerificationManager();

export default receiptVerificationManager;

// 导出配置和工具
export { RECEIPT_VERIFICATION_CONFIG, RECEIPT_STATUS_CODES };

// 导出工具函数
export const ReceiptVerificationUtils = {
  /**
   * 检查收据数据格式
   */
  isValidReceiptData(receiptData) {
    if (!receiptData || typeof receiptData !== 'string') {
      return false;
    }
    
    // 检查是否为Base64格式
    try {
      return btoa(atob(receiptData)) === receiptData;
    } catch (error) {
      return false;
    }
  },

  /**
   * 格式化验证错误信息
   */
  formatVerificationError(error) {
    if (typeof error === 'string') {
      return error;
    }
    
    if (error.code && RECEIPT_STATUS_CODES[error.code]) {
      return `${RECEIPT_STATUS_CODES[error.code]} (${error.code})`;
    }
    
    return error.error || error.message || '未知验证错误';
  }
};