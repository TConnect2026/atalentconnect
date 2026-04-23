export default function TestStyles() {
  return (
    <div className="min-h-screen p-8">
      <h1 className="text-3xl font-bold text-white mb-8">Style Test Page</h1>

      <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 max-w-7xl">
        {/* Test Card 1 */}
        <div className="cursor-pointer hover:shadow-[0_15px_50px_rgba(0,0,0,0.4)] transition-all duration-200 border-gray-200 bg-white touch-manipulation shadow-[0_10px_40px_rgba(0,0,0,0.3)] rounded-lg">
          <div className="p-6">
            <div className="flex-1 pr-3">
              <h3 className="text-xl font-bold text-gray-900 leading-tight pb-2 mb-2 border-b-2 border-[#0891B2] inline-block">
                CEO Position
              </h3>
            </div>
            <p className="text-base text-gray-700 font-medium mt-4">
              Acme Corporation
            </p>
            <div className="mt-4 pt-4 border-t border-gray-100">
              <p className="text-sm text-gray-600">
                This card should have:
              </p>
              <ul className="text-xs text-gray-700 mt-2 space-y-1">
                <li>✓ Drop shadow</li>
                <li>✓ Orange line under "CEO Position"</li>
                <li>✓ Navy background pattern visible</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Test Card 2 */}
        <div className="cursor-pointer hover:shadow-[0_10px_40px_rgba(0,0,0,0.3)] transition-all duration-200 border-gray-200 bg-white touch-manipulation shadow-[0_10px_40px_rgba(0,0,0,0.3)] rounded-lg">
          <div className="p-6">
            <div className="flex-1 pr-3">
              <h3 className="text-xl font-bold text-gray-900 leading-tight pb-2 mb-2 border-b-2 border-[#0891B2] inline-block">
                Product Manager
              </h3>
            </div>
            <p className="text-base text-gray-700 font-medium mt-4">
              Tech Startup Inc
            </p>
            <div className="mt-4 pt-4 border-t border-gray-100">
              <p className="text-sm text-gray-600">
                Hover over cards to see shadow increase
              </p>
            </div>
          </div>
        </div>

        {/* Test Card 3 */}
        <div className="cursor-pointer hover:shadow-[0_10px_40px_rgba(0,0,0,0.3)] transition-all duration-200 border-gray-200 bg-white touch-manipulation shadow-[0_10px_40px_rgba(0,0,0,0.3)] rounded-lg">
          <div className="p-6">
            <div className="flex-1 pr-3">
              <h3 className="text-xl font-bold text-gray-900 leading-tight pb-2 mb-2 border-b-2 border-[#0891B2] inline-block">
                CTO
              </h3>
            </div>
            <p className="text-base text-gray-700 font-medium mt-4">
              Enterprise Solutions
            </p>
          </div>
        </div>
      </div>

      <div className="mt-8 p-6 bg-white rounded-lg shadow-[0_10px_40px_rgba(0,0,0,0.3)] max-w-2xl">
        <h2 className="text-xl font-bold mb-4">Background Pattern Test</h2>
        <p className="text-sm text-gray-600">
          Look at the navy background behind this page. You should see a very subtle chain link pattern.
          It's at 8-9% opacity so it's barely visible - adds texture without being distracting.
        </p>
      </div>
    </div>
  )
}
