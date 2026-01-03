import React from 'react';
import { Wifi } from 'lucide-react';

interface CreditCardVisualProps {
  brand?: string;
  last4?: string;
  expMonth?: number | string;
  expYear?: number | string;
  cardHolder?: string;
  size?: 'sm' | 'md' | 'lg';
  showFullNumber?: boolean;
  cardNumber?: string;
  isFlipped?: boolean;
  cvv?: string;
}

// Brand logo components
const BrandLogo = ({ brand, className = "h-8" }: { brand: string; className?: string }) => {
  const brandLower = brand?.toLowerCase() || '';
  
  if (brandLower === 'visa') {
    return (
      <svg viewBox="0 0 100 32" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M45.5 21.5L48 10.5H52L49.5 21.5H45.5Z" fill="white"/>
        <path d="M64 10.5L60.5 18.5L59.8 14.5L58.5 11.5C58.5 11.5 58.2 10.5 56.5 10.5H49.5L49.5 10.8C49.5 10.8 51.5 11.3 54 13L58 21.5H62L68 10.5H64Z" fill="white"/>
        <path d="M40 10.5L36 18.5L35.5 16L34 11.5C34 11.5 33.7 10.5 32 10.5H24L24 10.8C24 10.8 27 11.5 30 13.5L34 21.5H38L44 10.5H40Z" fill="white"/>
        <path d="M72 18.5C72 18.5 71.3 17.8 70 17.8C68 17.8 66.5 19 66.5 20.5C66.5 22.5 69 22.5 69 23.8C69 24.5 68.3 25 67 25C65.5 25 64.8 24.3 64.8 24.3L64 26.3C64 26.3 65.3 27 67 27C69.8 27 72 25 72 23C72 21 69.5 21 69.5 19.8C69.5 19 70.2 18.5 71.5 18.5C72.2 18.5 73 18.8 73 18.8L72 18.5Z" fill="white"/>
        <text x="50" y="20" textAnchor="middle" fill="white" fontSize="14" fontWeight="bold" fontStyle="italic">VISA</text>
      </svg>
    );
  }
  
  if (brandLower === 'mastercard') {
    return (
      <svg viewBox="0 0 60 40" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="22" cy="20" r="14" fill="#EB001B"/>
        <circle cx="38" cy="20" r="14" fill="#F79E1B"/>
        <path d="M30 9C33 11.5 35 15.5 35 20C35 24.5 33 28.5 30 31C27 28.5 25 24.5 25 20C25 15.5 27 11.5 30 9Z" fill="#FF5F00"/>
      </svg>
    );
  }
  
  if (brandLower === 'amex' || brandLower === 'american express') {
    return (
      <svg viewBox="0 0 60 40" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
        <text x="30" y="24" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">AMEX</text>
      </svg>
    );
  }
  
  if (brandLower === 'elo') {
    return (
      <svg viewBox="0 0 60 40" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="18" cy="20" r="8" fill="#FFCB05"/>
        <circle cx="30" cy="20" r="8" fill="#00A4E0"/>
        <circle cx="42" cy="20" r="8" fill="#EF4123"/>
      </svg>
    );
  }
  
  if (brandLower === 'hipercard') {
    return (
      <svg viewBox="0 0 60 40" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
        <text x="30" y="24" textAnchor="middle" fill="white" fontSize="8" fontWeight="bold">HIPERCARD</text>
      </svg>
    );
  }
  
  // Generic/unknown brand
  return (
    <svg viewBox="0 0 60 40" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="10" y="15" width="40" height="10" rx="2" fill="rgba(255,255,255,0.3)"/>
    </svg>
  );
};

// Get gradient based on brand
const getCardGradient = (brand?: string) => {
  const brandLower = brand?.toLowerCase() || '';
  
  switch (brandLower) {
    case 'visa':
      return 'bg-gradient-to-br from-blue-600 via-blue-700 to-blue-900';
    case 'mastercard':
      return 'bg-gradient-to-br from-gray-800 via-gray-900 to-black';
    case 'amex':
      return 'bg-gradient-to-br from-sky-500 via-sky-600 to-sky-800';
    case 'elo':
      return 'bg-gradient-to-br from-yellow-500 via-orange-500 to-red-500';
    case 'hipercard':
      return 'bg-gradient-to-br from-red-700 via-red-800 to-red-900';
    default:
      return 'bg-gradient-to-br from-slate-700 via-slate-800 to-slate-900';
  }
};

const formatCardNumber = (cardNumber?: string, last4?: string) => {
  if (cardNumber) {
    // Format with spaces every 4 digits
    const cleaned = cardNumber.replace(/\D/g, '');
    const groups = cleaned.match(/.{1,4}/g) || [];
    return groups.join(' ').padEnd(19, '•');
  }
  if (last4) {
    return `•••• •••• •••• ${last4}`;
  }
  return '•••• •••• •••• ••••';
};

const formatExpiry = (month?: number | string, year?: number | string) => {
  if (!month && !year) return 'MM/AA';
  const m = month ? String(month).padStart(2, '0') : 'MM';
  const y = year ? String(year).slice(-2) : 'AA';
  return `${m}/${y}`;
};

