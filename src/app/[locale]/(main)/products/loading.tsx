export default function Loading() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6">
        <div className="flex justify-between items-center mb-6">
          <div className="h-8 w-64 bg-muted animate-pulse rounded" />
        </div>

        <div className="space-y-4">
          <div className="flex space-x-1 bg-muted p-1 rounded-lg w-fit">
            <div className="h-10 w-24 bg-background animate-pulse rounded" />
            <div className="h-10 w-24 bg-muted-foreground/20 animate-pulse rounded" />
          </div>

          <div className="bg-card rounded-lg border">
            <div className="p-6 space-y-4">
              <div className="flex justify-between items-center">
                <div className="space-y-2">
                  <div className="h-6 w-48 bg-muted animate-pulse rounded" />
                  <div className="h-4 w-64 bg-muted animate-pulse rounded" />
                </div>
                <div className="h-9 w-32 bg-muted animate-pulse rounded" />
              </div>

              <div className="flex gap-3">
                <div className="h-9 flex-1 bg-muted animate-pulse rounded" />
                <div className="h-9 w-48 bg-muted animate-pulse rounded" />
              </div>
            </div>

            <div className="border-t">
              <div className="p-6 space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center space-x-4">
                    <div className="h-4 flex-1 bg-muted animate-pulse rounded" />
                    <div className="h-4 w-20 bg-muted animate-pulse rounded" />
                    <div className="h-4 w-24 bg-muted animate-pulse rounded" />
                    <div className="h-4 w-16 bg-muted animate-pulse rounded" />
                    <div className="h-4 w-12 bg-muted animate-pulse rounded" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
