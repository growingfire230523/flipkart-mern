import TextField from '@mui/material/TextField';
import { useState, useEffect } from 'react';
import DeleteIcon from '@mui/icons-material/Delete';
import { useDispatch, useSelector } from 'react-redux';
import { useSnackbar } from 'notistack';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { NEW_PRODUCT_RESET } from '../../constants/productConstants';
import { createProduct, clearErrors } from '../../actions/productAction';
import ImageIcon from '@mui/icons-material/Image';
import { categories, subCategoriesByCategory } from '../../utils/constants';
import MetaData from '../Layouts/MetaData';
import BackdropLoader from '../Layouts/BackdropLoader';

const normalizeHex = (value) => {
    const raw = String(value || '').trim();
    if (!raw) return '';
    const v = raw.startsWith('#') ? raw : `#${raw}`;
    const hex = v.toUpperCase();
    if (/^#[0-9A-F]{3}$/.test(hex) || /^#[0-9A-F]{6}$/.test(hex)) return hex;
    return '';
};

const NewProduct = () => {

    const dispatch = useDispatch();
    const { enqueueSnackbar } = useSnackbar();
    const navigate = useNavigate();

    const { loading, success, error } = useSelector((state) => state.newProduct);

    const [highlights, setHighlights] = useState([]);
    const [highlightInput, setHighlightInput] = useState("");

    const [catalogNormalHighlights, setCatalogNormalHighlights] = useState([]);
    const [catalogNormalInput, setCatalogNormalInput] = useState('');
    const [catalogActiveHighlights, setCatalogActiveHighlights] = useState([]);
    const [catalogActiveInput, setCatalogActiveInput] = useState('');

    const [specs, setSpecs] = useState([]);
    const [specsInput, setSpecsInput] = useState({
        title: "",
        description: ""
    });

    const [name, setName] = useState("");
    const [hsn, setHsn] = useState("");
    const [itemCode, setItemCode] = useState("");
    const [description, setDescription] = useState("");
    const [descAiLoading, setDescAiLoading] = useState(false);
    const [price, setPrice] = useState(0);
    const [cuttedPrice, setCuttedPrice] = useState(0);
    const [selectedCategories, setSelectedCategories] = useState([]);
    const [selectedSubCategories, setSelectedSubCategories] = useState([]);
    const [sessionExtraCategories, setSessionExtraCategories] = useState([]);
    const [sessionExtraSubCategories, setSessionExtraSubCategories] = useState([]);
    const [newCategoryInput, setNewCategoryInput] = useState("");
    const [newSubCategoryInput, setNewSubCategoryInput] = useState("");
    const [categorySearch, setCategorySearch] = useState("");
    const [subCategorySearch, setSubCategorySearch] = useState("");
    const [stock, setStock] = useState(0);
    const [warranty, setWarranty] = useState(0);
    const [brand, setBrand] = useState("");
    const [images, setImages] = useState([]);
    const [imagesPreview, setImagesPreview] = useState([]);

    const [isVolumeProduct, setIsVolumeProduct] = useState(false);
    const [volumeVariants, setVolumeVariants] = useState([
        { volume: "", price: 0, cuttedPrice: 0, stock: 0 },
    ]);

    const [isSizeProduct, setIsSizeProduct] = useState(false);
    const [sizeVariants, setSizeVariants] = useState([
        { size: "", price: 0, cuttedPrice: 0, stock: 0 },
    ]);

    const [isColorProduct, setIsColorProduct] = useState(false);
    const [colorVariants, setColorVariants] = useState([
        { name: "", hex: "", price: 0, cuttedPrice: 0, stock: 0 },
    ]);

    const [colorCatalog, setColorCatalog] = useState([]);
    const [colorCatalogError, setColorCatalogError] = useState('');
    const [colorSearch, setColorSearch] = useState('');
    const [activeColorRow, setActiveColorRow] = useState(0);

    const [isGiftable, setIsGiftable] = useState(false);

    const [logo, setLogo] = useState("");
    const [logoPreview, setLogoPreview] = useState("");

    const handleSpecsChange = (e) => {
        setSpecsInput({ ...specsInput, [e.target.name]: e.target.value });
    }

    // All categories available in this session (hardcoded + admin-added)
    const allCategories = [...categories, ...sessionExtraCategories];

    // All subcategories available for selected categories + session-added
    const allSubCategories = Array.from(new Set([
        ...selectedCategories.flatMap((cat) => subCategoriesByCategory[cat] || []),
        ...sessionExtraSubCategories,
    ]));

    const toggleCategory = (cat) => {
        setSelectedCategories((prev) =>
            prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
        );
    };

    const toggleSubCategory = (sub) => {
        setSelectedSubCategories((prev) =>
            prev.includes(sub) ? prev.filter((s) => s !== sub) : [...prev, sub]
        );
    };

    const addNewCategory = () => {
        const v = newCategoryInput.trim().toUpperCase();
        if (!v) return;
        if (!allCategories.includes(v)) {
            setSessionExtraCategories((prev) => [...prev, v]);
        }
        setSelectedCategories((prev) => prev.includes(v) ? prev : [...prev, v]);
        setNewCategoryInput("");
    };

    const addNewSubCategory = () => {
        const v = newSubCategoryInput.trim();
        if (!v) return;
        if (!allSubCategories.includes(v)) {
            setSessionExtraSubCategories((prev) => [...prev, v]);
        }
        setSelectedSubCategories((prev) => prev.includes(v) ? prev : [...prev, v]);
        setNewSubCategoryInput("");
    };

    const addSpecs = () => {
        if (!specsInput.title.trim() || !specsInput.title.trim()) return;
        setSpecs([...specs, specsInput]);
        setSpecsInput({ title: "", description: "" });
    }

    const addHighlight = () => {
        if (!highlightInput.trim()) return;
        setHighlights([...highlights, highlightInput]);
        setHighlightInput("");
    }

    const addCatalogNormal = () => {
        const v = String(catalogNormalInput || '').trim();
        if (!v) return;
        setCatalogNormalHighlights((prev) => [...prev, v]);
        setCatalogNormalInput('');
    };

    const addCatalogActive = () => {
        const v = String(catalogActiveInput || '').trim();
        if (!v) return;
        setCatalogActiveHighlights((prev) => [...prev, v]);
        setCatalogActiveInput('');
    };

    const deleteHighlight = (index) => {
        setHighlights(highlights.filter((h, i) => i !== index))
    }

    const deleteCatalogNormal = (index) => {
        setCatalogNormalHighlights((prev) => prev.filter((_, i) => i !== index));
    };

    const deleteCatalogActive = (index) => {
        setCatalogActiveHighlights((prev) => prev.filter((_, i) => i !== index));
    };

    const deleteSpec = (index) => {
        setSpecs(specs.filter((s, i) => i !== index))
    }

    const handleLogoChange = (e) => {
        const reader = new FileReader();

        reader.onload = () => {
            if (reader.readyState === 2) {
                setLogoPreview(reader.result);
                setLogo(reader.result);
            }
        };

        reader.readAsDataURL(e.target.files[0]);
    }

    const handleProductImageChange = (e) => {
        const files = Array.from(e.target.files);

        files.forEach((file) => {
            const reader = new FileReader();

            reader.onload = () => {
                if (reader.readyState === 2) {
                    setImagesPreview((oldImages) => [...oldImages, reader.result]);
                    setImages((oldImages) => [...oldImages, reader.result]);
                }
            }
            reader.readAsDataURL(file);
        });
    }

    const removeProductImage = (index) => {
        setImagesPreview((prev) => prev.filter((_, i) => i !== index));
        setImages((prev) => prev.filter((_, i) => i !== index));
    };

    const updateVariant = (index, key, value) => {
        setVolumeVariants((prev) =>
            prev.map((v, i) => (i === index ? { ...v, [key]: value } : v))
        );
    };

    const addVariantRow = () => {
        setVolumeVariants((prev) => [...prev, { volume: "", price: 0, cuttedPrice: 0, stock: 0 }]);
    };

    const removeVariantRow = (index) => {
        setVolumeVariants((prev) => prev.filter((_, i) => i !== index));
    };

    const updateSizeVariant = (index, key, value) => {
        setSizeVariants((prev) =>
            prev.map((v, i) => (i === index ? { ...v, [key]: value } : v))
        );
    };

    const addSizeVariantRow = () => {
        setSizeVariants((prev) => [...prev, { size: "", price: 0, cuttedPrice: 0, stock: 0 }]);
    };

    const removeSizeVariantRow = (index) => {
        setSizeVariants((prev) => prev.filter((_, i) => i !== index));
    };

    const updateColorVariant = (index, key, value) => {
        setColorVariants((prev) =>
            prev.map((v, i) => (i === index ? { ...v, [key]: value } : v))
        );
    };

    const addColorVariantRow = () => {
        setColorVariants((prev) => [...prev, { name: "", hex: "", price: 0, cuttedPrice: 0, stock: 0 }]);
    };

    const removeColorVariantRow = (index) => {
        setColorVariants((prev) => prev.filter((_, i) => i !== index));
        setActiveColorRow((prev) => Math.max(0, Math.min(prev, colorVariants.length - 2)));
    };

    const applyCatalogColorToRow = (color) => {
        if (!color) return;
        const name = String(color?.name || '').trim();
        const hex = normalizeHex(color?.hex);
        if (!name || !hex) return;
        updateColorVariant(activeColorRow, 'name', name);
        updateColorVariant(activeColorRow, 'hex', hex);
    };

    useEffect(() => {
        let mounted = true;

        const load = async () => {
            try {
                setColorCatalogError('');
                // Public color list API (CORS enabled). Contains thousands of named shades.
                const res = await fetch('https://unpkg.com/color-name-list/dist/colornames.json');
                if (!res.ok) throw new Error(`Color API failed (${res.status})`);
                const json = await res.json();
                if (!mounted) return;
                const list = Array.isArray(json) ? json : [];
                setColorCatalog(list.filter((c) => c && c.name && c.hex));
            } catch (e) {
                if (!mounted) return;
                setColorCatalog([]);
                setColorCatalogError(e?.message || 'Failed to load colors');
            }
        };

        load();
        return () => { mounted = false; };
    }, []);

    useEffect(() => {
        if (!isVolumeProduct) return;

        const first = volumeVariants.find((v) => String(v?.volume || "").trim() && Number(v?.price) > 0);
        if (!first) return;

        setPrice(Number(first.price) || 0);
        setCuttedPrice(Number(first.cuttedPrice) || Number(first.price) || 0);

        const totalStock = volumeVariants.reduce((sum, v) => sum + (Number(v?.stock) || 0), 0);
        setStock(totalStock);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isVolumeProduct, volumeVariants]);

    useEffect(() => {
        if (!isSizeProduct) return;

        const first = sizeVariants.find((v) => String(v?.size || "").trim() && Number(v?.price) > 0);
        if (!first) return;

        setPrice(Number(first.price) || 0);
        setCuttedPrice(Number(first.cuttedPrice) || Number(first.price) || 0);

        const totalStock = sizeVariants.reduce((sum, v) => sum + (Number(v?.stock) || 0), 0);
        setStock(totalStock);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isSizeProduct, sizeVariants]);

    useEffect(() => {
        if (!isColorProduct) return;

        const first = colorVariants.find((v) => String(v?.name || "").trim() && normalizeHex(v?.hex) && Number(v?.price) > 0);
        if (!first) return;

        setPrice(Number(first.price) || 0);
        setCuttedPrice(Number(first.cuttedPrice) || Number(first.price) || 0);

        const totalStock = colorVariants.reduce((sum, v) => sum + (Number(v?.stock) || 0), 0);
        setStock(totalStock);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isColorProduct, colorVariants]);

    // Keep variant types mutually exclusive (simpler UX + pricing model).
    useEffect(() => {
        if (!isColorProduct) return;
        if (isVolumeProduct) setIsVolumeProduct(false);
        if (isSizeProduct) setIsSizeProduct(false);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isColorProduct]);

    useEffect(() => {
        if (!isVolumeProduct) return;
        if (isColorProduct) setIsColorProduct(false);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isVolumeProduct]);

    useEffect(() => {
        if (!isSizeProduct) return;
        if (isColorProduct) setIsColorProduct(false);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isSizeProduct]);

    const generateItemCode = () => {
        const code = Array.from({ length: 13 }, () => Math.floor(Math.random() * 10)).join('');
        setItemCode(code);
    };

    const generateDescription = async () => {
        if (!name.trim()) {
            enqueueSnackbar('Enter Item Name first', { variant: 'warning' });
            return;
        }
        setDescAiLoading(true);
        try {
            const { data } = await axios.post('/api/v1/admin/product/generate-description', { name }, { withCredentials: true });
            setDescription(data.description);
        } catch (err) {
            enqueueSnackbar(err?.response?.data?.message || 'AI generation failed', { variant: 'error' });
        } finally {
            setDescAiLoading(false);
        }
    };

    const newProductSubmitHandler = (e) => {
        e.preventDefault();
        if (selectedCategories.length === 0) {
            enqueueSnackbar("Select at least one Category", { variant: "warning" });
            return;
        }
        if (selectedSubCategories.length === 0) {
            enqueueSnackbar("Select at least one Sub Category", { variant: "warning" });
            return;
        }

        // required field checks
        if (highlights.length <= 0) {
            enqueueSnackbar("Add Highlights", { variant: "warning" });
            return;
        }
        if (!logo) {
            enqueueSnackbar("Add Brand Logo", { variant: "warning" });
            return;
        }
        if (specs.length <= 1) {
            enqueueSnackbar("Add Minimum 2 Specifications", { variant: "warning" });
            return;
        }
        if (images.length <= 0) {
            enqueueSnackbar("Add Product Images", { variant: "warning" });
            return;
        }

        const cleanedVolumeVariants = isVolumeProduct
            ? volumeVariants
                .map((v) => ({
                    volume: String(v.volume || "").trim(),
                    price: Number(v.price),
                    cuttedPrice: Number(v.cuttedPrice) || 0,
                    stock: Number(v.stock) || 0,
                }))
                .filter((v) => v.volume && Number.isFinite(v.price) && v.price >= 0)
            : [];

        const cleanedSizeVariants = isSizeProduct
            ? sizeVariants
                .map((v) => ({
                    size: String(v.size || "").trim(),
                    price: Number(v.price),
                    cuttedPrice: Number(v.cuttedPrice) || 0,
                    stock: Number(v.stock) || 0,
                }))
                .filter((v) => v.size && Number.isFinite(v.price) && v.price >= 0)
            : [];

        const cleanedColorVariants = isColorProduct
            ? colorVariants
                .map((v) => ({
                    name: String(v.name || '').trim(),
                    hex: normalizeHex(v.hex),
                    price: Number(v.price),
                    cuttedPrice: Number(v.cuttedPrice) || 0,
                    stock: Number(v.stock) || 0,
                }))
                .filter((v) => v.name && v.hex && Number.isFinite(v.price) && v.price >= 0)
            : [];

        if (isVolumeProduct && cleanedVolumeVariants.length <= 0) {
            enqueueSnackbar("Add at least 1 volume option", { variant: "warning" });
            return;
        }

        if (isSizeProduct && cleanedSizeVariants.length <= 0) {
            enqueueSnackbar("Add at least 1 size option", { variant: "warning" });
            return;
        }

        if (isColorProduct && cleanedColorVariants.length <= 0) {
            enqueueSnackbar("Add at least 1 color option", { variant: "warning" });
            return;
        }

        const payload = {
            name,
            hsn,
            itemCode,
            description,
            price,
            cuttedPrice,
            category: selectedCategories[0] || "",
            categories: selectedCategories,
            subCategory: selectedSubCategories[0] || "",
            subCategories: selectedSubCategories,
            stock,
            warranty,
            brandname: brand,
            logo,
            images,
            highlights,
            catalogHighlightNormal: catalogNormalHighlights,
            catalogHighlightActive: catalogActiveHighlights,
            specifications: specs,
            isVolumeProduct,
            volumeVariants: cleanedVolumeVariants,
            isSizeProduct,
            sizeVariants: cleanedSizeVariants,
            isColorProduct,
            colorVariants: cleanedColorVariants,
            isGiftable,
        };

        dispatch(createProduct(payload));
    }

    useEffect(() => {
        if (error) {
            enqueueSnackbar(error, { variant: "error" });
            dispatch(clearErrors());
        }
        if (success) {
            enqueueSnackbar("Product Created", { variant: "success" });
            dispatch({ type: NEW_PRODUCT_RESET });
            navigate("/admin/products");
        }
    }, [dispatch, error, success, navigate, enqueueSnackbar]);

    return (
        <>
            <MetaData title="Admin: New Product | Flipkart" />

            {loading && <BackdropLoader />}
            <form onSubmit={newProductSubmitHandler} encType="multipart/form-data" className="flex flex-col sm:flex-row bg-white rounded-lg shadow p-4" id="mainform">

                <div className="flex flex-col gap-3 m-2 sm:w-1/2">
                    <div className="flex gap-3">
                        <TextField
                            label="Item Name"
                            variant="outlined"
                            size="small"
                            required
                            fullWidth
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                        />
                        <TextField
                            label="Item HSN"
                            variant="outlined"
                            size="small"
                            value={hsn}
                            onChange={(e) => setHsn(e.target.value)}
                        />
                    </div>
                    <div className="flex gap-3 items-center">
                        <TextField
                            label="Item Code"
                            variant="outlined"
                            size="small"
                            fullWidth
                            value={itemCode}
                            onChange={(e) => setItemCode(e.target.value)}
                            placeholder="13-digit code"
                        />
                        <button
                            type="button"
                            onClick={generateItemCode}
                            className="px-3 py-2 text-xs bg-gray-600 text-white rounded hover:opacity-90 whitespace-nowrap"
                        >
                            Generate Code
                        </button>
                    </div>
                    <div className="flex flex-col">
                        <div className="flex justify-end mb-1">
                            <button
                                type="button"
                                onClick={generateDescription}
                                disabled={descAiLoading || !name.trim()}
                                className="px-2.5 py-0.5 text-xs bg-gradient-to-r from-violet-500 to-indigo-500 text-white rounded font-semibold hover:opacity-90 disabled:opacity-50"
                            >
                                {descAiLoading ? 'Generating...' : '✨ AI'}
                            </button>
                        </div>
                        <TextField
                            label="Description"
                            multiline
                            minRows={3}
                            required
                            variant="outlined"
                            size="small"
                            fullWidth
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            inputProps={{ style: { resize: 'vertical', overflow: 'auto' } }}
                        />
                    </div>
                    <div className="flex justify-between">
                        <TextField
                            label="Price"
                            type="number"
                            variant="outlined"
                            size="small"
                            InputProps={{
                                inputProps: {
                                    min: 0
                                }
                            }}
                            required
                            value={price}
                            onChange={(e) => setPrice(e.target.value)}
                            disabled={isVolumeProduct || isSizeProduct || isColorProduct}
                        />
                        <TextField
                            label="Cutted Price"
                            type="number"
                            variant="outlined"
                            size="small"
                            InputProps={{
                                inputProps: {
                                    min: 0
                                }
                            }}
                            required
                            value={cuttedPrice}
                            onChange={(e) => setCuttedPrice(e.target.value)}
                            disabled={isVolumeProduct || isSizeProduct || isColorProduct}
                        />
                    </div>

                    <div className="flex flex-col gap-2">
                        <label className="flex items-center gap-2 text-sm text-primary-darkBlue">
                            <input
                                type="checkbox"
                                checked={isVolumeProduct}
                                onChange={(e) => setIsVolumeProduct(e.target.checked)}
                            />
                            Volume product
                        </label>

                        {isVolumeProduct && (
                            <div className="flex flex-col gap-2 border rounded p-2">
                                {volumeVariants.map((v, i) => (
                                    <div key={i} className="flex flex-col gap-2 sm:flex-row sm:items-center">
                                        <TextField
                                            label="Volume"
                                            size="small"
                                            value={v.volume}
                                            onChange={(e) => updateVariant(i, 'volume', e.target.value)}
                                        />
                                        <TextField
                                            label="Price"
                                            type="number"
                                            size="small"
                                            value={v.price}
                                            onChange={(e) => updateVariant(i, 'price', e.target.value)}
                                        />
                                        <TextField
                                            label="Cutted"
                                            type="number"
                                            size="small"
                                            value={v.cuttedPrice}
                                            onChange={(e) => updateVariant(i, 'cuttedPrice', e.target.value)}
                                        />
                                        <TextField
                                            label="Stock"
                                            type="number"
                                            size="small"
                                            value={v.stock}
                                            onChange={(e) => updateVariant(i, 'stock', e.target.value)}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => removeVariantRow(i)}
                                            disabled={volumeVariants.length <= 1}
                                            className={
                                                volumeVariants.length <= 1
                                                    ? 'px-3 py-2 border rounded text-primary-grey cursor-not-allowed'
                                                    : 'px-3 py-2 border rounded hover:text-red-600'
                                            }
                                        >
                                            Remove
                                        </button>
                                    </div>
                                ))}
                                <div className="flex justify-end">
                                    <button
                                        type="button"
                                        onClick={addVariantRow}
                                        className="py-2 px-4 bg-primary-blue text-white rounded hover:shadow-lg"
                                    >
                                        Add Volume
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="flex flex-col gap-2">
                        <label className="flex items-center gap-2 text-sm text-primary-darkBlue">
                            <input
                                type="checkbox"
                                checked={isSizeProduct}
                                onChange={(e) => setIsSizeProduct(e.target.checked)}
                            />
                            Size product
                        </label>

                        {isSizeProduct && (
                            <div className="flex flex-col gap-2 border rounded p-2">
                                {sizeVariants.map((v, i) => (
                                    <div key={i} className="flex flex-col gap-2 sm:flex-row sm:items-center">
                                        <TextField
                                            label="Size"
                                            size="small"
                                            value={v.size}
                                            onChange={(e) => updateSizeVariant(i, 'size', e.target.value)}
                                        />
                                        <TextField
                                            label="Price"
                                            type="number"
                                            size="small"
                                            value={v.price}
                                            onChange={(e) => updateSizeVariant(i, 'price', e.target.value)}
                                        />
                                        <TextField
                                            label="Cutted"
                                            type="number"
                                            size="small"
                                            value={v.cuttedPrice}
                                            onChange={(e) => updateSizeVariant(i, 'cuttedPrice', e.target.value)}
                                        />
                                        <TextField
                                            label="Stock"
                                            type="number"
                                            size="small"
                                            value={v.stock}
                                            onChange={(e) => updateSizeVariant(i, 'stock', e.target.value)}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => removeSizeVariantRow(i)}
                                            disabled={sizeVariants.length <= 1}
                                            className={
                                                sizeVariants.length <= 1
                                                    ? 'px-3 py-2 border rounded text-primary-grey cursor-not-allowed'
                                                    : 'px-3 py-2 border rounded hover:text-red-600'
                                            }
                                        >
                                            Remove
                                        </button>
                                    </div>
                                ))}
                                <div className="flex justify-end">
                                    <button
                                        type="button"
                                        onClick={addSizeVariantRow}
                                        className="py-2 px-4 bg-primary-blue text-white rounded hover:shadow-lg"
                                    >
                                        Add Size
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="flex flex-col gap-2">
                        <label className="flex items-center gap-2 text-sm text-primary-darkBlue">
                            <input
                                type="checkbox"
                                checked={isColorProduct}
                                onChange={(e) => setIsColorProduct(e.target.checked)}
                            />
                            Color product
                        </label>

                        {isColorProduct && (
                            <div className="flex flex-col gap-2 border rounded p-2">
                                <div className="flex flex-col gap-2">
                                    <TextField
                                        label="Search shade (from color API)"
                                        size="small"
                                        value={colorSearch}
                                        onChange={(e) => setColorSearch(e.target.value)}
                                        placeholder="Type e.g. rose, nude, coral..."
                                    />
                                    {colorCatalogError ? (
                                        <p className="text-xs text-red-600">{colorCatalogError}</p>
                                    ) : null}

                                    {String(colorSearch || '').trim().length >= 2 && colorCatalog.length > 0 ? (
                                        <div className="border rounded p-2 max-h-40 overflow-auto">
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                {colorCatalog
                                                    .filter((c) => String(c.name || '').toLowerCase().includes(String(colorSearch || '').trim().toLowerCase()))
                                                    .slice(0, 12)
                                                    .map((c) => (
                                                        <button
                                                            type="button"
                                                            key={`${c.name}-${c.hex}`}
                                                            onClick={() => applyCatalogColorToRow(c)}
                                                            className="flex items-center gap-2 border border-gray-200 rounded px-2 py-1 hover:shadow-sm"
                                                        >
                                                            <span className="w-5 h-5 rounded-full border" style={{ backgroundColor: normalizeHex(c.hex) || '#FFFFFF' }} />
                                                            <span className="text-xs text-primary-darkBlue truncate">{c.name}</span>
                                                            <span className="ml-auto text-[10px] text-primary-grey">{String(c.hex || '').toUpperCase()}</span>
                                                        </button>
                                                    ))}
                                            </div>
                                            <p className="mt-2 text-[11px] text-primary-grey">Click a shade to apply to the active row.</p>
                                        </div>
                                    ) : null}
                                </div>

                                {colorVariants.map((v, i) => (
                                    <div key={i} className="flex flex-col gap-2 sm:flex-row sm:items-center">
                                        <TextField
                                            label="Color name"
                                            size="small"
                                            value={v.name}
                                            onFocus={() => setActiveColorRow(i)}
                                            onChange={(e) => updateColorVariant(i, 'name', e.target.value)}
                                        />
                                        <TextField
                                            label="Hex"
                                            size="small"
                                            value={v.hex}
                                            onFocus={() => setActiveColorRow(i)}
                                            onChange={(e) => updateColorVariant(i, 'hex', e.target.value)}
                                            placeholder="#FF7A7A"
                                        />
                                        <div className="w-10 h-10 rounded border bg-white" title={normalizeHex(v.hex) || ''} style={{ backgroundColor: normalizeHex(v.hex) || '#FFFFFF' }} />
                                        <TextField
                                            label="Price"
                                            type="number"
                                            size="small"
                                            value={v.price}
                                            onFocus={() => setActiveColorRow(i)}
                                            onChange={(e) => updateColorVariant(i, 'price', e.target.value)}
                                        />
                                        <TextField
                                            label="Cutted"
                                            type="number"
                                            size="small"
                                            value={v.cuttedPrice}
                                            onFocus={() => setActiveColorRow(i)}
                                            onChange={(e) => updateColorVariant(i, 'cuttedPrice', e.target.value)}
                                        />
                                        <TextField
                                            label="Stock"
                                            type="number"
                                            size="small"
                                            value={v.stock}
                                            onFocus={() => setActiveColorRow(i)}
                                            onChange={(e) => updateColorVariant(i, 'stock', e.target.value)}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => removeColorVariantRow(i)}
                                            disabled={colorVariants.length <= 1}
                                            className={
                                                colorVariants.length <= 1
                                                    ? 'px-3 py-2 border rounded text-primary-grey cursor-not-allowed'
                                                    : 'px-3 py-2 border rounded hover:text-red-600'
                                            }
                                        >
                                            Remove
                                        </button>
                                    </div>
                                ))}

                                <div className="flex justify-end">
                                    <button
                                        type="button"
                                        onClick={addColorVariantRow}
                                        className="py-2 px-4 bg-primary-blue text-white rounded hover:shadow-lg"
                                    >
                                        Add Color
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="flex flex-col gap-2">
                        <label className="flex items-center gap-2 text-sm text-primary-darkBlue">
                            <input
                                type="checkbox"
                                checked={isGiftable}
                                onChange={(e) => setIsGiftable(e.target.checked)}
                            />
                            Show gifting ribbon
                        </label>
                    </div>
                    <div className="flex justify-between gap-4">
                        {/* ── Category multiselect panel ── */}
                        <div className="flex-1 flex flex-col gap-1 border rounded p-2">
                            <div className="flex items-center justify-between mb-1">
                                <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Category *</span>
                                {selectedCategories.length > 0 && (
                                    <span className="text-[10px] text-primary-blue font-medium">{selectedCategories.length} selected</span>
                                )}
                            </div>
                            {/* Search */}
                            <input
                                type="text"
                                placeholder="Search categories..."
                                value={categorySearch}
                                onChange={(e) => setCategorySearch(e.target.value)}
                                className="text-xs border rounded px-2 py-1 outline-none focus:ring-1 focus:ring-primary-blue mb-1"
                            />
                            {/* List */}
                            <div className="max-h-44 overflow-y-auto flex flex-col gap-0.5">
                                {allCategories
                                    .filter((c) => c.toLowerCase().includes(categorySearch.toLowerCase()))
                                    .map((cat) => (
                                        <label key={cat} className={`flex items-center gap-2 px-2 py-1 rounded cursor-pointer text-xs hover:bg-gray-50 ${selectedCategories.includes(cat) ? 'bg-primary-blue/10 font-semibold text-primary-blue' : 'text-gray-700'}`}>
                                            <input
                                                type="checkbox"
                                                checked={selectedCategories.includes(cat)}
                                                onChange={() => toggleCategory(cat)}
                                                className="accent-primary-blue"
                                            />
                                            {cat}
                                        </label>
                                    ))}
                                {allCategories.filter((c) => c.toLowerCase().includes(categorySearch.toLowerCase())).length === 0 && (
                                    <p className="text-xs text-gray-400 px-2 py-1">No match. Add below.</p>
                                )}
                            </div>
                            {/* Add new */}
                            <div className="flex items-center gap-1 mt-1 border-t pt-1">
                                <input
                                    type="text"
                                    placeholder="Add new category…"
                                    value={newCategoryInput}
                                    onChange={(e) => setNewCategoryInput(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addNewCategory())}
                                    className="text-xs border rounded px-2 py-1 flex-1 outline-none focus:ring-1 focus:ring-primary-blue"
                                />
                                <button
                                    type="button"
                                    onClick={addNewCategory}
                                    className="text-xs px-2 py-1 bg-primary-blue text-white rounded hover:opacity-90 whitespace-nowrap"
                                >
                                    Add
                                </button>
                            </div>
                        </div>

                        {/* ── Sub Category multiselect panel ── */}
                        <div className="flex-1 flex flex-col gap-1 border rounded p-2">
                            <div className="flex items-center justify-between mb-1">
                                <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Sub Category *</span>
                                {selectedSubCategories.length > 0 && (
                                    <span className="text-[10px] text-primary-blue font-medium">{selectedSubCategories.length} selected</span>
                                )}
                            </div>
                            {/* Search */}
                            <input
                                type="text"
                                placeholder="Search subcategories..."
                                value={subCategorySearch}
                                onChange={(e) => setSubCategorySearch(e.target.value)}
                                className="text-xs border rounded px-2 py-1 outline-none focus:ring-1 focus:ring-primary-blue mb-1"
                            />
                            {/* List */}
                            <div className="max-h-44 overflow-y-auto flex flex-col gap-0.5">
                                {selectedCategories.length === 0 && sessionExtraSubCategories.length === 0 ? (
                                    <p className="text-xs text-gray-400 px-2 py-1">Select a category first, or add below.</p>
                                ) : (
                                    allSubCategories
                                        .filter((s) => s.toLowerCase().includes(subCategorySearch.toLowerCase()))
                                        .map((sub) => (
                                            <label key={sub} className={`flex items-center gap-2 px-2 py-1 rounded cursor-pointer text-xs hover:bg-gray-50 ${selectedSubCategories.includes(sub) ? 'bg-primary-blue/10 font-semibold text-primary-blue' : 'text-gray-700'}`}>
                                                <input
                                                    type="checkbox"
                                                    checked={selectedSubCategories.includes(sub)}
                                                    onChange={() => toggleSubCategory(sub)}
                                                    className="accent-primary-blue"
                                                />
                                                {sub}
                                            </label>
                                        ))
                                )}
                                {selectedCategories.length > 0 && allSubCategories.filter((s) => s.toLowerCase().includes(subCategorySearch.toLowerCase())).length === 0 && (
                                    <p className="text-xs text-gray-400 px-2 py-1">No match. Add below.</p>
                                )}
                            </div>
                            {/* Add new */}
                            <div className="flex items-center gap-1 mt-1 border-t pt-1">
                                <input
                                    type="text"
                                    placeholder="Add new subcategory…"
                                    value={newSubCategoryInput}
                                    onChange={(e) => setNewSubCategoryInput(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addNewSubCategory())}
                                    className="text-xs border rounded px-2 py-1 flex-1 outline-none focus:ring-1 focus:ring-primary-blue"
                                />
                                <button
                                    type="button"
                                    onClick={addNewSubCategory}
                                    className="text-xs px-2 py-1 bg-primary-blue text-white rounded hover:opacity-90 whitespace-nowrap"
                                >
                                    Add
                                </button>
                            </div>
                        </div>
                        <TextField
                            label="Stock"
                            type="number"
                            variant="outlined"
                            size="small"
                            InputProps={{
                                inputProps: {
                                    min: 0
                                }
                            }}
                            required
                            value={stock}
                            onChange={(e) => setStock(e.target.value)}
                            disabled={isVolumeProduct}
                        />
                        <TextField
                            label="Warranty"
                            type="number"
                            variant="outlined"
                            size="small"
                            InputProps={{
                                inputProps: {
                                    min: 0
                                }
                            }}
                            required
                            value={warranty}
                            onChange={(e) => setWarranty(e.target.value)}
                        />
                    </div>

                    <div className="flex flex-col gap-2">
                        <div className="flex justify-between items-center border rounded">
                            <input value={highlightInput} onChange={(e) => setHighlightInput(e.target.value)} type="text" placeholder="Highlight" className="px-2 flex-1 outline-none border-none" />
                            <span onClick={() => addHighlight()} className="py-2 px-6 bg-primary-blue text-white rounded-r hover:shadow-lg cursor-pointer">Add</span>
                        </div>

                        <div className="flex flex-col gap-1.5">
                            {highlights.map((h, i) => (
                                <div className="flex justify-between rounded items-center py-1 px-2 bg-primary-yellow/10 border border-primary-yellow/20">
                                    <p className="text-primary-darkBlue text-sm font-medium">{h}</p>
                                    <span onClick={() => deleteHighlight(i)} className="text-primary-orange hover:bg-primary-orange/10 p-1 rounded-full cursor-pointer">
                                        <DeleteIcon />
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <h2 className="font-medium">Catalogue Highlight Tags</h2>
                    <div className="flex flex-col gap-3">
                        <div className="flex flex-col gap-2">
                            <div className="flex justify-between items-center border rounded">
                                <input
                                    value={catalogNormalInput}
                                    onChange={(e) => setCatalogNormalInput(e.target.value)}
                                    type="text"
                                    placeholder="Normal tag (grey)"
                                    className="px-2 flex-1 outline-none border-none"
                                />
                                <span onClick={addCatalogNormal} className="py-2 px-6 bg-primary-blue text-white rounded-r hover:shadow-lg cursor-pointer">Add</span>
                            </div>

                            <div className="flex flex-col gap-1.5">
                                {catalogNormalHighlights.map((t, i) => (
                                    <div key={`n-${i}`} className="flex justify-between rounded items-center py-1 px-2 bg-gray-100 border border-gray-200">
                                        <p className="text-primary-darkBlue text-sm font-medium">{t}</p>
                                        <span onClick={() => deleteCatalogNormal(i)} className="text-primary-grey hover:bg-gray-200/60 p-1 rounded-full cursor-pointer">
                                            <DeleteIcon />
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="flex flex-col gap-2">
                            <div className="flex justify-between items-center border rounded">
                                <input
                                    value={catalogActiveInput}
                                    onChange={(e) => setCatalogActiveInput(e.target.value)}
                                    type="text"
                                    placeholder="Active tag (red)"
                                    className="px-2 flex-1 outline-none border-none"
                                />
                                <span onClick={addCatalogActive} className="py-2 px-6 bg-primary-blue text-white rounded-r hover:shadow-lg cursor-pointer">Add</span>
                            </div>

                            <div className="flex flex-col gap-1.5">
                                {catalogActiveHighlights.map((t, i) => (
                                    <div key={`a-${i}`} className="flex justify-between rounded items-center py-1 px-2 bg-red-50 border border-red-200">
                                        <p className="text-red-700 text-sm font-medium">{t}</p>
                                        <span onClick={() => deleteCatalogActive(i)} className="text-red-700 hover:bg-red-100/70 p-1 rounded-full cursor-pointer">
                                            <DeleteIcon />
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <h2 className="font-medium">Brand Details</h2>
                    <div className="flex justify-between gap-4 items-start">
                        <TextField
                            label="Brand"
                            type="text"
                            variant="outlined"
                            size="small"
                            required
                            value={brand}
                            onChange={(e) => setBrand(e.target.value)}
                        />
                        <div className="w-24 h-10 flex items-center justify-center border rounded-lg">
                            {!logoPreview ? <ImageIcon /> :
                                <img draggable="false" src={logoPreview} alt="Brand Logo" className="w-full h-full object-contain" />
                            }
                        </div>
                        <label className="rounded bg-primary-grey text-center cursor-pointer text-white py-2 px-2.5 shadow hover:shadow-lg hover:opacity-90">
                            <input
                                type="file"
                                name="logo"
                                accept="image/*"
                                onChange={handleLogoChange}
                                className="hidden"
                            />
                            Choose Logo
                        </label>
                    </div>

                </div>

                <div className="flex flex-col gap-2 m-2 sm:w-1/2">
                    <h2 className="font-medium">Specifications</h2>

                    <div className="flex justify-evenly gap-2 items-center">
                        <TextField value={specsInput.title} onChange={handleSpecsChange} name="title" label="Name" placeholder="Model No" variant="outlined" size="small" />
                        <TextField value={specsInput.description} onChange={handleSpecsChange} name="description" label="Description" placeholder="WJDK42DF5" variant="outlined" size="small" />
                        <span onClick={() => addSpecs()} className="py-2 px-6 bg-primary-blue text-white rounded hover:shadow-lg cursor-pointer">Add</span>
                    </div>

                    <div className="flex flex-col gap-1.5">
                        {specs.map((spec, i) => (
                            <div className="flex justify-between items-center text-sm rounded bg-white/70 border border-gray-200 py-1 px-2">
                                <p className="text-primary-grey font-medium">{spec.title}</p>
                                <p>{spec.description}</p>
                                <span onClick={() => deleteSpec(i)} className="text-primary-orange hover:bg-primary-orange/20 bg-primary-orange/10 p-1 rounded-full cursor-pointer">
                                    <DeleteIcon />
                                </span>
                            </div>
                        ))}
                    </div>

                    <h2 className="font-medium">Product Images</h2>
                    <div className="flex gap-2 overflow-x-auto h-32 border rounded">
                        {imagesPreview.map((image, i) => (
                            <div key={i} className="relative flex-shrink-0 h-full">
                                <img draggable="false" src={image} alt="Product" className="h-full w-auto object-contain" />
                                <button
                                    type="button"
                                    onClick={() => removeProductImage(i)}
                                    className="absolute top-1 right-1 bg-black/60 hover:bg-black/80 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs leading-none"
                                    title="Remove image"
                                >
                                    ×
                                </button>
                            </div>
                        ))}
                    </div>
                    <label className="rounded font-medium bg-primary-grey text-center cursor-pointer text-white p-2 shadow hover:shadow-lg my-2 hover:opacity-90">
                        <input
                            type="file"
                            name="images"
                            accept="image/*"
                            multiple
                            onChange={handleProductImageChange}
                            className="hidden"
                        />
                        Choose Files
                    </label>

                    <div className="flex justify-end">
                        <input form="mainform" type="submit" className="bg-primary-orange uppercase w-1/3 p-3 text-white font-medium rounded shadow hover:shadow-lg cursor-pointer" value="Submit" />
                    </div>

                </div>

            </form>
        </>
    );
};

export default NewProduct;
