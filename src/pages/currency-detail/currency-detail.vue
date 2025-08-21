<template>
  <view class="currency-page">
    <!-- 调试信息区域 -->
    <view v-if="debugInfo.show" class="debug-section">
      <view class="debug-header" @click="toggleDebugInfo">
        <text class="debug-title">调试信息 {{ debugInfo.expanded ? '▼' : '▶' }}</text>
      </view>
      <view v-if="debugInfo.expanded" class="debug-content">
        <view class="debug-item">
          <text class="debug-label">系统平台:</text>
          <text class="debug-value">{{ debugInfo.platform }}</text>
        </view>
        <view class="debug-item">
          <text class="debug-label">App版本:</text>
          <text class="debug-value">{{ debugInfo.appVersion }}</text>
        </view>
        <view class="debug-item">
          <text class="debug-label">Plus环境:</text>
          <text class="debug-value">{{ debugInfo.plusReady ? '已就绪' : '未就绪' }}</text>
        </view>
        <view class="debug-item">
          <text class="debug-label">支付通道:</text>
          <text class="debug-value">{{ debugInfo.paymentChannels }}</text>
        </view>
        <view class="debug-item">
          <text class="debug-label">IAP状态:</text>
          <text class="debug-value">{{ debugInfo.iapStatus }}</text>
        </view>
        <view v-if="debugInfo.error" class="debug-item">
          <text class="debug-label">错误信息:</text>
          <text class="debug-value error">{{ debugInfo.error }}</text>
        </view>
        <view class="debug-item">
          <text class="debug-label">初始化日志:</text>
          <view class="debug-logs">
            <text v-for="(log, index) in debugInfo.logs" :key="index" class="debug-log">{{ log }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 算力余额展示区 -->
    <view class="balance-section">
      <view class="balance-card">
        <view class="balance-content">
          <i class="bi bi-fire balance-icon"></i>
          <view class="balance-info">
            <text class="balance-label">当前算力余额</text>
            <text class="balance-amount">{{ balance }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 充值算力购买选项 -->
    <view class="purchase-section">
      <view class="title-wrapper">
        <text class="section-title">充值算力</text>
        <view v-if="!iapReady" class="loading-tip">
          <text class="loading-text">{{ debugInfo.iapStatus }}</text>
        </view>
      </view>
      <view class="purchase-grid">
        <view 
          v-for="option in purchaseOptions" 
          :key="option.id"
          class="purchase-option"
          :class="{ 'disabled': !iapReady }"
          @click="purchaseCurrency(option)"
        >
          <i class="bi bi-fire option-icon"></i>
          <view class="option-info">
            <text class="option-amount">{{ option.amount }}算力</text>
            <text class="option-price">{{ option.price }}</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import currencyManager from '@/utils/currency.js';
import iapManager from '@/utils/iap.js';

export default {
  data() {
    return {
      balance: 0,
      iapReady: false,
      purchaseOptions: [
        { id: 'mjapp1.currency.1', amount: 1, price: '¥1.00' },
        { id: 'mjapp1.currency.6', amount: 6, price: '¥6.00' },
        { id: 'mjapp1.currency.18', amount: 18, price: '¥18.00' },
        { id: 'mjapp1.currency.30', amount: 30, price: '¥30.00' },
        { id: 'mjapp1.currency.68', amount: 68, price: '¥68.00' },
        { id: 'mjapp1.currency.128', amount: 128, price: '¥128.00' }
      ],
      debugInfo: {
        show: true,
        expanded: true,
        platform: '',
        appVersion: '',
        plusReady: false,
        paymentChannels: '检测中...',
        iapStatus: '初始化中...',
        error: '',
        logs: []
      }
    };
  },
  
  async onLoad() {
    await this.loadBalance();
    await this.initializeIAPWithDebug();
  },
  
  methods: {
    async loadBalance() {
      try {
        this.balance = await currencyManager.getBalance();
        this.addDebugLog('余额加载成功: ' + this.balance);
      } catch (error) {
        this.addDebugLog('加载余额失败: ' + error.message);
        console.error('加载余额失败:', error);
        uni.showToast({
          title: '加载余额失败',
          icon: 'none'
        });
      }
    },
    
    async initializeIAPWithDebug() {
      try {
        this.addDebugLog('开始IAP初始化...');
        
        // 获取系统信息
        const systemInfo = uni.getSystemInfoSync();
        this.debugInfo.platform = systemInfo.platform;
        this.debugInfo.appVersion = systemInfo.appVersion || 'Unknown';
        this.addDebugLog(`系统平台: ${systemInfo.platform}`);
        this.addDebugLog(`App版本: ${systemInfo.appVersion}`);
        
        // 检查Plus环境
        this.debugInfo.plusReady = typeof plus !== 'undefined';
        this.addDebugLog(`Plus环境: ${this.debugInfo.plusReady ? '已就绪' : '未就绪'}`);
        
        // 检查支付通道
        await this.checkPaymentChannels();
        
        // 初始化IAP
        const success = await iapManager.init();
        
        if (success) {
          this.iapReady = true;
          this.debugInfo.iapStatus = 'IAP初始化成功';
          this.addDebugLog('IAP初始化成功');
        } else {
          this.iapReady = false;
          const error = iapManager.getInitError();
          this.debugInfo.error = error ? error.message : '未知错误';
          this.debugInfo.iapStatus = 'IAP初始化失败';
          this.addDebugLog('IAP初始化失败: ' + this.debugInfo.error);
        }
      } catch (error) {
        this.iapReady = false;
        this.debugInfo.error = error.message;
        this.debugInfo.iapStatus = 'IAP初始化异常';
        this.addDebugLog('IAP初始化异常: ' + error.message);
        console.error('初始化IAP时发生异常:', error);
      }
    },
    
    async checkPaymentChannels() {
      return new Promise((resolve) => {
        // #ifdef APP-PLUS
        if (typeof plus !== 'undefined' && plus.payment) {
          plus.payment.getChannels((channels) => {
            const channelIds = channels.map(c => c.id);
            this.debugInfo.paymentChannels = channelIds.join(', ');
            this.addDebugLog(`支付通道: ${channelIds.join(', ')}`);
            
            const hasAppleIAP = channels.some(c => c.id === 'appleiap');
            this.addDebugLog(`Apple IAP通道: ${hasAppleIAP ? '存在' : '不存在'}`);
            
            resolve();
          }, (error) => {
            this.debugInfo.paymentChannels = '获取失败: ' + error.message;
            this.addDebugLog('获取支付通道失败: ' + error.message);
            resolve();
          });
        } else {
          this.debugInfo.paymentChannels = 'Plus环境未就绪';
          this.addDebugLog('Plus环境未就绪，无法获取支付通道');
          resolve();
        }
        // #endif
        
        // #ifndef APP-PLUS
        this.debugInfo.paymentChannels = '非App平台';
        this.addDebugLog('非App平台，不支持支付通道');
        resolve();
        // #endif
      });
    },
    
    addDebugLog(message) {
      const timestamp = new Date().toLocaleTimeString();
      this.debugInfo.logs.push(`[${timestamp}] ${message}`);
      // 限制日志数量
      if (this.debugInfo.logs.length > 20) {
        this.debugInfo.logs.shift();
      }
    },
    
    toggleDebugInfo() {
      this.debugInfo.expanded = !this.debugInfo.expanded;
    },
    
    async purchaseCurrency(option) {
      // 检查IAP是否已初始化
      if (!this.iapReady || !iapManager.isInitialized) {
        uni.showModal({
          title: '支付服务未就绪',
          content: `当前状态: ${this.debugInfo.iapStatus}\n\n错误信息: ${this.debugInfo.error || '无'}\n\n支付通道: ${this.debugInfo.paymentChannels}`,
          showCancel: false
        });
        return;
      }
      
      try {
        uni.showLoading({
          title: '正在处理购买...'
        });
        
        this.addDebugLog(`开始购买: ${option.id}`);
        
        // 使用IAP管理器进行购买
        const result = await iapManager.purchaseProduct(option.id);
        
        if (result.success) {
          // 购买成功，刷新余额
          await this.loadBalance();
          this.addDebugLog(`购买成功: ${option.amount}算力`);
          uni.showToast({
            title: `成功购买 ${option.amount} 算力！`,
            icon: 'success',
            duration: 2000
          });
        } else {
          this.addDebugLog(`购买失败: ${result.error || '未知错误'}`);
          uni.showToast({
            title: result.error || '购买失败',
            icon: 'none',
            duration: 2000
          });
        }
      } catch (error) {
        this.addDebugLog(`购买异常: ${error.message}`);
        console.error('购买失败:', error);
        let errorMessage = '购买失败，请重试';
        
        // 根据错误类型提供更具体的提示
        if (error.message.includes('用户取消')) {
          errorMessage = '购买已取消';
        } else if (error.message.includes('网络')) {
          errorMessage = '网络连接失败，请检查网络';
        } else if (error.message.includes('未初始化')) {
          errorMessage = '支付服务未就绪，请稍后重试';
        }
        
        uni.showToast({
          title: errorMessage,
          icon: 'none',
          duration: 2000
        });
      } finally {
        uni.hideLoading();
      }
    }
  }
};
</script>

<style scoped>
/* 调试信息样式 */
.debug-section {
  margin: 20rpx;
  background: #f8f9fa;
  border: 2rpx solid #dee2e6;
  border-radius: 12rpx;
  overflow: hidden;
}

.debug-header {
  background: #e9ecef;
  padding: 24rpx;
  border-bottom: 2rpx solid #dee2e6;
}

.debug-title {
  font-size: 28rpx;
  font-weight: 600;
  color: #495057;
}

.debug-content {
  padding: 24rpx;
}

.debug-item {
  display: flex;
  margin-bottom: 16rpx;
  align-items: flex-start;
}

.debug-label {
  font-size: 24rpx;
  color: #6c757d;
  min-width: 160rpx;
  font-weight: 500;
}

.debug-value {
  font-size: 24rpx;
  color: #212529;
  flex: 1;
  word-break: break-all;
}

.debug-value.error {
  color: #dc3545;
  font-weight: 500;
}

.debug-logs {
  flex: 1;
  max-height: 400rpx;
  overflow-y: auto;
  background: #ffffff;
  border: 2rpx solid #e9ecef;
  border-radius: 8rpx;
  padding: 16rpx;
}

.debug-log {
  display: block;
  font-size: 22rpx;
  color: #495057;
  margin-bottom: 8rpx;
  line-height: 1.4;
  font-family: monospace;
}

/* 原有样式保持不变 */
page {
  height: 100%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.currency-page {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 40rpx;
}

/* 算力余额展示区 */
.balance-section {
  margin-bottom: 60rpx;
}

.balance-card {
  background: #ffffff;
  border-radius: 24rpx;
  border: 2rpx solid #e9ecef;
  padding: 40rpx;
  box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.05);
}

.balance-content {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  text-align: center;
}

.balance-icon {
  font-size: 80rpx;
  color: #ff6b35;
  margin-bottom: 24rpx;
}

.balance-info {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.balance-label {
  font-size: 28rpx;
  color: #666;
  margin-bottom: 12rpx;
}

.balance-amount {
  font-size: 72rpx;
  font-weight: bold;
  color: #333;
}

/* 充值算力购买选项 */
.purchase-section {
  margin-top: 0;
}

.title-wrapper {
  margin-bottom: 100rpx;
}

.section-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #ffffff;
  text-align: left;
  display: block;
}

.loading-tip {
  margin-top: 16rpx;
  text-align: center;
}

.loading-text {
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.8);
  background: rgba(255, 255, 255, 0.1);
  padding: 8rpx 16rpx;
  border-radius: 12rpx;
}

.purchase-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24rpx;
}

.purchase-option {
  background: #ffffff;
  border: 2rpx solid #e9ecef;
  border-radius: 16rpx;
  padding: 24rpx 12rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  transition: all 0.3s ease;
  min-height: 120rpx;
}

.purchase-option:active {
  transform: scale(0.95);
  background: #f8f9fa;
  border-color: #007bff;
}

.purchase-option.disabled {
  opacity: 0.5;
  background: #f5f5f5;
  border-color: #ddd;
  pointer-events: none;
}

.purchase-option.disabled .option-icon {
  color: #ccc;
}

.purchase-option.disabled .option-amount {
  color: #999;
}

.purchase-option.disabled .option-price {
  color: #999;
}

.option-icon {
  font-size: 36rpx;
  color: #ff6b35;
  margin-bottom: 12rpx;
}

.option-info {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4rpx;
}

.option-amount {
  font-size: 26rpx;
  font-weight: 600;
  color: #333;
  line-height: 1.2;
}

.option-price {
  font-size: 22rpx;
  font-weight: 500;
  color: #007bff;
  line-height: 1.2;
}
</style>