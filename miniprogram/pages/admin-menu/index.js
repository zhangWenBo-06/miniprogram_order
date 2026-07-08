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
      .then(res => {
        const menus = (res.result.menus || []).map(m => ({
          ...m,
          subcategoryLabel: getSubcategoryLabel(m.category, m.subcategory)
        }))
        this.setData({ menus, loading: false })
      })
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