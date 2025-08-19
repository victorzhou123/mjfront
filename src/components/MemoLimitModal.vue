<template>
  <view v-if="visible" class="modal-overlay" @click="handleOverlayClick">
    <view class="modal-content" @click.stop>
      <!-- 关闭按钮 -->
      <view class="close-btn" @click="closeModal">
        <text class="close-icon">×</text>
      </view>

      <!-- 图标和标题 -->
      <view class="modal-header">
        <view class="limit-icon">📝</view>
        <view class="modal-title">备忘录容量已满</view>
        <view class="modal-subtitle">需要扩展容量才能继续创建</view>
      </view>

      <!-- 当前状态 -->
      <view class="status-section">
        <view class="status-item">
          <view class="status-label">当前备忘录</view>
          <view class="status-value">{{ limitStatus.currentMemoCount }}/{{ limitStatus.currentCapacity }}</view>
        </view>
        <view class="status-item">
          <view class="status-label">当前算力</view>
          <view class="status-value">{{ limitStatus.currencyBalance }} ⚡</view>
        </view>
      </view>

      <!-- 扩展选项 -->
      <view class="expansion-section">
        <view class="section-title">选择扩展数量</view>
        <view class="expansion-options">
          <view 
            v-for="option in expansionOptions" 
            :key="option.amount"
            class="expansion-option"
            :class="{ 'selected': selectedExpansion === option.amount, 'insufficient': !option.affordable }"
            @click="selectExpansion(option)"
          >
            <view class="option-amount">+{{ option.amount }}</view>
            <view class="option-cost">{{ option.cost }}算力</view>
            <view v-if="!option.affordable" class="option-insufficient">算力不足</view>
          </view>
        </view>
      </view>

      <!-- 算力不足提示 -->
      <view v-if="needMoreCurrency" class="insufficient-section">
        <view class="insufficient-message">
          <text class="insufficient-icon">💡</text>
          <text class="insufficient-text">算力不足，需要购买更多算力</text>
        </view>
        <view class="recommended-product" v-if="recommendedProduct">
          <view class="product-info">
            <view class="product-title">{{ recommendedProduct.title }}</view>
            <view class="product-desc">{{ recommendedProduct.currency }}算力 - {{ recommendedProduct.price }}</view>
          </view>
        </view>
      </view>

      <!-- 操作按钮 -->
      <view class="action-buttons">
        <button 
          v-if="needMoreCurrency"
          class="btn btn-primary"
          @click="goToCurrencyStore"
        >
          购买算力
        </button>
        <button 
          v-else
          class="btn btn-primary"
          :class="{ 'disabled': !selectedExpansion || expanding }"
          :disabled="!selectedExpansion || expanding"
          @click="expandCapacity"
        >
          <text v-if="expanding">扩展中...</text>
          <text v-else>立即扩展</text>
        </button>
        <button class="btn btn-secondary" @click="closeModal">
          稍后再说
        </button>
      </view>

      <!-- 说明文字 -->
      <view class="help-text">
        <text class="help-icon">ℹ️</text>
        <text class="help-content">
          扩展后的容量永久有效，算力消耗后不可恢复
        </text>
      </view>
    </view>
  </view>
</template>

<script>
import memoLimitManager from '@/utils/memoLimit.js';
import currencyManager from '@/utils/currency.js';
import { IAPUtils } from '@/utils/iap.js';

