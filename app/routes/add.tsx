import { useState } from "react";
import { Link, redirect, useSubmit } from "react-router";

import type { Route } from "./+types/add";
import { ThemeToggle } from "../components/ThemeToggle";
import { getDb } from "../db";
import { beans } from "../db/schema";
import { prepareImage } from "../lib/image-client";
import { uploadImage } from "../lib/images.server";

export function meta(): Route.MetaDescriptors {
  return [{ title: "Add bean – Open Beans" }];
}

export async function action({ request }: Route.ActionArgs) {
  const form = await request.formData();
  const brand = String(form.get("brand") ?? "").trim();
  const name = String(form.get("name") ?? "").trim();
  if (!brand || !name) return { error: "Brand and name are required." };

  const imageUrl = await uploadImage(form.get("image"));
  const db = getDb();
  await db.insert(beans).values({ brand, name, imageUrl });
  return redirect("/");
}

export default function AddBean() {
  const submit = useSubmit();
  const [submitting, setSubmitting] = useState(false);

  // Intercept the submit so the photo can be downscaled client-side first.
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    const formEl = e.currentTarget;
    const formData = new FormData(formEl);
    const image = formData.get("image");
    if (image instanceof File && image.size > 0) {
      formData.set("image", await prepareImage(image));
    }
    submit(formData, { method: "post", encType: "multipart/form-data" });
  };

  return (
    <>
      <header className="flex justify-end items-center mb-8">
        <ThemeToggle />
      </header>
      <div className="max-w-lg mx-auto">
        <div className="bg-white/95 dark:bg-stone-800/95 rounded-3xl shadow-card dark:shadow-none dark:border dark:border-stone-600 p-6 md:p-8 border border-coffee/5 transition-shadow duration-300 hover:shadow-card-hover dark:hover:border-stone-500">
          <p className="text-amber/90 dark:text-amber-400/90 text-sm font-medium uppercase tracking-widest mb-1">
            New
          </p>
          <h1 className="font-display text-3xl md:text-4xl font-semibold text-coffee dark:text-stone-200 tracking-tight mb-8">
            Add bean
          </h1>
          <form method="post" encType="multipart/form-data" onSubmit={handleSubmit}>
            <div className="mb-5">
              <label
                htmlFor="brand"
                className="block text-sm font-medium text-coffee/80 dark:text-stone-400 mb-2"
              >
                Brand
              </label>
              <input
                id="brand"
                type="text"
                name="brand"
                required
                className="w-full px-4 py-3 min-h-[48px] border border-coffee/15 dark:border-stone-500 rounded-2xl bg-cream dark:bg-stone-700 text-coffee dark:text-stone-200 placeholder-coffee/40 dark:placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-amber/40 focus:border-amber/50"
              />
            </div>
            <div className="mb-5">
              <label
                htmlFor="name"
                className="block text-sm font-medium text-coffee/80 dark:text-stone-400 mb-2"
              >
                Name
              </label>
              <input
                id="name"
                type="text"
                name="name"
                required
                className="w-full px-4 py-3 min-h-[48px] border border-coffee/15 dark:border-stone-500 rounded-2xl bg-cream dark:bg-stone-700 text-coffee dark:text-stone-200 placeholder-coffee/40 dark:placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-amber/40 focus:border-amber/50"
              />
            </div>
            <div className="mb-8">
              <label
                htmlFor="image"
                className="block text-sm font-medium text-coffee/80 dark:text-stone-400 mb-2"
              >
                Image
              </label>
              <input
                id="image"
                type="file"
                name="image"
                accept="image/*"
                className="w-full px-4 py-3 min-h-[48px] border border-coffee/15 dark:border-stone-500 rounded-2xl bg-cream dark:bg-stone-700 text-coffee dark:text-stone-200 file:mr-3 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:bg-amber-dim file:dark:bg-amber-500/20 file:text-amber file:dark:text-amber-200 file:font-semibold file:cursor-pointer focus:outline-none focus:ring-2 focus:ring-amber/40 touch-manipulation"
              />
            </div>
            <div className="flex flex-wrap justify-end gap-3">
              <Link
                to="/"
                className="inline-flex items-center justify-center min-h-[44px] px-5 py-3 text-coffee/60 dark:text-stone-400 hover:text-coffee dark:hover:text-stone-200 font-medium rounded-2xl hover:bg-coffee/5 dark:hover:bg-stone-700 transition-all touch-manipulation"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={submitting}
                className="min-h-[48px] px-6 py-3 rounded-2xl bg-gradient-accent text-white font-display font-bold hover:opacity-95 active:scale-[0.98] transition-all shadow-glow-sm touch-manipulation disabled:opacity-60"
              >
                {submitting ? "Adding…" : "Add bean"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
