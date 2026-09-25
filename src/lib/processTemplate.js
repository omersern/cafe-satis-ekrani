export function ttenglish(text) {
  if (typeof text !== 'string') return '';
  let value = text.replace(/İ/g, 'I').replace(/ı/g, 'i');
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export function processTemplate(templateString, data) {
  if (!templateString || !data) return '';

  let processed = templateString;

  if (data.products && Array.isArray(data.products)) {
    let itemsHtml = '';
    data.products.forEach((product) => {
      if (product.price != null) {
        itemsHtml += `<tr><td width='0.7' align='left'>${product.quantity}x ${ttenglish(product.name)}</td><td width='0.3' align='right'>${product.price.toFixed(2)} TL</td></tr>`;
      } else {
        itemsHtml += `<tr><td width='1' align='left'>${product.quantity}x ${ttenglish(product.name)}</td></tr>`;
      }

      if (product.variations && Array.isArray(product.variations)) {
        product.variations.forEach((variationGroup) => {
          const groupName = variationGroup?.name ? ttenglish(variationGroup.name) : '';
          for (const [optionName, optionPrice] of Object.entries(variationGroup.detail || {})) {
            const priceNum = Number(optionPrice);
            const showPrice = Number.isFinite(priceNum) && priceNum !== 0;
            const priceText = showPrice ? ` (${priceNum.toFixed(2)} TL)` : '';
            itemsHtml += `<tr><td width='1' align='left'>  - ${groupName ? `${groupName}: ` : ''}${ttenglish(optionName)}${priceText}</td></tr>`;
          }
        });
      }

      if (product.note) {
        itemsHtml += `<tr><td width='1' align='left'>  * ${ttenglish(product.note)}</td></tr>`;
      }
    });
    processed = processed.replace('{products}', itemsHtml);
  }

  processed = processed.replace(/{([^{}]+)}/g, (match, key) => {
    const keys = key.split('.');
    let value = data;
    try {
      for (const k of keys) { value = value[k]; }
      return value !== undefined && value !== null ? String(value) : '';
    } catch {
      return '';
    }
  });

  return processed;
}
