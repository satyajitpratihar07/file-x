import { Check, UploadCloud, Zap, Download } from 'lucide-react';

export type StepState = 'upload' | 'convert' | 'download';

interface ConversionStepperProps {
  currentStep: StepState;
  onStepClick?: (step: StepState) => void;
  className?: string;
}

export function ConversionStepper({ currentStep, onStepClick, className = '' }: ConversionStepperProps) {
  const steps: { id: StepState; label: string; shortLabel: string; icon: any; num: number }[] = [
    { id: 'upload', label: '1. Upload File', shortLabel: '1. Upload', icon: UploadCloud, num: 1 },
    { id: 'convert', label: '2. Convert & Process', shortLabel: '2. Convert', icon: Zap, num: 2 },
    { id: 'download', label: '3. Download Result', shortLabel: '3. Download', icon: Download, num: 3 },
  ];

  const getStepStatus = (stepId: StepState) => {
    if (stepId === currentStep) return 'active';
    if (currentStep === 'download') return 'completed';
    if (currentStep === 'convert' && stepId === 'upload') return 'completed';
    return 'pending';
  };

  return (
    <div className={`conversion-stepper ${className}`} role="navigation" aria-label="Conversion Process Steps">
      <div className="stepper-track">
        {steps.map((s, idx) => {
          const status = getStepStatus(s.id);
          const Icon = s.icon;
          const isClickable = (status === 'completed' || status === 'active') && onStepClick;

          return (
            <div key={s.id} className="stepper-item-wrapper">
              <button
                type="button"
                className={`stepper-node ${status} ${isClickable ? 'clickable' : ''}`}
                onClick={() => isClickable && onStepClick(s.id)}
                disabled={!isClickable}
                title={s.label}
              >
                <div className="stepper-icon-circle">
                  {status === 'completed' ? (
                    <Check size={16} strokeWidth={3} className="stepper-check" />
                  ) : (
                    <Icon size={16} className={`stepper-icon ${status === 'active' ? 'pulse-icon' : ''}`} />
                  )}
                </div>
                <div className="stepper-label-box">
                  <span className="stepper-label-desktop">{s.label}</span>
                  <span className="stepper-label-mobile">{s.shortLabel}</span>
                  <span className="stepper-substatus">
                    {status === 'completed' ? 'Done' : status === 'active' ? 'In Progress' : 'Waiting'}
                  </span>
                </div>
              </button>

              {idx < steps.length - 1 && (
                <div className={`stepper-line ${status === 'completed' ? 'completed' : status === 'active' ? 'active-flow' : ''}`}>
                  <div className="stepper-line-fill" />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
