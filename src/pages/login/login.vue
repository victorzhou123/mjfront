<template>
  <view class="login-container">
    <!-- 状态栏占位 -->
    <view class="status-bar"></view>
    
    <!-- 主要内容区域 -->
    <view class="main-content">
      <!-- Logo区域 -->
      <view class="logo-section">
        <view class="logo-bg">
          <text class="logo-icon">🔐</text>
        </view>
      </view>
      
      <!-- 欢迎文字 -->
      <view class="welcome-section">
        <text class="welcome-title">欢迎回来</text>
        <text class="welcome-subtitle">请登录您的账户</text>
      </view>
      
      <!-- 表单区域 -->
      <view class="form-section">
        <view class="input-group">
          <input 
            class="input-field" 
            type="text" 
            placeholder="请输入账号" 
            v-model="username"
            placeholder-class="input-placeholder"
          />
        </view>
        
        <view class="input-group">
          <input 
            class="input-field" 
            type="password" 
            password="true"
            placeholder="请输入密码" 
            v-model="password"
            placeholder-class="input-placeholder"
          />
        </view>
        
        <button class="login-btn" @click="handleLogin">
          <text class="login-btn-text">登录</text>
        </button>
      </view>
      
      <!-- 注册链接 -->
      <view class="bottom-section">
        <text class="register-link" @click="goToRegister">立即注册</text>
      </view>
    </view>
  </view>
</template>

<script>
import api from '@/utils/api.js';

export default {
  data() {
    return {
      username: '',
      password: '',
      loading: false
    }
  },
  onLoad() {
    // 设置状态栏样式
    uni.setNavigationBarColor({
      frontColor: '#ffffff',
      backgroundColor: '#667eea'
    })
  },
  methods: {
    async handleLogin() {
      if (!this.username) {
        uni.showToast({
          title: '请输入用户名',
          icon: 'none',
          duration: 2000
        });
        return;
      }
      if (!this.password) {
        uni.showToast({
          title: '请输入密码',
          icon: 'none',
          duration: 2000
        });
        return;
      }
      
      this.loading = true;
      
      try {
        const res = await api.auth.login({
          username: this.username,
          password: this.password
        });
        
        // 保存token和用户信息
        uni.setStorageSync('token', res.data.token);
        uni.setStorageSync('userInfo', res.data.user);
       // 登录成功
        uni.showToast({
          title: '登录成功',
          icon: 'success',
          duration: 2000
        });
        
        // 跳转到备忘录页面
        setTimeout(() => {
          uni.reLaunch({
            url: '/pages/memo/memo'
          });
        }, 1500);
        
      } catch (error) {
        console.error('登录失败:', error);
      } finally {
        this.loading = false;
      }
    },
    

    
    goToRegister() {
      uni.navigateTo({
        url: '/pages/register/register'
      });
    }
  }
}
</script>

<style>
page {
  height: 100%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.login-container {
  height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  flex-direction: column;
}

.status-bar {
  height: var(--status-bar-height);
}

.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 0 80rpx;
}

.logo-section {
  margin-bottom: 80rpx;
}

.logo-bg {
  width: 160rpx;
  height: 160rpx;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 40rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(20rpx);
}

.logo-icon {
  font-size: 80rpx;
}

.welcome-section {
  text-align: center;
  margin-bottom: 100rpx;
}

.welcome-title {
  display: block;
  font-size: 56rpx;
  font-weight: 700;
  color: #ffffff;
  margin-bottom: 16rpx;
}

.welcome-subtitle {
  display: block;
  font-size: 32rpx;
  color: rgba(255, 255, 255, 0.8);
}

.form-section {
  width: 100%;
}

.input-group {
  margin-bottom: 40rpx;
}

.input-field {
  width: 100%;
  height: 112rpx;
  background: rgba(255, 255, 255, 0.15);
  border: 4rpx solid rgba(255, 255, 255, 0.2);
  border-radius: 32rpx;
  padding: 0 40rpx;
  font-size: 32rpx;
  color: #ffffff;
  backdrop-filter: blur(20rpx);
  box-sizing: border-box;
}

.input-placeholder {
  color: rgba(255, 255, 255, 0.7);
}

.input-field:focus {
  border-color: rgba(255, 255, 255, 0.5);
  background: rgba(255, 255, 255, 0.2);
}

.login-btn {
  width: 100%;
  height: 112rpx;
  background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%);
  border: none;
  border-radius: 32rpx;
  margin-top: 20rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 16rpx 50rpx rgba(238, 90, 36, 0.3);
}

.login-btn::after {
  border: none;
}

.login-btn-text {
  font-size: 36rpx;
  font-weight: 600;
  color: #ffffff;
}

.bottom-section {
  margin-top: 40rpx;
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.register-link {
  font-size: 28rpx;
  color: rgba(255, 255, 255, 0.8);
}

.forgot-link {
  font-size: 28rpx;
  color: rgba(255, 255, 255, 0.8);
}
</style>