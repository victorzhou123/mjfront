<template>
  <view class="currency-balance" :class="{ 'compact': compact, 'clickable': clickable }" @click="handleClick">
    <!-- 完整模式 -->
    <view v-if="!compact" class="balance-full">
      <view class="balance-header">
        <view class="balance-icon">⚡</view>
        <view class="balance-label">算力余额</view>
        <view v-if="showRefresh" class="refresh-btn" @click.stop="refreshBalance">
          <text class="refresh-icon" :class="{ 'rotating': refreshing }">🔄</text>
        </view>
      </view>
      <view class="balance-amount">
        <text class="amount-number">{{ displayBalance }}</text>
        <text class="amount-unit">算力</text>
      </view>
      <view v-if="showQuickBuy" class="quick-actions">
        <button class="quick-buy-btn" @click.stop="goToCurrencyStore">
          <text class="buy-icon">💰</text>
          <text class="buy-text">购买算力</text>
        </button>
      </view>
    </view>

    <!-- 紧凑模式 -->
    <view v-else class="balance-compact">
      <view class="compact-icon">⚡</view>
      <view class="compact-amount">{{ displayBalance }}</view>
      <view v-if="showQuickBuy" class="compact-buy" @click.stop="goToCurrencyStore">
        <text class="compact-buy-icon">+</text>
      </view>
    </view>

    <!-- 加载状态 -->
    <view v-if="loading" class="loading-overlay">
      <view class="loading-spinner"></view>
    </view>

    <!-- 低余额警告 -->
    <view v-if="showLowBalanceWarning" class="low-balance-warning">
      <view class="warning-icon">⚠️</view>
      <view class="warning-text">算力余额不足</view>
    </view>
  </view>
</template>

<script>
import currencyManager from '@/utils/currency.js';

export default {
  name: 'CurrencyBalance',
  props: {
    // 是否使用紧凑模式
    compact: {
      type: Boolean,
      default: false
    },
    // 是否可点击
    clickable: {
      type: Boolean,
      default: false
    },
    // 是否显示刷新按钮
    showRefresh: {
      type: Boolean,
      default: true
    },
    // 是否显示快速购买按钮
    showQuickBuy: {
      type: Boolean,
      default: true
    },
    // 是否自动刷新
    autoRefresh: {
      type: Boolean,
      default: true
    },
    // 自动刷新间隔（毫秒）
    refreshInterval: {
      type: Number,
      default: 30000 // 30秒
    },
    // 低余额阈值
    lowBalanceThreshold: {
      type: Number,
      default: 5
    }
  },
  emits: ['click', 'balance-updated', 'low-balance'],
  data() {
    return {
      balance: 0,
      loading: false,
      refreshing: false,
      refreshTimer: null
    };
  },
  computed: {
    /**
     * 显示的余额（格式化）
     */
    displayBalance() {
      if (this.balance >= 10000) {
        return (this.balance / 1000).toFixed(1) + 'K';
      }
      return this.balance.toString();
    },

    /**
     * 是否显示低余额警告
     */
    showLowBalanceWarning() {
      return this.balance <= this.lowBalanceThreshold && this.balance >= 0;
    }
  },
  mounted() {
    this.initBalance();
    this.setupAutoRefresh();
  },
  beforeUnmount() {
    this.clearAutoRefresh();
  },
  methods: {
    /**
     * 初始化余额
     */
    async initBalance() {
      this.loading = true;
      try {
        await this.loadBalance();
      } catch (error) {
        console.error('初始化余额失败:', error);
      } finally {
        this.loading = false;
      }
    },

    /**
     * 加载余额
     */
    async loadBalance() {
      try {
        const balance = await currencyManager.getBalance();
        const oldBalance = this.balance;
        this.balance = balance;
        
        // 发出余额更新事件
        this.$emit('balance-updated', {
          balance: balance,
          oldBalance: oldBalance,
          changed: balance !== oldBalance
        });

        // 检查低余额
        if (this.showLowBalanceWarning) {
          this.$emit('low-balance', {
            balance: balance,
            threshold: this.lowBalanceThreshold
          });
        }

      } catch (error) {
        console.error('加载余额失败:', error);
        throw error;
      }
    },

    /**
     * 刷新余额
     */
    async refreshBalance() {
      if (this.refreshing) return;
      
      this.refreshing = true;
      try {
        await this.loadBalance();
        this.showRefreshSuccess();
      } catch (error) {
        console.error('刷新余额失败:', error);
        this.showRefreshError();
      } finally {
        this.refreshing = false;
      }
    },

    /**
     * 设置自动刷新
     */
    setupAutoRefresh() {
      if (!this.autoRefresh) return;
      
      this.refreshTimer = setInterval(() => {
        this.loadBalance().catch(error => {
          console.error('自动刷新余额失败:', error);
        });
      }, this.refreshInterval);
    },

    /**
     * 清除自动刷新
     */
    clearAutoRefresh() {
      if (this.refreshTimer) {
        clearInterval(this.refreshTimer);
        this.refreshTimer = null;
      }
    },

    /**
     * 前往算力商店
     */
    goToCurrencyStore() {
      uni.navigateTo({
        url: '/pages/currency-store/currency-store'
      });
    },

    /**
     * 处理点击事件
     */
    handleClick() {
      if (this.clickable) {
        this.$emit('click', {
          balance: this.balance
        });
      } else {
        // 默认跳转到算力详情页面
        this.goToCurrencyDetail();
      }
    },

    /**
     * 前往算力详情页面
     */
    goToCurrencyDetail() {
      uni.navigateTo({
        url: '/pages/currency-detail/currency-detail'
      });
    },

    /**
     * 显示刷新成功提示
     */
    showRefreshSuccess() {
      if (!this.compact) {
        uni.showToast({
          title: '余额已更新',
          icon: 'success',
          duration: 1500
        });
      }
    },

    /**
     * 显示刷新错误提示
     */
    showRefreshError() {
      uni.showToast({
        title: '刷新失败',
        icon: 'none',
        duration: 2000
      });
    },

    /**
     * 手动更新余额（供外部调用）
     */
    async updateBalance(newBalance) {
      if (typeof newBalance === 'number') {
        const oldBalance = this.balance;
        this.balance = newBalance;
        
        this.$emit('balance-updated', {
          balance: newBalance,
          oldBalance: oldBalance,
          changed: newBalance !== oldBalance
        });
      } else {
        await this.loadBalance();
      }
    },

    /**
     * 获取当前余额（供外部调用）
     */
    getCurrentBalance() {
      return this.balance;
    }
  }
};
</script>

