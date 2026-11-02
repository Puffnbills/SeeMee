"use client";

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="mx-auto grid min-h-screen max-w-lg place-items-center px-6 text-center">
      <div>
        <p className="kicker">Something broke</p>
        <h1 className="display text-4xl">The room dropped.</h1>
        <button className="btn btn-primary mt-4" type="button" onClick={() => reset()}>
          Try again
        </button>
      </div>
    </main>
  );
}
