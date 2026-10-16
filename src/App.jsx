import { useCallback, useEffect, useRef, useState } from "react";

// Your Teachable Machine model
const MODEL_URL = "https://teachablemachine.withgoogle.com/models/oTnzgBpa5/";

function LeafMark({ className }) {
  return (
    <svg
      className={className}
      viewBox="0 0 64 64"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M54 8C28 8 10 22 10 42c0 5 1.5 9 4 12 16 0 40-12 40-46Z" />
      <path d="M14 54C26 40 38 28 54 8" />
      <path d="M22 45l-8-3M31 36l-2-9M40 27l7-1" />
    </svg>
  );
}

// Decorative branch in the corner of the page
const LEAF_SHAPE = "M0 0C14-26 56-30 80 0 56 30 14 26 0 0Z";
const BRANCH_LEAVES = [
  { x: 392, y: 26, r: 86, s: 1.1, c: "#9DBB77" },
  { x: 392, y: 26, r: 186, s: 0.9, c: "#B7CC93" },
  { x: 330, y: 72, r: 80, s: 1.25, c: "#8FB46A" },
  { x: 330, y: 72, r: 192, s: 1.0, c: "#A9C384" },
  { x: 268, y: 118, r: 90, s: 1.35, c: "#9DBB77" },
  { x: 268, y: 118, r: 190, s: 1.15, c: "#C2D4A0" },
  { x: 206, y: 170, r: 84, s: 1.3, c: "#8FB46A" },
  { x: 206, y: 170, r: 188, s: 1.1, c: "#B7CC93" },
  { x: 152, y: 232, r: 88, s: 1.05, c: "#A9C384" },
  { x: 152, y: 232, r: 184, s: 0.9, c: "#9DBB77" },
  { x: 110, y: 298, r: 100, s: 0.8, c: "#B7CC93" },
];

function Foliage({ className }) {
  return (
    <svg className={className} viewBox="0 0 420 420" aria-hidden="true">
      <path
        d="M404 14C300 62 190 150 100 324"
        fill="none"
        stroke="#25693F"
        strokeOpacity="0.45"
        strokeWidth="3"
        strokeLinecap="round"
      />
      {BRANCH_LEAVES.map((l, i) => (
        <g key={i} transform={`translate(${l.x} ${l.y}) rotate(${l.r}) scale(${l.s})`}>
          <path d={LEAF_SHAPE} fill={l.c} />
          <path
            d="M4 0H70"
            stroke="#25693F"
            strokeOpacity="0.35"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </g>
      ))}
    </svg>
  );
}

const STEPS = [
  {
    title: "Upload a photo",
    text: "Choose or drop an image of one leaf.",
  },
  {
    title: "The model reads it",
    text: "It compares the leaf with the classes it learned in Teachable Machine.",
  },
  {
    title: "See the label",
    text: "Only the closest match is shown.",
  },
];

