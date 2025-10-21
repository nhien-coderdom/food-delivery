import Link from "next/link";

function Navigation() {
  return (
    <nav className="container mx-auto flex justify-between p-6 px-4">
      <div className="flex justify-between items-center w-full">
        <div className="xl:w-1/3">
          <Link
            className="block text-lg max-w-max text-gray-500 hover:text-gray-900 font-medium"
            href="/"
          >
            Food Order App
          </Link>
        </div>

        <div className="xl:block xl:w-1/3">
          <div className="flex items-center justify-end space-x-4">
            <Link
              className="text-gray-500 hover:text-gray-900 font-medium"
              href="/"
            >
              Home
            </Link>
            <Link
              className="inline-block py-2 px-4 text-sm leading-5 text-gray-500 hover:text-gray-900 font-medium rounded-md"
              href="/login"
            >
              Log In
            </Link>
            <Link
              className="inline-block py-2 px-4 text-sm leading-5 text-white bg-green-500 hover:bg-green-600 font-medium focus:ring-2 focus:ring-green-500 focus:ring-opacity-50 rounded-md"
              href="/register"
            >
              Sign Up
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}

export default function Layout({ children }) {
  return (
    <div>
      <Navigation />
      <div className="container mx-auto px-4">{children}</div>
    </div>
  );
}
