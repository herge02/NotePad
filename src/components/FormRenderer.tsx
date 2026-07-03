"use client";

// Rend une liste de champs à partir du schéma — compact, tactile, avec
// divulgation progressive : les listes longues passent par QuickSelect
// (sélections d'abord), la validation des requis se fait près du champ,
// sans jamais bloquer la saisie.

import { useState } from "react";
import QuickSelect from "./QuickSelect";
import { OTHER_OPTION } from "@/lib/formSchema";
import { isVisible, percentageSum } from "@/lib/fieldLogic";
import { setLast } from "@/lib/lastUsed";
import { checkCls, helpCls, inputCls, inputSmCls, labelCls, segCls } from "./ui";
import type { FieldValue, FormField, MeasureValue } from "@/lib/types";

export interface FormRendererProps {
  fields: FormField[];
  values: Record<string, FieldValue>;
  onChange: (fieldId: string, value: FieldValue) => void;
}

const WIDE_TYPES = new Set([
  "textarea",
  "checkbox-group",
  "quantity-list",
  "dims-list",
  "percentage-group",
  "measure",
  "radio",
]);

function FieldLabel({ field }: { field: FormField }) {
  return (
    <div className="mb-1">
      <span className={labelCls}>
        {field.label}
        {field.required && <span className="ml-0.5 text-red-500">*</span>}
      </span>
      {field.help && <p className={helpCls}>{field.help}</p>}
    </div>
  );
}

function RequiredHint({ field, values, touched }: { field: FormField; values: Record<string, FieldValue>; touched: boolean }) {
  const empty = values[field.id] === undefined || values[field.id] === "";
  if (!field.required || !touched || !empty) return null;
  return <p className="mt-0.5 text-xs text-amber-600">Champ requis</p>;
}

function OtherPrecision({
  fieldId,
  values,
  onChange,
}: {
  fieldId: string;
  values: Record<string, FieldValue>;
  onChange: FormRendererProps["onChange"];
}) {
  const key = `${fieldId}__autre`;
  return (
    <input
      type="text"
      className={`${inputSmCls} mt-1.5 w-full max-w-xs`}
      placeholder="Précisez…"
      value={(values[key] as string) ?? ""}
      onChange={(e) => onChange(key, e.target.value)}
    />
  );
}

function RadioField({ field, values, onChange }: FormRendererProps & { field: FormField }) {
  const options = field.other ? [...(field.options ?? []), OTHER_OPTION] : field.options ?? [];
  const value = values[field.id] as string | undefined;
  return (
    <div>
      <FieldLabel field={field} />
      <div className="flex flex-wrap gap-x-4 gap-y-1.5">
        {options.map((opt) => (
          <label
            key={opt}
            className="flex min-h-[32px] cursor-pointer items-center gap-1.5 text-sm text-slate-700 dark:text-slate-300"
          >
            <input
              type="radio"
              name={field.id}
              className={checkCls}
              checked={value === opt}
              onChange={() => onChange(field.id, opt)}
              onClick={() => {
                // re-taper l'option sélectionnée efface le choix
                if (value === opt) onChange(field.id, undefined);
              }}
            />
            {opt}
          </label>
        ))}
      </div>
      {field.other && value === OTHER_OPTION && (
        <OtherPrecision fieldId={field.id} values={values} onChange={onChange} />
      )}
    </div>
  );
}

