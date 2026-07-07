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
    loading: false
  },

  onShow() {
    this.loadMenus()
    util.updateCartBadge(util.getCart())
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
  }
})