"use client";

import React from "react";
import { SessionProvider as NextAuthSessionProvider } from "next-auth/react";

export const SessionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <NextAuthSessionProvider>{children}</NextAuthSessionProvider>;
};
