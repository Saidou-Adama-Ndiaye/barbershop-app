export default function CommandesLoading() {
  return (
    <div className="space-y-6">
      <div className="h-9 w-56 bg-gray-200 rounded animate-pulse" />
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-36 bg-gray-200 rounded-2xl animate-pulse" />
        ))}
      </div>
    </div>
  );
}