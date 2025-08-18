// API 请求工具类
const BASE_URL = 'https://mjbackend.vic0.com';
const API_PREFIX = '/api';

// 请求拦截器
const request = (options) => {
  return new Promise((resolve, reject) => {
    // 获取token
    const token = uni.getStorageSync('token');
    
    // 设置默认请求头
    const header = {
      'Content-Type': 'application/json',
      ...options.header
    };
    
    // 如果有token，添加到请求头
    if (token) {
      header['Authorization'] = `Bearer ${token}`;
    }
    
    uni.request({
      url: BASE_URL + options.url,
      method: options.method || 'GET',
      data: options.data,
      header,
      success: (res) => {
        const { statusCode, data } = res;
        
        if (statusCode === 200) {
          // 业务成功
          if (data.code === 200) {
            resolve(data);
          } else {
            // 业务失败
            uni.showToast({
              title: data.message || '操作失败，请稍后重试',
              icon: 'none',
              duration: 2000
            });
            reject(data);
          }
        } else if (statusCode === 401) {
          // token过期或无效
          uni.removeStorageSync('token');
          uni.removeStorageSync('userInfo');
          uni.showToast({
            title: '登录已过期，请重新登录',
            icon: 'none',
            duration: 2000
          });
          setTimeout(() => {
            uni.reLaunch({
              url: '/pages/login/login'
            });
          }, 2000);
          reject(res);
        } else {
          // 其他HTTP错误
          const errorMessage = data && data.message ? data.message : `服务器响应异常 (${statusCode})`;
          uni.showToast({
            title: errorMessage,
            icon: 'none',
            duration: 2000
          });
          reject(res);
        }
      },
      fail: (err) => {
        uni.showToast({
          title: '网络连接失败，请检查网络设置',
          icon: 'none',
          duration: 2000
        });
        reject(err);
      }
    });
  });
};

// API接口定义
const api = {
  // 健康检查
  health: {
    check: () => request({
      url: '/health',
      method: 'GET'
    })
  },
  
  // 用户认证接口
  auth: {
    // 用户登录
    login: (data) => request({
      url: `${API_PREFIX}/auth/login`,
      method: 'POST',
      data
    }),
    
    // 用户注册
    register: (data) => request({
      url: `${API_PREFIX}/auth/register`,
      method: 'POST',
      data
    }),
    
    // 忘记密码（发送验证码）
    forgotPassword: (data) => request({
      url: `${API_PREFIX}/auth/forgot-password`,
      method: 'POST',
      data
    }),
    
    // 重置密码
    resetPassword: (data) => request({
      url: `${API_PREFIX}/auth/reset-password`,
      method: 'POST',
      data
    })
  },
  
  // 备忘录管理接口
  memos: {
    // 获取备忘录列表
    getList: (params = {}) => {
      const { page = 1, limit = 10, keyword = '' } = params;
      let url = `${API_PREFIX}/memos?page=${page}&limit=${limit}`;
      if (keyword) {
        url += `&keyword=${encodeURIComponent(keyword)}`;
      }
      return request({
        url,
        method: 'GET'
      });
    },
    
    // 获取单个备忘录
    getById: (id) => request({
      url: `${API_PREFIX}/memos/${id}`,
      method: 'GET'
    }),
    
    // 创建备忘录
    create: (data) => request({
      url: `${API_PREFIX}/memos`,
      method: 'POST',
      data
    }),
    
    // 更新备忘录
    update: (id, data) => request({
      url: `${API_PREFIX}/memos/${id}`,
      method: 'PUT',
      data
    }),
    
    // 删除备忘录
    delete: (id) => request({
      url: `${API_PREFIX}/memos/${id}`,
      method: 'DELETE'
    })
  }
};

// 导出API
export default api;

// 导出request方法供其他地方使用
export { request };