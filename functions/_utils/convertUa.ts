/**
 * 将移动端User-Agent转换为PC端User-Agent
 * @param userAgent 原始User-Agent字符串
 * @returns 转换后的PC端User-Agent
 */
export const convertMobileToPcUA = (userAgent: string | null): string => {
  if (!userAgent) return '';

  let convertedUA = userAgent;

  // 1. 替换移动端操作系统部分
  // 匹配Android系统格式: (Linux; Android ...)
  convertedUA = convertedUA.replace(/\(Linux;\s*Android[^)]*\)/i, '(Windows NT 10.0; Win64; x64)');

  // 匹配简化Android格式: (Android ...)
  convertedUA = convertedUA.replace(/\(Android[^)]*\)/i, '(Windows NT 10.0; Win64; x64)');

  // 匹配iOS系统格式: (iPhone; CPU iPhone OS ...)
  convertedUA = convertedUA.replace(/\(iPhone;\s*CPU[^)]*\)/i, '(Windows NT 10.0; Win64; x64)');

  // 匹配iPad系统格式: (iPad; CPU OS ...)
  convertedUA = convertedUA.replace(/\(iPad;\s*CPU[^)]*\)/i, '(Windows NT 10.0; Win64; x64)');

  // 匹配iPod系统格式: (iPod; CPU iPhone OS ...)
  convertedUA = convertedUA.replace(/\(iPod;\s*CPU[^)]*\)/i, '(Windows NT 10.0; Win64; x64)');

  // 2. 移除Mobile标识
  // 匹配 Mobile token，使用单词边界避免误匹配
  convertedUA = convertedUA.replace(/\s*Mobile(\/[\w.]*)?(?=\s|$)/gi, '');

  // 3. 清理多余的空格和分号
  convertedUA = convertedUA.replace(/\s+/g, ' ');
  convertedUA = convertedUA.replace(/;\s*\)/g, ')');
  convertedUA = convertedUA.replace(/\(\s*;\s*/g, '(');
  convertedUA = convertedUA.trim();

  return convertedUA;
};
