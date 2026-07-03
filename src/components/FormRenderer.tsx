"use client";

// Rend une liste de champs à partir du schéma. Tous les contrôles sont conçus
// pour le tactile (zones de tap ≥ 44 px, gros libellés).

import { useMemo, useState } from "react";
import { OTHER_OPTION } from "@/lib/formSchema";
import { isVisible, percentageSum } from "@/lib/fieldLogic";
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

// ---------------------------------------------------------------------------
// Sous-composants
// ---------------------------------------------------------------------------

const inputCls =
  "w-full min-h-[44px] rounded-xl border border-neutral-300 dark:border-neutral-600 " +
  "bg-white dark:bg-neutral-800 px-3 py-2 text-base text-neutral-900 dark:text-neutral-100 " +
  "focus:outline-none focus:ring-2 focus:ring-blue-500";

const optionBtnCls = (active: boolean) =>
  `min-h-[44px] rounded-xl border px-4 py-2 text-base transition-colors select-none ${
    active
      ? "border-blue-600 bg-blue-600 text-white"
      : "border-neutral-300 bg-white text-neutral-800 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-200"
  }`;

function FieldLabel({ field }: { field: FormField }) {
  return (
    <div className="mb-1.5">
      <span className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">
        {field.label}
        {field.required && <span className="ml-1 text-red-500">*</span>}
      </span>
      {field.help && (
        <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">{field.help}</p>
      )}
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
      className={`${inputCls} mt-2`}
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
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => (
          <button
            key={opt}
            type="button"
            className={optionBtnCls(value === opt)}
            onClick={() => onChange(field.id, value === opt ? undefined : opt)}
          >
            {opt}
          </button>
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
      <div className="flex gap-2">
        {(["oui", "non"] as const).map((opt) => (
          <button
            key={opt}
            type="button"
            className={optionBtnCls(value === opt) + " min-w-[88px] capitalize"}
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
  const options = field.other ? [...(field.options ?? []), OTHER_OPTION] : field.options ?? [];
  const value = (values[field.id] as string[]) ?? [];
  const [search, setSearch] = useState("");
  const searchable = options.length > 10;
  const shown = useMemo(
    () =>
      search
        ? options.filter(
            (o) => o.toLowerCase().includes(search.toLowerCase()) || value.includes(o)
          )
        : options,
    [options, search, value]
  );
  const toggle = (opt: string) => {
    const next = value.includes(opt) ? value.filter((v) => v !== opt) : [...value, opt];
    onChange(field.id, next);
  };
  return (
    <div>
      <FieldLabel field={field} />
      {searchable && (
        <input
          type="search"
          className={`${inputCls} mb-2`}
          placeholder="Rechercher une option…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      )}
      <div className="flex flex-wrap gap-2">
        {shown.map((opt) => (
          <button key={opt} type="button" className={optionBtnCls(value.includes(opt))} onClick={() => toggle(opt)}>
            {opt}
          </button>
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
          <option value="">— Choisir —</option>
          {options.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
        {field.unit && <span className="text-sm text-neutral-500">{field.unit}</span>}
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
        {field.unit && <span className="whitespace-nowrap text-sm text-neutral-500">{field.unit}</span>}
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
        {field.unit && <span className="text-sm text-neutral-500">{field.unit}</span>}
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
        className={`${inputCls} min-h-[88px]`}
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
    <button
      type="button"
      className={`flex min-h-[44px] w-full items-center gap-3 rounded-xl border px-4 py-2 text-left ${
        checked
          ? "border-blue-600 bg-blue-50 dark:bg-blue-950"
          : "border-neutral-300 bg-white dark:border-neutral-600 dark:bg-neutral-800"
      }`}
      onClick={() => onChange(field.id, checked ? undefined : true)}
    >
      <span
        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border text-sm font-bold ${
          checked ? "border-blue-600 bg-blue-600 text-white" : "border-neutral-400 bg-white dark:bg-neutral-700"
        }`}
      >
        {checked ? "✓" : ""}
      </span>
      <span className="text-base text-neutral-800 dark:text-neutral-200">{field.label}</span>
    </button>
  );
}

function MeasureField({ field, values, onChange }: FormRendererProps & { field: FormField }) {
  const value = (values[field.id] as MeasureValue) ?? {};
  const update = (patch: Partial<MeasureValue>) => onChange(field.id, { ...value, ...patch });
  return (
    <div>
      <FieldLabel field={field} />
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="number"
          inputMode="decimal"
          className={`${inputCls} max-w-[140px]`}
          placeholder="Valeur"
          value={value.value ?? ""}
          onChange={(e) => update({ value: e.target.value || undefined })}
        />
        <div className="flex gap-1">
          {(field.units ?? []).map((u) => (
            <button
              key={u}
              type="button"
              className={optionBtnCls(value.unit === u) + " min-w-[56px]"}
              onClick={() => update({ unit: u })}
            >
              {u}
            </button>
          ))}
        </div>
        {field.withReference && (
          <input
            type="text"
            className={`${inputCls} flex-1 min-w-[160px]`}
            placeholder="Référence"
            value={value.reference ?? ""}
            onChange={(e) => update({ reference: e.target.value || undefined })}
          />
        )}
      </div>
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
          className={`${inputCls} mb-2`}
          placeholder="Rechercher…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      )}
      <div className="space-y-1.5">
        {shown.map((opt) => {
          const item = value[opt];
          const on = item?.checked === true;
          return (
            <div
              key={opt}
              className={`rounded-xl border px-3 py-2 ${
                on
                  ? "border-blue-500 bg-blue-50 dark:border-blue-500 dark:bg-blue-950"
                  : "border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-800"
              }`}
            >
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md border text-sm font-bold ${
                    on ? "border-blue-600 bg-blue-600 text-white" : "border-neutral-400 bg-white dark:bg-neutral-700"
                  }`}
                  onClick={() => update(opt, { checked: !on })}
                  aria-label={opt}
                >
                  {on ? "✓" : ""}
                </button>
                <button
                  type="button"
                  className="min-h-[36px] flex-1 text-left text-base text-neutral-800 dark:text-neutral-200"
                  onClick={() => update(opt, { checked: !on })}
                >
                  {opt}
                </button>
                {on && !field.noQuantity && (
                  <input
                    type="text"
                    inputMode="decimal"
                    className="w-24 min-h-[40px] rounded-lg border border-neutral-300 bg-white px-2 text-base dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100"
                    placeholder={field.quantityLabel ?? "Qté"}
                    value={item?.quantity ?? ""}
                    onChange={(e) => update(opt, { quantity: e.target.value || undefined })}
                  />
                )}
              </div>
              {on && field.withNote && (
                <input
                  type="text"
                  className={`${inputCls} mt-2 min-h-[40px]`}
                  placeholder="Note / détail"
                  value={item?.note ?? ""}
                  onChange={(e) => update(opt, { note: e.target.value || undefined })}
                />
              )}
              {on && opt === OTHER_OPTION && (
                <input
                  type="text"
                  className={`${inputCls} mt-2 min-h-[40px]`}
                  placeholder="Précisez…"
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
  const dimInput =
    "w-full min-h-[40px] rounded-lg border border-neutral-300 bg-white px-2 text-base " +
    "dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100";
  return (
    <div>
      <FieldLabel field={field} />
      <div className="space-y-1.5">
        {options.map((opt) => {
          const item = value[opt];
          const on = item?.checked === true;
          return (
            <div
              key={opt}
              className={`rounded-xl border px-3 py-2 ${
                on
                  ? "border-blue-500 bg-blue-50 dark:border-blue-500 dark:bg-blue-950"
                  : "border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-800"
              }`}
            >
              <button
                type="button"
                className="flex min-h-[36px] w-full items-center gap-3 text-left"
                onClick={() => update(opt, { checked: !on })}
              >
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md border text-sm font-bold ${
                    on ? "border-blue-600 bg-blue-600 text-white" : "border-neutral-400 bg-white dark:bg-neutral-700"
                  }`}
                >
                  {on ? "✓" : ""}
                </span>
                <span className="text-base text-neutral-800 dark:text-neutral-200">{opt}</span>
              </button>
              {on && (
                <div className="mt-2 grid grid-cols-3 gap-2">
                  <input
                    type="text"
                    inputMode="decimal"
                    className={dimInput}
                    placeholder="Longueur"
                    value={item?.length ?? ""}
                    onChange={(e) => update(opt, { length: e.target.value || undefined })}
                  />
                  <input
                    type="text"
                    inputMode="decimal"
                    className={dimInput}
                    placeholder="Largeur"
                    value={item?.width ?? ""}
                    onChange={(e) => update(opt, { width: e.target.value || undefined })}
                  />
                  <input
                    type="text"
                    inputMode="decimal"
                    className={dimInput}
                    placeholder="Aire"
                    value={item?.area ?? ""}
                    onChange={(e) => update(opt, { area: e.target.value || undefined })}
                  />
                </div>
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
      <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
        {options.map((opt) => (
          <div
            key={opt}
            className="flex min-h-[44px] items-center justify-between gap-2 rounded-xl border border-neutral-200 bg-white px-3 py-1.5 dark:border-neutral-700 dark:bg-neutral-800"
          >
            <span className="text-base text-neutral-800 dark:text-neutral-200">{opt}</span>
            <div className="flex items-center gap-1">
              <input
                type="number"
                inputMode="numeric"
                min={0}
                max={100}
                className="w-20 min-h-[40px] rounded-lg border border-neutral-300 bg-white px-2 text-right text-base dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100"
                value={value[opt] ?? ""}
                onChange={(e) => update(opt, e.target.value)}
              />
              <span className="text-sm text-neutral-500">%</span>
            </div>
          </div>
        ))}
      </div>
      <p className={`mt-1.5 text-sm font-medium ${sum > 100 ? "text-red-600" : "text-neutral-500"}`}>
        Total : {sum} %{sum > 100 && " — dépasse 100 %"}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Rendu principal
// ---------------------------------------------------------------------------

export default function FormRenderer({ fields, values, onChange }: FormRendererProps) {
  return (
    <div className="space-y-5">
      {fields.map((field) => {
        if (!isVisible(field, values)) return null;
        const props = { field, fields, values, onChange };
        switch (field.type) {
          case "radio":
            return <RadioField key={field.id} {...props} />;
          case "yesno":
            return <YesNoField key={field.id} {...props} />;
          case "checkbox-group":
            return <CheckboxGroupField key={field.id} {...props} />;
          case "select":
            return <SelectField key={field.id} {...props} />;
          case "number":
            return <NumberField key={field.id} {...props} />;
          case "textarea":
            return <TextareaField key={field.id} {...props} />;
          case "checkbox":
            return <CheckboxField key={field.id} {...props} />;
          case "measure":
            return <MeasureField key={field.id} {...props} />;
          case "quantity-list":
            return <QuantityListField key={field.id} {...props} />;
          case "dims-list":
            return <DimsListField key={field.id} {...props} />;
          case "percentage-group":
            return <PercentageGroupField key={field.id} {...props} />;
          case "text":
          case "date":
          default:
            return <TextField key={field.id} {...props} />;
        }
      })}
    </div>
  );
}
