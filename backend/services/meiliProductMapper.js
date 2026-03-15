const normalizeString = (value) => String(value ?? '').trim();

const normalizeKey = (value) => String(value ?? '').trim().toLowerCase().replace(/\s+/g, ' ');

const splitFacetValues = (raw) => {
    const value = String(raw ?? '').trim();
    if (!value) return [];
    return value
        .split(/\s*(?:,|\/|\||;|\u2022)\s*/g)
        .map((v) => String(v || '').trim())
        .filter(Boolean)
        .slice(0, 25);
};

const extractFacetFromSpecifications = (specifications, titleMatchers) => {
    if (!Array.isArray(specifications) || !specifications.length) return [];
    const matchers = (titleMatchers || []).map((m) => normalizeKey(m)).filter(Boolean);
    if (!matchers.length) return [];

    const values = [];
    for (const s of specifications) {
        const title = normalizeKey(s?.title);
        if (!title) continue;
        const matched = matchers.some((m) => title === m || title.includes(m));
        if (!matched) continue;

        for (const v of splitFacetValues(s?.description)) values.push(v);
    }

    return Array.from(new Set(values.map((v) => normalizeString(v)).filter(Boolean))).slice(0, 50);
};

const extractVariantValues = (product) => {
    const out = [];

    if (Array.isArray(product?.sizeVariants)) {
        for (const v of product.sizeVariants) {
            const label = normalizeString(v?.size);
            if (label) out.push(label);
        }
    }

    if (Array.isArray(product?.volumeVariants)) {
        for (const v of product.volumeVariants) {
            const label = normalizeString(v?.volume);
            if (label) out.push(label);
        }
    }

    return Array.from(new Set(out)).slice(0, 50);
};

const pickSpecificationTexts = (specifications) => {
    if (!Array.isArray(specifications)) return [];
    const out = [];
    for (const s of specifications) {
        if (!s) continue;
        if (s.title) out.push(normalizeString(s.title));
        if (s.description) out.push(normalizeString(s.description));
    }
    return out.filter(Boolean);
};

const mapProductToMeiliDocument = (product) => {
    if (!product) return null;

    const id = String(product._id ?? product.id ?? '').trim();
    if (!id) return null;

    const brandName = normalizeString(product.brand?.name);
    const category = normalizeString(product.category);
    const subCategory = normalizeString(product.subCategory);

    const highlights = Array.isArray(product.highlights)
        ? product.highlights.map((h) => normalizeString(h)).filter(Boolean)
        : [];

    const specificationTexts = pickSpecificationTexts(product.specifications);

    // Cosmetic-style facets (optional). We derive these from specifications titles if present.
    const finish = extractFacetFromSpecifications(product.specifications, ['finish']);
    const coverage = extractFacetFromSpecifications(product.specifications, ['coverage']);
    const color = extractFacetFromSpecifications(product.specifications, ['color', 'shade']);
    const fragranceNote = extractFacetFromSpecifications(product.specifications, ['fragrance note', 'fragrance notes', 'notes']);
    const formulation = extractFacetFromSpecifications(product.specifications, ['formulation']);

    const size = Array.from(
        new Set([
            ...extractFacetFromSpecifications(product.specifications, ['size', 'volume']),
            ...extractVariantValues(product),
        ])
    ).slice(0, 50);

    const exclusivesFromSpecs = extractFacetFromSpecifications(product.specifications, [
        'exclusives & services',
        'exclusives and services',
        'exclusives',
        'services',
    ]);

    const exclusivesServices = Array.from(
        new Set([
            ...exclusivesFromSpecs,
            product?.dealOfDay ? 'Deal of the Day' : null,
            product?.isGiftable ? 'Giftable' : null,
        ].filter(Boolean))
    ).slice(0, 50);

    const tags = Array.from(
        new Set(
            [...highlights, category, subCategory, brandName]
                .map((t) => normalizeString(t).toLowerCase())
                .filter(Boolean)
        )
    ).slice(0, 50);

    return {
        id,
        name: normalizeString(product.name),
        description: normalizeString(product.description),
        highlights,
        specificationTexts,
        brandName,
        category,
        subCategory,
        tags,
        finish,
        coverage,
        color,
        size,
        fragranceNote,
        exclusivesServices,
        formulation,
        price: Number(product.price) || 0,
        cuttedPrice: Number(product.cuttedPrice) || 0,
        stock: Number(product.stock) || 0,
        ratings: Number(product.ratings) || 0,
        numOfReviews: Number(product.numOfReviews) || 0,
        orderCount: Number(product.orderCount) || 0,
        dealOfDay: Boolean(product.dealOfDay),
        isGiftable: Boolean(product.isGiftable),
        createdAt: product.createdAt ? new Date(product.createdAt).toISOString() : null,
    };
};

module.exports = {
    mapProductToMeiliDocument,
};
