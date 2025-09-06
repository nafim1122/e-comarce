
import React, { useState, useRef, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import { Product } from '../types';

interface SearchBarProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  products: Product[];
  onProductSelect: (productId: number) => void;
}

const SearchBar: React.FC<SearchBarProps> = ({
  searchQuery,
  setSearchQuery,
  products,
  onProductSelect
}) => {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Security: Sanitize search input
  const sanitizeInput = (input: string): string => {
    return input.replace(/[<>]/g, '').trim();
  };

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (product.category && product.category.toLowerCase().includes(searchQuery.toLowerCase()))
  ).slice(0, 8); // Limit suggestions for performance

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        !inputRef.current?.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
        setSelectedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const sanitizedValue = sanitizeInput(e.target.value);
    setSearchQuery(sanitizedValue);
    setSelectedIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < filteredProducts.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && filteredProducts[selectedIndex]) {
          handleProductSelect(filteredProducts[selectedIndex]);
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        setSelectedIndex(-1);
        inputRef.current?.blur();
        break;
    }
  };

  const handleProductSelect = (product: Product) => {
    onProductSelect(product.id);
    setSearchQuery('');
    setShowSuggestions(false);
    setSelectedIndex(-1);
    inputRef.current?.blur();
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setShowSuggestions(false);
    setSelectedIndex(-1);
    inputRef.current?.focus();
  };

  const handleFocus = () => {
    setIsFocused(true);
    if (searchQuery.length > 0) {
      setShowSuggestions(true);
    }
  };

  const handleBlur = () => {
    setIsFocused(false);
    // Delay hiding suggestions to allow for clicks
    setTimeout(() => {
      if (!inputRef.current?.matches(':focus')) {
        setShowSuggestions(false);
      }
    }, 200);
  };

  return (
    <div className="relative w-full">
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
        </div>
        
        <input
          ref={inputRef}
          type="text"
          value={searchQuery}
          onChange={handleInputChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          placeholder="Search for organic products..."
          className={`
            w-full pl-9 sm:pl-10 pr-10 py-2 sm:py-2.5 
            border border-gray-300 rounded-lg 
            focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent 
            bg-white/90 backdrop-blur-sm
            text-sm sm:text-base
            transition-all duration-200
            ${isFocused ? 'shadow-lg' : 'shadow-sm'}
            ${showSuggestions ? 'rounded-b-none border-b-0' : ''}
          `}
          maxLength={100}
          autoComplete="off"
          spellCheck="false"
        />
        
        {searchQuery && (
          <button
            onClick={handleClearSearch}
            className="absolute inset-y-0 right-0 pr-3 flex items-center hover:text-gray-600 transition-colors"
            type="button"
          >
            <X className="h-4 w-4 text-gray-400" />
          </button>
        )}
      </div>

      {showSuggestions && searchQuery && filteredProducts.length > 0 && (
        <div
          ref={suggestionsRef}
          className="absolute top-full left-0 right-0 bg-white border border-gray-300 border-t-0 rounded-b-lg shadow-lg z-50 max-h-64 sm:max-h-80 overflow-y-auto"
        >
          {filteredProducts.map((product, index) => (
            <button
              key={product.id}
              onClick={() => handleProductSelect(product)}
              className={`
                w-full text-left px-3 sm:px-4 py-2 sm:py-3 
                hover:bg-green-50 transition-colors 
                border-b border-gray-100 last:border-0 
                flex items-center gap-2 sm:gap-3
                ${index === selectedIndex ? 'bg-green-50 border-green-200' : ''}
              `}
            >
              <img
                src={product.img}
                alt={product.name}
                className="w-8 h-8 sm:w-10 sm:h-10 rounded object-cover flex-shrink-0"
                loading="lazy"
              />
              <div className="flex-1 min-w-0">
                <div className="font-medium text-gray-800 truncate text-sm sm:text-base">
                  {product.name}
                </div>
                <div className="text-xs sm:text-sm text-green-600 font-semibold">
                  ৳{product.price}
                  {product.category && (
                    <span className="ml-2 text-gray-500">
                      in {product.category}
                    </span>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {showSuggestions && searchQuery && filteredProducts.length === 0 && (
        <div
          ref={suggestionsRef}
          className="absolute top-full left-0 right-0 bg-white border border-gray-300 border-t-0 rounded-b-lg shadow-lg z-50 px-4 py-3"
        >
          <div className="text-gray-500 text-sm text-center">
            No products found for "{searchQuery}"
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchBar;
