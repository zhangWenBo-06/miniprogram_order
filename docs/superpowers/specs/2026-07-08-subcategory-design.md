# 二级分类（品牌）系统设计

**日期**: 2026-07-08  
**状态**: 设计中

## 背景

当前系统仅有三个一级分类：`drink`（奶茶）、`snack`（零食）、`meal`（餐食）。每个菜品只挂了一个 `category` 字段。用户希望在各大类内部增加二级分类（品牌维度），参考美团真实品牌信息。

## 设计决策

- **维度**：统一按品牌/店铺分类（而非品类），贴合美团外卖商家列表模式
- **交互**：两级 Tab 联动 — 一级 Tab 选大类，二级 Tab 选品牌
- **管理后台**：联动选择器 — 先选大类，再选该大类对应的品牌
- **每个大类**均包含"其他"选项，用于无法归入已有品牌的菜品

## 数据模型

### menus 集合新增字段

```js
{
  name: '珍珠奶茶',
  category: 'drink',         // 不变：drink | snack | meal
  subcategory: 'heytea',     // 新增：品牌 key，可为空字符串表示未分类
  price: 12,
  specs: [...],
  image: '',
  available: true,
  createdAt: db.serverDate()
}
```

- `subcategory` 为可选字符串字段，默认值为空字符串 `''`
- 空字符串表示未设置品牌，在筛选中归属到"其他"

### 分类配置常量

放在 `miniprogram/utils/categories.js`，供前端页面和组件引用：

```js
const CATEGORIES = {
  drink: {
    label: '🥤 奶茶',
    subs: [
      { key: 'heytea',      label: '喜茶' },
      { key: 'mxbc',        label: '蜜雪冰城' },
      { key: 'guming',      label: '古茗' },
      { key: 'chabaidao',   label: '茶百道' },
      { key: 'bwchaji',     label: '霸王茶姬' },
      { key: 'nayuki',      label: '奈雪的茶' },
      { key: 'yidiandian',  label: '一点点' },
      { key: 'coco',        label: 'CoCo都可' },
      { key: 'hushang',     label: '沪上阿姨' },
      { key: 'shuyi',       label: '书亦烧仙草' },
      { key: 'other',       label: '其他' }
    ]
  },
  meal: {
    label: '🍱 餐食',
    subs: [
      { key: 'kfc',         label: '肯德基' },
      { key: 'mcdonalds',   label: '麦当劳' },
      { key: 'wallace',     label: '华莱士' },
      { key: 'haidilao',    label: '海底捞' },
      { key: 'zhangliang',  label: '张亮麻辣烫' },
      { key: 'yangguofu',   label: '杨国福麻辣烫' },
      { key: 'zhengxin',    label: '正新鸡排' },
      { key: 'shaxian',     label: '沙县小吃' },
      { key: 'huangmenji',  label: '黄焖鸡米饭' },
      { key: 'lanzhou',     label: '兰州拉面' },
      { key: 'other',       label: '其他' }
    ]
  },
  snack: {
    label: '🍿 零食',
    subs: [
      { key: 'liangpin',    label: '良品铺子' },
      { key: 'squirrel',    label: '三只松鼠' },
      { key: 'baicaowei',   label: '百草味' },
      { key: 'zhouheiya',   label: '周黑鸭' },
      { key: 'juewei',      label: '绝味鸭脖' },
      { key: 'laiyifen',    label: '来伊份' },
      { key: 'haoliyou',    label: '好丽友' },
      { key: 'lays',        label: '乐事' },
      { key: 'other',       label: '其他' }
    ]
  }
}
```

## UI 设计

### 菜单页（用户端）

两级 Tab 联动：

```
┌──────────────────────────────────────────┐
│ [全部] [🥤 奶茶] [🍿 零食] [🍱 餐食]      │  ← 一级 Tab（横向滚动）
├──────────────────────────────────────────┤
│ [喜茶] [蜜雪冰城] [古茗] ... [其他]       │  ← 二级 Tab（选中大类后出现）
├──────────────────────────────────────────┤
│                                          │
│   ┌──────┐ ┌──────┐ ┌──────┐            │
│   │ 珍珠  │ │ 杨枝  │ │ 芋泥  │            │  ← 菜品网格
│   │ 奶茶  │ │ 甘露  │ │ 波波  │            │
│   └──────┘ └──────┘ └──────┘            │
│                                          │
└──────────────────────────────────────────┘
```

