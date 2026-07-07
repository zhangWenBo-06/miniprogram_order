/**
 * 格式化订单状态为中文
 */
function formatStatus(status) {
  const map = {
    pending: '待处理',
    accepted: '已接单',
    preparing: '制作中',
    done: '已完成'
  }
  return map[status] || status
}

/**
 * 获取状态对应的颜色
 */
function getStatusColor(status) {
  const map = {
    pending: '#ff9800',
    accepted: '#2196f3',
    preparing: '#9c27b0',
    done: '#4caf50'
  }
  return map[status] || '#999'
}

/**
 * 格式化时间
 */
function formatTime(date) {
  const d = new Date(date)
  const month = d.getMonth() + 1
  const day = d.getDate()
  const hour = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  return `${month}月${day}日 ${hour}:${min}`
}

/**
 * 获取购物车数据
 */
function getCart() {
  return wx.getStorageSync('cart') || []
}

/**
 * 保存购物车数据
 */
function saveCart(cart) {
  wx.setStorageSync('cart', cart)
  updateCartBadge(cart)
}

/**
 * 添加到购物车
 */
function addToCart(item) {
  const cart = getCart()
  const existIdx = cart.findIndex(c =>
    c.menuId === item.menuId &&
    JSON.stringify(c.specs) === JSON.stringify(item.specs)
  )
  if (existIdx > -1) {
    cart[existIdx].quantity += item.quantity
  } else {
    cart.push(item)
  }
  saveCart(cart)
}

/**
 * 清空购物车
 */
function clearCart() {
  wx.removeStorageSync('cart')
  updateCartBadge([])
}

/**
 * 更新购物车角标
 */
function updateCartBadge(cart) {
  const count = cart.reduce((sum, item) => sum + item.quantity, 0)
  const app = getApp()
  app.globalData.cartCount = count
  if (count > 0) {
    wx.setTabBarBadge({ index: 2, text: String(count > 99 ? '99+' : count) })
  } else {
    wx.removeTabBarBadge({ index: 2 })
  }
}

module.exports = {
  formatTime,
  getCart,
  saveCart,
  addToCart,
  clearCart,
  updateCartBadge
}