export default {
  name: 'MemoLimitModal',
  props: {
    visible: {
      type: Boolean,
      default: false
    },
    limitStatus: {
      type: Object,
      default: () => ({})
    }
  },
  emits: ['close', 'expanded'],
  data() {
    return {
      selectedExpansion: 1,
      expanding: false,
      expansionOptions: [
        { amount: 1, cost: 1 },
        { amount: 5, cost: 5 },
        { amount: 10, cost: 10 },
        { amount: 20, cost: 20 }
      ],
      recommendedProduct: null
    };
  },
  computed: {
    /**
     * 是否需要更多算力
     */
    needMoreCurrency() {
      if (!this.limitStatus.currencyBalance) return true;
      return this.limitStatus.currencyBalance < 1;
    },

    /**
     * 处理扩展选项的可负担性
     */
    processedExpansionOptions() {
      const balance = this.limitStatus.currencyBalance || 0;
      return this.expansionOptions.map(option => ({
        ...option,
        affordable: balance >= option.cost
      }));
    }
  },
  watch: {
    visible(newVal) {
      if (newVal) {
        this.initModal();
      }
    },
    limitStatus: {
      handler() {
        this.updateExpansionOptions();
      },
      deep: true
    }
  },
  methods: {
    /**
     * 初始化弹窗
     */
    initModal() {
      this.selectedExpansion = 1;
      this.expanding = false;
      this.updateExpansionOptions();
      this.loadRecommendedProduct();
    },

    /**
     * 更新扩展选项
     */
    updateExpansionOptions() {
      const balance = this.limitStatus.currencyBalance || 0;
      this.expansionOptions = this.expansionOptions.map(option => ({
        ...option,
        affordable: balance >= option.cost
      }));

      // 如果当前选择的选项不可负担，重置选择
      const selectedOption = this.expansionOptions.find(opt => opt.amount === this.selectedExpansion);
      if (selectedOption && !selectedOption.affordable) {
        const affordableOption = this.expansionOptions.find(opt => opt.affordable);
        this.selectedExpansion = affordableOption ? affordableOption.amount : null;
      }
    },

    /**
     * 加载推荐商品
     */
    loadRecommendedProduct() {
      if (this.needMoreCurrency) {
        this.recommendedProduct = IAPUtils.recommendProductForCurrency(1);
      }
    },

    /**
     * 选择扩展数量
     */
    selectExpansion(option) {
      if (!option.affordable) {
        this.showInsufficientMessage();
        return;
      }
      this.selectedExpansion = option.amount;
    },

    /**
     * 扩展容量
     */
    async expandCapacity() {
      if (!this.selectedExpansion || this.expanding) return;

      this.expanding = true;
      
      try {
        const result = await memoLimitManager.expandCapacity(this.selectedExpansion);
        
        if (result.success) {
          this.showSuccess(`成功扩展${this.selectedExpansion}个备忘录容量！`);
          this.$emit('expanded', {
            amount: this.selectedExpansion,
            newCapacity: result.newCapacity,
            remainingBalance: result.remainingBalance
          });
          this.closeModal();
        } else {
          this.showError(result.message || '扩展失败');
        }
        
      } catch (error) {
        console.error('扩展容量失败:', error);
        this.showError('扩展失败：' + error.message);
      } finally {
        this.expanding = false;
      }
    },

    /**
     * 前往算力商店
     */
    goToCurrencyStore() {
      uni.navigateTo({
        url: '/pages/currency-store/currency-store'
      });
      this.closeModal();
    },

    /**
     * 关闭弹窗
     */
    closeModal() {
      this.$emit('close');
    },

    /**
     * 处理遮罩点击
     */
    handleOverlayClick() {
      this.closeModal();
    },

    /**
     * 显示算力不足消息
     */
    showInsufficientMessage() {
      uni.showToast({
        title: '算力不足，请先购买算力',
        icon: 'none',
        duration: 2000
      });
    },

    /**
     * 显示成功消息
     */
    showSuccess(message) {
      uni.showToast({
        title: message,
        icon: 'success',
        duration: 2000
      });
    },

    /**
     * 显示错误消息
     */
    showError(message) {
      uni.showToast({
        title: message,
        icon: 'none',
        duration: 3000
      });
    }
  }
};
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.modal-content {
  background: white;
  border-radius: 20px;
  padding: 24px;
  width: 100%;
  max-width: 400px;
  max-height: 80vh;
  overflow-y: auto;
  position: relative;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.close-btn {
  position: absolute;
  top: 16px;
  right: 16px;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5f5f5;
  border-radius: 50%;
}

.close-icon {
  font-size: 20px;
  color: #666;
  font-weight: bold;
}

/* 头部 */
.modal-header {
  text-align: center;
  margin-bottom: 24px;
}

.limit-icon {
  font-size: 48px;
  margin-bottom: 12px;
}

.modal-title {
  font-size: 20px;
  font-weight: bold;
  color: #333;
  margin-bottom: 8px;
}

.modal-subtitle {
  font-size: 14px;
  color: #666;
  line-height: 1.4;
}

/* 状态区域 */
.status-section {
  background: #f8f9fa;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 20px;
}

.status-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.status-item:last-child {
  margin-bottom: 0;
}

.status-label {
  font-size: 14px;
  color: #666;
}

.status-value {
  font-size: 16px;
  font-weight: bold;
  color: #333;
}

/* 扩展选项 */
.expansion-section {
  margin-bottom: 20px;
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  color: #333;
  margin-bottom: 12px;
}

.expansion-options {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}

.expansion-option {
  background: #f8f9fa;
  border: 2px solid transparent;
  border-radius: 12px;
  padding: 16px;
  text-align: center;
  transition: all 0.3s ease;
  position: relative;
}

.expansion-option.selected {
  border-color: #667eea;
  background: rgba(102, 126, 234, 0.1);
}

.expansion-option.insufficient {
  background: #f5f5f5;
  opacity: 0.6;
}

.option-amount {
  font-size: 18px;
  font-weight: bold;
  color: #333;
  margin-bottom: 4px;
}

.option-cost {
  font-size: 14px;
  color: #667eea;
}

.option-insufficient {
  position: absolute;
  top: 4px;
  right: 4px;
  font-size: 10px;
  color: #f44336;
  background: rgba(244, 67, 54, 0.1);
  padding: 2px 6px;
  border-radius: 4px;
}

/* 算力不足区域 */
.insufficient-section {
  background: rgba(255, 193, 7, 0.1);
  border: 1px solid rgba(255, 193, 7, 0.3);
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 20px;
}

.insufficient-message {
  display: flex;
  align-items: center;
  margin-bottom: 12px;
}

.insufficient-icon {
  margin-right: 8px;
}

.insufficient-text {
  font-size: 14px;
  color: #856404;
  font-weight: 500;
}

.recommended-product {
  background: white;
  border-radius: 8px;
  padding: 12px;
}

.product-info {
  text-align: center;
}

.product-title {
  font-size: 16px;
  font-weight: 600;
  color: #333;
  margin-bottom: 4px;
}

.product-desc {
  font-size: 14px;
  color: #667eea;
}

/* 操作按钮 */
.action-buttons {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 16px;
}

.btn {
  height: 48px;
  border: none;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 600;
  transition: all 0.3s ease;
}

.btn-primary {
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white;
}

.btn-primary.disabled {
  background: #ccc;
  color: #999;
}

.btn-secondary {
  background: #f8f9fa;
  color: #666;
  border: 1px solid #dee2e6;
}

/* 帮助文字 */
.help-text {
  display: flex;
  align-items: flex-start;
  background: rgba(102, 126, 234, 0.05);
  border-radius: 8px;
  padding: 12px;
}

.help-icon {
  margin-right: 8px;
  margin-top: 2px;
}

.help-content {
  flex: 1;
  font-size: 12px;
  color: #666;
  line-height: 1.4;
}
</style>