// Only use verified full spherical panoramas. A 2:1 image alone is not proof.
// 当前试用：用户提供的 8-bit LDR 全景，接缝和极点待视觉确认。
const retroStore = {
  url: `${import.meta.env.BASE_URL}assets/retro-convenience-360.png`,
  format: 'png',
  label: '复古便利店 · LDR 全景测试',
};
// 换回原环境：把下方 ...retroStore 改成 ...shopRoom。
const shopRoom = {
  url: `${import.meta.env.BASE_URL}assets/shop-room-4k.exr`,
  format: 'exr',
  label: 'Shop Room · 临时零售店环境（非大型超市）',
};
export const environmentConfig = {
  ...retroStore,
  rotation: 0, // radians; shared by background and reflection
  blur: .075, // 0 = sharp; increase toward 1 for more blur
  exposure: 1,
  sphereEdgeSoftness: .35, // 黑球边缘渐隐宽度：越大越柔和，建议 .2–.5
  sphereDarkness: .999, // 靠近入口时球体变暗的最大程度：0 不变暗，1 接近黑色
  haloWidth: .012, // 球边光晕宽度，以屏幕高度为单位
  haloStrength: .65, // 贴着球边的亮光强度
  shoulderStrength: .26, // 光晕外侧稍暗的一圈；再向外柔和恢复
};
