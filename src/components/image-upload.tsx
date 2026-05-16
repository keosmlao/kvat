"use client";

import { useRef, useState } from "react";

export function ImageUpload({
  name = "image",
  defaultUrl,
  shape = "square",
  size = "md",
  placeholder = "ກົດເພື່ອອັບໂຫລດ",
}: {
  /** form field name for the File input */
  name?: string;
  /** existing image URL */
  defaultUrl?: string | null;
  shape?: "square" | "circle";
  size?: "sm" | "md" | "lg";
  placeholder?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(defaultUrl ?? null);
  const [removed, setRemoved] = useState(false);

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPreview(URL.createObjectURL(file));
      setRemoved(false);
    }
  };

  const onClear = () => {
    setPreview(null);
    setRemoved(true);
    if (inputRef.current) inputRef.current.value = "";
  };

  const sizeCls =
    size === "lg"
      ? "w-32 h-32"
      : size === "sm"
        ? "w-20 h-20"
        : "w-28 h-28";
  const shapeCls = shape === "circle" ? "rounded-full" : "rounded";

  return (
    <div className="inline-block relative group">
      <label
        className={`block ${sizeCls} ${shapeCls} cursor-pointer overflow-hidden border-2 border-dashed border-gray-300 hover:border-[#b91c1c] transition relative bg-gray-50 ${
          preview ? "border-solid border-gray-200" : ""
        }`}
        title="ກົດເພື່ອປ່ຽນຮູບ"
      >
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={preview}
            alt=""
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 hover:text-[#b91c1c] transition">
            <svg
              className="w-7 h-7 mb-1"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <span className="text-[10px] text-center px-1">{placeholder}</span>
          </div>
        )}
        <input
          ref={inputRef}
          type="file"
          name={name}
          accept="image/png,image/jpeg,image/webp,image/gif"
          onChange={onChange}
          className="sr-only"
        />
      </label>
      {preview && (
        <button
          type="button"
          onClick={onClear}
          className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-600 text-white text-xs shadow hover:bg-red-700 opacity-0 group-hover:opacity-100 transition flex items-center justify-center"
          title="ລົບຮູບ"
        >
          ×
        </button>
      )}
      <input
        type="hidden"
        name={`${name}Remove`}
        value={removed ? "true" : "false"}
      />
    </div>
  );
}
