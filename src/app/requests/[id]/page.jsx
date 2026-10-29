
import { Suspense } from "react";
import RequestDetailsClient from "./request-details-client";

export default function RequestDetailsPage({ params }) {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen p-6">
          <p className="text-gray-500">Loading request details...</p>
        </main>
      }
    >
      <RequestDetailsContent params={params} />
    </Suspense>
  );
}

async function RequestDetailsContent({ params }) {
  const { id } = await params;

  return <RequestDetailsClient id={id} />;
}
