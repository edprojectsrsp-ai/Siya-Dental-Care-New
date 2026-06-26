"use client";

import PatientPortal from "@/components/PatientPortal";

export default function Page({ params }: { params: { token: string } }) {
  return <PatientPortal token={params.token} />;
}
