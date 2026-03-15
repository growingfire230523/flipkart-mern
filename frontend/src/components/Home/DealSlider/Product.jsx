import { Link } from 'react-router-dom';

const Product = ({ image, name, offer, tag }) => {
    return (
        <Link
            to="/products"
            className="group flex flex-col items-center gap-1.5 p-6 cursor-pointer transition-transform duration-300 ease-out hover:-translate-y-1"
        >
            <div className="w-40 h-40 sm:w-44 sm:h-44 overflow-hidden">
                <img
                    draggable="false"
                    className="w-full h-full object-contain transition-transform duration-300 ease-out group-hover:scale-[1.06]"
                    src={image}
                    alt={name}
                />
            </div>
            <h2 className="font-medium text-sm mt-2">{name}</h2>
            <span className="text-primary-green text-sm">{offer}</span>
            <span className="text-gray-500 text-sm">{tag}</span>
        </Link>
    );
};

export default Product;
