# 情侣点餐小程序 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a WeChat Mini Program where girlfriend can "order" drinks/snacks/meals with spec selection, boyfriend receives subscription message notifications, and can manage menus/orders.

**Architecture:** WeChat native mini-program frontend (9 pages + 3 components) communicating with WeChat Cloud Development backend (11 cloud functions + 4 database collections). Identity via wx.login/openid, push via subscription messages.

**Tech Stack:** WeChat Mini Program native framework, JavaScript ES6+, WeChat Cloud Development (cloud functions + cloud database + cloud storage), WXSS + Flex layout.

## Global Constraints

- All cloud function calls must verify admin role before write operations
- Subscription message authorization is optional — rejection must not block order flow
- Shopping cart uses `wx.setStorageSync` local storage only
- Menu categories: `"drink"`, `"snack"`, `"meal"`
- Order statuses: `"pending"` → `"accepted"` → `"preparing"` → `"done"`
- Admin determined by `role === "admin"` in users collection
- Soft-delete for menus: set `available: false` rather than removing documents

---

### Task 1: Project Scaffolding

**Files:**
- Create: `miniprogram/app.js`
- Create: `miniprogram/app.json`
- Create: `miniprogram/app.wxss`
- Create: `miniprogram/project.config.json`
- Create: `miniprogram/utils/util.js`

**Interfaces:**
- Produces: `app.globalData` — `{ userInfo: null, isAdmin: false, cartCount: 0 }`; `app.getUserInfo()` — Promise resolving to user info object; `app.checkAdmin()` — sets `isAdmin` on globalData

- [ ] **Step 1: Create project.config.json**

```json
{
  "miniprogramRoot": "miniprogram/",
  "cloudfunctionRoot": "cloudfunctions/",
  "setting": {
    "es6": true,
    "enhance": true,
    "postcss": true,
    "minified": true
  },
  "appid": "YOUR_APPID_HERE",
  "projectname": "order-for-you"
}
```

- [ ] **Step 2: Create miniprogram/app.js**

```javascript
App({
  onLaunch: function () {
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力')
    } else {
      wx.cloud.init({
        env: 'YOUR_ENV_ID',
        traceUser: true
      })
    }
  },

  globalData: {
    userInfo: null,
    isAdmin: false,
    cartCount: 0
  },

  getUserInfo: function () {
    const app = this
    return new Promise((resolve, reject) => {
      if (app.globalData.userInfo) {
        resolve(app.globalData.userInfo)
        return
      }
      wx.getUserProfile({
        desc: '用于显示您的昵称和头像',
        success: (res) => {
          app.globalData.userInfo = res.userInfo
          app.doLogin(res.userInfo).then(() => {
            resolve(app.globalData.userInfo)
          }).catch(reject)
        },
        fail: (err) => {
          // Fallback: try silent login
          app.doLogin({ nickName: '用户', avatarUrl: '' }).then(() => {
            resolve(app.globalData.userInfo)
          }).catch(reject)
        }
      })
    })
  },

  doLogin: function (userInfo) {
    const app = this
    return new Promise((resolve, reject) => {
      wx.cloud.callFunction({
        name: 'login',
        data: {
          nickName: userInfo.nickName,
          avatarUrl: userInfo.avatarUrl
        },
        success: (res) => {
          app.globalData.userInfo = userInfo
          app.globalData.isAdmin = res.result.role === 'admin'
          resolve()
        },
        fail: reject
      })
    })
  },

  checkAdmin: function () {
    const app = this
    return new Promise((resolve) => {
      wx.cloud.callFunction({
        name: 'login',
        data: {},
        success: (res) => {
          app.globalData.isAdmin = res.result.role === 'admin'
          resolve(app.globalData.isAdmin)
        },
        fail: () => {
          resolve(false)
        }
      })
    })
  }
})
```

- [ ] **Step 3: Create miniprogram/app.json**

```json
{
  "pages": [
    "pages/index/index",
    "pages/menu/index",
    "pages/detail/index",
    "pages/cart/index",
    "pages/orders/index",
    "pages/suggest/index",
    "pages/admin-menu/index",
    "pages/admin-orders/index",
    "pages/admin-suggest/index"
  ],
  "window": {
    "navigationBarBackgroundColor": "#ff6b81",
    "navigationBarTitleText": "专属点单",
    "navigationBarTextStyle": "white",
    "backgroundColor": "#f8f8f8"
  },
  "tabBar": {
    "color": "#999999",
    "selectedColor": "#ff6b81",
    "borderStyle": "white",
    "backgroundColor": "#ffffff",
    "list": [
      {
        "pagePath": "pages/index/index",
        "text": "首页",
        "iconPath": "images/tab-home.png",
        "selectedIconPath": "images/tab-home-active.png"
      },
      {
        "pagePath": "pages/menu/index",
        "text": "菜单",
        "iconPath": "images/tab-menu.png",
        "selectedIconPath": "images/tab-menu-active.png"
      },
      {
        "pagePath": "pages/cart/index",
        "text": "购物车",
        "iconPath": "images/tab-cart.png",
        "selectedIconPath": "images/tab-cart-active.png"
      },
      {
        "pagePath": "pages/orders/index",
        "text": "我的",
        "iconPath": "images/tab-mine.png",
        "selectedIconPath": "images/tab-mine-active.png"
      }
    ]
  },
  "permission": {
    "scope.subscribeMessage": {
      "desc": "用于接收订单状态通知"
    }
  },
  "cloud": true
}
```

- [ ] **Step 4: Create miniprogram/app.wxss**

```css
page {
  --primary: #ff6b81;
  --primary-light: #ff8fa3;
  --bg: #f8f8f8;
  --white: #ffffff;
  --text: #333333;
  --text-light: #999999;
  --border: #eeeeee;
  --shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.08);

  background-color: var(--bg);
  font-family: -apple-system, BlinkMacSystemFont, 'Helvetica Neue', sans-serif;
  color: var(--text);
  font-size: 28rpx;
  line-height: 1.6;
}

.container {
  padding: 20rpx;
  box-sizing: border-box;
}

.btn-primary {
  background: linear-gradient(135deg, #ff6b81, #ff8fa3);
  color: white;
  border: none;
  border-radius: 40rpx;
  font-size: 30rpx;
  padding: 20rpx 40rpx;
}

.btn-primary:active {
  opacity: 0.85;
}

.card {
  background: var(--white);
  border-radius: 16rpx;
  box-shadow: var(--shadow);
  overflow: hidden;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 100rpx 40rpx;
  color: var(--text-light);
}

.empty-state .icon {
  font-size: 80rpx;
  margin-bottom: 20rpx;
}

.empty-state .text {
  font-size: 28rpx;
}
```

- [ ] **Step 5: Create miniprogram/utils/util.js**

```javascript
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
  formatStatus,
  getStatusColor,
  formatTime,
  getCart,
  saveCart,
  addToCart,
  clearCart,
  updateCartBadge
}
```

- [ ] **Step 6: Verify scaffolding works**

Open project in WeChat DevTools, confirm no errors in console, confirm app.onLaunch runs and cloud is initialized (will show cloud init error until env ID is configured, which is expected).

### Task 2: Cloud Function — login

**Files:**
- Create: `cloudfunctions/login/package.json`
- Create: `cloudfunctions/login/index.js`

**Interfaces:**
- Produces: `login(event: { nickName?: string, avatarUrl?: string })` → `{ role: "admin"|"user", openid: string }`
- Consumed by: All frontend pages via `app.doLogin()`

- [ ] **Step 1: Create cloudfunctions/login/package.json**

```json
{
  "name": "login",
  "version": "1.0.0",
  "main": "index.js",
  "dependencies": {
    "wx-server-sdk": "~2.6.3"
  }
}
```

- [ ] **Step 2: Create cloudfunctions/login/index.js**

```javascript
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext()

  // 查找用户
  const userRes = await db.collection('users').where({ _openid: OPENID }).get()

  if (userRes.data.length > 0) {
    const user = userRes.data[0]
    // 如果传了新的昵称/头像则更新
    if (event.nickName || event.avatarUrl) {
      await db.collection('users').doc(user._id).update({
        data: {
          nickName: event.nickName || user.nickName,
          avatarUrl: event.avatarUrl || user.avatarUrl
        }
      })
    }
    return { role: user.role, openid: OPENID }
  }

  // 新用户：创建记录
  await db.collection('users').add({
    data: {
      _openid: OPENID,
      nickName: event.nickName || '用户',
      avatarUrl: event.avatarUrl || '',
      role: 'user',
      createdAt: db.serverDate()
    }
  })

  return { role: 'user', openid: OPENID }
}
```

- [ ] **Step 3: Upload and test**

Right-click `cloudfunctions/login` in WeChat DevTools → "上传并部署：云端安装依赖"。Then in App console, call: `wx.cloud.callFunction({ name: 'login', data: {} })` and verify `{ role: "user", openid: "..." }` is returned.

### Task 3: Cloud Function — getMenus

**Files:**
- Create: `cloudfunctions/getMenus/package.json`
- Create: `cloudfunctions/getMenus/index.js`

**Interfaces:**
- Produces: `getMenus(event: { category?: string })` → `{ menus: Array<Menu> }`
- Consumed by: index page, menu page, detail page

- [ ] **Step 1: Create cloudfunctions/getMenus/package.json**

```json
{
  "name": "getMenus",
  "version": "1.0.0",
  "main": "index.js",
  "dependencies": {
    "wx-server-sdk": "~2.6.3"
  }
}
```

- [ ] **Step 2: Create cloudfunctions/getMenus/index.js**

```javascript
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event) => {
  const { category } = event
  const where = { available: true }
  if (category) {
    where.category = category
  }
  const res = await db.collection('menus')
    .where(where)
    .orderBy('createdAt', 'desc')
    .get()
  return { menus: res.data }
}
```

- [ ] **Step 3: Upload and deploy**

Right-click `cloudfunctions/getMenus` → "上传并部署：云端安装依赖"

### Task 4: Cloud Function — addMenu

**Files:**
- Create: `cloudfunctions/addMenu/package.json`
- Create: `cloudfunctions/addMenu/index.js`

**Interfaces:**
- Produces: `addMenu(event: { name, category, image, price, specs })` → `{ success: true, menuId: string }`
- Requires: admin role
- Consumed by: admin-menu page

- [ ] **Step 1: Create cloudfunctions/addMenu/package.json**

```json
{
  "name": "addMenu",
  "version": "1.0.0",
  "main": "index.js",
  "dependencies": {
    "wx-server-sdk": "~2.6.3"
  }
}
```

- [ ] **Step 2: Create cloudfunctions/addMenu/index.js**

```javascript
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext()

  // 校验管理员
  const userRes = await db.collection('users').where({ _openid: OPENID }).get()
  if (userRes.data.length === 0 || userRes.data[0].role !== 'admin') {
    return { success: false, error: '无权限' }
  }

  const { name, category, image, price, specs } = event

  if (!name || !category) {
    return { success: false, error: '名称和分类不能为空' }
  }

  const res = await db.collection('menus').add({
    data: {
      name,
      category,
      image: image || '',
      price: price || 0,
      specs: specs || [],
      available: true,
      createdAt: db.serverDate()
    }
  })

  return { success: true, menuId: res._id }
}
```

