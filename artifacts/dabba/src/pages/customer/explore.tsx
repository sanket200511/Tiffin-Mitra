import { useState } from "react";
import { Link } from "wouter";
import { useListVendors } from "@workspace/api-client-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, MapPin, ChefHat, Star, Filter, Sparkles } from "lucide-react";

export default function Explore() {
  const [search, setSearch] = useState("");
  const [city, setCity] = useState("all");
  const [cuisine, setCuisine] = useState("all");

  const { data: vendorsData, isLoading } = useListVendors({ 
    search: search || undefined,
    city: city !== "all" ? city : undefined,
    cuisine: cuisine !== "all" ? cuisine : undefined
  });

  const vendors = vendorsData?.vendors || [];

  return (
    <div className="container py-8 min-h-screen">
      <div className="space-y-2 mb-8">
        <h1 className="text-4xl font-serif font-bold tracking-tight">Explore Tiffins</h1>
        <p className="text-muted-foreground text-lg">Find the perfect ghar ka khana near you.</p>
      </div>

      <div className="bg-card border rounded-xl p-4 mb-8 shadow-sm">
        <div className="flex flex-col gap-3">
          {/* Search row — full width */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by kitchen name..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          {/* Filters row — 2-up on mobile, inline on larger screens */}
          <div className="flex flex-wrap gap-3">
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
                  <SelectItem value="Mumbai">Mumbai</SelectItem>
                  <SelectItem value="Delhi">Delhi</SelectItem>
                  <SelectItem value="Bangalore">Bangalore</SelectItem>
                  <SelectItem value="Pune">Pune</SelectItem>
                  <SelectItem value="Ahmedabad">Ahmedabad</SelectItem>
                </SelectContent>
              </Select>
            </div>
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
                  <SelectItem value="North Indian">North Indian</SelectItem>
                  <SelectItem value="South Indian">South Indian</SelectItem>
                  <SelectItem value="Gujarati">Gujarati</SelectItem>
                  <SelectItem value="Maharashtrian">Maharashtrian</SelectItem>
                  <SelectItem value="Bengali">Bengali</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              variant="secondary"
              size="icon"
              className="shrink-0"
              onClick={() => { setSearch(""); setCity("all"); setCuisine("all"); }}
              title="Clear filters"
            >
              <Filter className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

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
          <Button variant="outline" className="mt-4" onClick={() => { setSearch(""); setCity("all"); setCuisine("all"); }}>
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
                    <img src={vendor.coverImageUrl} alt={vendor.name} className="w-full h-full object-cover" />
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
                      {vendor.rating}
                      <span className="text-muted-foreground text-xs ml-0.5">({vendor.reviewCount || 0})</span>
                    </div>
                  )}
                  {vendor.logoUrl && (
                    <div className="absolute -bottom-6 left-4 w-12 h-12 rounded-full border-2 border-background bg-card overflow-hidden shadow-sm">
                      <img src={vendor.logoUrl} alt="Logo" className="w-full h-full object-cover" />
                    </div>
                  )}
                </div>
                <div className="p-5 pt-8 flex-1 flex flex-col">
                  <h3 className="font-bold text-lg mb-1 group-hover:text-primary transition-colors line-clamp-1">{vendor.name}</h3>
                  <div className="flex items-center text-sm text-muted-foreground mb-3 gap-2">
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
