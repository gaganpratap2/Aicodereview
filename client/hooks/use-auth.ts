"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

import { ApiError, api } from "@/lib/api";
import { queryKeys } from "@/lib/querykey";

export const AUTH_COOKIE = "devpilot_auth";

/**
 * Best-effort hint cookie read by proxy.ts for optimistic route guarding.
 * The real authority is the backend session, so this is never treated as
 * proof of authentication on its own.
 */
export function setAuthCookie(authed: boolean) {
  if (typeof document === "undefined") return;

  const secure =
    window.location.protocol === "https:" ? "; Secure" : "";

  document.cookie = authed
    ? `${AUTH_COOKIE}=1; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax${secure}`
    : `${AUTH_COOKIE}=; path=/; max-age=0; SameSite=Lax${secure}`;
}

export function useCurrentUser({
  alwaysRefetch = false,
}: { alwaysRefetch?: boolean } = {}) {
  return useQuery({
    queryKey: queryKeys.auth.me(),
    queryFn: async () => {
      try {
        const user = await api.me();
        setAuthCookie(true);
        return user;
      } catch (error) {
        // Only a definitive rejection from the backend invalidates the session.
        // Clearing on any error (offline, 502, CORS blip) would log the user out
        // while their backend session is still alive.
        if (
          error instanceof ApiError &&
          (error.status === 401 || error.status === 403)
        ) {
          setAuthCookie(false);
        }
        throw error;
      }
    },
    staleTime: 5 * 60 * 1000,
    // The OAuth return path must not trust a cached user from before the
    // redirect, or it can navigate on without the session ever being checked.
    refetchOnMount: alwaysRefetch ? "always" : true,
    retry: false,
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: () => api.logout(),
    // onSuccess, not onSettled: if the logout call fails the backend session is
    // still alive, so clearing the cookie would silently re-authenticate the
    // user on the next /me call.
    onSuccess: async () => {
      setAuthCookie(false);
      queryClient.setQueryData(queryKeys.auth.me(), null);
      await queryClient.invalidateQueries({ queryKey: queryKeys.auth.all });
      router.replace("/login");
    },
  });
}
