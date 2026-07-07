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