"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { IdentifyError, IdentifyResponse, Verdict } from "@/app/lib/schema";
import { resizeImage } from "@/app/lib/resizeImage";
import { CameraIcon, CorianderLeaf, GalleryIcon, ParsleyLeaf, RetakeIcon, ShareIcon } from "./icons";

type State =
  | { kind: "idle" }
  | { kind: "analyzing"; photo: string }
  | { kind: "result"; photo: string; result: IdentifyResponse }
  | { kind: "error"; photo?: string; message: string };

const VERDICTS: Record<Verdict, { label: string; latin: string; color: string }> = {
  coriander: { label: "كزبرة", latin: "CORIANDER", color: "text-leaf" },
  parsley: { label: "بقدونس", latin: "PARSLEY", color: "text-ink" },
  neither: { label: "لا هذا ولا ذاك", latin: "NEITHER", color: "text-tomato" },
  unclear: { label: "مو واضحة", latin: "TRY AGAIN", color: "text-mustard" },
};

const LOADING_LINES = [
  "نعدّ الأسنان على حواف الورق…",
  "نقارن الأطراف: دائرية ولا مدببة؟",
  "نشمّها… افتراضيًا",
  "نسأل الوالدة على السريع…",
  "لحظة، القرار مصيري",
];

const ERRORS: Record<IdentifyError["error"] | "network" | "decode", string> = {
  busy: "الضغط عالي، جرّب بعد شوي",
  bad_image: "ما قدرنا نقرأ الصورة، جرّب وحدة ثانية",
  failed: "صار خلل عندنا، جرّب مرة ثانية",
  network: "النت مقطوع؟ تأكد من الاتصال وجرّب مرة ثانية",
  decode: "هالصيغة ما تنفع، جرّب صورة JPG أو PNG",
};

const num = new Intl.NumberFormat("ar-EG");

export default function Identifier() {
  const [state, setState] = useState<State>({ kind: "idle" });
  const [dragging, setDragging] = useState(false);
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const analyze = useCallback(async (photo: string) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setState({ kind: "analyzing", photo });

    try {
      const res = await fetch("/api/identify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: photo }),
        signal: controller.signal,
      });
      const data = await res.json().catch(() => ({ error: "failed" }));
      if (controller.signal.aborted) return;
      if (!res.ok) {
        const key = (data as IdentifyError).error;
        setState({ kind: "error", photo, message: ERRORS[key] ?? ERRORS.failed });
        return;
      }
      setState({ kind: "result", photo, result: data as IdentifyResponse });
      // Haptic thump timed with the stamp landing.
      setTimeout(() => navigator.vibrate?.([14, 50, 28]), 300);
    } catch {
      if (!controller.signal.aborted) setState({ kind: "error", photo, message: ERRORS.network });
    }
  }, []);

  const handleFile = useCallback(
    async (file: Blob | null | undefined) => {
      if (!file || !file.type.startsWith("image/")) return;
      try {
        await analyze(await resizeImage(file));
      } catch {
        setState({ kind: "error", message: ERRORS.decode });
      }
    },
    [analyze],
  );

  const reset = useCallback(() => {
    abortRef.current?.abort();
    setState({ kind: "idle" });
  }, []);

  // Some Android browsers only offer files unless `capture` is set, so the camera and
  // the gallery get separate inputs. Desktop browsers ignore `capture`.
  const pick = useCallback(() => cameraRef.current?.click(), []);
  const pickGallery = useCallback(() => galleryRef.current?.click(), []);
  const onInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      handleFile(e.target.files?.[0]);
      e.target.value = "";
    },
    [handleFile],
  );

  // Desktop niceties: drag-and-drop anywhere, and paste from clipboard.
  useEffect(() => {
    let depth = 0;
    const hasFiles = (e: DragEvent) => e.dataTransfer?.types.includes("Files");
    const onEnter = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      depth++;
      setDragging(true);
    };
    const onLeave = () => {
      depth = Math.max(0, depth - 1);
      if (depth === 0) setDragging(false);
    };
    const onOver = (e: DragEvent) => hasFiles(e) && e.preventDefault();
    const onDrop = (e: DragEvent) => {
      e.preventDefault();
      depth = 0;
      setDragging(false);
      handleFile(e.dataTransfer?.files[0]);
    };
    const onPaste = (e: ClipboardEvent) => {
      const item = [...(e.clipboardData?.items ?? [])].find((i) => i.type.startsWith("image/"));
      if (item) handleFile(item.getAsFile());
    };
    window.addEventListener("dragenter", onEnter);
    window.addEventListener("dragleave", onLeave);
    window.addEventListener("dragover", onOver);
    window.addEventListener("drop", onDrop);
    window.addEventListener("paste", onPaste);
    return () => {
      window.removeEventListener("dragenter", onEnter);
      window.removeEventListener("dragleave", onLeave);
      window.removeEventListener("dragover", onOver);
      window.removeEventListener("drop", onDrop);
      window.removeEventListener("paste", onPaste);
    };
  }, [handleFile]);

  return (
    <main className="relative mx-auto flex min-h-dvh max-w-md flex-col overflow-hidden px-5 pt-[max(env(safe-area-inset-top),1.25rem)] pb-[max(env(safe-area-inset-bottom),1.25rem)]">
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="sr-only" tabIndex={-1} aria-hidden onChange={onInput} />
      <input ref={galleryRef} type="file" accept="image/*" className="sr-only" tabIndex={-1} aria-hidden onChange={onInput} />

      {state.kind === "idle" && <Idle onPick={pick} onGallery={pickGallery} />}
      {state.kind === "analyzing" && <Analyzing photo={state.photo} onCancel={reset} />}
      {state.kind === "result" && <Result photo={state.photo} result={state.result} onAgain={pick} onGallery={pickGallery} />}
      {state.kind === "error" && (
        <ErrorView
          photo={state.photo}
          message={state.message}
          onRetry={state.photo ? () => analyze(state.photo!) : pick}
          onNew={pick}
        />
      )}

      {dragging && (
        <div className="pointer-events-none fixed inset-3 z-50 grid place-items-center rounded-[2rem] border-4 border-dashed border-leaf bg-paper/90 backdrop-blur-sm">
          <p className="font-display text-4xl text-leaf">افلت الصورة هنا</p>
        </div>
      )}
    </main>
  );
}

