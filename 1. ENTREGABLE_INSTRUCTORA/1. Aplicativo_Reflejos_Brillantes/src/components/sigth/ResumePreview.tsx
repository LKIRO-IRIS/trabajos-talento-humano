"use client";

import * as React from "react";
import type { Resume } from "@/lib/resume";
import {
  formatDateRange,
  parseBullets,
} from "@/lib/resume";

interface ResumePreviewProps {
  resume: Resume;
  /** When true, the preview is rendered inside a printable container. */
  forPrint?: boolean;
}

/**
 * ATS-compliant single-column resume preview.
 *
 * CRITICAL ATS RULES enforced here:
 * - ONE single column (no CSS columns, no tables, no flexbox multi-col layouts).
 * - NO icons, NO emojis, NO graphics that confuse ATS parsers.
 * - Arial 11pt font.
 * - Real <ul><li> bullet lists (not • strings).
 * - "Funciones" + "Logros" of each job merged into one bullet list.
 * - Empty sections don't appear.
 * - Dates in text format: "marzo 2024 - Actualidad".
 * - ALWAYS white background with dark text, even in dark mode.
 */
export const ResumePreview = React.forwardRef<
  HTMLDivElement,
  ResumePreviewProps
>(function ResumePreview({ resume, forPrint = false }, ref) {
  const {
    nombre,
    cargo,
    correo,
    telefono,
    ciudad,
    enlace,
    foto,
    perfil,
    experiencias = [],
    educacion = [],
    habilidades,
  } = resume || {};

  const hasContact = !!(correo || telefono || ciudad || enlace);
  const hasPerfil = !!(perfil && perfil.trim());
  const hasExp = experiencias.some(
    (e) => e.cargo || e.empresa || e.funciones || e.logros,
  );
  const hasEdu = educacion.some((e) => e.titulo || e.institucion);
  const hasHab = !!(habilidades && habilidades.trim());
  const hasPhoto = !!foto;

  return (
    <div
      ref={ref}
      className={
        "ats-sheet mx-auto bg-white text-[#1B1B1B] " +
        (forPrint
          ? "rb-print-area w-full shadow-none"
          : "w-full shadow-xl border border-gray-200 rounded-sm")
      }
      style={{
        width: "100%",
        maxWidth: "800px",
        minHeight: forPrint ? "auto" : "1080px",
        padding: "32px 36px",
        boxSizing: "border-box",
      }}
    >
      {/* === Header: name + photo === */}
      <div
        style={{
          display: "block",
          overflow: "hidden",
        }}
      >
        {hasPhoto && (
          <img
            src={foto!}
            alt={`Foto de ${nombre || "candidato"}`}
            className="at-photo"
            style={{ float: "right" }}
          />
        )}
        {nombre && nombre.trim() && (
          <h1 className="at-name">{nombre}</h1>
        )}
        {cargo && cargo.trim() && (
          <div style={{ fontSize: "12pt", fontWeight: 700, color: "#2C3E50", marginBottom: "4px" }}>
            {cargo}
          </div>
        )}
        {hasContact && (
          <div className="at-contact">
            {correo && <span>{correo}</span>}
            {correo && telefono && <span> · </span>}
            {telefono && <span>{telefono}</span>}
            {telefono && ciudad && <span> · </span>}
            {ciudad && <span>{ciudad}</span>}
            {ciudad && enlace && <span> · </span>}
            {enlace && <span>{enlace}</span>}
          </div>
        )}
      </div>

      {/* === Perfil profesional === */}
      {hasPerfil && (
        <section>
          <h2 className="at-section">Perfil profesional</h2>
          <p style={{ margin: "4px 0 8px 0", textAlign: "justify" }}>
            {perfil.trim()}
          </p>
        </section>
      )}

      {/* === Experiencia laboral === */}
      {hasExp && (
        <section>
          <h2 className="at-section">Experiencia laboral</h2>
          {experiencias
            .filter(
              (e) => e.cargo || e.empresa || e.funciones || e.logros,
            )
            .map((exp) => {
              const range = formatDateRange(exp);
              const bullets = [
                ...parseBullets(exp.funciones),
                ...parseBullets(exp.logros),
              ];
              return (
                <div key={exp.id} className="at-job-block" style={{ marginBottom: "10px" }}>
                  {exp.cargo && (
                    <h3 className="at-job">{exp.cargo}</h3>
                  )}
                  {(exp.empresa || range) && (
                    <div className="at-meta">
                      {[exp.empresa, range].filter(Boolean).join(" — ")}
                    </div>
                  )}
                  {bullets.length > 0 && (
                    <ul className="at-bullets">
                      {bullets.map((b, i) => (
                        <li key={i}>{b}</li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
        </section>
      )}

      {/* === Educación === */}
      {hasEdu && (
        <section>
          <h2 className="at-section">Educación</h2>
          {educacion
            .filter((e) => e.titulo || e.institucion)
            .map((edu) => {
              const date =
                edu.fechaGradoMes || edu.fechaGradoAno
                  ? [
                      edu.fechaGradoMes,
                      edu.fechaGradoAno,
                    ]
                      .filter(Boolean)
                      .join(" ")
                  : "";
              return (
                <div key={edu.id} className="at-job-block" style={{ marginBottom: "8px" }}>
                  {edu.titulo && (
                    <h3 className="at-job">{edu.titulo}</h3>
                  )}
                  {(edu.institucion || date) && (
                    <div className="at-meta">
                      {[edu.institucion, date].filter(Boolean).join(" — ")}
                    </div>
                  )}
                </div>
              );
            })}
        </section>
      )}

      {/* === Habilidades === */}
      {hasHab && (
        <section>
          <h2 className="at-section">Habilidades</h2>
          <ul className="at-bullets">
            {parseBullets(habilidades).map((h, i) => (
              <li key={i}>{h}</li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
});
