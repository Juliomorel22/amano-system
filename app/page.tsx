"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import "./landing.css";

export default function LandingPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsLoggedIn(!!session);
    });

    // Scroll reveal logic
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("lp-visible");
          }
        });
      },
      { threshold: 0.1 }
    );

    document.querySelectorAll(".lp-reveal").forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, []);

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  const appLink = isLoggedIn ? "/dashboard" : "/login";

  return (
    <div className="lp-body">
      {/* NAV */}
      <nav className="lp-nav">
        <Link href="/" className="lp-nav-logo">
          amano
        </Link>
        <ul className="lp-nav-links">
          <li>
            <a href="#como-funciona">¿Cómo funciona?</a>
          </li>
          <li>
            <a href="#trabajos">Trabajos</a>
          </li>
          <li>
            <a href="#trabajadores">Para trabajadores</a>
          </li>
          <li>
            <a href="#faq">FAQ</a>
          </li>
        </ul>
        <Link href={appLink} className="lp-btn-nav">
          Entrar a la app →
        </Link>
      </nav>

      {/* HERO */}
      <header className="lp-hero">
        <div className="lp-hero-badge">
          <span className="lp-dot"></span>
          Formosa Capital, Argentina
        </div>
        <h1>
          El vecino más
          <br />
          <em>confiable</em> de Formosa
        </h1>
        <p>
          Publicá lo que necesitás y recibí ofertas de trabajadores independientes verificados. El equipo de A mano
          coordina todo y garantiza que el trabajo se realice correctamente.
        </p>
        <div className="lp-hero-ctas">
          <Link href="/publicar" className="lp-btn-primary">
            <span
              className="material-symbols-outlined"
              style={{ fontSize: "18px", fontVariationSettings: "'FILL' 1" }}
            >
              handyman
            </span>
            Publicar un pedido
          </Link>
          <a href="#como-funciona" className="lp-btn-secondary">
            Ver cómo funciona
            <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>
              arrow_downward
            </span>
          </a>
        </div>
        <div className="lp-hero-stats">
          <div className="lp-stat">
            <div className="lp-stat-number">14</div>
            <div className="lp-stat-label">Categorías</div>
          </div>
          <div className="lp-stat">
            <div className="lp-stat-number">90%</div>
            <div className="lp-stat-label">Al prestador</div>
          </div>
          <div className="lp-stat">
            <div className="lp-stat-number">2h</div>
            <div className="lp-stat-label">Respuesta máx.</div>
          </div>
          <div className="lp-stat">
            <div className="lp-stat-number">100%</div>
            <div className="lp-stat-label">Pago seguro</div>
          </div>
        </div>

      </header>

      {/* CÓMO FUNCIONA */}
      <section id="como-funciona" className="lp-section">
        <div className="lp-como-funciona lp-reveal">
          <span className="lp-section-label">¿Cómo funciona?</span>
          <h2 className="lp-section-title">
            Simple, rápido
            <br />y <em>seguro</em>
          </h2>
          <p className="lp-section-subtitle">
            En menos de 2 minutos publicás tu necesidad y empezás a recibir ofertas de profesionales del barrio.
          </p>
          <div className="lp-steps">
            <div className="lp-step">
              <div className="lp-step-number">01</div>
              <div className="lp-step-icon">
                <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
                  edit_note
                </span>
              </div>
              <h3>Publicás tu necesidad</h3>
              <p>Describís el problema, subís fotos y elegís tu barrio. Tarda menos de 2 minutos.</p>
            </div>
            <div className="lp-step">
              <div className="lp-step-number">02</div>
              <div className="lp-step-icon">
                <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
                  local_offer
                </span>
              </div>
              <h3>Recibís ofertas</h3>
              <p>Los trabajadores de la categoría ven tu pedido y te envían una oferta para realizarla.</p>
            </div>
            <div className="lp-step">
              <div className="lp-step-number">03</div>
              <div className="lp-step-icon">
                <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
                  check_circle
                </span>
              </div>
              <h3>Elegís y pagás</h3>
              <p>Aceptás la oferta que preferís y transferís el monto al equipo de A mano.</p>
            </div>
            <div className="lp-step">
              <div className="lp-step-number">04</div>
              <div className="lp-step-icon">
                <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
                  verified
                </span>
              </div>
              <h3>Trabajo listo</h3>
              <p>El equipo coordina la visita. Cuando confirmás el trabajo, liberamos el pago al trabajador.</p>
            </div>
          </div>
        </div>
      </section>

      {/* TRABAJOS ACTIVOS */}
      <section id="trabajos" style={{ background: "var(--lp-surface-low)", maxWidth: "100%", padding: "6rem 0" }}>
        <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "0 1.5rem" }}>
          <div className="lp-reveal">
            <span className="lp-section-label">Trabajos en la plataforma</span>
            <h2 className="lp-section-title">
              Estos son algunos
              <br />
              pedidos <em>activos</em> hoy
            </h2>
            <p className="lp-section-subtitle">
              Vecinos de Formosa publican sus necesidades todos los días. ¿Sos trabajador independiente? Podés ofertar
              en estos pedidos ahora mismo.
            </p>
          </div>
          <div className="lp-trabajos-grid lp-reveal">
            <div className="lp-job-card">
              <div className="lp-job-card-header">
                <span className="lp-job-category">
                  <span className="material-symbols-outlined" style={{ fontSize: "12px", fontVariationSettings: "'FILL' 1" }}>
                    mop
                  </span>
                  Limpieza
                </span>
                <span className="lp-job-status">
                  <span className="lp-dot"></span>Buscando
                </span>
              </div>
              <h3 className="lp-job-title">Empleada entre semana</h3>
              <p className="lp-job-desc">
                Se necesita empleada doméstica para trabajar entre semana en casa pequeña, por la mañana.
              </p>
              <div className="lp-job-meta">
                <span className="lp-job-meta-item">
                  <span className="material-symbols-outlined">location_on</span>
                  Villa La Pilar
                </span>
                <span className="lp-job-meta-item">
                  <span className="material-symbols-outlined">schedule</span>
                  Mañanas
                </span>
                <span className="lp-job-offers-count">3 ofertas</span>
              </div>
            </div>

            <div className="lp-job-card">
              <div className="lp-job-card-header">
                <span className="lp-job-category">
                  <span className="material-symbols-outlined" style={{ fontSize: "12px", fontVariationSettings: "'FILL' 1" }}>
                    bolt
                  </span>
                  Electricidad
                </span>
                <span className="lp-job-status">
                  <span className="lp-dot"></span>Buscando
                </span>
              </div>
              <h3 className="lp-job-title">Instalación de aire acondicionado</h3>
              <p className="lp-job-desc">
                Necesito instalar un split de 3000 frigorías en habitación. Pared de ladrillo, altura estándar.
              </p>
              <div className="lp-job-meta">
                <span className="lp-job-meta-item">
                  <span className="material-symbols-outlined">location_on</span>
                  San Martín
                </span>
                <span className="lp-job-meta-item">
                  <span className="material-symbols-outlined">schedule</span>
                  Fin de semana
                </span>
                <span className="lp-job-offers-count">1 oferta</span>
              </div>
            </div>

            <div className="lp-job-card">
              <div className="lp-job-card-header">
                <span className="lp-job-category">
                  <span className="material-symbols-outlined" style={{ fontSize: "12px", fontVariationSettings: "'FILL' 1" }}>
                    water_drop
                  </span>
                  Plomería
                </span>
                <span className="lp-job-status">
                  <span className="lp-dot"></span>Buscando
                </span>
              </div>
              <h3 className="lp-job-title">Pérdida de agua en baño</h3>
              <p className="lp-job-desc">
                Hay una pérdida debajo de la mesada del baño, moja el piso constantemente. Urge solución.
              </p>
              <div className="lp-job-meta">
                <span className="lp-job-meta-item">
                  <span className="material-symbols-outlined">location_on</span>
                  Belgrano
                </span>
                <span className="lp-job-meta-item">
                  <span className="material-symbols-outlined">schedule</span>
                  Urgente
                </span>
                <span className="lp-job-offers-count">2 ofertas</span>
              </div>
            </div>

            <div className="lp-job-card">
              <div className="lp-job-card-header">
                <span className="lp-job-category">
                  <span className="material-symbols-outlined" style={{ fontSize: "12px", fontVariationSettings: "'FILL' 1" }}>
                    local_shipping
                  </span>
                  Fletes
                </span>
                <span className="lp-job-status"><span className="lp-dot"></span>Buscando</span>
              </div>
              <h3 className="lp-job-title">Mudanza pequeña de 2 ambientes</h3>
              <p className="lp-job-desc">Necesito mover muebles de un 2 ambientes a 15 cuadras. Hay heladera, cama y cómoda.</p>
              <div className="lp-job-meta">
                <span className="lp-job-meta-item">
                  <span className="material-symbols-outlined">location_on</span>
                  Don Bosco
                </span>
                <span className="lp-job-meta-item">
                  <span className="material-symbols-outlined">schedule</span>
                  Sábado AM
                </span>
                <span className="lp-job-offers-count">4 ofertas</span>
              </div>
            </div>

            <div className="lp-job-card">
              <div className="lp-job-card-header">
                <span className="lp-job-category">
                  <span className="material-symbols-outlined" style={{ fontSize: "12px", fontVariationSettings: "'FILL' 1" }}>
                    format_paint
                  </span>
                  Pinturería
                </span>
                <span className="lp-job-status"><span className="lp-dot"></span>Buscando</span>
              </div>
              <h3 className="lp-job-title">Pintar frente de la casa</h3>
              <p className="lp-job-desc">Pintar frente de casa de aprox. 8 metros lineales, incluye puerta y rejas. Pintura látex exterior.</p>
              <div className="lp-job-meta">
                <span className="lp-job-meta-item">
                  <span className="material-symbols-outlined">location_on</span>
                  Libertad
                </span>
                <span className="lp-job-meta-item">
                  <span className="material-symbols-outlined">schedule</span>
                  Esta semana
                </span>
                <span className="lp-job-offers-count">2 ofertas</span>
              </div>
            </div>

            <div className="lp-job-card">
              <div className="lp-job-card-header">
                <span className="lp-job-category">
                  <span className="material-symbols-outlined" style={{ fontSize: "12px", fontVariationSettings: "'FILL' 1" }}>
                    yard
                  </span>
                  Jardinería
                </span>
                <span className="lp-job-status"><span className="lp-dot"></span>Buscando</span>
              </div>
              <h3 className="lp-job-title">Corte de pasto y poda</h3>
              <p className="lp-job-desc">Jardín de 200m², pasto alto y árboles que necesitan poda. Trabajo para un día completo.</p>
              <div className="lp-job-meta">
                <span className="lp-job-meta-item">
                  <span className="material-symbols-outlined">location_on</span>
                  San Agustín
                </span>
                <span className="lp-job-meta-item">
                  <span className="material-symbols-outlined">schedule</span>
                  Flexible
                </span>
                <span className="lp-job-offers-count">1 oferta</span>
              </div>
            </div>
          </div>
          <div style={{ textAlign: "center", marginTop: "2.5rem" }}>
            <Link href={appLink} className="lp-btn-primary lp-reveal">
              Ver todos los pedidos activos
              <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>
                arrow_forward
              </span>
            </Link>
          </div>
        </div>
      </section>

      {/* CATEGORÍAS */}
      <section id="categorias" className="lp-section">
        <div className="lp-reveal lp-cats-section">
          <span className="lp-section-label">Categorías disponibles</span>
          <h2 className="lp-section-title">
            Un profesional para
            <br />
            <em>cada necesidad</em>
          </h2>
          <div className="lp-cats-grid">
            <div className="lp-cat-chip">
              <span className="material-symbols-outlined">water_drop</span>Plomería
            </div>
            <div className="lp-cat-chip">
              <span className="material-symbols-outlined">bolt</span>Electricidad
            </div>
            <div className="lp-cat-chip">
              <span className="material-symbols-outlined">local_shipping</span>Fletes
            </div>
            <div className="lp-cat-chip">
              <span className="material-symbols-outlined">mop</span>Limpieza
            </div>
            <div className="lp-cat-chip">
              <span className="material-symbols-outlined">yard</span>Jardinería
            </div>
            <div className="lp-cat-chip">
              <span className="material-symbols-outlined">construction</span>Albañilería
            </div>
            <div className="lp-cat-chip">
              <span className="material-symbols-outlined">key</span>Cerrajería
            </div>
            <div className="lp-cat-chip">
              <span className="material-symbols-outlined">format_paint</span>Pinturería
            </div>
            <div className="lp-cat-chip">
              <span className="material-symbols-outlined">pool</span>Piletero
            </div>
            <div className="lp-cat-chip">
              <span className="material-symbols-outlined">handyman</span>Manos Útiles
            </div>
            <div className="lp-cat-chip">
              <span className="material-symbols-outlined">ac_unit</span>Aire acondicionados
            </div>
            <div className="lp-cat-chip">
              <span className="material-symbols-outlined">home_repair_service</span>Electrodomésticos
            </div>
            <div className="lp-cat-chip">
              <span className="material-symbols-outlined">carpenter</span>Carpintería
            </div>
            <div className="lp-cat-chip">
              <span className="material-symbols-outlined">smartphone</span>Servicios digitales
            </div>
          </div>
        </div>
      </section>

      {/* MANIFIESTO */}
      <div style={{ padding: "0 1.5rem" }}>
        <div className="lp-manifiesto lp-reveal">
          <h2>
            El equipo de A mano hace
            <br />
            todo lo posible por <em>vos</em>
          </h2>
          <p>
            Somos vecinos de Formosa. Sabemos que conseguir un buen trabajador de confianza no es fácil. Por eso nos
            comprometemos personalmente con cada pedido que entra a la plataforma.
          </p>
          <Link href={isLoggedIn ? "/publicar" : "/login"} className="lp-btn-white">
            Publicar mi pedido ahora
            <span className="material-symbols-outlined" style={{ fontSize: "18px", color: "var(--lp-primary)" }}>
              arrow_forward
            </span>
          </Link>
        </div>
      </div>

      {/* PARA TRABAJADORES */}
      <section id="trabajadores" className="lp-section">
        <div className="lp-workers-section lp-reveal">
          <div>
            <span className="lp-section-label">Para trabajadores independientes</span>
            <h2 className="lp-section-title">
              Más clientes
              <br />
              sin esfuerzo de
              <br />
              <em>marketing</em>
            </h2>
            <p className="lp-section-subtitle" style={{ marginBottom: "2rem" }}>
              Si sos bueno en tu oficio pero no sabés cómo conseguir más clientes, A mano es para vos. Registrate gratis
              y empezá a recibir pedidos de tu zona.
            </p>
            <Link href={isLoggedIn ? "/perfil" : "/login"} className="lp-btn-primary">
              Registrarme como prestador
              <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>
                arrow_forward
              </span>
            </Link>
          </div>
          <div className="lp-workers-visual">
            <div className="lp-worker-benefit">
              <div className="lp-worker-benefit-icon">
                <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1", fontSize: "20px" }}>
                  groups
                </span>
              </div>
              <div>
                <h4>Más clientes sin salir a buscarlos</h4>
                <p>Los pedidos llegan solos a tu categoría. Vos solo decidís a cuáles ofertar.</p>
              </div>
            </div>
            <div className="lp-worker-benefit">
              <div className="lp-worker-benefit-icon">
                <span
                  className="material-symbols-outlined"
                  style={{ fontVariationSettings: "'FILL' 1", fontSize: "20px" }}
                >
                  payments
                </span>
              </div>
              <div>
                <h4>Pago garantizado antes de trabajar</h4>
                <p>El dinero está en A mano antes de que vayas al domicilio. Sin riesgo de que no te paguen.</p>
              </div>
            </div>
            <div className="lp-worker-benefit">
              <div className="lp-worker-benefit-icon">
                <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1", fontSize: "20px" }}>
                  star
                </span>
              </div>
              <div>
                <h4>Construí tu reputación digital</h4>
                <p>Cada trabajo completado suma calificaciones a tu perfil. Tu historial habla por vos.</p>
              </div>
            </div>
            <div className="lp-worker-benefit">
              <div className="lp-worker-benefit-icon">
                <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1", fontSize: "20px" }}>
                  sell
                </span>
              </div>
              <div>
                <h4>Solo pagás cuando ganás trabajo</h4>
                <p>Registrarte es gratis. Solo se descuenta el 10% cuando completás un trabajo.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* GARANTÍA */}
      <section style={{ background: "white", maxWidth: "100%", padding: "6rem 0" }}>
        <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "0 1.5rem" }}>
          <div className="lp-reveal">
            <span className="lp-section-label">Pago seguro</span>
            <h2 className="lp-section-title">
              Tu dinero está
              <br />
              <em>protegido</em> siempre
            </h2>
            <p className="lp-section-subtitle">
              El sistema de custodia de A mano garantiza que ninguna de las dos partes pueda ser perjudicada.
            </p>
          </div>
          <div className="lp-garantia-grid lp-reveal">
            <div className="lp-garantia-card">
              <div className="lp-icon">
                <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
                  lock
                </span>
              </div>
              <h3>Pago en custodia</h3>
              <p>El monto queda en manos de A mano hasta que confirmás que el trabajo fue realizado correctamente.</p>
            </div>
            <div className="lp-garantia-card">
              <div className="lp-icon">
                <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
                  verified_user
                </span>
              </div>
              <h3>Datos privados hasta el final</h3>
              <p>Tu dirección exacta solo se revela al prestador una vez que el pago es confirmado por el equipo.</p>
            </div>
            <div className="lp-garantia-card">
              <div className="lp-icon">
                <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
                  support_agent
                </span>
              </div>
              <h3>Respaldo humano real</h3>
              <p>Si algo no sale como esperabas, el equipo de A mano interviene directamente para resolver.</p>
            </div>
            <div className="lp-garantia-card">
              <div className="lp-icon">
                <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
                  receipt_long
                </span>
              </div>
              <h3>Historial permanente</h3>
              <p>Todos los trabajos, pagos y calificaciones quedan registrados en tu perfil para siempre.</p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="lp-section">
        <div className="lp-reveal">
          <span className="lp-section-label">Preguntas frecuentes</span>
          <h2 className="lp-section-title">
            Todo lo que
            <br />
            necesitás <em>saber</em>
          </h2>
        </div>
        <div className="lp-faq-list lp-reveal">
          {[
            {
              q: "¿Cuánto cuesta publicar un pedido?",
              a: "Publicar es completamente gratis para los solicitantes. Solo pagás el monto acordado con el prestador cuando aceptás una oferta. No hay costos ocultos ni comisiones adicionales para vos.",
            },
            {
              q: "¿Cómo sé que el trabajador es de confianza?",
              a: "Todos los prestadores registrados en A mano completaron su perfil con foto, nombre y datos de contacto. Además, cada trabajo completado genera una calificación pública que podés consultar antes de aceptar una oferta. El equipo de A mano monitorea la actividad de la plataforma.",
            },
            {
              q: "¿Qué pasa si el trabajo no se realiza bien?",
              a: "El pago no se libera hasta que vos confirmás que el trabajo fue realizado correctamente. Si hay algún problema, el equipo de A mano interviene como mediador. Tu dinero está seguro en todo momento.",
            },
            {
              q: "¿Cuánto cobra A mano al prestador?",
              a: "A mano retiene un 10% del monto del trabajo como comisión de servicio. El prestador recibe el 90% restante directamente en su cuenta. Registrarse es gratis, solo se cobra cuando se completa un trabajo exitosamente.",
            },
            {
              q: "¿En qué zonas opera A mano actualmente?",
              a: "Actualmente operamos en Formosa Capital y todos sus barrios. Estamos trabajando para expandirnos a otras localidades de la provincia próximamente.",
            },
            {
              q: "¿Cómo me registro como prestador?",
              a: "Entrás a la app, creás tu cuenta, completás tu perfil con foto, datos y las categorías en las que trabajás. Una vez completado el perfil podés empezar a ver pedidos y enviar ofertas de inmediato.",
            },
          ].map((item, i) => (
            <div key={i} className={`lp-faq-item ${openFaq === i ? "lp-open" : ""}`}>
              <div className="lp-faq-question" onClick={() => toggleFaq(i)}>
                {item.q}
                <span className="material-symbols-outlined lp-faq-arrow">expand_more</span>
              </div>
              <div className="lp-faq-answer">{item.a}</div>
            </div>
          ))}
        </div>
      </section>

      {/* FOOTER */}
      <footer className="lp-footer">
        <div className="lp-footer-logo">amano</div>
        <div className="lp-footer-tagline">Servicios para el hogar · Formosa, Argentina</div>
        <div className="lp-footer-links">
          <Link href={appLink}>Entrar a la app</Link>
          <a href="#como-funciona">Cómo funciona</a>
          <a href="#trabajadores">Para trabajadores</a>
          <a href="#faq">Preguntas frecuentes</a>
        </div>
        <div className="lp-footer-copy">© 2025 A mano · Formosa, Argentina · Todos los derechos reservados</div>
      </footer>
    </div>
  );
}
