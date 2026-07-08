const util = require('../../utils/util')
const { CATEGORIES, getSubcategories } = require('../../utils/categories')

Page({
  data: {
    categories: [
      { key: '', label: '全部' },
      { key: 'drink', label: '🥤 奶茶' },
      { key: 'snack', label: '🍿 零食' },
      { key: 'meal', label: '🍱 餐食' }
    ],
    activeCategory: '',
    activeSubcategory: '',
    subcategories: [],
    menus: [],
    loading: false
  },

  onShow() {
    this.loadMenus()
    util.updateCartBadge(util.getCart())
  },

  switchCategory(e) {
    const cat = e.currentTarget.dataset.category
    const subcategories = cat ? getSubcategories(cat) : []
    this.setData({
      activeCategory: cat,
      activeSubcategory: '',
      subcategories,
      menus: []
    })
    this.loadMenus(cat, '')
  },

  switchSubcategory(e) {
    const sub = e.currentTarget.dataset.subcategory
    this.setData({ activeSubcategory: sub, menus: [] })
    this.loadMenus(this.data.activeCategory, sub)
  },

  loadMenus(category, subcategory) {
    this.setData({ loading: true })
    wx.cloud.callFunction({
      name: 'getMenus',
      data: {
        category: category || '',
        subcategory: subcategory || ''
      }
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