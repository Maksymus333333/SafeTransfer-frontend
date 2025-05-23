import { JSX } from 'react/jsx-runtime';
import { useEffect, useRef, useState } from 'react';

export const PrivacySection = (): JSX.Element => {
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
            observer.unobserve(entry.target);
          }
        });
      },
      {
        threshold: 0.1,
      }
    );

    const currentRef = sectionRef.current;
    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, []);

  return (
    <section ref={sectionRef} className={`privacy-section-container ${isVisible ? 'visible' : ''}`}>
      <h2>Zbudowany z myślą o prywatności</h2>
      <p className="privacy-description">
        Używamy silnego szyfrowania i automatycznie usuwamy Twoje pliki, aby zapewnić maksymalną prywatność i
        bezpieczeństwo.
      </p>
    </section>
  );
};
