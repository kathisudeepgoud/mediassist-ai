import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { ManualParameter, ManualParameterFormData, ParameterPreset } from '@/types/manualEntry'
import { Activity, Sparkles, Plus, Trash2, FileCheck2, Loader2 } from 'lucide-react'

interface ManualEntryModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (data: ManualParameterFormData, id?: string) => void
  onSaveBatch?: (dataList: ManualParameterFormData[]) => void
  initialData?: ManualParameter | null
}

const EXTENDED_PRESETS: ParameterPreset[] = [
  // Diabetes & Metabolic
  { parameter: 'Blood Sugar (Fasting)', unit: 'mg/dL', reference: '70–99', category: 'Diabetes' },
  { parameter: 'HbA1c Level', unit: '%', reference: '4.0–5.6', category: 'Diabetes' },
  { parameter: 'Body Mass Index (BMI)', unit: 'kg/m²', reference: '18.5–24.9', category: 'Metabolic' },
  { parameter: 'Post Glucose (2hr)', unit: 'mg/dL', reference: '< 140', category: 'Diabetes' },
  // Demographics & History
  { parameter: 'Age', unit: 'years', reference: '18–80', category: 'Demographics' },
  { parameter: 'Gender', unit: 'sex', reference: 'Female/Male', category: 'Demographics' },
  { parameter: 'Hypertension Status', unit: 'binary', reference: '0', category: 'Vitals' },
  { parameter: 'Heart Disease History', unit: 'binary', reference: '0', category: 'Vitals' },
  { parameter: 'Smoking History', unit: 'status', reference: 'never', category: 'History' },
  // Hematology & CBC
  { parameter: 'Hemoglobin (Hb)', unit: 'g/dL', reference: '12.0–16.0', category: 'CBC' },
  { parameter: 'Total WBC Count', unit: 'cells/cumm', reference: '4000–11000', category: 'CBC' },
  { parameter: 'Platelet Count', unit: 'lakhs/cumm', reference: '1.5–4.5', category: 'CBC' },
  // Lipids & Cardiovascular
  { parameter: 'Total Cholesterol', unit: 'mg/dL', reference: '< 200', category: 'Lipids' },
  { parameter: 'HDL Cholesterol', unit: 'mg/dL', reference: '> 40', category: 'Lipids' },
  { parameter: 'LDL Cholesterol', unit: 'mg/dL', reference: '< 100', category: 'Lipids' },
  { parameter: 'Triglycerides', unit: 'mg/dL', reference: '< 150', category: 'Lipids' },
  { parameter: 'Blood Pressure', unit: 'mmHg', reference: '120/80', category: 'Vitals' },
  { parameter: 'Heart Rate (Pulse)', unit: 'bpm', reference: '60–100', category: 'Vitals' },
  // Renal & Liver
  { parameter: 'Serum Creatinine', unit: 'mg/dL', reference: '0.6–1.2', category: 'Kidney' },
  { parameter: 'Blood Urea Nitrogen (BUN)', unit: 'mg/dL', reference: '7–20', category: 'Kidney' },
  { parameter: 'SGPT / ALT', unit: 'U/L', reference: '7–56', category: 'Liver' },
  { parameter: 'SGOT / AST', unit: 'U/L', reference: '10–40', category: 'Liver' },
  // Vitamins & Thyroid
  { parameter: 'Vitamin D (25-OH)', unit: 'ng/mL', reference: '30–100', category: 'Vitamins' },
  { parameter: 'Vitamin B12', unit: 'pg/mL', reference: '200–900', category: 'Vitamins' },
  { parameter: 'TSH (Thyroid)', unit: 'uIU/mL', reference: '0.4–4.0', category: 'Hormones' },
]

interface ParameterBlock {
  parameter: string
  value: string
  unit: string
  reference: string
  errorParam?: string
  errorVal?: string
}

