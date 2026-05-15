import { useEffect, useState } from "react";
import { Download } from "lucide-react";

export default function InstallAppButton({ compact = false }) {
  const [prompt, setPrompt] = useState(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const isStandalone =
      window.matchMedia?.("(display-mode: standalone)").matches ||
      window.navigator.standalone === true;

    setInstalled(isStandalone);

    const handleBeforeInstallPrompt = (event) => {
      event.preventDefault();
      setPrompt(event);
    };
    const handleInstalled = () => {
      setInstalled(true);
      setPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);

  const install = async () => {
    if (!prompt) return;
    prompt.prompt();
    await prompt.userChoice;
    setPrompt(null);
  };

  if (!prompt || installed) return null;

  if (compact) {
    return (
      <button
        type="button"
        data-testid="install-app-button"
        onClick={install}
        className="h-9 w-9 rounded-full bg-orange-50 text-orange-600 flex items-center justify-center border border-orange-100"
        aria-label="Install app"
      >
        <Download size={15} />
      </button>
    );
  }

  return (
    <button
      type="button"
      data-testid="install-app-button"
      onClick={install}
      className="inline-flex items-center gap-2 rounded-full bg-orange-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-orange-500"
    >
      <Download size={16} /> Install app
    </button>
  );
}