function YesNoField({ field, values, onChange }: FormRendererProps & { field: FormField }) {
  const value = values[field.id] as string | undefined;
  return (
    <div>
      <FieldLabel field={field} />
      <div className="inline-flex">
        {(["oui", "non"] as const).map((opt) => (
          <button
            key={opt}
            type="button"
            className={segCls(value === opt) + " capitalize"}
            onClick={() => onChange(field.id, value === opt ? undefined : opt)}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}

function CheckboxGroupField({ field, values, onChange }: FormRendererProps & { field: FormField }) {
  const baseOptions = field.options ?? [];
  const value = (values[field.id] as string[]) ?? [];
  // listes longues : sélections d'abord (QuickSelect)
  if (baseOptions.length > 10) {
    return (
      <div>
        <FieldLabel field={field} />
        <QuickSelect field={field} value={values[field.id]} onChange={(v) => onChange(field.id, v)} />
        {field.other && value.includes(OTHER_OPTION) && (
          <OtherPrecision fieldId={field.id} values={values} onChange={onChange} />
        )}
      </div>
    );
  }
  const options = field.other ? [...baseOptions, OTHER_OPTION] : baseOptions;
  const toggle = (opt: string) => {
    const next = value.includes(opt) ? value.filter((v) => v !== opt) : [...value, opt];
    onChange(field.id, next.length ? next : undefined);
  };
  return (
    <div>
      <FieldLabel field={field} />
      <div className="grid grid-cols-1 gap-x-4 gap-y-1 sm:grid-cols-2 lg:grid-cols-3">
        {options.map((opt) => (
          <label
            key={opt}
            className="flex min-h-[32px] cursor-pointer items-center gap-1.5 text-sm text-slate-700 dark:text-slate-300"
          >
            <input type="checkbox" className={checkCls} checked={value.includes(opt)} onChange={() => toggle(opt)} />
            <span className="truncate">{opt}</span>
          </label>
        ))}
      </div>
      {field.other && value.includes(OTHER_OPTION) && (
        <OtherPrecision fieldId={field.id} values={values} onChange={onChange} />
      )}
    </div>
  );
}

function SelectField({ field, values, onChange }: FormRendererProps & { field: FormField }) {
  const options = field.other ? [...(field.options ?? []), OTHER_OPTION] : field.options ?? [];
  const value = (values[field.id] as string) ?? "";
  return (
    <div>
      <FieldLabel field={field} />
      <div className="flex items-center gap-2">
        <select className={inputCls} value={value} onChange={(e) => onChange(field.id, e.target.value || undefined)}>
          <option value="">—</option>
          {options.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
        {field.unit && <span className="text-xs text-slate-500">{field.unit}</span>}
      </div>
      {field.other && value === OTHER_OPTION && (
        <OtherPrecision fieldId={field.id} values={values} onChange={onChange} />
      )}
    </div>
  );
}

function NumberField({ field, values, onChange }: FormRendererProps & { field: FormField }) {
  const value = values[field.id];
  const [touched, setTouched] = useState(false);
  const num = value === undefined || value === null ? undefined : Number(value);
  const outOfRange =
    num !== undefined &&
    ((field.min !== undefined && num < field.min) || (field.max !== undefined && num > field.max));
  return (
    <div>
      <FieldLabel field={field} />
      <div className="flex items-center gap-2">
        <input
          type="number"
          inputMode="decimal"
          className={inputCls + (outOfRange ? " !border-amber-500" : "")}
          min={field.min}
          max={field.max}
          step={field.step ?? "any"}
          value={value === undefined || value === null ? "" : String(value)}
          onBlur={() => setTouched(true)}
          onChange={(e) => onChange(field.id, e.target.value === "" ? undefined : Number(e.target.value))}
        />
        {field.unit && <span className="whitespace-nowrap text-xs text-slate-500">{field.unit}</span>}
      </div>
      {outOfRange && (
        <p className="mt-0.5 text-xs text-amber-600">
          Vérifiez la valeur ({field.min ?? "…"}–{field.max ?? "…"})
        </p>
      )}
      <RequiredHint field={field} values={values} touched={touched} />
    </div>
  );
}

function TextField({ field, values, onChange }: FormRendererProps & { field: FormField }) {
  const value = (values[field.id] as string) ?? "";
  const [touched, setTouched] = useState(false);
  return (
    <div>
      <FieldLabel field={field} />
      <div className="flex items-center gap-2">
        <input
          type={field.type === "date" ? "date" : "text"}
          className={inputCls}
          placeholder={field.placeholder}
          value={value}
          onBlur={() => setTouched(true)}
          onChange={(e) => onChange(field.id, e.target.value || undefined)}
        />
        {field.unit && <span className="text-xs text-slate-500">{field.unit}</span>}
      </div>
      <RequiredHint field={field} values={values} touched={touched} />
    </div>
  );
}

function TextareaField({ field, values, onChange }: FormRendererProps & { field: FormField }) {
  const value = (values[field.id] as string) ?? "";
  return (
    <div>
      <FieldLabel field={field} />
      <textarea
        className={`${inputCls} min-h-[72px]`}
        rows={3}
        placeholder={field.placeholder}
        value={value}
        onChange={(e) => onChange(field.id, e.target.value || undefined)}
      />
    </div>
  );
}

function CheckboxField({ field, values, onChange }: FormRendererProps & { field: FormField }) {
  const checked = values[field.id] === true;
  return (
    <label className="flex min-h-[32px] cursor-pointer items-center gap-1.5 self-end text-sm text-slate-700 dark:text-slate-300">
      <input
        type="checkbox"
        className={checkCls}
        checked={checked}
        onChange={(e) => onChange(field.id, e.target.checked ? true : undefined)}
      />
      {field.label}
      {field.help && <span className={helpCls}>({field.help})</span>}
    </label>
  );
}

function MeasureField({ field, values, onChange }: FormRendererProps & { field: FormField }) {
  const value = (values[field.id] as MeasureValue) ?? {};
  const update = (patch: Partial<MeasureValue>) => onChange(field.id, { ...value, ...patch });
  return (
    <div className="grid grid-cols-[minmax(140px,200px)_100px_80px_1fr] items-center gap-2">
      <span className={labelCls}>{field.label}</span>
      <input
        type="number"
        inputMode="decimal"
        className={inputSmCls}
        placeholder="Valeur"
        value={value.value ?? ""}
        onChange={(e) => update({ value: e.target.value || undefined })}
      />
      <select
        className={inputSmCls}
        value={value.unit ?? ""}
        onChange={(e) => update({ unit: e.target.value || undefined })}
      >
        <option value="">unité</option>
        {(field.units ?? []).map((u) => (
          <option key={u} value={u}>
            {u}
          </option>
        ))}
      </select>
      {field.withReference ? (
        <input
          type="text"
          className={inputSmCls}
          placeholder="Référence"
          value={value.reference ?? ""}
          onChange={(e) => update({ reference: e.target.value || undefined })}
        />
      ) : (
        <span />
      )}
    </div>
  );
}

function PercentageGroupField({ field, values, onChange }: FormRendererProps & { field: FormField }) {
  const options = field.other ? [...(field.options ?? []), OTHER_OPTION] : field.options ?? [];
  const value = (values[field.id] as Record<string, number>) ?? {};
  const sum = percentageSum(value);
  const update = (opt: string, raw: string) => {
    const next = { ...value };
    if (raw === "") {
      delete next[opt];
    } else {
      next[opt] = Math.max(0, Math.min(100, Number(raw)));
    }
    onChange(field.id, Object.keys(next).length ? next : undefined);
  };
  // sélections d'abord : seules les options saisies + un ajout à la demande
  const selected = options.filter((o) => value[o] !== undefined);
  const [adding, setAdding] = useState(false);
  const available = options.filter((o) => value[o] === undefined);
  return (
    <div>
      <FieldLabel field={field} />
      {selected.length > 0 && (
        <div className="mb-1.5 space-y-0.5">
          {selected.map((opt) => (
            <div key={opt} className="flex min-h-[36px] items-center justify-between gap-2">
              <span className="truncate text-sm text-slate-700 dark:text-slate-300">{opt}</span>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={100}
                  className={`${inputSmCls} w-16 text-right`}
                  value={value[opt] ?? ""}
                  onChange={(e) => update(opt, e.target.value)}
                />
                <span className="text-xs text-slate-400">%</span>
                <button
                  type="button"
                  className="h-8 w-8 rounded-md text-sm text-red-600"
                  onClick={() => update(opt, "")}
                  aria-label={`Retirer ${opt}`}
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      {adding ? (
        <div className="flex flex-wrap gap-1.5">
          {available.map((opt) => (
            <button
              key={opt}
              type="button"
              className="min-h-[36px] rounded-full border border-slate-300 px-3 text-sm text-slate-700 dark:border-slate-600 dark:text-slate-200"
              onClick={() => {
                update(opt, selected.length === 0 ? "100" : "0");
                setAdding(false);
              }}
            >
              + {opt}
            </button>
          ))}
        </div>
      ) : (
        <button
          type="button"
          className="min-h-[36px] rounded-md px-2 text-sm text-blue-600"
          onClick={() => setAdding(true)}
        >
          + Ajouter{selected.length === 0 ? " (1er choix = 100 %)" : ""}
        </button>
      )}
      {selected.length > 0 && (
        <p className={`mt-1 text-xs font-medium ${sum > 100 ? "text-red-600" : "text-slate-500"}`}>
          Total : {sum} %{sum > 100 && " — dépasse 100 %"}
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Rendu principal — grille compacte, les champs larges prennent 2 colonnes
// ---------------------------------------------------------------------------

export default function FormRenderer({ fields, values, onChange }: FormRendererProps) {
  return (
    <div className="grid grid-cols-1 gap-x-6 gap-y-4 md:grid-cols-2">
      {fields.map((field) => {
        if (!isVisible(field, values)) return null;
        const handleChange: FormRendererProps["onChange"] = (fid, v) => {
          if (fid === field.id && field.rememberLast && typeof v === "string" && v) {
            setLast(field.id, v);
          }
          onChange(fid, v);
        };
        const props = { field, fields, values, onChange: handleChange };
        let node: React.ReactNode;
        switch (field.type) {
          case "radio":
            node = <RadioField {...props} />;
            break;
          case "yesno":
            node = <YesNoField {...props} />;
            break;
          case "checkbox-group":
            node = <CheckboxGroupField {...props} />;
            break;
          case "select":
            node = <SelectField {...props} />;
            break;
          case "number":
            node = <NumberField {...props} />;
            break;
          case "textarea":
            node = <TextareaField {...props} />;
            break;
          case "checkbox":
            node = <CheckboxField {...props} />;
            break;
          case "measure":
            node = <MeasureField {...props} />;
            break;
          case "quantity-list":
          case "dims-list":
            node = (
              <div>
                <FieldLabel field={field} />
                <QuickSelect
                  field={field}
                  value={values[field.id]}
                  onChange={(v) => handleChange(field.id, v)}
                />
              </div>
            );
            break;
          case "percentage-group":
            node = <PercentageGroupField {...props} />;
            break;
          case "text":
          case "date":
          default:
            node = <TextField {...props} />;
        }
        const wide = WIDE_TYPES.has(field.type);
        return (
          <div key={field.id} className={wide ? "md:col-span-2" : undefined}>
            {node}
          </div>
        );
      })}
    </div>
  );
}
