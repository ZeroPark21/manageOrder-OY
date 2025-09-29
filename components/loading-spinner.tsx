export function LoadingSpinner({
  message = "데이터를 불러오는 중...",
}: {
  message?: string;
}) {
  return (
    <div className="flex h-screen items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <div className="text-center">
        <div className="relative inline-flex">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary/20"></div>
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-t-primary absolute top-0 left-0"></div>
        </div>
        <p className="mt-4 text-lg font-medium text-muted-foreground animate-pulse">
          {message}
        </p>
      </div>
    </div>
  );
}
