import SignalLayout from '@/components/signals/SignalLayout';

export default function SignalCoverageLoading() {
  return <SignalLayout><p role="status" className="text-sm text-[#b0abb5]">Loading signal coverage…</p></SignalLayout>;
}
