<template>
  <view class="memo-detail-container">
    <!-- 状态栏占位 -->
    <view class="status-bar"></view>
    
    <!-- 主要内容区域 -->
    <view class="main-content">
      <!-- 头部区域 -->
      <view class="header-section">
        <!-- 删除按钮 (仅编辑模式显示) -->
        <view v-if="mode === 'edit'" class="delete-btn" @click="deleteMemo">
          <text class="delete-icon">🗑️</text>
        </view>
      </view>
      
      <!-- 标题区域 -->
      <view class="title-area">
        <text class="page-title">{{ mode === 'create' ? '新建备忘录' : '备忘录详情' }}</text>
      </view>
      
      <!-- 加载状态指示器 -->
      <view v-if="loading" class="loading-container">
        <view class="loading-spinner"></view>
        <text class="loading-text">加载中...</text>
      </view>
      
      <!-- 备忘录内容区域 -->
      <view v-else class="memo-content">
        <!-- 标题 -->
        <view class="title-section">
          <input class="memo-title-input" v-model="editedMemo.title" placeholder="请输入标题" maxlength="50" />
        </view>
        
        <!-- 内容 -->
        <view class="content-section">
          <textarea class="memo-content-input" v-model="editedMemo.content" placeholder="请输入内容" auto-height maxlength="2000"></textarea>
        </view>
        
        <!-- 底部按钮 -->
        <view class="bottom-buttons">
          <view class="cancel-btn" :class="{ 'btn-disabled': loading }" @click="!loading && cancelEdit()">取消</view>
          <view class="save-btn" :class="{ 'btn-disabled': loading }" @click="!loading && saveMemo()">保存</view>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import api from '@/utils/api.js';