- [ ] **Step 3: Upload and deploy**

Right-click `cloudfunctions/addMenu` → "上传并部署：云端安装依赖"

### Task 5: Cloud Function — updateMenu

**Files:**
- Create: `cloudfunctions/updateMenu/package.json`
- Create: `cloudfunctions/updateMenu/index.js`

**Interfaces:**
- Produces: `updateMenu(event: { menuId, name?, category?, image?, price?, specs?, available? })` → `{ success: true }`
- Requires: admin role
- Consumed by: admin-menu page

- [ ] **Step 1: Create cloudfunctions/updateMenu/package.json**

```json
{
  "name": "updateMenu",
  "version": "1.0.0",
  "main": "index.js",
  "dependencies": {
    "wx-server-sdk": "~2.6.3"
  }
}
```

- [ ] **Step 2: Create cloudfunctions/updateMenu/index.js**

```javascript
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext()

  const userRes = await db.collection('users').where({ _openid: OPENID }).get()
  if (userRes.data.length === 0 || userRes.data[0].role !== 'admin') {
    return { success: false, error: '无权限' }
  }

  const { menuId, ...updates } = event
  if (!menuId) {
    return { success: false, error: '缺少menuId' }
  }

  delete updates.menuId
  if (Object.keys(updates).length === 0) {
    return { success: false, error: '没有要更新的字段' }
  }

  await db.collection('menus').doc(menuId).update({ data: updates })
  return { success: true }
}
```

- [ ] **Step 3: Upload and deploy**

Right-click `cloudfunctions/updateMenu` → "上传并部署：云端安装依赖"

### Task 6: Cloud Function — deleteMenu

**Files:**
- Create: `cloudfunctions/deleteMenu/package.json`
- Create: `cloudfunctions/deleteMenu/index.js`

**Interfaces:**
- Produces: `deleteMenu(event: { menuId })` → `{ success: true }`
- Requires: admin role
- Consumed by: admin-menu page
- Note: Soft delete — sets `available: false`

- [ ] **Step 1: Create cloudfunctions/deleteMenu/package.json**

```json
{
  "name": "deleteMenu",
  "version": "1.0.0",
  "main": "index.js",
  "dependencies": {
    "wx-server-sdk": "~2.6.3"
  }
}
```

- [ ] **Step 2: Create cloudfunctions/deleteMenu/index.js**

```javascript
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext()

  const userRes = await db.collection('users').where({ _openid: OPENID }).get()
  if (userRes.data.length === 0 || userRes.data[0].role !== 'admin') {
    return { success: false, error: '无权限' }
  }

  const { menuId } = event
  if (!menuId) {
    return { success: false, error: '缺少menuId' }
  }

  // 软删除
  await db.collection('menus').doc(menuId).update({ data: { available: false } })
  return { success: true }
}
```

- [ ] **Step 3: Upload and deploy**

Right-click `cloudfunctions/deleteMenu` → "上传并部署：云端安装依赖"

### Task 7: Cloud Function — submitOrder

**Files:**
- Create: `cloudfunctions/submitOrder/package.json`
- Create: `cloudfunctions/submitOrder/index.js`

**Interfaces:**
- Produces: `submitOrder(event: { items: Array, note?: string })` → `{ success: true, orderId: string }`
- Consumed by: cart page
- Side effect: Sends subscription message to admin (if subscribed)

- [ ] **Step 1: Create cloudfunctions/submitOrder/package.json**

```json
{
  "name": "submitOrder",
  "version": "1.0.0",
  "main": "index.js",
  "dependencies": {
    "wx-server-sdk": "~2.6.3"
  }
}
```

- [ ] **Step 2: Create cloudfunctions/submitOrder/index.js**

```javascript
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext()
  const { items, note } = event

  if (!items || items.length === 0) {
    return { success: false, error: '订单不能为空' }
  }

  // 创建订单
  const orderRes = await db.collection('orders').add({
    data: {
      _openid: OPENID,
      items,
      note: note || '',
      status: 'pending',
      createdAt: db.serverDate(),
      updatedAt: db.serverDate()
    }
  })

  // 查找管理员并发送订阅消息
  const adminRes = await db.collection('users').where({ role: 'admin' }).get()

  if (adminRes.data.length > 0) {
    const admin = adminRes.data[0]
    // 构造订单摘要
    const itemDesc = items.map(i =>
      `${i.name} x${i.quantity}`
    ).join('、')

    const specsDesc = items[0].specs
      ? Object.entries(items[0].specs).map(([k, v]) => `${v}`).join('·')
      : ''

    try {
      await cloud.openapi.subscribeMessage.send({
        touser: admin._openid,
        templateId: 'ADMIN_ORDER_TEMPLATE_ID', // 替换为实际模板ID
        data: {
          thing1: { value: itemDesc.slice(0, 20) },
          thing2: { value: specsDesc || '无特殊要求' },
          thing3: { value: note || '无备注' }
        },
        page: 'pages/admin-orders/index'
      })
    } catch (err) {
      // 订阅消息发送失败不影响下单流程（比如管理员未授权）
      console.log('订阅消息发送失败:', err.errMsg || err.message)
    }
  }

  return { success: true, orderId: orderRes._id }
}
```

- [ ] **Step 3: Upload and deploy**

Right-click `cloudfunctions/submitOrder` → "上传并部署：云端安装依赖"

### Task 8: Cloud Function — getOrders

**Files:**
- Create: `cloudfunctions/getOrders/package.json`
- Create: `cloudfunctions/getOrders/index.js`

**Interfaces:**
- Produces: `getOrders(event: {})` → `{ orders: Array<Order>, isAdmin: boolean }`
- Behavior: Admin sees all orders; regular user sees only their own

- [ ] **Step 1: Create cloudfunctions/getOrders/package.json**

```json
{
  "name": "getOrders",
  "version": "1.0.0",
  "main": "index.js",
  "dependencies": {
    "wx-server-sdk": "~2.6.3"
  }
}
```

- [ ] **Step 2: Create cloudfunctions/getOrders/index.js**

```javascript
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async () => {
  const { OPENID } = cloud.getWXContext()

  const userRes = await db.collection('users').where({ _openid: OPENID }).get()
  const isAdmin = userRes.data.length > 0 && userRes.data[0].role === 'admin'

  // Admin 看全部，普通用户只看自己的
  const where = isAdmin ? {} : { _openid: OPENID }

  const res = await db.collection('orders')
    .where(where)
    .orderBy('createdAt', 'desc')
    .limit(50)
    .get()

  return { orders: res.data, isAdmin }
}
```

- [ ] **Step 3: Upload and deploy**

Right-click `cloudfunctions/getOrders` → "上传并部署：云端安装依赖"

### Task 9: Cloud Function — updateOrderStatus

**Files:**
- Create: `cloudfunctions/updateOrderStatus/package.json`
- Create: `cloudfunctions/updateOrderStatus/index.js`

**Interfaces:**
- Produces: `updateOrderStatus(event: { orderId, status })` → `{ success: true }`
- Requires: admin role
- Side effect: Sends subscription message to order owner when status changes

- [ ] **Step 1: Create cloudfunctions/updateOrderStatus/package.json**

```json
{
  "name": "updateOrderStatus",
  "version": "1.0.0",
  "main": "index.js",
  "dependencies": {
    "wx-server-sdk": "~2.6.3"
  }
}
```

- [ ] **Step 2: Create cloudfunctions/updateOrderStatus/index.js**

```javascript
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

const STATUS_MAP = {
  pending: '待处理',
  accepted: '已接单',
  preparing: '制作中',
  done: '已完成'
}

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext()

  const userRes = await db.collection('users').where({ _openid: OPENID }).get()
  if (userRes.data.length === 0 || userRes.data[0].role !== 'admin') {
    return { success: false, error: '无权限' }
  }

  const { orderId, status } = event
  if (!orderId || !status) {
    return { success: false, error: '参数不完整' }
  }

  const validStatuses = ['pending', 'accepted', 'preparing', 'done']
  if (!validStatuses.includes(status)) {
    return { success: false, error: '无效的状态' }
  }

  await db.collection('orders').doc(orderId).update({
    data: {
      status,
      updatedAt: db.serverDate()
    }
  })

  // 发送订阅消息给下单用户
  const orderRes = await db.collection('orders').doc(orderId).get()
  if (!orderRes.data) {
    return { success: true }
  }

  const order = orderRes.data
  const itemName = order.items[0] ? order.items[0].name : '商品'

  try {
    await cloud.openapi.subscribeMessage.send({
      touser: order._openid,
      templateId: 'USER_STATUS_TEMPLATE_ID', // 替换为实际模板ID
      data: {
        thing1: { value: itemName.slice(0, 20) },
        phrase2: { value: STATUS_MAP[status] },
        thing3: { value: '点击查看订单详情' }
      },
      page: 'pages/orders/index'
    })
  } catch (err) {
    console.log('推送订阅消息失败:', err.errMsg || err.message)
  }

  return { success: true }
}
```

- [ ] **Step 3: Upload and deploy**

Right-click `cloudfunctions/updateOrderStatus` → "上传并部署：云端安装依赖"

### Task 10: Cloud Function — submitSuggestion

**Files:**
- Create: `cloudfunctions/submitSuggestion/package.json`
- Create: `cloudfunctions/submitSuggestion/index.js`

**Interfaces:**
- Produces: `submitSuggestion(event: { name, category, reason })` → `{ success: true }`
- Consumed by: suggest page

- [ ] **Step 1: Create cloudfunctions/submitSuggestion/package.json**

```json
{
  "name": "submitSuggestion",
  "version": "1.0.0",
  "main": "index.js",
  "dependencies": {
    "wx-server-sdk": "~2.6.3"
  }
}
```

- [ ] **Step 2: Create cloudfunctions/submitSuggestion/index.js**

```javascript
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext()
  const { name, category, reason } = event

  if (!name || !category) {
    return { success: false, error: '名称和分类不能为空' }
  }

  await db.collection('suggestions').add({
    data: {
      _openid: OPENID,
      name,
      category,
      reason: reason || '',
      status: 'pending',
      createdAt: db.serverDate()
    }
  })

  return { success: true }
}
```

- [ ] **Step 3: Upload and deploy**

Right-click `cloudfunctions/submitSuggestion` → "上传并部署：云端安装依赖"

### Task 11: Cloud Function — getSuggestions

**Files:**
- Create: `cloudfunctions/getSuggestions/package.json`
- Create: `cloudfunctions/getSuggestions/index.js`

**Interfaces:**
- Produces: `getSuggestions(event: {})` → `{ suggestions: Array }`
- Requires: admin role

- [ ] **Step 1: Create cloudfunctions/getSuggestions/package.json**

```json
{
  "name": "getSuggestions",
  "version": "1.0.0",
  "main": "index.js",
  "dependencies": {
    "wx-server-sdk": "~2.6.3"
  }
}
```

- [ ] **Step 2: Create cloudfunctions/getSuggestions/index.js**

