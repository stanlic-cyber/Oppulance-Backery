import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import heroCrops from '@/assets/hero-crops.jpg';
import heroCattle from '@/assets/hero-cattle.jpg';
import heroDelivery from '@/assets/hero-delivery.jpg';

const BANNERS = [
  {
    id: 1,
    title: 'Fresh Produce, Direct from Farmers',
    subtitle: 'Skip the middleman — buy straight from Zimbabwe\'s best farms',
    cta: 'Shop Now',
    link: '/marketplace',
    image: heroCrops,
  },
  {
    id: 2,
    title: 'Seasonal Harvest Deals',
    subtitle: 'Save up to 30% on bulk orders this season',
    cta: 'View Deals',
    link: '/marketplace?category=grains',
    image: heroCattle,
  },
  {
    id: 3,
    title: 'Reliable Delivery Nationwide',
    subtitle: 'Verified drivers across all 10 provinces',
    cta: 'Learn More',
    link: '/hire-driver',
    image: heroDelivery,
  },
];

export const HeroBanner = () => {
  const [current, setCurrent] = useState(0);

  const next = useCallback(() => setCurrent(i => (i + 1) % BANNERS.length), []);
  const prev = useCallback(() => setCurrent(i => (i - 1 + BANNERS.length) % BANNERS.length), []);

  useEffect(() => {
    const timer = setInterval(next, 5000);
    return () => clearInterval(timer);
  }, [next]);

  const banner = BANNERS[current];

  return (
    <div className="relative mx-4 mt-3 rounded-2xl overflow-hidden animate-fade-in">
      {/* Background image */}
      <div className="relative min-h-[180px] md:min-h-[280px]">
        {BANNERS.map((b, i) => (
          <img
            key={b.id}
            src={b.image}
            alt={b.title}
            loading={i === 0 ? 'eager' : 'lazy'}
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ${
              i === current ? 'opacity-100' : 'opacity-0'
            }`}
          />
        ))}
        {/* Dark overlay for text readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-black/10" />

        {/* Content */}
        <div className="relative z-10 p-5 pb-8 flex flex-col justify-end min-h-[180px] md:min-h-[280px]">
          <h2 className="text-lg md:text-2xl font-bold text-white leading-tight mb-1 drop-shadow-md">
            {banner.title}
          </h2>
          <p className="text-xs md:text-sm text-white/85 mb-3 max-w-[280px] leading-relaxed drop-shadow-sm">
            {banner.subtitle}
          </p>
          <Link
            to={banner.link}
            className="self-start px-4 py-2.5 bg-primary text-primary-foreground text-xs font-semibold rounded-xl press-effect shadow-lg hover:shadow-xl transition-shadow"
          >
            {banner.cta}
          </Link>
        </div>
      </div>

      {/* Dots */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
        {BANNERS.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              i === current ? 'w-6 bg-white' : 'w-1.5 bg-white/50'
            }`}
            aria-label={`Banner ${i + 1}`}
          />
        ))}
      </div>

      {/* Desktop arrows */}
      <button
        onClick={prev}
        className="hidden md:flex absolute left-3 top-1/2 -translate-y-1/2 z-10 h-9 w-9 items-center justify-center rounded-full bg-card/90 shadow-md hover:bg-card transition-colors"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      <button
        onClick={next}
        className="hidden md:flex absolute right-3 top-1/2 -translate-y-1/2 z-10 h-9 w-9 items-center justify-center rounded-full bg-card/90 shadow-md hover:bg-card transition-colors"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
};
