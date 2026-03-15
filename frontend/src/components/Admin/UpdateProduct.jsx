import TextField from '@mui/material/TextField';
import { useState, useEffect } from 'react';
import DeleteIcon from '@mui/icons-material/Delete';
import MenuItem from '@mui/material/MenuItem';
import { useDispatch, useSelector } from 'react-redux';
import { useSnackbar } from 'notistack';
import { useNavigate, useParams } from 'react-router-dom';
import { REMOVE_PRODUCT_DETAILS, UPDATE_PRODUCT_RESET } from '../../constants/productConstants';
import { clearErrors, getProductDetails, updateProduct } from '../../actions/productAction';
import ImageIcon from '@mui/icons-material/Image';
import BackdropLoader from '../Layouts/BackdropLoader';
import { categories, subCategoriesByCategory } from '../../utils/constants';
import MetaData from '../Layouts/MetaData';

const normalizeHex = (value) => {
    const raw = String(value || '').trim();
    if (!raw) return '';
    const v = raw.startsWith('#') ? raw : `#${raw}`;
    const hex = v.toUpperCase();
    if (/^#[0-9A-F]{3}$/.test(hex) || /^#[0-9A-F]{6}$/.test(hex)) return hex;
    return '';
};

const UpdateProduct = () => {

    const dispatch = useDispatch();
    const { enqueueSnackbar } = useSnackbar();
    const navigate = useNavigate();
    const params = useParams();

    const { loading, product, error } = useSelector((state) => state.productDetails);
    const { loading: updateLoading, isUpdated, error: updateError } = useSelector((state) => state.product);

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
    const [description, setDescription] = useState("");
    const [price, setPrice] = useState(0);
    const [cuttedPrice, setCuttedPrice] = useState(0);
    const [category, setCategory] = useState("");
    const [subCategory, setSubCategory] = useState("");
    const [stock, setStock] = useState(0);
    const [warranty, setWarranty] = useState(0);
    const [brand, setBrand] = useState("");
    const [images, setImages] = useState([]);
    const [oldImages, setOldImages] = useState([]);
    const [imagesPreview, setImagesPreview] = useState([]);

    const [logo, setLogo] = useState("");
    const [logoPreview, setLogoPreview] = useState("");

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

    const handleSpecsChange = (e) => {
        setSpecsInput({ ...specsInput, [e.target.name]: e.target.value });
    }

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

        setLogo("");
        setLogoPreview("");

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

        setImages([]);
        setImagesPreview([]);
        setOldImages([]);

        files.forEach((file) => {
            const reader = new FileReader();

            reader.onload = () => {
                if (reader.readyState === 2) {
                    setImagesPreview((oldData) => [...oldData, reader.result]);
                    setImages((oldData) => [...oldData, reader.result]);
                }
            }
            reader.readAsDataURL(file);
        });
    }

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

        const first = colorVariants.find((v) => String(v?.name || '').trim() && normalizeHex(v?.hex) && Number(v?.price) > 0);
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

    const newProductSubmitHandler = (e) => {
        e.preventDefault();

        // required field checks
        if (highlights.length <= 0) {
            enqueueSnackbar("Add Highlights", { variant: "warning" });
            return;
        }
        if (specs.length <= 1) {
            enqueueSnackbar("Add Minimum 2 Specifications", { variant: "warning" });
            return;
        }

        if (!subCategory) {
            enqueueSnackbar("Select Sub Category", { variant: "warning" });
            return;
        }

        const formData = new FormData();

        formData.set("name", name);
        formData.set("description", description);
        formData.set("price", price);
        formData.set("cuttedPrice", cuttedPrice);
        formData.set("category", category);
        formData.set("subCategory", subCategory);
        formData.set("stock", stock);
        formData.set("warranty", warranty);
        formData.set("brandname", brand);
        formData.set("logo", logo);

        formData.set("isGiftable", isGiftable);

        formData.set("isVolumeProduct", isVolumeProduct);

        const cleanedVariants = isVolumeProduct
            ? volumeVariants
                .map((v) => ({
                    volume: String(v.volume || "").trim(),
                    price: Number(v.price),
                    cuttedPrice: Number(v.cuttedPrice) || 0,
                    stock: Number(v.stock) || 0,
                }))
                .filter((v) => v.volume && Number.isFinite(v.price) && v.price >= 0)
            : [];

        if (isVolumeProduct && cleanedVariants.length <= 0) {
            enqueueSnackbar("Add at least one volume variant", { variant: "warning" });
            return;
        }

        cleanedVariants.forEach((v) => {
            formData.append("volumeVariants", JSON.stringify(v));
        });

        formData.set("isSizeProduct", isSizeProduct);

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

        if (isSizeProduct && cleanedSizeVariants.length <= 0) {
            enqueueSnackbar("Add at least one size variant", { variant: "warning" });
            return;
        }

        cleanedSizeVariants.forEach((v) => {
            formData.append("sizeVariants", JSON.stringify(v));
        });

        formData.set('isColorProduct', isColorProduct);

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

        if (isColorProduct && cleanedColorVariants.length <= 0) {
            enqueueSnackbar('Add at least one color variant', { variant: 'warning' });
            return;
        }

        cleanedColorVariants.forEach((v) => {
            formData.append('colorVariants', JSON.stringify(v));
        });

        images.forEach((image) => {
            formData.append("images", image);
        });

        highlights.forEach((h) => {
            formData.append("highlights", h);
        });

        // Always send these fields so admins can clear tags.
        formData.set('catalogHighlightNormal', JSON.stringify(catalogNormalHighlights));
        formData.set('catalogHighlightActive', JSON.stringify(catalogActiveHighlights));

        specs.forEach((s) => {
            formData.append("specifications", JSON.stringify(s));
        });

        dispatch(updateProduct(params.id, formData));
    }

    const productId = params.id;

    useEffect(() => {

        if (product && product._id !== productId) {
            dispatch(getProductDetails(productId));
        } else {
            setName(product.name);
            setDescription(product.description);
            setPrice(product.price);
            setCuttedPrice(product.cuttedPrice);
            setCategory(product.category);
            setSubCategory(product.subCategory || "");
            setStock(product.stock);
            setWarranty(product.warranty);
            setBrand(product.brand.name);
            setHighlights(product.highlights);
            setCatalogNormalHighlights(Array.isArray(product?.catalogHighlights?.normal) ? product.catalogHighlights.normal : []);
            setCatalogActiveHighlights(Array.isArray(product?.catalogHighlights?.active) ? product.catalogHighlights.active : []);
            setSpecs(product.specifications);
            setOldImages(product.images);
            setLogoPreview(product.brand.logo.url);

            setIsVolumeProduct(Boolean(product.isVolumeProduct));
            if (Array.isArray(product.volumeVariants) && product.volumeVariants.length > 0) {
                setVolumeVariants(product.volumeVariants.map((v) => ({
                    volume: v.volume,
                    price: v.price,
                    cuttedPrice: v.cuttedPrice,
                    stock: v.stock,
                })));
            } else {
                setVolumeVariants([{ volume: "", price: 0, cuttedPrice: 0, stock: 0 }]);
            }

            setIsSizeProduct(Boolean(product.isSizeProduct));
            if (Array.isArray(product.sizeVariants) && product.sizeVariants.length > 0) {
                setSizeVariants(product.sizeVariants.map((v) => ({
                    size: v.size,
                    price: v.price,
                    cuttedPrice: v.cuttedPrice,
                    stock: v.stock,
                })));
            } else {
                setSizeVariants([{ size: "", price: 0, cuttedPrice: 0, stock: 0 }]);
            }

            setIsColorProduct(Boolean(product.isColorProduct));
            if (Array.isArray(product.colorVariants) && product.colorVariants.length > 0) {
                setColorVariants(product.colorVariants.map((v) => ({
                    name: String(v?.name || ''),
                    hex: normalizeHex(v?.hex),
                    price: Number(v?.price) || 0,
                    cuttedPrice: Number(v?.cuttedPrice) || 0,
                    stock: Number(v?.stock) || 0,
                })));
            } else {
                setColorVariants([{ name: '', hex: '', price: 0, cuttedPrice: 0, stock: 0 }]);
            }

            setIsGiftable(Boolean(product.isGiftable));
        }
        if (error) {
            enqueueSnackbar(error, { variant: "error" });
            dispatch(clearErrors());
        }
        if (updateError) {
            enqueueSnackbar(updateError, { variant: "error" });
            dispatch(clearErrors());
        }
        if (isUpdated) {
            enqueueSnackbar("Product Updated Successfully", { variant: "success" });
            dispatch({ type: UPDATE_PRODUCT_RESET });
            dispatch({ type: REMOVE_PRODUCT_DETAILS });
            navigate('/admin/products');
        }
    }, [dispatch, error, updateError, isUpdated, productId, product, navigate, enqueueSnackbar]);

    useEffect(() => {
        setSubCategory("");
    }, [category]);

    return (
        <>
            <MetaData title="Admin: Update Product | Flipkart" />

            {loading && <BackdropLoader />}
            {updateLoading && <BackdropLoader />}
            <form onSubmit={newProductSubmitHandler} encType="multipart/form-data" className="flex flex-col sm:flex-row bg-white rounded-lg shadow p-4" id="mainform">

                <div className="flex flex-col gap-3 m-2 sm:w-1/2">
                    <TextField
                        label="Name"
                        variant="outlined"
                        size="small"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                    />
                    <TextField
                        label="Description"
                        multiline
                        rows={3}
                        required
                        variant="outlined"
                        size="small"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                    />
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
                        <TextField
                            label="Category"
                            select
                            fullWidth
                            variant="outlined"
                            size="small"
                            required
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                        >
                            {categories.map((el, i) => (
                                <MenuItem value={el} key={i}>
                                    {el}
                                </MenuItem>
                            ))}
                        </TextField>
                        <TextField
                            label="Sub Category"
                            select
                            fullWidth
                            variant="outlined"
                            size="small"
                            required
                            disabled={!category}
                            value={subCategory}
                            onChange={(e) => setSubCategory(e.target.value)}
                        >
                            {(Array.from(new Set(subCategoriesByCategory?.[category] ?? []))).map((el, i) => (
                                <MenuItem value={el} key={i}>
                                    {el}
                                </MenuItem>
                            ))}
                        </TextField>
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
                            disabled={isVolumeProduct || isSizeProduct || isColorProduct}
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
                        <label className="rounded font-medium bg-primary-grey text-center cursor-pointer text-white py-2 px-2.5 shadow hover:shadow-lg hover:opacity-90">
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
                        {oldImages && oldImages.map((image, i) => (
                            <img draggable="false" src={image.url} alt="Product" key={i} className="w-full h-full object-contain" />
                        ))}
                        {imagesPreview.map((image, i) => (
                            <img draggable="false" src={image} alt="Product" key={i} className="w-full h-full object-contain" />
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
                        <input form="mainform" type="submit" className="bg-primary-orange uppercase w-1/3 p-3 text-white font-medium rounded shadow hover:shadow-lg cursor-pointer" value="Update" />
                    </div>

                </div>

            </form>
        </>
    );
};

export default UpdateProduct;