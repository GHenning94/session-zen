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

// Brand logo components with proper SVGs
const BrandLogo = ({ brand, className = "h-8" }: { brand: string; className?: string }) => {
  const brandLower = brand?.toLowerCase() || '';
  
  if (brandLower === 'visa') {
    return (
      <svg viewBox="0 0 780 500" className={className} xmlns="http://www.w3.org/2000/svg">
        <path d="M293.2 348.73l33.36-195.76h53.35l-33.38 195.76H293.2zm246.11-191.54c-10.57-3.98-27.14-8.22-47.82-8.22-52.73 0-89.87 26.6-90.14 64.66-.29 28.13 26.46 43.8 46.67 53.17 20.76 9.57 27.73 15.7 27.63 24.27-.12 13.1-16.58 19.1-31.9 19.1-21.36 0-32.67-2.96-50.25-10.29l-6.88-3.12-7.49 43.91c12.45 5.47 35.52 10.2 59.45 10.45 56.06 0 92.5-26.24 92.89-66.94.19-22.3-14.02-39.27-44.78-53.27-18.66-9.07-30.1-15.11-29.99-24.29 0-8.14 9.68-16.84 30.6-16.84 17.45-.27 30.12 3.53 39.96 7.51l4.79 2.26 7.26-42.36zm137.73-4.32h-41.23c-12.77 0-22.33 3.49-27.94 16.24l-79.25 179.62h56.03s9.16-24.14 11.24-29.44l68.32.09c1.6 6.86 6.49 29.35 6.49 29.35h49.53l-43.19-195.86zm-65.85 126.55c4.41-11.28 21.24-54.73 21.24-54.73-.31.52 4.38-11.33 7.06-18.69l3.6 16.88 12.34 56.54h-44.24zm-353.39-126.55l-52.24 133.5-5.57-27.13c-9.7-31.27-39.94-65.17-73.79-82.12l47.75 171.38h56.43l83.92-195.63h-56.5z" fill="#fff"/>
        <path d="M146.92 152.96H60.88l-.68 4.02c66.94 16.21 111.23 55.38 129.62 102.4l-18.71-89.98c-3.23-12.39-12.58-16.04-24.19-16.44z" fill="#F7B600"/>
      </svg>
    );
  }
  
  if (brandLower === 'mastercard') {
    return (
      <svg viewBox="0 0 152.407 108.668" className={className} xmlns="http://www.w3.org/2000/svg">
        <g>
          <rect fill="none" width="152.407" height="108.668"/>
          <g>
            <rect fill="#ff5f00" x="60.412" y="22.75" width="31.5" height="63.168"/>
            <path fill="#eb001b" d="M62.412,54.334c0-12.828,5.998-24.248,15.341-31.584c-6.829-5.385-15.446-8.583-24.838-8.583c-22.096,0-40.011,17.915-40.011,40.167s17.915,40.167,40.011,40.167c9.392,0,18.009-3.198,24.838-8.583C68.41,78.582,62.412,67.162,62.412,54.334z"/>
            <path fill="#f79e1b" d="M140.095,54.334c0,22.252-17.915,40.167-40.011,40.167c-9.392,0-18.009-3.198-24.838-8.583c9.343-7.336,15.341-18.755,15.341-31.584s-5.998-24.248-15.341-31.584c6.829-5.385,15.446-8.583,24.838-8.583C122.18,14.167,140.095,32.082,140.095,54.334z"/>
          </g>
        </g>
      </svg>
    );
  }
  
  if (brandLower === 'amex' || brandLower === 'american express') {
    return (
      <svg viewBox="0 0 780 500" className={className} xmlns="http://www.w3.org/2000/svg">
        <path fill="#2557D6" d="M0 0h780v500H0z"/>
        <path d="M268.4 244.3h-34.6l17.3-41.3 17.3 41.3zm301.7-52.6h-50.2v17.6h48.9v19.3h-48.9v19.6h50.2v19.8H489V171.9h81.1v19.8zm-186.9 0h-28.4l-25.5 53.1-26.8-53.1h-28.9v74.3l-35.5-74.3h-27.7L172 268h20.9l8.5-19.6h45.4l8.4 19.6h41.3v-59.5l30.7 59.5h19.3l30.6-59.9v59.9h20.1V191.7zm228.7 0h-23.8l-30.4 31.4-29.6-31.4h-76.7V268h75.6l30.4-32 29.7 32h24.6l-41.4-38.6 41.6-37.7zm-108.9 56.9h-41.6v-17h37.1v-19.3h-37.1v-15h42.6l18.7 25.5-19.7 25.8z" fill="#fff"/>
      </svg>
    );
  }
  
  if (brandLower === 'elo') {
    return (
      <svg viewBox="0 0 780 500" className={className} xmlns="http://www.w3.org/2000/svg">
        <ellipse cx="195" cy="250" rx="78" ry="78" fill="#FFCB05"/>
        <ellipse cx="390" cy="250" rx="78" ry="78" fill="#00A4E0"/>
        <ellipse cx="585" cy="250" rx="78" ry="78" fill="#EF4123"/>
        <path d="M268 250a122 122 0 0 1 244 0 122 122 0 0 1-244 0z" fill="none"/>
      </svg>
    );
  }
  
  if (brandLower === 'hipercard') {
    return (
      <svg viewBox="0 0 780 500" className={className} xmlns="http://www.w3.org/2000/svg">
        <rect fill="#822124" width="780" height="500" rx="40"/>
        <path d="M377 180h26v140h-26V180zm-80 0h26v55h58v-55h26v140h-26v-60h-58v60h-26V180zm265 0c36.5 0 66 31.3 66 70s-29.5 70-66 70h-60V180h60zm-34 115h34c22 0 40-20.2 40-45s-18-45-40-45h-34v90z" fill="#fff"/>
      </svg>
    );
  }
  
  // Generic/unknown brand
  return (
    <svg viewBox="0 0 60 40" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="10" y="15" width="40" height="10" rx="2" fill="rgba(255,255,255,0.4)"/>
    </svg>
  );
};