/* ───────────────────────── Idle ───────────────────────── */

function Idle({ onPick, onGallery }: { onPick: () => void; onGallery: () => void }) {
  return (
    <>
      <CorianderLeaf className="pointer-events-none absolute -top-6 -left-10 size-44 -rotate-12 text-leaf/10" />
      <ParsleyLeaf className="pointer-events-none absolute -right-12 bottom-24 size-52 rotate-[20deg] text-ink/[0.07]" />

      <header className="animate-rise relative pt-6">
        <p className="mb-3 inline-block -rotate-2 rounded-md border-2 border-ink px-2 py-0.5 text-xs font-bold tracking-wide">
          للرجال خصوصًا<span className="text-tomato">*</span>
        </p>
        <h1 className="font-display leading-[0.95]">
          <span className="block text-[4.5rem]">بقدونس؟</span>
          <span className="block text-[3.6rem] text-leaf">ولّا كزبرة؟</span>
        </h1>
        <p className="mt-4 max-w-[17rem] text-lg leading-relaxed text-ink/75">
          صوّر الورقة ونقولك. <br />
          بدون إحراج، وبدون ما أحد يدري.
        </p>
      </header>

      <div className="relative flex flex-1 flex-col items-center justify-center gap-3 py-6">
        <button
          type="button"
          onClick={onPick}
          autoFocus
          className="group animate-rise relative grid size-64 place-items-center rounded-full outline-none [animation-delay:120ms]"
          aria-label="صوّر الورقة بالكاميرا"
        >
          {/* Rotating seal text */}
          <svg viewBox="0 0 200 200" className="animate-spin-slow absolute inset-0 size-full text-ink" aria-hidden>
            <defs>
              <path id="ring" d="M100,100 m-88,0 a88,88 0 1,1 176,0 a88,88 0 1,1 -176,0" />
            </defs>
            {/* SVG text-on-path drops RTL runs off the path; lay out LTR and let bidi shape the Arabic. */}
            <text className="fill-current font-display text-[14px]" direction="ltr" wordSpacing="2">
              <textPath href="#ring">{"كزبرة • بقدونس • ".repeat(6)}</textPath>
            </text>
          </svg>
          <span className="animate-breathe absolute inset-7 rounded-full bg-ink shadow-[0_18px_40px_-12px_rgb(23_51_31/0.6),inset_0_-6px_0_rgb(0_0_0/0.25)] transition-transform duration-200 group-active:scale-95 group-focus-visible:ring-4 group-focus-visible:ring-sprout" />
          <span className="relative flex flex-col items-center gap-1 text-paper transition-transform duration-200 group-active:scale-95">
            <CameraIcon className="size-14" />
            <span className="font-display text-2xl">صوّر الورقة</span>
          </span>
        </button>
        <GalleryLink onClick={onGallery} />
      </div>

      <footer className="animate-rise space-y-4 [animation-delay:220ms]">
        <div className="flex justify-center gap-6 text-sm text-ink/70">
          <span className="flex items-center gap-2">
            <CorianderLeaf className="size-7 text-leaf" />
            أطراف دائرية = كزبرة
          </span>
          <span className="flex items-center gap-2">
            <ParsleyLeaf className="size-7 text-ink" />
            مدببة = بقدونس
          </span>
        </div>
        <p className="text-center text-xs text-ink/50">
          <span className="hidden pointer-fine:inline">
            أو اسحب صورة هنا، أو الصقها بـ Ctrl+V<span className="mx-2">·</span>
          </span>
          <span className="text-tomato">*</span>والنساء مرحّب فيهن
        </p>
      </footer>
    </>
  );
}

