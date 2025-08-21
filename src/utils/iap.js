/**
 * 应用内购买(In-App Purchase)集成模块
 * 处理iOS应用内购买流程、交易验证和收据处理
 */

import currencyManager from './currency.js';

// 应用内购买商品配置
export const IAP_PRODUCTS = {
  'mjapp1.currency.1': {
    productId: 'mjapp1.currency.1',
    currency: 1,
    price: '¥1.00',
    title: '1算力',
    description: '购买1个算力，用于扩展备忘录容量'
  },
  'mjapp1.currency.6': {
    productId: 'mjapp1.currency.6',
    currency: 6,
    price: '¥6.00',
    title: '6算力',
    description: '购买6个算力，用于扩展备忘录容量'
  },
  'mjapp1.currency.18': {
    productId: 'mjapp1.currency.18',
    currency: 18,
    price: '¥18.00',
    title: '18算力',
    description: '购买18个算力，用于扩展备忘录容量'
  },
  'mjapp1.currency.30': {
    productId: 'mjapp1.currency.30',
    currency: 30,
    price: '¥30.00',
    title: '30算力',
    description: '购买30个算力，用于扩展备忘录容量'
  },
  'mjapp1.currency.68': {
    productId: 'mjapp1.currency.68',
    currency: 68,
    price: '¥68.00',
    title: '68算力',
    description: '购买68个算力，用于扩展备忘录容量'
  },
  'mjapp1.currency.128': {
    productId: 'mjapp1.currency.128',
    currency: 128,
    price: '¥128.00',
    title: '128算力',
    description: '购买128个算力，用于扩展备忘录容量'
  }
};

class IAPManager {
  constructor() {
    this.isInitialized = false;
    this.isInitializing = false;
    this.products = [];
    this.pendingTransactions = new Map();
    this.initError = null;
  }

  /**
   * 初始化应用内购买
   */
  async init() {
    if (this.isInitialized) {
      return true;
    }
    
    if (this.isInitializing) {
      // 等待正在进行的初始化完成
      while (this.isInitializing) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      return this.isInitialized;
    }
    
    this.isInitializing = true;
    this.initError = null;
    
    try {
      console.log('开始IAP初始化...');
      
      // 检查运行环境
      const systemInfo = uni.getSystemInfoSync();
      console.log('系统信息:', systemInfo);
      
      // 检查是否支持应用内购买
      if (!this.isIAPSupported()) {
        throw new Error('当前平台不支持应用内购买');
      }

      // 等待plus环境准备就绪
      await this.waitForPlusReady();
      console.log('Plus环境已准备就绪');
      
      // 初始化应用内购买服务
      await this.initializeIAP();
      console.log('IAP服务初始化成功');
      
      // 获取商品信息
      await this.loadProducts();
      console.log('商品信息加载成功');
      
      // 恢复未完成的交易
      await this.restoreTransactions();
      console.log('交易恢复完成');
      
      this.isInitialized = true;
      console.log('应用内购买初始化成功');
      return true;
    } catch (error) {
      this.initError = error;
      console.error('应用内购买初始化失败:', error);
      return false;
    } finally {
      this.isInitializing = false;
    }
  }

  /**
   * 检查是否支持应用内购买
   */
  isIAPSupported() {
    // #ifdef APP-PLUS
    const systemInfo = uni.getSystemInfoSync();
    console.log('检查IAP支持 - 平台:', systemInfo.platform);
    return systemInfo.platform === 'ios';
    // #endif
    
    // #ifndef APP-PLUS
    console.log('检查IAP支持 - 非App平台');
    return false;
    // #endif
  }

  /**
   * 等待plus环境准备就绪
   */
  async waitForPlusReady() {
    return new Promise((resolve, reject) => {
      // #ifdef APP-PLUS
      const timeout = setTimeout(() => {
        reject(new Error('Plus环境准备超时'));
      }, 10000);
      
      const checkPlus = () => {
        if (typeof plus !== 'undefined' && plus.payment) {
          clearTimeout(timeout);
          console.log('Plus环境检查通过');
          resolve();
        } else {
          console.log('等待Plus环境...');
          setTimeout(checkPlus, 100);
        }
      };
      
      if (typeof plus !== 'undefined' && plus.payment) {
        clearTimeout(timeout);
        resolve();
      } else {
        document.addEventListener('plusready', () => {
          clearTimeout(timeout);
          console.log('Plus ready事件触发');
          resolve();
        });
        // 同时轮询检查
        checkPlus();
      }
      // #endif
      
      // #ifndef APP-PLUS
      resolve();
      // #endif
    });
  }