// Get gradient based on brand - elegant dark gradients
const getCardGradient = (brand?: string): string => {
  const brandLower = brand?.toLowerCase() || '';
  
  // Return inline styles for custom gradients
  return '';
};

// Get gradient style based on brand
const getCardGradientStyle = (brand?: string): React.CSSProperties => {
  const brandLower = brand?.toLowerCase() || '';
  
  switch (brandLower) {
    case 'visa':
      return {
        background: 'linear-gradient(135deg, #1a1f71 0%, #0d47a1 50%, #1565c0 100%)',
      };
    case 'mastercard':
      return {
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
      };
    case 'amex':
      return {
        background: 'linear-gradient(135deg, #004e92 0%, #000428 100%)',
      };
    case 'elo':
      return {
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      };
    case 'hipercard':
      return {
        background: 'linear-gradient(135deg, #6b0f1a 0%, #b91372 100%)',
      };
    default:
      return {
        background: 'linear-gradient(135deg, #232526 0%, #414345 50%, #232526 100%)',
      };
  }
};

const formatCardNumber = (cardNumber?: string, last4?: string, showRealtime?: boolean) => {
  if (showRealtime && cardNumber) {
    // Show real-time card number as user types
    const cleaned = cardNumber.replace(/\D/g, '');
    if (cleaned.length === 0) return '•••• •••• •••• ••••';
    
    // Pad with bullets to always show 16 characters
    const padded = cleaned.padEnd(16, '•');
    const groups = padded.match(/.{1,4}/g) || [];
    return groups.join(' ');
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
          className="absolute inset-0 rounded-xl p-4 overflow-hidden shadow-2xl"
          style={{ 
            backfaceVisibility: 'hidden',
            ...getCardGradientStyle(brand),
          }}
        >
          {/* Background decoration */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/10 rounded-full blur-xl" />
            <div className="absolute -right-5 top-10 w-32 h-32 bg-white/5 rounded-full blur-lg" />
            <div className="absolute -left-10 -bottom-10 w-48 h-48 bg-white/10 rounded-full blur-xl" />
            <div className="absolute right-1/4 bottom-1/4 w-24 h-24 bg-white/5 rounded-full blur-md" />
          </div>

          {/* Card content */}
          <div className="relative h-full flex flex-col justify-between">
            {/* Top row - chip and contactless */}
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-2">
                {/* Chip */}
                <div className={`${chipSizes[size]} bg-gradient-to-br from-yellow-200 via-yellow-300 to-yellow-400 rounded-md flex items-center justify-center shadow-md`}>
                  <div className="w-2/3 h-2/3 border border-yellow-600/40 rounded-sm grid grid-cols-2 grid-rows-2 gap-px">
                    <div className="bg-yellow-500/60 rounded-sm" />
                    <div className="bg-yellow-500/60 rounded-sm" />
                    <div className="bg-yellow-500/60 rounded-sm" />
                    <div className="bg-yellow-500/60 rounded-sm" />
                  </div>
                </div>
                {/* Contactless icon */}
                <Wifi className={`${size === 'sm' ? 'w-4 h-4' : 'w-5 h-5'} text-white/70 rotate-90`} />
              </div>
              {/* Brand logo */}
              <BrandLogo brand={brand} className={brandLogoSizes[size]} />
            </div>

            {/* Card number */}
            <div className={`text-white font-mono tracking-widest ${size === 'sm' ? 'text-sm' : size === 'md' ? 'text-lg' : 'text-xl'} drop-shadow-md`}>
              {formatCardNumber(cardNumber, last4, showFullNumber)}
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
          className="absolute inset-0 rounded-xl overflow-hidden shadow-2xl"
          style={{ 
            backfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
            ...getCardGradientStyle(brand),
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
