const app = getApp()
const util = require('../../utils/util')

Page({
  data: {
    orders: [],
    isAdmin: false,
    loading: false,
    activeTab: 'all',
    userInfo: null
  },

  onShow() {
    this.setData({
      isAdmin: app.globalData.isAdmin,
      userInfo: app.globalData.userInfo
    })
    this.loadOrders()
  },

  loadOrders() {
    this.setData({ loading: true })
    wx.cloud.callFunction({
      name: 'getOrders',
      data: {}
    }).then(res => {
      const orders = (res.result.orders || []).map(order => ({
        ...order,
        formattedTime: util.formatTime(order.createdAt)
      }))
      this.setData({ orders, loading: false })
    }).catch(() => {
      this.setData({ loading: false })
      wx.showToast({ title: '加载失败', icon: 'none' })
    })
  },

  switchTab(e) {
    this.setData({ activeTab: e.currentTarget.dataset.tab })
  },

  goToSuggest() {
    wx.navigateTo({ url: '/pages/suggest/index' })
  },

  goToAdminMenu() {
    wx.navigateTo({ url: '/pages/admin-menu/index' })
  },

  goToAdminOrders() {
    wx.navigateTo({ url: '/pages/admin-orders/index' })
  },

  goToAdminSuggest() {
    wx.navigateTo({ url: '/pages/admin-suggest/index' })
  },

  subscribeStatus() {
    wx.requestSubscribeMessage({
      tmplIds: ['USER_STATUS_TEMPLATE_ID'],
      success: () => { wx.showToast({ title: '订阅成功', icon: 'success' }) }
    })
  }
})