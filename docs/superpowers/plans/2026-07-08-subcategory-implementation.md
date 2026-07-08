# 二级分类（品牌）系统 — 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在现有三大分类基础上增加品牌维度的二级分类，实现两级 Tab 联动筛选和后台联动选择器。

**Architecture:** 新增 `categories.js` 配置常量定义分类层级；menus 集合新增 `subcategory` 字段；前端菜单页两级 Tab 联动筛选；管理后台大类→品牌联动选择；四个云函数适配新字段。

**Tech Stack:** 微信小程序 (WXML/WXSS/JS)、微信云开发 (Cloud Functions + 数据库)

## Global Constraints

- 品牌 key 使用英文短名（如 `heytea`、`mxbc`），前端展示用中文 label
- `subcategory` 默认为空字符串 `''`，空字符串表示未设置品牌
- 现有数据不受影响，`subcategory` 为空的旧菜品在筛选时归入"其他"
- 不改动现有一级分类的 key（`drink`/`snack`/`meal`）

---

### Task 1: 创建分类配置常量

**Files:**
- Create: `miniprogram/utils/categories.js`

**Interfaces:**
- Produces: `CATEGORIES` 对象和 `getCategoryLabel(key)`、`getSubcategoryLabel(catKey, subKey)`、`getSubcategories(catKey)` 三个工具函数

- [ ] **Step 1: 创建 `miniprogram/utils/categories.js`**

```js
const CATEGORIES = {
  drink: {
    label: '🥤 奶茶',
    subs: [
      { key: 'heytea', label: '喜茶' },
      { key: 'mxbc', label: '蜜雪冰城' },
      { key: 'guming', label: '古茗' },
      { key: 'chabaidao', label: '茶百道' },
      { key: 'bwchaji', label: '霸王茶姬' },
      { key: 'nayuki', label: '奈雪的茶' },
      { key: 'yidiandian', label: '一点点' },
      { key: 'coco', label: 'CoCo都可' },
      { key: 'hushang', label: '沪上阿姨' },
      { key: 'shuyi', label: '书亦烧仙草' },
      { key: 'other', label: '其他' }
    ]
  },
  meal: {
    label: '🍱 餐食',
    subs: [
      { key: 'kfc', label: '肯德基' },
      { key: 'mcdonalds', label: '麦当劳' },
      { key: 'wallace', label: '华莱士' },
      { key: 'haidilao', label: '海底捞' },
      { key: 'zhangliang', label: '张亮麻辣烫' },
      { key: 'yangguofu', label: '杨国福麻辣烫' },
      { key: 'zhengxin', label: '正新鸡排' },
      { key: 'shaxian', label: '沙县小吃' },
      { key: 'huangmenji', label: '黄焖鸡米饭' },
      { key: 'lanzhou', label: '兰州拉面' },
      { key: 'other', label: '其他' }
    ]
  },
  snack: {
    label: '🍿 零食',
    subs: [
      { key: 'liangpin', label: '良品铺子' },
      { key: 'squirrel', label: '三只松鼠' },
      { key: 'baicaowei', label: '百草味' },
      { key: 'zhouheiya', label: '周黑鸭' },
      { key: 'juewei', label: '绝味鸭脖' },
      { key: 'laiyifen', label: '来伊份' },
      { key: 'haoliyou', label: '好丽友' },
      { key: 'lays', label: '乐事' },
      { key: 'other', label: '其他' }
    ]
  }
}

function getCategoryLabel(key) {
  return CATEGORIES[key] ? CATEGORIES[key].label : key
}

function getSubcategoryLabel(catKey, subKey) {
  if (!subKey) return ''
  const subs = CATEGORIES[catKey] ? CATEGORIES[catKey].subs : []
  const found = subs.find(s => s.key === subKey)
  return found ? found.label : subKey
}

function getSubcategories(catKey) {
  return CATEGORIES[catKey] ? CATEGORIES[catKey].subs : []
}

module.exports = { CATEGORIES, getCategoryLabel, getSubcategoryLabel, getSubcategories }
```

- [ ] **Step 2: Commit**

```bash
git add miniprogram/utils/categories.js
git commit -m "feat: add categories config with brand subcategories"
```

---

### Task 2: 更新三个云函数支持 subcategory

**Files:**
- Modify: `cloudfunctions/addMenu/index.js`
- Modify: `cloudfunctions/updateMenu/index.js`
- Modify: `cloudfunctions/getMenus/index.js`

