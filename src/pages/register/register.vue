<template>
  <view class="register-container">
    <!-- 状态栏占位 -->
    <view class="status-bar"></view>
    
    <!-- 返回按钮 -->
    <view class="back-btn" @click="goBack">
      <text class="back-icon">←</text>
    </view>
    
    <!-- 主要内容区域 -->
    <view class="main-content">
      <!-- Logo区域 -->
      <view class="logo-section">
        <view class="logo-bg">
          <text class="logo-icon">👤</text>
        </view>
      </view>
      
      <!-- 欢迎文字 -->
      <view class="welcome-section">
        <text class="welcome-title">创建账户</text>
        <text class="welcome-subtitle">请填写注册信息</text>
      </view>
      
      <!-- 表单区域 -->
      <view class="form-section">
        <view class="input-group">
          <input 
            class="input-field" 
            type="text" 
            placeholder="请输入用户名" 
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
        
        <view class="input-group">
          <input 
            class="input-field" 
            type="password" 
            password="true"
            placeholder="请确认密码" 
            v-model="confirmPassword"
            placeholder-class="input-placeholder"
          />
        </view>
        
        <button class="register-btn" @click="handleRegister">
          <text class="register-btn-text">立即注册</text>
        </button>
      </view>
      
      <!-- 登录链接 -->
      <view class="login-section">
        <text class="login-text">已有账户？</text>
        <text class="login-link" @click="goToLogin">立即登录</text>
      </view>
    </view>
  </view>
</template>

<script>
import api from '@/utils/api.js'

export default {
  data() {
    return {
      username: '',
      password: '',
      confirmPassword: '',
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

    
    async handleRegister() {
      if (!this.username) {
        uni.showToast({
          title: '请输入用户名',
          icon: 'none',
          duration: 2000
        })
        return
      }
      
      if (this.username.length < 3 || this.username.length > 20) {
        uni.showToast({
          title: '用户名长度为3-20个字符',
          icon: 'none',
          duration: 2000
        })
        return
      }
      

      
      if (!this.password) {
        uni.showToast({
          title: '请输入密码',
          icon: 'none',
          duration: 2000
        })
        return
      }
      
      if (this.password.length < 6 || this.password.length > 20) {
        uni.showToast({
          title: '密码长度为6-20个字符',
          icon: 'none',
          duration: 2000
        })
        return
      }
      
      if (!this.confirmPassword) {
        uni.showToast({
          title: '请确认密码',
          icon: 'none',
          duration: 2000
        })
        return
      }
      
      if (this.password !== this.confirmPassword) {
        uni.showToast({
          title: '两次密码输入不一致',
          icon: 'none',
          duration: 2000
        })
        return
      }
      
      this.loading = true
      
      try {
        const res = await api.auth.register({
          username: this.username,
          password: this.password,
          confirmPassword: this.confirmPassword
        })
        
        uni.showToast({
          title: '注册成功',
          icon: 'success',
          duration: 2000
        })
        
        // 注册成功后跳转到登录页
        setTimeout(() => {
          uni.redirectTo({
            url: '/pages/login/login'
          })
        }, 1500)
        
      } catch (error) {
        console.error('注册失败:', error)
        // 显示具体的注册失败信息
        let errorMessage = '注册失败，请稍后重试'
        if (error && error.message) {
          errorMessage = error.message
        } else if (error && error.data && error.data.message) {
          errorMessage = error.data.message
        }
        
        uni.showToast({
          title: errorMessage,
          icon: 'none',
          duration: 3000
        })
      } finally {
        this.loading = false
      }
    },
    
    goToLogin() {
      uni.navigateBack()
    },
    
    goBack() {
      uni.navigateBack()
    }
  }
}
</script>

<style>
page {
  height: 100%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.register-container {
  height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  flex-direction: column;
}

.status-bar {
  height: var(--status-bar-height);
}

.back-btn {
  position: absolute;
  top: 60rpx;
  left: 40rpx;
  width: 80rpx;
  height: 80rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
}

.back-icon {
  font-size: 48rpx;
  color: #ffffff;
  font-weight: bold;
}

.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40rpx 80rpx;
  position: relative;
}

.logo-section {
  margin-bottom: 60rpx;
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
  margin-bottom: 80rpx;
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
  margin-bottom: 32rpx;
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

.register-btn {
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

.register-btn::after {
  border: none;
}

.register-btn-text {
  font-size: 36rpx;
  font-weight: 600;
  color: #ffffff;
}

.login-section {
  margin-top: 40rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.login-text {
  font-size: 28rpx;
  color: rgba(255, 255, 255, 0.8);
  margin-right: 16rpx;
}

.login-link {
  font-size: 28rpx;
  color: #ffffff;
  font-weight: 600;
}
</style>