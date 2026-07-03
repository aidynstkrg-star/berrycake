"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Root() {
  const router = useRouter();
  useEffect(() => {
    const auth = localStorage.getItem("bc_auth");
    if (auth) {
      const { role } = JSON.parse(auth);
      router.replace(role === "Менеджер цеха" ? "/cashier" : role === "Пекарь" ? "/production" : "/dashboard");
    } else {
      router.replace("/login");
    }
  }, []);
  return null;
}
