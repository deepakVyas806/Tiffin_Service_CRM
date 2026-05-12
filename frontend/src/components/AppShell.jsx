import Sidebar from "./Sidebar";
import BottomNav from "./BottomNav";
import TopHeader from "./TopHeader";
import RightGutter from "./RightGutter";
import { Toaster } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "react-router-dom";

export default function AppShell({ children, hideGutter = false }) {
  const location = useLocation();
  return (
    <div className="App tf-grain min-h-screen">
      <Sidebar />
      <TopHeader />

      <main
        className={`md:ml-72 ${hideGutter ? "" : "lg:mr-80"} min-h-screen pb-32 md:pb-12`}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="max-w-[640px] mx-auto px-4 md:px-8 pt-4 md:pt-10"
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>

      {!hideGutter && <RightGutter />}
      <BottomNav />

      <Toaster position="top-center" richColors theme="light" />
    </div>
  );
}
