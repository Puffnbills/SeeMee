import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto grid min-h-screen max-w-lg place-items-center px-6 text-center">
      <div>
        <p className="kicker">Missing</p>
        <h1 className="display text-4xl">That room is gone.</h1>
        <Link className="btn btn-primary mt-4" href="/home">
          Back to live
        </Link>
      </div>
    </main>
  );
}