**Interfaces:**
- Consumes: `subcategory` 字段定义（来自设计文档）
- Produces: addMenu 接受并存储 subcategory；updateMenu 接受并更新 subcategory；getMenus 支持 subcategory 筛选参数

- [ ] **Step 1: 修改 `cloudfunctions/addMenu/index.js`**

在解构 event 参数处添加 `subcategory`，在 add data 中包含它：

```js
const { name, category, subcategory, image, price, specs } = event

if (!name || !category) {
  return { success: false, error: '名称和分类不能为空' }
}

const res = await db.collection('menus').add({
  data: {
    name,
    category,
    subcategory: subcategory || '',
    image: image || '',
    price: price || 0,
    specs: specs || [],
    available: true,
    createdAt: db.serverDate()
  }
})
```

- [ ] **Step 2: 修改 `cloudfunctions/updateMenu/index.js`**

在解构 event 处添加 `subcategory`，在 whitelist 中添加对应的更新逻辑：

```js
const { menuId, name, category, subcategory, image, price, specs, available } = event
// ... 权限校验不变 ...

const updates = {}
if (name !== undefined) updates.name = name
if (category !== undefined) updates.category = category
if (subcategory !== undefined) updates.subcategory = subcategory
if (image !== undefined) updates.image = image
if (price !== undefined) updates.price = price
if (specs !== undefined) updates.specs = specs
if (available !== undefined) updates.available = available
// ... 后续逻辑不变 ...
```

- [ ] **Step 3: 修改 `cloudfunctions/getMenus/index.js`**

在 where 条件中增加 subcategory 筛选：

```js
const { category, subcategory } = event

// ... 权限检测逻辑不变 ...

const where = {}
if (!isAdmin) {
  where.available = true
}
if (category) {
  where.category = category
}
if (subcategory) {
  where.subcategory = subcategory
}

const res = await db.collection('menus')
  .where(where)
  .orderBy('createdAt', 'desc')
  .get()
return { menus: res.data }
```

- [ ] **Step 4: Commit**

```bash
git add cloudfunctions/addMenu/index.js cloudfunctions/updateMenu/index.js cloudfunctions/getMenus/index.js
git commit -m "feat: add subcategory field support to addMenu/updateMenu/getMenus cloud functions"
```

---

### Task 3: 更新 seedData 云函数，为种子数据添加品牌

**Files:**
- Modify: `cloudfunctions/seedData/index.js`

**Interfaces:**
- Consumes: 设计文档中种子数据品牌映射表
- Produces: 所有种子菜品新增 `subcategory` 字段

- [ ] **Step 1: 修改 `cloudfunctions/seedData/index.js`**

为每个菜单项添加 `subcategory` 字段：

```js
const menus = [
  // ===== 奶茶 =====
  { name: '珍珠奶茶', category: 'drink', subcategory: 'coco', price: 12, /* ... */ },
  { name: '杨枝甘露', category: 'drink', subcategory: 'heytea', price: 16, /* ... */ },
  { name: '芋泥波波奶茶', category: 'drink', subcategory: 'mxbc', price: 15, /* ... */ },
  { name: '暴打柠檬茶', category: 'drink', subcategory: 'shuyi', price: 10, /* ... */ },
  { name: '黑糖脏脏茶', category: 'drink', subcategory: 'hushang', price: 18, /* ... */ },
  { name: '满杯红柚', category: 'drink', subcategory: 'nayuki', price: 14, /* ... */ },
  { name: '芝芝莓莓', category: 'drink', subcategory: 'heytea', price: 20, /* ... */ },
  { name: '生椰拿铁', category: 'drink', subcategory: 'chabaidao', price: 15, /* ... */ },

  // ===== 零食 =====
  { name: '薯条', category: 'snack', subcategory: 'lays', price: 8, /* ... */ },
  { name: '鸡米花', category: 'snack', subcategory: 'zhengxin', price: 10, /* ... */ },
  { name: '提拉米苏', category: 'snack', subcategory: 'laiyifen', price: 22, /* ... */ },
  { name: '芒果班戟', category: 'snack', subcategory: 'liangpin', price: 12, /* ... */ },
  { name: '鸡蛋仔', category: 'snack', subcategory: 'other', price: 15, /* ... */ },

  // ===== 餐食 =====
  { name: '照烧鸡腿饭', category: 'meal', subcategory: 'other', price: 25, /* ... */ },
  { name: '番茄肉酱意面', category: 'meal', subcategory: 'other', price: 22, /* ... */ },
  { name: '火腿三明治', category: 'meal', subcategory: 'mcdonalds', price: 18, /* ... */ },
  { name: '凯撒沙拉', category: 'meal', subcategory: 'other', price: 20, /* ... */ },
  { name: '牛肉汉堡', category: 'meal', subcategory: 'kfc', price: 28, /* ... */ }
]
```

