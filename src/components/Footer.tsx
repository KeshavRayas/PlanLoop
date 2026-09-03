import { APP_NAME } from "@/lib/constants";

export function Footer() {
  return (
    <footer className="border-t-3 border-black bg-surface mt-auto">
      <div className="max-w-container-max mx-auto px-6 py-6 flex items-center justify-between">
        <p className="text-body font-bold">
          {APP_NAME} &mdash; Career Intelligence OS
        </p>
        <p className="text-label font-extrabold uppercase tracking-[0.08em] text-text-secondary">
          &copy; {new Date().getFullYear()}
        </p>
      </div>
    </footer>
  );
}
