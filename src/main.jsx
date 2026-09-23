import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

const WELCOME_MESSAGE = {
  role: "assistant",
  content:
    "Hi there! Welcome to Haven House. We keep things simple, calm, and comfortable. Ask about your stay, or let’s find a room that feels right for you.",
  sources: [],
};

const SUGGESTIONS = [
  "What time is check-in?",
  "Is breakfast included?",
  "Which room is best for three guests?",
  "What is the cancellation policy?",
  "Find nearby hotels in Goa",
];

const money = (amount) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);

function hotelToday() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function formatGuestLabel(count) {
  return `${count} guest${count === 1 ? "" : "s"}`;
}

function StatusDot({ mode }) {
  return (
    <p>
      <i /> {mode}
    </p>
  );
}

function ChatMessage({ message }) {
  return (
    <article className={`message ${message.role}`}>
      <span className="speaker">
        {message.role === "user" ? "YOU" : "HAVEN HOUSE"}
      </span>

      <div className="bubble">
        <p>{message.content}</p>

        {message.sources?.length > 0 && (
          <div className="sources">
            {message.sources.map((source) => (
              <span key={source.id}>{source.label}</span>
            ))}
          </div>
        )}

        {message.notice && <small className="notice">{message.notice}</small>}

        {message.nearbyHotels?.length > 0 && (
          <div className="nearby-list">
            {message.nearbyHotels.map((hotel) => (
              <div className="hotel-card" key={`${hotel.name}-${hotel.distance}`}>
                <div>
                  <strong>{hotel.name}</strong>
                  <small>{hotel.type}</small>
                </div>
                <span>{hotel.distance}</span>
                <p>{hotel.reason}</p>
              </div>
            ))}
          </div>
        )}

        {message.availability && (
          <div className="results">
            <div className="result-title">
              {message.availability.checkIn} → {message.availability.checkOut}
              <br />
              {message.availability.adults} guests · {message.availability.nights}{" "}
              nights · Demo inventory
            </div>

            {message.availability.rooms.map((room) => (
              <div className="room" key={room.id}>
                <div>
                  <h3>{room.name}</h3>
                  <p>{room.description}</p>
                  <small>
                    Up to {room.capacity} guests · {room.available} available
                    <br />
                    {room.breakfast
                      ? "Breakfast included"
                      : "Breakfast at extra cost"}
                  </small>
                </div>

                <div className="price">
                  <strong>{money(room.total)}</strong>
                  <small>whole stay</small>
                  <small>{money(room.nightlyRate)} / night</small>
                </div>
              </div>
            ))}

            <small className="notice">{message.availability.priceNote}</small>
          </div>
        )}
      </div>
    </article>
  );
}

function SuggestionList({ suggestions, busy, onSelect }) {
  return (
    <div className="suggestions">
      {suggestions.map((suggestion) => (
        <button
          key={suggestion}
          disabled={busy}
          onClick={() => onSelect(suggestion)}
        >
          {suggestion}
        </button>
      ))}
    </div>
  );
}

function StayForm({ stay, busy, onChange, onSubmit, inputRef }) {
  return (
    <form onSubmit={onSubmit}>
      <label htmlFor="checkIn">Check-in</label>
      <input
        ref={inputRef}
        id="checkIn"
        type="date"
        min={hotelToday()}
        required
        value={stay.checkIn}
        onChange={(event) => onChange("checkIn", event.target.value)}
      />

      <label htmlFor="checkOut">Check-out</label>
      <input
        id="checkOut"
        type="date"
        min={stay.checkIn || hotelToday()}
        required
        value={stay.checkOut}
        onChange={(event) => onChange("checkOut", event.target.value)}
      />

      <label htmlFor="guests">Guests</label>
      <select
        id="guests"
        value={stay.adults}
        onChange={(event) => onChange("adults", Number(event.target.value))}
      >
        {Array.from({ length: 8 }, (_, index) => (
          <option key={index} value={index + 1}>
            {index + 1} guest{index ? "s" : ""}
          </option>
        ))}
      </select>

      <button className="primary" disabled={busy}>
        {busy ? "Checking…" : "Check availability"} <span>↗</span>
      </button>

      <small>
        1–30 nights · Arrival within 365 days
        <br />
        All guests count toward room capacity.
      </small>
    </form>
  );
}

