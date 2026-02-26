"use client";

import { use } from "react";
import { AdminPageContent } from "@/components/AdminPageContent";

interface AdminPageProps {
  searchParams: Promise<{ token?: string }>;
}

export default function AdminPage({ searchParams }: AdminPageProps) {
  const { token } = use(searchParams);
  return <AdminPageContent urlToken={token} />;
}
