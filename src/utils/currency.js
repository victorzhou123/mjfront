/**
 * 算力虚拟货币系统
 * 管理用户的算力余额、消耗和充值记录
 * 使用后端API进行数据管理
 */

import api from './api.js';

class CurrencyManager {
  constructor() {
    // 不再需要本地存储，所有数据通过API获取
  }

  /**
   * 初始化货币系统（已废弃，数据由后端管理）
   */
  init() {
    // 不再需要初始化本地数据
  }

  /**
   * 获取当前算力余额（从后端API获取）
   */
  async getBalance() {
    try {
      const response = await api.currency.getBalance();
      return response.data.balance || 0;
    } catch (error) {
      console.error('获取算力余额失败:', error);
      return 0;
    }
  }

  /**
   * 增加算力余额（购买后调用）
   * @param {number} amount 增加的算力数量
   * @param {string} transactionId 交易ID
   * @param {string} source 来源（purchase/gift等）
   */
  async addBalance(amount, transactionId, source = 'purchase') {
    if (amount <= 0) {
      throw new Error('增加的算力数量必须大于0');
    }

    try {
      const response = await api.currency.recharge({
        amount: amount,
        transactionId: transactionId,
        source: source
      });
      return response.data;
    } catch (error) {
      console.error('充值算力失败:', error);
      throw error;
    }
  }

  /**
   * 消耗算力余额
   * @param {number} amount 消耗的算力数量
   * @param {string} reason 消耗原因
   */
  async consumeBalance(amount, reason = 'memo_expansion') {
    if (amount <= 0) {
      throw new Error('消耗的算力数量必须大于0');
    }

    try {
      const response = await api.currency.deduct({
        amount: amount,
        reason: reason
      });
      return response.data;
    } catch (error) {
      console.error('扣减算力失败:', error);
      throw error;
    }
  }

  /**
   * 检查是否有足够的算力
   * @param {number} amount 需要的算力数量
   */
  async hasEnoughBalance(amount) {
    const balance = await this.getBalance();
    return balance >= amount;
  }


}

// 创建全局实例
const currencyManager = new CurrencyManager();

export default currencyManager;

// 导出常量
export const CURRENCY_CONFIG = {
  EXCHANGE_RATE: 1, // 1人民币 = 1算力
  MEMO_EXPANSION_COST: 1, // 扩展1个备忘录容量需要1算力
  FREE_MEMO_LIMIT: 20, // 免费备忘录数量限制
  CURRENCY_NAME: '算力',
  CURRENCY_UNIT: '算力'
};