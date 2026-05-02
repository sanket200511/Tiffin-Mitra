import { useState } from "react";
import { useListMenuItems, useCreateMenuItem, useUpdateMenuItem, useDeleteMenuItem, useGetMyVendorProfile } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Plus, Edit, Trash2, MoreVertical, UtensilsCrossed, Image as ImageIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";

const formSchema = z.object({
  name: z.string().min(2, "Name is required"),
  description: z.string().optional(),
  mealType: z.enum(["breakfast", "lunch", "dinner", "snacks"]),
  dietType: z.enum(["veg", "non_veg", "jain", "diabetic_friendly"]),
  price: z.coerce.number().min(1, "Price must be greater than 0"),
  isAvailable: z.boolean().default(true),
  isFestivalSpecial: z.boolean().default(false),
});

export default function VendorMenu() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const { data: profileData } = useGetMyVendorProfile();
  const vendorId = profileData?.vendor?.id;

  const { data: menuData, isLoading } = useListMenuItems(vendorId!, {
    query: { enabled: !!vendorId, queryKey: ["/api/vendors", vendorId, "menu"] }
  });
  const menuItems = menuData?.menuItems || [];

  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
      mealType: "lunch",
      dietType: "veg",
      price: 0,
      isAvailable: true,
      isFestivalSpecial: false,
    },
  });

  const createItem = useCreateMenuItem({
    mutation: {
      onSuccess: () => {
        toast({ title: "Item created" });
        queryClient.invalidateQueries({ queryKey: ["/api/vendors", vendorId, "menu"] });
        setIsSheetOpen(false);
      }
    }
  });

  const updateItem = useUpdateMenuItem({
    mutation: {
      onSuccess: () => {
        toast({ title: "Item updated" });
        queryClient.invalidateQueries({ queryKey: ["/api/vendors", vendorId, "menu"] });
        setIsSheetOpen(false);
      }
    }
  });

  const deleteItem = useDeleteMenuItem({
    mutation: {
      onSuccess: () => {
        toast({ title: "Item deleted" });
        queryClient.invalidateQueries({ queryKey: ["/api/vendors", vendorId, "menu"] });
      }
    }
  });

  const handleOpenNew = () => {
    setEditingItem(null);
    form.reset({
      name: "", description: "", mealType: "lunch", dietType: "veg", price: 0, isAvailable: true, isFestivalSpecial: false
    });
    setIsSheetOpen(true);
  };

  const handleOpenEdit = (item: any) => {
    setEditingItem(item);
    form.reset({
      name: item.name,
      description: item.description || "",
      mealType: item.mealType,
      dietType: item.dietType,
      price: item.price,
      isAvailable: item.isAvailable,
      isFestivalSpecial: item.isFestivalSpecial || false,
    });
    setIsSheetOpen(true);
  };

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    if (editingItem) {
      updateItem.mutate({ id: editingItem.id, data: values });
    } else {
      createItem.mutate({ data: values });
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold text-foreground">Menu Manager</h1>
          <p className="text-muted-foreground mt-1">Manage the dishes available for subscription plans.</p>
        </div>
        <Button onClick={handleOpenNew}>
          <Plus className="w-4 h-4 mr-2" /> Add New Dish
        </Button>
      </div>

      {isLoading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-xl" />
          ))}
        </div>
      ) : menuItems.length === 0 ? (
        <div className="text-center py-20 bg-card rounded-xl border border-dashed shadow-sm">
          <UtensilsCrossed className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
          <h3 className="text-xl font-bold font-serif mb-2">Your menu is empty</h3>
          <p className="text-muted-foreground mb-6">Add dishes to start building your subscription plans.</p>
          <Button onClick={handleOpenNew} variant="outline">Create First Dish</Button>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {menuItems.map(item => (
            <Card key={item.id} className={`shadow-sm transition-all ${!item.isAvailable ? 'opacity-60 grayscale-[0.3]' : ''}`}>
              <CardContent className="p-5 flex gap-4 h-full relative group">
                <div className="absolute top-4 right-4">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleOpenEdit(item)}>
                        <Edit className="w-4 h-4 mr-2" /> Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive focus:bg-destructive/10 focus:text-destructive" onClick={() => deleteItem.mutate({ id: item.id })}>
                        <Trash2 className="w-4 h-4 mr-2" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div className="w-20 h-20 bg-muted rounded-md shrink-0 flex items-center justify-center overflow-hidden">
                  {item.imageUrl ? (
                    <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                  ) : (
                    <ImageIcon className="w-8 h-8 text-muted-foreground/30" />
                  )}
                </div>
                
                <div className="flex-1 pt-1">
                  <h4 className="font-semibold text-lg leading-tight mb-1 pr-6">{item.name}</h4>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    <Badge variant="secondary" className="text-[10px] py-0 px-1.5 font-medium">{item.mealType}</Badge>
                    <Badge variant="outline" className={`text-[10px] py-0 px-1.5 font-medium ${item.dietType === 'veg' ? 'border-green-500 text-green-700' : 'border-red-500 text-red-700'}`}>
                      {item.dietType.replace('_', ' ')}
                    </Badge>
                  </div>
                  <div className="font-bold text-primary mt-2">₹{item.price}</div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent className="overflow-y-auto sm:max-w-md">
          <SheetHeader>
            <SheetTitle>{editingItem ? "Edit Dish" : "Create New Dish"}</SheetTitle>
            <SheetDescription>
              Details about this dish will be visible to customers viewing your menu.
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Dish Name</FormLabel>
                      <FormControl><Input {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description (Optional)</FormLabel>
                      <FormControl><Textarea className="resize-none" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="mealType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Meal Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                          <SelectContent>
                            <SelectItem value="breakfast">Breakfast</SelectItem>
                            <SelectItem value="lunch">Lunch</SelectItem>
                            <SelectItem value="dinner">Dinner</SelectItem>
                            <SelectItem value="snacks">Snacks</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="dietType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Diet Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                          <SelectContent>
                            <SelectItem value="veg">Vegetarian</SelectItem>
                            <SelectItem value="non_veg">Non-Vegetarian</SelectItem>
                            <SelectItem value="jain">Jain</SelectItem>
                            <SelectItem value="diabetic_friendly">Diabetic Friendly</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Price per portion (₹)</FormLabel>
                      <FormControl><Input type="number" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="pt-4 space-y-4 border-t">
                  <FormField
                    control={form.control}
                    name="isAvailable"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Available</FormLabel>
                          <FormDescription>Can this be ordered currently?</FormDescription>
                        </div>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="isFestivalSpecial"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Festival Special</FormLabel>
                          <FormDescription>Highlight this dish for occasions.</FormDescription>
                        </div>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>

                <div className="pt-4 flex justify-end">
                  <Button type="submit" disabled={createItem.isPending || updateItem.isPending} className="w-full">
                    {(createItem.isPending || updateItem.isPending) ? "Saving..." : "Save Dish"}
                  </Button>
                </div>
              </form>
            </Form>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