export const ManualEntryModal: React.FC<ManualEntryModalProps> = ({
  isOpen,
  onClose,
  onSave,
  onSaveBatch,
  initialData,
}) => {
  const [blocks, setBlocks] = useState<ParameterBlock[]>([
    { parameter: '', value: '', unit: '', reference: '' },
  ])
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (initialData) {
      setBlocks([
        {
          parameter: initialData.parameter || '',
          value: initialData.value || '',
          unit: initialData.unit || '',
          reference: initialData.reference || '',
        },
      ])
    } else {
      resetForm()
    }
  }, [initialData, isOpen])

  const resetForm = () => {
    setBlocks([{ parameter: '', value: '', unit: '', reference: '' }])
    setIsSaving(false)
  }

  const handleAddParameter = () => {
    setBlocks((prev) => [
      ...prev,
      { parameter: '', value: '', unit: '', reference: '' },
    ])
  }

  const handleRemoveBlock = (index: number) => {
    if (blocks.length <= 1) return
    setBlocks((prev) => prev.filter((_, i) => i !== index))
  }

  const handleBlockChange = (index: number, field: keyof ParameterBlock, val: string) => {
    setBlocks((prev) =>
      prev.map((block, i) => {
        if (i === index) {
          const updated = { ...block, [field]: val }
          if (field === 'parameter' && val.trim()) updated.errorParam = undefined
          if (field === 'value' && val.trim()) updated.errorVal = undefined
          return updated
        }
        return block
      })
    )
  }

  const handleSelectPreset = (preset: ParameterPreset) => {
    setBlocks((prev) => {
      const lastIdx = prev.length - 1
      const lastBlock = prev[lastIdx]

      if (lastBlock && !lastBlock.parameter.trim() && !lastBlock.value.trim()) {
        return prev.map((b, i) =>
          i === lastIdx
            ? {
                ...b,
                parameter: preset.parameter,
                unit: preset.unit,
                reference: preset.reference,
              }
            : b
        )
      } else {
        return [
          ...prev,
          {
            parameter: preset.parameter,
            value: '',
            unit: preset.unit,
            reference: preset.reference,
          },
        ]
      }
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isSaving) return

    let hasErrors = false
    const validatedBlocks = blocks.map((block) => {
      const bErr = { ...block }
      if (!bErr.parameter.trim()) {
        bErr.errorParam = 'Parameter Name is required'
        hasErrors = true
      }
      if (!bErr.value.trim()) {
        bErr.errorVal = 'Value is required'
        hasErrors = true
      }
      return bErr
    })

    if (hasErrors) {
      setBlocks(validatedBlocks)
      return
    }

    const payloadList: ManualParameterFormData[] = blocks.map((b) => ({
      parameter: b.parameter.trim(),
      value: b.value.trim(),
      unit: b.unit.trim() || undefined,
      reference: b.reference.trim() || undefined,
    }))

    setIsSaving(true)
    try {
      if (initialData) {
        await onSave(payloadList[0], initialData.id)
      } else if (onSaveBatch) {
        await onSaveBatch(payloadList)
      } else {
        payloadList.forEach((item) => onSave(item))
      }
      resetForm()
      onClose()
    } catch {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !isSaving && onClose()}>
      <DialogContent className="sm:max-w-[620px] max-h-[90vh] overflow-y-auto border border-mist-200 bg-white p-6 shadow-xl text-ink">
        <DialogHeader className="border-b border-mist-100 pb-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-600">
              <Activity className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-ink">
                {initialData ? 'Edit Health Parameter' : 'Add Health Parameters'}
              </DialogTitle>
              <DialogDescription className="text-xs text-ink-soft">
                Enter your lab values manually. Every entry will be saved as a separate medical report.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {/* Presets Banner matching App White/Teal Palette */}
          {!initialData && (
            <div className="rounded-xl border border-mist-200 bg-mist-50/80 p-3.5">
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-teal-800">
                  <Sparkles className="h-3.5 w-3.5 text-teal-600" />
                  <span>Quick Presets ({EXTENDED_PRESETS.length} Suggestions)</span>
                </div>
                <span className="text-[10px] text-ink-soft">Click to insert</span>
              </div>
              <div className="flex max-h-[115px] flex-wrap gap-1.5 overflow-y-auto pr-1">
                {EXTENDED_PRESETS.map((preset) => (
                  <button
                    key={preset.parameter}
                    type="button"
                    onClick={() => handleSelectPreset(preset)}
                    disabled={isSaving}
                    className="rounded-lg border border-mist-200 bg-white px-2.5 py-1 text-xs font-medium text-ink-soft transition-all hover:border-teal-400 hover:bg-teal-50 hover:text-teal-800 disabled:opacity-50"
                  >
                    + {preset.parameter}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Dynamic Parameter Blocks */}
          <div className="space-y-4">
            {blocks.map((block, idx) => (
              <div
                key={idx}
                className="relative space-y-3 rounded-xl border border-mist-200 bg-white p-4 shadow-2xs"
              >
                {/* Header row for multi-blocks */}
                {blocks.length > 1 && (
                  <div className="flex items-center justify-between border-b border-mist-100 pb-2">
                    <span className="text-xs font-bold text-teal-700">
                      Parameter #{idx + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveBlock(idx)}
                      disabled={isSaving}
                      className="flex items-center gap-1 text-xs font-semibold text-rose-500 transition-colors hover:text-rose-700 disabled:opacity-50"
                      title="Remove Parameter"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Remove
                    </button>
                  </div>
                )}

                {/* FIRST LINE: Parameter Name */}
                <div className="space-y-1">
                  <Label htmlFor={`param-${idx}`} className="text-xs font-semibold text-ink">
                    Parameter Name <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    id={`param-${idx}`}
                    placeholder="e.g. Blood Sugar, HbA1c, BMI, Hemoglobin, Cholesterol"
                    value={block.parameter}
                    disabled={isSaving}
                    onChange={(e) => handleBlockChange(idx, 'parameter', e.target.value)}
                    className={block.errorParam ? 'border-rose-400 focus-visible:ring-rose-400' : ''}
                  />
                  {block.errorParam && (
                    <p className="text-[11px] font-medium text-rose-500">{block.errorParam}</p>
                  )}
                </div>

                {/* SECOND LINE: Remaining three (Value, Unit, Reference Range) */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor={`val-${idx}`} className="text-xs font-semibold text-ink">
                      Value <span className="text-rose-500">*</span>
                    </Label>
                    <Input
                      id={`val-${idx}`}
                      placeholder="e.g. 105, 6.5, 120/80"
                      value={block.value}
                      disabled={isSaving}
                      onChange={(e) => handleBlockChange(idx, 'value', e.target.value)}
                      className={block.errorVal ? 'border-rose-400 focus-visible:ring-rose-400' : ''}
                    />
                    {block.errorVal && (
                      <p className="text-[11px] font-medium text-rose-500">{block.errorVal}</p>
                    )}
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor={`unit-${idx}`} className="text-xs font-semibold text-ink">
                      Unit <span className="text-[10px] font-normal text-ink-soft">(optional)</span>
                    </Label>
                    <Input
                      id={`unit-${idx}`}
                      placeholder="e.g. mg/dL, %, mmHg"
                      value={block.unit}
                      disabled={isSaving}
                      onChange={(e) => handleBlockChange(idx, 'unit', e.target.value)}
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor={`ref-${idx}`} className="text-xs font-semibold text-ink">
                      Range <span className="text-[10px] font-normal text-ink-soft">(optional)</span>
                    </Label>
                    <Input
                      id={`ref-${idx}`}
                      placeholder="e.g. 70–110, < 200"
                      value={block.reference}
                      disabled={isSaving}
                      onChange={(e) => handleBlockChange(idx, 'reference', e.target.value)}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Simple Button to Add Another Parameter */}
          {!initialData && (
            <div className="pt-1">
              <Button
                type="button"
                variant="outline"
                disabled={isSaving}
                onClick={handleAddParameter}
                className="flex w-full items-center justify-center gap-2 border-dashed border-teal-500/50 bg-teal-50/40 text-xs font-semibold text-teal-700 transition-colors hover:bg-teal-100/60"
              >
                <Plus className="h-4 w-4" />
                Add Another Parameter Field
              </Button>
            </div>
          )}

          <DialogFooter className="gap-2 border-t border-mist-100 pt-4">
            <Button
              type="button"
              variant="outline"
              disabled={isSaving}
              onClick={() => {
                resetForm()
                onClose()
              }}
              className="text-ink-soft"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSaving}
              className="flex items-center gap-1.5 bg-teal-600 font-bold text-white shadow-xs hover:bg-teal-700 disabled:opacity-75"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Saving Report…
                </>
              ) : (
                <>
                  <FileCheck2 className="h-4 w-4" />
                  {initialData
                    ? 'Update Parameter'
                    : blocks.length > 1
                    ? `Save Report (${blocks.length} Vitals)`
                    : 'Save Report'}
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
