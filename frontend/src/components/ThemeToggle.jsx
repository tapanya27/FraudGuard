import { useTheme } from "../context/ThemeContext";

function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <div
      className="inline-flex items-center rounded-md ring-1 ring-navy-700"
      role="group"
      aria-label="Color theme"
    >
      <button
        type="button"
        onClick={() => setTheme("light")}
        className={`inline-flex h-11 w-11 items-center justify-center rounded-l-md text-sm ${
          theme === "light"
            ? "bg-accent/15 text-accent"
            : "text-slate-muted hover:text-ice"
        }`}
        aria-pressed={theme === "light"}
        aria-label="Light mode"
        title="Light mode"
      >
        ☀
      </button>
      <button
        type="button"
        onClick={() => setTheme("dark")}
        className={`inline-flex h-11 w-11 items-center justify-center rounded-r-md text-sm ${
          theme === "dark"
            ? "bg-accent/15 text-accent-soft"
            : "text-slate-muted hover:text-ice"
        }`}
        aria-pressed={theme === "dark"}
        aria-label="Dark mode"
        title="Dark mode"
      >
        🌙
      </button>
    </div>
  );
}

export default ThemeToggle;
