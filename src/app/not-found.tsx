import Link from "next/link";

export default function NotFound() {
  return (
    <main className="not-found-page">
      <span className="not-found-mark">404</span>
      <h1>This page wandered off.</h1>
      <p>The page you’re looking for isn’t part of this workspace.</p>
      <Link className="button button-primary" href="/">Back to overview</Link>
    </main>
  );
}
