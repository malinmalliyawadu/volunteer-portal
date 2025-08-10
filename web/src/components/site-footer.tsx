/**
 * Site footer component displaying charity information and copyright
 *
 * @example
 * ```tsx
 * <SiteFooter />
 * ```
 */
export function SiteFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t mt-12 bg-slate-900 dark:bg-slate-950">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="text-sm text-slate-300">
            <p>
              Registered charity number:{" "}
              <span className="font-medium text-white">CC56055</span>
            </p>
          </div>
          <div className="text-sm text-slate-300">
            <p>© Everybody Eats {currentYear}</p>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default SiteFooter;