function GalleryLink({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-12 items-center justify-center gap-2 self-center px-4 text-ink/70 underline decoration-ink/30 underline-offset-4"
    >
      <GalleryIcon className="size-5" />
      أو اختر من الاستديو
    </button>
  );
}

/* ───────────────────────── Photo frame ───────────────────────── */

function Photo({ src, children, dim }: { src: string; children?: React.ReactNode; dim?: boolean }) {
  return (
    <div className="relative mx-auto w-full overflow-hidden rounded-[1.75rem] border-[3px] border-ink bg-paper-deep shadow-[6px_6px_0_var(--color-ink)]">
      {/* eslint-disable-next-line @next/next/no-img-element -- local data URL */}
      <img src={src} alt="صورتك" className={`max-h-[48dvh] w-full object-cover transition ${dim ? "opacity-40 grayscale" : ""}`} />
      {children}
    </div>
  );
}

/* ───────────────────────── Analyzing ───────────────────────── */

function Analyzing({ photo, onCancel }: { photo: string; onCancel: () => void }) {
  const [line, setLine] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setLine((l) => (l + 1) % LOADING_LINES.length), 1700);
    return () => clearInterval(id);
  }, []);

  return (
    <section className="flex flex-1 flex-col justify-center gap-8 py-6" aria-busy="true">
      <div className="animate-rise">
        <Photo src={photo}>
          <div className="animate-scan absolute inset-x-0 h-1 bg-sprout shadow-[0_0_24px_8px_rgb(140_198_63/0.55)]" />
          <div className="absolute inset-0 bg-[linear-gradient(transparent_95%,rgb(23_51_31/0.12)_95%),linear-gradient(90deg,transparent_95%,rgb(23_51_31/0.12)_95%)] bg-[size:24px_24px]" />
        </Photo>
      </div>
      <div className="text-center">
        <p key={line} className="animate-rise font-display text-2xl" role="status">
          {LOADING_LINES[line]}
        </p>
        <button type="button" onClick={onCancel} className="mt-6 min-h-14 px-6 text-ink/60 underline underline-offset-4">
          إلغاء
        </button>
      </div>
    </section>
  );
}

/* ───────────────────────── Result ───────────────────────── */

