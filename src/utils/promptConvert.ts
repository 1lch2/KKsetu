/**
 * 将 WebUI 格式提示词转换为 NAI 格式
 * @param {string} webuiPrompt - WebUI 格式提示词，如 "(a:0.6), (b), (c8:0.6)"
 * @returns {string} NAI 格式提示词
 */
function webuiToNai(webuiPrompt: string) {
  return webuiPrompt
    .split(',')
    .map((part) => {
      const trimmed = part.trim();

      // Unescape brackets
      const unescaped = trimmed.replace(/\\\(/g, '(').replace(/\\\)/g, ')');

      // 匹配 (word:weight) 或 (word) 格式
      const match = unescaped.match(/^\((.+?)(?::(\d*\.?\d+))?\)$/);
      if (!match) return unescaped; // 如果不匹配则原样返回

      let word = match[1];
      const weight = match[2] !== undefined ? parseFloat(match[2]) : 1.05;

      // 检查提示词是否以数字结尾
      const endsWithDigit = /\d$/.test(word);

      // 如果以数字结尾，需要在结束双冒号前加空格
      if (endsWithDigit) {
        return `${weight}::${word} ::`;
      } else {
        return `${weight}::${word}::`;
      }
    })
    .join(', ');
}

/**
 * 将 NAI 格式提示词转换为 WebUI 格式
 * @param {string} naiPrompt - NAI 格式提示词，如 "0.5::a::, 1.05::b::, 0.6::c8 ::"
 * @returns {string} WebUI 格式提示词
 */
function naiToWebui(naiPrompt: string) {
  return naiPrompt
    .split(',')
    .map((part) => {
      const trimmed = part.trim();

      // Escape brackets
      const escaped = trimmed.replace(/\(/g, '\\(').replace(/\)/g, '\\)');

      // 匹配 weight::word:: 或 weight::word :: 格式（允许空格）
      const match = escaped.match(/^(\d*\.?\d+)::(.+?)::\s*$/);
      if (!match) return escaped; // 如果不匹配则原样返回

      const weight = parseFloat(match[1]);
      const word = match[2].trim(); // 去除可能的尾部空格

      // 如果权重是默认的 1.05，则不显示权重
      if (Math.abs(weight - 1.05) < 0.0001) {
        return `(${word})`;
      } else {
        return `(${word}:${weight})`;
      }
    })
    .join(', ');
}

export { webuiToNai, naiToWebui };