交互逻辑：
- 点击一级 Tab → 切换大类，二级 Tab 自动更新为该大类品牌列表，默认选中"全部"（不筛选品牌）
- 点击二级 Tab → 筛选该品牌下的菜品，品牌名高亮
- 二级 Tab 第一项为"全部"，点击后显示该大类所有品牌的菜品
- "全部"一级 Tab 时，二级 Tab 隐藏，显示所有菜品

### 菜单卡片

卡片上显示品牌标签：
```
┌──────────┐
│  [图片]   │
│ 🍵 喜茶   │  ← 品牌标签
├──────────┤
│ 珍珠奶茶  │
│ ¥12      │
└──────────┘
```

### 管理后台

大类选择器（按钮组，不变）→ 品牌下拉选择器（跟随大类变化）：

```
分类： [🥤 奶茶] [🍿 零食] [🍱 餐食]
品牌： [▼ 请选择品牌        ]
       ├ 喜茶
       ├ 蜜雪冰城
       ├ 古茗
       ├ ...
       └ 其他
```

## 接口变更

### getMenus

入参新增 `subcategory`：

```js
{ category: 'drink', subcategory: 'heytea' }
```

- `category` 为空 → 查全部
- `category` 有值、`subcategory` 为空 → 查该大类全部
- 两者都有值 → 精确筛选

### addMenu / updateMenu

入参新增 `subcategory` 字段（可选，默认空字符串）。

### seedData

为现有 18 个种子菜品分配品牌：

| 菜品 | 大类 | 品牌 |
|------|------|------|
| 珍珠奶茶 | drink | coco (CoCo都可) |
| 杨枝甘露 | drink | heytea (喜茶) |
| 芋泥波波奶茶 | drink | mxbc (蜜雪冰城) |
| 暴打柠檬茶 | drink | shuyi (书亦烧仙草) |
| 黑糖脏脏茶 | drink | hushang (沪上阿姨) |
| 满杯红柚 | drink | nayuki (奈雪的茶) |
| 芝芝莓莓 | drink | heytea (喜茶) |
| 生椰拿铁 | drink | chabaidao (茶百道) |
| 薯条 | snack | kfc (归类到餐食-肯德基) → 改为 lays (乐事) |
| 鸡米花 | snack | kfc → 改为 zhengxin (正新鸡排) |
| 提拉米苏 | snack | laiyifen (来伊份) |
| 芒果班戟 | snack | liangpin (良品铺子) |
| 鸡蛋仔 | snack | other (其他) |
| 照烧鸡腿饭 | meal | other (其他) |
| 番茄肉酱意面 | meal | other (其他) |
| 火腿三明治 | meal | mcdonalds (麦当劳) |
| 凯撒沙拉 | meal | other (其他) |
| 牛肉汉堡 | meal | kfc (肯德基) |

## 文件变更清单

| 文件 | 操作 | 说明 |
|------|------|------|
| `miniprogram/utils/categories.js` | **新增** | 分类配置常量，含一级分类和二级品牌列表 |
| `miniprogram/pages/menu/index.js` | 修改 | 加载品牌配置，二级 Tab 联动逻辑，subcategory 筛选 |
| `miniprogram/pages/menu/index.wxml` | 修改 | 新增二级 Tab 行 |
| `miniprogram/pages/menu/index.wxss` | 修改 | 二级 Tab 样式 |
| `miniprogram/components/menu-card/index.wxml` | 修改 | 显示品牌标签 |
| `miniprogram/components/menu-card/index.wxss` | 修改 | 品牌标签样式 |
| `miniprogram/pages/admin-menu/index.js` | 修改 | 加载品牌配置，联动选择器逻辑 |
| `miniprogram/pages/admin-menu/index.wxml` | 修改 | 新增品牌选择器 UI |
| `miniprogram/pages/admin-menu/index.wxss` | 修改 | 选择器样式 |
| `cloudfunctions/addMenu/index.js` | 修改 | 接收并存储 subcategory |
| `cloudfunctions/updateMenu/index.js` | 修改 | 接收并更新 subcategory |
| `cloudfunctions/getMenus/index.js` | 修改 | 支持 subcategory 筛选参数 |
| `cloudfunctions/seedData/index.js` | 修改 | 为种子数据添加 subcategory 字段 |

## 兼容性

- `subcategory` 为可选字段，默认为空字符串
- 现有菜品 `subcategory` 为空，在"其他"中显示
- 旧版客户端不传 `subcategory` 时，`getMenus` 不做品牌筛选，行为不变
- 管理后台编辑旧菜品时，品牌选择器显示为空（未选择）