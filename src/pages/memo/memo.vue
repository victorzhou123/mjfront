<template>
  <view class="memo-container">
    <!-- 状态栏占位 -->
    <view class="status-bar"></view>
    
    <!-- 主要内容区域 -->
    <view class="main-content">
      <!-- 标题区域 -->
      <view class="header-section">
        <text class="page-title">我的备忘录</text>
        <view class="currency-section">
          <view class="currency-display">
            <text class="currency-label">算力余额</text>
            <text class="currency-amount">{{ currencyBalance }}</text>
          </view>
          <view class="currency-add-btn" @click="goToCurrencyDetail">
            <text class="add-icon">+</text>
          </view>
        </view>
      </view>
      
      <!-- 备忘录网格 -->
      <view class="memo-grid">
        <view 
          class="memo-item" 
          v-for="(item, index) in memoList" 
          :key="index"
          @click="viewMemo(item)"
        >
          <view class="memo-card">
            <text class="memo-title">{{ item.title }}</text>
            <text class="memo-content">{{ item.content }}</text>
          </view>
        </view>
      </view>
      
      <!-- 添加按钮 -->
      <view class="add-btn" @click="addMemo">
        <text class="add-icon">+</text>
      </view>
    </view>
  </view>
</template>

<script>
import api from '@/utils/api.js';
import currencyManager from '@/utils/currency.js';

export default {
  data() {
    return {
      memoList: [],
      loading: false,
      page: 1,
      limit: 10,
      hasMore: true,
      keyword: '',
      currencyBalance: 0
    }
  },
  onLoad() {
    // 设置状态栏样式
    uni.setNavigationBarColor({
      frontColor: '#ffffff',
      backgroundColor: '#667eea'
    })
    
    // 加载备忘录列表
    this.loadMemoList()
    
    // 加载算力余额
    this.loadCurrencyBalance()
  },
  onPullDownRefresh() {
    // 下拉刷新
    this.refreshMemoList()
  },
  onReachBottom() {
    // 上拉加载更多
    if (this.hasMore && !this.loading) {
      this.loadMoreMemos()
    }
  },
  methods: {
    // 加载备忘录列表
    async loadMemoList() {
      this.loading = true
      
      try {
        const res = await api.memos.getList({
          page: this.page,
          limit: this.limit,
          keyword: this.keyword
        })
        
        this.memoList = res.data.list || []
        this.hasMore = this.memoList.length < res.data.total
        
      } catch (error) {
        console.error('获取备忘录列表失败:', error)
        uni.showToast({
          title: '获取备忘录列表失败，请稍后重试',
          icon: 'none',
          duration: 2000
        })
      } finally {
        this.loading = false
        uni.stopPullDownRefresh()
      }
    },
    
    // 刷新备忘录列表
    refreshMemoList() {
      this.page = 1
      this.hasMore = true
      this.loadMemoList()
    },
    
    // 加载更多备忘录
    async loadMoreMemos() {
      if (this.loading || !this.hasMore) return
      
      this.loading = true
      this.page += 1
      
      try {
        const res = await api.memos.getList({
          page: this.page,
          limit: this.limit,
          keyword: this.keyword
        })
        
        const newList = res.data.list || []
        this.memoList = [...this.memoList, ...newList]
        this.hasMore = this.memoList.length < res.data.total
        
      } catch (error) {
        console.error('加载更多备忘录失败:', error)
        uni.showToast({
          title: '加载更多备忘录失败，请稍后重试',
          icon: 'none',
          duration: 2000
        })
        this.page -= 1
      } finally {
        this.loading = false
      }
    },
    
    // 查看备忘录详情
    viewMemo(item) {
      uni.navigateTo({
        url: `/pages/memo-detail/memo-detail?id=${item.id}&mode=edit`
      })
    },
    
    // 添加备忘录
    addMemo() {
      uni.navigateTo({
        url: '/pages/memo-detail/memo-detail?mode=create'
      })
    },
    
    // 跳转到算力详情页面
    goToCurrencyDetail() {
      uni.navigateTo({
        url: '/pages/currency-detail/currency-detail'
      })
    },
    
    // 加载算力余额（从后端获取实时数据）
    async loadCurrencyBalance() {
      try {
        this.currencyBalance = await currencyManager.getBalance()
      } catch (error) {
        console.error('获取算力余额失败:', error)
        this.currencyBalance = 0
      }
    }
  }
}
</script>

<style>
page {
  height: 100%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.memo-container {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  flex-direction: column;
}

.status-bar {
  height: var(--status-bar-height);
}

.main-content {
  flex: 1;
  padding: 40rpx 60rpx 120rpx 40rpx;
  position: relative;
}

.header-section {
  margin-bottom: 60rpx;
  padding-top: 40rpx;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-left: 0;
  padding-right: 0;
}

.page-title {
  font-size: 48rpx;
  font-weight: 700;
  color: #ffffff;
}

.currency-section {
  background: rgba(255, 255, 255, 0.9);
  border: 2rpx solid rgba(0, 0, 0, 0.8);
  border-radius: 30rpx;
  padding: 12rpx 20rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-width: 180rpx;
}

.currency-display {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.currency-label {
  font-size: 22rpx;
  color: #333333;
  font-weight: 500;
}

.currency-amount {
  font-size: 24rpx;
  color: #333333;
  font-weight: 600;
}

.currency-add-btn {
  width: 36rpx;
  height: 36rpx;
  background: #8A2BE2;
  border-radius: 18rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
  margin-left: 16rpx;
}

.currency-add-btn:active {
  transform: scale(0.9);
  background: #7B68EE;
}

.currency-add-btn .add-icon {
  font-size: 20rpx;
  color: #ffffff;
  font-weight: 400;
  line-height: 1;
}

.memo-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 30rpx;
  padding: 0 20rpx;
}

.memo-item {
  width: 100%;
}

.memo-card {
  background: rgba(255, 255, 255, 0.15);
  border: 2rpx solid rgba(255, 255, 255, 0.2);
  border-radius: 24rpx;
  padding: 30rpx;
  backdrop-filter: blur(20rpx);
  height: 240rpx;
  display: flex;
  flex-direction: column;
  transition: all 0.3s ease;
  overflow: hidden;
}

.memo-card:active {
  transform: scale(0.95);
  background: rgba(255, 255, 255, 0.2);
}

.memo-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #ffffff;
  margin-bottom: 16rpx;
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  word-break: break-all;
  white-space: normal;
  height: 90rpx;
}

.memo-content {
  font-size: 26rpx;
  color: rgba(255, 255, 255, 0.8);
  line-height: 1.5;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  word-break: break-all;
  white-space: normal;
  height: 78rpx;
}

.add-btn {
  position: fixed;
  right: 60rpx;
  bottom: 100rpx;
  width: 120rpx;
  height: 120rpx;
  background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%);
  border-radius: 60rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 16rpx 50rpx rgba(238, 90, 36, 0.4);
  transition: all 0.3s ease;
}

.add-btn:active {
  transform: scale(0.9);
}

.add-icon {
  font-size: 60rpx;
  font-weight: 300;
  color: #ffffff;
  line-height: 1;
}
</style>