function Result({
  photo,
  result,
  onAgain,
  onGallery,
}: {
  photo: string;
  result: IdentifyResponse;
  onAgain: () => void;
  onGallery: () => void;
}) {
  const v = VERDICTS[result.verdict];
  const unclear = result.verdict === "unclear";
  // Result never renders during SSR (state starts idle), so navigator is safe here.
  const canShare = typeof navigator.share === "function";

  const share = () =>
    navigator
      .share({
        title: "بقدونس؟ ولّا كزبرة؟",
        text: unclear
          ? "حتى الذكاء الاصطناعي ما عرفها 😅"
          : `طلعت ${v.label} بنسبة ${num.format(result.confidence)}٪ 🌿 ${result.quip}`,
        url: location.origin,
      })
      .catch(() => {});

  return (
    <section className="flex flex-1 flex-col gap-5 pt-2">
      <Photo src={photo}>
        <div className="absolute inset-0 bg-gradient-to-t from-ink/40 to-transparent" />
        <div className="absolute inset-x-0 bottom-6 flex justify-center">
          <div className={`animate-stamp relative rounded-2xl bg-paper/90 [animation-delay:120ms] ${v.color}`} role="status">
            <div className="stamp-ink rounded-2xl border-[5px] border-double border-current px-6 pt-3 pb-2 text-center">
              <p className="font-display text-6xl leading-none">{v.label}</p>
              <p className="mt-1 font-sans text-[11px] font-bold tracking-[0.35em]" dir="ltr">
                {v.latin}
              </p>
            </div>
          </div>
        </div>
      </Photo>

      <div className="animate-sheet flex flex-1 flex-col gap-5 rounded-t-[2rem] [animation-delay:200ms]">
        {!unclear && (
          <div>
            <div className="mb-2 flex items-baseline justify-between">
              <span className="text-ink/70">متأكدين بنسبة</span>
              <span className="font-display text-4xl leading-none">{num.format(result.confidence)}٪</span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-paper-deep">
              <div
                className={`animate-fill h-full origin-right rounded-full ${result.verdict === "neither" ? "bg-tomato" : "bg-leaf"}`}
                style={{ width: `${result.confidence}%` }}
              />
            </div>
            {result.voters > 1 && (
              <p className="mt-2 flex items-center gap-1.5 text-sm text-ink/60">
                <span className="flex gap-1" aria-hidden>
                  {Array.from({ length: result.voters }, (_, i) => (
                    <span key={i} className={`size-2 rounded-full ${i < result.votes ? "bg-leaf" : "bg-paper-deep"}`} />
                  ))}
                </span>
                {result.votes > 1
                  ? `اتفق عليها ${num.format(result.votes)} من ${num.format(result.voters)} نماذج`
                  : result.answered > 1
                    ? "النماذج اختلفت، واخترنا الأكثر ثقة"
                    : "جاوب نموذج واحد بس هالمرة"}
              </p>
            )}
          </div>
        )}

        {result.cues.length > 0 && (
          <div>
            <h2 className="mb-2 font-display text-xl">{unclear ? "شو المشكلة؟" : "ليش؟"}</h2>
            <ul className="space-y-2">
              {result.cues.map((cue, i) => (
                <li key={i} className="animate-rise flex items-start gap-2 text-[15px] leading-relaxed" style={{ animationDelay: `${450 + i * 90}ms` }}>
                  {result.verdict === "parsley" ? (
                    <ParsleyLeaf className="mt-0.5 size-5 shrink-0 text-leaf" />
                  ) : (
                    <CorianderLeaf className="mt-0.5 size-5 shrink-0 text-leaf" />
                  )}
                  {cue}
                </li>
              ))}
            </ul>
          </div>
        )}

        {result.quip && (
          <p className="animate-rise relative rounded-2xl bg-ink px-5 py-4 text-paper [animation-delay:700ms]">
            <span className="absolute -top-5 right-4 font-display text-5xl text-sprout">”</span>
            {result.quip}
          </p>
        )}

        <div className="mt-auto flex gap-3 pt-1">
          <button
            type="button"
            onClick={onAgain}
            className="flex min-h-14 flex-1 items-center justify-center gap-2 rounded-2xl border-[3px] border-ink bg-sprout font-display text-xl shadow-[4px_4px_0_var(--color-ink)] transition-transform active:translate-x-0.5 active:translate-y-0.5 active:shadow-[2px_2px_0_var(--color-ink)]"
          >
            <CameraIcon className="size-6" />
            {unclear ? "صوّرها من قريب" : "جرّب صورة ثانية"}
          </button>
          {canShare && (
            <button
              type="button"
              onClick={share}
              aria-label="شارك النتيجة"
              className="grid size-14 place-items-center rounded-2xl border-[3px] border-ink bg-paper shadow-[4px_4px_0_var(--color-ink)] transition-transform active:translate-x-0.5 active:translate-y-0.5 active:shadow-[2px_2px_0_var(--color-ink)]"
            >
              <ShareIcon className="size-6" />
            </button>
          )}
        </div>
        <GalleryLink onClick={onGallery} />
      </div>
    </section>
  );
}

/* ───────────────────────── Error ───────────────────────── */

function ErrorView({
  photo,
  message,
  onRetry,
  onNew,
}: {
  photo?: string;
  message: string;
  onRetry: () => void;
  onNew: () => void;
}) {
  return (
    <section className="flex flex-1 flex-col justify-center gap-6 py-6" role="alert">
      {photo && (
        <div className="animate-rise">
          <Photo src={photo} dim />
        </div>
      )}
      <div className="animate-rise text-center [animation-delay:100ms]">
        <p className="font-display text-5xl text-tomato">أوبس!</p>
        <p className="mt-2 text-lg">{message}</p>
      </div>
      <div className="flex flex-col gap-3">
        <button
          type="button"
          onClick={onRetry}
          className="flex min-h-14 items-center justify-center gap-2 rounded-2xl border-[3px] border-ink bg-sprout font-display text-xl shadow-[4px_4px_0_var(--color-ink)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-[2px_2px_0_var(--color-ink)]"
        >
          <RetakeIcon className="size-6" />
          حاول مرة ثانية
        </button>
        {photo && (
          <button type="button" onClick={onNew} className="min-h-14 text-ink/70 underline underline-offset-4">
            أو صوّر صورة جديدة
          </button>
        )}
      </div>
    </section>
  );
}