```javascript
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async () => {
  const { OPENID } = cloud.getWXContext()

  const userRes = await db.collection('users').where({ _openid: OPENID }).get()
  if (userRes.data.length === 0 || userRes.data[0].role !== 'admin') {
    return { success: false, error: '无权限' }
  }

  const res = await db.collection('suggestions')
    .orderBy('createdAt', 'desc')
    .limit(50)
    .get()

  return { suggestions: res.data }
}
```

- [ ] **Step 3: Upload and deploy**

Right-click `cloudfunctions/getSuggestions` → "上传并部署：云端安装依赖"

### Task 12: Cloud Function — handleSuggestion

**Files:**
- Create: `cloudfunctions/handleSuggestion/package.json`
- Create: `cloudfunctions/handleSuggestion/index.js`

**Interfaces:**
- Produces: `handleSuggestion(event: { suggestionId, action: "approved"|"rejected" })` → `{ success: true }`
- Requires: admin role
- Side effect: When approved, auto-creates menu item using suggestion data

- [ ] **Step 1: Create cloudfunctions/handleSuggestion/package.json**

```json
{
  "name": "handleSuggestion",
  "version": "1.0.0",
  "main": "index.js",
  "dependencies": {
    "wx-server-sdk": "~2.6.3"
  }
}
```

- [ ] **Step 2: Create cloudfunctions/handleSuggestion/index.js**

```javascript
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext()

  const userRes = await db.collection('users').where({ _openid: OPENID }).get()
  if (userRes.data.length === 0 || userRes.data[0].role !== 'admin') {
    return { success: false, error: '无权限' }
  }

  const { suggestionId, action } = event
  if (!suggestionId || !['approved', 'rejected'].includes(action)) {
    return { success: false, error: '参数不完整' }
  }

  const sugRes = await db.collection('suggestions').doc(suggestionId).get()
  if (!sugRes.data) {
    return { success: false, error: '建议不存在' }
  }

  // 更新建议状态
  await db.collection('suggestions').doc(suggestionId).update({
    data: { status: action }
  })

  // 如果通过，自动创建菜单项
  if (action === 'approved') {
    const sug = sugRes.data
    await db.collection('menus').add({
      data: {
        name: sug.name,
        category: sug.category,
        image: '',
        price: 0,
        specs: [],
        available: true,
        createdAt: db.serverDate()
      }
    })
  }

  return { success: true }
}
```

- [ ] **Step 3: Upload and deploy**

Right-click `cloudfunctions/handleSuggestion` → "上传并部署：云端安装依赖"

现在进入页面实现阶段。以下每个页面包含 4 个文件：index.json、index.js、index.wxml、index.wxss。

### Task 13: Component — menu-card

**Files:**
- Create: `miniprogram/components/menu-card/index.js`
- Create: `miniprogram/components/menu-card/index.json`
- Create: `miniprogram/components/menu-card/index.wxml`
- Create: `miniprogram/components/menu-card/index.wxss`

**Interfaces:**
- Props: `menu: Object` — `{ _id, name, image, price, category }`
- Events: `tap` — triggered on card click with `{ menu }` in detail
- Consumed by: index page, menu page

- [ ] **Step 1: Create index.json**

```json
{ "component": true, "usingComponents": {} }
```

- [ ] **Step 2: Create index.js**

```javascript
Component({
  properties: {
    menu: { type: Object, value: {} }
  },
  methods: {
    onTap() {
      this.triggerEvent('tap', { menu: this.data.menu })
    }
  }
})
```

- [ ] **Step 3: Create index.wxml**

```xml
<view class="menu-card" bindtap="onTap">
  <view class="card-image">
    <image wx:if="{{menu.image}}" src="{{menu.image}}" mode="aspectFill" />
    <view wx:else class="image-placeholder"><text>{{menu.name[0]}}</text></view>
    <view class="category-tag">{{menu.category === 'drink' ? '🥤' : menu.category === 'snack' ? '🍿' : '🍱'}}</view>
  </view>
  <view class="card-body">
    <text class="card-name">{{menu.name}}</text>
    <text class="card-price" wx:if="{{menu.price}}">¥{{menu.price}}</text>
    <text class="card-price free" wx:else>免费投喂</text>
  </view>
</view>
```

- [ ] **Step 4: Create index.wxss**

```css
.menu-card { background: #fff; border-radius: 16rpx; overflow: hidden; box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.08); transition: transform 0.2s; }
.menu-card:active { transform: scale(0.97); }
.card-image { width: 100%; height: 200rpx; position: relative; background: #f0f0f0; }
.card-image image { width: 100%; height: 100%; }
.image-placeholder { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, #ff6b81, #ff8fa3); }
.image-placeholder text { font-size: 60rpx; color: #fff; font-weight: bold; }
.category-tag { position: absolute; top: 10rpx; right: 10rpx; font-size: 32rpx; }
.card-body { padding: 16rpx; }
.card-name { font-size: 28rpx; font-weight: 500; display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.card-price { font-size: 26rpx; color: #ff6b81; margin-top: 8rpx; display: block; }
.card-price.free { color: #999; font-size: 22rpx; }
```

### Task 16: Page — index (首页)

**Files:**
- Create: `miniprogram/pages/index/index.json`
- Create: `miniprogram/pages/index/index.js`
- Create: `miniprogram/pages/index/index.wxml`
- Create: `miniprogram/pages/index/index.wxss`

**Interfaces:**
- Consumes: `menu-card` component, `cart-icon` component, `getMenus` cloud function
- Produces: Navigation to detail page, menu page; admin entry point

- [ ] **Step 1: Create index.json**

```json
{
  "navigationBarTitleText": "专属点单",
  "usingComponents": {
    "menu-card": "/components/menu-card/index",
    "cart-icon": "/components/cart-icon/index"
  }
}
```

- [ ] **Step 2: Create index.js**

```javascript
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
```

- [ ] **Step 3: Create index.wxml**

```xml
<view class="page-index">
  <!-- 顶部区域 -->
  <view class="header">
    <view class="header-top">
      <view class="avatar-wrapper" bindtap="goToOrders">
        <image wx:if="{{app.globalData.userInfo.avatarUrl}}"
               src="{{app.globalData.userInfo.avatarUrl}}"
               class="avatar" />
        <view wx:else class="avatar-placeholder">👤</view>
      </view>
      <view class="greeting">{{greeting}}</view>
    </view>

    <!-- 管理入口 (仅管理员) -->
    <view class="admin-entry" wx:if="{{isAdmin}}">
      <view class="admin-btn" bindtap="subscribeAdmin">🔔 开启通知</view>
      <view class="admin-btn" bindtap="goToAdminMenu">📋 菜单</view>
      <view class="admin-btn" bindtap="goToAdminOrders">📦 订单</view>
      <view class="admin-btn" bindtap="goToAdminSuggest">💡 建议</view>
    </view>

    <!-- 用户入口 -->
    <view class="user-entry" wx:elif="{{!isAdmin}}">
      <view class="user-btn" bindtap="goToSuggest">💡 我想喝...</view>
    </view>
  </view>

  <!-- 分类 Tab -->
  <scroll-view scroll-x class="category-tabs">
    <view
      wx:for="{{categories}}"
      wx:key="key"
      class="tab-item {{activeCategory === item.key ? 'active' : ''}}"
      data-category="{{item.key}}"
      bindtap="switchCategory">
      {{item.label}}
    </view>
  </scroll-view>

  <!-- 菜品列表 -->
  <view class="menu-grid" wx:if="{{menus.length > 0}}">
    <view class="menu-item" wx:for="{{menus}}" wx:key="_id">
      <menu-card menu="{{item}}" bind:tap="onMenuTap" />
    </view>
  </view>

  <!-- 空状态 -->
  <view class="empty-state" wx:elif="{{!loading}}">
    <text class="icon">📭</text>
    <text class="text">菜单空空如也，等待投喂~</text>
  </view>

  <!-- 加载中 -->
  <view class="loading" wx:if="{{loading}}">
    <text>加载中...</text>
  </view>

  <!-- 购物车浮标 -->
  <cart-icon />
</view>
```

- [ ] **Step 4: Create index.wxss**

```css
.page-index {
  padding-bottom: 120rpx;
}

.header {
  background: linear-gradient(135deg, #ff6b81, #ff8fa3);
  padding: 30rpx;
  color: #fff;
}

.header-top {
  display: flex;
  align-items: center;
  gap: 20rpx;
}

.avatar-wrapper {
  width: 80rpx;
  height: 80rpx;
  border-radius: 50%;
  overflow: hidden;
  border: 3rpx solid rgba(255,255,255,0.5);
}

.avatar {
  width: 100%;
  height: 100%;
}

.avatar-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255,255,255,0.3);
  font-size: 40rpx;
}

.greeting {
  font-size: 34rpx;
  font-weight: 500;
}

.admin-entry,
.user-entry {
  display: flex;
  gap: 16rpx;
  margin-top: 20rpx;
  flex-wrap: wrap;
}

.admin-btn,
.user-btn {
  background: rgba(255,255,255,0.25);
  padding: 10rpx 24rpx;
  border-radius: 30rpx;
  font-size: 24rpx;
}

.admin-btn:active,
.user-btn:active {
  background: rgba(255,255,255,0.4);
}

.category-tabs {
  white-space: nowrap;
  padding: 20rpx;
  background: #fff;
  margin-bottom: 20rpx;
}

.tab-item {
  display: inline-block;
  padding: 12rpx 28rpx;
  margin-right: 16rpx;
  border-radius: 30rpx;
  background: #f5f5f5;
  font-size: 26rpx;
  color: #666;
  transition: all 0.2s;
}

.tab-item.active {
  background: #ff6b81;
  color: #fff;
}

.menu-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20rpx;
  padding: 0 20rpx;
}

.menu-item {
  width: 100%;
}

.loading {
  text-align: center;
  padding: 60rpx;
  color: #999;
}
```

### Task 17: Page — menu (菜单浏览)

**Files:**
- Create: `miniprogram/pages/menu/index.json`
- Create: `miniprogram/pages/menu/index.js`
- Create: `miniprogram/pages/menu/index.wxml`
- Create: `miniprogram/pages/menu/index.wxss`

- [ ] **Step 1: Create index.json**

```json
{
  "navigationBarTitleText": "全部菜单",
  "usingComponents": {
    "menu-card": "/components/menu-card/index",
    "cart-icon": "/components/cart-icon/index"
  }
}
```

- [ ] **Step 2: Create index.js**

```javascript
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
```

- [ ] **Step 3: Create index.wxml**

```xml
<view class="page-menu">
  <scroll-view scroll-x class="category-tabs">
    <view
      wx:for="{{categories}}"
      wx:key="key"
      class="tab-item {{activeCategory === item.key ? 'active' : ''}}"
      data-category="{{item.key}}"
      bindtap="switchCategory">
      {{item.label}}
    </view>
  </scroll-view>

  <view class="menu-grid" wx:if="{{menus.length > 0}}">
    <view class="menu-item" wx:for="{{menus}}" wx:key="_id">
      <menu-card menu="{{item}}" bind:tap="onMenuTap" />
    </view>
  </view>

  <view class="empty-state" wx:elif="{{!loading}}">
    <text class="icon">📭</text>
    <text class="text">暂无菜品</text>
  </view>

  <cart-icon />
</view>
```

