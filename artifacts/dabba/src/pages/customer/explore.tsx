import { useState, useEffect, useMemo } from "react";
import { Link } from "wouter";
import { useListVendors } from "@workspace/api-client-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, MapPin, ChefHat, Star, X, Sparkles, SlidersHorizontal, ArrowUpDown } from "lucide-react";

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

type SortOption = "recommended" | "rating" | "name_asc" | "newest";

const SORT_LABELS: Record<SortOption, string> = {
  recommended: "Recommended",
  rating:      "Top Rated",
  name_asc:    "Name A–Z",
  newest:      "Newest First",
};

export default function Explore() {
  const [search, setSearch]       = useState("");
  const [city, setCity]           = useState("all");
  const [cuisine, setCuisine]     = useState("all");
  const [sort, setSort]           = useState<SortOption>("recommended");
  const [featuredOnly, setFeaturedOnly] = useState(false);
  const [topRatedOnly, setTopRatedOnly] = useState(false);

  const debouncedSearch = useDebounce(search, 300);

  const { data: vendorsData, isLoading } = useListVendors({
    search: debouncedSearch || undefined,
    city: city !== "all" ? city : undefined,
    cuisine: cuisine !== "all" ? cuisine : undefined,
  });

  const rawVendors = vendorsData?.vendors || [];

  // ─── Client-side filter + sort ────────────────────────────────────────────
  const vendors = useMemo(() => {
    let arr = [...rawVendors];
    if (featuredOnly) arr = arr.filter(v => v.featured);
    if (topRatedOnly) arr = arr.filter(v => parseFloat(String(v.rating ?? 0)) >= 4);
    switch (sort) {
      case "rating":
        return arr.sort((a, b) =>
          (parseFloat(String(b.rating ?? 0)) - parseFloat(String(a.rating ?? 0)))
        );
      case "name_asc":
        return arr.sort((a, b) => a.name.localeCompare(b.name));
      case "newest":
        return arr.sort((a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      case "recommended":
      default:
        return arr.sort((a, b) => {
          if (a.featured && !b.featured) return -1;
          if (!a.featured && b.featured) return 1;
          return parseFloat(String(b.rating ?? 0)) - parseFloat(String(a.rating ?? 0));
        });
    }
  }, [rawVendors, sort, featuredOnly, topRatedOnly]);

  const hasActiveFilters = search || city !== "all" || cuisine !== "all" || featuredOnly || topRatedOnly;
  const clearAll = () => { setSearch(""); setCity("all"); setCuisine("all"); setFeaturedOnly(false); setTopRatedOnly(false); };

  return (
    <div className="container py-8 min-h-screen">
      <div className="space-y-2 mb-8">
        <h1 className="text-4xl font-serif font-bold tracking-tight">Explore Tiffins</h1>
        <p className="text-muted-foreground text-lg">Find the perfect ghar ka khana near you.</p>
      </div>

      {/* Filter / search panel */}
      <div className="bg-card border rounded-xl p-4 mb-4 shadow-sm">
        <div className="flex flex-col gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by kitchen name..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap gap-3">
            {/* City */}
            <div className="flex-1 min-w-[130px]">
              <Select value={city} onValueChange={setCity}>
                <SelectTrigger>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-muted-foreground shrink-0" />
                    <SelectValue placeholder="City" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Cities</SelectItem>
                  {["Mumbai","Delhi","Bangalore","Pune","Ahmedabad","Nagpur","Hyderabad","Chennai","Kolkata","Surat"].map(c => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {/* Cuisine */}
            <div className="flex-1 min-w-[130px]">
              <Select value={cuisine} onValueChange={setCuisine}>
                <SelectTrigger>
                  <div className="flex items-center gap-2">
                    <ChefHat className="w-4 h-4 text-muted-foreground shrink-0" />
                    <SelectValue placeholder="Cuisine" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Cuisines</SelectItem>
                  {["North Indian","South Indian","Gujarati","Maharashtrian","Bengali","Rajasthani","Punjabi","Jain","Continental"].map(c => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {/* Sort */}
            <div className="flex-1 min-w-[150px]">
              <Select value={sort} onValueChange={(v) => setSort(v as SortOption)}>
                <SelectTrigger>
                  <div className="flex items-center gap-2">
                    <ArrowUpDown className="w-4 h-4 text-muted-foreground shrink-0" />
                    <SelectValue />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  {(Object.entries(SORT_LABELS) as [SortOption, string][]).map(([val, label]) => (
                    <SelectItem key={val} value={val}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {/* Quick toggles */}
            <Button
              variant={featuredOnly ? "default" : "outline"}
              size="sm"
              className="shrink-0 gap-1.5 h-10"
              onClick={() => setFeaturedOnly(v => !v)}
            >
              <Sparkles className="w-3.5 h-3.5" />
              Featured
            </Button>
            <Button
              variant={topRatedOnly ? "default" : "outline"}
              size="sm"
              className="shrink-0 gap-1.5 h-10"
              onClick={() => setTopRatedOnly(v => !v)}
            >
              <Star className="w-3.5 h-3.5" />
              4+ Stars
            </Button>
            {hasActiveFilters && (
              <Button variant="ghost" size="icon" className="shrink-0 text-muted-foreground hover:text-foreground" onClick={clearAll} title="Clear all filters">
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Active filter chips */}
      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-2 mb-5">
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <SlidersHorizontal className="w-3 h-3" /> Active filters:
          </span>
          {search && (
            <Badge variant="secondary" className="gap-1.5 pr-1">
              "{search}"
              <button onClick={() => setSearch("")} className="hover:bg-muted rounded ml-0.5 p-0.5">
                <X className="w-3 h-3" />
              </button>
            </Badge>
          )}
          {city !== "all" && (
            <Badge variant="secondary" className="gap-1.5 pr-1">
              <MapPin className="w-3 h-3" /> {city}
              <button onClick={() => setCity("all")} className="hover:bg-muted rounded ml-0.5 p-0.5">
                <X className="w-3 h-3" />
              </button>
            </Badge>
          )}
          {cuisine !== "all" && (
            <Badge variant="secondary" className="gap-1.5 pr-1">
              <ChefHat className="w-3 h-3" /> {cuisine}
              <button onClick={() => setCuisine("all")} className="hover:bg-muted rounded ml-0.5 p-0.5">
                <X className="w-3 h-3" />
              </button>
            </Badge>
          )}
          {featuredOnly && (
            <Badge variant="secondary" className="gap-1.5 pr-1">
              <Sparkles className="w-3 h-3" /> Featured Only
              <button onClick={() => setFeaturedOnly(false)} className="hover:bg-muted rounded ml-0.5 p-0.5">
                <X className="w-3 h-3" />
              </button>
            </Badge>
          )}
          {topRatedOnly && (
            <Badge variant="secondary" className="gap-1.5 pr-1">
              <Star className="w-3 h-3" /> 4+ Stars
              <button onClick={() => setTopRatedOnly(false)} className="hover:bg-muted rounded ml-0.5 p-0.5">
                <X className="w-3 h-3" />
              </button>
            </Badge>
          )}
        </div>
      )}

      {/* Result count */}
      {!isLoading && rawVendors.length > 0 && (
        <p className="text-sm text-muted-foreground mb-5">
          {vendors.length === rawVendors.length
            ? `${vendors.length} kitchen${vendors.length !== 1 ? "s" : ""} found`
            : `${vendors.length} of ${rawVendors.length} kitchens`}
          {sort !== "recommended" && (
            <span className="ml-1">· sorted by <strong>{SORT_LABELS[sort]}</strong></span>
          )}
        </p>
      )}

      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="space-y-3">
              <Skeleton className="w-full h-48 rounded-xl" />
              <Skeleton className="w-2/3 h-6" />
              <Skeleton className="w-1/2 h-4" />
              <Skeleton className="w-full h-10 mt-2" />
            </div>
          ))}
        </div>
      ) : vendors.length === 0 ? (
        <div className="text-center py-20 bg-muted/30 rounded-2xl border border-dashed">
          <ChefHat className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
          <h3 className="text-xl font-bold font-serif mb-2">No kitchens found</h3>
          <p className="text-muted-foreground">Try adjusting your filters or search terms.</p>
          <Button variant="outline" className="mt-4" onClick={clearAll}>
            Clear Filters
          </Button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {vendors.map((vendor) => (
            <Link key={vendor.id} href={`/vendors/${vendor.id}`} className="group block h-full">
              <div className="bg-card h-full flex flex-col rounded-xl overflow-hidden border shadow-sm transition-all hover:shadow-md hover:border-primary/30">
                <div className="h-48 bg-muted relative shrink-0">
                  {vendor.coverImageUrl ? (
                    <img src={vendor.coverImageUrl} alt={vendor.name} className="w-full h-full object-cover" loading="lazy" decoding="async" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-primary/5 text-primary/20">
                      <ChefHat className="w-12 h-12" />
                    </div>
                  )}
                  {vendor.featured && (
                    <div className="absolute top-3 left-3 bg-primary text-primary-foreground px-2 py-0.5 rounded-md text-xs font-semibold flex items-center gap-1 shadow-sm">
                      <Sparkles className="w-3 h-3" /> Featured
                    </div>
                  )}
                  {vendor.rating && (
                    <div className="absolute top-3 right-3 bg-background/90 backdrop-blur px-2 py-1 rounded-md text-sm font-medium flex items-center gap-1 shadow-sm">
                      <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                      {parseFloat(String(vendor.rating)).toFixed(1)}
                      <span className="text-muted-foreground text-xs ml-0.5">({vendor.reviewCount || 0})</span>
                    </div>
                  )}
                  {vendor.logoUrl && (
                    <div className="absolute -bottom-6 left-4 w-12 h-12 rounded-full border-2 border-background bg-card overflow-hidden shadow-sm">
                      <img src={vendor.logoUrl} alt="Logo" className="w-full h-full object-cover" loading="lazy" decoding="async" />
                    </div>
                  )}
                </div>
                <div className="p-5 pt-8 flex-1 flex flex-col">
                  <h3 className="font-bold text-lg mb-1 group-hover:text-primary transition-colors line-clamp-1">{vendor.name}</h3>
                  <div className="flex items-center text-sm text-muted-foreground mb-3 gap-2 flex-wrap">
                    <span className="flex items-center gap-1"><ChefHat className="w-3.5 h-3.5" /> {vendor.cuisineType}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {vendor.city}</span>
                  </div>
                  {vendor.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-4 flex-1">
                      {vendor.description}
                    </p>
                  )}
                  <div className="mt-auto pt-4 border-t w-full">
                    <Button className="w-full" variant="secondary">View Plans & Menu</Button>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
