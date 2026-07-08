const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext()

  const userRes = await db.collection('users').where({ _openid: OPENID }).get()
  if (userRes.data.length === 0 || userRes.data[0].role !== 'admin') {
    return { success: false, error: '无权限' }
  }

  const { menuId, name, category, subcategory, image, price, specs, available } = event
  if (!menuId) {
    return { success: false, error: '缺少menuId' }
  }

  // Whitelist allowed fields to prevent arbitrary system-field writes
  const updates = {}
  if (name !== undefined) updates.name = name
  if (category !== undefined) updates.category = category
  if (subcategory !== undefined) updates.subcategory = subcategory
  if (image !== undefined) updates.image = image
  if (price !== undefined) updates.price = price
  if (specs !== undefined) updates.specs = specs
  if (available !== undefined) updates.available = available

  if (Object.keys(updates).length === 0) {
    return { success: false, error: '没有要更新的字段' }
  }

  await db.collection('menus').doc(menuId).update({ data: updates })
  return { success: true }
}