- [ ] **Step 4: Create index.wxss** (reuse index page styles for category-tabs and menu-grid)

```css
.page-menu {
  padding-bottom: 120rpx;
}

.category-tabs {
  white-space: nowrap;
  padding: 20rpx;
  background: #fff;
  margin-bottom: 20rpx;
}

.tab-item {
  display: inline-block;
  padding: 12rpx 28rpx;
  margin-right: 16rpx;
  border-radius: 30rpx;
  background: #f5f5f5;
  font-size: 26rpx;
  color: #666;
  transition: all 0.2s;
}

.tab-item.active {
  background: #ff6b81;
  color: #fff;
}

.menu-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20rpx;
  padding: 0 20rpx;
}

.menu-item {
  width: 100%;
}
```

### Task 14: Component — cart-icon

**Files:**
- Create: `miniprogram/components/cart-icon/index.js`
- Create: `miniprogram/components/cart-icon/index.json`
- Create: `miniprogram/components/cart-icon/index.wxml`
- Create: `miniprogram/components/cart-icon/index.wxss`

**Interfaces:**
- Reads: `getApp().globalData.cartCount`
- Events: `tap` — navigates to cart page
- Consumed by: index page, menu page, detail page

- [ ] **Step 1: Create index.json**

```json
{
  "component": true,
  "usingComponents": {}
}
```

- [ ] **Step 2: Create index.js**

```javascript
Component({
  properties: {},
  data: {
    count: 0
  },
  lifetimes: {
    attached() {
      this.updateCount()
    },
    ready() {
      // Poll for changes (simple approach since we use globalData)
      this._timer = setInterval(() => {
        this.updateCount()
      }, 500)
    },
    detached() {
      if (this._timer) clearInterval(this._timer)
    }
  },
  pageLifetimes: {
    show() {
      this.updateCount()
    }
  },
  methods: {
    updateCount() {
      const app = getApp()
      this.setData({ count: app.globalData.cartCount })
    },
    onTap() {
      wx.switchTab({ url: '/pages/cart/index' })
    }
  }
})
```

- [ ] **Step 3: Create index.wxml**

```xml
<view class="cart-icon" bindtap="onTap" wx:if="{{count > 0}}">
  <view class="icon-wrapper">
    <text class="icon">🛒</text>
    <view class="badge" wx:if="{{count > 0}}">
      <text>{{count > 99 ? '99+' : count}}</text>
    </view>
  </view>
</view>
```

- [ ] **Step 4: Create index.wxss**

```css
.cart-icon {
  position: fixed;
  right: 30rpx;
  bottom: 120rpx;
  z-index: 999;
}

.icon-wrapper {
  width: 100rpx;
  height: 100rpx;
  background: linear-gradient(135deg, #ff6b81, #ff8fa3);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4rpx 20rpx rgba(255, 107, 129, 0.4);
  position: relative;
}

.icon {
  font-size: 44rpx;
}

.badge {
  position: absolute;
  top: -8rpx;
  right: -8rpx;
  min-width: 36rpx;
  height: 36rpx;
  background: #ff4757;
  border-radius: 18rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 8rpx;
}

.badge text {
  color: #fff;
  font-size: 20rpx;
  font-weight: bold;
}
```

### Task 15: Component — status-badge

**Files:**
- Create: `miniprogram/components/status-badge/index.js`
- Create: `miniprogram/components/status-badge/index.json`
- Create: `miniprogram/components/status-badge/index.wxml`
- Create: `miniprogram/components/status-badge/index.wxss`

**Interfaces:**
- Props: `status: string` — one of `"pending"`, `"accepted"`, `"preparing"`, `"done"`
- Consumed by: orders page, admin-orders page

- [ ] **Step 1: Create index.json**

```json
{
  "component": true,
  "usingComponents": {}
}
```

- [ ] **Step 2: Create index.js**

```javascript
Component({
  properties: {
    status: {
      type: String,
      value: 'pending'
    }
  },

  data: {
    statusText: '',
    bgColor: '#eee'
  },

  lifetimes: {
    attached() {
      this.updateStatus()
    }
  },

  observers: {
    'status'() {
      this.updateStatus()
    }
  },

  methods: {
    updateStatus() {
      const map = {
        pending: { text: '待处理', color: '#fff3e0', textColor: '#ff9800' },
        accepted: { text: '已接单', color: '#e3f2fd', textColor: '#2196f3' },
        preparing: { text: '制作中', color: '#f3e5f5', textColor: '#9c27b0' },
        done: { text: '已完成', color: '#e8f5e9', textColor: '#4caf50' }
      }
      const info = map[this.data.status] || map.pending
      this.setData({
        statusText: info.text,
        bgColor: info.color,
        textColor: info.textColor
      })
    }
  }
})
```

- [ ] **Step 3: Create index.wxml**

```xml
<view class="status-badge" style="background-color: {{bgColor}}; color: {{textColor}};">
  {{statusText}}
</view>
```

- [ ] **Step 4: Create index.wxss**

```css
.status-badge {
  display: inline-block;
  padding: 6rpx 20rpx;
  border-radius: 20rpx;
  font-size: 24rpx;
  font-weight: 500;
}
```

---

### Task 18: Page — detail (菜品详情)

**Files:**
- Create: `miniprogram/pages/detail/index.json`
- Create: `miniprogram/pages/detail/index.js`
- Create: `miniprogram/pages/detail/index.wxml`
- Create: `miniprogram/pages/detail/index.wxss`

**Interfaces:**
- Query param: `?id=menuId`
- Consumes: `cart-icon` component, `getMenus` cloud function
- Produces: Adds item to cart via `util.addToCart()`

- [ ] **Step 1: Create index.json**

```json
{
  "navigationBarTitleText": "菜品详情",
  "usingComponents": {
    "cart-icon": "/components/cart-icon/index"
  }
}
```

- [ ] **Step 2: Create index.js**

```javascript
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
```

- [ ] **Step 3: Create index.wxml**

```xml
<view class="page-detail" wx:if="{{menu}}">
  <view class="hero-image">
    <image wx:if="{{menu.image}}" src="{{menu.image}}" mode="aspectFill" />
    <view wx:else class="hero-placeholder">
      <text>{{menu.name[0]}}</text>
    </view>
  </view>

  <view class="info-section">
    <view class="info-header">
      <text class="menu-name">{{menu.name}}</text>
      <text class="menu-category">
        {{menu.category === 'drink' ? '🥤' : menu.category === 'snack' ? '🍿' : '🍱'}}
      </text>
    </view>
    <text class="menu-price" wx:if="{{menu.price}}">¥{{menu.price}}</text>
    <text class="menu-price free" wx:else>免费投喂 ❤️</text>
  </view>

  <view class="specs-section" wx:if="{{menu.specs && menu.specs.length > 0}}">
    <view class="spec-group" wx:for="{{menu.specs}}" wx:key="name">
      <text class="spec-label">{{item.name}}</text>
      <view class="spec-options">
        <view
          wx:for="{{item.options}}"
          wx:for-item="opt"
          wx:key="*this"
          class="spec-option {{selectedSpecs[item.name] === opt ? 'active' : ''}}"
          data-name="{{item.name}}"
          data-value="{{opt}}"
          bindtap="onSpecChange">{{opt}}</view>
      </view>
    </view>
  </view>

  <view class="quantity-section">
    <text class="section-label">数量</text>
    <view class="quantity-control">
      <view class="qty-btn" bindtap="onQuantityMinus">-</view>
      <text class="qty-value">{{quantity}}</text>
      <view class="qty-btn" bindtap="onQuantityPlus">+</view>
    </view>
  </view>

  <view class="remark-section">
    <text class="section-label">备注</text>
    <textarea class="remark-input" placeholder="额外要求，比如多加珍珠..."
              maxlength="100" value="{{remark}}" bindinput="onRemarkInput" />
  </view>

  <view class="bottom-bar">
    <view class="btn-cart" bindtap="addToCart">
      <text>加入购物车</text>
    </view>
  </view>

  <cart-icon />
</view>
```

- [ ] **Step 4: Create index.wxss**

```css
.page-detail { padding-bottom: 180rpx; }
.hero-image { width: 100%; height: 400rpx; background: #f0f0f0; }
.hero-image image { width: 100%; height: 100%; }
.hero-placeholder { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, #ff6b81, #ff8fa3); }
.hero-placeholder text { font-size: 120rpx; color: #fff; font-weight: bold; }
.info-section { background: #fff; padding: 30rpx; margin-bottom: 20rpx; }
.info-header { display: flex; align-items: center; gap: 16rpx; }
.menu-name { font-size: 36rpx; font-weight: 600; }
.menu-category { font-size: 32rpx; }
.menu-price { font-size: 30rpx; color: #ff6b81; margin-top: 10rpx; display: block; }
.menu-price.free { color: #999; font-size: 26rpx; }
.specs-section { background: #fff; padding: 30rpx; margin-bottom: 20rpx; }
.spec-group { margin-bottom: 24rpx; }
.spec-group:last-child { margin-bottom: 0; }
.spec-label { font-size: 28rpx; color: #666; margin-bottom: 12rpx; display: block; }
.spec-options { display: flex; flex-wrap: wrap; gap: 16rpx; }
.spec-option { padding: 12rpx 24rpx; border-radius: 30rpx; background: #f5f5f5; font-size: 26rpx; color: #666; }
.spec-option.active { background: #ff6b81; color: #fff; }
.quantity-section { background: #fff; padding: 30rpx; margin-bottom: 20rpx; display: flex; justify-content: space-between; align-items: center; }
.section-label { font-size: 28rpx; color: #666; }
.quantity-control { display: flex; align-items: center; gap: 24rpx; }
.qty-btn { width: 56rpx; height: 56rpx; border-radius: 50%; background: #f5f5f5; display: flex; align-items: center; justify-content: center; font-size: 32rpx; color: #666; }
.qty-value { font-size: 32rpx; font-weight: 600; min-width: 60rpx; text-align: center; }
.remark-section { background: #fff; padding: 30rpx; margin-bottom: 20rpx; }
.remark-input { width: 100%; height: 120rpx; border: 1rpx solid #eee; border-radius: 12rpx; padding: 16rpx; font-size: 26rpx; margin-top: 12rpx; box-sizing: border-box; }
.bottom-bar { position: fixed; bottom: 0; left: 0; right: 0; padding: 20rpx 30rpx; padding-bottom: calc(20rpx + env(safe-area-inset-bottom)); background: #fff; box-shadow: 0 -2rpx 12rpx rgba(0,0,0,0.05); }
.btn-cart { width: 100%; background: linear-gradient(135deg, #ff6b81, #ff8fa3); color: #fff; text-align: center; padding: 24rpx; border-radius: 40rpx; font-size: 32rpx; font-weight: 500; }
```

### Task 19: Page — cart (购物车)

**Files:**
- Create: `miniprogram/pages/cart/index.json`
- Create: `miniprogram/pages/cart/index.js`
- Create: `miniprogram/pages/cart/index.wxml`
- Create: `miniprogram/pages/cart/index.wxss`

