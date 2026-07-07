const app = getApp()
const util = require('../../utils/util')

Page({
  data: {
    categories: [
      { key: '', label: '全部' },
      { key: 'drink', label: '🥤 奶茶' },
      { key: 'snack', label: '🍿 零食' },
      { key: 'meal', label: '🍱 餐食' }
    ],
    activeCategory: '',
    menus: [],
    loading: false,
    isAdmin: false,
    greeting: '今天想喝点什么？'
  },

  onLoad() {
    this.loadMenus()
    app.checkAdmin().then(isAdmin => {
      this.setData({ isAdmin })
    })
  },

  onShow() {
    util.updateCartBadge(util.getCart())
    // Refresh admin status
    app.checkAdmin().then(isAdmin => {
      this.setData({ isAdmin })
    })
  },

  switchCategory(e) {
    const cat = e.currentTarget.dataset.category
    this.setData({ activeCategory: cat, menus: [] })
    this.loadMenus(cat)
  },

  loadMenus(category) {
    this.setData({ loading: true })
    wx.cloud.callFunction({
      name: 'getMenus',
      data: { category: category || '' }
    }).then(res => {
      this.setData({
        menus: res.result.menus || [],
        loading: false
      })
    }).catch(() => {
      this.setData({ loading: false })
      wx.showToast({ title: '加载失败', icon: 'none' })
    })
  },

  onMenuTap(e) {
    const menu = e.detail.menu
    wx.navigateTo({
      url: `/pages/detail/index?id=${menu._id}`
    })
  },

  goToOrders() {
    wx.switchTab({ url: '/pages/orders/index' })
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

  goToSuggest() {
    wx.navigateTo({ url: '/pages/suggest/index' })
  },

  subscribeAdmin() {
    wx.requestSubscribeMessage({
      tmplIds: ['ADMIN_ORDER_TEMPLATE_ID'], // 替换为实际模板ID
      success: () => {
        wx.showToast({ title: '订阅成功', icon: 'success' })
      }
    })
  }
})