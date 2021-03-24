import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

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
    const storagedCart = localStorage.getItem('@RocketShoes:cart');

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const productAlreadyInCart = cart.find(
        (product) => product.id === productId,
      );

      const response = await api.get<Stock>(`stock/${productId}`);

      const { amount } = response.data;

      if (productAlreadyInCart) {
        const { amount: productAmount } = productAlreadyInCart;

        if (amount <= productAmount) {
          toast.error('Quantidade solicitada fora de estoque');

          return;
        }

        const updatedAmountInCartProduct = cart.map((product) => {
          return product.id === productId
            ? { ...product, amount: productAmount + 1 }
            : product;
        });

        setCart(updatedAmountInCartProduct);

        localStorage.setItem(
          '@RocketShoes:cart',
          JSON.stringify(updatedAmountInCartProduct),
        );

        return;
      }

      if (amount < 1) {
        toast.error('Quantidade solicitada fora de estoque');

        return;
      }
      const { data: productData } = await api.get<Product>(
        `products/${productId}`,
      );

      const cartWithNewProduct = [...cart, { ...productData, amount: 1 }];

      setCart(cartWithNewProduct);

      localStorage.setItem(
        '@RocketShoes:cart',
        JSON.stringify(cartWithNewProduct),
      );
    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const productAlreadyInCart = cart.find(
        (product) => product.id === productId,
      );

      if (!productAlreadyInCart) {
        throw Error();
      }

      const filteredCartList = cart.filter(
        (product) => product.id !== productId,
      );

      setCart(filteredCartList);

      localStorage.setItem(
        '@RocketShoes:cart',
        JSON.stringify(filteredCartList),
      );
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount < 1) {
        return;
      }

      const { data: stock } = await api.get<Stock>(`/stock/${productId}`);

      const productInStock = stock.amount >= amount;
      if (!productInStock) {
        toast.error('Quantidade solicitada fora de estoque');

        return;
      }

      const productAlReadyInCart = cart.find(
        (product) => product.id === productId,
      );

      if (!productAlReadyInCart) {
        throw Error();
      }

      const updatedProductAmountInCart = cart.map((product) => {
        return product.id === productId ? { ...product, amount } : product;
      });

      setCart(updatedProductAmountInCart);

      localStorage.setItem(
        '@RocketShoes:cart',
        JSON.stringify(updatedProductAmountInCart),
      );
    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
