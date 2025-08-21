<template>
  <view class="currency-page">
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
          <text class="loading-text">支付服务初始化中...</text>
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
        { id: 'mjapp.currency.1', amount: 1, price: '¥1.00' },
        { id: 'mjapp.currency.6', amount: 6, price: '¥6.00' },
        { id: 'mjapp.currency.18', amount: 18, price: '¥18.00' },
        { id: 'mjapp.currency.30', amount: 30, price: '¥30.00' },
        { id: 'mjapp.currency.68', amount: 68, price: '¥68.00' },
        { id: 'mjapp.currency.128', amount: 128, price: '¥128.00' }
      ]
    };
  },
  
  async onLoad() {
    await this.loadBalance();
    await this.initializeIAP();
  },
  
  methods: {
    async loadBalance() {
      try {
        this.balance = await currencyManager.getBalance();
      } catch (error) {
        console.error('加载余额失败:', error);
        uni.showToast({
          title: '加载余额失败',
          icon: 'none'
        });
      }
    },
    
    async initializeIAP() {
      try {
        console.log('页面开始初始化IAP...');
        
        // 显示加载状态
        uni.showLoading({
          title: '初始化支付服务...',
          mask: true
        });
        
        const success = await iapManager.init();
        
        if (success) {
          this.iapReady = true;
          console.log('IAP初始化成功');
          uni.showToast({
            title: '支付服务已就绪',
            icon: 'success',
            duration: 1000
          });
        } else {
          this.iapReady = false;
          const error = iapManager.getInitError();
          console.error('IAP初始化失败:', error);
          
          let errorMessage = '支付服务初始化失败';
          if (error) {
            if (error.message.includes('不支持')) {
              errorMessage = '当前设备不支持应用内购买';
            } else if (error.message.includes('超时')) {
              errorMessage = '支付服务连接超时，请检查网络';
            } else if (error.message.includes('未找到')) {
              errorMessage = '支付服务配置错误，请联系开发者';
            }
          }
          
          uni.showModal({
            title: '提示',
            content: errorMessage + '\n\n可能的解决方案：\n1. 确保在真实iOS设备上运行\n2. 检查网络连接\n3. 重启应用重试',
            showCancel: false
          });
        }
      } catch (error) {
        console.error('初始化IAP时发生异常:', error);
        this.iapReady = false;
        uni.showToast({
          title: '支付服务异常',
          icon: 'none',
          duration: 2000
        });
      } finally {
        uni.hideLoading();
      }
    },
    
    // 移除原来的checkIAPStatus方法，用initializeIAP替代
    
    async checkIAPStatus() {
      try {
        // 等待IAP初始化完成，增加重试机制
        const maxWaitTime = 15000; // 增加到15秒
        const checkInterval = 1000; // 每秒检查一次
        const startTime = Date.now();
        
        while (!iapManager.isInitialized && (Date.now() - startTime) < maxWaitTime) {
          await new Promise(resolve => setTimeout(resolve, checkInterval));
        }
        
        this.iapReady = iapManager.isInitialized;
        
        if (!this.iapReady) {
          console.warn('IAP初始化超时');
          uni.showToast({
            title: '支付服务初始化失败，请检查网络或重启应用',
            icon: 'none',
            duration: 3000
          });
        } else {
          console.log('IAP初始化成功');
        }
      } catch (error) {
        console.error('检查IAP状态失败:', error);
        this.iapReady = false;
      }
    },
    
    async purchaseCurrency(option) {
      // 检查IAP是否已初始化
      if (!this.iapReady || !iapManager.isInitialized) {
        uni.showToast({
          title: '支付服务未就绪，请稍后重试',
          icon: 'none',
          duration: 2000
        });
        return;
      }
      
      try {
        uni.showLoading({
          title: '正在处理购买...'
        });
        
        // 使用IAP管理器进行购买
        const result = await iapManager.purchaseProduct(option.id);
        
        if (result.success) {
          // 购买成功，刷新余额
          await this.loadBalance();
          uni.showToast({
            title: `成功购买 ${option.amount} 算力！`,
            icon: 'success',
            duration: 2000
          });
        } else {
          uni.showToast({
            title: result.error || '购买失败',
            icon: 'none',
            duration: 2000
          });
        }
      } catch (error) {
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