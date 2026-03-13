export default function LandingFooter() {
  return (
    <footer className="border-t border-slate-800 py-12 px-4 sm:px-8 lg:px-16">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-3">
          <img
            src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/692b24a5bac54e3067972063/2e8a22a03_AevoiceLogo.JPG"
            alt="AEVOICE"
            className="h-8 w-auto rounded"
          />
          <span className="text-white font-semibold">AEVOICE</span>
        </div>
        <div className="flex flex-wrap items-center gap-6 text-sm text-slate-400">
          <a href="/terms" className="hover:text-white transition-colors">Terms</a>
          <a href="/privacy" className="hover:text-white transition-colors">Privacy</a>
          <a href="/contact" className="hover:text-white transition-colors">Contact</a>
          <a href="/status" className="hover:text-white transition-colors">Status</a>
        </div>
        <p className="text-xs text-slate-500">© AEVOICE {new Date().getFullYear()}. All rights reserved.</p>
      </div>
    </footer>
  );
}