export default function App() {
  const [model, setModel] = useState(null);
  const [modelError, setModelError] = useState("");
  const [imageSrc, setImageSrc] = useState(null);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [label, setLabel] = useState("");
  const [status, setStatus] = useState("idle"); // idle | analyzing | done | error
  const [errorMsg, setErrorMsg] = useState("");
  const [dragging, setDragging] = useState(false);
  const [isTouch, setIsTouch] = useState(false);

  const imgRef = useRef(null);
  const pickRef = useRef(null);
  const cameraRef = useRef(null);
  const runId = useRef(0); // ignores results from outdated predictions

  useEffect(() => {
    setIsTouch(window.matchMedia("(pointer: coarse)").matches);
  }, []);

  // Load the model once
  useEffect(() => {
    let cancelled = false;
    async function loadModel() {
      try {
        if (!window.tmImage) {
          throw new Error(
            "The model library could not load. Check your internet connection and reload the page."
          );
        }
        const m = await window.tmImage.load(
          MODEL_URL + "model.json",
          MODEL_URL + "metadata.json"
        );
        if (!cancelled) setModel(m);
      } catch (err) {
        if (!cancelled)
          setModelError(err.message || "The model could not load. Reload the page to try again.");
      }
    }
    if (document.readyState === "complete") loadModel();
    else window.addEventListener("load", loadModel, { once: true });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleFile = useCallback((file) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setStatus("error");
      setErrorMsg("Choose an image file such as a JPG, PNG or WEBP.");
      return;
    }
    runId.current += 1;
    setLabel("");
    setErrorMsg("");
    setImgLoaded(false);
    setStatus("analyzing");
    setImageSrc((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(file);
    });
  }, []);

  // Predict once BOTH the image has rendered and the model is ready
  const analyze = useCallback(async () => {
    if (!model || !imgRef.current) return;
    const myRun = ++runId.current;
    try {
      const predictions = await model.predict(imgRef.current);
      const top = predictions.reduce((a, b) =>
        a.probability > b.probability ? a : b
      );
      // Short pause so the scan animation is seen
      await new Promise((r) => setTimeout(r, 900));
      if (myRun !== runId.current) return;
      setLabel(top.className);
      setStatus("done");
    } catch (err) {
      if (myRun !== runId.current) return;
      setStatus("error");
      setErrorMsg("The model could not read this image. Try a different photo.");
    }
  }, [model]);

  useEffect(() => {
    if (imgLoaded && model) analyze();
  }, [imgLoaded, model, analyze]);

  const reset = () => {
    runId.current += 1;
    if (imageSrc) URL.revokeObjectURL(imageSrc);
    setImageSrc(null);
    setImgLoaded(false);
    setLabel("");
    setStatus("idle");
    setErrorMsg("");
  };

  const onPick = (e) => {
    handleFile(e.target.files?.[0]);
    e.target.value = ""; // lets the same file be chosen again
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    handleFile(e.dataTransfer.files?.[0]);
  };

  // Words on screen
  const healthy = /healthy/i.test(label);
  const tone =
    status === "done"
      ? healthy
        ? "healthy"
        : "diseased"
      : status === "analyzing" && !modelError
      ? "reading"
      : "idle";

  let title;
  let body;
  if (modelError && status !== "done") {
    title = "Model unavailable";
    body = modelError;
  } else if (status === "done") {
    title = label;
    body =
      "Preliminary prediction. Confirm with an agriculture expert before you treat your crop.";
  } else if (status === "analyzing") {
    title = "Reading the leaf";
    body = model ? "One moment." : "Waiting for the model to finish loading.";
  } else if (status === "error") {
    title = "That didn't work";
    body = errorMsg;
  } else {
    title = "Check a leaf";
    body = "Upload one clear photo. The model names the condition it recognises.";
  }

  const dot = modelError ? "error" : model ? "ready" : "loading";
  const dotText = modelError ? "Model failed to load" : model ? "Model ready" : "Loading model";

  return (
    <div className="shell">
      <Foliage className="foliage" />

      <header className="top">
        <LeafMark className="top-mark" />
        <span className="top-name">Plant Disease Detector</span>
      </header>

      <main className="stage">
        <section className="copy">
          <div aria-live="polite">
            <h1 key={`${status}-${label}`} className={`title title--${tone}`}>
              {title}
            </h1>
            <p className="body">{body}</p>
          </div>

          <div className="actions">
            {!imageSrc ? (
              <>
                <button
                  type="button"
                  className="btn btn--solid"
                  onClick={() => pickRef.current?.click()}
                >
                  Choose a photo
                </button>
                {isTouch && (
                  <button
                    type="button"
                    className="btn btn--line"
                    onClick={() => cameraRef.current?.click()}
                  >
                    Use camera
                  </button>
                )}
              </>
            ) : (
              <>
                <button
                  type="button"
                  className="btn btn--solid"
                  onClick={() => pickRef.current?.click()}
                >
                  Try another leaf
                </button>
                <button type="button" className="btn btn--text" onClick={reset}>
                  Clear
                </button>
              </>
            )}
          </div>

          {!imageSrc && (
            <p className="tip">
              For the best reading, photograph a single leaf in daylight against a plain
              background, close enough to fill the frame.
            </p>
          )}

          <p className="model-status">
            <span className={`dot dot--${dot}`} />
            {dotText}
          </p>
        </section>

        <section className="lens-wrap">
          <div className="lens-stack">
            <div className="sun" aria-hidden="true" />
            <svg
              className={`ticks ${tone === "reading" ? "ticks--spin" : ""}`}
              viewBox="0 0 100 100"
              aria-hidden="true"
            >
              <circle
                cx="50"
                cy="50"
                r="49"
                pathLength="120"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeDasharray="0.22 1.78"
              />
            </svg>

            <div
              className="lens"
              data-tone={tone}
              data-drag={dragging}
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
            >
              {imageSrc ? (
                <img
                  ref={imgRef}
                  className="lens-img"
                  src={imageSrc}
                  alt="The leaf you uploaded"
                  onLoad={() => setImgLoaded(true)}
                />
              ) : (
                <button
                  type="button"
                  className="lens-empty"
                  onClick={() => pickRef.current?.click()}
                >
                  <LeafMark className="lens-icon" />
                  <span>Drop a photo here</span>
                </button>
              )}
            </div>

            {status === "done" && healthy && (
              <div className="burst" key={`burst-${label}`} aria-hidden="true">
                {Array.from({ length: 12 }).map((_, i) => (
                  <i key={i} style={{ "--a": `${i * 30}deg` }} />
                ))}
              </div>
            )}
          </div>
        </section>
      </main>

      <section className="steps" aria-label="How it works">
        <ol className="steps-list">
          {STEPS.map((s, i) => (
            <li key={s.title} className="step">
              <span className="step-num">{i + 1}</span>
              <div>
                <h2 className="step-title">{s.title}</h2>
                <p className="step-text">{s.text}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <footer className="foot">
        <p className="foot-text">
          This tool gives a preliminary prediction from a trained image model. It does not
          replace testing or advice from an agriculture expert.
        </p>
      </footer>

      <input ref={pickRef} type="file" accept="image/*" onChange={onPick} hidden />
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={onPick}
        hidden
      />
    </div>
  );
}
