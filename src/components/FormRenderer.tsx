"use client";

// Rend une liste de champs à partir du schéma — style compact (SPE-NotePad) :
// contrôles natifs, petites bordures, disposition en grille deux colonnes.
// Les champs « larges » (listes, matrices, textarea) occupent toute la largeur.

import { useMemo, useState } from "react";
import { OTHER_OPTION } from "@/lib/formSchema";
import { isVisible, percentageSum } from "@/lib/fieldLogic";
import { checkCls, helpCls, inputCls, inputSmCls, labelCls } from "./ui";
import type {
  DimsItem,
  FieldValue,
  FormField,
  MeasureValue,
  QuantityItem,
} from "@/lib/types";

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
      <div className="flex gap-4">
        {(["oui", "non"] as const).map((opt) => (
          <label
            key={opt}
            className="flex min-h-[32px] cursor-pointer items-center gap-1.5 text-sm capitalize text-slate-700 dark:text-slate-300"
          >
            <input
              type="radio"
              name={field.id}
              className={checkCls}
              checked={value === opt}
              onChange={() => onChange(field.id, opt)}
              onClick={() => {
                if (value === opt) onChange(field.id, undefined);
              }}
            />
            {opt}
          </label>
        ))}
      </div>
    </div>
  );
}

function CheckboxGroupField({ field, values, onChange }: FormRendererProps & { field: FormField }) {
  const options = field.other ? [...(field.options ?? []), OTHER_OPTION] : field.options ?? [];
  const value = (values[field.id] as string[]) ?? [];
  const [search, setSearch] = useState("");
  const searchable = options.length > 10;
  const shown = useMemo(
    () =>
      search
        ? options.filter((o) => o.toLowerCase().includes(search.toLowerCase()) || value.includes(o))
        : options,
    [options, search, value]
  );
  const toggle = (opt: string) => {
    const next = value.includes(opt) ? value.filter((v) => v !== opt) : [...value, opt];
    onChange(field.id, next.length ? next : undefined);
  };
  return (
    <div>
      <FieldLabel field={field} />
      {searchable && (
        <input
          type="search"
          className={`${inputSmCls} mb-2 w-full max-w-xs`}
          placeholder="Rechercher…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      )}
      <div className="grid grid-cols-1 gap-x-4 gap-y-1 sm:grid-cols-2 lg:grid-cols-3">
        {shown.map((opt) => (
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
  return (
    <div>
      <FieldLabel field={field} />
      <div className="flex items-center gap-2">
        <input
          type="number"
          inputMode="decimal"
          className={inputCls}
          min={field.min}
          max={field.max}
          step={field.step ?? "any"}
          value={value === undefined || value === null ? "" : String(value)}
          onChange={(e) => onChange(field.id, e.target.value === "" ? undefined : Number(e.target.value))}
        />
        {field.unit && <span className="whitespace-nowrap text-xs text-slate-500">{field.unit}</span>}
      </div>
    </div>
  );
}

function TextField({ field, values, onChange }: FormRendererProps & { field: FormField }) {
  const value = (values[field.id] as string) ?? "";
  return (
    <div>
      <FieldLabel field={field} />
      <div className="flex items-center gap-2">
        <input
          type={field.type === "date" ? "date" : "text"}
          className={inputCls}
          placeholder={field.placeholder}
          value={value}
          onChange={(e) => onChange(field.id, e.target.value || undefined)}
        />
        {field.unit && <span className="text-xs text-slate-500">{field.unit}</span>}
      </div>
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

function QuantityListField({ field, values, onChange }: FormRendererProps & { field: FormField }) {
  const options = field.other ? [...(field.options ?? []), OTHER_OPTION] : field.options ?? [];
  const value = (values[field.id] as Record<string, QuantityItem>) ?? {};
  const [search, setSearch] = useState("");
  const searchable = options.length > 10;
  const isOn = (opt: string) => value[opt]?.checked === true;
  const shown = search
    ? options.filter((o) => o.toLowerCase().includes(search.toLowerCase()) || isOn(o))
    : options;
  const update = (opt: string, patch: Partial<QuantityItem>) => {
    const current = value[opt] ?? { checked: false };
    onChange(field.id, { ...value, [opt]: { ...current, ...patch } });
  };
  return (
    <div>
      <FieldLabel field={field} />
      {searchable && (
        <input
          type="search"
          className={`${inputSmCls} mb-2 w-full max-w-xs`}
          placeholder="Rechercher…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      )}
      <div className="grid grid-cols-1 gap-x-6 gap-y-0.5 lg:grid-cols-2">
        {shown.map((opt) => {
          const item = value[opt];
          const on = item?.checked === true;
          return (
            <div key={opt} className="flex min-h-[34px] items-center gap-1.5 py-0.5">
              <input
                type="checkbox"
                className={checkCls}
                checked={on}
                onChange={(e) => update(opt, { checked: e.target.checked })}
                aria-label={opt}
              />
              <button
                type="button"
                className="flex-1 truncate text-left text-sm text-slate-700 dark:text-slate-300"
                onClick={() => update(opt, { checked: !on })}
              >
                {opt}
              </button>
              {on && !field.noQuantity && (
                <input
                  type="text"
                  inputMode="decimal"
                  className={`${inputSmCls} w-16 text-right`}
                  placeholder={field.quantityLabel ?? "Qté"}
                  value={item?.quantity ?? ""}
                  onChange={(e) => update(opt, { quantity: e.target.value || undefined })}
                />
              )}
              {on && (field.withNote || opt === OTHER_OPTION) && (
                <input
                  type="text"
                  className={`${inputSmCls} w-36 sm:w-44`}
                  placeholder={opt === OTHER_OPTION ? "Précisez…" : "Note"}
                  value={item?.note ?? ""}
                  onChange={(e) => update(opt, { note: e.target.value || undefined })}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DimsListField({ field, values, onChange }: FormRendererProps & { field: FormField }) {
  const options = field.options ?? [];
  const value = (values[field.id] as Record<string, DimsItem>) ?? {};
  const update = (opt: string, patch: Partial<DimsItem>) => {
    const current = value[opt] ?? { checked: false };
    onChange(field.id, { ...value, [opt]: { ...current, ...patch } });
  };
  return (
    <div>
      <FieldLabel field={field} />
      <div className="space-y-0.5">
        {options.map((opt) => {
          const item = value[opt];
          const on = item?.checked === true;
          return (
            <div key={opt} className="flex min-h-[34px] flex-wrap items-center gap-1.5 py-0.5">
              <input
                type="checkbox"
                className={checkCls}
                checked={on}
                onChange={(e) => update(opt, { checked: e.target.checked })}
                aria-label={opt}
              />
              <button
                type="button"
                className="min-w-[130px] flex-1 truncate text-left text-sm text-slate-700 dark:text-slate-300"
                onClick={() => update(opt, { checked: !on })}
              >
                {opt}
              </button>
              {on && (
                <>
                  <input
                    type="text"
                    inputMode="decimal"
                    className={`${inputSmCls} w-20`}
                    placeholder="Long."
                    value={item?.length ?? ""}
                    onChange={(e) => update(opt, { length: e.target.value || undefined })}
                  />
                  <input
                    type="text"
                    inputMode="decimal"
                    className={`${inputSmCls} w-20`}
                    placeholder="Larg."
                    value={item?.width ?? ""}
                    onChange={(e) => update(opt, { width: e.target.value || undefined })}
                  />
                  <input
                    type="text"
                    inputMode="decimal"
                    className={`${inputSmCls} w-20`}
                    placeholder="Aire"
                    value={item?.area ?? ""}
                    onChange={(e) => update(opt, { area: e.target.value || undefined })}
                  />
                </>
              )}
            </div>
          );
        })}
      </div>
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
  return (
    <div>
      <FieldLabel field={field} />
      <div className="grid grid-cols-1 gap-x-6 gap-y-0.5 sm:grid-cols-2 lg:grid-cols-3">
        {options.map((opt) => (
          <div key={opt} className="flex min-h-[34px] items-center justify-between gap-2 py-0.5">
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
            </div>
          </div>
        ))}
      </div>
      <p className={`mt-1 text-xs font-medium ${sum > 100 ? "text-red-600" : "text-slate-500"}`}>
        Total : {sum} %{sum > 100 && " — dépasse 100 %"}
      </p>
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
        const props = { field, fields, values, onChange };
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
            node = <QuantityListField {...props} />;
            break;
          case "dims-list":
            node = <DimsListField {...props} />;
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