<style scoped>
.currency-balance {
  position: relative;
  overflow: hidden;
}

.currency-balance.clickable {
  cursor: pointer;
}

.currency-balance:not(.clickable) {
  cursor: pointer;
}

.currency-balance:not(.clickable):active {
  transform: scale(0.98);
  transition: transform 0.2s ease;
}

/* 完整模式样式 */
.balance-full {
  background: linear-gradient(135deg, #667eea, #764ba2);
  border-radius: 16px;
  padding: 20px;
  color: white;
  box-shadow: 0 8px 32px rgba(102, 126, 234, 0.3);
}

.balance-header {
  display: flex;
  align-items: center;
  margin-bottom: 12px;
}

.balance-icon {
  font-size: 24px;
  margin-right: 8px;
}

.balance-label {
  flex: 1;
  font-size: 16px;
  font-weight: 500;
  opacity: 0.9;
}

.refresh-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 50%;
  transition: all 0.3s ease;
}

.refresh-btn:active {
  background: rgba(255, 255, 255, 0.3);
  transform: scale(0.95);
}

.refresh-icon {
  font-size: 16px;
  transition: transform 0.5s ease;
}

.refresh-icon.rotating {
  animation: rotate 1s linear infinite;
}

@keyframes rotate {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.balance-amount {
  display: flex;
  align-items: baseline;
  margin-bottom: 16px;
}

.amount-number {
  font-size: 32px;
  font-weight: bold;
  margin-right: 8px;
}

.amount-unit {
  font-size: 16px;
  opacity: 0.8;
}

.quick-actions {
  display: flex;
  justify-content: flex-end;
}

.quick-buy-btn {
  background: rgba(255, 255, 255, 0.2);
  border: none;
  border-radius: 20px;
  padding: 8px 16px;
  color: white;
  font-size: 14px;
  display: flex;
  align-items: center;
  transition: all 0.3s ease;
}

.quick-buy-btn:active {
  background: rgba(255, 255, 255, 0.3);
  transform: scale(0.95);
}

.buy-icon {
  margin-right: 4px;
}

.buy-text {
  font-weight: 500;
}

/* 紧凑模式样式 */
.balance-compact {
  display: flex;
  align-items: center;
  background: rgba(102, 126, 234, 0.1);
  border: 1px solid rgba(102, 126, 234, 0.2);
  border-radius: 20px;
  padding: 8px 12px;
  min-width: 80px;
}

.compact-icon {
  font-size: 16px;
  margin-right: 6px;
}

.compact-amount {
  flex: 1;
  font-size: 14px;
  font-weight: 600;
  color: #667eea;
}

.compact-buy {
  width: 20px;
  height: 20px;
  background: #667eea;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-left: 6px;
  transition: all 0.3s ease;
}

.compact-buy:active {
  transform: scale(0.9);
}

.compact-buy-icon {
  color: white;
  font-size: 12px;
  font-weight: bold;
}

/* 加载状态 */
.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: inherit;
}

.loading-spinner {
  width: 20px;
  height: 20px;
  border: 2px solid #f3f3f3;
  border-top: 2px solid #667eea;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* 低余额警告 */
.low-balance-warning {
  position: absolute;
  top: -8px;
  right: -8px;
  background: #ff4757;
  color: white;
  border-radius: 12px;
  padding: 4px 8px;
  font-size: 10px;
  display: flex;
  align-items: center;
  box-shadow: 0 2px 8px rgba(255, 71, 87, 0.3);
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

.warning-icon {
  font-size: 10px;
  margin-right: 2px;
}

.warning-text {
  font-weight: 500;
  white-space: nowrap;
}
</style>