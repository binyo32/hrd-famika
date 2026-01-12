import { useState, useEffect } from "react";

const PMSelect = ({ pmList, value, onChange, onSearch, loading }) => {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);

  const selectedPM = pmList.find((pm) => pm.id === value);

  // 🔥 debounce search
  useEffect(() => {
    const t = setTimeout(() => {
      onSearch(search);
    }, 300);

    return () => clearTimeout(t);
  }, [search]);

  return (
    <div className="relative mb-5">
      <label>Pilih PM</label>

      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full rounded-md border px-3 py-2 text-sm text-left">
        {selectedPM ? selectedPM.name : "Pilih Direct PM"}
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-white dark:bg-background dark:text-white ">
          <input
            type="text"
            placeholder="Cari nama PM..."
            className="w-full px-3 py-2 text-sm border-b dark:bg-background dark:text-white"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <ul className="max-h-48 overflow-auto">
            {loading ? (
              <li className="px-3 py-2 text-sm text-gray-400 dark:bg-background dark:text-white">
                Mencari...
              </li>
            ) : pmList.length === 0 ? (
              <li className="px-3 py-2 text-sm text-gray-400">
                Data tidak ditemukan
              </li>
            ) : (
              pmList.map((pm) => (
                <li
                  key={pm.id}
                  onClick={() => {
                    onChange(pm.id);
                    setOpen(false);
                    setSearch("");
                  }}
                  className="cursor-pointer px-3 py-2 hover:bg-gray-100 dark:hover:bg-secondary-dark dark:bg-background dark:text-white">
                  {pm.name}
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
};

export default PMSelect;