- [ ] **Step 1: Create index.json**

```json
{
  "navigationBarTitleText": "购物车",
  "usingComponents": {}
}
```

- [ ] **Step 2: Create index.js**

```javascript
const util = require('../../utils/util')

Page({
  data: {
    cartItems: [],
    totalCount: 0,
    note: '',
    submitting: false
  },

  onShow() {
    this.loadCart()
  },

  loadCart() {
    const cart = util.getCart()
    const totalCount = cart.reduce((sum, item) => sum + item.quantity, 0)
    this.setData({ cartItems: cart, totalCount })
  },

  onQuantityChange(e) {
    const { index, action } = e.currentTarget.dataset
    const cart = util.getCart()
    if (action === 'minus') {
      if (cart[index].quantity > 1) { cart[index].quantity -= 1 }
      else { cart.splice(index, 1) }
    } else if (action === 'plus') {
      if (cart[index].quantity < 99) { cart[index].quantity += 1 }
    }
    util.saveCart(cart)
    this.loadCart()
  },

  onRemoveItem(e) {
    const index = e.currentTarget.dataset.index
    wx.showModal({
      title: '确认删除',
      content: '确定要移除此菜品吗？',
      success: (res) => {
        if (res.confirm) {
          const cart = util.getCart()
          cart.splice(index, 1)
          util.saveCart(cart)
          this.loadCart()
        }
      }
    })
  },

  onNoteInput(e) {
    this.setData({ note: e.detail.value })
  },

  submitOrder() {
    if (this.data.cartItems.length === 0) {
      wx.showToast({ title: '购物车为空', icon: 'none' })
      return
    }
    this.setData({ submitting: true })
    wx.cloud.callFunction({
      name: 'submitOrder',
      data: {
        items: this.data.cartItems.map(item => ({
          menuId: item.menuId, name: item.name,
          quantity: item.quantity, specs: item.specs, remark: item.remark
        })),
        note: this.data.note
      }
    }).then(() => {
      util.clearCart()
      this.loadCart()
      this.setData({ note: '', submitting: false })
      wx.requestSubscribeMessage({
        tmplIds: ['USER_STATUS_TEMPLATE_ID'],
        success: () => {}, fail: () => {},
        complete: () => {
          wx.showModal({
            title: '下单成功',
            content: '你的专属订单已提交，等着享用吧~',
            showCancel: false,
            success: () => { wx.switchTab({ url: '/pages/index/index' }) }
          })
        }
      })
    }).catch(() => {
      this.setData({ submitting: false })
      wx.showToast({ title: '下单失败，请重试', icon: 'none' })
    })
  }
})
```

- [ ] **Step 3: Create index.wxml**

```xml
<view class="page-cart">
  <view wx:if="{{cartItems.length > 0}}">
    <view class="cart-item" wx:for="{{cartItems}}" wx:key="menuId">
      <view class="item-image">
        <image wx:if="{{item.image}}" src="{{item.image}}" mode="aspectFill" />
        <view wx:else class="item-placeholder">{{item.name[0]}}</view>
      </view>
      <view class="item-info">
        <text class="item-name">{{item.name}}</text>
        <text class="item-specs" wx:if="{{item.specs}}">
          {{item.specs.冰量 || ''}}{{item.specs.甜度 ? '·' + item.specs.甜度 : ''}}{{item.specs.杯型 ? '·' + item.specs.杯型 : ''}}
        </text>
        <text class="item-remark" wx:if="{{item.remark}}">备注：{{item.remark}}</text>
      </view>
      <view class="item-actions">
        <view class="qty-control">
          <view class="qty-btn" data-index="{{index}}" data-action="minus" bindtap="onQuantityChange">-</view>
          <text class="qty-value">{{item.quantity}}</text>
          <view class="qty-btn" data-index="{{index}}" data-action="plus" bindtap="onQuantityChange">+</view>
        </view>
        <view class="delete-btn" data-index="{{index}}" bindtap="onRemoveItem">删除</view>
      </view>
    </view>
    <view class="order-note">
      <text class="note-label">订单备注</text>
      <textarea class="note-input" placeholder="比如：送到房间、趁热吃..." maxlength="100"
                value="{{note}}" bindinput="onNoteInput" />
    </view>
  </view>
  <view class="empty-state" wx:else>
    <text class="icon">🛒</text>
    <text class="text">购物车空空的，去逛逛吧~</text>
  </view>
  <view class="bottom-bar" wx:if="{{cartItems.length > 0}}">
    <view class="total-info">
      <text class="total-label">共</text>
      <text class="total-count">{{totalCount}}</text>
      <text class="total-label">件</text>
    </view>
    <view class="btn-submit {{submitting ? 'disabled' : ''}}" bindtap="submitOrder">
      <text>{{submitting ? '提交中...' : '提交订单'}}</text>
    </view>
  </view>
</view>
```

- [ ] **Step 4: Create index.wxss**

```css
.page-cart { padding-bottom: 140rpx; }
.cart-item { display: flex; background: #fff; padding: 24rpx; margin-bottom: 2rpx; gap: 16rpx; }
.item-image { width: 120rpx; height: 120rpx; border-radius: 12rpx; overflow: hidden; flex-shrink: 0; background: #f0f0f0; }
.item-image image { width: 100%; height: 100%; }
.item-placeholder { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, #ff6b81, #ff8fa3); color: #fff; font-size: 48rpx; font-weight: bold; }
.item-info { flex: 1; display: flex; flex-direction: column; justify-content: center; gap: 6rpx; min-width: 0; }
.item-name { font-size: 30rpx; font-weight: 500; }
.item-specs { font-size: 24rpx; color: #999; }
.item-remark { font-size: 24rpx; color: #ff6b81; }
.item-actions { display: flex; flex-direction: column; align-items: flex-end; justify-content: space-between; flex-shrink: 0; }
.qty-control { display: flex; align-items: center; gap: 12rpx; }
.qty-btn { width: 44rpx; height: 44rpx; border-radius: 50%; border: 1rpx solid #ddd; display: flex; align-items: center; justify-content: center; font-size: 28rpx; color: #666; }
.qty-value { font-size: 28rpx; min-width: 40rpx; text-align: center; }
.delete-btn { font-size: 22rpx; color: #999; padding: 4rpx 12rpx; margin-top: 8rpx; }
.order-note { background: #fff; padding: 24rpx; margin-top: 20rpx; }
.note-label { font-size: 28rpx; color: #666; display: block; margin-bottom: 12rpx; }
.note-input { width: 100%; height: 100rpx; border: 1rpx solid #eee; border-radius: 12rpx; padding: 16rpx; font-size: 26rpx; box-sizing: border-box; }
.bottom-bar { position: fixed; bottom: 0; left: 0; right: 0; display: flex; align-items: center; justify-content: space-between; padding: 20rpx 30rpx; padding-bottom: calc(20rpx + env(safe-area-inset-bottom)); background: #fff; box-shadow: 0 -2rpx 12rpx rgba(0,0,0,0.05); }
.total-info { display: flex; align-items: baseline; gap: 6rpx; }
.total-label { font-size: 26rpx; color: #666; }
.total-count { font-size: 36rpx; color: #ff6b81; font-weight: 600; }
.btn-submit { background: linear-gradient(135deg, #ff6b81, #ff8fa3); color: #fff; padding: 20rpx 48rpx; border-radius: 40rpx; font-size: 30rpx; font-weight: 500; }
.btn-submit.disabled { opacity: 0.6; }
```

### Task 20: Page — orders (我的订单)

**Files:**
- Create: `miniprogram/pages/orders/index.json`
- Create: `miniprogram/pages/orders/index.js`
- Create: `miniprogram/pages/orders/index.wxml`
- Create: `miniprogram/pages/orders/index.wxss`

- [ ] **Step 1: Create index.json**

```json
{
  "navigationBarTitleText": "我的订单",
  "usingComponents": {
    "status-badge": "/components/status-badge/index"
  }
}
```

- [ ] **Step 2: Create index.js**

```javascript
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
```

- [ ] **Step 3: Create index.wxml**

```xml
<view class="page-orders">
  <view class="user-header">
    <view class="user-avatar">
      <image wx:if="{{userInfo && userInfo.avatarUrl}}" src="{{userInfo.avatarUrl}}" />
      <view wx:else class="avatar-placeholder">👤</view>
    </view>
    <text class="user-name">{{userInfo ? userInfo.nickName : '点击登录'}}</text>
  </view>

  <view class="subscribe-row">
    <view class="subscribe-btn" bindtap="subscribeStatus">🔔 订单状态通知</view>
  </view>

  <view class="admin-links" wx:if="{{isAdmin}}">
    <view class="admin-link-item" bindtap="goToAdminMenu">
      <text class="link-icon">📋</text><text class="link-text">菜单管理</text><text class="link-arrow">›</text>
    </view>
    <view class="admin-link-item" bindtap="goToAdminOrders">
      <text class="link-icon">📦</text><text class="link-text">订单管理</text><text class="link-arrow">›</text>
    </view>
    <view class="admin-link-item" bindtap="goToAdminSuggest">
      <text class="link-icon">💡</text><text class="link-text">建议审核</text><text class="link-arrow">›</text>
    </view>
  </view>

  <view class="user-link" wx:elif="{{!isAdmin}}">
    <view class="admin-link-item" bindtap="goToSuggest">
      <text class="link-icon">💡</text><text class="link-text">我想喝...</text><text class="link-arrow">›</text>
    </view>
  </view>

  <view class="order-tabs">
    <view wx:for="{{[{key:'all',label:'全部'},{key:'pending',label:'待处理'},{key:'done',label:'已完成'}]}}"
          wx:key="key" class="tab-item {{activeTab === item.key ? 'active' : ''}}"
          data-tab="{{item.key}}" bindtap="switchTab">{{item.label}}</view>
  </view>

  <view class="order-list" wx:if="{{orders.length > 0}}">
    <view class="order-card" wx:for="{{orders}}" wx:key="_id"
          wx:if="{{activeTab === 'all' || (activeTab === 'pending' && item.status !== 'done') || (activeTab === 'done' && item.status === 'done')}}">
      <view class="order-header">
        <text class="order-time">{{item.formattedTime}}</text>
        <status-badge status="{{item.status}}" />
      </view>
      <view class="order-items">
        <view class="order-item" wx:for="{{item.items}}" wx:key="menuId" wx:for-item="oi">
          <text class="oi-name">{{oi.name}}</text><text class="oi-qty">x{{oi.quantity}}</text>
          <text class="oi-specs" wx:if="{{oi.specs}}">
            {{oi.specs.冰量 || ''}}{{oi.specs.甜度 ? '·' + oi.specs.甜度 : ''}}{{oi.specs.杯型 ? '·' + oi.specs.杯型 : ''}}
          </text>
          <text class="oi-remark" wx:if="{{oi.remark}}">备注：{{oi.remark}}</text>
        </view>
      </view>
      <view class="order-note" wx:if="{{item.note}}"><text>📝 {{item.note}}</text></view>
    </view>
  </view>
  <view class="empty-state" wx:elif="{{!loading}}">
    <text class="icon">📦</text><text class="text">暂无订单</text>
  </view>
  <view class="loading" wx:if="{{loading}}"><text>加载中...</text></view>
</view>
```

