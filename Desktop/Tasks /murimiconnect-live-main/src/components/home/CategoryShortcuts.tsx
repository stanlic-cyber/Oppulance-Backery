import { Link } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { PRODUCE_CATEGORIES } from '@/lib/constants';

export const CategoryShortcuts = () => {
  const { t } = useLanguage();

  return (
    <section className="px-4 mt-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-semibold text-foreground">Categories</h2>
        <Link to="/marketplace" className="text-xs font-medium text-primary press-effect">
          See All
        </Link>
      </div>
      <div className="flex gap-4 overflow-x-auto pb-1 scrollbar-hide snap-x snap-mandatory -mx-4 px-4">
        {PRODUCE_CATEGORIES.map((cat, i) => (
          <Link
            key={cat.id}
            to={`/marketplace?category=${cat.id}`}
            className="flex flex-col items-center gap-2 flex-shrink-0 snap-start press-effect animate-slide-up opacity-0"
            style={{ animationDelay: `${i * 40}ms`, animationFillMode: 'forwards' }}
          >
            <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center text-2xl border border-border hover:border-primary/20 hover:bg-primary/5 transition-all duration-200">
              {cat.icon}
            </div>
            <span className="text-[11px] font-medium text-muted-foreground text-center w-14 truncate">
              {t(`category.${cat.id}`)}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
};
