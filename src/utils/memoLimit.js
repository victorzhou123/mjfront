/**
 * 备忘录数量限制和算力消耗逻辑
 * 管理备忘录创建限制、算力消耗和容量扩展
 */

import currencyManager, { CURRENCY_CONFIG } from './currency.js';
import api from './api.js';

class MemoLimitManager {
  constructor() {
    // 移除本地存储，改为使用后端API
  }

  /**
   * 初始化限制管理器 - 现在使用后端API
   */
  init() {
    // 不再需要本地初始化，数据从后端获取
  }

  /**
   * 获取当前备忘录数量 - 从后端API获取
   */
  async getCurrentMemoCount() {
    try {
      const response = await api.memos.getList({ page: 1, limit: 1 });
      return response.data.total || 0;
    } catch (error) {
      console.error('获取备忘录数量失败:', error);
      return 0;
    }
  }

  /**
   * 获取当前容量上限 - 使用基础免费限制
   * 注：扩展容量功能已简化，只使用基础免费限制
   */
  async getCurrentCapacity() {
    // 简化为只返回免费限制，不再支持扩展容量统计
    return CURRENCY_CONFIG.FREE_MEMO_LIMIT;
  }

  /**
   * 获取剩余可创建数量
   */
  async getRemainingCapacity() {
    const currentCount = await this.getCurrentMemoCount();
    const currentCapacity = await this.getCurrentCapacity();
    return Math.max(0, currentCapacity - currentCount);
  }

  /**
   * 检查是否可以创建新备忘录
   */
  async canCreateMemo() {
    const remaining = await this.getRemainingCapacity();
    return remaining > 0;
  }

  /**
   * 检查是否需要消耗算力
   */
  async needsCurrencyToCreate() {
    const currentCount = await this.getCurrentMemoCount();
    return currentCount >= CURRENCY_CONFIG.FREE_MEMO_LIMIT;
  }

  /**
   * 创建备忘录（检查限制并消耗算力）
   * @param {boolean} forceExpand 是否强制扩展容量
   */
  async createMemo(forceExpand = false) {
    const currentCount = await this.getCurrentMemoCount();
    const currentCapacity = await this.getCurrentCapacity();

    // 检查是否超出当前容量
    if (currentCount >= currentCapacity) {
      if (!forceExpand) {
        throw new Error('已达到备忘录数量上限，需要扩展容量');
      }

      // 尝试扩展容量
      const expandResult = await this.expandCapacity(1);
      if (!expandResult.success) {
        throw new Error(expandResult.message);
      }
    }

    // 备忘录计数由后端API自动管理，这里只返回状态
    const newCount = currentCount + 1;
    const newCapacity = await this.getCurrentCapacity();

    return {
      success: true,
      currentCount: newCount,
      remainingCapacity: newCapacity - newCount
    };
  }

  /**
   * 删除备忘录 - 备忘录计数由后端API自动管理
   */
  async deleteMemo() {
    const currentCount = await this.getCurrentMemoCount();
    const currentCapacity = await this.getCurrentCapacity();
    
    // 备忘录计数由后端API自动管理
    const newCount = Math.max(0, currentCount - 1);

    return {
      success: true,
      currentCount: newCount,
      remainingCapacity: currentCapacity - newCount
    };
  }

  /**
   * 扩展容量（消耗算力）- 使用后端API
   * @param {number} amount 扩展的数量
   */
  async expandCapacity(amount = 1) {
    if (amount <= 0) {
      return {
        success: false,
        message: '扩展数量必须大于0'
      };
    }

    const requiredCurrency = amount * CURRENCY_CONFIG.MEMO_EXPANSION_COST;
    
    try {
      // 检查算力余额
      const hasEnough = await currencyManager.hasEnoughBalance(requiredCurrency);
      if (!hasEnough) {
        const currentBalance = await currencyManager.getBalance();
        return {
          success: false,
          message: `算力不足，需要${requiredCurrency}算力，当前余额${currentBalance}算力`,
          requiredCurrency,
          currentBalance
        };
      }

      // 消耗算力
      await currencyManager.consumeBalance(
        requiredCurrency, 
        `扩展备忘录容量${amount}个`
      );

      // 容量扩展信息由后端API管理，这里只返回成功状态
      const newCapacity = await this.getCurrentCapacity();
      const remainingBalance = await currencyManager.getBalance();

      return {
        success: true,
        message: `成功扩展${amount}个备忘录容量`,
        expandedAmount: amount,
        newCapacity: newCapacity,
        remainingBalance: remainingBalance
      };

    } catch (error) {
      return {
        success: false,
        message: error.message || '扩展容量时发生错误'
      };
    }
  }

  /**
   * 获取限制状态信息 - 从后端API获取实时数据
   */
  async getStatus() {
    try {
      const currentMemoCount = await this.getCurrentMemoCount();
      const currentCapacity = await this.getCurrentCapacity();
      const remainingCapacity = await this.getRemainingCapacity();
      const needsCurrency = await this.needsCurrencyToCreate();
      const canCreate = await this.canCreateMemo();
      const currencyBalance = await currencyManager.getBalance();
      
      // 简化扩展容量信息，不再从后端获取统计数据
      const expandedCapacity = 0;

      return {
        currentMemoCount: currentMemoCount,
        currentCapacity: currentCapacity,
        expandedCapacity: expandedCapacity,
        remainingCapacity: remainingCapacity,
        canCreateMemo: canCreate,
        needsCurrencyToCreate: needsCurrency,
        freeLimit: CURRENCY_CONFIG.FREE_MEMO_LIMIT,
        expansionCost: CURRENCY_CONFIG.MEMO_EXPANSION_COST,
        currencyBalance: currencyBalance
      };
    } catch (error) {
      console.error('获取状态信息失败:', error);
      return null;
    }
  }

  /**
   * 同步备忘录数量（从后端API获取）
   */
  async syncMemoCount() {
    try {
      // 直接从后端API获取备忘录数量
      const actualCount = await this.getCurrentMemoCount();
      console.log(`同步备忘录数量: ${actualCount}`);
      return actualCount;
    } catch (error) {
      console.error('同步备忘录数量失败:', error);
      return 0;
    }
  }

  /**
   * 重置限制数据（仅用于测试）
   * 注意：数据现在由后端API管理，此方法仅保留接口兼容性
   */
  reset() {
    console.log('重置限制数据 - 数据现在由后端API管理');
    // 不再需要本地存储操作，数据由后端管理
  }
}

// 创建全局实例
const memoLimitManager = new MemoLimitManager();

export default memoLimitManager;

// 导出工具函数
export const MemoLimitUtils = {
  /**
   * 格式化容量信息
   */
  formatCapacityInfo(status) {
    if (!status) return '';
    
    return `${status.currentMemoCount}/${status.currentCapacity} 个备忘录`;
  },

  /**
   * 获取限制提示文本
   */
  getLimitMessage(status) {
    if (!status) return '';
    
    if (status.canCreateMemo) {
      if (status.needsCurrencyToCreate) {
        return `还可创建 ${status.remainingCapacity} 个备忘录`;
      } else {
        return `免费额度还可创建 ${Math.min(status.remainingCapacity, status.freeLimit - status.currentMemoCount)} 个备忘录`;
      }
    } else {
      return `已达到上限，需要消耗 ${status.expansionCost} 算力扩展容量`;
    }
  }
};