- [ ] **Step 4: Create index.wxss**

```css
.page-orders { min-height: 100vh; }
.user-header { display: flex; align-items: center; gap: 20rpx; padding: 30rpx; background: linear-gradient(135deg, #ff6b81, #ff8fa3); }
.user-avatar { width: 100rpx; height: 100rpx; border-radius: 50%; overflow: hidden; border: 3rpx solid rgba(255,255,255,0.5); background: rgba(255,255,255,0.3); }
.user-avatar image { width: 100%; height: 100%; }
.avatar-placeholder { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-size: 48rpx; }
.user-name { font-size: 34rpx; color: #fff; font-weight: 500; }
.subscribe-row { background: #fff; padding: 20rpx 30rpx; border-bottom: 1rpx solid #f0f0f0; }
.subscribe-btn { text-align: center; padding: 14rpx; background: #fff8e1; border-radius: 12rpx; font-size: 26rpx; color: #f57f17; }
.admin-links, .user-link { background: #fff; margin-bottom: 20rpx; }
.admin-link-item { display: flex; align-items: center; padding: 24rpx 30rpx; border-bottom: 1rpx solid #f5f5f5; }
.admin-link-item:last-child { border-bottom: none; }
.link-icon { font-size: 36rpx; margin-right: 16rpx; }
.link-text { flex: 1; font-size: 28rpx; }
.link-arrow { font-size: 32rpx; color: #ccc; }
.order-tabs { display: flex; background: #fff; padding: 0 30rpx; border-bottom: 1rpx solid #f0f0f0; }
.tab-item { padding: 20rpx 32rpx; font-size: 28rpx; color: #666; border-bottom: 3rpx solid transparent; }
.tab-item.active { color: #ff6b81; border-bottom-color: #ff6b81; }
.order-list { padding: 20rpx; }
.order-card { background: #fff; border-radius: 16rpx; padding: 24rpx; margin-bottom: 20rpx; box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.06); }
.order-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16rpx; }
.order-time { font-size: 24rpx; color: #999; }
.order-items { border-top: 1rpx solid #f5f5f5; padding-top: 16rpx; }
.order-item { margin-bottom: 12rpx; padding-bottom: 12rpx; border-bottom: 1rpx dashed #f5f5f5; }
.order-item:last-child { margin-bottom: 0; padding-bottom: 0; border-bottom: none; }
.oi-name { font-size: 28rpx; font-weight: 500; }
.oi-qty { font-size: 26rpx; color: #999; margin-left: 12rpx; }
.oi-specs { display: block; font-size: 24rpx; color: #999; margin-top: 4rpx; }
.oi-remark { display: block; font-size: 24rpx; color: #ff6b81; margin-top: 4rpx; }
.order-note { margin-top: 12rpx; font-size: 24rpx; color: #666; background: #fafafa; padding: 12rpx 16rpx; border-radius: 8rpx; }
.loading { text-align: center; padding: 60rpx; color: #999; }
```

### Task 21: Page — suggest (建议菜品)

**Files:**
- Create: `miniprogram/pages/suggest/index.json`
- Create: `miniprogram/pages/suggest/index.js`
- Create: `miniprogram/pages/suggest/index.wxml`
- Create: `miniprogram/pages/suggest/index.wxss`

- [ ] **Step 1: Create index.json**

```json
{
  "navigationBarTitleText": "我想喝...",
  "usingComponents": {}
}
```

- [ ] **Step 2: Create index.js**

```javascript
Page({
  data: {
    categories: [
      { key: 'drink', label: '🥤 奶茶' },
      { key: 'snack', label: '🍿 零食' },
      { key: 'meal', label: '🍱 餐食' }
    ],
    selectedCategory: 'drink',
    name: '',
    reason: '',
    submitting: false
  },

  onCategoryChange(e) {
    this.setData({ selectedCategory: e.currentTarget.dataset.category })
  },

  onNameInput(e) { this.setData({ name: e.detail.value }) },
  onReasonInput(e) { this.setData({ reason: e.detail.value }) },

  submit() {
    const { selectedCategory, name, reason } = this.data
    if (!name.trim()) {
      wx.showToast({ title: '请输入菜品名称', icon: 'none' })
      return
    }
    this.setData({ submitting: true })
    wx.cloud.callFunction({
      name: 'submitSuggestion',
      data: { name: name.trim(), category: selectedCategory, reason: reason.trim() }
    }).then(() => {
      this.setData({ name: '', reason: '', submitting: false })
      wx.showModal({
        title: '建议已提交',
        content: '收到你的建议啦，等我的好消息~',
        showCancel: false,
        success: () => { wx.navigateBack() }
      })
    }).catch(() => {
      this.setData({ submitting: false })
      wx.showToast({ title: '提交失败，请重试', icon: 'none' })
    })
  }
})
```

- [ ] **Step 3: Create index.wxml**

```xml
<view class="page-suggest">
  <view class="form-section">
    <view class="form-group">
      <text class="form-label">分类</text>
      <view class="category-options">
        <view wx:for="{{categories}}" wx:key="key"
              class="cat-option {{selectedCategory === item.key ? 'active' : ''}}"
              data-category="{{item.key}}" bindtap="onCategoryChange">{{item.label}}</view>
      </view>
    </view>
    <view class="form-group">
      <text class="form-label">想喝/想吃什么？</text>
      <input class="form-input" placeholder="比如：杨枝甘露" maxlength="30"
             value="{{name}}" bindinput="onNameInput" />
    </view>
    <view class="form-group">
      <text class="form-label">推荐理由（选填）</text>
      <textarea class="form-textarea" placeholder="比如：学校门口的杨枝甘露特别好喝！"
                maxlength="100" value="{{reason}}" bindinput="onReasonInput" />
    </view>
    <view class="btn-submit {{submitting ? 'disabled' : ''}}" bindtap="submit">
      <text>{{submitting ? '提交中...' : '提交建议 💌'}}</text>
    </view>
  </view>
  <view class="tips">
    <text class="tips-icon">💡</text>
    <text class="tips-text">你想喝什么都可以在这里告诉我，我会考虑加到菜单里~</text>
  </view>
</view>
```

- [ ] **Step 4: Create index.wxss**

```css
.page-suggest { padding: 20rpx; }
.form-section { background: #fff; border-radius: 16rpx; padding: 30rpx; margin-bottom: 30rpx; }
.form-group { margin-bottom: 30rpx; }
.form-label { font-size: 28rpx; color: #333; display: block; margin-bottom: 16rpx; font-weight: 500; }
.category-options { display: flex; gap: 20rpx; }
.cat-option { flex: 1; text-align: center; padding: 16rpx; border-radius: 12rpx; background: #f5f5f5; font-size: 26rpx; }
.cat-option.active { background: linear-gradient(135deg, #ff6b81, #ff8fa3); color: #fff; }
.form-input { width: 100%; height: 80rpx; border: 1rpx solid #eee; border-radius: 12rpx; padding: 0 16rpx; font-size: 28rpx; box-sizing: border-box; }
.form-textarea { width: 100%; height: 150rpx; border: 1rpx solid #eee; border-radius: 12rpx; padding: 16rpx; font-size: 26rpx; box-sizing: border-box; }
.btn-submit { width: 100%; background: linear-gradient(135deg, #ff6b81, #ff8fa3); color: #fff; text-align: center; padding: 24rpx; border-radius: 40rpx; font-size: 30rpx; font-weight: 500; margin-top: 10rpx; }
.btn-submit.disabled { opacity: 0.6; }
.tips { display: flex; align-items: flex-start; gap: 12rpx; padding: 24rpx; background: #fff8e1; border-radius: 12rpx; font-size: 24rpx; color: #f57f17; line-height: 1.6; }
.tips-icon { font-size: 32rpx; flex-shrink: 0; }
```

### Task 22: Page — admin-menu (管理菜单)

**Files:**
- Create: `miniprogram/pages/admin-menu/index.json`
- Create: `miniprogram/pages/admin-menu/index.js`
- Create: `miniprogram/pages/admin-menu/index.wxml`
- Create: `miniprogram/pages/admin-menu/index.wxss`

- [ ] **Step 1: Create index.json**

```json
{ "navigationBarTitleText": "菜单管理", "usingComponents": {} }
```

- [ ] **Step 2: Create index.js**

