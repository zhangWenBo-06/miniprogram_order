const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

const menus = [
  // ===== 奶茶 =====
  {
    name: '珍珠奶茶',
    category: 'drink',
    subcategory: 'coco',
    price: 12,
    specs: [
      { name: '冰量', options: ['正常冰', '少冰', '去冰', '常温', '热'] },
      { name: '甜度', options: ['全糖', '七分糖', '半糖', '三分糖', '无糖'] },
      { name: '杯型', options: ['中杯', '大杯'] }
    ],
    available: true
  },
  {
    name: '杨枝甘露',
    category: 'drink',
    subcategory: 'heytea',
    price: 16,
    specs: [
      { name: '冰量', options: ['正常冰', '少冰', '去冰', '常温'] },
      { name: '甜度', options: ['全糖', '七分糖', '半糖', '三分糖', '无糖'] },
      { name: '杯型', options: ['中杯', '大杯'] }
    ],
    available: true
  },
  {
    name: '芋泥波波奶茶',
    category: 'drink',
    subcategory: 'mxbc',
    price: 15,
    specs: [
      { name: '冰量', options: ['正常冰', '少冰', '去冰', '常温', '热'] },
      { name: '甜度', options: ['全糖', '七分糖', '半糖', '三分糖', '无糖'] },
      { name: '杯型', options: ['中杯', '大杯'] }
    ],
    available: true
  },
  {
    name: '暴打柠檬茶',
    category: 'drink',
    subcategory: 'shuyi',
    price: 10,
    specs: [
      { name: '冰量', options: ['正常冰', '少冰', '去冰'] },
      { name: '甜度', options: ['全糖', '七分糖', '半糖', '三分糖', '无糖'] },
      { name: '杯型', options: ['中杯', '大杯'] }
    ],
    available: true
  },
  {
    name: '黑糖脏脏茶',
    category: 'drink',
    subcategory: 'hushang',
    price: 18,
    specs: [
      { name: '冰量', options: ['正常冰', '少冰', '去冰', '常温'] },
      { name: '甜度', options: ['全糖', '七分糖', '半糖', '三分糖'] },
      { name: '杯型', options: ['中杯', '大杯'] }
    ],
    available: true
  },
  {
    name: '满杯红柚',
    category: 'drink',
    subcategory: 'nayuki',
    price: 14,
    specs: [
      { name: '冰量', options: ['正常冰', '少冰', '去冰'] },
      { name: '甜度', options: ['全糖', '七分糖', '半糖', '三分糖', '无糖'] },
      { name: '杯型', options: ['中杯', '大杯'] }
    ],
    available: true
  },
  {
    name: '芝芝莓莓',
    category: 'drink',
    subcategory: 'heytea',
    price: 20,
    specs: [
      { name: '冰量', options: ['正常冰', '少冰', '去冰'] },
      { name: '甜度', options: ['全糖', '七分糖', '半糖', '三分糖', '无糖'] },
      { name: '杯型', options: ['中杯', '大杯'] }
    ],
    available: true
  },
  {
    name: '生椰拿铁',
    category: 'drink',
    subcategory: 'chabaidao',
    price: 15,
    specs: [
      { name: '冰量', options: ['正常冰', '少冰', '去冰', '常温', '热'] },
      { name: '甜度', options: ['全糖', '半糖', '无糖'] },
      { name: '杯型', options: ['中杯', '大杯'] }
    ],
    available: true
  },

  // ===== 零食 =====
  {
    name: '薯条',
    category: 'snack',
    subcategory: 'lays',
    price: 8,
    specs: [
      { name: '份量', options: ['小份', '中份', '大份'] }
    ],
    available: true
  },
  {
    name: '鸡米花',
    category: 'snack',
    subcategory: 'zhengxin',
    price: 10,
    specs: [
      { name: '份量', options: ['小份', '中份', '大份'] },
      { name: '口味', options: ['原味', '香辣', '孜然'] }
    ],
    available: true
  },
  {
    name: '提拉米苏',
    category: 'snack',
    subcategory: 'laiyifen',
    price: 22,
    specs: [],
    available: true
  },
  {
    name: '芒果班戟',
    category: 'snack',
    subcategory: 'liangpin',
    price: 12,
    specs: [],
    available: true
  },
  {
    name: '鸡蛋仔',
    category: 'snack',
    subcategory: 'other',
    price: 15,
    specs: [
      { name: '口味', options: ['原味', '巧克力', '抹茶'] }
    ],
    available: true
  },

  // ===== 餐食 =====
  {
    name: '照烧鸡腿饭',
    category: 'meal',
    subcategory: 'other',
    price: 25,
    specs: [
      { name: '米饭量', options: ['正常', '加饭', '少饭'] }
    ],
    available: true
  },
  {
    name: '番茄肉酱意面',
    category: 'meal',
    subcategory: 'other',
    price: 22,
    specs: [
      { name: '份量', options: ['正常', '加量'] }
    ],
    available: true
  },
  {
    name: '火腿三明治',
    category: 'meal',
    subcategory: 'mcdonalds',
    price: 18,
    specs: [
      { name: '口味', options: ['原味', '全麦面包'] },
      { name: '加热', options: ['常温', '加热'] }
    ],
    available: true
  },
  {
    name: '凯撒沙拉',
    category: 'meal',
    subcategory: 'other',
    price: 20,
    specs: [
      { name: '酱料', options: ['凯撒酱', '千岛酱', '油醋汁', '不要酱'] }
    ],
    available: true
  },
  {
    name: '牛肉汉堡',
    category: 'meal',
    subcategory: 'kfc',
    price: 28,
    specs: [
      { name: '熟度', options: ['七分熟', '全熟'] },
      { name: '套餐', options: ['单点', '套餐（含薯条+可乐）'] }
    ],
    available: true
  }
]

exports.main = async () => {
  const { OPENID } = cloud.getWXContext()

  // 检查管理员权限
  const userRes = await db.collection('users').where({ _openid: OPENID }).get()
  if (userRes.data.length === 0 || userRes.data[0].role !== 'admin') {
    return { success: false, error: '仅管理员可执行此操作' }
  }

  const results = []
  for (const menu of menus) {
    const res = await db.collection('menus').add({
      data: {
        ...menu,
        image: '',
        createdAt: db.serverDate()
      }
    })
    results.push({ name: menu.name, id: res._id })
  }

  return { success: true, count: results.length, results }
}