注意：每个对象的 specs/available 字段保持不变，只添加 `subcategory` 属性。

- [ ] **Step 2: Commit**

```bash
git add cloudfunctions/seedData/index.js
git commit -m "feat: add subcategory to seedData menu items"
```

---

### Task 4: 更新菜单页 — 两级 Tab 联动

**Files:**
- Modify: `miniprogram/pages/menu/index.js`
- Modify: `miniprogram/pages/menu/index.wxml`
- Modify: `miniprogram/pages/menu/index.wxss`

**Interfaces:**
- Consumes: `categories.js` 配置常量，getMenus 云函数（支持 subcategory 参数）
- Produces: 两级 Tab 联动筛选 UI，用户可先选大类再选品牌

- [ ] **Step 1: 修改 `miniprogram/pages/menu/index.js`**

```js
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
```

- [ ] **Step 2: 修改 `miniprogram/pages/menu/index.wxml`**

在一级 Tab 下方添加二级 Tab 行：

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

  <scroll-view scroll-x class="subcategory-tabs" wx:if="{{subcategories.length > 0}}">
    <view
      class="sub-tab-item {{activeSubcategory === '' ? 'active' : ''}}"
      data-subcategory=""
      bindtap="switchSubcategory">全部</view>
    <view
      wx:for="{{subcategories}}"
      wx:key="key"
      class="sub-tab-item {{activeSubcategory === item.key ? 'active' : ''}}"
      data-subcategory="{{item.key}}"
      bindtap="switchSubcategory">{{item.label}}</view>
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

- [ ] **Step 3: 修改 `miniprogram/pages/menu/index.wxss`**

添加二级 Tab 样式：

```css
.page-menu {
  padding-bottom: 120rpx;
}

.category-tabs {
  white-space: nowrap;
  padding: 20rpx;
  background: #fff;
  margin-bottom: 0;
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

.subcategory-tabs {
  white-space: nowrap;
  padding: 16rpx 20rpx 20rpx;
  background: #fff;
  margin-bottom: 20rpx;
  border-top: 1rpx solid #f0f0f0;
}

.sub-tab-item {
  display: inline-block;
  padding: 8rpx 22rpx;
  margin-right: 12rpx;
  border-radius: 20rpx;
  background: #f5f5f5;
  font-size: 24rpx;
  color: #888;
  transition: all 0.2s;
}

.sub-tab-item.active {
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

- [ ] **Step 4: Commit**

```bash
git add miniprogram/pages/menu/index.js miniprogram/pages/menu/index.wxml miniprogram/pages/menu/index.wxss
git commit -m "feat: add two-level category tabs (brand subcategory) to menu page"
```

---

### Task 5: 更新菜单卡片组件 — 显示品牌标签

**Files:**
- Modify: `miniprogram/components/menu-card/index.wxml`
- Modify: `miniprogram/components/menu-card/index.js`
- Modify: `miniprogram/components/menu-card/index.wxss`

**Interfaces:**
- Consumes: `categories.js` 中的 `getSubcategoryLabel`
- Produces: 卡片上显示品牌标签（如"🍵 喜茶"），替代原来的品类 emoji 标签

- [ ] **Step 1: 修改 `miniprogram/components/menu-card/index.js`**

```js
const { getSubcategoryLabel } = require('../../utils/categories')

Component({
  properties: {
    menu: { type: Object, value: {} }
  },
  data: {
    brandLabel: ''
  },
  observers: {
    'menu.category, menu.subcategory': function(cat, sub) {
      const label = sub ? getSubcategoryLabel(cat, sub) : ''
      this.setData({ brandLabel: label })
    }
  },
  methods: {
    onTap() {
      this.triggerEvent('tap', { menu: this.data.menu })
    }
  }
})
```

- [ ] **Step 2: 修改 `miniprogram/components/menu-card/index.wxml`**

将 category-tag 改为显示品牌名：

```xml
<view class="menu-card" bindtap="onTap">
  <view class="card-image">
    <image wx:if="{{menu.image}}" src="{{menu.image}}" mode="aspectFill" />
    <view wx:else class="image-placeholder"><text>{{menu.name[0]}}</text></view>
    <view class="brand-tag" wx:if="{{brandLabel}}">{{brandLabel}}</view>
  </view>
  <view class="card-body">
    <text class="card-name">{{menu.name}}</text>
    <text class="card-price" wx:if="{{menu.price}}">¥{{menu.price}}</text>
    <text class="card-price free" wx:else>免费投喂</text>
  </view>
