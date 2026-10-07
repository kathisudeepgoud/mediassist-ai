import { useState } from 'react'
import {
  CreditCard,
  CheckCircle2,
  Lock,
  Smartphone,
  Building2,
  AlertCircle,
  X,
  ShieldCheck,
  RotateCw,
} from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'

interface RazorpayPaymentModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (paymentReference: string, paymentMethod: string) => void
  doctorName: string
  fee: number
  appointmentDate: string
  appointmentTime: string
  appointmentType: 'online' | 'offline'
}

type PaymentMethod = 'card' | 'upi' | 'netbanking'

export function RazorpayPaymentModal({
  isOpen,
  onClose,
  onSuccess,
  doctorName,
  fee,
  appointmentDate,
  appointmentTime,
  appointmentType,
}: RazorpayPaymentModalProps) {
  const [method, setMethod] = useState<PaymentMethod>('card')
  const [cardNumber, setCardNumber] = useState('4111 2222 3333 4444')
  const [cardExpiry, setCardExpiry] = useState('12/28')
  const [cardCvv, setCardCvv] = useState('888')
  const [cardName, setCardName] = useState('TEST USER')
  const [upiId, setUpiId] = useState('patient@okhdfcbank')
  const [selectedBank, setSelectedBank] = useState('HDFC Bank')
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setProcessing(true)

    // Simulate authentic Razorpay processing delay
    setTimeout(() => {
      const dummyRef = `pay_test_${Math.random().toString(36).substring(2, 10)}${Date.now().toString().slice(-4)}`
      setProcessing(false)
      onSuccess(dummyRef, method)
    }, 1200)
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden border-mist-200 bg-white">
        {/* Razorpay Branded Top Header */}
        <div className="bg-gradient-to-r from-[#073632] via-[#0F766E] to-[#0B5A54] p-5 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 backdrop-blur-xs font-bold text-teal-100 text-sm">
                ₹
              </div>
              <div>
                <h3 className="font-display font-semibold text-base leading-tight">MedAssist AI Checkout</h3>
                <p className="text-[11px] text-teal-100/80">Secured with Test Razorpay Payment Gateway</p>
              </div>
            </div>
            <Badge variant="outline" className="text-white border-white/30 bg-white/10 text-[10px] uppercase font-mono">
              Test Mode
            </Badge>
          </div>

          <div className="mt-4 flex items-baseline justify-between border-t border-white/10 pt-3">
            <span className="text-xs text-teal-100">Consultation Fee</span>
            <div className="text-right">
              <span className="text-2xl font-bold font-mono">₹{fee.toFixed(2)}</span>
            </div>
          </div>
        </div>

        <div className="p-5 space-y-4">
          {/* Summary Box */}
          <div className="rounded-xl bg-mist-50 border border-mist-200 p-3 text-xs space-y-1.5">
            <div className="flex justify-between">
              <span className="text-ink-soft">Doctor:</span>
              <span className="font-semibold text-ink">Dr. {doctorName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-ink-soft">Schedule:</span>
              <span className="font-medium text-ink">{appointmentDate} at {appointmentTime}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-ink-soft">Consultation Type:</span>
              <Badge variant={appointmentType === 'online' ? 'default' : 'outline'} className="text-[10px] uppercase">
                {appointmentType}
              </Badge>
            </div>
          </div>

          {/* Payment Method Selector */}
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setMethod('card')}
              className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-xs font-medium transition-all ${
                method === 'card'
                  ? 'border-teal-600 bg-teal-50 text-teal-700 shadow-xs'
                  : 'border-mist-200 hover:bg-mist-50 text-ink-soft'
              }`}
            >
              <CreditCard className="h-4 w-4 mb-1 text-teal-600" />
              Card
            </button>
            <button
              type="button"
              onClick={() => setMethod('upi')}
              className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-xs font-medium transition-all ${
                method === 'upi'
                  ? 'border-teal-600 bg-teal-50 text-teal-700 shadow-xs'
                  : 'border-mist-200 hover:bg-mist-50 text-ink-soft'
              }`}
            >
              <Smartphone className="h-4 w-4 mb-1 text-teal-600" />
              UPI / QR
            </button>
            <button
              type="button"
              onClick={() => setMethod('netbanking')}
              className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-xs font-medium transition-all ${
                method === 'netbanking'
                  ? 'border-teal-600 bg-teal-50 text-teal-700 shadow-xs'
                  : 'border-mist-200 hover:bg-mist-50 text-ink-soft'
              }`}
            >
              <Building2 className="h-4 w-4 mb-1 text-teal-600" />
              NetBanking
            </button>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Form per Method */}
          <form onSubmit={handlePay} className="space-y-3">
            {method === 'card' && (
              <div className="space-y-2.5">
                <div>
                  <label className="text-[11px] font-semibold text-ink-soft uppercase tracking-wider">Card Number</label>
                  <Input
                    value={cardNumber}
                    onChange={(e) => setCardNumber(e.target.value)}
                    placeholder="4111 2222 3333 4444"
                    className="font-mono text-xs h-9 mt-1"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] font-semibold text-ink-soft uppercase tracking-wider">Expiry (MM/YY)</label>
                    <Input
                      value={cardExpiry}
                      onChange={(e) => setCardExpiry(e.target.value)}
                      placeholder="MM/YY"
                      className="font-mono text-xs h-9 mt-1"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-ink-soft uppercase tracking-wider">CVV</label>
                    <Input
                      type="password"
                      maxLength={4}
                      value={cardCvv}
                      onChange={(e) => setCardCvv(e.target.value)}
                      placeholder="123"
                      className="font-mono text-xs h-9 mt-1"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-ink-soft uppercase tracking-wider">Cardholder Name</label>
                  <Input
                    value={cardName}
                    onChange={(e) => setCardName(e.target.value)}
                    placeholder="Name on card"
                    className="text-xs h-9 mt-1"
                    required
                  />
                </div>
              </div>
            )}

            {method === 'upi' && (
              <div className="space-y-2">
                <label className="text-[11px] font-semibold text-ink-soft uppercase tracking-wider">Virtual Payment Address (VPA / UPI ID)</label>
                <Input
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  placeholder="username@bank"
                  className="text-xs h-9 font-mono mt-1"
                  required
                />
                <p className="text-[11px] text-ink-soft">Simulated test payment will approve automatically.</p>
              </div>
            )}

            {method === 'netbanking' && (
              <div className="space-y-2">
                <label className="text-[11px] font-semibold text-ink-soft uppercase tracking-wider">Select Bank</label>
                <select
                  value={selectedBank}
                  onChange={(e) => setSelectedBank(e.target.value)}
                  className="w-full rounded-md border border-mist-200 bg-white px-3 py-2 text-xs text-ink focus:border-teal-600 focus:outline-none"
                >
                  <option value="HDFC Bank">HDFC Bank</option>
                  <option value="State Bank of India">State Bank of India</option>
                  <option value="ICICI Bank">ICICI Bank</option>
                  <option value="Axis Bank">Axis Bank</option>
                  <option value="Kotak Mahindra Bank">Kotak Mahindra Bank</option>
                </select>
              </div>
            )}

            <div className="pt-2">
              <Button
                type="submit"
                disabled={processing}
                className="w-full bg-[#0F766E] hover:bg-[#0B5A54] text-white font-medium text-xs h-10 shadow-sm"
              >
                {processing ? (
                  <span className="flex items-center gap-2">
                    <RotateCw className="h-4 w-4 animate-spin" /> Verifying Test Payment...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Lock className="h-3.5 w-3.5" /> Pay ₹{fee.toFixed(2)} & Confirm Appointment
                  </span>
                )}
              </Button>
            </div>
          </form>

          <div className="flex items-center justify-center gap-2 pt-1 text-[11px] text-ink-soft">
            <ShieldCheck className="h-3.5 w-3.5 text-teal-600" />
            <span>256-bit Encrypted Test Transaction</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
