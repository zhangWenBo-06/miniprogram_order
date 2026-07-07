const util = require('../../utils/util')

Page({
  data: {
    menu: null,
    quantity: 1,
    selectedSpecs: {},
    remark: ''
  },

  onLoad(options) {
    const menuId = options.id
    this.loadMenu(menuId)
  },

  loadMenu(menuId) {
    wx.cloud.callFunction({
      name: 'getMenus',
      data: {}
    }).then(res => {
      const menus = res.result.menus || []
      const menu = menus.find(m => m._id === menuId)
      if (menu) {
        const selectedSpecs = {}
        if (menu.specs && menu.specs.length > 0) {
          menu.specs.forEach(spec => {
            selectedSpecs[spec.name] = spec.options[0]
          })
        }
        this.setData({ menu, selectedSpecs })
      } else {
        wx.showToast({ title: '菜品不存在', icon: 'none' })
        setTimeout(() => wx.navigateBack(), 1500)
      }
    })
  },

  onSpecChange(e) {
    const { name, value } = e.currentTarget.dataset
    const selectedSpecs = { ...this.data.selectedSpecs, [name]: value }
    this.setData({ selectedSpecs })
  },

  onQuantityMinus() {
    if (this.data.quantity > 1) {
      this.setData({ quantity: this.data.quantity - 1 })
    }
  },

  onQuantityPlus() {
    if (this.data.quantity < 99) {
      this.setData({ quantity: this.data.quantity + 1 })
    }
  },

  onRemarkInput(e) {
    this.setData({ remark: e.detail.value })
  },

  addToCart() {
    const { menu, quantity, selectedSpecs, remark } = this.data
    const cartItem = {
      menuId: menu._id,
      name: menu.name,
      image: menu.image,
      price: menu.price,
      quantity,
      specs: selectedSpecs,
      remark
    }
    util.addToCart(cartItem)
    wx.showToast({ title: '已加入购物车', icon: 'success' })
    setTimeout(() => wx.navigateBack(), 1000)
  }
})