function App() {
  const [messages, setMessages] = useState([WELCOME_MESSAGE]);
  const [question, setQuestion] = useState("");
  const [context, setContext] = useState({ location: "Goa, India" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(null);
  const [mode, setMode] = useState("Checking connection");
  const [stay, setStay] = useState({ checkIn: "", checkOut: "", adults: 2 });

  const endRef = useRef(null);
  const checkInRef = useRef(null);
  const lockRef = useRef(false);
  const controllerRef = useRef(null);

  useEffect(() => {
    fetch("/api/health")
      .then((response) => {
        if (!response.ok) throw Error();
        return response.json();
      })
      .then((data) => {
        setMode(data.mode === "groq" ? "AI connected" : "Local guide · demo");
      })
      .catch(() => setMode("Connection unavailable"));

    return () => controllerRef.current?.abort();
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [messages, busy]);

  async function send(text, details, again = false) {
    if (lockRef.current || !text.trim()) return;

    lockRef.current = true;
    setBusy(true);
    setError("");
    setRetry(null);

    const history = messages
      .filter((message) => message !== WELCOME_MESSAGE)
      .slice(-12)
      .map((message) => ({ role: message.role, content: message.content }));

    if (!again) {
      setMessages((currentMessages) => [
        ...currentMessages,
        { role: "user", content: text },
      ]);
    }

    setQuestion("");
    controllerRef.current = new AbortController();
    const timeoutId = setTimeout(() => controllerRef.current.abort(), 15000);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controllerRef.current.signal,
        body: JSON.stringify({
          message: text,
          history,
          context: { ...context, location: "Goa, India" },
          ...(details ? { stay: details } : {}),
        }),
      });

      const responseText = await response.text();
      let data;
      try {
        data = JSON.parse(responseText);
      } catch {
        throw Error(
          response.ok
            ? "The assistant returned an invalid response. Please try again."
            : "The assistant service is unavailable. Please try again shortly.",
        );
      }

      if (!response.ok) {
        throw Error(
          data.details?.map((item) => item.message).join(" ") ||
            data.error ||
            "We couldn’t reach the guest assistant. Please try again.",
        );
      }

      setMessages((currentMessages) => [
        ...currentMessages,
        { role: "assistant", content: data.answer, ...data },
      ]);

      setContext(data.context);
      setMode(
        data.mode === "groq"
          ? "AI connected"
          : data.mode === "fallback"
            ? "Local guide · AI unavailable"
            : "Local guide · demo",
      );

      if (data.needsStay) {
        checkInRef.current?.focus();
      }
    } catch (errorValue) {
      setError(
        errorValue.name === "AbortError"
          ? "That took a bit too long. Please try again."
          : errorValue.message === "Failed to fetch"
            ? "We couldn’t connect. Please check your connection and try again."
            : errorValue.message,
      );
      setRetry({ text, details });
    } finally {
      clearTimeout(timeoutId);
      lockRef.current = false;
      setBusy(false);
    }
  }

  function resetChat() {
    setMessages([WELCOME_MESSAGE]);
    setContext({ location: "Goa, India" });
    setError("");
    setRetry(null);
    setQuestion("");
  }

  function updateStayField(field, value) {
    setStay((currentStay) => ({
      ...currentStay,
      [field]: value,
    }));
  }

  function submitStay(event) {
    event.preventDefault();

    if (stay.checkOut <= stay.checkIn) {
      setError("Check-out must be after check-in.");
      return;
    }

    send(
      `Check rooms for ${formatGuestLabel(stay.adults)}, ${stay.checkIn} to ${stay.checkOut}.`,
      stay,
    );
  }

  return (
    <div className="shell">
      <header className="topbar">
        <a className="brand" href="/" aria-label="Haven House home">
          <span className="brand-icon">H</span>
          <span>
            HAVEN HOUSE<small>A LITTLE CLOSER TO CALM</small>
          </span>
        </a>

        <span className="location">
          GOA, INDIA <span>·</span> FICTIONAL HOTEL
        </span>
      </header>

      <main>
        <section className="intro">
          <div>
            <p className="eyebrow">YOUR STAY, MADE EASY</p>
            <h1>
              Feel right <em>at home.</em>
            </h1>
            <p>
              A quick answer, a comfortable room, and a smoother stay from the
              start.
            </p>
          </div>

          <div className="intro-note">
            <span>✳</span>
            <p>
              A little help,
              <br />
              whenever you need it.
            </p>
          </div>
        </section>

        <div className="workspace">
          <section className="chat-panel" aria-label="Guest assistant">
            <div className="chat-header">
              <div className="avatar">✳</div>
              <div>
                <h2>Your stay assistant</h2>
                <StatusDot mode={mode} />
              </div>

              <button className="text-button" onClick={resetChat} disabled={busy}>
                New chat
              </button>
            </div>

            <div
              className="conversation"
              role="log"
              aria-label="Conversation"
              aria-live="polite"
              aria-busy={busy}
            >
              {messages.map((message, index) => (
                <ChatMessage key={`${message.role}-${index}`} message={message} />
              ))}

              {busy && (
                <div role="status" className="loading">
                  <span className="dots">•••</span> Looking into that for you…
                </div>
              )}

              <div ref={endRef} />
            </div>

            {error && (
              <div className="error" role="alert">
                {error}
                {retry && (
                  <button
                    disabled={busy}
                    onClick={() => send(retry.text, retry.details, true)}
                  >
                    Try again
                  </button>
                )}
              </div>
            )}

            <div className="composer-area">
              <SuggestionList
                suggestions={SUGGESTIONS}
                busy={busy}
                onSelect={(suggestion) => send(suggestion)}
              />

              <form
                className="composer"
                onSubmit={(event) => {
                  event.preventDefault();
                  send(question);
                }}
              >
                <label className="sr-only" htmlFor="question">
                  Your question
                </label>

                <input
                  id="question"
                  autoComplete="off"
                  maxLength={1500}
                  value={question}
                  onChange={(event) => setQuestion(event.target.value)}
                  placeholder="Ask us about your stay…"
                  disabled={busy}
                />

                <button
                  aria-label="Send message"
                  disabled={busy || !question.trim()}
                >
                  ↑
                </button>
              </form>

              <p className="composer-note">
                Answers from our hotel guide. Availability is simulated; no
                booking is made.
              </p>
            </div>
          </section>

          <aside>
            <section className="stay-card">
              <p className="eyebrow">A SPACE TO CALL YOUR OWN</p>
              <h2>Find your stay.</h2>
              <p>
                Tell us when you’re arriving.
                <br />
                We’ll take it from there.
              </p>

              <StayForm
                stay={stay}
                busy={busy}
                inputRef={checkInRef}
                onSubmit={submitStay}
                onChange={updateStayField}
              />
            </section>

            <section className="guide-card">
              <div className="arch-art" aria-hidden="true">
                <div className="sun" />
                <div className="arch" />
                <div className="leaf">✳</div>
              </div>

              <p className="eyebrow">THE HAVEN WAY</p>
              <h3>
                Less rush.
                <br />
                More room to breathe.
              </h3>
              <p>
                Poolside mornings, unhurried breakfasts and the comfort of a warm
                welcome.
              </p>
              <button
                className="text-button"
                disabled={busy}
                onClick={() => send("Does the hotel have a swimming pool?")}
              >
                Explore the pool <span>→</span>
              </button>
            </section>
          </aside>
        </div>
      </main>

      <footer>
        <span>HAVEN HOUSE</span>
        <p>A fictional property. A real working guest-assistant demo.</p>
        <span>BUILT FOR A BETTER WELCOME</span>
      </footer>
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);

