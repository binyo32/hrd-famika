import { useState, useMemo } from "react";

const PMSelect = ({ pmList, value, onChange }) => {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);

  const selectedPM = pmList.find((pm) => pm.id === value);

  const filteredPM = useMemo(() => {
    return pmList.filter((pm) =>
      pm.name.toLowerCase().includes(search.toLowerCase())
    );
  }, [search, pmList]);

  return (
    <div className="relative mb-5">
      <label htmlFor="pm-select">Pilih PM</label>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="
          w-full rounded-md border px-3 py-2 text-sm text-left
          bg-white text-gray-900 border-gray-300
          dark:bg-gray-900 dark:text-gray-100 dark:border-gray-700
          focus:outline-none focus:ring-2 focus:ring-primary
        ">
        {selectedPM ? selectedPM.name : "Pilih Direct PM"}
      </button>

      {open && (
        <div
          className="
            absolute z-50 mt-1 w-full rounded-md border shadow-lg
            bg-white border-gray-200
            dark:bg-gray-900 dark:border-gray-700
          ">
          {/* Search */}
          <input
            type="text"
            placeholder="Cari PM..."
            className="
              w-full px-3 py-2 text-sm outline-none border-b
              bg-white text-gray-900 border-gray-200
              dark:bg-gray-900 dark:text-gray-100 dark:border-gray-700
              placeholder:text-gray-400 dark:placeholder:text-gray-500
            "
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          {/* List */}
          <ul className="max-h-48 overflow-auto">
            {filteredPM.length === 0 ? (
              <li className="px-3 py-2 text-sm text-gray-400 dark:text-gray-500">
                PM tidak ditemukan
              </li>
            ) : (
              filteredPM.map((pm) => (
                <li
                  key={pm.id}
                  onClick={() => {
                    onChange(pm.id);
                    setOpen(false);
                    setSearch("");
                  }}
                  className="
                    cursor-pointer px-3 py-2 text-sm
                    text-gray-900 hover:bg-gray-100
                    dark:text-gray-100 dark:hover:bg-gray-800
                  ">
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
