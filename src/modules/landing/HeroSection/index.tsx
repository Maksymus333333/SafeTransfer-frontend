import { JSX } from 'react/jsx-runtime';

export const HeroSection = (): JSX.Element => {
  return (
    <section className="hero-section-container">
      <h1>
        Bezpieczny transfer plików -<br />
        szybki i niezawodny
      </h1>
      <p className="hero-subheadline">
        Przesyłaj ważne dane z pełną ochroną. SafeTransfer zapewnia kompleksowe szyfrowanie, dzięki czemu Twoje
        informacje są bezpieczne podczas każdego transferu.
      </p>
      <button className="hero-cta-btn">
        Rozpocznij
      </button>
    </section>
  );
};