  /**
   * 初始化IAP服务
   */
  async initializeIAP() {
    return new Promise((resolve, reject) => {
      // #ifdef APP-PLUS
      if (uni.getSystemInfoSync().platform === 'ios') {
        console.log('开始获取支付通道...');
        plus.payment.getChannels((channels) => {
          console.log('获取到支付通道:', channels);
          
          // 检查是否有Apple IAP通道
          const appleIAP = channels.find(channel => channel.id === 'appleiap');
          if (appleIAP) {
            this.iapChannel = appleIAP;
            console.log('找到Apple IAP通道:', appleIAP);
            resolve();
          } else {
            console.error('支付通道列表:', channels.map(c => c.id));
            
            // 提供更详细的错误信息
            const availableChannels = channels.map(c => c.id).join(', ');
            const errorMsg = `未找到Apple IAP支付通道。\n\n可用通道: ${availableChannels}\n\n可能原因:\n1. 应用未使用iOS开发者证书打包\n2. 证书未包含IAP权限\n3. 运行环境不是真实iOS设备\n4. App ID未启用IAP功能`;
            
            reject(new Error(errorMsg));
          }
        }, (error) => {
          console.error('获取支付通道失败:', error);
          reject(new Error('获取支付通道失败: ' + error.message));
        });
      } else {
        reject(new Error('仅支持iOS平台'));
      }
      // #endif
      
      // #ifndef APP-PLUS
      reject(new Error('仅支持App平台'));
      // #endif
    });
  }

  /**
   * 获取初始化错误
   */
  getInitError() {
    return this.initError;
  }

  /**
   * 加载商品信息
   */
  async loadProducts() {
    return new Promise((resolve, reject) => {
      // #ifdef APP-PLUS
      const productIds = Object.keys(IAP_PRODUCTS);
      
      plus.payment.request(this.iapChannel, {
        action: 'query',
        products: productIds
      }, (result) => {
        if (result && result.products) {
          this.products = result.products.map(product => ({
            ...product,
            ...IAP_PRODUCTS[product.productid]
          }));
          console.log('商品信息加载成功:', this.products);
          resolve(this.products);
        } else {
          reject(new Error('商品信息加载失败'));
        }
      }, (error) => {
        reject(new Error('查询商品失败: ' + error.message));
      });
      // #endif
      
      // #ifndef APP-PLUS
      reject(new Error('仅支持App平台'));
      // #endif
    });
  }

  /**
   * 获取商品列表
   */
  getProducts() {
    return this.products;
  }

  /**
   * 根据商品ID获取商品信息
   */
  getProduct(productId) {
    return this.products.find(product => product.productid === productId);
  }

  /**
   * 购买商品
   * @param {string} productId 商品ID
   */
  async purchaseProduct(productId) {
    if (!this.isInitialized) {
      throw new Error('应用内购买未初始化');
    }

    const product = this.getProduct(productId);
    if (!product) {
      throw new Error('商品不存在: ' + productId);
    }

    return new Promise((resolve, reject) => {
      // #ifdef APP-PLUS
      const transactionId = this.generateTransactionId();
      this.pendingTransactions.set(transactionId, {
        productId,
        product,
        resolve,
        reject,
        startTime: Date.now()
      });

      plus.payment.request(this.iapChannel, {
        action: 'purchase',
        productid: productId
      }, (result) => {
        this.handlePurchaseSuccess(transactionId, result);
      }, (error) => {
        this.handlePurchaseError(transactionId, error);
      });
      // #endif
      
      // #ifndef APP-PLUS
      reject(new Error('仅支持App平台'));
      // #endif
    });
  }

  /**
   * 处理购买成功
   */
  async handlePurchaseSuccess(transactionId, result) {
    const transaction = this.pendingTransactions.get(transactionId);
    if (!transaction) {
      console.error('未找到对应的交易记录:', transactionId);
      return;
    }

    try {
      // 验证收据
      const verifyResult = await this.verifyReceipt(result);
      if (!verifyResult.success) {
        throw new Error('收据验证失败: ' + verifyResult.message);
      }

      // 添加算力到用户账户
      const currencyAmount = transaction.product.currency;
      const addResult = currencyManager.addBalance(
        currencyAmount,
        result.transactionIdentifier || transactionId,
        'purchase'
      );

      if (!addResult) {
        throw new Error('添加算力失败');
      }

      // 完成交易
      await this.finishTransaction(result);

      // 返回成功结果
      transaction.resolve({
        success: true,
        productId: transaction.productId,
        currency: currencyAmount,
        transactionId: result.transactionIdentifier || transactionId,
        receipt: result.receipt
      });

    } catch (error) {
      console.error('处理购买成功时发生错误:', error);
      transaction.reject(error);
    } finally {
      this.pendingTransactions.delete(transactionId);
    }
  }