```javascript
Page({
  data: {
    menus: [], loading: false,
    showEditor: false, editorMode: 'add', editingMenu: null,
    formData: { name: '', category: 'drink', price: '', specsText: '', image: '' }
  },

  onShow() { this.loadMenus() },

  loadMenus() {
    this.setData({ loading: true })
    wx.cloud.callFunction({ name: 'getMenus', data: { category: '' } })
      .then(res => { this.setData({ menus: res.result.menus || [], loading: false }) })
      .catch(() => { this.setData({ loading: false }) })
  },

  showAdd() {
    this.setData({
      showEditor: true, editorMode: 'add',
      formData: { name: '', category: 'drink', price: '', specsText: '', image: '' }
    })
  },

  showEdit(e) {
    const menu = e.currentTarget.dataset.menu
    const specsText = (menu.specs || []).map(s => `${s.name}:${s.options.join(',')}`).join('|')
    this.setData({
      showEditor: true, editorMode: 'edit', editingMenu: menu,
      formData: { name: menu.name, category: menu.category, price: String(menu.price || ''), specsText, image: menu.image || '' }
    })
  },

  hideEditor() { this.setData({ showEditor: false, editingMenu: null }) },

  onFormFieldChange(e) {
    const { field } = e.currentTarget.dataset
    const formData = { ...this.data.formData, [field]: e.detail.value }
    this.setData({ formData })
  },

  onCategorySelect(e) {
    const formData = { ...this.data.formData, category: e.currentTarget.dataset.value }
    this.setData({ formData })
  },

  onUploadImage() {
    wx.chooseImage({
      count: 1, sizeType: ['compressed'],
      success: (res) => {
        wx.showLoading({ title: '上传中...' })
        wx.cloud.uploadFile({
          cloudPath: `menu-images/${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`,
          filePath: res.tempFilePaths[0],
          success: (uploadRes) => {
            wx.hideLoading()
            const formData = { ...this.data.formData, image: uploadRes.fileID }
            this.setData({ formData })
            wx.showToast({ title: '上传成功', icon: 'success' })
          },
          fail: () => { wx.hideLoading(); wx.showToast({ title: '上传失败', icon: 'none' }) }
        })
      }
    })
  },

  saveMenu() {
    const { formData, editorMode, editingMenu } = this.data
    if (!formData.name.trim()) { wx.showToast({ title: '请输入菜品名称', icon: 'none' }); return }
    const specs = formData.specsText
      ? formData.specsText.split('|').filter(s => s.includes(':')).map(s => {
          const [name, opts] = s.split(':')
          return { name: name.trim(), options: opts.split(',').map(o => o.trim()).filter(Boolean) }
        })
      : []
    const menuData = { name: formData.name.trim(), category: formData.category, price: parseFloat(formData.price) || 0, specs }
    if (formData.image) menuData.image = formData.image

    const fnName = editorMode === 'add' ? 'addMenu' : 'updateMenu'
    const data = editorMode === 'add' ? menuData : { menuId: editingMenu._id, ...menuData }
    wx.cloud.callFunction({ name: fnName, data })
      .then(() => { wx.showToast({ title: editorMode === 'add' ? '添加成功' : '修改成功', icon: 'success' }); this.hideEditor(); this.loadMenus() })
      .catch(() => { wx.showToast({ title: '操作失败', icon: 'none' }) })
  },

  toggleAvailable(e) {
    const menu = e.currentTarget.dataset.menu
    wx.cloud.callFunction({ name: 'updateMenu', data: { menuId: menu._id, available: !menu.available } })
      .then(() => { this.loadMenus() })
  },

  deleteMenu(e) {
    const menu = e.currentTarget.dataset.menu
    wx.showModal({
      title: '确认删除', content: `确定要下架「${menu.name}」吗？`,
      success: (res) => {
        if (res.confirm) {
          wx.cloud.callFunction({ name: 'deleteMenu', data: { menuId: menu._id } })
            .then(() => { wx.showToast({ title: '已下架', icon: 'success' }); this.loadMenus() })
        }
      }
    })
  }
})
```

- [ ] **Step 3: Create index.wxml**

```xml
<view class="page-admin-menu">
  <view class="menu-list">
    <view class="menu-item" wx:for="{{menus}}" wx:key="_id">
      <view class="item-image">
        <image wx:if="{{item.image}}" src="{{item.image}}" mode="aspectFill" />
        <view wx:else class="image-placeholder">{{item.name[0]}}</view>
        <view class="available-badge {{item.available ? 'on' : 'off'}}">{{item.available ? '上架' : '下架'}}</view>
      </view>
      <view class="item-info">
        <text class="item-name">{{item.name}}</text>
        <text class="item-cat">{{item.category === 'drink' ? '奶茶' : item.category === 'snack' ? '零食' : '餐食'}}</text>
      </view>
      <view class="item-actions">
        <view class="action-btn" data-menu="{{item}}" bindtap="showEdit">编辑</view>
        <view class="action-btn" data-menu="{{item}}" bindtap="toggleAvailable">{{item.available ? '下架' : '上架'}}</view>
        <view class="action-btn danger" data-menu="{{item}}" bindtap="deleteMenu">删除</view>
      </view>
    </view>
    <view class="empty-state" wx:if="{{menus.length === 0 && !loading}}">
      <text class="icon">📋</text><text class="text">菜单为空，添加第一个菜品吧</text>
    </view>
  </view>
  <view class="fab" bindtap="showAdd"><text>+</text></view>

  <view class="editor-overlay" wx:if="{{showEditor}}" bindtap="hideEditor">
    <view class="editor-panel" catchtap="">
      <view class="editor-header">
        <text>{{editorMode === 'add' ? '添加菜品' : '编辑菜品'}}</text>
        <view class="close-btn" bindtap="hideEditor">✕</view>
      </view>
      <scroll-view scroll-y class="editor-body">
        <view class="form-group">
          <text class="form-label">图片</text>
          <view class="upload-btn" bindtap="onUploadImage">
            <text>{{formData.image ? '已上传 ✓' : '点击上传图片'}}</text>
          </view>
        </view>
        <view class="form-group">
          <text class="form-label">名称</text>
          <input class="form-input" placeholder="菜品名称" maxlength="20"
                 value="{{formData.name}}" data-field="name" bindinput="onFormFieldChange" />
        </view>
        <view class="form-group">
          <text class="form-label">分类</text>
          <view class="cat-options">
            <view class="cat-opt {{formData.category === 'drink' ? 'active' : ''}}" data-value="drink" bindtap="onCategorySelect">🥤 奶茶</view>
            <view class="cat-opt {{formData.category === 'snack' ? 'active' : ''}}" data-value="snack" bindtap="onCategorySelect">🍿 零食</view>
            <view class="cat-opt {{formData.category === 'meal' ? 'active' : ''}}" data-value="meal" bindtap="onCategorySelect">🍱 餐食</view>
          </view>
        </view>
        <view class="form-group">
          <text class="form-label">价格（可选）</text>
          <input class="form-input" type="digit" placeholder="0 表示无价格"
                 value="{{formData.price}}" data-field="price" bindinput="onFormFieldChange" />
        </view>
        <view class="form-group">
          <text class="form-label">规格配置</text>
          <textarea class="form-textarea" placeholder="格式：冰量:正常冰,少冰,去冰|甜度:全糖,半糖,无糖"
                    value="{{formData.specsText}}" data-field="specsText" bindinput="onFormFieldChange" />
          <text class="form-hint">格式：规格名:选项1,选项2（多规格用 | 分隔）</text>
        </view>
      </scroll-view>
      <view class="editor-footer">
        <view class="btn-save" bindtap="saveMenu">保存</view>
      </view>
    </view>
  </view>
</view>
```

- [ ] **Step 4: Create index.wxss**

```css
.page-admin-menu { padding-bottom: 120rpx; min-height: 100vh; }
.menu-item { display: flex; align-items: center; background: #fff; padding: 20rpx; margin-bottom: 2rpx; gap: 16rpx; }
.item-image { width: 100rpx; height: 100rpx; border-radius: 12rpx; overflow: hidden; flex-shrink: 0; position: relative; background: #f0f0f0; }
.item-image image { width: 100%; height: 100%; }
.image-placeholder { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, #ff6b81, #ff8fa3); color: #fff; font-size: 40rpx; font-weight: bold; }
.available-badge { position: absolute; bottom: 0; left: 0; right: 0; text-align: center; font-size: 18rpx; padding: 2rpx; color: #fff; }
.available-badge.on { background: #4caf50; } .available-badge.off { background: #999; }
.item-info { flex: 1; min-width: 0; }
.item-name { font-size: 28rpx; font-weight: 500; display: block; }
.item-cat { font-size: 22rpx; color: #999; }
.item-actions { display: flex; gap: 12rpx; flex-shrink: 0; }
.action-btn { padding: 8rpx 16rpx; border-radius: 8rpx; background: #f5f5f5; font-size: 22rpx; color: #666; }
.action-btn.danger { color: #ff4757; }
.fab { position: fixed; bottom: 60rpx; right: 40rpx; width: 100rpx; height: 100rpx; background: linear-gradient(135deg, #ff6b81, #ff8fa3); border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4rpx 20rpx rgba(255,107,129,0.4); z-index: 100; }
.fab text { color: #fff; font-size: 48rpx; font-weight: 300; }
.editor-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 1000; display: flex; align-items: flex-end; }
.editor-panel { width: 100%; max-height: 80vh; background: #fff; border-radius: 24rpx 24rpx 0 0; display: flex; flex-direction: column; }
.editor-header { display: flex; justify-content: space-between; align-items: center; padding: 30rpx; border-bottom: 1rpx solid #eee; font-size: 32rpx; font-weight: 600; }
.close-btn { font-size: 32rpx; color: #999; padding: 10rpx; }
.editor-body { padding: 30rpx; flex: 1; max-height: 55vh; }
.form-group { margin-bottom: 24rpx; }
.form-label { font-size: 26rpx; color: #666; display: block; margin-bottom: 10rpx; }
.upload-btn { padding: 24rpx; border: 2rpx dashed #ddd; border-radius: 12rpx; text-align: center; font-size: 26rpx; color: #999; }
.form-input { width: 100%; height: 72rpx; border: 1rpx solid #eee; border-radius: 10rpx; padding: 0 16rpx; font-size: 26rpx; box-sizing: border-box; }
.form-textarea { width: 100%; height: 100rpx; border: 1rpx solid #eee; border-radius: 10rpx; padding: 12rpx 16rpx; font-size: 24rpx; box-sizing: border-box; }
.form-hint { font-size: 20rpx; color: #ccc; margin-top: 6rpx; display: block; }
.cat-options { display: flex; gap: 16rpx; }
.cat-opt { flex: 1; text-align: center; padding: 14rpx; border-radius: 10rpx; background: #f5f5f5; font-size: 24rpx; }
.cat-opt.active { background: linear-gradient(135deg, #ff6b81, #ff8fa3); color: #fff; }
.editor-footer { padding: 20rpx 30rpx; padding-bottom: calc(20rpx + env(safe-area-inset-bottom)); border-top: 1rpx solid #eee; }
.btn-save { width: 100%; background: linear-gradient(135deg, #ff6b81, #ff8fa3); color: #fff; text-align: center; padding: 22rpx; border-radius: 40rpx; font-size: 30rpx; font-weight: 500; }
```

### Task 23: Page — admin-orders (管理订单)

**Files:**
- Create: `miniprogram/pages/admin-orders/index.json`
- Create: `miniprogram/pages/admin-orders/index.js`
- Create: `miniprogram/pages/admin-orders/index.wxml`
- Create: `miniprogram/pages/admin-orders/index.wxss`

- [ ] **Step 1: Create index.json**

```json
{ "navigationBarTitleText": "订单管理", "usingComponents": { "status-badge": "/components/status-badge/index" } }
```

- [ ] **Step 2: Create index.js**

```javascript
const util = require('../../utils/util')

Page({
  data: { orders: [], loading: false, activeTab: 'pending' },

  onShow() { this.loadOrders() },

  loadOrders() {
    this.setData({ loading: true })
    wx.cloud.callFunction({ name: 'getOrders', data: {} })
      .then(res => {
        const orders = (res.result.orders || []).map(o => ({ ...o, formattedTime: util.formatTime(o.createdAt) }))
        this.setData({ orders, loading: false })
      })
      .catch(() => { this.setData({ loading: false }) })
  },

  switchTab(e) { this.setData({ activeTab: e.currentTarget.dataset.tab }) },

  changeStatus(e) {
    const { orderId, status } = e.currentTarget.dataset
    const nextStatus = { pending: 'accepted', accepted: 'preparing', preparing: 'done' }[status]
    if (!nextStatus) return
    const statusText = { accepted: '接单', preparing: '开始制作', done: '完成' }
    wx.showModal({
      title: '确认操作',
      content: `确定要「${statusText[nextStatus]}」此订单吗？`,
      success: (res) => {
        if (res.confirm) {
          wx.cloud.callFunction({ name: 'updateOrderStatus', data: { orderId, status: nextStatus } })
            .then(() => { wx.showToast({ title: '更新成功', icon: 'success' }); this.loadOrders() })
            .catch(() => { wx.showToast({ title: '更新失败', icon: 'none' }) })
        }
      }
    })
  }
})
```

- [ ] **Step 3: Create index.wxml**

```xml
<view class="page-admin-orders">
  <view class="order-tabs">
    <view wx:for="{{[{key:'pending',label:'待处理'},{key:'accepted',label:'已接单'},{key:'preparing',label:'制作中'},{key:'done',label:'已完成'}]}}"
          wx:key="key" class="tab-item {{activeTab === item.key ? 'active' : ''}}"
          data-tab="{{item.key}}" bindtap="switchTab">
      {{item.label}}
      <text class="tab-count" wx:if="{{orders.filter(o => o.status === item.key).length > 0}}">
        {{orders.filter(o => o.status === item.key).length}}
      </text>
    </view>
  </view>

  <view class="order-list" wx:if="{{orders.length > 0}}">
    <view class="order-card" wx:for="{{orders}}" wx:key="_id" wx:if="{{item.status === activeTab}}">
      <view class="order-header">
        <text class="order-time">{{item.formattedTime}}</text>
        <status-badge status="{{item.status}}" />
      </view>
      <view class="order-items">
        <view class="order-item" wx:for="{{item.items}}" wx:key="menuId" wx:for-item="oi">
          <view class="oi-row">
            <text class="oi-name">{{oi.name}}</text><text class="oi-qty">x{{oi.quantity}}</text>
          </view>
          <text class="oi-specs" wx:if="{{oi.specs}}">
            {{oi.specs.冰量 || ''}}{{oi.specs.甜度 ? '·' + oi.specs.甜度 : ''}}{{oi.specs.杯型 ? '·' + oi.specs.杯型 : ''}}
          </text>
          <text class="oi-remark" wx:if="{{oi.remark}}">备注：{{oi.remark}}</text>
        </view>
      </view>
      <view class="order-note" wx:if="{{item.note}}"><text>📝 {{item.note}}</text></view>
      <view class="order-actions">
        <view class="action-btn" wx:if="{{item.status === 'pending'}}"
              data-order-id="{{item._id}}" data-status="pending" bindtap="changeStatus">✅ 接单</view>
        <view class="action-btn" wx:if="{{item.status === 'accepted'}}"
              data-order-id="{{item._id}}" data-status="accepted" bindtap="changeStatus">🔧 开始制作</view>
        <view class="action-btn done" wx:if="{{item.status === 'preparing'}}"
              data-order-id="{{item._id}}" data-status="preparing" bindtap="changeStatus">🎉 完成</view>
        <view class="action-done" wx:if="{{item.status === 'done'}}"><text>✅ 已完成</text></view>
      </view>
    </view>
  </view>
  <view class="empty-state" wx:elif="{{!loading}}">
    <text class="icon">📦</text><text class="text">暂无订单</text>
  </view>
</view>
```

- [ ] **Step 4: Create index.wxss**

```css
.page-admin-orders { min-height: 100vh; }
.order-tabs { display: flex; background: #fff; white-space: nowrap; overflow-x: auto; }
.tab-item { flex-shrink: 0; padding: 20rpx 20rpx; font-size: 26rpx; color: #666; border-bottom: 3rpx solid transparent; position: relative; }
.tab-item.active { color: #ff6b81; border-bottom-color: #ff6b81; }
.tab-count { display: inline-block; min-width: 32rpx; height: 32rpx; line-height: 32rpx; background: #ff6b81; color: #fff; border-radius: 16rpx; font-size: 20rpx; text-align: center; margin-left: 6rpx; padding: 0 8rpx; vertical-align: middle; }
.order-list { padding: 20rpx; }
.order-card { background: #fff; border-radius: 16rpx; padding: 24rpx; margin-bottom: 20rpx; box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.06); }
.order-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16rpx; }
.order-time { font-size: 24rpx; color: #999; }
.order-items { border-top: 1rpx solid #f5f5f5; padding-top: 16rpx; }
.order-item { margin-bottom: 12rpx; padding-bottom: 12rpx; border-bottom: 1rpx dashed #f5f5f5; }
.order-item:last-child { margin-bottom: 0; padding-bottom: 0; border-bottom: none; }
.oi-row { display: flex; align-items: baseline; gap: 10rpx; }
.oi-name { font-size: 30rpx; font-weight: 500; }
.oi-qty { font-size: 26rpx; color: #ff6b81; }
.oi-specs { display: block; font-size: 24rpx; color: #999; margin-top: 4rpx; }
.oi-remark { display: block; font-size: 24rpx; color: #ff6b81; margin-top: 4rpx; }
.order-note { margin-top: 12rpx; font-size: 24rpx; color: #666; background: #fafafa; padding: 12rpx 16rpx; border-radius: 8rpx; }
.order-actions { margin-top: 16rpx; display: flex; justify-content: flex-end; gap: 16rpx; }
.action-btn { padding: 12rpx 24rpx; border-radius: 30rpx; background: linear-gradient(135deg, #ff6b81, #ff8fa3); color: #fff; font-size: 26rpx; }
.action-btn.done { background: linear-gradient(135deg, #4caf50, #66bb6a); }
.action-done { padding: 12rpx 24rpx; font-size: 26rpx; color: #4caf50; }
```

### Task 24: Page — admin-suggest (审核建议)

**Files:**
- Create: `miniprogram/pages/admin-suggest/index.json`
- Create: `miniprogram/pages/admin-suggest/index.js`
- Create: `miniprogram/pages/admin-suggest/index.wxml`
- Create: `miniprogram/pages/admin-suggest/index.wxss`

- [ ] **Step 1: Create index.json**

```json
{ "navigationBarTitleText": "建议审核", "usingComponents": {} }
```

- [ ] **Step 2: Create index.js**

```javascript
Page({
  data: { suggestions: [], loading: false },

  onShow() { this.loadSuggestions() },

  loadSuggestions() {
    this.setData({ loading: true })
    wx.cloud.callFunction({ name: 'getSuggestions', data: {} })
      .then(res => { this.setData({ suggestions: res.result.suggestions || [], loading: false }) })
      .catch(() => { this.setData({ loading: false }) })
  },

  handleSuggestion(e) {
    const { id, action } = e.currentTarget.dataset
    const actionText = action === 'approved' ? '通过' : '拒绝'
    wx.showModal({
      title: '确认操作',
      content: `确定要${actionText}此建议吗？${action === 'approved' ? '将自动加入菜单。' : ''}`,
      success: (res) => {
        if (res.confirm) {
          wx.cloud.callFunction({ name: 'handleSuggestion', data: { suggestionId: id, action } })
            .then(() => { wx.showToast({ title: `已${actionText}`, icon: 'success' }); this.loadSuggestions() })
            .catch(() => { wx.showToast({ title: '操作失败', icon: 'none' }) })
        }
      }
    })
  }
})
```

- [ ] **Step 3: Create index.wxml**

```xml
<view class="page-admin-suggest">
  <view class="suggest-list" wx:if="{{suggestions.length > 0}}">
    <view class="suggest-card" wx:for="{{suggestions}}" wx:key="_id">
      <view class="suggest-header">
        <text class="suggest-name">{{item.name}}</text>
        <text class="suggest-cat">{{item.category === 'drink' ? '🥤 奶茶' : item.category === 'snack' ? '🍿 零食' : '🍱 餐食'}}</text>
      </view>
      <text class="suggest-reason" wx:if="{{item.reason}}">💬 {{item.reason}}</text>
      <view class="suggest-status">
        <text wx:if="{{item.status === 'pending'}}" class="status pending">待审核</text>
        <text wx:if="{{item.status === 'approved'}}" class="status approved">✅ 已通过</text>
        <text wx:if="{{item.status === 'rejected'}}" class="status rejected">❌ 已拒绝</text>
      </view>
      <view class="suggest-actions" wx:if="{{item.status === 'pending'}}">
        <view class="btn-approve" data-id="{{item._id}}" data-action="approved" bindtap="handleSuggestion">通过</view>
        <view class="btn-reject" data-id="{{item._id}}" data-action="rejected" bindtap="handleSuggestion">拒绝</view>
      </view>
    </view>
  </view>
  <view class="empty-state" wx:elif="{{!loading}}">
    <text class="icon">💡</text><text class="text">暂无建议</text>
  </view>
</view>
```

- [ ] **Step 4: Create index.wxss**

```css
.page-admin-suggest { padding: 20rpx; }
.suggest-card { background: #fff; border-radius: 16rpx; padding: 24rpx; margin-bottom: 20rpx; box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.06); }
.suggest-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12rpx; }
.suggest-name { font-size: 30rpx; font-weight: 600; }
.suggest-cat { font-size: 24rpx; }
.suggest-reason { display: block; font-size: 26rpx; color: #666; margin-bottom: 12rpx; line-height: 1.5; }
.suggest-status { margin-bottom: 12rpx; }
.status { font-size: 24rpx; padding: 4rpx 16rpx; border-radius: 20rpx; }
.status.pending { background: #fff3e0; color: #ff9800; }
.status.approved { background: #e8f5e9; color: #4caf50; }
.status.rejected { background: #ffebee; color: #f44336; }
.suggest-actions { display: flex; gap: 16rpx; justify-content: flex-end; border-top: 1rpx solid #f5f5f5; padding-top: 16rpx; }
.btn-approve { padding: 10rpx 32rpx; border-radius: 30rpx; background: linear-gradient(135deg, #4caf50, #66bb6a); color: #fff; font-size: 26rpx; }
.btn-reject { padding: 10rpx 32rpx; border-radius: 30rpx; background: #f5f5f5; color: #999; font-size: 26rpx; }
```

### Task 25: Final Integration & Configuration

- [ ] **Step 1: Update project.config.json**

Replace `YOUR_APPID_HERE` with your real WeChat Mini Program AppID.  
Replace `YOUR_ENV_ID` in `miniprogram/app.js` with your cloud environment ID.

- [ ] **Step 2: Create tab bar icon placeholders**

Create `miniprogram/images/` directory with 8 icon PNG files (simple colored placeholders):
- `tab-home.png`, `tab-home-active.png`
- `tab-menu.png`, `tab-menu-active.png`
- `tab-cart.png`, `tab-cart-active.png`
- `tab-mine.png`, `tab-mine-active.png`

- [ ] **Step 3: Upload all cloud functions**

In WeChat DevTools, right-click each folder under `cloudfunctions/` → "上传并部署：云端安装依赖". All 11 cloud functions must appear in the cloud development console.

- [ ] **Step 4: Configure database collections and permissions**

In Cloud Development Console → Database, create these collections with permissions:
- `users` — read: all, write: creator only
- `menus` — read: all, write: all (cloud functions enforce admin check)
- `orders` — read: all, write: all
- `suggestions` — read: all, write: creator only

- [ ] **Step 5: Apply subscription message templates**

In WeChat Public Platform → Functions → Subscribe Messages, apply for:
1. A "new order" template (for admin notifications)
2. An "order status change" template (for user notifications)

Replace `ADMIN_ORDER_TEMPLATE_ID` in `cloudfunctions/submitOrder/index.js` and `pages/index/index.js`.
Replace `USER_STATUS_TEMPLATE_ID` in `cloudfunctions/updateOrderStatus/index.js`, `pages/cart/index.js`, and `pages/orders/index.js`.

- [ ] **Step 6: Verify full flow**

1. Open project in WeChat DevTools
2. Tap through all 4 tabBar tabs
3. Add menu item via admin panel (pages/admin-menu)
4. Browse menu → tap item → select specs → add to cart
5. Go to cart → submit order
6. Verify order appears in admin-orders page
7. Change order status: pending → accepted → preparing → done
8. Verify order status updates in user's orders page
9. Submit a suggestion → approve it in admin-suggest → verify menu item created