export default {
  data() {
    return {
      mode: 'edit', // 'edit' 或 'create'
      memoId: null,
      loading: false,
      editedMemo: {
        title: '',
        content: ''
      },
      originalMemo: {
        title: '',
        content: ''
      }
    }
  },
  onLoad(options) {
    this.mode = options.mode || 'edit';
    if (this.mode === 'create') {
      this.initNewMemo();
    } else {
      // 接收传递的备忘录ID
      if (options.id) {
        this.memoId = options.id;
        this.loadMemoDetail(options.id);
      } else {
        uni.showToast({
          title: '备忘录ID不存在',
          icon: 'none'
        });
        setTimeout(() => {
          uni.navigateBack();
        }, 1500);
      }
    }
  },
  methods: {
    // 加载备忘录详情
    async loadMemoDetail(id) {
      this.loading = true;
      
      try {
        const res = await api.memos.getById(id);
        const memoData = res.data;
        
        // 初始化编辑数据
        this.editedMemo = {
          title: memoData.title,
          content: memoData.content
        };
        this.originalMemo = {
          title: memoData.title,
          content: memoData.content
        };
      } catch (error) {
        console.error('获取备忘录详情失败:', error);
        uni.showToast({
          title: '获取备忘录详情失败，请稍后重试',
          icon: 'none',
          duration: 2000
        });
        setTimeout(() => {
          uni.navigateBack();
        }, 1500);
      } finally {
        this.loading = false;
      }
    },
    
    async saveMemo() {
      if (!this.editedMemo.title.trim()) {
        uni.showToast({
          title: '请输入标题',
          icon: 'none'
        });
        return;
      }
      
      this.loading = true;
      
      try {
        let res;
        
        if (this.mode === 'create') {
          // 创建新备忘录
          res = await api.memos.create({
            title: this.editedMemo.title,
            content: this.editedMemo.content
          });
        } else {
          // 更新备忘录
          res = await api.memos.update(this.memoId, {
            title: this.editedMemo.title,
            content: this.editedMemo.content
          });
        }
        
        // 保存成功
        uni.showToast({
          title: this.mode === 'create' ? '创建成功' : '修改成功',
          icon: 'success',
          duration: 2000
        });
        
        // 更新原始数据
        this.originalMemo = {
          title: this.editedMemo.title,
          content: this.editedMemo.content
        };
        
        // 保存成功后跳转到备忘录页面
        setTimeout(() => {
          uni.reLaunch({
            url: '/pages/memo/memo'
          });
        }, 1500);
        
      } catch (error) {
        console.error(this.mode === 'create' ? '创建备忘录失败:' : '更新备忘录失败:', error);
        uni.showToast({
          title: this.mode === 'create' ? '创建失败' : '保存失败',
          icon: 'none'
        });
      } finally {
        this.loading = false;
      }
    },
    
    cancelEdit() {
      // 检查是否有未保存的更改
      if (this.editedMemo.title !== this.originalMemo.title || 
          this.editedMemo.content !== this.originalMemo.content) {
        uni.showModal({
          title: '提示',
          content: '是否放弃已编辑的内容？',
          confirmText: '放弃',
          cancelText: '继续编辑',
          success: (res) => {
            if (res.confirm) {
              // 恢复原始数据
              this.editedMemo = {
                title: this.originalMemo.title,
                content: this.originalMemo.content
              };
              uni.navigateBack();
            }
          }
        });
      } else {
        uni.navigateBack();
      }
    },
    
    // 初始化新备忘录
    initNewMemo() {
      this.editedMemo = {
        title: '',
        content: ''
      };
      this.originalMemo = {
        title: '',
        content: ''
      };
    },
    
    // 删除备忘录
    async deleteMemo() {
      uni.showModal({
        title: '提示',
        content: '确定要删除这条备忘录吗？',
        confirmText: '删除',
        cancelText: '取消',
        success: async (res) => {
          if (res.confirm) {
            this.loading = true;
            
            try {
              await api.memos.delete(this.memoId);
              
              uni.showToast({
                title: '删除成功',
                icon: 'success',
                duration: 2000
              });
              
              // 返回上一页
              setTimeout(() => {
                uni.reLaunch({
                  url: '/pages/memo/memo'
                });
              }, 1500);
              
            } catch (error) {
              console.error('删除备忘录失败:', error);
              uni.showToast({
                title: '删除失败',
                icon: 'none',
                duration: 2000
              });
            } finally {
              this.loading = false;
            }
          }
        }
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

.memo-detail-container {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 0;
  padding-bottom: 140rpx;
}

.status-bar {
  height: 44px;
  background: transparent;
}

.main-content {
  padding: 40rpx 0;
  min-height: calc(100vh - 44px);
  display: flex;
  flex-direction: column;
}

.header-section {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  margin-bottom: 20px;
  padding: 0 40rpx;
  position: relative;
}

.title-area {
  text-align: center;
  margin-bottom: 60rpx;
  padding-top: 20rpx;
}

.page-title {
  font-size: 48rpx;
  font-weight: 700;
  color: #ffffff;
}



.delete-btn {
  width: 40px;
  height: 40px;
  background: linear-gradient(135deg, #ff4757, #ff3742);
  backdrop-filter: blur(10px);
  border-radius: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(255, 255, 255, 0.3);
  box-shadow: 0 4px 15px rgba(255, 71, 87, 0.3);
  transition: all 0.3s ease;
}

.delete-btn:active {
  transform: scale(0.95);
  box-shadow: 0 2px 8px rgba(255, 71, 87, 0.4);
}

.delete-icon {
  font-size: 18px;
  color: #ffffff;
  font-weight: bold;
  line-height: 1;
}

/* 加载状态样式 */
.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 300px;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  border-top-color: #ffffff;
  animation: spin 1s ease-in-out infinite;
  margin-bottom: 15px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.loading-text {
  color: #ffffff;
  font-size: 16px;
}

.memo-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 0;
  padding-bottom: 140rpx;
}

.title-section {
  margin-bottom: 40rpx;
  padding: 0 100rpx 0 40rpx;
}

.memo-title-input {
  font-size: 48rpx;
  font-weight: bold;
  color: #ffffff;
  line-height: 1.4;
  word-wrap: break-word;
  border: none;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 20rpx;
  width: 100%;
  outline: none;
  padding: 30rpx;
}

.content-section {
  flex: 1;
  padding: 0 100rpx 0 40rpx;
  margin-bottom: 40rpx;
}

.memo-content-input {
  font-size: 32rpx;
  color: rgba(255, 255, 255, 0.9);
  line-height: 2.8;
  word-wrap: break-word;
  white-space: pre-wrap;
  border: none;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 20rpx;
  width: 100%;
  min-height: 400rpx;
  outline: none;
  resize: none;
  padding: 30rpx;
}

.bottom-buttons {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  padding: 40rpx;
  gap: 30rpx;
  background: transparent;
  z-index: 100;
}

.cancel-btn {
  flex: 1;
  height: 50px;
  background: rgba(255, 255, 255, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 25px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #666;
  font-size: 16px;
  font-weight: 500;
  backdrop-filter: blur(10px);
  transition: all 0.3s ease;
}

.cancel-btn:active {
  transform: scale(0.98);
  background: rgba(255, 255, 255, 0.3);
}

.save-btn {
  flex: 1;
  height: 50px;
  background: linear-gradient(135deg, #667eea, #764ba2);
  border-radius: 25px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ffffff;
  font-size: 16px;
  font-weight: 500;
  box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
  transition: all 0.3s ease;
}

.save-btn:active {
  transform: scale(0.98);
  box-shadow: 0 2px 8px rgba(102, 126, 234, 0.4);
}

.btn-disabled {
  opacity: 0.6;
  pointer-events: none;
}
</style>