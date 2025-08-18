<template>
  <view class="memo-container">
    <!-- 状态栏占位 -->
    <view class="status-bar"></view>
    
    <!-- 主要内容区域 -->
    <view class="main-content">
      <!-- 标题区域 -->
      <view class="header-section">
        <text class="page-title">我的备忘录</text>
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

export default {
  data() {
    return {
      memoList: [],
      loading: false,
      page: 1,
      limit: 10,
      hasMore: true,
      keyword: ''
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
  padding: 40rpx 40rpx 120rpx;
  position: relative;
}

.header-section {
  text-align: center;
  margin-bottom: 60rpx;
  padding-top: 40rpx;
  margin-left: -40rpx;
  margin-right: -40rpx;
  width: calc(100% + 80rpx);
  display: flex;
  justify-content: center;
  align-items: center;
}

.page-title {
  font-size: 48rpx;
  font-weight: 700;
  color: #ffffff;
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