</view>
```

- [ ] **Step 3: 修改 `miniprogram/components/menu-card/index.wxss`**

将 `.category-tag` 替换为 `.brand-tag` 样式：

```css
.menu-card { background: #fff; border-radius: 16rpx; overflow: hidden; box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.08); transition: transform 0.2s; }
.menu-card:active { transform: scale(0.97); }
.card-image { width: 100%; height: 200rpx; position: relative; background: #f0f0f0; }
.card-image image { width: 100%; height: 100%; }
.image-placeholder { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, #ff6b81, #ff8fa3); }
.image-placeholder text { font-size: 60rpx; color: #fff; font-weight: bold; }
.brand-tag { position: absolute; top: 10rpx; right: 10rpx; background: rgba(0,0,0,0.55); color: #fff; font-size: 20rpx; padding: 4rpx 12rpx; border-radius: 8rpx; }
.card-body { padding: 16rpx; }
.card-name { font-size: 28rpx; font-weight: 500; display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.card-price { font-size: 26rpx; color: #ff6b81; margin-top: 8rpx; display: block; }
.card-price.free { color: #999; font-size: 22rpx; }
```

- [ ] **Step 4: Commit**

```bash
git add miniprogram/components/menu-card/index.js miniprogram/components/menu-card/index.wxml miniprogram/components/menu-card/index.wxss
git commit -m "feat: show brand tag on menu cards"
```

---

### Task 6: 更新管理后台 — 联动品牌选择器

**Files:**
- Modify: `miniprogram/pages/admin-menu/index.js`
- Modify: `miniprogram/pages/admin-menu/index.wxml`
- Modify: `miniprogram/pages/admin-menu/index.wxss`

**Interfaces:**
- Consumes: `categories.js` 配置常量
- Produces: 管理员编辑/添加菜品时可选择大类→品牌，列表显示品牌名

- [ ] **Step 1: 修改 `miniprogram/pages/admin-menu/index.js`**

```js
const app = getApp()
const { getSubcategories, getSubcategoryLabel } = require('../../utils/categories')

Page({
  data: {
    menus: [], loading: false, seeding: false,
    showEditor: false, editorMode: 'add', editingMenu: null,
    formData: { name: '', category: 'drink', subcategory: '', price: '', specsText: '', image: '' },
    subcategories: []
  },

  onShow() {
    if (!app.globalData.isAdmin) {
      wx.showToast({ title: '无权限', icon: 'none' })
      wx.navigateBack()
      return
    }
    this.loadMenus()
  },

  loadMenus() {
    this.setData({ loading: true })
    wx.cloud.callFunction({ name: 'getMenus', data: { category: '' } })
      .then(res => { this.setData({ menus: res.result.menus || [], loading: false }) })
      .catch(() => { this.setData({ loading: false }) })
  },

  seedData() {
    wx.showModal({
      title: '初始化数据',
      content: '将添加 18 个示例菜品（奶茶 8 个、零食 5 个、餐食 5 个），确定吗？',
      success: (res) => {
        if (res.confirm) {
          this.setData({ seeding: true })
          wx.cloud.callFunction({ name: 'seedData', data: {} })
            .then(r => {
              this.setData({ seeding: false })
              if (r.result.success) {
                wx.showToast({ title: `已添加 ${r.result.count} 个菜品`, icon: 'success' })
                this.loadMenus()
              } else {
                wx.showToast({ title: r.result.error || '失败', icon: 'none' })
              }
            })
            .catch(() => {
              this.setData({ seeding: false })
              wx.showToast({ title: '添加失败，请确保已上传 seedData 云函数', icon: 'none' })
            })
        }
      }
    })
  },

  showAdd() {
    const subs = getSubcategories('drink')
    this.setData({
      showEditor: true, editorMode: 'add',
      formData: { name: '', category: 'drink', subcategory: '', price: '', specsText: '', image: '' },
      subcategories: subs
    })
  },

  showEdit(e) {
    const menu = e.currentTarget.dataset.menu
    const specsText = (menu.specs || []).map(s => `${s.name}:${s.options.join(',')}`).join('|')
    const subs = getSubcategories(menu.category)
    this.setData({
      showEditor: true, editorMode: 'edit', editingMenu: menu,
      formData: { name: menu.name, category: menu.category, subcategory: menu.subcategory || '', price: String(menu.price || ''), specsText, image: menu.image || '' },
      subcategories: subs
    })
  },

  hideEditor() { this.setData({ showEditor: false, editingMenu: null }) },

  onFormFieldChange(e) {
    const { field } = e.currentTarget.dataset
    const formData = { ...this.data.formData, [field]: e.detail.value }
    this.setData({ formData })
  },

  onCategorySelect(e) {
    const cat = e.currentTarget.dataset.value
    const subs = getSubcategories(cat)
    const formData = { ...this.data.formData, category: cat, subcategory: '' }
    this.setData({ formData, subcategories: subs })
  },

  onSubcategorySelect(e) {
    const formData = { ...this.data.formData, subcategory: e.currentTarget.dataset.value }
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
    const menuData = { name: formData.name.trim(), category: formData.category, subcategory: formData.subcategory, price: parseFloat(formData.price) || 0, specs }
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

- [ ] **Step 2: 修改 `miniprogram/pages/admin-menu/index.wxml`**

在菜单列表中显示品牌名，在编辑器中添加品牌选择器：

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
        <text class="item-cat">{{item.category === 'drink' ? '奶茶' : item.category === 'snack' ? '零食' : '餐食'}}<block wx:if="{{item.subcategory}}"> · {{item.subcategory === 'heytea' ? '喜茶' : item.subcategory === 'mxbc' ? '蜜雪冰城' : item.subcategory === 'guming' ? '古茗' : item.subcategory === 'chabaidao' ? '茶百道' : item.subcategory === 'bwchaji' ? '霸王茶姬' : item.subcategory === 'nayuki' ? '奈雪的茶' : item.subcategory === 'yidiandian' ? '一点点' : item.subcategory === 'coco' ? 'CoCo都可' : item.subcategory === 'hushang' ? '沪上阿姨' : item.subcategory === 'shuyi' ? '书亦烧仙草' : item.subcategory === 'kfc' ? '肯德基' : item.subcategory === 'mcdonalds' ? '麦当劳' : item.subcategory === 'wallace' ? '华莱士' : item.subcategory === 'haidilao' ? '海底捞' : item.subcategory === 'zhangliang' ? '张亮麻辣烫' : item.subcategory === 'yangguofu' ? '杨国福麻辣烫' : item.subcategory === 'zhengxin' ? '正新鸡排' : item.subcategory === 'shaxian' ? '沙县小吃' : item.subcategory === 'huangmenji' ? '黄焖鸡米饭' : item.subcategory === 'lanzhou' ? '兰州拉面' : item.subcategory === 'liangpin' ? '良品铺子' : item.subcategory === 'squirrel' ? '三只松鼠' : item.subcategory === 'baicaowei' ? '百草味' : item.subcategory === 'zhouheiya' ? '周黑鸭' : item.subcategory === 'juewei' ? '绝味鸭脖' : item.subcategory === 'laiyifen' ? '来伊份' : item.subcategory === 'haoliyou' ? '好丽友' : item.subcategory === 'lays' ? '乐事' : item.subcategory === 'other' ? '其他' : item.subcategory}}</block></text>
      </view>
      <view class="item-actions">
        <view class="action-btn" data-menu="{{item}}" bindtap="showEdit">编辑</view>
        <view class="action-btn" data-menu="{{item}}" bindtap="toggleAvailable">{{item.available ? '下架' : '上架'}}</view>
        <view class="action-btn danger" data-menu="{{item}}" bindtap="deleteMenu">删除</view>
      </view>
    </view>
    <view class="empty-state" wx:if="{{menus.length === 0 && !loading}}">
      <text class="icon">📋</text><text class="text">菜单为空</text>
      <view class="seed-btn" bindtap="seedData" wx:if="{{!seeding}}">🎲 一键添加示例菜单</view>
      <view class="seed-btn loading" wx:else>正在添加...</view>
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
          <text class="form-label">品牌</text>
          <view class="subcat-options">
            <view
              wx:for="{{subcategories}}"
              wx:key="key"
              class="subcat-opt {{formData.subcategory === item.key ? 'active' : ''}}"
              data-value="{{item.key}}"
              bindtap="onSubcategorySelect">{{item.label}}</view>
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

- [ ] **Step 3: 修改 `miniprogram/pages/admin-menu/index.wxss`**

添加品牌选择器样式：

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
.subcat-options { display: flex; flex-wrap: wrap; gap: 12rpx; }
.subcat-opt { padding: 10rpx 20rpx; border-radius: 8rpx; background: #f5f5f5; font-size: 22rpx; color: #666; }
.subcat-opt.active { background: linear-gradient(135deg, #ff6b81, #ff8fa3); color: #fff; }
.editor-footer { padding: 20rpx 30rpx; padding-bottom: calc(20rpx + env(safe-area-inset-bottom)); border-top: 1rpx solid #eee; }
.btn-save { width: 100%; background: linear-gradient(135deg, #ff6b81, #ff8fa3); color: #fff; text-align: center; padding: 22rpx; border-radius: 40rpx; font-size: 30rpx; font-weight: 500; }
.seed-btn { margin-top: 30rpx; padding: 20rpx 40rpx; background: linear-gradient(135deg, #ff9800, #ffc107); color: #fff; border-radius: 40rpx; font-size: 28rpx; font-weight: 500; text-align: center; }
.seed-btn.loading { opacity: 0.6; }
```

- [ ] **Step 4: Commit**

```bash
git add miniprogram/pages/admin-menu/index.js miniprogram/pages/admin-menu/index.wxml miniprogram/pages/admin-menu/index.wxss
git commit -m "feat: add brand subcategory selector to admin menu editor"
```

---

### Task 7: 优化 admin-menu 品牌标签显示（使用 categories.js 工具函数）

**Files:**
- Modify: `miniprogram/pages/admin-menu/index.wxml` — 将硬编码的品牌名映射替换为 WXS 或 JS 预处理

**Interfaces:**
- Consumes: `getSubcategoryLabel` from `categories.js`
- Note: WXML 中无法直接调用 JS 函数，改为在 JS 中对 menus 数据预处理，添加 `subcategoryLabel` 字段

- [ ] **Step 1: 修改 `miniprogram/pages/admin-menu/index.js` 的 loadMenus**

在 `loadMenus` 中对返回数据预处理，计算 `subcategoryLabel`：

```js
loadMenus() {
  this.setData({ loading: true })
  wx.cloud.callFunction({ name: 'getMenus', data: { category: '' } })
    .then(res => {
      const menus = (res.result.menus || []).map(m => ({
        ...m,
        subcategoryLabel: getSubcategoryLabel(m.category, m.subcategory)
      }))
      this.setData({ menus, loading: false })
    })
    .catch(() => { this.setData({ loading: false }) })
},
```

- [ ] **Step 2: 修改 `miniprogram/pages/admin-menu/index.wxml` 中的分类显示**

将 Task 6 中 WXML 里复杂的品牌名硬编码改为简洁的 `item.subcategoryLabel`：

```xml
<text class="item-cat">{{item.category === 'drink' ? '奶茶' : item.category === 'snack' ? '零食' : '餐食'}}<block wx:if="{{item.subcategoryLabel}}"> · {{item.subcategoryLabel}}</block></text>
```

- [ ] **Step 3: Commit**

```bash
git add miniprogram/pages/admin-menu/index.js miniprogram/pages/admin-menu/index.wxml
git commit -m "refactor: use getSubcategoryLabel util for admin menu brand display"
```

---

### Task 8: 端到端验证

**Files:**
- 无代码变更，手动验证

- [ ] **Step 1: 验证菜单页两级 Tab**

在微信开发者工具中：
1. 打开菜单页，确认一级 Tab 显示正常（全部/奶茶/零食/餐食）
2. 点击"奶茶"，确认二级 Tab 出现（喜茶/蜜雪冰城/古茗/.../其他）
3. 点击二级 Tab 中某个品牌，确认菜品列表正确筛选
4. 点击"全部"，确认二级 Tab 隐藏，显示所有菜品
5. 切换大类，确认二级 Tab 随大类变化

- [ ] **Step 2: 验证管理后台**

1. 打开管理后台，确认列表显示品牌名
2. 添加新菜品，切换大类后品牌选项跟随变化
3. 编辑已有菜品，确认品牌正确回显
4. 保存后确认数据库记录包含 subcategory 字段

- [ ] **Step 3: 验证云函数**

1. 在云开发控制台查看 menus 集合，确认新记录有 subcategory 字段
2. 调用 getMenus 云函数带 subcategory 参数，确认筛选正确
3. 调用 seedData 云函数，确认种子数据包含 subcategory