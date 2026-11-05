"use client";

import * as React from "react";
import { Plus, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { getCompanyTheme, type CompanyId } from "@/lib/analysis";
import {
  FormatShell,
  useFormatData,
  SectionTitle,
  FieldLabel,
  SignatureArea,
} from "@/components/sigth/gestion/FormatShell";

/* ================================================================== */
/*  Config types for the generic format renderer                      */
/* ================================================================== */

type FieldType = "text" | "date" | "textarea" | "select" | "number" | "checkbox";

export interface FieldDef {
  key: string;
  label: string;
  type: FieldType;
  placeholder?: string;
  options?: string[];
  fullWidth?: boolean;
  /** col-span on sm+ */
  span?: 1 | 2 | 3 | 4;
}

export interface TableDef {
  key: string;
  columns: string[];
  /** if defined, columns 1..N of `rows` will be checkboxes (boolean) */
  checkboxColumns?: string[];
  initialRows?: number;
}

export interface SignatureDef {
  key: string;
  label: string;
  role: string;
}

export interface GenericFormatConfig {
  formatId: string;
  formatName: string;
  sections: {
    title: string;
    fields?: FieldDef[];
    table?: TableDef;
    signatures?: SignatureDef[];
  }[];
}

interface GenericData {
  fields: Record<string, string>;
  booleans: Record<string, boolean>;
  tables: Record<string, Array<Record<string, string>>>;
  signatures: Record<string, { name: string; role: string; signature: string }>;
}

const uid = () => Math.random().toString(36).slice(2, 10);

function buildInitialData(cfg: GenericFormatConfig): GenericData {
  const fields: Record<string, string> = {};
  const booleans: Record<string, boolean> = {};
  const tables: Record<string, Array<Record<string, string>>> = {};
  const signatures: Record<string, { name: string; role: string; signature: string }> = {};

  cfg.sections.forEach((s) => {
    s.fields?.forEach((f) => {
      if (f.type === "checkbox") booleans[f.key] = false;
      else fields[f.key] = "";
    });
    if (s.table) {
      const cols = s.table.columns;
      const rows: Array<Record<string, string>> = [];
      const n = s.table.initialRows ?? 2;
      for (let i = 0; i < n; i++) {
        const row: Record<string, string> = {};
        cols.forEach((c) => (row[c] = ""));
        rows.push(row);
      }
      tables[s.table.key] = rows;
    }
    s.signatures?.forEach((sg) => {
      signatures[sg.key] = { name: "", role: sg.role, signature: "" };
    });
  });

  return { fields, booleans, tables, signatures };
}

/* ================================================================== */
/*  Renderer                                                           */
/* ================================================================== */

export function GenericFormat({
  config,
  company,
}: {
  config: GenericFormatConfig;
  company: CompanyId;
}) {
  const theme = getCompanyTheme(company);
  const accent = `#${theme.accent}`;
  const [data, setData, reset] = useFormatData<GenericData>(
    config.formatId,
    () => buildInitialData(config),
  );

  const setField = (key: string, value: string) =>
    setData((d) => ({ ...d, fields: { ...d.fields, [key]: value } }));
  const setBool = (key: string, value: boolean) =>
    setData((d) => ({ ...d, booleans: { ...d.booleans, [key]: value } }));
  const setTableRow = (tableKey: string, rowIdx: number, col: string, value: string) =>
    setData((d) => ({
      ...d,
      tables: {
        ...d.tables,
        [tableKey]: d.tables[tableKey].map((r, i) => (i === rowIdx ? { ...r, [col]: value } : r)),
      },
    }));
  const addTableRow = (tableKey: string, cols: string[]) =>
    setData((d) => {
      const newRow: Record<string, string> = {};
      cols.forEach((c) => (newRow[c] = ""));
      return {
        ...d,
        tables: { ...d.tables, [tableKey]: [...d.tables[tableKey], newRow] },
      };
    });
  const removeTableRow = (tableKey: string, rowIdx: number) =>
    setData((d) => ({
      ...d,
      tables: {
        ...d.tables,
        [tableKey]: d.tables[tableKey].filter((_, i) => i !== rowIdx),
      },
    }));
  const setSig = (key: string, next: { name: string; role: string; signature: string }) =>
    setData((d) => ({ ...d, signatures: { ...d.signatures, [key]: next } }));

  return (
    <FormatShell
      formatId={config.formatId}
      formatName={config.formatName}
      company={company}
      onReset={reset}
      exportData={data}
      onImport={(imported) => {
        if (imported && typeof imported === "object") {
          setData({ ...buildInitialData(config), ...(imported as Partial<GenericData>) });
        }
      }}
    >
      {config.sections.map((sec, sIdx) => (
        <React.Fragment key={sIdx}>
          <SectionTitle n={sIdx + 1} accent={accent}>
            {sec.title}
          </SectionTitle>

          {/* Fields */}
          {sec.fields && sec.fields.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
              {sec.fields.map((f) => {
                const span = f.span ?? (f.fullWidth ? 3 : 1);
                const colSpan =
                  span === 4 ? "sm:col-span-4" : span === 3 ? "sm:col-span-3" : span === 2 ? "sm:col-span-2" : "";
                return (
                  <div key={f.key} className={colSpan}>
                    <FieldLabel>{f.label}</FieldLabel>
                    {f.type === "textarea" ? (
                      <Textarea
                        value={data.fields[f.key] ?? ""}
                        onChange={(e) => setField(f.key, e.target.value)}
                        rows={3}
                        placeholder={f.placeholder}
                      />
                    ) : f.type === "select" ? (
                      <Select
                        value={data.fields[f.key] ?? ""}
                        onValueChange={(v) => setField(f.key, v)}
                      >
                        <SelectTrigger className="h-9 w-full">
                          <SelectValue placeholder={f.placeholder ?? "Seleccionar"} />
                        </SelectTrigger>
                        <SelectContent>
                          {(f.options ?? []).map((o) => (
                            <SelectItem key={o} value={o}>
                              {o}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : f.type === "checkbox" ? (
                      <label className="flex items-center gap-2 cursor-pointer mt-2">
                        <Checkbox
                          checked={data.booleans[f.key] ?? false}
                          onCheckedChange={(c) => setBool(f.key, Boolean(c))}
                        />
                        <span className="text-xs">{f.placeholder ?? "Sí"}</span>
                      </label>
                    ) : (
                      <Input
                        type={f.type === "date" ? "date" : f.type === "number" ? "number" : "text"}
                        value={data.fields[f.key] ?? ""}
                        onChange={(e) => setField(f.key, e.target.value)}
                        placeholder={f.placeholder}
                        className="h-9"
                      />
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Table */}
          {sec.table && (
            <div className="overflow-x-auto mb-3">
              <table className="w-full text-xs border border-border">
                <thead style={{ background: accent, color: "#fff" }}>
                  <tr>
                    {sec.table.columns.map((c) => (
                      <th key={c} className="p-2 text-left">
                        {c}
                      </th>
                    ))}
                    <th className="rb-no-print p-2 text-center w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {(data.tables[sec.table.key] ?? []).map((row, rIdx) => (
                    <tr key={rIdx} className="border-b border-border">
                      {sec.table.columns.map((c) => {
                        const isCheckbox = sec.table?.checkboxColumns?.includes(c);
                        return (
                          <td key={c} className="p-1">
                            {isCheckbox ? (
                              <div className="flex justify-center">
                                <Checkbox
                                  checked={row[c] === "Sí"}
                                  onCheckedChange={(v) =>
                                    setTableRow(sec.table!.key, rIdx, c, v ? "Sí" : "No")
                                  }
                                />
                              </div>
                            ) : (
                              <Input
                                value={row[c] ?? ""}
                                onChange={(e) =>
                                  setTableRow(sec.table!.key, rIdx, c, e.target.value)
                                }
                                className="h-8"
                              />
                            )}
                          </td>
                        );
                      })}
                      <td className="rb-no-print p-1 text-center">
                        <Button
                          size="sm"
                          variant="ghost"
                          type="button"
                          onClick={() => removeTableRow(sec.table!.key, rIdx)}
                          className="text-destructive h-7 px-2"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <Button
                size="sm"
                variant="outline"
                type="button"
                onClick={() => addTableRow(sec.table!.key, sec.table!.columns)}
                className="text-xs h-7 mt-2"
              >
                <Plus className="w-3 h-3 mr-1" /> Agregar fila
              </Button>
            </div>
          )}

          {/* Signatures */}
          {sec.signatures && sec.signatures.length > 0 && (
            <div
              className="grid gap-3 mb-4"
              style={{
                gridTemplateColumns: `repeat(${Math.min(sec.signatures.length, 3)}, minmax(0, 1fr))`,
              }}
            >
              {sec.signatures.map((sg) => (
                <SignatureArea
                  key={sg.key}
                  label={sg.label}
                  data={data.signatures[sg.key] ?? { name: "", role: sg.role, signature: "" }}
                  onChange={(next) => setSig(sg.key, next)}
                />
              ))}
            </div>
          )}
        </React.Fragment>
      ))}
    </FormatShell>
  );
}
