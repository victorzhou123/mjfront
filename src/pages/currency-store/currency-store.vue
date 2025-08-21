<template>
  <view class="currency-store">
    <!-- 导航栏 -->
    <view class="navbar">
      <view class="nav-left" @click="goBack">
        <text class="nav-icon">‹</text>
      </view>
      <view class="nav-title">算力商店</view>
      <view class="nav-right"></view>
    </view>

    <!-- 当前余额卡片 -->
    <view class="balance-card">
      <view class="balance-header">
        <view class="balance-icon">⚡</view>
        <view class="balance-info">
          <text class="balance-title">当前算力</text>
          <text class="balance-amount">{{ currentBalance }}</text>
        </view>
        <view class="balance-actions">
          <view class="detail-btn" @click="goToCurrencyDetail">
            <text class="detail-icon">📊</text>
          </view>
        </view>
      </view>
      <view class="balance-description">
        算力用于扩展备忘录容量，1算力可增加1个备忘录位置
      </view>
    </view>

    <!-- 使用说明 -->
    <view class="usage-info">
      <view class="info-title">💡 使用说明</view>
      <view class="info-content">
        <view class="info-item">
          <text class="info-bullet">•</text>
          <text class="info-text">免费用户可创建20个备忘录</text>
        </view>
        <view class="info-item">
          <text class="info-bullet">•</text>
          <text class="info-text">超出限制后需消耗1算力扩展1个位置</text>
        </view>
        <view class="info-item">
          <text class="info-bullet">•</text>
          <text class="info-text">算力购买后永久有效，不会过期</text>
        </view>
      </view>
    </view>

    <!-- 商品列表 -->
    <view class="products-section">
      <view class="section-title">选择算力套餐</view>
      <view class="products-grid">
        <view 
          v-for="product in products" 
          :key="product.productId"
          class="product-card"
          :class="{ 'recommended': product.recommended }"
          @click="selectProduct(product)"
        >
          <view v-if="product.recommended" class="recommended-badge">推荐</view>
          <view class="product-icon">⚡</view>
          <view class="product-title">{{ product.title }}</view>
          <view class="product-currency">{{ product.currency }}算力</view>
          <view class="product-price">{{ product.price }}</view>
          <view v-if="product.bonus" class="product-bonus">{{ product.bonus }}</view>
        </view>
      </view>
    </view>

    <!-- 购买按钮 -->
    <view class="purchase-section">
      <view v-if="selectedProduct" class="selected-info">
        <text class="selected-text">已选择：{{ selectedProduct.title }}</text>
        <text class="selected-price">{{ selectedProduct.price }}</text>
      </view>
      <button 
        class="purchase-btn"
        :class="{ 'disabled': !selectedProduct || purchasing }"
        :disabled="!selectedProduct || purchasing"
        @click="purchaseProduct"
      >
        <text v-if="purchasing">购买中...</text>
        <text v-else-if="selectedProduct">立即购买</text>
        <text v-else>请选择套餐</text>
      </button>
    </view>

    <!-- 交易记录 -->
    <view class="transactions-section">
      <view class="section-title" @click="toggleTransactions">
        <text>交易记录</text>
        <text class="toggle-icon" :class="{ 'expanded': showTransactions }">›</text>
      </view>
      <view v-if="showTransactions" class="transactions-list">
        <view 
          v-for="transaction in transactions" 
          :key="transaction.id"
          class="transaction-item"
        >
          <view class="transaction-info">
            <view class="transaction-type">
              <text class="transaction-icon">{{ getTransactionIcon(transaction.type) }}</text>
              <text class="transaction-desc">{{ getTransactionDesc(transaction) }}</text>
            </view>
            <view class="transaction-time">{{ formatTime(transaction.timestamp) }}</view>
          </view>
          <view class="transaction-amount" :class="transaction.type">
            {{ transaction.type === 'credit' ? '+' : '-' }}{{ transaction.amount }}
          </view>
        </view>
        <view v-if="transactions.length === 0" class="empty-transactions">
          暂无交易记录
        </view>
      </view>
    </view>

    <!-- 加载遮罩 -->
    <view v-if="loading" class="loading-overlay">
      <view class="loading-content">
        <view class="loading-spinner"></view>
        <text class="loading-text">{{ loadingText }}</text>
      </view>
    </view>
  </view>
</template>

<script>
import currencyManager from '@/utils/currency.js';
import iapManager, { IAP_PRODUCTS, IAPUtils } from '@/utils/iap.js';

