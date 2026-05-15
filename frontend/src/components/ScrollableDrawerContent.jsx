import { DrawerContent } from "./ui/drawer";

export default function ScrollableDrawerContent({ children, className = "" }) {
  return (
    <DrawerContent
      className={`overflow-hidden bg-white ${className}`}
      style={{ height: "90dvh", maxHeight: "90dvh" }}
    >
      <div
        data-vaul-no-drag
        className="w-full flex-1 px-6 pb-8 pt-4"
        style={{
          overflowY: "auto",
          WebkitOverflowScrolling: "touch",
          touchAction: "pan-y",
        }}
      >
        <div className="mx-auto w-full max-w-lg">{children}</div>
      </div>
    </DrawerContent>
  );
}
