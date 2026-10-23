"use client";
import { useEffect, useState } from "react";
import { isNativeApp } from "../lib/platform";

export function useNativeApp() {
  const [native, setNative] = useState(false);
  useEffect(() => setNative(isNativeApp()), []);
  return native;
}
