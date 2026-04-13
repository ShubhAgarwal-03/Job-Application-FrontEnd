import Link from "next/link";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="flex justify-between items-center px-8 py-5 border-b border-gray-100">
        <span className="text-xl font-bold text-gray-900">
          Job<span className="text-blue-600">Portal</span>
        </span>
        <div className="flex gap-3">
          <Link href="/login"
            className="text-sm text-gray-600 border border-gray-200 px-4 py-2 rounded-lg hover:bg-gray-50 transition">
            Log in
          </Link>
          <Link href="/signup"
            className="text-sm text-white bg-blue-600 px-4 py-2 rounded-lg hover:bg-blue-700 transition">
            Get started
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-8 pt-24 pb-20 text-center">
        <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 text-xs font-medium px-3 py-1.5 rounded-full mb-6 border border-blue-100">
          <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
          AI-powered resume screening
        </div>

        <h1 className="text-5xl font-bold text-gray-900 leading-tight mb-6 tracking-tight">
          Find your next role.<br />
          <span className="text-blue-600">Faster than ever.</span>
        </h1>

        <p className="text-lg text-gray-500 max-w-2xl mx-auto mb-10 leading-relaxed">
          Upload your resume once. Our AI reads it, fills your application automatically,
          and matches you to roles where you'll actually stand out.
        </p>

        <div className="flex gap-3 justify-center">
          <Link href="/signup"
            className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition text-sm">
            Create free account
          </Link>
          <Link href="/login"
            className="px-6 py-3 border border-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition text-sm">
            Log in
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-5xl mx-auto px-8 pb-24">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
              title: "Upload once, apply everywhere",
              desc: "Your resume is saved securely. Every application autofills from it — or upload a tailored one for any role.",
            },
            {
              icon: "M13 10V3L4 14h7v7l9-11h-7z",
              title: "Instant AI autofill",
              desc: "The moment you open an application, our AI reads your resume and extracts your skills, experience and summary.",
            },
            {
              icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z",
              title: "Real-time status updates",
              desc: "Get email notifications the moment your application status changes — accepted, rejected, or moved forward.",
            },
          ].map((f) => (
            <div key={f.title} className="bg-gray-50 border border-gray-100 rounded-xl p-6">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                  <path strokeLinecap="round" strokeLinejoin="round" d={f.icon}/>
                </svg>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">{f.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-blue-600 py-16 text-center">
        <h2 className="text-3xl font-bold text-white mb-3">Ready to find your next opportunity?</h2>
        <p className="text-blue-100 mb-8 text-sm">Join thousands of candidates already using JobPortal.</p>
        <Link href="/signup"
          className="inline-block bg-white text-blue-600 font-semibold px-6 py-3 rounded-lg hover:bg-blue-50 transition text-sm">
          Get started for free
        </Link>
      </section>

      {/* Footer */}
      <footer className="text-center py-6 text-xs text-gray-400 border-t border-gray-100">
        © {new Date().getFullYear()} JobPortal. Built with Next.js and Node.js.
      </footer>
    </div>
  );
}