  /**
   * 处理购买错误
   */
  handlePurchaseError(transactionId, error) {
    const transaction = this.pendingTransactions.get(transactionId);
    if (transaction) {
      transaction.reject(new Error('购买失败: ' + error.message));
      this.pendingTransactions.delete(transactionId);
    }
  }

  /**
   * 验证收据
   * @param {object} result 购买结果
   */
  async verifyReceipt(result) {
    try {
      // 这里应该调用服务器端的收据验证接口
      // 为了演示，这里只做基本验证
      if (!result.receipt) {
        return {
          success: false,
          message: '收据为空'
        };
      }

      // TODO: 实际项目中应该将收据发送到服务器进行验证
      // const verifyResponse = await this.serverVerifyReceipt(result.receipt);
      
      // 临时验证逻辑
      return {
        success: true,
        message: '收据验证成功',
        receipt: result.receipt
      };
    } catch (error) {
      return {
        success: false,
        message: '收据验证异常: ' + error.message
      };
    }
  }

  /**
   * 服务器端收据验证（需要实现）
   * @param {string} receipt 收据数据
   */
  async serverVerifyReceipt(receipt) {
    // TODO: 实现服务器端收据验证
    // 这里应该调用后端API进行收据验证
    throw new Error('服务器端收据验证未实现');
  }

  /**
   * 完成交易
   * @param {object} result 交易结果
   */
  async finishTransaction(result) {
    return new Promise((resolve, reject) => {
      // #ifdef APP-PLUS
      plus.payment.request(this.iapChannel, {
        action: 'finish',
        transactionIdentifier: result.transactionIdentifier
      }, () => {
        console.log('交易完成:', result.transactionIdentifier);
        resolve();
      }, (error) => {
        console.error('完成交易失败:', error);
        reject(error);
      });
      // #endif
      
      // #ifndef APP-PLUS
      reject(new Error('仅支持App平台'));
      // #endif
    });
  }

  /**
   * 恢复购买
   */
  async restoreTransactions() {
    return new Promise((resolve, reject) => {
      // #ifdef APP-PLUS
      plus.payment.request(this.iapChannel, {
        action: 'restore'
      }, (result) => {
        console.log('恢复购买成功:', result);
        // 处理恢复的交易
        if (result.transactions && result.transactions.length > 0) {
          result.transactions.forEach(transaction => {
            this.handleRestoredTransaction(transaction);
          });
        }
        resolve(result);
      }, (error) => {
        console.error('恢复购买失败:', error);
        reject(error);
      });
      // #endif
      
      // #ifndef APP-PLUS
      reject(new Error('仅支持App平台'));
      // #endif
    });
  }

  /**
   * 处理恢复的交易
   */
  async handleRestoredTransaction(transaction) {
    try {
      // 验证恢复的交易
      const product = IAP_PRODUCTS[transaction.productid];
      if (product) {
        // 这里可以根据需要处理恢复的交易
        console.log('恢复交易:', transaction.productid);
      }
    } catch (error) {
      console.error('处理恢复交易失败:', error);
    }
  }

  /**
   * 生成交易ID
   */
  generateTransactionId() {
    return 'iap_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  /**
   * 获取初始化状态
   */
  getInitStatus() {
    return this.isInitialized;
  }

  /**
   * 清理资源
   */
  cleanup() {
    this.pendingTransactions.clear();
    this.products = [];
    this.isInitialized = false;
  }
}

// 创建全局实例
const iapManager = new IAPManager();

export default iapManager;

// 导出工具函数
export const IAPUtils = {
  /**
   * 格式化价格显示
   */
  formatPrice(product) {
    return product.price || `¥${product.currency}.00`;
  },

  /**
   * 获取推荐商品
   */
  getRecommendedProducts() {
    return [
      IAP_PRODUCTS['mjapp1.currency.6'],
      IAP_PRODUCTS['mjapp1.currency.18'],
      IAP_PRODUCTS['mjapp1.currency.30']
    ];
  },

  /**
   * 根据需要的算力推荐商品
   */
  recommendProductForCurrency(neededCurrency) {
    const products = Object.values(IAP_PRODUCTS);
    return products.find(product => product.currency >= neededCurrency) || products[products.length - 1];
  }
};