export default {
  name: 'CurrencyStore',
  data() {
    return {
      currentBalance: 0,
      products: [],
      selectedProduct: null,
      purchasing: false,
      loading: false,
      loadingText: '',
      showTransactions: false,
      transactions: []
    };
  },
  onLoad() {
    this.initPage();
  },
  async onShow() {
    await this.refreshBalance();
    await this.loadTransactions();
  },
  methods: {
    /**
     * 初始化页面
     */
    async initPage() {
      this.loading = true;
      this.loadingText = '正在加载...';
      
      try {
        // 加载当前余额
        await this.refreshBalance();
        
        // 初始化应用内购买
        const iapInitialized = await iapManager.init();
        if (iapInitialized) {
          this.loadProducts();
        } else {
          this.showError('应用内购买初始化失败');
        }
        
        // 加载交易记录
        await this.loadTransactions();
        
      } catch (error) {
        console.error('页面初始化失败:', error);
        this.showError('页面加载失败');
      } finally {
        this.loading = false;
      }
    },

    /**
     * 刷新余额 - 从后端获取实时数据
     */
    async refreshBalance() {
      try {
        this.currentBalance = await currencyManager.getBalance();
      } catch (error) {
        console.error('获取余额失败:', error);
        this.showError('获取余额失败');
      }
    },

    /**
     * 加载商品列表
     */
    loadProducts() {
      const iapProducts = iapManager.getProducts();
      
      this.products = Object.values(IAP_PRODUCTS).map(product => ({
        ...product,
        recommended: product.productId === 'mjapp1.currency.18',
        bonus: this.getProductBonus(product)
      }));
      
      // 如果IAP已加载商品信息，合并价格信息
      if (iapProducts.length > 0) {
        this.products = this.products.map(product => {
          const iapProduct = iapProducts.find(p => p.productid === product.productId);
          return {
            ...product,
            price: iapProduct ? iapProduct.price : product.price
          };
        });
      }
    },

    /**
     * 获取商品奖励信息
     */
    getProductBonus(product) {
      if (product.currency >= 30) {
        return '超值优惠';
      } else if (product.currency >= 18) {
        return '热门选择';
      }
      return null;
    },

    /**
     * 选择商品
     */
    selectProduct(product) {
      if (this.purchasing) return;
      
      this.selectedProduct = this.selectedProduct?.productId === product.productId 
        ? null 
        : product;
    },

    /**
     * 购买商品
     */
    async purchaseProduct() {
      if (!this.selectedProduct || this.purchasing) return;
      
      this.purchasing = true;
      this.loading = true;
      this.loadingText = '正在处理购买...';
      
      try {
        const result = await iapManager.purchaseProduct(this.selectedProduct.productId);
        
        if (result.success) {
          // 购买成功
          this.showSuccess(`成功购买${result.currency}算力！`);
          await this.refreshBalance();
          await this.loadTransactions();
          this.selectedProduct = null;
        } else {
          this.showError('购买失败：' + (result.error || '未知错误'));
        }
        
      } catch (error) {
        console.error('购买失败:', error);
        this.showError('购买失败：' + error.message);
      } finally {
        this.purchasing = false;
        this.loading = false;
      }
    },

    /**
     * 加载交易记录 - 从后端获取实时数据
     */
    async loadTransactions() {
      try {
        this.transactions = await currencyManager.getTransactions(10);
      } catch (error) {
        console.error('获取交易记录失败:', error);
        this.showError('获取交易记录失败');
      }
    },

    /**
     * 切换交易记录显示
     */
    toggleTransactions() {
      this.showTransactions = !this.showTransactions;
    },

    /**
     * 获取交易图标
     */
    getTransactionIcon(type) {
      return type === 'credit' ? '💰' : '⚡';
    },

    /**
     * 获取交易描述
     */
    getTransactionDesc(transaction) {
      if (transaction.type === 'credit') {
        return transaction.source === 'purchase' ? '购买算力' : '获得算力';
      } else {
        return transaction.reason === 'memo_expansion' ? '扩展备忘录容量' : '消耗算力';
      }
    },

    /**
     * 格式化时间
     */
    formatTime(timestamp) {
      const date = new Date(timestamp);
      const now = new Date();
      const diff = now - date;
      
      if (diff < 60000) {
        return '刚刚';
      } else if (diff < 3600000) {
        return Math.floor(diff / 60000) + '分钟前';
      } else if (diff < 86400000) {
        return Math.floor(diff / 3600000) + '小时前';
      } else {
        return date.toLocaleDateString();
      }
    },

    /**
     * 返回上一页
     */
    goBack() {
      uni.navigateBack();
    },

    /**
     * 跳转到算力详情页面
     */
    goToCurrencyDetail() {
      uni.navigateTo({
        url: '/pages/currency-detail/currency-detail'
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
.currency-store {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding-bottom: 20px;
}

/* 导航栏 */
.navbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 44px 20px 20px;
  color: white;
}

.nav-left {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.nav-icon {
  font-size: 24px;
  font-weight: bold;
}

.nav-title {
  font-size: 18px;
  font-weight: 600;
}

.nav-right {
  width: 40px;
}

/* 余额卡片 */
.balance-card {
  margin: 0 20px 20px;
  background: rgba(255, 255, 255, 0.95);
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
}

.balance-header {
  display: flex;
  align-items: center;
  margin-bottom: 12px;
}

.balance-icon {
  width: 48px;
  height: 48px;
  background: linear-gradient(135deg, #ffd700, #ffed4e);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  margin-right: 16px;
}

.balance-info {
  flex: 1;
}

.balance-actions {
  display: flex;
  align-items: center;
}

.detail-btn {
  width: 36px;
  height: 36px;
  background: rgba(102, 126, 234, 0.1);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
}

.detail-btn:active {
  background: rgba(102, 126, 234, 0.2);
  transform: scale(0.95);
}

.detail-icon {
  font-size: 16px;
}

.balance-title {
  display: block;
  font-size: 14px;
  color: #666;
  margin-bottom: 4px;
}

.balance-amount {
  display: block;
  font-size: 32px;
  font-weight: bold;
  color: #333;
}

.balance-description {
  font-size: 14px;
  color: #888;
  line-height: 1.4;
}

/* 使用说明 */
.usage-info {
  margin: 0 20px 20px;
  background: rgba(255, 255, 255, 0.9);
  border-radius: 12px;
  padding: 16px;
}

.info-title {
  font-size: 16px;
  font-weight: 600;
  color: #333;
  margin-bottom: 12px;
}

.info-item {
  display: flex;
  align-items: flex-start;
  margin-bottom: 8px;
}

.info-bullet {
  color: #667eea;
  margin-right: 8px;
  font-weight: bold;
}

.info-text {
  flex: 1;
  font-size: 14px;
  color: #666;
  line-height: 1.4;
}

/* 商品区域 */
.products-section {
  margin: 0 20px 20px;
}

.section-title {
  font-size: 18px;
  font-weight: 600;
  color: white;
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.products-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.product-card {
  background: rgba(255, 255, 255, 0.95);
  border-radius: 12px;
  padding: 20px;
  text-align: center;
  position: relative;
  border: 2px solid transparent;
  transition: all 0.3s ease;
}

.product-card.recommended {
  border-color: #ffd700;
  box-shadow: 0 4px 20px rgba(255, 215, 0, 0.3);
}

.recommended-badge {
  position: absolute;
  top: -8px;
  right: -8px;
  background: #ffd700;
  color: #333;
  font-size: 12px;
  font-weight: bold;
  padding: 4px 8px;
  border-radius: 8px;
}

.product-icon {
  font-size: 32px;
  margin-bottom: 8px;
}

.product-title {
  font-size: 16px;
  font-weight: 600;
  color: #333;
  margin-bottom: 4px;
}

.product-currency {
  font-size: 14px;
  color: #667eea;
  margin-bottom: 8px;
}

.product-price {
  font-size: 18px;
  font-weight: bold;
  color: #333;
  margin-bottom: 4px;
}

.product-bonus {
  font-size: 12px;
  color: #ff6b6b;
  font-weight: 500;
}

/* 购买区域 */
.purchase-section {
  margin: 0 20px 20px;
}

.selected-info {
  background: rgba(255, 255, 255, 0.9);
  border-radius: 8px;
  padding: 12px 16px;
  margin-bottom: 12px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.selected-text {
  font-size: 14px;
  color: #333;
}

.selected-price {
  font-size: 16px;
  font-weight: bold;
  color: #667eea;
}

.purchase-btn {
  width: 100%;
  height: 48px;
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 600;
  transition: all 0.3s ease;
}

.purchase-btn.disabled {
  background: #ccc;
  color: #999;
}

/* 交易记录 */
.transactions-section {
  margin: 0 20px;
}

.toggle-icon {
  font-size: 18px;
  transition: transform 0.3s ease;
}

.toggle-icon.expanded {
  transform: rotate(90deg);
}

.transactions-list {
  background: rgba(255, 255, 255, 0.9);
  border-radius: 12px;
  padding: 16px;
  margin-top: 12px;
}

.transaction-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid #eee;
}

.transaction-item:last-child {
  border-bottom: none;
}

.transaction-info {
  flex: 1;
}

.transaction-type {
  display: flex;
  align-items: center;
  margin-bottom: 4px;
}

.transaction-icon {
  margin-right: 8px;
}

.transaction-desc {
  font-size: 14px;
  color: #333;
}

.transaction-time {
  font-size: 12px;
  color: #999;
}

.transaction-amount {
  font-size: 16px;
  font-weight: bold;
}

.transaction-amount.credit {
  color: #4caf50;
}

.transaction-amount.debit {
  color: #f44336;
}

.empty-transactions {
  text-align: center;
  color: #999;
  padding: 20px;
}

/* 加载遮罩 */
.loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.loading-content {
  background: white;
  border-radius: 12px;
  padding: 24px;
  text-align: center;
}

.loading-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid #f3f3f3;
  border-top: 3px solid #667eea;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 12px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.loading-text {
  font-size: 14px;
  color: #666;
}
</style>