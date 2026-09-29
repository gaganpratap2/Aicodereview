"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { useCurrentUser } from "@/hooks/use-auth";
import { Spinner } from "@/components/ui/spinner";

export default function AuthCallbackPage() {
  const router = useRouter();
  const { data: user, isLoading, isError, isFetched } = useCurrentUser();

  useEffect(() => {
    if (!isFetched || isLoading) return;

    if (user) {
      router.replace("/dashboard");
      return;
    }

    router.replace("/login?error=session");
  }, [user, isLoading, isFetched, isError, router]);

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-3">
      <Spinner className="size-6" />
      <p className="text-sm text-muted-foreground">Finishing GitHub sign-in…</p>
    </div>
  );
}

















// "use client";

// import { useRouter, useSearchParams } from "next/navigation";
// import { Suspense, useEffect } from "react";

// import { useCurrentUser } from "@/hooks/use-auth";
// import { Spinner } from "@/components/ui/spinner";

// function AuthCallbackContent() {
//   const router = useRouter();
//   const params = useSearchParams();
//   const next = params.get("next");
//   const { data: user, isLoading, isFetched } = useCurrentUser({
//     alwaysRefetch: true,
//   });

//   useEffect(() => {
//     if (!isFetched || isLoading) return;

//     if (user) {
//       const safeNext =
//         next && next.startsWith("/") && !next.startsWith("//")
//           ? next
//           : "/dashboard";
//       router.replace(safeNext);
//       return;
//     }

//     router.replace("/login?error=session");
//   }, [user, isLoading, isFetched, next, router]);

//   return (
//     <div className="flex min-h-svh flex-col items-center justify-center gap-3">
//       <Spinner className="size-6" />
//       <p className="text-sm text-muted-foreground">Finishing GitHub sign-in…</p>
//     </div>
//   );
// }

// export default function AuthCallbackPage() {
//   return (
//     <Suspense
//       fallback={
//         <div className="flex min-h-svh items-center justify-center">
//           <Spinner className="size-8" />
//         </div>
//       }
//     >
//       <AuthCallbackContent />
//     </Suspense>
//   );
// }
