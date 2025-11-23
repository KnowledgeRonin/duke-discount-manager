export function Header() {
  return (
    <header className="bg-blue-600 p-4 shadow-md">
      <div className="container mx-auto flex items-center justify-between">
        <h1 className="text-xl font-bold text-white">Example Header</h1>
        <nav>
          <a href="#" className="mr-4 text-white hover:text-blue-200 transition-colors">Login</a>
          <a href="#" className="text-white hover:text-blue-200 transition-colors">About</a>
        </nav>
      </div>
    </header>
  );
}