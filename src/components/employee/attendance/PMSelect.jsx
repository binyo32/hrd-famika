import { useState, useEffect,useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

const dropdownVariants = {
  hidden: {
    opacity: 0,
    y: -6,
    scale: 0.98,
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.18,
      ease: "easeOut",
    },
  },
  exit: {
    opacity: 0,
    y: -4,
    scale: 0.98,
    transition: {
      duration: 0.12,
      ease: "easeIn",
    },
  },
};
const itemVariants = {
  hidden: { opacity: 0, y: -4 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.12 },
  },
  exit: {
    opacity: 0,
    y: 4,
    transition: { duration: 0.08 },
  },
};

const PMSelect = ({ pmList, value, onChange, onSearch, loading }) => {
    const containerRef = useRef(null);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;

    const t = setTimeout(() => {
      onSearch(search);
    }, 300);

    return () => clearTimeout(t);
  }, [search, open]);
  useEffect(() => {
  if (!open) return;

  const handleClickOutside = (e) => {
    if (
      containerRef.current &&
      !containerRef.current.contains(e.target)
    ) {
      setOpen(false);
    }
  };

  document.addEventListener("mousedown", handleClickOutside);

  return () => {
    document.removeEventListener("mousedown", handleClickOutside);
  };
}, [open]);


  return (
    <div className="relative mb-5" ref={containerRef}>
      <label className="text-sm font-medium">Pilih PM</label>

      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full rounded-md border px-3 py-2 text-left bg-background">
        {value ? value.name : "Pilih Direct PM"}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            variants={dropdownVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="absolute z-50 mt-1 w-full rounded-md border bg-white dark:bg-background origin-top shadow-lg">
            <input
              type="text"
              value={search}
              placeholder="Cari nama PM..."
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-3 py-2 border-b text-sm dark:bg-background"
              autoFocus
            />

            <ul className="max-h-48 overflow-auto">
              <AnimatePresence initial={false}>
                {loading ? (
                  <motion.li
                    key="loading"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="px-3 py-2 text-sm text-gray-400">
                    Mencari...
                  </motion.li>
                ) : pmList.length === 0 ? (
                  <motion.li
                    key="empty"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="px-3 py-2 text-sm text-gray-400">
                    Data tidak ditemukan
                  </motion.li>
                ) : (
                  pmList.map((pm) => (
                    <motion.li
                      key={pm.id}
                      variants={itemVariants}
                      initial="hidden"
                      animate="visible"
                      exit="exit"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        onChange(pm);
                        setOpen(false);
                        setSearch("");
                      }}
                      className="cursor-pointer px-3 py-2 text-sm dark:hover:bg-gray-700 hover:bg-gray-100">
                      {pm.name}
                    </motion.li>
                  ))
                )}
              </AnimatePresence>
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PMSelect;
