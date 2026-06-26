"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Root() {
  const router = useRouter();
  useEffect(() => {
    if (localStorage.getItem("bc_auth")) {
      router.replace("/dashboard");
    } else {
      router.replace("/login");
    }
  }, []);
  return null;
}
