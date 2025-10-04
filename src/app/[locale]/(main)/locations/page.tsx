"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/hooks/use-auth"
import { useLocation as useLocationContext } from "@/contexts/LocationContext"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { toast } from "sonner"
import { Loader2, Store, Warehouse, Plus, MapPin, AlertCircle } from "lucide-react"
import { 
  createLocation, 
  getRemainingSlots,
  type CreateLocationInput
} from "@/lib/services/location-service"
import { config } from "@/lib/config"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

export default function LocationsPage() {
  const { profile, loading: authLoading } = useAuth()
  const { locations, isLoading: locationLoading, refresh: refreshLocations } = useLocationContext()
  const [remainingSlots, setRemainingSlots] = useState({ stores: 0, warehouses: 0 })
  const [loadingSlots, setLoadingSlots] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const [newLocationForm, setNewLocationForm] = useState<CreateLocationInput>({
    name: "",
    location_type: "store",
    address: "",
  })

  useEffect(() => {
    loadSlots()
  }, [locations])

  const loadSlots = async () => {
    try {
      setLoadingSlots(true)
      const slots = await getRemainingSlots()
      setRemainingSlots(slots)
    } catch (error: any) {
      console.error("Error loading slots:", error)
      toast.error(error.message || "Failed to load available slots")
    } finally {
      setLoadingSlots(false)
    }
  }

  const handleCreateLocation = async () => {
    if (!newLocationForm.name.trim()) {
      toast.error("Location name is required")
      return
    }

    try {
      setSubmitting(true)
      await createLocation(newLocationForm)
      toast.success("Location created successfully")
      setDialogOpen(false)
      setNewLocationForm({
        name: "",
        location_type: "store",
        address: "",
      })
      await refreshLocations()
      await loadSlots()
    } catch (error: any) {
      console.error("Error creating location:", error)
      toast.error(error.message || "Failed to create location")
    } finally {
      setSubmitting(false)
    }
  }

  const storeCount = locations.filter(l => l.location_type === "store").length
  const warehouseCount = locations.filter(l => l.location_type === "warehouse").length

  const canCreateStore = remainingSlots.stores > 0
  const canCreateWarehouse = remainingSlots.warehouses > 0
  const canCreateAny = canCreateStore || canCreateWarehouse

  if (authLoading || locationLoading || loadingSlots) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  // Only allow admins to access this page
  if (profile?.role !== "admin") {
    return (
      <div className="container max-w-4xl py-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Access Denied</AlertTitle>
          <AlertDescription>
            Only administrators can manage locations
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Premium Sticky Header */}
      <header className="sticky top-0 z-10 bg-white border-b-4 border-teal-200 shadow-lg">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gradient-to-br from-teal-600 to-emerald-600 rounded-xl shadow-lg">
                <Store className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Locations</h1>
                <p className="text-sm text-gray-600 flex items-center gap-2">
                  <MapPin className="h-3.5 w-3.5" />
                  Manage your stores and warehouses
                </p>
              </div>
            </div>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button 
                  disabled={!canCreateAny} 
                  className="bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white shadow-lg hover:shadow-xl transition-all h-11"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Location
                </Button>
              </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader className="bg-gradient-to-r from-teal-600 via-emerald-600 to-green-600 text-white p-6 -m-6 mb-4 rounded-t-lg">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                  <Plus className="h-5 w-5" />
                </div>
                <div>
                  <DialogTitle className="text-white text-xl">Create New Location</DialogTitle>
                  <DialogDescription className="text-white/90">
                    Add a new store or warehouse to your business
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="type" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <Store className="h-4 w-4 text-teal-600" />
                  Location Type *
                </Label>
                <Select
                  value={newLocationForm.location_type}
                  onValueChange={(value: "store" | "warehouse") =>
                    setNewLocationForm({ ...newLocationForm, location_type: value })
                  }
                >
                  <SelectTrigger className="border-2 border-teal-200 h-11 focus:border-teal-500 focus:ring-teal-500">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="store" disabled={!canCreateStore}>
                      <div className="flex items-center gap-2">
                        <Store className="h-4 w-4 text-teal-600" />
                        Store {!canCreateStore && "(Limit reached)"}
                      </div>
                    </SelectItem>
                    <SelectItem value="warehouse" disabled={!canCreateWarehouse}>
                      <div className="flex items-center gap-2">
                        <Warehouse className="h-4 w-4 text-emerald-600" />
                        Warehouse {!canCreateWarehouse && "(Limit reached)"}
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-semibold text-gray-700">
                  Location Name *
                </Label>
                <Input
                  id="name"
                  placeholder="Main Store"
                  value={newLocationForm.name}
                  onChange={(e) =>
                    setNewLocationForm({ ...newLocationForm, name: e.target.value })
                  }
                  className="border-2 border-teal-200 h-11 focus:border-teal-500 focus:ring-teal-500"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-emerald-600" />
                  Address (Optional)
                </Label>
                <Input
                  id="address"
                  placeholder="123 Main St, City, State"
                  value={newLocationForm.address}
                  onChange={(e) =>
                    setNewLocationForm({ ...newLocationForm, address: e.target.value })
                  }
                  className="border-2 border-teal-200 h-11 focus:border-teal-500 focus:ring-teal-500"
                />
              </div>
            </div>
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => setDialogOpen(false)}
                className="border-2 border-slate-200 hover:bg-slate-50"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleCreateLocation} 
                disabled={submitting}
                className="bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Location
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto ">
        <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">
          
          {/* Location Limits KPI Cards */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="border-2 border-teal-200 shadow-lg hover:shadow-xl transition-shadow">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-600 mb-1">Stores</p>
                    <div className="text-3xl font-bold bg-gradient-to-r from-teal-600 to-teal-500 bg-clip-text text-transparent">
                      {storeCount} / {config.maxStores}
                    </div>
                    <Progress 
                      value={(storeCount / config.maxStores) * 100} 
                      className="mt-3 h-2" 
                    />
                    <p className="text-xs text-gray-500 mt-2">
                      {remainingSlots.stores} {remainingSlots.stores === 1 ? 'slot' : 'slots'} remaining
                    </p>
                  </div>
                  <div className="w-16 h-16 bg-gradient-to-br from-teal-500 to-teal-600 rounded-xl flex items-center justify-center shadow-lg ml-4">
                    <Store className="h-8 w-8 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-2 border-emerald-200 shadow-lg hover:shadow-xl transition-shadow">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-600 mb-1">Warehouses</p>
                    <div className="text-3xl font-bold bg-gradient-to-r from-emerald-600 to-emerald-500 bg-clip-text text-transparent">
                      {warehouseCount} / {config.maxWarehouses}
                    </div>
                    <Progress 
                      value={(warehouseCount / config.maxWarehouses) * 100} 
                      className="mt-3 h-2" 
                    />
                    <p className="text-xs text-gray-500 mt-2">
                      {remainingSlots.warehouses} {remainingSlots.warehouses === 1 ? 'slot' : 'slots'} remaining
                    </p>
                  </div>
                  <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg ml-4">
                    <Warehouse className="h-8 w-8 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {!canCreateAny && (
            <Alert className="border-2 border-teal-200 bg-teal-50">
              <AlertCircle className="h-4 w-4 text-teal-600" />
              <AlertTitle className="text-teal-900">Location Limit Reached</AlertTitle>
              <AlertDescription className="text-teal-700">
                You have reached the maximum number of locations allowed. 
                To increase this limit, contact your system administrator or modify the environment configuration.
              </AlertDescription>
            </Alert>
          )}

          {/* Locations Grid */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {locations.map((location) => (
              <Card key={location.location_id} className="border-2 border-teal-100 hover:border-teal-200 shadow-md hover:shadow-lg transition-all">
                <CardHeader className="bg-gradient-to-br from-teal-50/50 via-emerald-50/30 to-green-50/30 border-b-2 border-teal-100">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {location.location_type === "store" ? (
                        <div className="p-2 rounded-lg bg-gradient-to-br from-teal-500 to-teal-600 shadow-md">
                          <Store className="h-4 w-4 text-white" />
                        </div>
                      ) : (
                        <div className="p-2 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-md">
                          <Warehouse className="h-4 w-4 text-white" />
                        </div>
                      )}
                      <Badge 
                        variant="secondary" 
                        className={`capitalize border-2 ${
                          location.location_type === "store" 
                            ? "bg-teal-100 text-teal-700 border-teal-200" 
                            : "bg-emerald-100 text-emerald-700 border-emerald-200"
                        }`}
                      >
                        {location.location_type}
                      </Badge>
                    </div>
                  </div>
                  <CardTitle className="mt-2 text-gray-900">{location.name}</CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  {location.address && (
                    <div className="flex items-start gap-2 text-sm text-gray-600">
                      <MapPin className="h-4 w-4 mt-0.5 shrink-0 text-emerald-600" />
                      <span>{location.address}</span>
                    </div>
                  )}
                  {!location.address && (
                    <p className="text-sm text-gray-400 italic">No address set</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {locations.length === 0 && (
            <Card className="border-2 border-teal-200 shadow-lg">
              <CardContent className="flex flex-col items-center justify-center py-16">
                <div className="flex gap-3 mb-6">
                  <div className="p-4 bg-gradient-to-br from-teal-100 to-teal-200 rounded-xl">
                    <Store className="h-12 w-12 text-teal-600" />
                  </div>
                  <div className="p-4 bg-gradient-to-br from-emerald-100 to-emerald-200 rounded-xl">
                    <Warehouse className="h-12 w-12 text-emerald-600" />
                  </div>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">No locations yet</h3>
                <p className="text-sm text-gray-600 mb-6 text-center max-w-sm">
                  Get started by creating your first store or warehouse location
                </p>
                <Button 
                  onClick={() => setDialogOpen(true)}
                  className="bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white shadow-lg"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create First Location
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  )
}