export const CreditCardVisual: React.FC<CreditCardVisualProps> = ({
  brand = '',
  last4 = '',
  expMonth,
  expYear,
  cardHolder = '',
  size = 'md',
  showFullNumber = false,
  cardNumber,
  isFlipped = false,
  cvv = '',
}) => {
  const sizeClasses = {
    sm: 'w-48 h-28 text-xs',
    md: 'w-72 h-44 text-sm',
    lg: 'w-96 h-56 text-base',
  };

  const chipSizes = {
    sm: 'w-6 h-4',
    md: 'w-10 h-7',
    lg: 'w-12 h-8',
  };

  const brandLogoSizes = {
    sm: 'h-5',
    md: 'h-8',
    lg: 'h-10',
  };

  const magneticStripeSizes = {
    sm: 'h-6 mt-4',
    md: 'h-10 mt-6',
    lg: 'h-12 mt-8',
  };

  const cvvBoxSizes = {
    sm: 'h-5 w-10 text-[10px]',
    md: 'h-7 w-14 text-sm',
    lg: 'h-8 w-16 text-base',
  };

  return (
    <div 
      className={`${sizeClasses[size]} perspective-1000`}
      style={{ perspective: '1000px' }}
    >
      <div 
        className="relative w-full h-full transition-transform duration-500"
        style={{ 
          transformStyle: 'preserve-3d',
          transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
        }}
      >
        {/* Front of card */}
        <div 
          className={`
            absolute inset-0
            ${getCardGradient(brand)}
            rounded-xl p-4 overflow-hidden shadow-xl
          `}
          style={{ backfaceVisibility: 'hidden' }}
        >
          {/* Background decoration */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/5 rounded-full" />
            <div className="absolute -right-5 top-10 w-32 h-32 bg-white/5 rounded-full" />
            <div className="absolute -left-10 -bottom-10 w-48 h-48 bg-white/5 rounded-full" />
          </div>

          {/* Card content */}
          <div className="relative h-full flex flex-col justify-between">
            {/* Top row - chip and contactless */}
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-2">
                {/* Chip */}
                <div className={`${chipSizes[size]} bg-gradient-to-br from-yellow-300 via-yellow-400 to-yellow-500 rounded-md flex items-center justify-center`}>
                  <div className="w-2/3 h-2/3 border border-yellow-600/30 rounded-sm grid grid-cols-2 grid-rows-2 gap-px">
                    <div className="bg-yellow-400/50 rounded-sm" />
                    <div className="bg-yellow-400/50 rounded-sm" />
                    <div className="bg-yellow-400/50 rounded-sm" />
                    <div className="bg-yellow-400/50 rounded-sm" />
                  </div>
                </div>
                {/* Contactless icon */}
                <Wifi className={`${size === 'sm' ? 'w-4 h-4' : 'w-5 h-5'} text-white/60 rotate-90`} />
              </div>
              {/* Brand logo */}
              <BrandLogo brand={brand} className={brandLogoSizes[size]} />
            </div>

            {/* Card number */}
            <div className={`text-white font-mono tracking-wider ${size === 'sm' ? 'text-sm' : size === 'md' ? 'text-lg' : 'text-xl'}`}>
              {formatCardNumber(showFullNumber ? cardNumber : undefined, last4)}
            </div>

            {/* Bottom row - holder and expiry */}
            <div className="flex justify-between items-end">
              <div>
                <div className="text-white/60 text-[10px] uppercase tracking-wide mb-0.5">
                  TITULAR DO CARTÃO
                </div>
                <div className="text-white font-medium uppercase tracking-wide truncate max-w-[140px]">
                  {cardHolder || 'NOME DO TITULAR'}
                </div>
              </div>
              <div className="text-right">
                <div className="text-white/60 text-[10px] uppercase tracking-wide mb-0.5">
                  VALIDADE
                </div>
                <div className="text-white font-medium">
                  {formatExpiry(expMonth, expYear)}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Back of card */}
        <div 
          className={`
            absolute inset-0
            ${getCardGradient(brand)}
            rounded-xl overflow-hidden shadow-xl
          `}
          style={{ 
            backfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
          }}
        >
          {/* Background decoration */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/5 rounded-full" />
            <div className="absolute -left-10 -bottom-10 w-48 h-48 bg-white/5 rounded-full" />
          </div>

          {/* Magnetic stripe */}
          <div className={`w-full bg-gray-900/90 ${magneticStripeSizes[size]}`} />

          {/* CVV section */}
          <div className="relative px-4 mt-4">
            <div className="flex items-center gap-2">
              {/* Signature strip */}
              <div className="flex-1 bg-gray-100/90 rounded h-8 flex items-center px-2">
                <div className="w-full h-4 bg-[repeating-linear-gradient(90deg,transparent,transparent_2px,#ddd_2px,#ddd_4px)]" />
              </div>
              {/* CVV box */}
              <div className={`${cvvBoxSizes[size]} bg-white rounded flex items-center justify-center font-mono text-gray-800 font-bold`}>
                {cvv || '•••'}
              </div>
            </div>
            <div className="text-white/60 text-[10px] uppercase tracking-wide mt-2 text-right">
              CVV
            </div>
          </div>

          {/* Brand logo on back */}
          <div className="absolute bottom-4 right-4">
            <BrandLogo brand={brand} className={brandLogoSizes[size]} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreditCardVisual;
