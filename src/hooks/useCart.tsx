import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { toast } from "react-toastify";
import { api } from "../services/api";
import { Product } from "../types";

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem("@RocketShoes:cart");

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const prevCartRef = useRef<Product[]>();

  useEffect(() => {
    prevCartRef.current = cart;
  });
  const prevCart = prevCartRef.current ?? cart;

  useEffect(() => {
    if (prevCart !== cart) {
      localStorage.setItem("@RocketShoes:cart", JSON.stringify(cart));
    }
  }, [cart, prevCart]);

  const addProduct = async (productId: number) => {
    try {
      const updatedCart = [...cart];
      const productExists = updatedCart.find(
        (product) => product.id === productId
      );
      const stockAmount = await api
        .get(`/stock/${productId}`)
        .then((response) => response.data.amount);
      const currentAmount = productExists ? productExists.amount : 0;
      const desiredAmount = currentAmount + 1;

      if (desiredAmount > stockAmount) {
        toast.error("Quantidade solicitada fora de estoque");
        return;
      }

      if (productExists) {
        productExists.amount = desiredAmount;
      } else {
        const selectedProduct = await api.get(`/products/${productId}`);

        const newProduct = {
          ...selectedProduct.data,
          amount: 1,
        };

        updatedCart.push(newProduct);
      }

      setCart(updatedCart);
    } catch {
      toast.error("Erro na adição do produto");
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const updatedCart = [...cart];
      const productIndex = updatedCart.findIndex(
        (product) => product.id === productId
      );

      if (productIndex >= 0) {
        updatedCart.splice(productIndex, 1);
        setCart(updatedCart);
      } else {
        throw Error();
      }
    } catch {
      toast.error("Erro na remoção do produto");
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount <= 0) {
        return;
      }

      const stockAmount = await api.get(`/stock/${productId}`);

      if (amount > stockAmount.data.amount) {
        toast.error("Quantidade solicitada fora de estoque");
      } else {
        const updatedCart = [...cart];
        const productIndex = updatedCart.findIndex(
          (product) => product.id === productId
        );

        updatedCart[productIndex].amount = amount;
        setCart(updatedCart);
      }
    } catch {
      toast.error("Erro na alteração de quantidade do produto");
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
