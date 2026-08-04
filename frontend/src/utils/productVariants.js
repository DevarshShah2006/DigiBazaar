const QUANTITY_PATTERN = /(?:\(|\b)\d+(?:\.\d+)?\s*(?:kg|g|gm|gms|gram|grams|l|ltr|liter|litre|ml|pcs|pc|piece|pieces|pack|packs|block|bar|bottle|pouch|tin|can)(?:\)|\b)/gi
const PACK_PATTERN = /(?:\(|\b)(?:pack\s*of\s*)?\d+\s*(?:x|X)\s*\d+(?:\.\d+)?\s*(?:kg|g|gm|gms|l|ml|pcs|pc)(?:\)|\b)/gi

export function getQuantityText(product) {
  if (product?.quantity_label) return product.quantity_label

  const name = product?.name || ''
  const packMatch = name.match(PACK_PATTERN)
  if (packMatch?.[0]) return packMatch[0].replace(/[()]/g, '')

  const quantityMatch = name.match(QUANTITY_PATTERN)
  return quantityMatch?.[0] ? quantityMatch[0].replace(/[()]/g, '') : '1 unit'
}

export function getProductBaseName(product) {
  const name = product?.name || ''
  return name
    .replace(PACK_PATTERN, ' ')
    .replace(QUANTITY_PATTERN, ' ')
    .replace(/\(.*?\)/g, ' ')
    .replace(/\b(?:block|pack|pouch|bottle|jar|tin|can)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function getProductGroupKey(product) {
  const baseName = getProductBaseName(product).toLowerCase().trim()
  const brand = (product?.brand || '').toLowerCase().trim()
  const cat = (typeof product?.category === 'object' ? (product.category?.slug || product.category?.name) : null)
    || product?.category_slug
    || product?.category_name
    || product?.category
    || ''

  return `${baseName}|${brand}|${String(cat).toLowerCase().trim()}`
}

export function withGroupedVariants(products) {
  const groups = new Map()

  products.forEach(product => {
    const key = getProductGroupKey(product)
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(product)
  })

  return Array.from(groups.values()).map(group => {
    const sorted = [...group].sort((a, b) => {
      const discountDiff = parseFloat(b.discount_percent || 0) - parseFloat(a.discount_percent || 0)
      if (discountDiff !== 0) return discountDiff
      return parseFloat(a.price || 0) - parseFloat(b.price || 0)
    })

    return {
      ...sorted[0],
      display_name: getProductBaseName(sorted[0]) || sorted[0].name,
      variants: sorted.map(item => ({
        ...item,
        variant_label: getQuantityText(item),
      })),
    }
  })
}
